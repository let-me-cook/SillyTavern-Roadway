// @ts-ignore
import { persona_description_positions, renderStoryString } from '../../../../power-user.js';

import {
  name1,
  name2,
  getMaxContextSize,
  parseMesExamples,
  baseChatReplace,
  extension_prompt_roles,
  // @ts-ignore
} from '../../../../../script.js';

// @ts-ignore
import { world_info_include_names, wi_anchor_position } from '../../../../world-info.js';

// @ts-ignore
import { formatInstructModeExamples } from '../../../../instruct-mode.js';

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

export function st_getRoleString(role: number): string {
  if (role === extension_prompt_roles.SYSTEM) {
    return 'system';
  } else if (role === extension_prompt_roles.USER) {
    return 'user';
  } else if (role === extension_prompt_roles.ASSISTANT) {
    return 'assistant';
  }
  return 'unknown';
}

export {
  persona_description_positions,
  name1,
  name2,
  world_info_include_names,
  wi_anchor_position,
  extension_prompt_roles,
};
