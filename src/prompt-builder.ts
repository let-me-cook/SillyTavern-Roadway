import {
  characters,
  extension_prompt_types,
  name1,
  name2,
  persona_description_positions,
  selected_group,
  st_baseChatReplace,
  st_formatInstructModeExamples,
  st_getAuthorNote,
  depth_prompt_depth_default,
  st_getGroupDepthPrompts,
  st_getMaxContextSize,
  st_getPromptRole,
  st_parseMesExamples,
  st_renderStoryString,
  this_chid,
  wi_anchor_position,
  world_info_include_names,
  depth_prompt_role_default,
} from './config';
import { ChatCompletionMessage } from './types/types';

export interface Message extends ChatCompletionMessage {
  ignoreInstruct?: boolean;
}

/**
 * It is for text completion.
 * Handles system message (description, scenario, etc.)
 * Handles chat history
 * Handles world info
 * Handles author note, char note.
 * TODO: extensionPrompt
 * Not planning to add: summarize, extensionPrompt[chromadb,vectordb,databank]
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
  const { worldInfoString, worldInfoBefore, worldInfoAfter, worldInfoExamples, worldInfoDepth, anBefore, anAfter } =
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
      { role: st_getPromptRole(worldInfo.role), content: worldInfo.entries.join('\n') },
      ...messages.slice(messages.length - worldInfo.depth),
    ];
  }

  const groupDepthPrompts = st_getGroupDepthPrompts(selected_group, Number(this_chid));

  if (selected_group && Array.isArray(groupDepthPrompts) && groupDepthPrompts.length > 0) {
    groupDepthPrompts.forEach((value, index) => {
      messages = [
        ...messages.slice(0, messages.length - value.depth),
        { role: value.role, content: value.text },
        ...messages.slice(messages.length - value.depth),
      ];
    });
  } else {
    const depthPromptText =
      st_baseChatReplace(characters[this_chid]?.data?.extensions?.depth_prompt?.prompt?.trim(), name1, name2) || '';
    const depthPromptDepth = depth_prompt_depth_default;
    const depthPromptRole = characters[this_chid]?.data?.extensions?.depth_prompt?.role ?? depth_prompt_role_default;

    messages = [
      ...messages.slice(0, messages.length - depthPromptDepth),
      { role: st_getPromptRole(depthPromptRole), content: depthPromptText },
      ...messages.slice(messages.length - depthPromptDepth),
    ];
  }

  // TODO: We should respect interval and world info scanning
  const authorNote = st_getAuthorNote();
  let authorNoteIndex = -1;
  if (authorNote.prompt) {
    authorNote.prompt = st_baseChatReplace(authorNote.prompt, name1, name2);
    switch (authorNote.position) {
      case extension_prompt_types.IN_PROMPT: // After first message
        messages = [...messages.slice(0, 1), { role: 'user', content: authorNote.prompt }, ...messages.slice(1)];
        authorNoteIndex = 1;
        break;
      case extension_prompt_types.IN_CHAT: // Depth + role in chat
        messages = [
          ...messages.slice(0, messages.length - authorNote.depth),
          { role: st_getPromptRole(authorNote.role), content: authorNote.prompt },
          ...messages.slice(messages.length - authorNote.depth),
        ];
        authorNoteIndex = messages.length - authorNote.depth - 1;
        break;
      case extension_prompt_types.BEFORE_PROMPT: // Before first message
        messages.unshift({ role: 'user', content: authorNote.prompt });
        authorNoteIndex = 0;
        break;
      default:
        break;
    }
  }

  // Add world info to author note
  if (authorNoteIndex >= 0) {
    if (anBefore.length > 0) {
      messages = [
        ...messages.slice(0, authorNoteIndex),
        { role: 'system', content: anBefore.join('\n') },
        ...messages.slice(authorNoteIndex),
      ];
      authorNoteIndex++;
    }

    if (anAfter.length > 0) {
      messages = [
        ...messages.slice(0, authorNoteIndex + 1),
        { role: 'system', content: anAfter.join('\n') },
        ...messages.slice(authorNoteIndex + 1),
      ];
    }
  }

  return messages;
}
