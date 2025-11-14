// core.ts - Core logic functions for the Roadway extension

import { buildPrompt } from 'sillytavern-utils-lib';
const globalContext = SillyTavern.getContext();
import {
  characters,
  selected_group,
  st_echo,
  st_runCommandCallback,
  system_avatar,
  systemUserName,
} from 'sillytavern-utils-lib/config';
import { ChatMessage, EventNames, ExtractedData, StreamResponse } from 'sillytavern-utils-lib/types';
import { ChatCompletionPreset } from 'sillytavern-utils-lib/types/chat-completion';
import { TextCompletionPreset } from 'sillytavern-utils-lib/types/text-completion';
import { Generator } from 'sillytavern-utils-lib';
import { ExtensionSettingsManager } from 'sillytavern-utils-lib';
import { ExtensionSettings } from './types.js';
import { KEYS } from './config.js';
import { formatResponse } from './ui.js';

/**
 * Simple interface for character objects to avoid 'any' type.
 */
interface CharacterLike {
  avatar: string;
}

/**
 * Extracts bullet points from a text string.
 */
export function extractBulletPoints(text: string): string[] {
  const matches = text.match(/^(?:\d+\.(?:\s+|(?=\S))|-\s+)(.*)$/gm) || [];
  return matches.map((line) => {
    return line.replace(/^(?:\d+\.(?:\s+|(?=\S))|-\s+)/, '').trim();
  });
}

/**
 * Generates roadway options for a given message.
 */
export async function generateRoadwayOptions(
  settingsManager: ExtensionSettingsManager<ExtensionSettings>,
  targetMessageId: number,
): Promise<void> {
  const globalContext = SillyTavern.getContext();
  const settings = settingsManager.getSettings();

  if (!settings.profileId) {
    await st_echo('error', 'Please select a connection profile first in the settings.');
    return;
  }
  if (!settings.promptPreset) {
    await st_echo('error', 'Please enter a prompt first in the settings.');
    return;
  }

  const context = SillyTavern.getContext();
  const profile = context.extensionSettings.connectionManager?.profiles?.find(
    (profile) => profile.id === settings.profileId,
  );

  const apiMap = profile?.api ? context.CONNECT_API_MAP[profile.api] : null;
  const targetMessage = context.chat.find((_mes, index) => index === targetMessageId);
  if (!targetMessage) {
    return;
  }

  let characterId: number | undefined = characters.findIndex(
    (char: CharacterLike) => char.avatar === targetMessage.original_avatar,
  );
  characterId = characterId !== -1 ? characterId : undefined;

  const pendingRequests = new Set<number>();
  if (pendingRequests.has(targetMessageId)) {
    await st_echo('warning', 'A request for this message is already in progress. Please wait.');
    return;
  }

  pendingRequests.add(targetMessageId);
  $('.mes_magic_roadway_button').addClass('spinning');

  try {
    const promptResult = await buildPrompt(apiMap?.selected!, {
      targetCharacterId: characterId,
      messageIndexesBetween: {
        end: targetMessageId,
      },
      presetName: profile?.preset,
      contextName: profile?.context,
      instructName: profile?.instruct,
      syspromptName: profile?.sysprompt,
      maxContext:
        settings.maxContextType === 'custom'
          ? settings.maxContextValue
          : settings.maxContextType === 'profile'
            ? 'preset'
            : 'active',
      includeNames: !!selected_group,
    });
    const messages = promptResult.result;
    messages.push({
      content: context.substituteParams(settings.promptPresets[settings.promptPreset].content),
      role: settings.messageRole,
    });
    const rest = (await context.ConnectionManagerRequestService.sendRequest(
      settings.profileId,
      messages,
      settings.maxResponseToken,
    )) as ExtractedData;

    let actions: string[] = [];
    const extractionStrategy = settings.promptPresets[settings.promptPreset]?.extractionStrategy;
    if (extractionStrategy === 'bullet') {
      actions = extractBulletPoints(rest.content);
      if (actions.length === 0) {
        await st_echo('warning', 'Could not extract any bullet points from the response. Using original response.');
      }
    }

    const innerText = actions?.length
      ? actions.map((action, index) => `${index + 1}. ${action}`).join('\n')
      : rest.content;

    const existMessage = context.chat.find((mes) => mes.extra?.[KEYS.EXTRA.TARGET] === targetMessageId);
    let newMessage: ChatMessage = existMessage ?? {
      mes: formatResponse(settingsManager, innerText, extractionStrategy === 'bullet' ? actions : undefined),
      name: systemUserName,
      force_avatar: system_avatar,
      is_system: true,
      is_user: false,
      extra: {
        isSmallSys: true,
        [KEYS.EXTRA.TARGET]: targetMessageId,
        [KEYS.EXTRA.RAW_CONTENT]: innerText,
        [KEYS.EXTRA.OPTIONS]: actions,
      },
    };

    if (existMessage) {
      newMessage.mes = formatResponse(settingsManager, innerText, extractionStrategy === 'bullet' ? actions : undefined);
      newMessage.extra![KEYS.EXTRA.RAW_CONTENT] = rest.content;
      newMessage.extra![KEYS.EXTRA.OPTIONS] = actions;
      const detailsElement = $(`[mesid="${targetMessageId + 1}"] .mes_text`);
      detailsElement.html(
        formatResponse(settingsManager, innerText, extractionStrategy === 'bullet' ? actions : undefined, 'custom-'),
      );
    } else {
      context.chat.push(newMessage);
      context.addOneMessage(newMessage, { insertAfter: targetMessageId });
    }
    const detailsElement = $(`[mesid="${targetMessageId + 1}"] .mes_text details`);
    if (settings.autoOpen && !detailsElement.attr('open')) {
      detailsElement.attr('open', '');
    }
    attachRoadwayOptionHandlers(settingsManager, targetMessageId + 1);

    await context.saveChat();
  } catch (error) {
    console.error(error);
    await st_echo('error', `Error: ${error}`);
  } finally {
    pendingRequests.delete(targetMessageId);
    $('.mes_magic_roadway_button').removeClass('spinning');
  }
}

/**
 * Handles the impersonate action for a roadway option.
 */
export async function handleImpersonateAction(
  settingsManager: ExtensionSettingsManager<ExtensionSettings>,
  roadwayMessageId: number,
  index: number,
): Promise<void> {
  const context = SillyTavern.getContext();
  const message = context.chat.find((mes, idx) => idx === roadwayMessageId);
  if (!message) {
    return;
  }

  const settings = settingsManager.getSettings();
  const preset = settings.promptPresets[context.extensionSettings[KEYS.EXTENSION].promptPreset];
  if (!preset || !preset.impersonate) {
    await st_echo('error', 'Preset not found. Please check the extension settings.');
    return;
  }

  const impersonate = globalContext.substituteParams(
    preset.impersonate,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      roadwaySelected: message.extra?.[KEYS.EXTRA.OPTIONS]?.[index],
    },
    undefined,
  );

  if (settings.impersonateApi === 'profile') {
    if (!settings.impersonateProfileId) {
      await st_echo('error', 'Please select an impersonation connection profile in the settings.');
      return;
    }

    const profile = context.extensionSettings.connectionManager?.profiles?.find(
      (profile) => profile.id === settings.impersonateProfileId,
    );

    const apiMap = profile?.api ? context.CONNECT_API_MAP[profile.api] : null;
    if (!apiMap?.selected) {
      await st_echo('error', 'Please select an API in the connection profile.');
      return;
    }

    globalContext.deactivateSendButtons();
    const generator = new Generator();
    let lastRequestId: string | undefined;
    try {
      const promptResult = await buildPrompt(apiMap.selected, {
        presetName: profile?.preset,
        contextName: profile?.context,
        instructName: profile?.instruct,
        syspromptName: profile?.sysprompt,
        maxContext:
          settings.maxContextType === 'custom'
            ? settings.maxContextValue
            : settings.maxContextType === 'profile'
              ? 'preset'
              : 'active',
        includeNames: !!selected_group,
      });
      const messages = promptResult.result;
      messages.push({
        role: 'system',
        content: impersonate,
      });

      let streamingEnabled = true;
      let maxResponseToken = settings.maxResponseToken;
      if (apiMap.selected === 'openai') {
        const preset = globalContext.getPresetManager('openai').getCompletionPresetByName(profile?.preset) as
          | ChatCompletionPreset
          | undefined;
        if (preset) {
          streamingEnabled = preset.stream_openai;
          maxResponseToken = preset.openai_max_tokens;
        }
      } else if (apiMap.selected === 'textgenerationwebui') {
        const preset = globalContext
          .getPresetManager('textgenerationwebui')
          .getCompletionPresetByName(profile?.preset) as TextCompletionPreset | undefined;
        if (preset) {
          streamingEnabled = preset.streaming ?? context.textCompletionSettings.streaming ?? false;
          maxResponseToken = preset.genamt ?? maxResponseToken;
        }
      }

      const textInputElement = $('#send_textarea');
      const abortController = new AbortController();
      await generator.generateRequest(
        {
          profileId: settings.impersonateProfileId,
          prompt: messages,
          maxTokens: maxResponseToken,
          custom: {
            stream: streamingEnabled,
            signal: streamingEnabled ? abortController.signal : undefined,
          },
        },
        {
          abortController: streamingEnabled ? abortController : undefined,
          onStart(uuid) {
            lastRequestId = uuid;
            globalContext.eventSource.emit(EventNames.GENERATION_STARTED, 'impersonate', {
              signal: streamingEnabled ? abortController.signal : undefined,
            });
          },
          onEntry(data) {
            if (streamingEnabled && data) {
              textInputElement.val((data as StreamResponse).text);
              textInputElement.trigger('input');
              textInputElement.trigger('change');
            }
          },
          onFinish(data, error) {
            if (!streamingEnabled && data) {
              textInputElement.val((data as ExtractedData).content);
              textInputElement.trigger('input');
              textInputElement.trigger('change');
            }

            if (error) {
              st_echo('error', `Error: ${error}`);
            }

            globalContext.activateSendButtons();
          },
        },
      );
    } catch (error) {
      console.error(error);
      await st_echo('error', `Error: ${error}`);
    } finally {
      globalContext.activateSendButtons();
      lastRequestId = undefined;
    }
  } else {
    st_runCommandCallback('impersonate', undefined, impersonate);
  }
}

/**
 * Attaches event handlers to roadway option buttons.
 */
export function attachRoadwayOptionHandlers(
  settingsManager: ExtensionSettingsManager<ExtensionSettings>,
  roadwayMessageId: number,
): void {
  const optionsContainer = $(`[mesid="${roadwayMessageId}"] .custom-roadway_options`);
  optionsContainer.find('.custom-action_button').off();

  const context = SillyTavern.getContext();

  // Handle impersonate action
  optionsContainer.find('.custom-impersonate_action').on('click', async function () {
    const parentOption = $(this).closest('.custom-roadway_option');
    const index = optionsContainer.find('.custom-roadway_option').index(parentOption);
    await handleImpersonateAction(settingsManager, roadwayMessageId, index);
  });

  // Handle use action
  optionsContainer.find('.custom-use_action').on('click', function () {
    const parentOption = $(this).closest('.custom-roadway_option');
    const contentDiv = parentOption.find('.custom-option_content');
    const text = contentDiv.text();

    if (text) {
      $('#send_textarea').val(text);
      $('#send_textarea').trigger('input');

      if (settingsManager.getSettings().autoSubmitUseAction) {
        $('#send_but').trigger('click');
      }

      const useButton = $(this);
      useButton.html('✓');
      setTimeout(() => {
        useButton.html('▶️');
      }, 1000);
    }
  });

  // Handle edit action
  optionsContainer.find('.custom-edit_action').on('click', async function () {
    const parentOption = $(this).closest('.custom-roadway_option');
    const contentDiv = parentOption.find('.custom-option_content');
    const originalText = contentDiv.text();

    // Create input for editing
    const input = $('<textarea>').val(originalText).css({
      width: '100%',
      minHeight: '50px',
      resize: 'vertical',
      backgroundColor: 'var(--SmartThemeBlurTintColor)',
      color: 'var(--SmartThemeBodyColor)',
      border: '1px solid var(--SmartThemeBorderColor)',
      borderRadius: 'var(--avatar-base-border-radius)',
      padding: 'calc(var(--mainFontSize) * 0.5)',
    });

    contentDiv.empty().append(input);
    input.trigger('focus');

    // Handle save on blur
    input.on('blur', function () {
      const newText = input.val() as string;
      contentDiv.text(newText);

      // Update the stored options
      const message = context.chat.find((_mes, index) => index === roadwayMessageId);
      if (message?.extra?.[KEYS.EXTRA.OPTIONS]) {
        const index = optionsContainer.find('.custom-roadway_option').index(parentOption);
        message.extra[KEYS.EXTRA.OPTIONS][index] = newText;
        context.saveChat();
      }
    });

    // Handle save on enter (shift+enter for new line)
    input.on('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        input.trigger('blur');
      }
    });
  });
}

/**
 * Initializes event listeners for the extension.
 */
export function initializeEvents(settingsManager: ExtensionSettingsManager<ExtensionSettings>): void {
  const globalContext = SillyTavern.getContext();

  // If last message is roadway, add event listener
  globalContext.eventSource.on(EventNames.CHAT_CHANGED, () => {
    const context = SillyTavern.getContext();
    if (!context.chat.length) {
      return;
    }

    $('.custom-roadway_options .custom-use_action').toggle(settingsManager.getSettings().showUseActionIcon);
    const lastMessage = context.chat[context.chat.length - 1];
    if (typeof lastMessage.extra?.[KEYS.EXTRA.TARGET] === 'number') {
      attachRoadwayOptionHandlers(settingsManager, context.chat.length - 1);
    }
  });

  let lastRenderedMessageId = -1;
  // Auto trigger when new character message is received
  // @ts-ignore
  globalContext.eventSource.makeFirst(EventNames.CHARACTER_MESSAGE_RENDERED, (messageId: number, type?: string) => {
    lastRenderedMessageId = messageId;
    const settings = settingsManager.getSettings();
    if (!settings.autoTrigger || type === 'group_chat' || selected_group) {
      return;
    }

    // Simulate clicking the roadway button for this message
    const messageBlock = $(`[mesid="${messageId}"]`);
    messageBlock.find('.mes_magic_roadway_button').trigger('click');
  });

  const allowed_group_types: (string | undefined)[] = ['normal', 'continue', 'swipe'];
  // @ts-ignore
  globalContext.eventSource.makeFirst(
    EventNames.GROUP_WRAPPER_FINISHED,
    (params: { groupId: string; type?: string }) => {
      const settings = settingsManager.getSettings();
      if (!settings.autoTrigger || lastRenderedMessageId === -1 || !allowed_group_types.includes(params.type)) {
        return;
      }

      // Simulate clicking the roadway button for this message
      const messageBlock = $(`[mesid="${lastRenderedMessageId}"]`);
      messageBlock.find('.mes_magic_roadway_button').trigger('click');
    },
  );

  $('#mes_stop').on('click', () => {
    // Note: generator is not accessible here, need to handle differently
    // For now, assume it's handled elsewhere
  });
}

/**
 * Checks if required imports are available.
 */
export function importCheck(): boolean {
  const globalContext = SillyTavern.getContext();
  if (!globalContext.ConnectionManagerRequestService) {
    return false;
  }

  if (!globalContext.getCharacterCardFields) {
    return false;
  }

  if (!globalContext.getWorldInfoPrompt) {
    return false;
  }

  return true;
}