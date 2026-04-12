import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { LanguageModel } from "ai";
import { ChatModel } from "app-types/chat";
import { MODEL_ID } from "app-types/models";
import { ANTHROPIC_FILE_MIME_TYPES } from "./file-support";

const anthropic = createAnthropic({
  baseURL: process.env.ANTHROPIC_API_BASE_URL,
});

const staticModels = {
  anthropic: {
    [MODEL_ID.HAIKU]: anthropic("claude-haiku-4-5-20251001"),
    [MODEL_ID.SONNET]: anthropic("claude-sonnet-4-6"),
    [MODEL_ID.OPUS]: anthropic("claude-opus-4-6"),
  },
};

const modelDisplayNames: Record<string, string> = {
  [MODEL_ID.HAIKU]: "Haiku 4.5",
  [MODEL_ID.SONNET]: "Sonnet 4.6",
  [MODEL_ID.OPUS]: "Opus 4.6",
};

const providerDisplayNames: Record<string, string> = {
  anthropic: "Anthropic",
};

export const MODEL_IDS = {
  [MODEL_ID.HAIKU]: { provider: "anthropic", model: MODEL_ID.HAIKU },
  [MODEL_ID.SONNET]: { provider: "anthropic", model: MODEL_ID.SONNET },
  [MODEL_ID.OPUS]: { provider: "anthropic", model: MODEL_ID.OPUS },
} as const satisfies Record<string, ChatModel>;

/**
 * Per-model thinking configuration.
 *
 * Opus 4.6 / Sonnet 4.6 → adaptive thinking (Claude auto-determines depth)
 * Haiku 4.5              → manual thinking with fixed budget_tokens
 *
 * To add a new provider/model, add an entry here.
 * `null` means the model does not support thinking.
 */
export type ModelThinkingConfig =
  | { type: "adaptive" }
  | { type: "enabled"; budgetTokens: number }
  | null;

const modelThinkingConfigs: Record<string, ModelThinkingConfig> = {
  [MODEL_ID.OPUS]: { type: "adaptive" },
  [MODEL_ID.SONNET]: { type: "adaptive" },
  [MODEL_ID.HAIKU]: { type: "enabled", budgetTokens: 10240 },
};

const fallbackModel = staticModels.anthropic[MODEL_ID.SONNET];

export const customModelProvider = {
  modelsInfo: Object.entries(staticModels).map(([provider, models]) => ({
    provider,
    displayName: providerDisplayNames[provider] || provider,
    models: Object.entries(models).map(([name]) => ({
      name,
      displayName: modelDisplayNames[name] || name,
      isThinkingSupported: modelThinkingConfigs[name] != null,
      supportedFileMimeTypes: [...ANTHROPIC_FILE_MIME_TYPES],
    })),
    hasAPIKey:
      !!process.env.ANTHROPIC_API_KEY &&
      process.env.ANTHROPIC_API_KEY !== "****",
  })),
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) return fallbackModel;
    return (
      staticModels[model.provider as keyof typeof staticModels]?.[
        model.model
      ] || fallbackModel
    );
  },
  getThinkingConfig: (model?: ChatModel): ModelThinkingConfig => {
    if (!model) return null;
    return modelThinkingConfigs[model.model] ?? null;
  },
};
