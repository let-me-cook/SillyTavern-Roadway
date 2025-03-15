import { st_echo } from './config';
import { buildPrompt } from './prompt-builder';

const extensionName = 'SillyTavern-Roadway';
const globalContext = SillyTavern.getContext();

const DEFAULT_SETTINGS: { enabled: boolean; profileId: string; prompt: string } = {
  enabled: true,
  profileId: '',
  prompt: `You are an AI assistant designed to generate creative possible actions in a roleplaying scenario. Given the following context, suggest a diverse list of options for the player to take.

Output ONLY a numbered list of the possible actions. Each action should be a clear, actionable, and concise sentence written in plain text. Include actions that relate to multiple domains (e.g., observation, manipulation, dialogue, combat, deduction.) Do not include greetings, farewells, or polite thanks in the list. Do not use words like "you". Use at least 5 actions.

Use this template:

1. [Action 1]
2. [Action 2]
3. [Action 3]
4. [Action 4]
5. [Action 5]`,
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

  const promptElement = settingsContainer.find('.prompt');
  promptElement.val(globalContext.extensionSettings.roadway.prompt);
  promptElement.on('change', function () {
    const context = SillyTavern.getContext();
    const template = promptElement.val() as string;
    if (template !== context.extensionSettings.roadway.prompt) {
      context.extensionSettings.roadway.prompt = template;
      context.saveSettingsDebounced();
    }
  });

  settingsContainer.find('.restore_default').on('click', function () {
    promptElement.val(DEFAULT_SETTINGS.prompt);
    promptElement.trigger('change');
  });

  settingsContainer.find('.test').on('click', async function () {
    const context = SillyTavern.getContext();
    if (!context.extensionSettings.roadway.profileId) {
      await st_echo('error', 'Please select a connection profile first in the settings.');
      return;
    }
    if (!context.extensionSettings.roadway.prompt) {
      await st_echo('error', 'Please enter a prompt first in the settings.');
      return;
    }

    const messages = await buildPrompt();
    messages.push({
      content: context.extensionSettings.roadway.prompt,
      role: 'system',
    });
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
