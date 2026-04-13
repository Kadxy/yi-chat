import { z } from "zod";
import { USER_ROLES, UserRoleNames } from "app-types/roles";
import { PLANS, type PlanName } from "app-types/plans";

import { ActionState } from "lib/action-utils";
import { BasicUserWithLastLogin } from "app-types/user";
import type { RedemptionCodeEntity } from "lib/db/pg/schema.pg";

export const UpdateUserRoleSchema = z.object({
  userId: z.uuid("Invalid user ID"),
  role: z
    .enum(Object.values(USER_ROLES) as [UserRoleNames, ...UserRoleNames[]])
    .optional(),
});

export const UpdateUserBanStatusSchema = z.object({
  userId: z.uuid("Invalid user ID"),
  banned: z.enum(["true", "false"]).transform((value) => value === "true"),
  banReason: z.string().optional(),
});

export const AdjustCreditsSchema = z.object({
  userId: z.uuid("Invalid user ID"),
  amount: z.coerce.number().refine((v) => v !== 0, "Amount cannot be zero"),
  description: z.string().optional(),
});

export const UpdateUserPlanSchema = z.object({
  userId: z.uuid("Invalid user ID"),
  plan: z.enum(Object.values(PLANS) as [PlanName, ...PlanName[]]),
});

export const CreateRedemptionCodeSchema = z.object({
  type: z.enum(["credits", "plan"]),
  credits: z.coerce.number().min(1).max(1_000_000).optional(),
  plan: z.enum(Object.values(PLANS) as [PlanName, ...PlanName[]]).optional(),
  planDays: z.coerce.number().min(1).max(3650).optional(),
  planCredits: z.coerce.number().min(0).max(1_000_000).optional(),
  expiresAt: z.string().optional(),
  description: z.string().optional(),
});

export const ToggleRedemptionCodeSchema = z.object({
  codeId: z.uuid("Invalid code ID"),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type UpdateUserRoleActionState = ActionState & {
  user?: BasicUserWithLastLogin | null;
};

export type UpdateUserBanStatusActionState = ActionState & {
  user?: BasicUserWithLastLogin | null;
};

export type AdjustCreditsActionState = ActionState & {
  newBalance?: number;
};

export type UpdateUserPlanActionState = ActionState;

export type CreateRedemptionCodeActionState = ActionState & {
  code?: RedemptionCodeEntity;
};

export type ToggleRedemptionCodeActionState = ActionState;
