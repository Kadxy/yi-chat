"use server";

import {
  generateObject,
  generateText,
  jsonSchema,
  LanguageModel,
  type UIMessage,
} from "ai";

import {
  CREATE_THREAD_TITLE_PROMPT,
  generateExampleToolSchemaPrompt,
} from "lib/ai/prompts";

import type { ChatModel, ChatThread } from "app-types/chat";

import { chatShareRepository, chatRepository } from "lib/db/repository";
import { customModelProvider } from "lib/ai/models";
import { toAny } from "lib/utils";
import { MCPToolInfo } from "app-types/mcp";
import { getSession } from "auth/server";
import logger from "logger";

import { JSONSchema7 } from "json-schema";
import { ObjectJsonSchema7 } from "app-types/util";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

export async function getUserId() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function generateTitleFromUserMessageAction({
  message,
  model,
}: { message: UIMessage; model: LanguageModel }) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const prompt = toAny(message.parts?.at(-1))?.text || "unknown";

  const { text: title } = await generateText({
    model,
    system: CREATE_THREAD_TITLE_PROMPT,
    prompt,
  });

  return title.trim();
}

export async function selectThreadWithMessagesAction(threadId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const thread = await chatRepository.selectThread(threadId);

  if (!thread) {
    logger.error("Thread not found", threadId);
    return null;
  }
  if (thread.userId !== session?.user.id) {
    return null;
  }
  const messages = await chatRepository.selectMessagesByThreadId(threadId);
  return { ...thread, messages: messages ?? [] };
}

export async function deleteThreadAction(threadId: string) {
  await chatRepository.deleteThread(threadId);
}

export async function deleteMessagesByChatIdAfterTimestampAction(
  messageId: string,
) {
  "use server";
  await chatRepository.deleteMessagesByChatIdAfterTimestamp(messageId);
}

export async function updateThreadAction(
  id: string,
  thread: Partial<Omit<ChatThread, "createdAt" | "updatedAt" | "userId">>,
) {
  const userId = await getUserId();
  await chatRepository.updateThread(id, { ...thread, userId });
}

export async function deleteThreadsAction() {
  const userId = await getUserId();
  await chatRepository.deleteAllThreads(userId);
}

export async function deleteUnarchivedThreadsAction() {
  const userId = await getUserId();
  await chatRepository.deleteUnarchivedThreads(userId);
}

export async function archiveThreadAction(threadId: string) {
  await chatRepository.archiveThread(threadId);
}

export async function unarchiveThreadAction(threadId: string) {
  await chatRepository.unarchiveThread(threadId);
}

export async function archiveAllThreadsAction() {
  const userId = await getUserId();
  await chatRepository.archiveAllThreads(userId);
}

export async function generateExampleToolSchemaAction(options: {
  model?: ChatModel;
  toolInfo: MCPToolInfo;
  prompt?: string;
}) {
  const model = customModelProvider.getModel(options.model);

  const schema = jsonSchema(
    toAny({
      ...options.toolInfo.inputSchema,
      properties: options.toolInfo.inputSchema?.properties ?? {},
      additionalProperties: false,
    }),
  );
  const { object } = await generateObject({
    model,
    schema,
    prompt: generateExampleToolSchemaPrompt({
      toolInfo: options.toolInfo,
      prompt: options.prompt,
    }),
  });

  return object;
}

export async function generateObjectAction({
  model,
  prompt,
  schema,
}: {
  model?: ChatModel;
  prompt: {
    system?: string;
    user?: string;
  };
  schema: JSONSchema7 | ObjectJsonSchema7;
}) {
  const result = await generateObject({
    model: customModelProvider.getModel(model),
    system: prompt.system,
    prompt: prompt.user || "",
    schema: jsonSchemaToZod(schema),
  });
  return result.object;
}

export async function shareChatAction({
  threadId,
  expiresAt,
}: {
  threadId: string;
  expiresAt?: Date;
}) {
  const userId = await getUserId();

  const isAccess = await chatRepository.checkAccess(threadId, userId);
  if (!isAccess) {
    return new Response("Unauthorized", { status: 401 });
  }

  return await chatShareRepository.shareChat({
    threadId,
    sharerId: userId,
    expiresAt: expiresAt ?? undefined,
  });
}

export async function continueSharedChatAction(shareId: string) {
  const userId = await getUserId();

  const shared = await chatShareRepository.selectById(shareId);
  if (!shared) {
    throw new Error("Shared chat not found");
  }

  const threadId = crypto.randomUUID();
  await chatRepository.insertThread({
    id: threadId,
    title: shared.title,
    userId,
  });

  if (shared.messages.length > 0) {
    await chatRepository.insertMessages(
      shared.messages.map((m) => ({
        id: crypto.randomUUID(),
        threadId,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      })),
    );
  }

  return threadId;
}
