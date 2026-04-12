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
  /**
   * Get user's current credit balance and plan
   */
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
      balance: row ? Number(row.balance) : 0,
      plan: row?.plan ?? "free",
    };
  },

  /**
   * Adjust credits atomically and log the transaction.
   * Returns the new balance, or null if insufficient funds (when amount < 0).
   */
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

    // Use a raw SQL transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Lock the row and get current balance
      const [user] = await tx
        .select({ creditBalance: UserTable.creditBalance })
        .from(UserTable)
        .where(eq(UserTable.id, userId))
        .for("update");

      if (!user) return null;

      const currentBalance = Number(user.creditBalance);
      const newBalance = currentBalance + amount;

      // Prevent negative balance for deductions
      if (amount < 0 && newBalance < 0) return null;

      // Update balance
      await tx
        .update(UserTable)
        .set({
          creditBalance: String(newBalance),
          updatedAt: new Date(),
        })
        .where(eq(UserTable.id, userId));

      // Log the transaction
      await tx.insert(CreditTransactionTable).values({
        userId,
        amount: String(amount),
        balanceAfter: String(newBalance),
        type,
        description,
        model,
        inputTokens,
        outputTokens,
      });

      return { newBalance };
    });

    return result;
  },

  /**
   * Set user's plan
   */
  setPlan: async (userId: string, plan: PlanName): Promise<void> => {
    await db
      .update(UserTable)
      .set({ plan, updatedAt: new Date() })
      .where(eq(UserTable.id, userId));
  },

  /**
   * Log a transaction record only (balance already set externally, e.g. signup hook)
   */
  logTransaction: async (params: {
    userId: string;
    amount: number;
    balanceAfter: number;
    type: CreditTransactionType;
    description?: string;
  }): Promise<void> => {
    await db.insert(CreditTransactionTable).values({
      userId: params.userId,
      amount: String(params.amount),
      balanceAfter: String(params.balanceAfter),
      type: params.type,
      description: params.description,
    });
  },

  /**
   * Get recent credit transactions for a user
   */
  getTransactions: async (userId: string, limit = 50) => {
    const rows = await db
      .select()
      .from(CreditTransactionTable)
      .where(eq(CreditTransactionTable.userId, userId))
      .orderBy(desc(CreditTransactionTable.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
      balanceAfter: Number(r.balanceAfter),
    }));
  },
};
