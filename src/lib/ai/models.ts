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
    "sonnet-4.5": anthropic("claude-sonnet-4-5"),
    "haiku-4.5": anthropic("claude-haiku-4-5"),
    "opus-4.5": anthropic("claude-opus-4-5"),
  },
};

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
  staticModels.anthropic["sonnet-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["haiku-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["opus-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);

export const isToolCallUnsupportedModel = (_model: LanguageModel) => {
  return false;
};

export const getFilePartSupportedMimeTypes = (model: LanguageModel) => {
  return staticFilePartSupportByModel.get(model) ?? [];
};

const fallbackModel = staticModels.anthropic["sonnet-4.5"];

export const customModelProvider = {
  modelsInfo: Object.entries(staticModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
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
