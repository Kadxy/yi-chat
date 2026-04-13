"use server";

import { validatedActionWithAdminPermission } from "lib/action-utils";
import { headers } from "next/headers";
import { auth } from "auth/server";
import { DEFAULT_USER_ROLE, userRolesInfo } from "app-types/roles";
import {
  UpdateUserRoleSchema,
  UpdateUserRoleActionState,
  UpdateUserBanStatusSchema,
  UpdateUserBanStatusActionState,
  AdjustCreditsSchema,
  AdjustCreditsActionState,
  UpdateUserPlanSchema,
  UpdateUserPlanActionState,
  CreateRedemptionCodeSchema,
  CreateRedemptionCodeActionState,
  ToggleRedemptionCodeSchema,
  ToggleRedemptionCodeActionState,
} from "./validations";
import logger from "lib/logger";
import { getTranslations } from "next-intl/server";
import { getUser } from "lib/user/server";
import { creditRepository, redemptionRepository } from "lib/db/repository";

export const updateUserRolesAction = validatedActionWithAdminPermission(
  UpdateUserRoleSchema,
  async (data, _formData, userSession): Promise<UpdateUserRoleActionState> => {
    const t = await getTranslations("Admin.UserRoles");
    const tCommon = await getTranslations("User.Profile.common");
    const { userId, role: roleInput } = data;

    const role = roleInput || DEFAULT_USER_ROLE;
    if (userSession.user.id === userId) {
      return {
        success: false,
        message: t("cannotUpdateOwnRole"),
      };
    }
    await auth.api.setRole({
      body: { userId, role: role as "user" | "admin" },
      headers: await headers(),
    });
    await auth.api.revokeUserSessions({
      body: { userId },
      headers: await headers(),
    });
    const user = await getUser(userId);
    if (!user) {
      return {
        success: false,
        message: tCommon("userNotFound"),
      };
    }

    return {
      success: true,
      message: t("roleUpdatedSuccessfullyTo", {
        role: userRolesInfo[role].label,
      }),
      user,
    };
  },
);

export const updateUserBanStatusAction = validatedActionWithAdminPermission(
  UpdateUserBanStatusSchema,
  async (
    data,
    _formData,
    userSession,
  ): Promise<UpdateUserBanStatusActionState> => {
    const tCommon = await getTranslations("User.Profile.common");
    const { userId, banned, banReason } = data;

    if (userSession.user.id === userId) {
      return {
        success: false,
        message: tCommon("cannotBanUnbanYourself"),
      };
    }
    try {
      if (!banned) {
        await auth.api.banUser({
          body: {
            userId,
            banReason:
              banReason ||
              (await getTranslations("User.Profile.common"))("bannedByAdmin"),
          },
          headers: await headers(),
        });
        await auth.api.revokeUserSessions({
          body: { userId },
          headers: await headers(),
        });
      } else {
        await auth.api.unbanUser({
          body: { userId },
          headers: await headers(),
        });
      }
      const user = await getUser(userId);
      if (!user) {
        return {
          success: false,
          message: tCommon("userNotFound"),
        };
      }
      return {
        success: true,
        message: user.banned
          ? tCommon("userBannedSuccessfully")
          : tCommon("userUnbannedSuccessfully"),
        user,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        message: tCommon("failedToUpdateUserStatus"),
        error: error instanceof Error ? error.message : tCommon("unknownError"),
      };
    }
  },
);

export const adjustCreditsAction = validatedActionWithAdminPermission(
  AdjustCreditsSchema,
  async (data): Promise<AdjustCreditsActionState> => {
    const { userId, amount, description } = data;
    try {
      const type = amount > 0 ? "admin_grant" : "admin_deduct";
      const result = await creditRepository.adjustCredits({
        userId,
        amount,
        type,
        description:
          description ||
          `Admin ${type === "admin_grant" ? "grant" : "deduction"}`,
      });

      if (!result) {
        return {
          success: false,
          message: "Insufficient balance for deduction.",
        };
      }

      return {
        success: true,
        message: `Credits adjusted by ${amount > 0 ? "+" : ""}${amount}. New balance: ${result.newBalance}`,
        newBalance: result.newBalance,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        message: "Failed to adjust credits.",
      };
    }
  },
);

export const updateUserPlanAction = validatedActionWithAdminPermission(
  UpdateUserPlanSchema,
  async (data): Promise<UpdateUserPlanActionState> => {
    const { userId, plan } = data;
    try {
      await creditRepository.setPlan(userId, plan);
      // Log the plan change (amount=0, just for audit trail)
      await creditRepository.logTransaction({
        userId,
        amount: 0,
        balanceAfter: (await creditRepository.getBalance(userId)).balance,
        type: "subscription",
        description: `Plan changed to ${plan}`,
      });
      return {
        success: true,
        message: `Plan updated to ${plan}.`,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        message: "Failed to update plan.",
      };
    }
  },
);

export const createRedemptionCodeAction = validatedActionWithAdminPermission(
  CreateRedemptionCodeSchema,
  async (
    data,
    _formData,
    userSession,
  ): Promise<CreateRedemptionCodeActionState> => {
    try {
      const code = await redemptionRepository.createCode({
        type: data.type,
        credits: data.credits,
        plan: data.plan,
        planDays: data.planDays,
        planCredits: data.planCredits,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        description: data.description,
        createdBy: userSession.user.id,
      });
      return {
        success: true,
        message: `Redemption code "${code.code}" created.`,
        code,
      };
    } catch (error: any) {
      logger.error(error);
      return {
        success: false,
        message: error?.message || "Failed to create redemption code.",
      };
    }
  },
);

export const toggleRedemptionCodeAction = validatedActionWithAdminPermission(
  ToggleRedemptionCodeSchema,
  async (data): Promise<ToggleRedemptionCodeActionState> => {
    try {
      if (data.isActive) {
        await redemptionRepository.activateCode(data.codeId);
      } else {
        await redemptionRepository.deactivateCode(data.codeId);
      }
      return {
        success: true,
        message: data.isActive ? "Code activated." : "Code deactivated.",
      };
    } catch (error) {
      logger.error(error);
      return { success: false, message: "Failed to update code status." };
    }
  },
);
