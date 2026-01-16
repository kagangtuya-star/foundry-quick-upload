import { MODULE_ID, SettingsManager } from '../core/SettingsManager.js';
import { QuickUploadDialog } from '../ui/QuickUploadDialog.js';

export class HeaderButton {
  static getButtons(document, documentKind) {
    if (!SettingsManager.get(SettingsManager.KEYS.HEADER_BUTTON)) return [];

    const fields = this._getFieldsForDocument(documentKind);

    if (fields.length === 1) {
      return [{
        icon: 'fas fa-cloud-upload-alt',
        class: 'fqu-header-button',
        label: game.i18n.localize('FQU.Button.Upload'),
        onclick: () => QuickUploadDialog.create(document, fields[0])
      }];
    }

    // Multiple fields - create submenu or handle selection in dialog
    return [{
      icon: 'fas fa-cloud-upload-alt',
      class: 'fqu-header-button',
      label: game.i18n.localize('FQU.Button.Upload'),
      onclick: () => this._showFieldSelector(document, documentKind, fields)
    }];
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
