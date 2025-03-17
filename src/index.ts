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

const DEFAULT_PROMPT = `You are an AI brainstorming partner, helping to create immersive and surprising roleplaying experiences. Given the following context, your task is to generate an *unpredictable* and *engaging* list of options for the player.

Output ONLY a numbered list of possible actions. Each action should be a clear, actionable, concise, and *creative* sentence written in plain text.

Prioritize *varied* actions that span multiple domains:

{Observation/Investigation; Dialogue/Persuasion; Stealth/Intrigue; Combat/Conflict; Crafting/Repair; Knowledge/Lore; Movement/Traversal; Deception/Manipulation; Performance/Entertainment; Technical/Mechanical}.

Avoid obvious or repetitive actions. Push the boundaries of the situation. Challenge the player's expectations. Do not include greetings, farewells, polite thanks, or options that break character. Generate *exactly* 10 actions. The actions must be written in plain text.

Here are a few example actions to inspire creativity:

1. Attempt to communicate with the forest creatures to learn the location of hidden trails.
2. Bribe the corrupt city guard with a song and a dance.
3. Stage a fake ambush to draw out a hidden enemy.`;

const DEFAULT_SETTINGS: ExtensionSettings = {
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
  const pendingRequests = new Set<number>();
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
      if (pendingRequests.has(targetMessageId)) {
        await st_echo('warning', 'A request for this message is already in progress. Please wait.');
        return;
      }

      pendingRequests.add(targetMessageId);
      $(this).addClass('spinning');

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
    } finally {
      pendingRequests.delete(targetMessageId);
      $('.mes_magic_roadway_button').removeClass('spinning');
    }
  });

  function formatResponse(response: string): string {
    const detailsElement = document.createElement('details');
    const summaryElement = document.createElement('summary');
    const preElement = document.createElement('pre');
    preElement.classList.add('roadway_pre');
    summaryElement.textContent = 'Roadway';
    preElement.textContent = response;
    detailsElement.append(summaryElement, preElement);
    return detailsElement.outerHTML;
  }
}

function initializeEvents() { }

initializeDefaultSettings();
handleUIChanges();
initializeEvents();
