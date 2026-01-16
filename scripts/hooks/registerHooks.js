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

  console.log(`${MODULE_ID} | Hooks registered`);
}
