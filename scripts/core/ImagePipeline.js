import { SettingsManager } from './SettingsManager.js';

export class ImagePipeline {
  async process(file) {
    if (!file) {
      throw new Error('No image file provided');
    }

    if (file instanceof Blob && file.type === 'image/webp') {
      const compressEnabled = SettingsManager.get(SettingsManager.KEYS.COMPRESS_ENABLED);
      if (!compressEnabled) {
        return file;
      }
    }

    const img = await this._loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas rendering context unavailable');
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    return this._toWebpBlob(canvas);
  }

  async _loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';

      if (file instanceof File || file instanceof Blob) {
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image'));
        };
        img.src = objectUrl;
      } else if (typeof file === 'string') {
        const resolvedUrl = this._normalizeUrl(file);
        if (!this._isAllowedUrl(resolvedUrl)) {
          reject(new Error('Unsupported image URL protocol'));
          return;
        }
        if (this._isRemoteUrl(resolvedUrl)) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image from URL'));
        img.src = resolvedUrl;
      } else {
        reject(new Error('Unsupported image source'));
      }
    });
  }

  async _toWebpBlob(canvas) {
    const compressEnabled = SettingsManager.get(SettingsManager.KEYS.COMPRESS_ENABLED);
    const quality = compressEnabled ? SettingsManager.get(SettingsManager.KEYS.COMPRESS_QUALITY) : 1;

    if (!canvas.toBlob) {
      throw new Error('Canvas toBlob is not supported');
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to encode image'));
          return;
        }
        resolve(blob);
      }, 'image/webp', quality);
    });
  }

  async loadFromUrl(url) {
    const resolvedUrl = this._normalizeUrl(url);
    if (!this._isRemoteUrl(resolvedUrl)) {
      throw new Error('Only http/https URLs are supported');
    }

    const response = await fetch(resolvedUrl, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Failed to load image from URL: ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('URL did not return an image');
    }
    return blob;
  }

  async loadFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            return item.getType(type);
          }
        }
      }
      throw new Error('No image found in clipboard');
    } catch (error) {
      throw new Error(`Clipboard access failed: ${error.message}`);
    }
  }

  _normalizeUrl(value) {
    try {
      return new URL(String(value ?? ''), window.location.origin).toString();
    } catch {
      throw new Error('Invalid image URL');
    }
  }

  _isAllowedUrl(url) {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:' || protocol === 'data:' || protocol === 'blob:';
  }

  _isRemoteUrl(url) {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  }
}
