const MODULE_ID = 'foundry-quick-upload';

export class SettingsManager {
  static KEYS = {
    COMPRESS_ENABLED: 'compressEnabled',
    COMPRESS_QUALITY: 'compressQuality',
    NAMING_TEMPLATE: 'namingTemplate',
    HASH_LENGTH: 'hashLength',
    HOVER_BUTTON: 'hoverButtonEnabled',
    HEADER_BUTTON: 'headerButtonEnabled',
    STORAGE_SOURCE: 'storageSource',
    S3_BUCKET: 's3Bucket',
    PATHS: {
      ACTOR_PORTRAIT: 'pathActorPortrait',
      ACTOR_TOKEN: 'pathActorToken',
      ITEM: 'pathItem',
      SCENE_BACKGROUND: 'pathSceneBackground',
      SCENE_FOREGROUND: 'pathSceneForeground',
      JOURNAL: 'pathJournal',
      ROLL_TABLE: 'pathRollTable',
      CARDS: 'pathCards',
      MACRO: 'pathMacro'
    }
  };

  static register() {
    const s = game.settings;
    const k = this.KEYS;

    // Compression settings
    s.register(MODULE_ID, k.COMPRESS_ENABLED, {
      name: 'FQU.Settings.Compression.Name',
      hint: 'FQU.Settings.Compression.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    s.register(MODULE_ID, k.COMPRESS_QUALITY, {
      name: 'FQU.Settings.Quality.Name',
      hint: 'FQU.Settings.Quality.Hint',
      scope: 'world',
      config: true,
      type: Number,
      range: { min: 0.1, max: 1, step: 0.1 },
      default: 0.8
    });

    // Naming settings
    s.register(MODULE_ID, k.NAMING_TEMPLATE, {
      name: 'FQU.Settings.NamingTemplate.Name',
      hint: 'FQU.Settings.NamingTemplate.Hint',
      scope: 'world',
      config: true,
      type: String,
      default: '{name}-{type}-{hash}'
    });

    s.register(MODULE_ID, k.HASH_LENGTH, {
      name: 'FQU.Settings.HashLength.Name',
      hint: 'FQU.Settings.HashLength.Hint',
      scope: 'world',
      config: true,
      type: Number,
      range: { min: 4, max: 16, step: 1 },
      default: 8
    });

    // UI settings
    s.register(MODULE_ID, k.HOVER_BUTTON, {
      name: 'FQU.Settings.HoverButton.Name',
      hint: 'FQU.Settings.HoverButton.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    s.register(MODULE_ID, k.HEADER_BUTTON, {
      name: 'FQU.Settings.HeaderButton.Name',
      hint: 'FQU.Settings.HeaderButton.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    // Storage settings
    s.register(MODULE_ID, k.STORAGE_SOURCE, {
      name: 'FQU.Settings.StorageSource.Name',
      hint: 'FQU.Settings.StorageSource.Hint',
      scope: 'world',
      config: true,
      type: String,
      choices: {
        data: 'FQU.Settings.StorageSource.Data',
        s3: 'FQU.Settings.StorageSource.S3'
      },
      default: 'data'
    });

    s.register(MODULE_ID, k.S3_BUCKET, {
      name: 'FQU.Settings.S3Bucket.Name',
      hint: 'FQU.Settings.S3Bucket.Hint',
      scope: 'world',
      config: true,
      type: String,
      default: ''
    });

    // Path settings
    this._registerPathSettings();
  }

  static _registerPathSettings() {
    const paths = this.KEYS.PATHS;
    const defaults = {
      [paths.ACTOR_PORTRAIT]: 'images/actors/portraits',
      [paths.ACTOR_TOKEN]: 'images/actors/tokens',
      [paths.ITEM]: 'images/items',
      [paths.SCENE_BACKGROUND]: 'images/scenes/backgrounds',
      [paths.SCENE_FOREGROUND]: 'images/scenes/foregrounds',
      [paths.JOURNAL]: 'images/journals',
      [paths.ROLL_TABLE]: 'images/tables',
      [paths.CARDS]: 'images/cards',
      [paths.MACRO]: 'images/macros'
    };

    const names = {
      [paths.ACTOR_PORTRAIT]: 'FQU.Settings.Paths.ActorPortrait',
      [paths.ACTOR_TOKEN]: 'FQU.Settings.Paths.ActorToken',
      [paths.ITEM]: 'FQU.Settings.Paths.Item',
      [paths.SCENE_BACKGROUND]: 'FQU.Settings.Paths.SceneBackground',
      [paths.SCENE_FOREGROUND]: 'FQU.Settings.Paths.SceneForeground',
      [paths.JOURNAL]: 'FQU.Settings.Paths.Journal',
      [paths.ROLL_TABLE]: 'FQU.Settings.Paths.RollTable',
      [paths.CARDS]: 'FQU.Settings.Paths.Cards',
      [paths.MACRO]: 'FQU.Settings.Paths.Macro'
    };

    for (const [key, defaultPath] of Object.entries(defaults)) {
      game.settings.register(MODULE_ID, key, {
        name: names[key],
        hint: 'FQU.Settings.Paths.Hint',
        scope: 'world',
        config: true,
        type: String,
        default: defaultPath,
        filePicker: 'folder'
      });
    }
  }

  static get(key) {
    return game.settings.get(MODULE_ID, key);
  }

  static async set(key, value) {
    return game.settings.set(MODULE_ID, key, value);
  }

  static getPath(documentKind, field) {
    const paths = this.KEYS.PATHS;
    const mapping = {
      'Actor:portrait': paths.ACTOR_PORTRAIT,
      'Actor:token': paths.ACTOR_TOKEN,
      'Item:image': paths.ITEM,
      'Scene:background': paths.SCENE_BACKGROUND,
      'Scene:foreground': paths.SCENE_FOREGROUND,
      'JournalEntry:image': paths.JOURNAL,
      'RollTable:image': paths.ROLL_TABLE,
      'Cards:image': paths.CARDS,
      'Macro:image': paths.MACRO
    };

    const key = mapping[`${documentKind}:${field}`] || paths.ITEM;
    const rawPath = String(this.get(key) ?? '').trim();
    const s3Match = rawPath.match(/^s3:(?:\/\/)?([^/]+)(?:\/(.*))?$/i);
    const storageSource = this.get(this.KEYS.STORAGE_SOURCE);
    if (storageSource === 's3' || s3Match) {
      const bucket = String(this.get(this.KEYS.S3_BUCKET) ?? '').trim() || s3Match?.[1];
      if (bucket) {
        const s3Path = this._sanitizePath(s3Match ? (s3Match[2] ?? '') : rawPath);
        return s3Path ? `s3:${bucket}/${s3Path}` : `s3:${bucket}`;
      }
    }
    const basePath = this._sanitizePath(rawPath);
    const worldId = game?.world?.id;
    const worldPrefix = worldId ? `worlds/${worldId}/` : '';
    const resolvedPath = basePath.startsWith(worldPrefix)
      ? basePath
      : `${worldPrefix}${basePath}`;
    return resolvedPath.replace(/\/+$/, '');
  }

  static _sanitizePath(value) {
    const raw = String(value ?? '').trim().replace(/\\/g, '/');
    const s3Match = raw.match(/^s3:(?:\/\/)?([^/]+)(?:\/(.*))?$/i);
    if (s3Match) {
      const bucket = s3Match[1];
      const s3Path = String(s3Match[2] ?? '')
        .split('/')
        .filter((part) => part && part !== '.' && part !== '..' && !part.includes(':'))
        .join('/');
      return s3Path ? `s3:${bucket}/${s3Path}` : `s3:${bucket}`;
    }
    const parts = raw.split('/');
    const cleaned = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part || part === '.' || part === '..') continue;
      if (part.includes(':')) {
        if (i === 0 && /^s3:[^/]+$/i.test(part)) {
          cleaned.push(part);
        }
        continue;
      }
      cleaned.push(part);
    }
    if (!cleaned.length) {
      return 'images';
    }
    return cleaned.join('/');
  }
}

export { MODULE_ID };
