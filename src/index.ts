import { buildPrompt } from './prompt-builder';

const extensionName = 'SillyTavern-Roadway';
const context = SillyTavern.getContext();

const DEFAULT_SETTINGS: { enabled: boolean } = {
  enabled: true,
};

function initializeDefaultSettings(): void {
  context.extensionSettings.roadway = context.extensionSettings.roadway || {};

  let anyChange: boolean = false;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    // @ts-ignore
    if (context.extensionSettings.roadway[key] === undefined) {
      // @ts-ignore
      context.extensionSettings.roadway[key] = DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS];
      anyChange = true;
    }
  }

  if (anyChange) {
    context.saveSettingsDebounced();
  }
}

async function handleUIChanges(): Promise<void> {
  const settings: string = await context.renderExtensionTemplateAsync(
    `third-party/${extensionName}`,
    'templates/settings',
  );
  $('#extensions_settings').append(settings);

  const settingsContainer = $('.roadway_settings');

  settingsContainer
    .find('#roadway_enabled')
    .prop('checked', context.extensionSettings.roadway.enabled)
    .on('change', async function () {
      context.extensionSettings.roadway.enabled = !context.extensionSettings.roadway.enabled;
      context.saveSettingsDebounced();
    });

  settingsContainer.find('.test').on('click', async function () {
    const messages = await buildPrompt();
    const rest = await context.ConnectionManagerRequestService.sendRequest(
      '051ef178-61a3-41e2-a0c3-1cc1e15908ed',
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
