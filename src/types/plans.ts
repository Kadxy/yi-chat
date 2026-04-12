import {
  MODEL_ID,
  MODEL_TIER,
  MODEL_TIERS,
  type ModelId,
  type ModelTierName,
} from "./models";

// ── Plans ──

export const PLANS = {
  FREE: "free",
  PLUS: "plus",
  PRO: "pro",
  MAX: "max",
} as const;

export type PlanName = (typeof PLANS)[keyof typeof PLANS];

export type PlanConfig = {
  name: PlanName;
  label: string;
  priceMonthly: number; // CNY/月 月付价
  priceAnnually: number; // CNY/月 年付价（折算月费）
  monthlyCredits: number;
  modelTier: ModelTierName;
  allowedModels: ModelId[];
};

export const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  free: {
    name: "free",
    label: "Free",
    priceMonthly: 0,
    priceAnnually: 0,
    monthlyCredits: 0,
    modelTier: MODEL_TIER.BASIC,
    allowedModels: MODEL_TIERS[MODEL_TIER.BASIC],
  },
  plus: {
    name: "plus",
    label: "Plus",
    priceMonthly: 24,
    priceAnnually: 20,
    monthlyCredits: 5_000,
    modelTier: MODEL_TIER.ADVANCED,
    allowedModels: MODEL_TIERS[MODEL_TIER.ADVANCED],
  },
  pro: {
    name: "pro",
    label: "Pro",
    priceMonthly: 72,
    priceAnnually: 60,
    monthlyCredits: 22_000,
    modelTier: MODEL_TIER.ALL,
    allowedModels: MODEL_TIERS[MODEL_TIER.ALL],
  },
  max: {
    name: "max",
    label: "Max",
    priceMonthly: 168,
    priceAnnually: 120,
    monthlyCredits: 50_000,
    modelTier: MODEL_TIER.ALL,
    allowedModels: MODEL_TIERS[MODEL_TIER.ALL],
  },
};

export const DEFAULT_PLAN: PlanName = PLANS.FREE;

// ── Plan limits (enforced on frontend) ──

export type PlanLimits = {
  maxFilesPerMessage: number;
  maxFileSizeMB: number;
  maxMcpServers: number; // -1 = unlimited
  contextLength: string; // display label
};

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {
    maxFilesPerMessage: 3,
    maxFileSizeMB: 1,
    maxMcpServers: 1,
    contextLength: "64K",
  },
  plus: {
    maxFilesPerMessage: 3,
    maxFileSizeMB: 10,
    maxMcpServers: 3,
    contextLength: "128K",
  },
  pro: {
    maxFilesPerMessage: 5,
    maxFileSizeMB: 10,
    maxMcpServers: 5,
    contextLength: "1M",
  },
  max: {
    maxFilesPerMessage: 10,
    maxFileSizeMB: 10,
    maxMcpServers: -1,
    contextLength: "1M",
  },
};

// ── Global credit settings ──

export const SIGNUP_CREDITS = 2_000;
export const DAILY_SIGN_IN_CREDITS = 200;

// ── Model credit costs ──

// $1 USD = 1000 credits. Output = 5x input across all models.
export type ModelCreditCost = {
  input: number; // credits per 1K input tokens
  output: number; // credits per 1K output tokens
};

export const MODEL_CREDIT_COSTS: Record<ModelId, ModelCreditCost> = {
  [MODEL_ID.HAIKU]: { input: 2, output: 10 },
  [MODEL_ID.SONNET]: { input: 6, output: 30 },
  [MODEL_ID.OPUS]: { input: 10, output: 50 },
};

/**
 * Calculate credit cost for a single request.
 * Result is ceiled to avoid fractional credits.
 */
export function calculateCreditCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const cost = MODEL_CREDIT_COSTS[modelId as ModelId];
  if (!cost) return 0;
  return Math.ceil(
    (inputTokens * cost.input + outputTokens * cost.output) / 1000,
  );
}

// ── Top-up pricing ──

// ¥10 = 2,500 credits
export const CREDIT_TOPUP_PRICE = 10; // CNY
export const CREDIT_TOPUP_CREDITS = 2_500;
