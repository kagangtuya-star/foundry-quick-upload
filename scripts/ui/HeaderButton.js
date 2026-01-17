import { MODULE_ID, SettingsManager } from '../core/SettingsManager.js';
import { QuickUploadDialog } from '../ui/QuickUploadDialog.js';

const SUPPORTED_DOCUMENT_TYPES = ['Actor', 'Item', 'Scene', 'JournalEntry', 'RollTable', 'Cards', 'Macro'];

export class HeaderButton {
  static get isV13Plus() {
    const generation = game.release?.generation;
    if (typeof generation === 'number') return generation >= 13;
    return foundry?.utils?.isNewerVersion?.(game.version, '13') ?? false;
  }

  static isSupported(documentKind) {
    return SUPPORTED_DOCUMENT_TYPES.includes(documentKind);
  }

  /**
   * Unified entry point - returns appropriate format based on Foundry version
   * @param {Document} document - The Foundry document
   * @param {string} documentKind - Document type name
   * @param {object} [options] - Options
   * @param {boolean} [options.forceV2=false] - Force AppV2 format output
   * @returns {object[]} Button/control definitions
   */
  static getControls(document, documentKind, { forceV2 = false } = {}) {
    if (!SettingsManager.get(SettingsManager.KEYS.HEADER_BUTTON)) return [];
    if (!this.isSupported(documentKind)) return [];

    if (forceV2) return this._getAppV2Controls(document, documentKind);
    return this.isV13Plus
      ? this._getAppV2Controls(document, documentKind)
      : this._getAppV1Buttons(document, documentKind);
  }

  /**
   * AppV2 format for v13+ (getHeaderControlsApplicationV2)
   * @param {Document} document
   * @param {string} documentKind
   * @returns {ApplicationHeaderControlsEntry[]}
   */
  static _getAppV2Controls(document, documentKind) {
    const fields = this._getFieldsForDocument(documentKind);
    const onClick = fields.length === 1
      ? () => QuickUploadDialog.create(document, fields[0])
      : () => this._showFieldSelector(document, documentKind, fields);

    return [{
      action: `${MODULE_ID}.upload`,
      icon: 'fas fa-cloud-upload-alt',
      label: game.i18n.localize('FQU.Button.Upload'),
      onClick
    }];
  }

  /**
   * Inject minimal badge into window-header (before close button)
   * @param {HTMLElement} element - The application element
   * @param {Document} document - The Foundry document
   * @param {string} documentKind - Document type name
   */
  static injectHeaderBadge(element, document, documentKind) {
    if (!element || !document) return;
    if (!SettingsManager.get(SettingsManager.KEYS.HEADER_BUTTON)) return;
    if (!this.isSupported(documentKind)) return;

    const header = element.querySelector('header.window-header');
    if (!header) return;

    // Idempotency check
    if (header.querySelector('.fqu-header-badge')) return;

    const fields = this._getFieldsForDocument(documentKind);
    const onClick = fields.length === 1
      ? () => QuickUploadDialog.create(document, fields[0])
      : () => this._showFieldSelector(document, documentKind, fields);

    // Create <a> element matching Foundry's header-button structure
    const badge = globalThis.document.createElement('a');
    badge.className = 'header-button control fqu-header-badge';
    badge.dataset.tooltip = game.i18n.localize('FQU.Button.Upload');
    badge.dataset.tooltipDirection = 'UP';
    badge.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });

    // Insert before close button or append to header
    const closeBtn = header.querySelector('[data-action="close"], .header-button.close, .close');
    if (closeBtn) {
      closeBtn.before(badge);
    } else {
      header.appendChild(badge);
    }
  }

  /**
   * AppV1 format for v12 and legacy (get*SheetHeaderButtons)
   * @param {Document} document
   * @param {string} documentKind
   * @returns {object[]}
   */
  static _getAppV1Buttons(document, documentKind) {
    const fields = this._getFieldsForDocument(documentKind);

    if (fields.length === 1) {
      return [{
        icon: 'fas fa-cloud-upload-alt',
        class: 'fqu-header-button',
        label: game.i18n.localize('FQU.Button.Upload'),
        onclick: () => QuickUploadDialog.create(document, fields[0])
      }];
    }

    return [{
      icon: 'fas fa-cloud-upload-alt',
      class: 'fqu-header-button',
      label: game.i18n.localize('FQU.Button.Upload'),
      onclick: () => this._showFieldSelector(document, documentKind, fields)
    }];
  }

  /**
   * Legacy alias for backward compatibility
   * @deprecated Use getControls() instead
   */
  static getButtons(document, documentKind) {
    return this._getAppV1Buttons(document, documentKind);
  }

  static _getFieldsForDocument(documentKind) {
    const fieldMap = {
      'Actor': ['portrait', 'token'],
      'Item': ['image'],
      'Scene': ['background', 'foreground'],
      'JournalEntry': ['image'],
      'RollTable': ['image'],
      'Cards': ['image'],
      'Macro': ['image']
    };
    return fieldMap[documentKind] || ['image'];
  }

  static async _showFieldSelector(document, documentKind, fields) {
    if (fields.length === 1) {
      QuickUploadDialog.create(document, fields[0]);
      return;
    }

    const buttons = {};
    fields.forEach((field) => {
      const label = game.i18n.localize(`FQU.Field.${field.charAt(0).toUpperCase() + field.slice(1)}`);
      buttons[field] = {
        icon: '<i class="fas fa-image"></i>',
        label,
        callback: () => QuickUploadDialog.create(document, field)
      };
    });

    new Dialog({
      title: game.i18n.localize('FQU.Dialog.SelectField'),
      content: `<p>${game.i18n.localize('FQU.Dialog.SelectFieldHint')}</p>`,
      buttons,
      default: fields[0]
    }).render(true);
  }
}
