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

import { chatRepository, creditRepository } from "lib/db/repository";
import globalLogger from "logger";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { chatApiSchemaRequestBodySchema, ChatMetadata } from "app-types/chat";
import {
  PLAN_CONFIGS,
  calculateCreditCost,
  type PlanName,
} from "app-types/plans";
import { CHAT_ERROR_CODE } from "app-types/errors";

import {
  handleError,
  loadMcpTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import { buildCsvIngestionPreviewParts } from "@/lib/ai/ingest/csv-ingest";
import { serverFileStorage } from "lib/file-storage";
import { rateLimit } from "lib/rate-limit";
import { NextRequest } from "next/server";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Chat API: `),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const limited = rateLimit(request, "chat", {
      limit: 30,
      windowMs: 60_000,
      key: session.user.id,
    });
    if (limited) return limited;
    const {
      id,
      message,
      chatModel,
      thinkingEnabled,
      allowedMcpServers,
      enabledBuiltinToolTypes,
      attachments = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = customModelProvider.getModel(chatModel);
    const thinkingConfig = customModelProvider.getThinkingConfig(chatModel);

    // ── Credit & plan gate ──
    const { balance, plan } = await creditRepository.getBalance(
      session.user.id,
    );
    const planConfig = PLAN_CONFIGS[plan as PlanName];
    const requestedModel = chatModel?.model;

    // Check model access
    if (
      requestedModel &&
      planConfig &&
      !planConfig.allowedModels.includes(requestedModel as any)
    ) {
      return Response.json(
        { code: CHAT_ERROR_CODE.MODEL_NOT_ALLOWED },
        { status: 403 },
      );
    }

    // Check credit balance
    if (balance <= 0) {
      return Response.json(
        { code: CHAT_ERROR_CODE.INSUFFICIENT_CREDITS },
        { status: 402 },
      );
    }

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

    const metadata: ChatMetadata = {
      toolCount: 0,
      chatModel: chatModel,
      thinkingEnabled: !!thinkingEnabled && thinkingConfig != null,
    };

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const MCP_TOOLS = await loadMcpTools(allowedMcpServers);
        const APP_DEFAULT_TOOLS = await loadAppDefaultTools(
          enabledBuiltinToolTypes,
          attachments.length > 0,
        );

        const userPreferences = thread?.userPreferences || undefined;

        const systemPrompt = buildUserSystemPrompt(
          session.user,
          userPreferences,
        );

        const vercelAITooles = {
          ...MCP_TOOLS,
          ...APP_DEFAULT_TOOLS,
        };
        metadata.toolCount = Object.keys(vercelAITooles).length;

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
          experimental_transform: smoothStream({
            chunking: new Intl.Segmenter("zh", { granularity: "word" }),
          }),
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
                if (requestedModel && part.totalUsage) {
                  metadata.creditCost = calculateCreditCost(
                    requestedModel,
                    part.totalUsage.inputTokens ?? 0,
                    part.totalUsage.outputTokens ?? 0,
                  );
                }
                return metadata;
              }
            },
          }),
        );
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        // Save messages
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

        // Deduct credits based on actual token usage
        if (metadata.usage && requestedModel) {
          const inputTokens = metadata.usage.inputTokens ?? 0;
          const outputTokens = metadata.usage.outputTokens ?? 0;
          const cost = calculateCreditCost(
            requestedModel,
            inputTokens,
            outputTokens,
          );
          metadata.creditCost = cost;

          if (cost > 0) {
            const result = await creditRepository.adjustCredits({
              userId: session.user.id,
              amount: -cost,
              type: "usage",
              model: requestedModel,
              inputTokens,
              outputTokens,
              description: `Chat: ${inputTokens} in / ${outputTokens} out`,
            });
            if (result) {
              logger.info(
                `Credits deducted: ${cost} from user ${session.user.id}, new balance: ${result.newBalance}`,
              );
            }
          }
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error: any) {
    logger.error(`Chat API error: ${error.message}`, error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
