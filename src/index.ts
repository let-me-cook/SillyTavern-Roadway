import { buildPrompt } from 'sillytavern-utils-lib/prompt-builder';
import { buildPresetSelect } from 'sillytavern-utils-lib/preset-select';
import { st_echo, system_avatar, systemUserName } from 'sillytavern-utils-lib/config';
import { ChatMessage } from 'sillytavern-utils-lib/types';

const extensionName = 'SillyTavern-Roadway';
const globalContext = SillyTavern.getContext();

const EXTRA_TARGET_KEY = 'roadway_target_chat';
const EXTRA_RAW_CONTENT_KEY = 'roadway_raw_content';

const EXTENSION_SETTINGS_KEY = 'roadway';

interface ExtensionSettings {
  enabled: boolean;
  profileId: string;
  maxContextType: 'profile' | 'sampler' | 'custom';
  maxContextValue: number;
  maxResponseToken: number;
  promptPreset: string;
  promptPresets: Record<string, { content: string }>;
}

function getExtensionSettings(): ExtensionSettings {
  const context = SillyTavern.getContext();
  return context.extensionSettings[EXTENSION_SETTINGS_KEY] as ExtensionSettings;
}

const DEFAULT_PROMPT = `You are an AI assistant designed to generate creative possible actions in a roleplaying scenario. Given the following context, suggest a diverse list of options for the player to take.

Output ONLY a numbered list of the possible actions. Each action should be a clear, actionable, and concise sentence written in plain text. Include actions that relate to multiple domains (e.g., observation, manipulation, dialogue, combat, deduction.) Do not include greetings, farewells, or polite thanks in the list. Do not use words like "you". Use exact 10 actions.

Example:

1. Examine the ground for any signs of footprints or disturbed earth.
2. Ask Mrs. Abernathy about any local rumors regarding the strange symbol.
3. Search Mr. Peterson's abandoned house for any hidden messages or clues.
4. Attempt to pick the lock on the neighbor's shed, hoping to find something related to their disappearances.
5. Show the photo of the symbol to the local bartender for information.`;

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  profileId: '',
  maxContextType: 'profile',
  maxContextValue: 16384,
  maxResponseToken: 500,
  promptPreset: 'default',
  promptPresets: {
    default: {
      content: DEFAULT_PROMPT,
    },
  },
};

function initializeDefaultSettings(): void {
  globalContext.extensionSettings[EXTENSION_SETTINGS_KEY] =
    globalContext.extensionSettings?.[EXTENSION_SETTINGS_KEY] || {};

  let anyChange: boolean = false;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    // @ts-ignore
    if (globalContext.extensionSettings[EXTENSION_SETTINGS_KEY][key] === undefined) {
      // @ts-ignore
      globalContext.extensionSettings[EXTENSION_SETTINGS_KEY][key] =
        DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS];
      anyChange = true;
    }
  }

  if (anyChange) {
    globalContext.saveSettingsDebounced();
  }
}

async function handleUIChanges(): Promise<void> {
  const settingsHtml: string = await globalContext.renderExtensionTemplateAsync(
    `third-party/${extensionName}`,
    'templates/settings',
  );
  $('#extensions_settings').append(settingsHtml);

  const settingsContainer = $('.roadway_settings');

  settingsContainer
    .find('#roadway_enabled')
    .prop('checked', getExtensionSettings().enabled)
    .on('change', async function () {
      const context = SillyTavern.getContext();
      const settings = getExtensionSettings();
      settings.enabled = !settings.enabled;
      context.saveSettingsDebounced();
    });

  globalContext.ConnectionManagerRequestService.handleDropdown(
    '.roadway_settings .connection_profile',
    getExtensionSettings().profileId,
    (profile) => {
      const context = SillyTavern.getContext();
      const settings = getExtensionSettings();
      settings.profileId = profile ? profile.id : '';
      context.saveSettingsDebounced();
    },
  );

  let settings = getExtensionSettings();
  const { select } = buildPresetSelect('.roadway_settings select.prompt', {
    label: 'prompt',
    initialValue: settings.promptPreset,
    initialList: Object.keys(settings.promptPresets),
    readOnlyValues: ['default'],
    onSelectChange: async (previousValue, newValue) => {
      settings = getExtensionSettings();
      settings.promptPreset = newValue ?? 'default';
      promptElement.val(settings.promptPresets[settings.promptPreset]?.content || '');
      globalContext.saveSettingsDebounced();
    },
    create: {
      onAfterCreate: (value) => {
        settings = getExtensionSettings();
        settings.promptPresets[value] = {
          content: settings.promptPresets[settings.promptPreset]?.content || DEFAULT_PROMPT,
        };
        globalContext.saveSettingsDebounced();
      },
    },
    rename: {
      onAfterRename: (previousValue, newValue) => {
        settings = getExtensionSettings();
        settings.promptPresets[newValue] = settings.promptPresets[previousValue];
        delete settings.promptPresets[previousValue];
        globalContext.saveSettingsDebounced();
      },
    },
    delete: {
      onAfterDelete: (value) => {
        settings = getExtensionSettings();
        delete settings.promptPresets[value];
        globalContext.saveSettingsDebounced();
      },
    },
  });

  const promptElement = settingsContainer.find('textarea.prompt');
  promptElement.val(settings.promptPresets[settings.promptPreset]?.content || '');
  promptElement.on('change', function () {
    settings = getExtensionSettings();
    const template = promptElement.val() as string;
    settings.promptPresets[settings.promptPreset].content = template;
    globalContext.saveSettingsDebounced();
  });

  settingsContainer.find('.restore_default').on('click', async function () {
    const confirm = await globalContext.Popup.show.confirm(
      'Are you sure you want to restore the default prompt?',
      'Restore default',
    );
    if (!confirm) {
      return;
    }

    const settings = getExtensionSettings();
    settings.promptPresets['default'].content = DEFAULT_PROMPT;
    promptElement.val(DEFAULT_PROMPT);
    if (select.value !== 'default') {
      select.value = 'default';
      select.dispatchEvent(new Event('change'));
    } else {
      globalContext.saveSettingsDebounced();
    }
  });

  const maxContextTypeElement = settingsContainer.find('.max_context_type');
  const maxContextValueElement = settingsContainer.find('.max_context_value');
  const maxContextCustomDiv = settingsContainer.find('.max_context_custom');

  maxContextTypeElement.val(getExtensionSettings().maxContextType);
  maxContextValueElement.val(getExtensionSettings().maxContextValue);

  if (getExtensionSettings().maxContextType === 'custom') {
    maxContextCustomDiv.show();
  }

  maxContextTypeElement.on('change', function () {
    const context = SillyTavern.getContext();
    const settings = getExtensionSettings();
    const newType = $(this).val() as 'profile' | 'sampler' | 'custom';
    settings.maxContextType = newType;
    maxContextCustomDiv.toggle(newType === 'custom');
    context.saveSettingsDebounced();
  });

  maxContextValueElement.on('change', function () {
    const context = SillyTavern.getContext();
    const settings = getExtensionSettings();
    settings.maxContextValue = Number($(this).val());
    context.saveSettingsDebounced();
  });

  const maxResponseTokenElement = settingsContainer.find('.max_response_tokens');
  maxResponseTokenElement.val(getExtensionSettings().maxResponseToken);
  maxResponseTokenElement.on('change', function () {
    const context = SillyTavern.getContext();
    const settings = getExtensionSettings();
    settings.maxResponseToken = Number($(this).val());
    context.saveSettingsDebounced();
  });

  const roadwayButton = $(
    `<div title="Generate Roadway" class="mes_button mes_magic_roadway_button fa-solid fa-road interactable" tabindex="0"></div>`,
  );
  $('#message_template .mes_buttons .extraMesButtons').prepend(roadwayButton);
  $(document).on('click', '.mes_magic_roadway_button', async function () {
    const context = SillyTavern.getContext();
    const settings = getExtensionSettings();
    if (!settings.profileId) {
      await st_echo('error', 'Please select a connection profile first in the settings.');
      return;
    }
    if (!settings.promptPreset) {
      await st_echo('error', 'Please enter a prompt first in the settings.');
      return;
    }
    const messageBlock = $(this).closest('.mes');
    const targetMessageId = Number(messageBlock.attr('mesid'));
    const profile = context.extensionSettings.connectionManager?.profiles?.find(
      (profile) => profile.id === settings.profileId,
    );
    const presetName = profile?.preset;
    const contextName = profile?.context;
    const instructName = profile?.instruct;
    const syspromptName = profile?.sysprompt;

    const apiMap = profile?.api ? context.CONNECT_API_MAP[profile.api] : null;

    try {
      const messages = await buildPrompt(apiMap?.selected, targetMessageId, {
        presetName,
        contextName,
        instructName,
        syspromptName,
        maxContext:
          settings.maxContextType === 'custom'
            ? settings.maxContextValue
            : settings.maxContextType === 'profile'
              ? 'preset'
              : 'active',
      });
      messages.push({
        content: settings.promptPresets[settings.promptPreset].content,
        role: 'system',
      });
      const rest = await context.ConnectionManagerRequestService.sendRequest(
        settings.profileId,
        messages,
        settings.maxResponseToken,
      );

      const existMessage = context.chat.find((mes) => mes.extra?.[EXTRA_TARGET_KEY] === targetMessageId);
      let newMessage: ChatMessage = existMessage ?? {
        mes: formatResponse(rest.content),
        name: systemUserName,
        force_avatar: system_avatar,
        is_system: true,
        is_user: false,
        extra: {
          isSmallSys: true,
          [EXTRA_TARGET_KEY]: targetMessageId,
          [EXTRA_RAW_CONTENT_KEY]: rest.content,
        },
      };
      if (existMessage) {
        newMessage.mes = formatResponse(rest.content);
        newMessage.extra![EXTRA_RAW_CONTENT_KEY] = rest.content;
        const index = context.chat.indexOf(existMessage);
        const existMessageTextBlock = $(`[mesid="${index}"] .mes_text pre`);
        existMessageTextBlock.text(rest.content);
      } else {
        context.chat.push(newMessage);
        context.addOneMessage(newMessage, { insertAfter: targetMessageId });
      }
      await context.saveChat();
    } catch (error) {
      console.error(error);
      await st_echo('error', `Error: ${error}`);
    }
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
