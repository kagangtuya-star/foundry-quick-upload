import { MODULE_ID } from '../core/SettingsManager.js';
import { HoverButton } from '../ui/HoverButton.js';
import { HeaderButton } from '../ui/HeaderButton.js';

export function registerHooks() {
  // Actor Sheets
  Hooks.on('renderActorSheet', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectActorSheet(element, app.document);
  });

  // Item Sheets
  Hooks.on('renderItemSheet', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectItemSheet(element, app.document);
  });

  // Scene Config
  Hooks.on('renderSceneConfig', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectSceneConfig(element, app.document);
  });

  // Journal Entry Sheet
  Hooks.on('renderJournalSheet', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectJournalSheet(element, app.document);
  });

  // RollTable Config
  Hooks.on('renderRollTableConfig', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectGenericSheet(element, app.document, 'image');
  });

  // Cards Config
  Hooks.on('renderCardsConfig', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectGenericSheet(element, app.document, 'image');
  });

  // Macro Config
  Hooks.on('renderMacroConfig', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectGenericSheet(element, app.document, 'image');
  });

  // Token Config (Prototype Token)
  Hooks.on('renderTokenConfig', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectTokenConfig(element, app.token?.actor || app.actor || app.document);
  });

  // Prototype Token Config (from Actor sheet)
  Hooks.on('renderPrototypeTokenConfig', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    HoverButton.injectTokenConfig(element, app.actor || app.document);
  });

  // Header Controls for ApplicationV2 sheets
  Hooks.on('getActorSheetHeaderButtons', (app, buttons) => {
    const newButtons = HeaderButton.getButtons(app.document, 'Actor');
    buttons.unshift(...newButtons);
  });

  Hooks.on('getItemSheetHeaderButtons', (app, buttons) => {
    const newButtons = HeaderButton.getButtons(app.document, 'Item');
    buttons.unshift(...newButtons);
  });

  Hooks.on('getSceneConfigHeaderButtons', (app, buttons) => {
    const newButtons = HeaderButton.getButtons(app.document, 'Scene');
    buttons.unshift(...newButtons);
  });

  Hooks.on('getJournalSheetHeaderButtons', (app, buttons) => {
    const newButtons = HeaderButton.getButtons(app.document, 'JournalEntry');
    buttons.unshift(...newButtons);
  });

  Hooks.on('getRollTableConfigHeaderButtons', (app, buttons) => {
    const newButtons = HeaderButton.getButtons(app.document, 'RollTable');
    buttons.unshift(...newButtons);
  });

  Hooks.on('getCardsConfigHeaderButtons', (app, buttons) => {
    const newButtons = HeaderButton.getButtons(app.document, 'Cards');
    buttons.unshift(...newButtons);
  });

  Hooks.on('getMacroConfigHeaderButtons', (app, buttons) => {
    const newButtons = HeaderButton.getButtons(app.document, 'Macro');
    buttons.unshift(...newButtons);
  });

  Hooks.on('renderSettingsConfig', (app, html, data) => {
    const element = html instanceof jQuery ? html[0] : html;
    const form = element?.querySelector('form');
    if (!form) return;
    const sourceSelect = form.querySelector(`select[name="${MODULE_ID}.storageSource"]`);
    const bucketInput = form.querySelector(`input[name="${MODULE_ID}.s3Bucket"]`);
    const bucketGroup = bucketInput?.closest('.form-group');
    if (!bucketInput || !bucketGroup) return;

    const formFields = bucketInput.closest('.form-fields') ?? bucketGroup;
    const bucketSelect = document.createElement('select');
    bucketSelect.className = 'fqu-s3-bucket-select';
    const bucketAriaLabel = game.i18n.localize('FQU.Settings.S3Bucket.AriaLabel');
    const loadingLabel = game.i18n.localize('FQU.Settings.S3Bucket.Loading');
    bucketSelect.setAttribute('aria-label', bucketAriaLabel);
    formFields.appendChild(bucketSelect);

    let bucketsLoaded = false;

    const readBucketsFromFoundry = async () => {
      const fromGameData = game?.data?.files?.s3?.buckets;
      if (Array.isArray(fromGameData) && fromGameData.length) {
        return fromGameData;
      }
      const fromFilePicker = FilePicker?.sources?.s3?.buckets;
      if (Array.isArray(fromFilePicker) && fromFilePicker.length) {
        return fromFilePicker;
      }
      try {
        const result = await FilePicker.browse('s3', '', {});
        const buckets = result?.buckets ?? result?.s3?.buckets ?? result?.sources?.s3?.buckets;
        if (Array.isArray(buckets)) {
          return buckets;
        }
      } catch (error) {
        return [];
      }
      return [];
    };

    const setBucketOptions = (buckets) => {
      bucketSelect.innerHTML = '';
      if (!buckets.length) return;
      bucketSelect.appendChild(new Option('', ''));
      for (const bucket of buckets) {
        bucketSelect.appendChild(new Option(bucket, bucket));
      }
      const current = bucketInput.value?.trim();
      if (current && !buckets.includes(current)) {
        bucketSelect.appendChild(new Option(current, current));
      }
      bucketSelect.value = current ?? '';
    };

    const updateVisibility = () => {
      if (!sourceSelect || !bucketGroup) return;
      const isS3 = sourceSelect.value === 's3';
      bucketGroup.style.display = isS3 ? '' : 'none';
      if (!isS3) return;
      const hasOptions = bucketSelect.options.length > 0;
      bucketSelect.style.display = hasOptions ? '' : 'none';
      bucketInput.style.display = hasOptions ? 'none' : '';
    };

    const ensureBucketsLoaded = async () => {
      if (bucketsLoaded) return;
      bucketsLoaded = true;
      bucketSelect.disabled = true;
      bucketSelect.innerHTML = '';
      bucketSelect.appendChild(new Option(loadingLabel, ''));
      const buckets = await readBucketsFromFoundry();
      setBucketOptions(buckets);
      bucketSelect.disabled = false;
      updateVisibility();
    };

    bucketSelect.addEventListener('change', () => {
      bucketInput.value = bucketSelect.value ?? '';
    });

    bucketInput.addEventListener('input', () => {
      const value = bucketInput.value?.trim();
      if (!bucketSelect.options.length) return;
      const hasOption = Array.from(bucketSelect.options).some((opt) => opt.value === value);
      if (!hasOption && value) {
        bucketSelect.appendChild(new Option(value, value));
      }
      bucketSelect.value = value ?? '';
    });

    sourceSelect?.addEventListener('change', async () => {
      updateVisibility();
      if (sourceSelect.value === 's3') {
        await ensureBucketsLoaded();
      }
    });

    updateVisibility();
    if (sourceSelect?.value === 's3') {
      ensureBucketsLoaded();
    }
  });

  console.log(`${MODULE_ID} | Hooks registered`);
}
