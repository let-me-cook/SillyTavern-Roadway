import {
  name1,
  name2,
  persona_description_positions,
  st_baseChatReplace,
  st_formatInstructModeExamples,
  st_getMaxContextSize,
  st_getRoleString,
  st_parseMesExamples,
  st_renderStoryString,
  wi_anchor_position,
  world_info_include_names,
} from './config';
import { ChatCompletionMessage } from './types/types';

export interface Message extends ChatCompletionMessage {
  ignoreInstruct?: boolean;
}

/**
 * It is for text completion.
 * Handles system message (description, scenario, etc.)
 * Handles chat history
 * Handles world info (except author note)
 * TODO: extensionPrompt, author note
 */
export async function buildPrompt(): Promise<Message[]> {
  const context = SillyTavern.getContext();
  let messages: Message[] = [];

  const chat = context.chat;

  let { description, personality, persona, scenario, mesExamples, system, jailbreak } =
    context.getCharacterCardFields();

  const isInstruct = true;
  let mesExamplesArray = st_parseMesExamples(mesExamples, isInstruct);

  const this_max_context = st_getMaxContextSize();
  const canUseTools = context.ToolManager.isToolCallingSupported();
  let coreChat = chat.filter((x) => !x.is_system || (canUseTools && Array.isArray(x.extra?.tool_invocations)));
  const chatForWI = coreChat.map((x) => (world_info_include_names ? `${x.name}: ${x.mes}` : x.mes)).reverse();
  const { worldInfoString, worldInfoBefore, worldInfoAfter, worldInfoExamples, worldInfoDepth } =
    await context.getWorldInfoPrompt(chatForWI, this_max_context, false);

  // Add message example WI
  for (const example of worldInfoExamples) {
    const exampleMessage = example.content;

    if (exampleMessage.length === 0) {
      continue;
    }

    const formattedExample = st_baseChatReplace(exampleMessage, name1, name2);
    const cleanedExample = st_parseMesExamples(formattedExample, isInstruct);

    // Insert depending on before or after position
    if (example.position === wi_anchor_position.before) {
      mesExamplesArray.unshift(...cleanedExample);
    } else {
      mesExamplesArray.push(...cleanedExample);
    }
  }

  // At this point, the raw message examples can be created
  const mesExamplesRawArray = [...mesExamplesArray];

  if (mesExamplesArray && isInstruct) {
    mesExamplesArray = st_formatInstructModeExamples(mesExamplesArray, name1, name2);
  }

  // Build story string
  const storyStringParams = {
    description: description,
    personality: personality,
    persona:
      context.powerUserSettings.persona_description_position == persona_description_positions.IN_PROMPT ? persona : '',
    scenario: scenario,
    system: system,
    char: name2,
    user: name1,
    wiBefore: worldInfoBefore,
    wiAfter: worldInfoAfter,
    loreBefore: worldInfoBefore,
    loreAfter: worldInfoAfter,
    mesExamples: mesExamplesArray.join(''),
    mesExamplesRaw: mesExamplesRawArray.join(''),
  };

  let storyString = st_renderStoryString(storyStringParams);

  messages.push({ role: 'system', content: storyString, ignoreInstruct: true });

  chat
    .filter((message) => !message.is_system)
    .forEach((message) => {
      messages.push({
        role: message.is_user ? 'user' : 'assistant',
        content: message.mes,
      });
    });

  // Inject world info depth.
  for (const worldInfo of worldInfoDepth) {
    messages = [
      ...messages.slice(0, messages.length - worldInfo.depth),
      { role: st_getRoleString(worldInfo.role), content: worldInfo.entries.join('\n') },
      ...messages.slice(messages.length - worldInfo.depth),
    ];
  }

  return messages;
}
