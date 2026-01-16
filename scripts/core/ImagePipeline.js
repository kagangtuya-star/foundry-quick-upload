import { SettingsManager } from './SettingsManager.js';

export class ImagePipeline {
  async process(file, transforms = {}) {
    if (!file) {
      throw new Error('No image file provided');
    }

    const img = await this._loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas rendering context unavailable');
    }

    let { width, height } = this._calculateDimensions(img, transforms);
    canvas.width = width;
    canvas.height = height;

    ctx.save();
    this._applyTransforms(ctx, canvas, transforms);
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height);
    ctx.restore();

    if (transforms.crop) {
      return this._applyCrop(canvas, transforms.crop);
    }

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
        img.onerror = (error) => {
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

  _calculateDimensions(img, transforms) {
    let width = img.width;
    let height = img.height;

    if (transforms.scale && transforms.scale !== 1) {
      width = Math.round(width * transforms.scale);
      height = Math.round(height * transforms.scale);
    }

    if (transforms.rotate === 90 || transforms.rotate === 270 ||
        transforms.rotate === -90 || transforms.rotate === -270) {
      [width, height] = [height, width];
    }

    return { width, height };
  }

  _applyTransforms(ctx, canvas, transforms) {
    const { width, height } = canvas;

    ctx.translate(width / 2, height / 2);

    if (transforms.rotate) {
      ctx.rotate((transforms.rotate * Math.PI) / 180);
    }

    if (transforms.flipX) {
      ctx.scale(-1, 1);
    }

    if (transforms.flipY) {
      ctx.scale(1, -1);
    }

    const drawWidth = transforms.rotate === 90 || transforms.rotate === 270 ||
                      transforms.rotate === -90 || transforms.rotate === -270 ? height : width;
    const drawHeight = transforms.rotate === 90 || transforms.rotate === 270 ||
                       transforms.rotate === -90 || transforms.rotate === -270 ? width : height;

    ctx.translate(-drawWidth / 2, -drawHeight / 2);
  }

  async _applyCrop(canvas, crop) {
    const cropWidth = crop?.width ?? crop?.w;
    const cropHeight = crop?.height ?? crop?.h;

    if (!cropWidth || !cropHeight) {
      throw new Error('Invalid crop dimensions');
    }

    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas rendering context unavailable');
    }

    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    ctx.drawImage(
      canvas,
      crop.x, crop.y, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    return this._toWebpBlob(croppedCanvas);
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
    } catch (error) {
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
