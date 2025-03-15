// @ts-ignore
import { persona_description_positions, renderStoryString } from '../../../../power-user.js';

import {
  name1,
  name2,
  getMaxContextSize,
  parseMesExamples,
  baseChatReplace,
  chat_metadata,
  extension_prompt_types,
  this_chid,
  characters,
  depth_prompt_role_default,
  depth_prompt_depth_default,
  // @ts-ignore
} from '../../../../../script.js';

// @ts-ignore
import { world_info_include_names, wi_anchor_position, world_info_position } from '../../../../world-info.js';

// @ts-ignore
import { formatInstructModeExamples } from '../../../../instruct-mode.js';

// @ts-ignore
import { getPromptRole } from '../../../../openai.js';

// @ts-ignore
import { metadata_keys } from '../../../../authors-note.js';

// @ts-ignore
import { getGroupDepthPrompts, selected_group } from '../../../../group-chats.js';

export const context = SillyTavern.getContext();

/**
 * Sends an echo message using the SlashCommandParser's echo command.
 */
export async function st_echo(severity: string, message: string): Promise<void> {
  // @ts-ignore
  await SillyTavern.getContext().SlashCommandParser.commands['echo'].callback({ severity: severity }, message);
}

export function st_getMaxContextSize(overrideResponseLength?: number): number {
  return getMaxContextSize(overrideResponseLength);
}

export function st_parseMesExamples(examplesStr: string, isInstruct: boolean): string[] {
  return parseMesExamples(examplesStr, isInstruct);
}

export function st_baseChatReplace(value: any, name1: any, name2: any): any {
  return baseChatReplace(value, name1, name2);
}

export function st_formatInstructModeExamples(mesExamplesArray: string[], name1: string, name2: string): string[] {
  return formatInstructModeExamples(mesExamplesArray, name1, name2);
}

export function st_renderStoryString(params: object): string {
  return renderStoryString(params);
}

export function st_getPromptRole(role: number): string {
  return getPromptRole(role);
}

export function st_getAuthorNote(): {
  prompt: string;
  interval: number;
  position: number;
  depth: number;
  role: number;
} {
  return {
    prompt: chat_metadata[metadata_keys.prompt],
    interval: chat_metadata[metadata_keys.interval],
    position: chat_metadata[metadata_keys.position],
    depth: chat_metadata[metadata_keys.depth],
    role: chat_metadata[metadata_keys.role],
  };
}

export function st_getGroupDepthPrompts(
  groupId: string,
  characterId: number,
): {
  depth: number;
  text: string;
  role: string;
}[] {
  return getGroupDepthPrompts(groupId, characterId);
}
export {
  persona_description_positions,
  name1,
  name2,
  world_info_include_names,
  wi_anchor_position,
  extension_prompt_types,
  selected_group,
  this_chid,
  characters,
  depth_prompt_role_default,
  depth_prompt_depth_default,
};
