import { MODULE_ID } from '../core/SettingsManager.js';
import { PathResolver } from '../core/PathResolver.js';
import { FilerobotAdapter } from './FilerobotAdapter.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class QuickUploadDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'quick-upload-dialog',
    classes: ['fqu-dialog'],
    tag: 'div',
    window: {
      title: 'FQU.Dialog.Title',
      icon: 'fas fa-cloud-upload-alt',
      resizable: true
    },
    position: {
      width: 700,
      height: 500
    },
    actions: {
      browse: QuickUploadDialog.#onBrowse,
      loadUrl: QuickUploadDialog.#onLoadUrl,
      pickPath: QuickUploadDialog.#onPickPath,
      save: QuickUploadDialog.#onSave,
      openEditor: QuickUploadDialog.#onOpenEditor
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/quick-upload-dialog.hbs`
    }
  };

  #document = null;
  #documentKind = '';
  #field = '';
  #imageBlob = null;
  #imageUrl = null;
  #savePath = '';
  #filename = '';
  #isProcessing = false;
  #processingProgress = 0;
  #processingMessage = '';
  #filerobotAdapter = null;
  #abortController = null;

  constructor(options = {}) {
    super(options);
    this.#document = options.document;
    this.#documentKind = options.documentKind;
    this.#field = options.field;
    this._initializePaths();
  }

  static create(document, field) {
    const documentKind = document.documentName || document.constructor.documentName || document.constructor.name;
    const dialog = new QuickUploadDialog({
      document,
      documentKind,
      field
    });
    dialog.render(true);
    return dialog;
  }

  _initializePaths() {
    const pathResolver = new PathResolver();
    this.#savePath = pathResolver.resolve(this.#documentKind, this.#field);
    this.#filename = pathResolver.generateFilename(
      this.#document.name || 'image',
      this.#documentKind,
      this.#field
    ).replace('.webp', '');
  }

  get title() {
    const baseTitle = game.i18n.localize('FQU.Dialog.Title');
    return `${baseTitle}: ${this.#document?.name || ''}`;
  }

  async _prepareContext(options) {
    const fieldLabel = game.i18n.localize(`FQU.Field.${this.#field.charAt(0).toUpperCase() + this.#field.slice(1)}`);
    return {
      imageUrl: this.#imageUrl,
      hasImage: !!this.#imageUrl,
      savePath: this.#savePath,
      filename: this.#filename,
      documentName: this.#document?.name || '',
      fieldLabel,
      isProcessing: this.#isProcessing,
      processingProgress: this.#processingProgress,
      processingMessage: this.#processingMessage
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    this._setupEventListeners();
  }

  _setupEventListeners() {
    const element = this.element;
    const signal = this.#abortController.signal;

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      element.classList.add('fqu-drag-over');
    }, { signal });

    element.addEventListener('dragleave', () => {
      element.classList.remove('fqu-drag-over');
    }, { signal });

    element.addEventListener('drop', async (e) => {
      e.preventDefault();
      element.classList.remove('fqu-drag-over');
      const files = e.dataTransfer?.files;
      if (files?.length > 0 && files[0].type.startsWith('image/')) {
        await this._loadImage(files[0]);
      }
    }, { signal });

    element.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) await this._loadImage(blob);
          break;
        }
      }
    }, { signal });

    const fileInput = element.querySelector('input[type="file"]');
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) await this._loadImage(file);
    }, { signal });

    element.setAttribute('tabindex', '0');
    element.focus();
  }

  async _loadImage(file) {
    if (this.#imageUrl) {
      URL.revokeObjectURL(this.#imageUrl);
    }
    this.#imageBlob = file;
    this.#imageUrl = URL.createObjectURL(file);
    this.render();
  }

  static async #onBrowse(event, target) {
    const fileInput = this.element.querySelector('input[type="file"]');
    fileInput?.click();
  }

  static async #onLoadUrl(event, target) {
    const urlInput = this.element.querySelector('input[name="urlInput"]');
    const url = urlInput?.value?.trim();
    if (!url) return;

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }

      const response = await fetch(url, {
        credentials: 'omit',
        mode: 'cors'
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Not an image');
      await this._loadImage(blob);
    } catch (error) {
      ui.notifications.error(game.i18n.localize('FQU.Error.UrlLoadFailed'));
    }
  }

  static #parseS3Path(value) {
    const raw = String(value ?? '').trim().replace(/\\/g, '/');
    const match = raw.match(/^s3:(?:\/\/)?([^/]+)(?:\/(.*))?$/i);
    if (!match) {
      return null;
    }
    return { bucket: match[1], path: match[2] ?? '' };
  }

  static #formatS3Path(bucket, path) {
    const cleanedPath = String(path ?? '').replace(/^\/+/, '').replace(/\/+$/, '');
    return cleanedPath ? `s3:${bucket}/${cleanedPath}` : `s3:${bucket}`;
  }

  static async #onPickPath(event, target) {
    const rawPath = String(this.#savePath ?? '').trim();
    const s3Match = this.#parseS3Path(rawPath);
    const self = this;

    const fp = new FilePicker({
      type: 'folder',
      current: s3Match ? String(s3Match.path ?? '').replace(/^\/+/, '') : rawPath
    });

    if (s3Match) {
      fp.activeSource = 's3';
    }

    // v13: Use form.handler instead of callback
    fp.options.form = {
      closeOnSubmit: true,
      handler: async (event, form, formData) => {
        const data = formData.object ?? Object.fromEntries(formData.entries());
        const rawSelected = String(data.file ?? data.target ?? fp.request ?? '').trim();

        console.log('FQU FilePicker form.handler:', {
          formData: data,
          activeSource: fp.activeSource,
          sources: fp.sources,
          request: fp.request
        });

        const directS3Match = self.#parseS3Path(rawSelected);
        if (directS3Match) {
          self.#savePath = self.#formatS3Path(directS3Match.bucket, directS3Match.path);
        } else if (fp.activeSource === 's3') {
          const bucket = fp.sources?.s3?.bucket ?? s3Match?.bucket;
          const selectedPath = rawSelected.replace(/^\/+/, '');
          if (bucket) {
            self.#savePath = self.#formatS3Path(bucket, selectedPath);
          } else {
            self.#savePath = rawSelected;
          }
        } else {
          self.#savePath = rawSelected;
        }

        const pathInput = self.element.querySelector('input[name="savePath"]');
        if (pathInput) pathInput.value = self.#savePath;
      }
    };

    fp.render(true);
  }

  static async #onOpenEditor(event, target) {
    if (!this.#imageBlob) {
      ui.notifications.warn(game.i18n.localize('FQU.Error.NoImage'));
      return;
    }

    const editorContainer = document.createElement('div');
    editorContainer.id = 'fqu-filerobot-container';
    editorContainer.className = 'fqu-filerobot-container';
    document.body.appendChild(editorContainer);

    this.#filerobotAdapter = new FilerobotAdapter({
      container: editorContainer,
      onSave: async (blob, metadata) => {
        await this._handleEditorSave(blob, metadata);
      },
      onClose: () => {
        this._handleEditorClose();
      }
    });

    await this.#filerobotAdapter.open(this.#imageBlob);
  }

  async _handleEditorSave(blob, metadata) {
    if (this.#imageUrl) {
      URL.revokeObjectURL(this.#imageUrl);
    }
    this.#imageBlob = blob;
    this.#imageUrl = URL.createObjectURL(blob);
    this._handleEditorClose();
    this.render();
  }

  _handleEditorClose() {
    if (this.#filerobotAdapter) {
      this.#filerobotAdapter.destroy();
      this.#filerobotAdapter = null;
    }
    const container = document.getElementById('fqu-filerobot-container');
    if (container) {
      container.remove();
    }
  }

  static async #onSave(event, target) {
    if (!this.#imageBlob) {
      ui.notifications.warn(game.i18n.localize('FQU.Error.NoImage'));
      return;
    }

    const saveButton = target;
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + game.i18n.localize('FQU.Dialog.Processing');
    saveButton.disabled = true;

    try {
      const filenameInput = this.element.querySelector('input[name="filename"]');
      const filename = (filenameInput?.value?.trim() || this.#filename) + '.webp';

      const uploadController = game.modules.get(MODULE_ID).uploadController;
      const result = await uploadController.execute({
        document: this.#document,
        documentKind: this.#documentKind,
        field: this.#field,
        name: this.#document.name || 'image',
        file: this.#imageBlob
      });

      const originalSize = result?.originalSize ?? (this.#imageBlob instanceof Blob ? this.#imageBlob.size : null);
      const processedSize = result?.processedSize;
      const uploadPath = result?.url;

      if (Number.isFinite(originalSize) && Number.isFinite(processedSize) && uploadPath) {
        const before = this.#formatBytes(originalSize);
        const after = this.#formatBytes(processedSize);
        const diff = processedSize - originalSize;
        const change = `${diff >= 0 ? '+' : '-'}${this.#formatBytes(Math.abs(diff))}`;
        ui.notifications.info('FQU.Toast.UploadInfo', {
          localize: true,
          format: { before, after, change, path: uploadPath }
        });
      } else {
        ui.notifications.info(game.i18n.localize('FQU.Toast.Success'));
      }
      this.close();
    } catch (error) {
      console.error('Quick Upload failed:', error);
      ui.notifications.error(game.i18n.localize('FQU.Toast.Failed') + ': ' + error.message);
    } finally {
      saveButton.innerHTML = originalText;
      saveButton.disabled = false;
    }
  }

  _onClose(options) {
    this.#abortController?.abort();
    if (this.#imageUrl) {
      URL.revokeObjectURL(this.#imageUrl);
    }
    if (this.#filerobotAdapter) {
      this.#filerobotAdapter.destroy();
    }
    super._onClose(options);
  }

  #formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value)) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    const precision = unitIndex === 0 ? 0 : size < 10 ? 2 : size < 100 ? 1 : 0;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
  }
}
