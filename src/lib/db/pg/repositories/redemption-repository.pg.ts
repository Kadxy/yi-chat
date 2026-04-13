import { pgDb as db } from "../db.pg";
import {
  CreditTransactionTable,
  RedemptionCodeTable,
  UserTable,
} from "../schema.pg";
import { eq, desc } from "drizzle-orm";
import { PLANS, type PlanName } from "app-types/plans";
import crypto from "crypto";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  plus: 1,
  pro: 2,
  max: 3,
};

const MAX_CREDITS = 1_000_000;
const MAX_PLAN_DAYS = 3650;

function generateRedemptionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(16);
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += chars[bytes[i] % chars.length];
  }
  // Format: XXXX-XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
}

export type RedeemResult =
  | {
      success: true;
      type: "credits";
      creditsAwarded: number;
      newBalance: number;
    }
  | {
      success: true;
      type: "plan";
      plan: PlanName;
      planDays: number;
      creditsAwarded: number;
      newBalance: number;
    }
  | { success: false; reason: string };

export const pgRedemptionRepository = {
  redeemCode: async (userId: string, code: string): Promise<RedeemResult> => {
    return db.transaction(async (tx) => {
      // 1. Lock the code row
      const [codeRow] = await tx
        .select()
        .from(RedemptionCodeTable)
        .where(eq(RedemptionCodeTable.code, code.trim().toUpperCase()))
        .for("update");

      if (!codeRow) {
        return { success: false, reason: "invalidCode" };
      }

      if (!codeRow.isActive) {
        return { success: false, reason: "invalidCode" };
      }

      if (codeRow.expiresAt && codeRow.expiresAt <= new Date()) {
        return { success: false, reason: "codeExpired" };
      }

      if (codeRow.isUsed) {
        return { success: false, reason: "codeAlreadyUsed" };
      }

      // 2. Lock user row
      const [user] = await tx
        .select({
          creditBalance: UserTable.creditBalance,
          plan: UserTable.plan,
        })
        .from(UserTable)
        .where(eq(UserTable.id, userId))
        .for("update");

      if (!user) {
        return { success: false, reason: "userNotFound" };
      }

      // 3. Plan downgrade check
      if (codeRow.type === "plan" && codeRow.plan) {
        const currentRank = PLAN_RANK[user.plan] ?? 0;
        const targetRank = PLAN_RANK[codeRow.plan] ?? 0;
        if (targetRank <= currentRank && user.plan !== "free") {
          return { success: false, reason: "planNotUpgrade" };
        }
      }

      let creditsToAdd = 0;
      const updateFields: Record<string, any> = { updatedAt: new Date() };

      if (codeRow.type === "credits") {
        creditsToAdd = Math.min(codeRow.credits ?? 0, MAX_CREDITS);
      } else if (codeRow.type === "plan") {
        const plan = codeRow.plan as PlanName;
        const days = Math.min(codeRow.planDays ?? 30, MAX_PLAN_DAYS);
        creditsToAdd = Math.min(codeRow.planCredits ?? 0, MAX_CREDITS);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        updateFields.plan = plan;
        updateFields.planExpiresAt = expiresAt;
      }

      const newBalance = Math.min(
        user.creditBalance + creditsToAdd,
        MAX_CREDITS,
      );
      updateFields.creditBalance = newBalance;

      // 4. Update user
      await tx
        .update(UserTable)
        .set(updateFields)
        .where(eq(UserTable.id, userId));

      // 5. Log credit transaction
      const description =
        codeRow.type === "credits"
          ? `Redeemed code: ${code} (+${creditsToAdd} credits)`
          : `Redeemed code: ${code} (${codeRow.plan} plan for ${codeRow.planDays} days${creditsToAdd > 0 ? `, +${creditsToAdd} credits` : ""})`;

      await tx.insert(CreditTransactionTable).values({
        userId,
        amount: creditsToAdd,
        balanceAfter: newBalance,
        type: "redemption",
        description,
      });

      // 6. Mark code as used
      await tx
        .update(RedemptionCodeTable)
        .set({ isUsed: true, usedBy: userId, usedAt: new Date() })
        .where(eq(RedemptionCodeTable.id, codeRow.id));

      if (codeRow.type === "credits") {
        return {
          success: true,
          type: "credits",
          creditsAwarded: creditsToAdd,
          newBalance,
        };
      }

      return {
        success: true,
        type: "plan",
        plan: codeRow.plan as PlanName,
        planDays: codeRow.planDays ?? 30,
        creditsAwarded: creditsToAdd,
        newBalance,
      };
    });
  },

  createCode: async (params: {
    type: "credits" | "plan";
    credits?: number;
    plan?: string;
    planDays?: number;
    planCredits?: number;
    expiresAt?: Date;
    description?: string;
    createdBy?: string;
  }) => {
    const credits =
      params.credits != null
        ? Math.max(0, Math.min(params.credits, MAX_CREDITS))
        : undefined;
    const planCredits =
      params.planCredits != null
        ? Math.max(0, Math.min(params.planCredits, MAX_CREDITS))
        : undefined;
    const planDays =
      params.planDays != null
        ? Math.max(1, Math.min(params.planDays, MAX_PLAN_DAYS))
        : undefined;

    if (
      params.type === "plan" &&
      (!params.plan ||
        !Object.values(PLANS).includes(params.plan as PlanName) ||
        params.plan === "free")
    ) {
      throw new Error("Invalid plan for redemption code");
    }

    const code = generateRedemptionCode();

    const [row] = await db
      .insert(RedemptionCodeTable)
      .values({
        code,
        type: params.type,
        credits,
        plan: params.plan,
        planDays,
        planCredits,
        expiresAt: params.expiresAt,
        description: params.description,
        createdBy: params.createdBy,
      })
      .returning();
    return row;
  },

  listCodes: async (limit = 50, offset = 0) => {
    return db
      .select()
      .from(RedemptionCodeTable)
      .orderBy(desc(RedemptionCodeTable.createdAt))
      .limit(limit)
      .offset(offset);
  },

  deactivateCode: async (codeId: string) => {
    await db
      .update(RedemptionCodeTable)
      .set({ isActive: false })
      .where(eq(RedemptionCodeTable.id, codeId));
  },

  activateCode: async (codeId: string) => {
    await db
      .update(RedemptionCodeTable)
      .set({ isActive: true })
      .where(eq(RedemptionCodeTable.id, codeId));
  },
};
