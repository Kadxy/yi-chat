"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Coins, Loader2, Receipt } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useTranslations } from "next-intl";
import { cn } from "lib/utils";
import { getCreditTransactions } from "@/lib/credit/server";

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
  planExpiresAt?: string | null;
}

const TYPE_CONFIG: Record<string, { key: string; color: string; bg: string }> =
  {
    signup: {
      key: "typeSignup",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    sign_in: {
      key: "typeSignIn",
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    subscription: {
      key: "typeSubscription",
      color: "text-violet-700 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-900/20",
    },
    topup: {
      key: "typeTopup",
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    usage: {
      key: "typeUsage",
      color: "text-foreground/70",
      bg: "bg-muted",
    },
    admin_grant: {
      key: "typeAdminGrant",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    admin_deduct: {
      key: "typeAdminDeduct",
      color: "text-orange-700 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    redemption: {
      key: "typeRedemption",
      color: "text-pink-700 dark:text-pink-400",
      bg: "bg-pink-50 dark:bg-pink-900/20",
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
  transactions: initialTransactions,
  balance,
  plan,
  planExpiresAt,
}: UsagePageContentProps) {
  const t = useTranslations("Usage");
  const [transactions, setTransactions] =
    useState<CreditTransaction[]>(initialTransactions);
  const [hasMore, setHasMore] = useState(initialTransactions.length >= 50);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      const more = await getCreditTransactions(undefined, transactions.length);
      if (more.length < 50) setHasMore(false);
      setTransactions((prev) => [...prev, ...more]);
    });
  };

  return (
    <div className="min-h-full p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Summary */}
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
                {balance.toLocaleString()}{" "}
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
              {planExpiresAt && plan !== "free" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("planExpiresAt", {
                    date: new Date(planExpiresAt).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" },
                    ),
                  })}
                </p>
              )}
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
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2.5 px-2 font-medium">
                        {t("time")}
                      </th>
                      <th className="text-left py-2.5 px-2 font-medium">
                        {t("type")}
                      </th>
                      <th className="text-left py-2.5 px-2 font-medium hidden sm:table-cell">
                        {t("details")}
                      </th>
                      <th className="text-right py-2.5 px-2 font-medium">
                        {t("amount")}
                      </th>
                      <th className="text-right py-2.5 px-2 font-medium hidden md:table-cell">
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
                      const hasTokens =
                        tx.inputTokens != null && tx.outputTokens != null;

                      return (
                        <tr
                          key={tx.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2 px-2 whitespace-nowrap text-muted-foreground text-xs">
                            {formatDate(tx.createdAt)}
                          </td>
                          <td className="py-2 px-2">
                            <span
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium",
                                config.bg,
                                config.color,
                              )}
                            >
                              {t(config.key as Parameters<typeof t>[0])}
                            </span>
                          </td>
                          <td className="py-2 px-2 hidden sm:table-cell">
                            {tx.model ? (
                              hasTokens ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs cursor-default border-b border-dashed border-muted-foreground/30">
                                      {tx.model}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="text-xs"
                                  >
                                    In: {tx.inputTokens!.toLocaleString()} /
                                    Out: {tx.outputTokens!.toLocaleString()}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-xs">{tx.model}</span>
                              )
                            ) : tx.description ? (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                                {tx.description}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 px-2 text-right whitespace-nowrap">
                            <span
                              className={cn(
                                "text-xs font-semibold tabular-nums",
                                isPositive
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-foreground",
                              )}
                            >
                              {isPositive ? "+" : ""}
                              {tx.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-xs tabular-nums text-muted-foreground hidden md:table-cell">
                            {tx.balanceAfter.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={isPending}
                    className="text-xs text-muted-foreground"
                  >
                    {isPending ? (
                      <Loader2 className="size-3 animate-spin mr-1.5" />
                    ) : null}
                    {t("loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
