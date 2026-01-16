import { SettingsManager } from './SettingsManager.js';

export class PathResolver {
  resolve(documentKind, field) {
    return SettingsManager.getPath(documentKind, field);
  }

  generateFilename(name, documentKind, field) {
    const template = String(SettingsManager.get(SettingsManager.KEYS.NAMING_TEMPLATE) ?? '{name}-{type}-{hash}');
    const hashLength = SettingsManager.get(SettingsManager.KEYS.HASH_LENGTH);
    const hash = this._generateHash(hashLength);
    const sanitizedName = this._sanitizeName(name) || 'image';
    const type = this._getTypeLabel(documentKind, field);

    const rawName = template
      .replace('{name}', sanitizedName)
      .replace('{type}', type)
      .replace('{hash}', hash);

    const safeName = this._sanitizeFilename(rawName);
    return `${safeName}.webp`;
  }

  _generateHash(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(length);
      globalThis.crypto.getRandomValues(bytes);
      return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
    }
    let fallback = '';
    for (let i = 0; i < length; i++) {
      fallback += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return fallback;
  }

  _sanitizeName(name) {
    return String(name ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 32);
  }

  _sanitizeFilename(value) {
    const cleaned = String(value ?? 'image')
      .replace(/[\\/]/g, '-')
      .replace(/\.+/g, '.')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '')
      .replace(/[^a-z0-9\u4e00-\u9fa5._-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 64);
    return cleaned || 'image';
  }

  _getTypeLabel(documentKind, field) {
    const labels = {
      'Actor:portrait': 'portrait',
      'Actor:token': 'token',
      'Item:image': 'item',
      'Scene:background': 'bg',
      'Scene:foreground': 'fg',
      'JournalEntry:image': 'journal',
      'RollTable:image': 'table',
      'Cards:image': 'card',
      'Macro:image': 'macro'
    };
    return labels[`${documentKind}:${field}`] || 'img';
  }
}
