"use client";

import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Coins, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "lib/utils";

interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: Date;
}

interface UsagePageContentProps {
  transactions: CreditTransaction[];
  balance: number;
  plan: string;
}

const TYPE_CONFIG: Record<string, { key: string; color: string; bg: string }> =
  {
    signup: {
      key: "typeSignup",
      color: "text-green-700 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    sign_in: {
      key: "typeSignIn",
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    subscription: {
      key: "typeSubscription",
      color: "text-purple-700 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
    topup: {
      key: "typeTopup",
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    usage: {
      key: "typeUsage",
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
    },
    admin_grant: {
      key: "typeAdminGrant",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    admin_deduct: {
      key: "typeAdminDeduct",
      color: "text-orange-700 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/30",
    },
  };

function formatDate(date: Date) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UsagePageContent({
  transactions,
  balance,
  plan,
}: UsagePageContentProps) {
  const t = useTranslations("Usage");

  return (
    <div className="min-h-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full p-2.5 bg-primary/10 shrink-0">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("currentBalance")}
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {balance.toFixed(0)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("credits")}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full p-2.5 bg-primary/10 shrink-0">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("currentPlan")}
              </p>
              <p className="text-2xl font-bold capitalize">{plan}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t("noRecords")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("noRecordsDescription")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">
                      {t("time")}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {t("type")}
                    </th>
                    <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">
                      {t("details")}
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      {t("amount")}
                    </th>
                    <th className="text-right py-3 px-2 font-medium hidden md:table-cell">
                      {t("balance")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const config = TYPE_CONFIG[tx.type] ?? {
                      key: tx.type,
                      color: "text-foreground",
                      bg: "bg-muted",
                    };
                    const isPositive = tx.amount >= 0;

                    return (
                      <tr
                        key={tx.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-2 whitespace-nowrap text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              config.bg,
                              config.color,
                            )}
                          >
                            {t(config.key as Parameters<typeof t>[0])}
                          </span>
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell">
                          <div className="flex flex-col gap-0.5">
                            {tx.model && (
                              <span className="text-xs font-medium">
                                {tx.model}
                              </span>
                            )}
                            {tx.inputTokens != null &&
                              tx.outputTokens != null && (
                                <span className="text-xs text-muted-foreground">
                                  {t("inputTokens")}:{" "}
                                  {tx.inputTokens.toLocaleString()} /{" "}
                                  {t("outputTokens")}:{" "}
                                  {tx.outputTokens.toLocaleString()}
                                </span>
                              )}
                            {tx.description && !tx.model && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {tx.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              isPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-foreground",
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {tx.amount.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                          {tx.balanceAfter.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
