// config.ts - Configuration constants and defaults for the Roadway extension

import { ExtensionSettings, PromptPreset } from './types.js';

/**
 * Extension metadata constants.
 */
export const EXTENSION_NAME = 'SillyTavern-Roadway';
export const VERSION = '0.4.0';
export const FORMAT_VERSION = 'F_1.0';

/**
 * Keys for storing extension data.
 */
export const KEYS = {
  EXTENSION: 'roadway',
  EXTRA: {
    TARGET: 'roadway_target_chat',
    RAW_CONTENT: 'roadway_raw_content',
    OPTIONS: 'roadway_options',
  },
} as const;

/**
 * Default impersonation prompt template.
 */
export const DEFAULT_IMPERSONATE = `Your task this time is to write your response as if you were {{user}}, impersonating their style. Use {{user}}'s dialogue and actions so far as a guideline for how they would likely act. Don't ever write as {{char}}. Only talk and act as {{user}}. This is what {{user}}'s focus:

{{roadwaySelected}}`;

/**
 * Default prompt template for generating roadway options.
 */
export const DEFAULT_PROMPT = `You are an AI brainstorming partner, helping to create immersive and surprising roleplaying experiences, **building upon the established context from our previous conversation.** Your task is to generate an *unpredictable* and *engaging* list of options for **{{user}}**, specifically tailored to their character, the world, and the current situation as established in our previous dialogue. These should be framed as possible actions that **{{user}}** *could* take.

Output ONLY a numbered list of possible actions. Each action should be a clear, actionable, concise, and *creative* sentence written in plain text suggesting an action **{{user}}** can perform in the game.

Prioritize *varied* actions that span multiple domains:

{Observation/Investigation; Dialogue/Persuasion; Stealth/Intrigue; Combat/Conflict; Crafting/Repair; Knowledge/Lore; Movement/Traversal; Deception/Manipulation; Performance/Entertainment; Technical/Mechanical}.

Avoid obvious or repetitive actions **that {{user}} has already explored or are contrary to the established character/world.** Push the boundaries of the situation. Challenge **{{user}}'s** expectations. Do not include greetings, farewells, polite thanks, or options that break character. Generate *exactly* 6 actions. The actions must be written in plain text.

Here are a few example actions to inspire creativity:

1. Attempt to communicate with the forest creatures to learn the location of hidden trails.
2. Bribe the corrupt city guard with a song and a dance.
3. Stage a fake ambush to draw out a hidden enemy.`;

/**
 * Default settings for the extension.
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  version: VERSION,
  formatVersion: FORMAT_VERSION,
  profileId: '',
  maxContextType: 'profile',
  maxContextValue: 16384,
  maxResponseToken: 500,
  promptPreset: 'default',
  autoTrigger: false,
  autoOpen: true,
  impersonateApi: 'main',
  impersonateProfileId: '',
  showUseActionIcon: true,
  autoSubmitUseAction: false,
  messageRole: 'system',
  promptPresets: {
    default: {
      content: DEFAULT_PROMPT,
      extractionStrategy: 'bullet',
      impersonate: DEFAULT_IMPERSONATE,
    },
  },
};