// types.ts - Custom type definitions for the Roadway extension

import { ChatMessage } from 'sillytavern-utils-lib/types';

/**
 * Represents a preset for generating prompts in the Roadway extension.
 */
export interface PromptPreset {
  /** The content of the prompt template. */
  content: string;
  /** The strategy for extracting data from responses. */
  extractionStrategy: 'bullet' | 'none';
  /** Optional impersonation prompt. */
  impersonate?: string;
}

/**
 * Settings for the Roadway extension.
 */
export interface ExtensionSettings {
  /** Version of the extension. */
  version: string;
  /** Format version for data migration. */
  formatVersion: string;
  /** ID of the connection profile to use. */
  profileId: string;
  /** Type of max context configuration. */
  maxContextType: 'profile' | 'sampler' | 'custom';
  /** Value for max context when type is custom. */
  maxContextValue: number;
  /** Maximum number of response tokens. */
  maxResponseToken: number;
  /** Name of the current prompt preset. */
  promptPreset: string;
  /** Whether to auto-trigger on new messages. */
  autoTrigger: boolean;
  /** Whether to auto-open roadway details. */
  autoOpen: boolean;
  /** Available prompt presets. */
  promptPresets: Record<string, PromptPreset>;
  /** API to use for impersonation. */
  impersonateApi: 'main' | 'profile';
  /** Profile ID for impersonation when using profile API. */
  impersonateProfileId: string;
  /** Whether to show the use action icon. */
  showUseActionIcon: boolean;
  /** Whether to auto-submit when using an action. */
  autoSubmitUseAction: boolean;
  /** Role for the message in the prompt. */
  messageRole: 'user' | 'system' | 'assistant';
}

/**
 * Type guard to check if a value is a valid extraction strategy.
 */
export function isExtractionStrategy(value: string): value is 'bullet' | 'none' {
  return value === 'bullet' || value === 'none';
}

/**
 * Type guard to check if a value is a valid max context type.
 */
export function isMaxContextType(value: string): value is 'profile' | 'sampler' | 'custom' {
  return value === 'profile' || value === 'sampler' || value === 'custom';
}

/**
 * Type guard to check if a value is a valid message role.
 */
export function isMessageRole(value: string): value is 'user' | 'system' | 'assistant' {
  return value === 'user' || value === 'system' || value === 'assistant';
}

/**
 * Type guard to check if a value is a valid impersonate API.
 */
export function isImpersonateApi(value: string): value is 'main' | 'profile' {
  return value === 'main' || value === 'profile';
}