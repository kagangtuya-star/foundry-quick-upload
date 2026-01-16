import { MODULE_ID } from '../core/SettingsManager.js';
import { PathResolver } from '../core/PathResolver.js';

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
      rotateLeft: QuickUploadDialog.#onRotateLeft,
      rotateRight: QuickUploadDialog.#onRotateRight,
      flipH: QuickUploadDialog.#onFlipH,
      flipV: QuickUploadDialog.#onFlipV,
      reset: QuickUploadDialog.#onReset,
      browse: QuickUploadDialog.#onBrowse,
      loadUrl: QuickUploadDialog.#onLoadUrl,
      pickPath: QuickUploadDialog.#onPickPath,
      save: QuickUploadDialog.#onSave
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
  #transforms = { rotate: 0, flipX: false, flipY: false, scale: 1, crop: null };
  #savePath = '';
  #filename = '';

  constructor(options = {}) {
    super(options);
    this.#document = options.document;
    this.#documentKind = options.documentKind;
    this.#field = options.field;
    this._initializePaths();
  }

  static create(document, field) {
    // Get base document type, not system-specific class name
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
      transforms: this.#transforms
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._setupEventListeners();
  }

  _setupEventListeners() {
    const element = this.element;

    // Drag and drop
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      element.classList.add('fqu-drag-over');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('fqu-drag-over');
    });

    element.addEventListener('drop', async (e) => {
      e.preventDefault();
      element.classList.remove('fqu-drag-over');
      const files = e.dataTransfer?.files;
      if (files?.length > 0 && files[0].type.startsWith('image/')) {
        await this._loadImage(files[0]);
      }
    });

    // Paste
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
    });

    // File input
    const fileInput = element.querySelector('input[type="file"]');
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) await this._loadImage(file);
    });

    // Make dialog focusable for paste events
    element.setAttribute('tabindex', '0');
    element.focus();
  }

  async _loadImage(file) {
    this.#imageBlob = file;
    this.#imageUrl = URL.createObjectURL(file);
    this.#transforms = { rotate: 0, flipX: false, flipY: false, scale: 1, crop: null };
    this.render();
  }

  static async #onRotateLeft(event, target) {
    this.#transforms.rotate = (this.#transforms.rotate - 90) % 360;
    this._updatePreview();
  }

  static async #onRotateRight(event, target) {
    this.#transforms.rotate = (this.#transforms.rotate + 90) % 360;
    this._updatePreview();
  }

  static async #onFlipH(event, target) {
    this.#transforms.flipX = !this.#transforms.flipX;
    this._updatePreview();
  }

  static async #onFlipV(event, target) {
    this.#transforms.flipY = !this.#transforms.flipY;
    this._updatePreview();
  }

  static async #onReset(event, target) {
    this.#transforms = { rotate: 0, flipX: false, flipY: false, scale: 1, crop: null };
    this._updatePreview();
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
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Not an image');
      await this._loadImage(blob);
    } catch (error) {
      ui.notifications.error(game.i18n.localize('FQU.Error.UrlLoadFailed'));
    }
  }

  static async #onPickPath(event, target) {
    const fp = new FilePicker({
      type: 'folder',
      current: this.#savePath,
      callback: (path) => {
        this.#savePath = path;
        const pathInput = this.element.querySelector('input[name="savePath"]');
        if (pathInput) pathInput.value = path;
      }
    });
    fp.render(true);
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
      await uploadController.execute({
        document: this.#document,
        documentKind: this.#documentKind,
        field: this.#field,
        name: this.#document.name || 'image',
        file: this.#imageBlob,
        transforms: this.#transforms
      });

      ui.notifications.info(game.i18n.localize('FQU.Toast.Success'));
      this.close();
    } catch (error) {
      console.error('Quick Upload failed:', error);
      ui.notifications.error(game.i18n.localize('FQU.Toast.Failed') + ': ' + error.message);
    } finally {
      saveButton.innerHTML = originalText;
      saveButton.disabled = false;
    }
  }

  _updatePreview() {
    const img = this.element.querySelector('#fqu-preview-image');
    if (!img) return;

    const { rotate, flipX, flipY, scale } = this.#transforms;
    const transforms = [];
    if (rotate) transforms.push(`rotate(${rotate}deg)`);
    if (flipX) transforms.push('scaleX(-1)');
    if (flipY) transforms.push('scaleY(-1)');
    if (scale !== 1) transforms.push(`scale(${scale})`);

    img.style.transform = transforms.join(' ');
  }

  _onClose(options) {
    if (this.#imageUrl) {
      URL.revokeObjectURL(this.#imageUrl);
    }
    super._onClose(options);
  }
}
