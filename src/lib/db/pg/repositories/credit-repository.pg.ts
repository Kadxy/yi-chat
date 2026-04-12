import { pgDb as db } from "../db.pg";
import { CreditTransactionTable, UserTable } from "../schema.pg";
import { eq, desc } from "drizzle-orm";
import type { PlanName } from "app-types/plans";

export type CreditTransactionType =
  | "signup"
  | "sign_in"
  | "subscription"
  | "topup"
  | "usage"
  | "admin_grant"
  | "admin_deduct";

export const pgCreditRepository = {
  getBalance: async (
    userId: string,
  ): Promise<{ balance: number; plan: string }> => {
    const [row] = await db
      .select({
        balance: UserTable.creditBalance,
        plan: UserTable.plan,
      })
      .from(UserTable)
      .where(eq(UserTable.id, userId));
    return {
      balance: row?.balance ?? 0,
      plan: row?.plan ?? "free",
    };
  },

  adjustCredits: async (params: {
    userId: string;
    amount: number;
    type: CreditTransactionType;
    description?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
  }): Promise<{ newBalance: number } | null> => {
    const {
      userId,
      amount,
      type,
      description,
      model,
      inputTokens,
      outputTokens,
    } = params;

    return db.transaction(async (tx) => {
      const [user] = await tx
        .select({ creditBalance: UserTable.creditBalance })
        .from(UserTable)
        .where(eq(UserTable.id, userId))
        .for("update");

      if (!user) return null;

      const newBalance = user.creditBalance + amount;
      if (amount < 0 && newBalance < 0) return null;

      await tx
        .update(UserTable)
        .set({ creditBalance: newBalance, updatedAt: new Date() })
        .where(eq(UserTable.id, userId));

      await tx.insert(CreditTransactionTable).values({
        userId,
        amount,
        balanceAfter: newBalance,
        type,
        description,
        model,
        inputTokens,
        outputTokens,
      });

      return { newBalance };
    });
  },

  setPlan: async (userId: string, plan: PlanName): Promise<void> => {
    await db
      .update(UserTable)
      .set({ plan, updatedAt: new Date() })
      .where(eq(UserTable.id, userId));
  },

  logTransaction: async (params: {
    userId: string;
    amount: number;
    balanceAfter: number;
    type: CreditTransactionType;
    description?: string;
  }): Promise<void> => {
    await db.insert(CreditTransactionTable).values({
      userId: params.userId,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      type: params.type,
      description: params.description,
    });
  },

  getTransactions: async (userId: string, limit = 50) => {
    return db
      .select()
      .from(CreditTransactionTable)
      .where(eq(CreditTransactionTable.userId, userId))
      .orderBy(desc(CreditTransactionTable.createdAt))
      .limit(limit);
  },
};
