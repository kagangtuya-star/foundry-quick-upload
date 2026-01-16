import { MODULE_ID } from '../core/SettingsManager.js';

const getFilerobotPath = () => `modules/${MODULE_ID}/vendor/filerobot/filerobot-image-editor.min.js`;

export class FilerobotAdapter {
  static #modulePromise = null;
  static #FilerobotImageEditor = null;

  #container = null;
  #editor = null;
  #onSave = null;
  #onClose = null;
  #objectUrl = null;

  constructor(options = {}) {
    this.#container = options.container;
    this.#onSave = options.onSave;
    this.#onClose = options.onClose;
  }

  static async loadModule() {
    if (FilerobotAdapter.#FilerobotImageEditor) {
      return FilerobotAdapter.#FilerobotImageEditor;
    }

    if (FilerobotAdapter.#modulePromise) {
      return FilerobotAdapter.#modulePromise;
    }

    FilerobotAdapter.#modulePromise = new Promise((resolve, reject) => {
      if (window.FilerobotImageEditor) {
        FilerobotAdapter.#FilerobotImageEditor = window.FilerobotImageEditor;
        resolve(window.FilerobotImageEditor);
        return;
      }

      const script = document.createElement('script');
      script.src = getFilerobotPath();
      script.async = true;
      script.onload = () => {
        FilerobotAdapter.#FilerobotImageEditor = window.FilerobotImageEditor;
        resolve(window.FilerobotImageEditor);
      };
      script.onerror = () => reject(new Error('Failed to load Filerobot Image Editor'));
      document.head.appendChild(script);
    });

    return FilerobotAdapter.#modulePromise;
  }

  static getConfig(customTranslations = {}) {
    const lang = game.i18n.lang;
    const isZh = lang === 'zh-CN' || lang === 'zh' || lang === 'cn' || lang.startsWith('zh');

    const zhTranslations = {
      // 基础操作
      name: '名称', save: '保存', saveAs: '另存为', back: '返回',
      loading: '加载中...', cancel: '取消', apply: '应用',
      warning: '警告', confirm: '确认', download: '下载',
      // 操作提示
      resetOperations: '重置/删除所有操作',
      changesLoseWarningHint: '如果点击"重置"，您的更改将丢失。是否继续？',
      discardChangesWarningHint: '如果关闭，您的最后更改将不会被保存。',
      discardChanges: '放弃更改',
      undoTitle: '撤销上一步操作', redoTitle: '重做上一步操作',
      showImageTitle: '显示原图',
      zoomInTitle: '放大', zoomOutTitle: '缩小', toggleZoomMenuTitle: '切换缩放菜单',
      // 标签页
      adjustTab: '调整', finetuneTab: '微调', filtersTab: '滤镜',
      watermarkTab: '水印', annotateTabLabel: '标注', resizeTab: '调整大小',
      tabsMenu: '菜单',
      // 裁剪
      cropTool: '裁剪', original: '原始', custom: '自由裁剪',
      square: '正方形', landscape: '横版', portrait: '竖版',
      ellipse: '椭圆', classicTv: '经典电视', cinemascope: '宽银幕',
      widescreen: '宽屏',
      // Foundry 预设
      foundry: 'Foundry VTT', tokens: 'Token', portraits: '肖像',
      tokenSquare: 'Token (标准)', tokenLarge: 'Token (大)',
      portraitStandard: '肖像 (标准)', portraitLarge: '肖像 (大)',
      // 旋转/翻转
      rotateTool: '旋转', unFlipX: '取消水平翻转', flipX: '水平翻转',
      unFlipY: '取消垂直翻转', flipY: '垂直翻转',
      // 调整工具
      brightnessTool: '亮度', contrastTool: '对比度', hsvTool: 'HSV',
      hue: '色相', brightness: '亮度', saturation: '饱和度', value: '明度',
      warmthTool: '色温', blur: '模糊', blurTool: '模糊',
      // 标注工具
      arrowTool: '箭头', lineTool: '线条', penTool: '画笔',
      polygonTool: '多边形', sides: '边数',
      rectangleTool: '矩形', cornerRadius: '圆角',
      ellipseTool: '椭圆', textTool: '文字',
      // 文字选项
      textSpacings: '文字间距', textAlignment: '文字对齐',
      fontFamily: '字体', size: '大小',
      letterSpacing: '字间距', lineHeight: '行高',
      // 图像
      imageTool: '图片', importing: '导入中...',
      addImage: '+ 添加图片', uploadImage: '上传图片', fromGallery: '从图库选择',
      addImageTitle: '选择要添加的图片...',
      imageName: '图片名称',
      invalidImageError: '提供的图片无效。',
      uploadImageError: '上传图片时出错。',
      areNotImages: '不是图片', isNotImage: '不是图片', toBeUploaded: '待上传',
      mutualizedFailedToLoadImg: '加载图片失败。',
      // 调整大小
      resize: '调整大小', width: '宽度', height: '高度',
      resizeWidthTitle: '宽度 (像素)', resizeHeightTitle: '高度 (像素)',
      toggleRatioLockTitle: '锁定/解锁比例', resetSize: '重置为原始尺寸',
      // 水印
      addWatermark: '+ 添加水印', addTextWatermark: '+ 添加文字水印',
      addWatermarkTitle: '选择水印类型', uploadWatermark: '上传水印',
      addWatermarkAsText: '添加文字水印',
      // 通用属性
      padding: '内边距', paddings: '内边距', shadow: '阴影',
      horizontal: '水平', vertical: '垂直',
      opacity: '不透明度', transparency: '透明度',
      position: '位置', stroke: '描边',
      // 保存
      saveAsModalTitle: '另存为', extension: '扩展名', format: '格式',
      nameIsRequired: '名称为必填项。', quality: '质量',
      imageDimensionsHoverTitle: '保存的图片尺寸 (宽 x 高)',
      cropSizeLowerThanResizedWarning: '注意：所选裁剪区域小于调整后的尺寸，可能导致画质下降',
      actualSize: '实际大小 (100%)', fitSize: '适应大小',
      plus: '+', cropItemNoEffect: '此裁剪项无预览可用'
    };

    const enTranslations = {
      custom: 'Free', square: 'Square', portrait: 'Portrait',
      landscape: 'Landscape', widescreen: 'Widescreen',
      foundry: 'Foundry VTT', tokens: 'Tokens', portraits: 'Portraits',
      tokenSquare: 'Token (Square)', tokenLarge: 'Token (Large)',
      portraitStandard: 'Portrait (Standard)', portraitLarge: 'Portrait (Large)'
    };

    const activeTranslations = isZh
      ? { ...zhTranslations, ...customTranslations }
      : { ...enTranslations, ...customTranslations };

    return {
      tabsIds: ['Adjust', 'Finetune', 'Filters', 'Annotate'],
      defaultTabId: 'Adjust',
      defaultToolId: 'Crop',
      useBackendTranslations: false,
      language: isZh ? 'zh' : 'en',
      avoidChangesNotSavedAlertOnLeave: true,
      defaultSavedImageType: 'webp',
      defaultSavedImageQuality: 0.9,
      forceToPngInEllipticalCrop: false,

      Crop: {
        presetsItems: [
          { titleKey: 'custom', descriptionKey: '', ratio: null },
          { titleKey: 'square', descriptionKey: '1:1', ratio: 1 },
          { titleKey: 'portrait', descriptionKey: '3:4', ratio: 3 / 4 },
          { titleKey: 'landscape', descriptionKey: '4:3', ratio: 4 / 3 },
          { titleKey: 'widescreen', descriptionKey: '16:9', ratio: 16 / 9 }
        ],
        presetsFolders: [
          {
            titleKey: 'foundry',
            groups: [
              {
                titleKey: 'tokens',
                items: [
                  { titleKey: 'tokenSquare', width: 280, height: 280, descriptionKey: '280x280' },
                  { titleKey: 'tokenLarge', width: 400, height: 400, descriptionKey: '400x400' }
                ]
              },
              {
                titleKey: 'portraits',
                items: [
                  { titleKey: 'portraitStandard', width: 300, height: 400, descriptionKey: '300x400' },
                  { titleKey: 'portraitLarge', width: 450, height: 600, descriptionKey: '450x600' }
                ]
              }
            ]
          }
        ]
      },

      Rotate: { angle: 90, componentType: 'buttons' },

      translations: activeTranslations,

      theme: {
        palette: 'dark',
        typography: { fontFamily: 'Signika, sans-serif' }
      }
    };
  }

  #revokeObjectUrl() {
    if (this.#objectUrl) {
      URL.revokeObjectURL(this.#objectUrl);
      this.#objectUrl = null;
    }
  }

  #getSourceUrl(source) {
    if (source instanceof Blob || source instanceof File) {
      this.#revokeObjectUrl();
      this.#objectUrl = URL.createObjectURL(source);
      return this.#objectUrl;
    }
    return source;
  }

  async open(source) {
    if (this.#editor) {
      this.#editor.terminate();
      this.#editor = null;
    }

    const FilerobotImageEditor = await FilerobotAdapter.loadModule();
    const sourceUrl = this.#getSourceUrl(source);

    const config = {
      ...FilerobotAdapter.getConfig(),
      source: sourceUrl,
      onSave: (editedImageObject, designState) => {
        this.#handleSave(editedImageObject, designState);
      }
    };

    this.#editor = new FilerobotImageEditor(this.#container, config);

    this.#editor.render({
      onClose: (closingReason) => {
        this.#handleClose(closingReason);
      }
    });
  }

  async #handleSave(editedImageObject, designState) {
    try {
      let blob;

      if (editedImageObject.imageBase64) {
        const response = await fetch(editedImageObject.imageBase64);
        blob = await response.blob();
      } else if (editedImageObject.imageCanvas) {
        blob = await new Promise((resolve) => {
          editedImageObject.imageCanvas.toBlob(resolve, 'image/webp', 0.9);
        });
      }

      if (blob && this.#onSave) {
        this.#onSave(blob, {
          width: editedImageObject.width,
          height: editedImageObject.height,
          name: editedImageObject.name,
          extension: editedImageObject.extension,
          mimeType: editedImageObject.mimeType
        });
      }
    } catch (error) {
      console.error(`${MODULE_ID} | FilerobotAdapter save error:`, error);
      ui.notifications.error(game.i18n.localize('FQU.Toast.Failed'));
    }
  }

  #handleClose(closingReason) {
    this.destroy();
    if (this.#onClose) {
      this.#onClose(closingReason);
    }
  }

  destroy() {
    if (this.#editor) {
      this.#editor.terminate();
      this.#editor = null;
    }
    this.#revokeObjectUrl();
  }

  get isOpen() {
    return !!this.#editor;
  }
}
