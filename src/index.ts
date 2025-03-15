import { st_echo, system_avatar, systemUserName } from './config';
import { buildPrompt } from './prompt-builder';

const extensionName = 'SillyTavern-Roadway';
const globalContext = SillyTavern.getContext();

const DEFAULT_SETTINGS: { enabled: boolean; profileId: string; prompt: string } = {
  enabled: true,
  profileId: '',
  prompt: `You are an AI assistant designed to generate creative possible actions in a roleplaying scenario. Given the following context, suggest a diverse list of options for the player to take.

Output ONLY a numbered list of the possible actions. Each action should be a clear, actionable, and concise sentence written in plain text. Include actions that relate to multiple domains (e.g., observation, manipulation, dialogue, combat, deduction.) Do not include greetings, farewells, or polite thanks in the list. Do not use words like "you". Use exact 10 actions.

Example:

1. Examine the ground for any signs of footprints or disturbed earth.
2. Ask Mrs. Abernathy about any local rumors regarding the strange symbol.
3. Search Mr. Peterson's abandoned house for any hidden messages or clues.
4. Attempt to pick the lock on the neighbor's shed, hoping to find something related to their disappearances.
5. Show the photo of the symbol to the local bartender for information.`,
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

  const roadwayButton = $(
    `<div title="Generate Roadway" class="mes_button mes_magic_roadway_button fa-solid fa-road interactable" tabindex="0"></div>`,
  );
  $('#message_template .mes_buttons .extraMesButtons').prepend(roadwayButton);
  $(document).on('click', '.mes_magic_roadway_button', async function () {
    const context = SillyTavern.getContext();
    if (!context.extensionSettings.roadway.profileId) {
      await st_echo('error', 'Please select a connection profile first in the settings.');
      return;
    }
    if (!context.extensionSettings.roadway.prompt) {
      await st_echo('error', 'Please enter a prompt first in the settings.');
      return;
    }
    const messageBlock = $(this).closest('.mes');
    const targetMessageId = Number(messageBlock.attr('mesid'));

    const messages = await buildPrompt();
    messages.push({
      content: context.extensionSettings.roadway.prompt,
      role: 'system',
    });
    const rest = await context.ConnectionManagerRequestService.sendRequest(
      context.extensionSettings.roadway.profileId,
      messages,
      500,
    );

    const existMessage = context.chat.find((mes) => mes.extra?.roadway_target_chat === targetMessageId);
    let newMessage: (typeof context.chat)[0] = existMessage ?? {
      mes: formatResponse(rest.content),
      name: systemUserName,
      force_avatar: system_avatar,
      is_system: true,
      is_user: false,
      extra: {
        isSmallSys: true,
        roadway_target_chat: targetMessageId,
      },
    };
    if (existMessage) {
      newMessage.mes = formatResponse(rest.content);
      const index = context.chat.indexOf(existMessage);
      const existMessageTextBlock = $(`[mesid="${index}"] .mes_text`);
      existMessageTextBlock.html(newMessage.mes);
    } else {
      context.chat.push(newMessage);
      context.addOneMessage(newMessage);
    }
    await context.saveChat();
  });

  function formatResponse(response: string): string {
    const detailsElement = document.createElement('details');
    const summaryElement = document.createElement('summary');
    const preElement = document.createElement('pre');
    summaryElement.textContent = 'Roadway';
    preElement.textContent = response;
    detailsElement.append(summaryElement, preElement);
    return detailsElement.outerHTML;
  }
}

function initializeEvents() {}

initializeDefaultSettings();
handleUIChanges();
initializeEvents();
