import { MODEL_ID, type ModelId } from "./models";

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
  price: number; // CNY/月, 0 for free
  monthlyCredits: number; // 每月赠送 credits
  allowedModels: ModelId[];
};

export const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  free: {
    name: "free",
    label: "Free",
    price: 0,
    monthlyCredits: 0,
    allowedModels: [MODEL_ID.HAIKU],
  },
  plus: {
    name: "plus",
    label: "Plus",
    price: 12,
    monthlyCredits: 1000,
    allowedModels: [MODEL_ID.HAIKU, MODEL_ID.SONNET],
  },
  pro: {
    name: "pro",
    label: "Pro",
    price: 24,
    monthlyCredits: 2000,
    allowedModels: [MODEL_ID.HAIKU, MODEL_ID.SONNET, MODEL_ID.OPUS],
  },
  max: {
    name: "max",
    label: "Max",
    price: 48,
    monthlyCredits: 5000,
    allowedModels: [MODEL_ID.HAIKU, MODEL_ID.SONNET, MODEL_ID.OPUS],
  },
};

export const DEFAULT_PLAN: PlanName = PLANS.FREE;

// ── Global credit settings ──

export const SIGNUP_CREDITS = 300;
export const DAILY_SIGN_IN_CREDITS = 100;

// ── Model credit costs ──

// Based on Anthropic API pricing — output is 5x input across all models
export type ModelCreditCost = {
  input: number; // credits per 1K input tokens
  output: number; // credits per 1K output tokens
};

export const MODEL_CREDIT_COSTS: Record<ModelId, ModelCreditCost> = {
  [MODEL_ID.HAIKU]: { input: 1, output: 5 },
  [MODEL_ID.SONNET]: { input: 3, output: 15 },
  [MODEL_ID.OPUS]: { input: 5, output: 25 },
};

/**
 * Calculate credit cost for a single request
 */
export function calculateCreditCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const cost = MODEL_CREDIT_COSTS[modelId as ModelId];
  if (!cost) return 0;
  return (inputTokens * cost.input + outputTokens * cost.output) / 1000;
}

// ── Top-up pricing ──

// 单独充值价格：CNY 10 / 1000 credits
export const CREDIT_TOPUP_RATE = 10;
