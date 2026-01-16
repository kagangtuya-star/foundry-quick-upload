import { MODULE_ID, SettingsManager } from '../core/SettingsManager.js';
import { QuickUploadDialog } from '../ui/QuickUploadDialog.js';

export class HoverButton {
  static inject(html, doc, field, selector) {
    if (!SettingsManager.get(SettingsManager.KEYS.HOVER_BUTTON)) return;

    const imgElements = html.querySelectorAll(selector);
    imgElements.forEach((img) => {
      if (img.closest('.fqu-hover-container')) return;

      const container = globalThis.document.createElement('div');
      container.className = 'fqu-hover-container';
      img.parentNode.insertBefore(container, img);
      container.appendChild(img);

      const button = globalThis.document.createElement('button');
      button.type = 'button';
      button.className = 'fqu-hover-button';
      button.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';
      button.dataset.tooltip = game.i18n.localize('FQU.Button.Upload');
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        QuickUploadDialog.create(doc, field);
      });

      container.appendChild(button);
    });
  }

  static injectActorSheet(html, actor) {
    // Portrait image
    this.inject(html, actor, 'portrait', '.profile-img, img.profile, [data-edit="img"]');
    // Token image - look for token preview
    this.inject(html, actor, 'token', '.token-image, [data-edit="prototypeToken.texture.src"]');
  }

  static injectItemSheet(html, item) {
    this.inject(html, item, 'image', '.profile-img, img.profile, [data-edit="img"]');
  }

  static injectSceneConfig(html, scene) {
    this.inject(html, scene, 'background', '[data-edit="background.src"]');
    this.inject(html, scene, 'foreground', '[data-edit="foreground"]');
  }

  static injectJournalSheet(html, journal) {
    this.inject(html, journal, 'image', '.profile-img, [data-edit="img"]');
  }

  static injectGenericSheet(html, doc, field = 'image') {
    this.inject(html, doc, field, '.profile-img, img.profile, [data-edit="img"]');
  }
}
