import { z } from "zod";
import { ActionState } from "lib/action-utils";

export const RedeemCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(32).trim(),
});

export type RedeemCodeActionState = ActionState & {
  creditsAwarded?: number;
  newBalance?: number;
  plan?: string;
  planDays?: number;
};
