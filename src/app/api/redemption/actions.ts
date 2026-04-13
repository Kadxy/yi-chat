"use server";

import { validatedActionWithUser } from "lib/action-utils";
import { RedeemCodeSchema, type RedeemCodeActionState } from "./validations";
import { redemptionRepository } from "lib/db/repository";
import logger from "lib/logger";

export const redeemCodeAction = validatedActionWithUser(
  RedeemCodeSchema,
  async (data, _formData, user): Promise<RedeemCodeActionState> => {
    try {
      const result = await redemptionRepository.redeemCode(
        user.id,
        data.code.trim(),
      );

      if (!result.success) {
        return {
          success: false,
          message: result.reason,
        };
      }

      if (result.type === "credits") {
        return {
          success: true,
          message: "redeemSuccess",
          creditsAwarded: result.creditsAwarded,
          newBalance: result.newBalance,
        };
      }

      return {
        success: true,
        message: "redeemSuccess",
        creditsAwarded: result.creditsAwarded,
        newBalance: result.newBalance,
        plan: result.plan,
        planDays: result.planDays,
      };
    } catch (error) {
      logger.error("Failed to redeem code:", error);
      return {
        success: false,
        message: "redeemFailed",
      };
    }
  },
);
