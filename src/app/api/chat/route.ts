import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";

import { customModelProvider } from "lib/ai/models";

import { chatRepository } from "lib/db/repository";
import globalLogger from "logger";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { chatApiSchemaRequestBodySchema, ChatMetadata } from "app-types/chat";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  extractInProgressToolPart,
  loadMcpTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import { buildCsvIngestionPreviewParts } from "@/lib/ai/ingest/csv-ingest";
import { serverFileStorage } from "lib/file-storage";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const {
      id,
      message,
      chatModel,
      toolChoice,
      thinkingEnabled,
      allowedMcpServers,
      attachments = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = customModelProvider.getModel(chatModel);
    const thinkingConfig = customModelProvider.getThinkingConfig(chatModel);

    let thread = await chatRepository.selectThreadDetails(id);

    if (!thread) {
      logger.info(`create chat thread: ${id}`);
      const newThread = await chatRepository.insertThread({
        id,
        title: "",
        userId: session.user.id,
      });
      thread = await chatRepository.selectThreadDetails(newThread.id);
    }

    if (thread!.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const messages: UIMessage[] = (thread?.messages ?? []).map((m) => {
      return {
        id: m.id,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      };
    });

    if (messages.at(-1)?.id == message.id) {
      messages.pop();
    }
    const ingestionPreviewParts = await buildCsvIngestionPreviewParts(
      attachments,
      (key) => serverFileStorage.download(key),
    );
    if (ingestionPreviewParts.length) {
      const baseParts = [...message.parts];
      let insertionIndex = -1;
      for (let i = baseParts.length - 1; i >= 0; i -= 1) {
        if (baseParts[i]?.type === "text") {
          insertionIndex = i;
          break;
        }
      }
      if (insertionIndex !== -1) {
        baseParts.splice(insertionIndex, 0, ...ingestionPreviewParts);
        message.parts = baseParts;
      } else {
        message.parts = [...baseParts, ...ingestionPreviewParts];
      }
    }

    if (attachments.length) {
      const firstTextIndex = message.parts.findIndex(
        (part: any) => part?.type === "text",
      );
      const attachmentParts: any[] = [];

      attachments.forEach((attachment) => {
        const exists = message.parts.some(
          (part: any) =>
            part?.type === attachment.type && part?.url === attachment.url,
        );
        if (exists) return;

        if (attachment.type === "file") {
          attachmentParts.push({
            type: "file",
            url: attachment.url,
            mediaType: attachment.mediaType,
            filename: attachment.filename,
          });
        } else if (attachment.type === "source-url") {
          attachmentParts.push({
            type: "source-url",
            url: attachment.url,
            mediaType: attachment.mediaType,
            title: attachment.filename,
          });
        }
      });

      if (attachmentParts.length) {
        if (firstTextIndex >= 0) {
          message.parts = [
            ...message.parts.slice(0, firstTextIndex),
            ...attachmentParts,
            ...message.parts.slice(firstTextIndex),
          ];
        } else {
          message.parts = [...message.parts, ...attachmentParts];
        }
      }
    }

    messages.push(message);

    const isToolCallAllowed = toolChoice != "none";

    const metadata: ChatMetadata = {
      toolChoice: toolChoice,
      toolCount: 0,
      chatModel: chatModel,
      thinkingEnabled: !!thinkingEnabled && thinkingConfig != null,
    };

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const MCP_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() => loadMcpTools(allowedMcpServers))
          .orElse({});

        const APP_DEFAULT_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() => loadAppDefaultTools())
          .orElse({});
        const inProgressToolParts = extractInProgressToolPart(message);
        if (inProgressToolParts.length) {
          await Promise.all(
            inProgressToolParts.map(async (part) => {
              const output = await manualToolExecuteByLastMessage(
                part,
                { ...MCP_TOOLS, ...APP_DEFAULT_TOOLS },
                request.signal,
              );
              part.output = output;

              dataStream.write({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output,
              });
            }),
          );
        }

        const userPreferences = thread?.userPreferences || undefined;

        const systemPrompt = buildUserSystemPrompt(
          session.user,
          userPreferences,
        );

        const vercelAITooles = safe({
          ...MCP_TOOLS,
        })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS, // APP_DEFAULT_TOOLS Not Supported Manual
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        logger.info(`tool mode: ${toolChoice}`);

        logger.info(`allowedMcpServers: ${allowedMcpServers?.length ?? 0}`);
        logger.info(
          `binding tool count APP_DEFAULT: ${Object.keys(APP_DEFAULT_TOOLS ?? {}).length}, MCP: ${Object.keys(MCP_TOOLS ?? {}).length}`,
        );
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);
        logger.info(`tools: ${JSON.stringify(Object.keys(vercelAITooles))}`);
        logger.info(
          `thinking: ${thinkingEnabled ? "on" : "off"} (${thinkingConfig?.type ?? "unsupported"})`,
        );

        // Build thinking providerOptions from model config.
        // adaptive → Opus 4.6 / Sonnet 4.6 (Claude decides depth)
        // enabled  → Haiku 4.5 (fixed budget_tokens)
        // null     → model doesn't support thinking
        const useThinking = !!thinkingEnabled && thinkingConfig != null;

        const providerOptions = (() => {
          if (!useThinking || !thinkingConfig) return undefined;
          if (thinkingConfig.type === "adaptive") {
            return { anthropic: { thinking: { type: "adaptive" } } };
          }
          return {
            anthropic: {
              thinking: {
                type: "enabled",
                budgetTokens: thinkingConfig.budgetTokens,
              },
            },
          };
        })() as Parameters<typeof streamText>[0]["providerOptions"];

        // Haiku with budget_tokens needs maxOutputTokens > budgetTokens
        const thinkingMaxOutput =
          useThinking && thinkingConfig?.type === "enabled"
            ? thinkingConfig.budgetTokens + 16384
            : undefined;

        const result = streamText({
          model,
          system: systemPrompt,
          messages: await convertToModelMessages(messages),
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 0,
          maxOutputTokens: thinkingMaxOutput,
          tools:
            Object.keys(vercelAITooles).length > 0 ? vercelAITooles : undefined,
          stopWhen: stepCountIs(10),
          toolChoice:
            Object.keys(vercelAITooles).length > 0 ? "auto" : undefined,
          providerOptions,
          abortSignal: request.signal,
          onError: (event) => {
            logger.error(`streamText error: ${JSON.stringify(event)}`);
          },
        });
        result.consumeStream();

        // Measure thinking duration: time from stream start to first text output.
        // More reliable than tracking individual events.
        const streamStartTime = useThinking ? Date.now() : null;

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            messageMetadata: ({ part }) => {
              if (
                part.type === "text-start" &&
                streamStartTime &&
                !metadata.thinkingDurationMs
              ) {
                metadata.thinkingDurationMs = Date.now() - streamStartTime;
              }
              if (part.type == "finish") {
                metadata.usage = part.totalUsage;
                return metadata;
              }
            },
          }),
        );
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        if (responseMessage.id == message.id) {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            ...responseMessage,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        } else {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: message.role,
            parts: message.parts.map(convertToSavePart),
            id: message.id,
          });
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: responseMessage.role,
            id: responseMessage.id,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error: any) {
    logger.error(error);
    return Response.json({ message: error.message }, { status: 500 });
  }
}
