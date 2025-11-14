// ui.ts - UI setup and interaction functions for the Roadway extension

import { buildPresetSelect } from 'sillytavern-utils-lib';
import { ExtensionSettingsManager } from 'sillytavern-utils-lib';
import { ExtensionSettings, PromptPreset, isExtractionStrategy, isMaxContextType, isMessageRole, isImpersonateApi } from './types.js';
import { KEYS, DEFAULT_PROMPT, DEFAULT_IMPERSONATE } from './config.js';

/**
 * Sets up the connection profile dropdown in the UI.
 */
export function setupConnectionProfileUI(settingsManager: ExtensionSettingsManager<ExtensionSettings>): void {
  const settings = settingsManager.getSettings();
  const globalContext = SillyTavern.getContext();

  globalContext.ConnectionManagerRequestService.handleDropdown(
    '.roadway_settings .connection_profile',
    settings.profileId,
    (profile) => {
      settings.profileId = profile?.id ?? '';
      settingsManager.saveSettings();
    },
  );
}

/**
 * Sets up the prompt preset UI elements.
 */
export function setupPresetUI(settingsManager: ExtensionSettingsManager<ExtensionSettings>): void {
  const settings = settingsManager.getSettings();
  const globalContext = SillyTavern.getContext();

  const settingsContainer = $('.roadway_settings');
  const promptElement = settingsContainer.find('textarea.prompt');
  const extractionStrategyElement = settingsContainer.find('select.extraction_strategy');
  const impersonateSection = settingsContainer.find('.impersonate_section');
  const impersonateElement = settingsContainer.find('textarea.impersonate');

  const { select } = buildPresetSelect('.roadway_settings select.prompt', {
    initialValue: settings.promptPreset,
    initialList: Object.keys(settings.promptPresets),
    readOnlyValues: ['default'],
    onSelectChange: async (_previousValue, newValue) => {
      const newPresetValue = newValue ?? 'default';
      settings.promptPreset = newPresetValue;
      settingsManager.saveSettings();
      promptElement.val(settings.promptPresets[newPresetValue]?.content ?? '');
      extractionStrategyElement.val(settings.promptPresets[newPresetValue]?.extractionStrategy);
      impersonateElement.val(settings.promptPresets[newPresetValue]?.impersonate ?? '');
      impersonateSection.css(
        'display',
        settings.promptPresets[newPresetValue]?.extractionStrategy === 'none' ? 'none' : 'block',
      );
    },
    create: {
      onAfterCreate: (value) => {
        const currentPreset = settings.promptPresets[settings.promptPreset];
        settings.promptPresets[value] = {
          content: currentPreset?.content ?? DEFAULT_PROMPT,
          extractionStrategy: currentPreset?.extractionStrategy ?? 'bullet',
          impersonate: currentPreset?.impersonate ?? DEFAULT_IMPERSONATE,
        };
      },
    },
    rename: {
      onAfterRename: (previousValue, newValue) => {
        settings.promptPresets[newValue] = settings.promptPresets[previousValue];
        delete settings.promptPresets[previousValue];
      },
    },
    delete: {
      onAfterDelete: (value) => {
        delete settings.promptPresets[value];
      },
    },
  });

  promptElement.val(settings.promptPresets[settings.promptPreset]?.content ?? '');
  promptElement.on('change', function () {
    const template = $(this).val() as string;
    settings.promptPresets[settings.promptPreset].content = template;
    settingsManager.saveSettings();
  });

  function updateExtractionStrategy(): void {
    const preset = settings.promptPresets[settings.promptPreset];
    extractionStrategyElement.val(preset?.extractionStrategy);
    const isNone = preset?.extractionStrategy === 'none';
    impersonateSection.toggle(!isNone);
    impersonateElement.val(preset?.impersonate ?? '');
  }
  updateExtractionStrategy();

  extractionStrategyElement.on('change', function () {
    const value = $(this).val() as string;
    if (isExtractionStrategy(value)) {
      settings.promptPresets[settings.promptPreset].extractionStrategy = value;
      settingsManager.saveSettings();
      const isNone = value === 'none';
      impersonateSection.toggle(!isNone);
    }
  });

  impersonateElement.on('change', function () {
    settings.promptPresets[settings.promptPreset].impersonate = $(this).val() as string;
    settingsManager.saveSettings();
  });

  // Update extraction strategy when preset changes
  select.addEventListener('change', updateExtractionStrategy);

  settingsContainer.find('.restore_default').on('click', async function () {
    const confirm = await globalContext.Popup.show.confirm(
      'Are you sure you want to restore the default prompt?',
      'Restore default',
    );
    if (!confirm) {
      return;
    }

    settings.promptPresets['default'] = {
      content: DEFAULT_PROMPT,
      extractionStrategy: 'bullet',
      impersonate: DEFAULT_IMPERSONATE,
    };
    promptElement.val(DEFAULT_PROMPT);
    extractionStrategyElement.val('bullet');
    impersonateElement.val(DEFAULT_IMPERSONATE);
    if (select.value !== 'default') {
      select.value = 'default';
      select.dispatchEvent(new Event('change'));
    } else {
      settingsManager.saveSettings();
    }
  });
}

/**
 * Sets up the context and response settings UI.
 */
export function setupContextUI(settingsManager: ExtensionSettingsManager<ExtensionSettings>): void {
  const settings = settingsManager.getSettings();
  const settingsContainer = $('.roadway_settings');

  const maxContextTypeElement = settingsContainer.find('.max_context_type');
  const maxContextValueElement = settingsContainer.find('.max_context_value');
  const maxContextCustomDiv = settingsContainer.find('.max_context_custom');

  maxContextTypeElement.val(settings.maxContextType);
  maxContextValueElement.val(settings.maxContextValue);

  if (settings.maxContextType === 'custom') {
    maxContextCustomDiv.show();
  }

  maxContextTypeElement.on('change', function () {
    const value = $(this).val() as string;
    if (isMaxContextType(value)) {
      settings.maxContextType = value;
      settingsManager.saveSettings();
      maxContextCustomDiv.toggle(value === 'custom');
    }
  });

  maxContextValueElement.on('change', function () {
    settings.maxContextValue = Number($(this).val());
    settingsManager.saveSettings();
  });

  const maxResponseTokenElement = settingsContainer.find('.max_response_tokens');
  maxResponseTokenElement.val(settings.maxResponseToken);
  maxResponseTokenElement.on('change', function () {
    settings.maxResponseToken = Number($(this).val());
    settingsManager.saveSettings();
  });
}

/**
 * Sets up the auto-trigger and related UI elements.
 */
export function setupTriggerUI(settingsManager: ExtensionSettingsManager<ExtensionSettings>): void {
  const settings = settingsManager.getSettings();
  const settingsContainer = $('.roadway_settings');

  const autoTriggerElement = settingsContainer.find('.auto_trigger');
  autoTriggerElement.prop('checked', settings.autoTrigger);
  autoTriggerElement.on('change', function () {
    settings.autoTrigger = $(this).prop('checked');
    settingsManager.saveSettings();
  });

  const autoOpenElement = settingsContainer.find('.auto_open');
  autoOpenElement.prop('checked', settings.autoOpen);
  autoOpenElement.on('change', function () {
    settings.autoOpen = $(this).prop('checked');
    settingsManager.saveSettings();
  });

  const showUseActionElement = settingsContainer.find('.show_use_action');
  showUseActionElement.prop('checked', settings.showUseActionIcon);

  showUseActionElement.on('change', function () {
    settings.showUseActionIcon = $(this).prop('checked');
    settingsManager.saveSettings();

    // Update visibility of all existing use buttons
    $('.custom-roadway_options .custom-use_action').toggle(settings.showUseActionIcon);
  });

  const autoSubmitUseActionElement = settingsContainer.find('.auto_submit_use_action');
  autoSubmitUseActionElement.prop('checked', settings.autoSubmitUseAction);
  autoSubmitUseActionElement.on('change', function () {
    settings.autoSubmitUseAction = $(this).prop('checked');
    settingsManager.saveSettings();
  });

  const messageRoleElement = settingsContainer.find('.message_role');
  messageRoleElement.val(settings.messageRole);
  messageRoleElement.on('change', function () {
    const value = $(this).val() as string;
    if (isMessageRole(value)) {
      settings.messageRole = value;
      settingsManager.saveSettings();
    }
  });
}

/**
 * Sets up the impersonate API and profile UI.
 */
export function setupImpersonateUI(settingsManager: ExtensionSettingsManager<ExtensionSettings>): void {
  const settings = settingsManager.getSettings();
  const globalContext = SillyTavern.getContext();
  const settingsContainer = $('.roadway_settings');

  const impersonateApiElement = settingsContainer.find('select.impersonate_api');
  const impersonateProfileSection = settingsContainer.find('.impersonate_profile_section');
  impersonateApiElement.val(settings.impersonateApi);
  if (settings.impersonateApi === 'profile') {
    impersonateProfileSection.show();
  }
  impersonateApiElement.on('change', function () {
    const value = $(this).val() as string;
    if (isImpersonateApi(value)) {
      settings.impersonateApi = value;
      settingsManager.saveSettings();
      impersonateProfileSection.toggle(value === 'profile');
    }
  });

  globalContext.ConnectionManagerRequestService.handleDropdown(
    '.roadway_settings .impersonate_connection_profile',
    settings.impersonateProfileId,
    (profile) => {
      settings.impersonateProfileId = profile?.id ?? '';
      settingsManager.saveSettings();
    },
  );
}

/**
 * Sets up the roadway button in the message template.
 */
export function setupRoadwayButton(): void {
  const roadwayButton = $(
    `<div title="Generate Roadway" class="mes_button mes_magic_roadway_button fa-solid fa-road interactable" tabindex="0"></div>`,
  );
  $('#message_template .mes_buttons .extraMesButtons').prepend(roadwayButton);
}

/**
 * Formats the roadway response into HTML details element.
 */
export function formatResponse(settingsManager: ExtensionSettingsManager<ExtensionSettings>, response: string, options?: string[], classPrefix = ''): string {
  const detailsElement = document.createElement('details');
  const summaryElement = document.createElement('summary');
  summaryElement.textContent = 'Roadway';
  detailsElement.appendChild(summaryElement);

  if (options?.length) {
    const optionsDiv = document.createElement('div');
    optionsDiv.classList.add(`${classPrefix}roadway_options`);

    options.forEach((option) => {
      const optionDiv = document.createElement('div');
      optionDiv.classList.add(`${classPrefix}roadway_option`);

      const actionsDiv = document.createElement('div');
      actionsDiv.classList.add(`${classPrefix}option_actions`);

      // Create impersonate button
      const impersonateButton = document.createElement('div');
      impersonateButton.classList.add(`${classPrefix}action_button`, `${classPrefix}impersonate_action`);
      impersonateButton.innerHTML = '✍️';
      impersonateButton.title = 'Impersonate';

      // Create edit button
      const editButton = document.createElement('div');
      editButton.classList.add(`${classPrefix}action_button`, `${classPrefix}edit_action`);
      editButton.innerHTML = '✏️';
      editButton.title = 'Edit';

      // Create use button (only if enabled in settings)
      const settings = settingsManager.getSettings();
      const useButton = document.createElement('div');
      useButton.classList.add(`${classPrefix}action_button`, `${classPrefix}use_action`);
      useButton.innerHTML = '▶️';
      useButton.title = 'Use option';
      useButton.style.display = settings.showUseActionIcon ? 'inline-block' : 'none';
      actionsDiv.appendChild(useButton);

      actionsDiv.appendChild(impersonateButton);
      actionsDiv.appendChild(editButton);

      const contentDiv = document.createElement('div');
      contentDiv.classList.add(`${classPrefix}option_content`);
      contentDiv.textContent = option;

      optionDiv.appendChild(actionsDiv);
      optionDiv.appendChild(contentDiv);
      optionsDiv.appendChild(optionDiv);
    });

    detailsElement.appendChild(optionsDiv);
  } else {
    const preElement = document.createElement('pre');
    preElement.classList.add(`${classPrefix}roadway_pre`);
    preElement.textContent = response;
    detailsElement.appendChild(preElement);
  }

  return detailsElement.outerHTML;
}