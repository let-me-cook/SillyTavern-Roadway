import { st_echo } from './config';
import { buildPrompt } from './prompt-builder';

const extensionName = 'SillyTavern-Roadway';
const globalContext = SillyTavern.getContext();

const DEFAULT_SETTINGS: { enabled: boolean; profileId: string } = {
  enabled: true,
  profileId: '',
};

function initializeDefaultSettings(): void {
  globalContext.extensionSettings.roadway = globalContext.extensionSettings.roadway || {};

  let anyChange: boolean = false;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    // @ts-ignore
    if (globalContext.extensionSettings.roadway[key] === undefined) {
      // @ts-ignore
      globalContext.extensionSettings.roadway[key] = DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS];
      anyChange = true;
    }
  }

  if (anyChange) {
    globalContext.saveSettingsDebounced();
  }
}

async function handleUIChanges(): Promise<void> {
  const settings: string = await globalContext.renderExtensionTemplateAsync(
    `third-party/${extensionName}`,
    'templates/settings',
  );
  $('#extensions_settings').append(settings);

  const settingsContainer = $('.roadway_settings');

  settingsContainer
    .find('#roadway_enabled')
    .prop('checked', globalContext.extensionSettings.roadway.enabled)
    .on('change', async function () {
      const context = SillyTavern.getContext();
      context.extensionSettings.roadway.enabled = !context.extensionSettings.roadway.enabled;
      context.saveSettingsDebounced();
    });

  globalContext.ConnectionManagerRequestService.handleDropdown(
    '.roadway_settings .connection_profile',
    globalContext.extensionSettings.roadway.profileId,
    (profile) => {
      const context = SillyTavern.getContext();
      context.extensionSettings.roadway.profileId = profile ? profile.id : '';
      context.saveSettingsDebounced();
    },
  );

  settingsContainer.find('.test').on('click', async function () {
    const context = SillyTavern.getContext();
    if (!context.extensionSettings.roadway.profileId) {
      await st_echo('error', 'Please select a connection profile first.');
      return;
    }

    const messages = await buildPrompt();
    const rest = await context.ConnectionManagerRequestService.sendRequest(
      context.extensionSettings.roadway.profileId,
      messages,
      150,
    );
    console.log(rest);
  });
}

function initializeEvents() {}

initializeDefaultSettings();
handleUIChanges();
initializeEvents();
