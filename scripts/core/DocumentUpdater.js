export class DocumentUpdater {
  async update(document, documentKind, field, url) {
    if (!document || typeof document.update !== 'function') {
      throw new Error('Invalid document');
    }
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid image URL');
    }

    const updateData = this._buildUpdateData(document, documentKind, field, url);
    await document.update(updateData);
  }

  _buildUpdateData(document, documentKind, field, url) {
    const key = `${documentKind}:${field}`;

    // Handle Scene fields with v13 compatibility
    if (key === 'Scene:background') {
      if (document?.background && typeof document.background === 'object' && 'src' in document.background) {
        return { 'background.src': url };
      }
      return { background: url };
    }

    if (key === 'Scene:foreground') {
      if (document?.foreground && typeof document.foreground === 'object' && 'src' in document.foreground) {
        return { 'foreground.src': url };
      }
      return { foreground: url };
    }

    const fieldMap = {
      'Actor:portrait': { img: url },
      'Actor:token': { 'prototypeToken.texture.src': url },
      'Item:image': { img: url },
      'JournalEntry:image': { img: url },
      'RollTable:image': { img: url },
      'Cards:image': { img: url },
      'Macro:image': { img: url }
    };

    return fieldMap[key] || { img: url };
  }
}
