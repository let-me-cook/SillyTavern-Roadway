import { EventEmitter } from 'stream';
import { AutoModeOptions } from './types';
import { Message } from '../prompt-builder';

declare global {
  interface WIPromptResult {
    worldInfoString: string;
    worldInfoBefore: string;
    worldInfoAfter: string;
    worldInfoExamples: any[];
    worldInfoDepth: {
      depth: number;
      role: number;
      entries: string[];
    }[];
    anBefore: string[];
    anAfter: string[];
  }

  interface ExtractedData {
    content: string;
    reasoning?: string;
  }

  interface ConnectionProfile {
    id: string;
    mode: string;
    name?: string;
    api?: string;
    preset?: string;
    model?: string;
    proxy?: string;
    instruct?: string;
    context?: string;
    instruct_state?: string;
    tokenizer?: string;
    stop_strings?: string;
    exclude?: string[];
  }

  interface SillyTavernContext {
    eventSource: EventEmitter;
    getRequestHeaders: () => {
      'Content-Type': string;
      'X-CSRF-Token': any;
    };
    renderExtensionTemplateAsync: (
      extensionName: string,
      templateId: string,
      templateData?: object,
      sanitize?: boolean,
      localize?: boolean,
    ) => Promise<string>;
    extensionSettings: {
      roadway: {
        enabled: boolean;
        profileId: string;
      };
    };
    saveSettingsDebounced: () => void;
    callGenericPopup: (
      content: JQuery<HTMLElement> | string | Element,
      type: POPUP_TYPE,
      inputValue?: string,
      popupOptions?: PopupOptions,
    ) => Promise<POPUP_RESULT | string | (boolean | null)>;
    Popup: {
      show: {
        confirm: (message: string, title?: string) => Promise<boolean>;
      };
    };
    chat: {
      name: string;
      mes: string;
      is_user?: boolean;
      is_system?: boolean;
      extra?: {
        tool_invocations?: any[];
        append_title?: boolean;
        title?: string;
      };
    }[];
    getCharacterCardFields: () => {
      system: string;
      mesExamples: string;
      description: string;
      personality: string;
      persona: string;
      scenario: string;
      jailbreak: string;
      version: string;
    };
    powerUserSettings: {
      persona_description_position: number;
    };
    getWorldInfoPrompt: (chat: string[], maxContext: number, isDryRun: boolean) => Promise<WIPromptResult>;
    ToolManager: {
      isToolCallingSupported(): boolean;
      canPerformToolCalls(type: string): boolean;
      RECURSE_LIMIT: number;
    };
    ConnectionManagerRequestService: {
      sendRequest: (
        profileId: string,
        prompt: string | Message[],
        maxTokens: number,
        custom?: {
          extractData?: boolean;
          includePreset?: boolean;
          includeInstruct?: boolean;
        },
      ) => Promise<ExtractedData>;
      handleDropdown: (
        selector: string,
        initialSelectedProfileId: string,
        onChange: (profile?: ConnectionProfile) => void,
      ) => void;
    };
    extensionPrompts: Record<
      string,
      {
        value: string;
        role: number;
        position: number;
        identifier: string;
      }
    >;
  }

  const SillyTavern: {
    getContext(): SillyTavernContext;
  };
}

export {};
