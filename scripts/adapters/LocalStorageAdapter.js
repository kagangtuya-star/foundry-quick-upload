import { StorageAdapter } from './StorageAdapter.js';

export class LocalStorageAdapter extends StorageAdapter {
  get kind() {
    return 'local';
  }

  async ensurePath(path) {
    const safePath = this._normalizePath(path);
    const parts = safePath.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      try {
        await FilePicker.browse('data', currentPath);
      } catch (e) {
        try {
          await FilePicker.createDirectory('data', currentPath);
        } catch (createError) {
          if (!createError.message?.includes('EEXIST')) {
            console.warn(`Could not create directory: ${currentPath}`, createError);
          }
        }
      }
    }
  }

  async upload(path, blob, filename) {
    const safePath = this._normalizePath(path);
    const safeFilename = this._sanitizeFilename(filename);

    if (!blob || !blob.type?.startsWith('image/')) {
      throw new Error('Invalid image blob');
    }

    await this.ensurePath(safePath);

    const file = new File([blob], safeFilename, { type: blob.type || 'image/webp' });
    const response = await FilePicker.upload('data', safePath, file, {}, { notify: false });

    if (!response?.path) {
      throw new Error('Upload failed: No path returned');
    }

    return { url: response.path };
  }

  _normalizePath(path) {
    const raw = String(path ?? '').trim().replace(/\\/g, '/');
    if (raw.includes('..')) {
      throw new Error('Invalid upload path');
    }
    const parts = raw
      .split('/')
      .filter((part) => part && part !== '.' && part !== '..' && !part.includes(':'));
    if (!parts.length) {
      throw new Error('Invalid upload path');
    }
    return parts.join('/');
  }

  _sanitizeFilename(filename) {
    const cleaned = String(filename ?? 'image.webp')
      .replace(/[\\/]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '')
      .trim();
    return cleaned || 'image.webp';
  }
}
