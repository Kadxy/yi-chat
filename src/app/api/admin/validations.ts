import { z } from "zod";
import { USER_ROLES, UserRoleNames } from "app-types/roles";
import { PLANS, type PlanName } from "app-types/plans";

import { ActionState } from "lib/action-utils";
import { BasicUserWithLastLogin } from "app-types/user";

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
