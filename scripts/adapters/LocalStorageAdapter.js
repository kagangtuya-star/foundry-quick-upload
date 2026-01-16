import { StorageAdapter } from './StorageAdapter.js';

export class LocalStorageAdapter extends StorageAdapter {
  get kind() {
    return 'local';
  }

  _parseS3Path(path) {
    const raw = String(path ?? '').trim().replace(/\\/g, '/');
    const match = raw.match(/^s3:(?:\/\/)?([^/]+)(?:\/(.*))?$/i);
    if (!match) {
      return null;
    }
    return { bucket: match[1], path: match[2] ?? '' };
  }

  async ensurePath(path) {
    const s3 = this._parseS3Path(path);
    if (s3) {
      return;
    }
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
    const s3 = this._parseS3Path(path);
    const safeFilename = this._sanitizeFilename(filename);

    if (!blob || !blob.type?.startsWith('image/')) {
      throw new Error('Invalid image blob');
    }

    const file = new File([blob], safeFilename, { type: blob.type || 'image/webp' });

    if (s3) {
      const safePath = this._normalizePath(s3.path, { allowEmpty: true, allowColon: true });
      const response = await FilePicker.upload('s3', safePath, file, { bucket: s3.bucket }, { notify: false });
      if (!response?.path) {
        throw new Error('Upload failed: No path returned');
      }
      return { url: response.path };
    }

    const safePath = this._normalizePath(path);
    await this.ensurePath(safePath);
    const response = await FilePicker.upload('data', safePath, file, {}, { notify: false });

    if (!response?.path) {
      throw new Error('Upload failed: No path returned');
    }

    return { url: response.path };
  }

  _normalizePath(path, { allowEmpty = false, allowColon = false } = {}) {
    const raw = String(path ?? '').trim().replace(/\\/g, '/');
    if (raw.includes('..')) {
      throw new Error('Invalid upload path');
    }
    const parts = raw
      .split('/')
      .filter((part) => part && part !== '.' && part !== '..' && (allowColon || !part.includes(':')));
    if (!parts.length) {
      if (allowEmpty) {
        return '';
      }
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
