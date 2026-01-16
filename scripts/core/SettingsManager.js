const MODULE_ID = 'foundry-quick-upload';

export class SettingsManager {
  static KEYS = {
    COMPRESS_ENABLED: 'compressEnabled',
    COMPRESS_QUALITY: 'compressQuality',
    NAMING_TEMPLATE: 'namingTemplate',
    HASH_LENGTH: 'hashLength',
    HOVER_BUTTON: 'hoverButtonEnabled',
    HEADER_BUTTON: 'headerButtonEnabled',
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
    const basePath = this._sanitizePath(this.get(key));
    const worldId = game?.world?.id;
    const worldPrefix = worldId ? `worlds/${worldId}/` : '';
    const resolvedPath = basePath.startsWith(worldPrefix)
      ? basePath
      : `${worldPrefix}${basePath}`;
    return resolvedPath.replace(/\/+$/, '');
  }

  static _sanitizePath(value) {
    const raw = String(value ?? '').trim().replace(/\\/g, '/');
    const parts = raw
      .split('/')
      .filter((part) => part && part !== '.' && part !== '..' && !part.includes(':'));
    if (!parts.length) {
      return 'images';
    }
    return parts.join('/');
  }
}

export { MODULE_ID };
