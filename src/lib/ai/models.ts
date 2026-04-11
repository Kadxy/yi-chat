import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { LanguageModel } from "ai";
import { ChatModel } from "app-types/chat";
import { ANTHROPIC_FILE_MIME_TYPES } from "./file-support";

const anthropic = createAnthropic({
  baseURL: process.env.ANTHROPIC_API_BASE_URL,
});

const staticModels = {
  anthropic: {
    "haiku-4.5": anthropic("claude-haiku-4-5-20251001"),
    "sonnet-4.6": anthropic("claude-sonnet-4-6"),
    "opus-4.6": anthropic("claude-opus-4-6"),
  },
};

const modelDisplayNames: Record<string, string> = {
  "haiku-4.5": "Haiku 4.5",
  "sonnet-4.6": "Sonnet 4.6",
  "opus-4.6": "Opus 4.6",
};

const providerDisplayNames: Record<string, string> = {
  anthropic: "Anthropic",
};

export const MODEL_IDS = {
  "haiku-4.5": { provider: "anthropic", model: "haiku-4.5" },
  "sonnet-4.6": { provider: "anthropic", model: "sonnet-4.6" },
  "opus-4.6": { provider: "anthropic", model: "opus-4.6" },
} as const satisfies Record<string, ChatModel>;

const staticFilePartSupportByModel = new Map<
  LanguageModel,
  readonly string[]
>();

const registerFileSupport = (
  model: LanguageModel | undefined,
  mimeTypes: readonly string[],
) => {
  if (!model) return;
  staticFilePartSupportByModel.set(model, Array.from(mimeTypes));
};

registerFileSupport(
  staticModels.anthropic["haiku-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["sonnet-4.6"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["opus-4.6"],
  ANTHROPIC_FILE_MIME_TYPES,
);

export const isToolCallUnsupportedModel = (_model: LanguageModel) => {
  return false;
};

export const getFilePartSupportedMimeTypes = (model: LanguageModel) => {
  return staticFilePartSupportByModel.get(model) ?? [];
};

const fallbackModel = staticModels.anthropic["sonnet-4.6"];

export const customModelProvider = {
  modelsInfo: Object.entries(staticModels).map(([provider, models]) => ({
    provider,
    displayName: providerDisplayNames[provider] || provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      displayName: modelDisplayNames[name] || name,
      isToolCallUnsupported: false,
      isImageInputUnsupported: false,
      supportedFileMimeTypes: [...getFilePartSupportedMimeTypes(model)],
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
};
