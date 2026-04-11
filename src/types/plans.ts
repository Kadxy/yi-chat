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
  signupCredits: number; // 注册赠送
  dailySignInCredits: number; // 每日签到
  allowedModels: string[]; // 允许使用的模型 ID
};

export const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  free: {
    name: "free",
    label: "Free",
    price: 0,
    monthlyCredits: 0,
    signupCredits: 300,
    dailySignInCredits: 100,
    allowedModels: ["haiku-4.5"],
  },
  plus: {
    name: "plus",
    label: "Plus",
    price: 12,
    monthlyCredits: 1000,
    signupCredits: 0,
    dailySignInCredits: 100,
    allowedModels: ["haiku-4.5", "sonnet-4.6"],
  },
  pro: {
    name: "pro",
    label: "Pro",
    price: 24,
    monthlyCredits: 2000,
    signupCredits: 0,
    dailySignInCredits: 100,
    allowedModels: ["haiku-4.5", "sonnet-4.6", "opus-4.6"],
  },
  max: {
    name: "max",
    label: "Max",
    price: 48,
    monthlyCredits: 5000,
    signupCredits: 0,
    dailySignInCredits: 100,
    allowedModels: ["haiku-4.5", "sonnet-4.6", "opus-4.6"],
  },
};

export const DEFAULT_PLAN: PlanName = PLANS.FREE;

// Credits cost per 1K tokens by model
export const MODEL_CREDIT_COSTS: Record<string, number> = {
  "haiku-4.5": 1, // 基准
  "sonnet-4.6": 5, // 5x
  "opus-4.6": 25, // 25x
};

// 单独充值价格：CNY 10 / 1000 credits
export const CREDIT_TOPUP_RATE = 10;
