/**
 * All available model IDs in the system.
 *
 * This is the single source of truth for model identifiers.
 * Referenced by:
 *   - src/types/plans.ts       (allowedModels per plan, credit costs)
 *   - src/lib/ai/models.ts     (Anthropic SDK model mapping, display names)
 *   - src/app/api/chat/...     (default model for title generation, etc.)
 */
export const MODEL_ID = {
  HAIKU: "haiku-4.5",
  SONNET: "sonnet-4.6",
  OPUS: "opus-4.6",
} as const;

/** Union type of all model ID strings, e.g. "haiku-4.5" | "sonnet-4.6" | "opus-4.6" */
export type ModelId = (typeof MODEL_ID)[keyof typeof MODEL_ID];
