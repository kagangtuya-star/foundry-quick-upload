import { SettingsManager } from '../core/SettingsManager.js';
import { QuickUploadDialog } from './QuickUploadDialog.js';

const SUPPORTED_DOCUMENT_TYPES = ['Actor', 'Item', 'Scene', 'JournalEntry', 'RollTable', 'Cards', 'Macro'];

/**
 * Sheet Badge - 表单内容区角标注入
 */
export class SheetBadge {
  static adapters = new Map();

  static {
    this.registerAdapter('default', {
      containerSelectors: ['.sheet-header', 'header.sheet-header', 'form > header'],
    });

    this.registerAdapter('dnd5e', {
      containerSelectors: ['.sheet-header .header-details', '.sheet-header .characteristics', '.sheet-header'],
    });

    this.registerAdapter('pf2e', {
      containerSelectors: ['.sheet-header .header-content', '.sheet-header'],
      useAbsolutePosition: true,
      positionConfig: { top: '8px', right: '8px' },
    });
  }

  static registerAdapter(systemId, config) {
    this.adapters.set(systemId, {
      containerSelectors: config.containerSelectors ?? ['.sheet-header'],
      useAbsolutePosition: config.useAbsolutePosition ?? false,
      positionConfig: config.positionConfig ?? { top: '4px', right: '4px' },
      ...config,
    });
  }

  static getAdapter() {
    return this.adapters.get(game.system?.id) ?? this.adapters.get('default');
  }

  static inject(html, doc, documentKind) {
    if (!html || !doc) return;
    if (!SettingsManager.get(SettingsManager.KEYS.HEADER_BUTTON)) return;
    if (game.system?.id !== 'dnd5e') return;
    if (!SUPPORTED_DOCUMENT_TYPES.includes(documentKind)) return;

    const adapter = this.getAdapter();
    if (!adapter) return;

    const container = this._findContainer(html, adapter.containerSelectors);
    if (!container) return;
    if (container.querySelector('.fqu-sheet-badge')) return;

    if (adapter.useAbsolutePosition && getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const badge = this._createBadge(doc, documentKind, adapter);
    container.appendChild(badge);
  }

  static _findContainer(html, selectors) {
    for (const selector of selectors) {
      const el = html.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  static _createBadge(doc, documentKind, adapter) {
    const fields = this._getFieldsForDocument(documentKind);
    const onClick = fields.length === 1
      ? () => QuickUploadDialog.create(doc, fields[0])
      : () => this._showFieldSelector(doc, documentKind, fields);

    const badge = globalThis.document.createElement('button');
    badge.type = 'button';
    badge.className = 'fqu-sheet-badge';
    badge.dataset.tooltip = game.i18n.localize('FQU.Button.Upload');
    badge.setAttribute('aria-label', game.i18n.localize('FQU.Button.Upload'));
    badge.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });

    if (adapter.useAbsolutePosition) {
      badge.style.position = 'absolute';
      Object.assign(badge.style, adapter.positionConfig);
    }

    return badge;
  }

  static _getFieldsForDocument(documentKind) {
    const fieldMap = {
      Actor: ['portrait', 'token'],
      Item: ['image'],
      Scene: ['background', 'foreground'],
      JournalEntry: ['image'],
      RollTable: ['image'],
      Cards: ['image'],
      Macro: ['image'],
    };
    return fieldMap[documentKind] || ['image'];
  }

  static _showFieldSelector(doc, documentKind, fields) {
    const buttons = {};
    fields.forEach((field) => {
      buttons[field] = {
        icon: '<i class="fas fa-image"></i>',
        label: game.i18n.localize(`FQU.Field.${field.charAt(0).toUpperCase() + field.slice(1)}`),
        callback: () => QuickUploadDialog.create(doc, field),
      };
    });
    new Dialog({
      title: game.i18n.localize('FQU.Dialog.SelectField'),
      content: `<p>${game.i18n.localize('FQU.Dialog.SelectFieldHint')}</p>`,
      buttons,
      default: fields[0],
    }).render(true);
  }
}
