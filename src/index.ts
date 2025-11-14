import { ExtensionSettingsManager } from 'sillytavern-utils-lib';
import { st_echo } from 'sillytavern-utils-lib/config';
import { ExtensionSettings } from './types.js';
import { EXTENSION_NAME, VERSION, FORMAT_VERSION, KEYS, DEFAULT_SETTINGS } from './config.js';
import {
  setupConnectionProfileUI,
  setupPresetUI,
  setupContextUI,
  setupTriggerUI,
  setupImpersonateUI,
  setupRoadwayButton,
} from './ui.js';
import { generateRoadwayOptions, initializeEvents, importCheck } from './core.js';

const settingsManager = new ExtensionSettingsManager<ExtensionSettings>(KEYS.EXTENSION, DEFAULT_SETTINGS);

/**
 * Handles UI changes by setting up all UI components.
 */
async function handleUIChanges(): Promise<void> {
  const globalContext = SillyTavern.getContext();
  const settingsHtml: string = await globalContext.renderExtensionTemplateAsync(
    `third-party/${EXTENSION_NAME}`,
    'templates/settings',
  );
  $('#extensions_settings').append(settingsHtml);

  setupConnectionProfileUI(settingsManager);
  setupPresetUI(settingsManager);
  setupContextUI(settingsManager);
  setupTriggerUI(settingsManager);
  setupImpersonateUI(settingsManager);
  setupRoadwayButton();

  // Attach click handler to roadway button
  $(document).on('click', '.mes_magic_roadway_button', async function () {
    const messageBlock = $(this).closest('.mes');
    const targetMessageId = Number(messageBlock.attr('mesid'));
    await generateRoadwayOptions(settingsManager, targetMessageId);
  });
}

/**
 * Main initialization function.
 */
function main(): void {
  handleUIChanges();
  initializeEvents(settingsManager);
}

// Check imports and initialize
if (!importCheck()) {
  const errorStr = '[Roadway Error] Make sure ST is updated.';
  st_echo('error', errorStr);
} else {
  settingsManager
    .initializeSettings()
    .then((result) => {
      if (result.version.changed) {
        // 0.3.0 to 0.4.0
        if (result.oldSettings.version < '0.4.0' && result.newSettings.version === '0.4.0') {
          st_echo('info', '[Roadway] Added impersonate with connection profile api. Check extension settings.');
        }
      }
      main();
    })
    .catch((error) => {
      st_echo('error', error);
      const globalContext = SillyTavern.getContext();
      globalContext.Popup.show
        .confirm('Data migration failed. Do you want to reset the roadway data?', 'Roadway')
        .then((result) => {
          if (result) {
            settingsManager.resetSettings();
            main();
          }
        });
    });
}
