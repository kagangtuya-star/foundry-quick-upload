import { MODULE_ID, SettingsManager } from './core/SettingsManager.js';
import { PathResolver } from './core/PathResolver.js';
import { ImagePipeline } from './core/ImagePipeline.js';
import { LocalStorageAdapter } from './adapters/LocalStorageAdapter.js';
import { DocumentUpdater } from './core/DocumentUpdater.js';
import { UploadController } from './core/UploadController.js';
import { QuickUploadDialog } from './ui/QuickUploadDialog.js';
import { registerHooks } from './hooks/registerHooks.js';

Hooks.once('init', async function() {
  console.log(`${MODULE_ID} | Initializing Quick Upload module`);

  SettingsManager.register();

  // Expose API for other modules
  game.modules.get(MODULE_ID).api = {
    openDialog: (document, field) => QuickUploadDialog.create(document, field),
    UploadController,
    ImagePipeline,
    PathResolver
  };
});

Hooks.once('ready', async function() {
  console.log(`${MODULE_ID} | Quick Upload module ready`);

  // Initialize upload controller with default adapters
  const storageAdapter = new LocalStorageAdapter();
  const pathResolver = new PathResolver();
  const imagePipeline = new ImagePipeline();
  const documentUpdater = new DocumentUpdater();

  game.modules.get(MODULE_ID).uploadController = new UploadController(
    imagePipeline,
    storageAdapter,
    pathResolver,
    documentUpdater
  );

  registerHooks();
});
