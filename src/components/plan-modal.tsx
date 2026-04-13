"use client";

import { useState } from "react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { PLAN_CONFIGS, type PlanName } from "app-types/plans";
import { MODEL_TIERS } from "app-types/models";
import { BasicUser } from "app-types/user";
import useSWR from "swr";
import { cn, fetcher } from "lib/utils";
import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

const PLAN_ORDER: PlanName[] = ["free", "plus", "pro", "max"];
const PLAN_RANK = { free: 0, plus: 1, pro: 2, max: 3 } as const;

type FeatureValue = string | boolean;
type FeatureRow = {
  label: string;
  values: Record<PlanName, FeatureValue>;
  tooltips?: Record<PlanName, string | null>;
};

const MODEL_DISPLAY: Record<string, string> = {
  "haiku-4.5": "Haiku 4.5",
  "sonnet-4.6": "Sonnet 4.6",
  "opus-4.6": "Opus 4.6",
};

function tierTooltip(tier: keyof typeof MODEL_TIERS): string {
  return MODEL_TIERS[tier].map((id) => MODEL_DISPLAY[id] ?? id).join(", ");
}

export function PlanModal() {
  const [open, mutate] = appStore(
    useShallow((state) => [state.openPlanModal, state.mutate]),
  );
  const { data: user } = useSWR<BasicUser>("/api/user/details", fetcher);
  const t = useTranslations("PlanModal");
  const currentPlan = (user?.plan as PlanName) || "free";
  const [selected, setSelected] = useState<PlanName | null>(null);
  const [billing, setBilling] = useState<"annual" | "monthly">("annual");

  const selectedPlan = selected ?? currentPlan;
  const canProceed =
    selectedPlan !== currentPlan &&
    PLAN_RANK[selectedPlan] > PLAN_RANK[currentPlan];

  const getPrice = (plan: PlanName) => {
    const config = PLAN_CONFIGS[plan];
    return billing === "annual" ? config.priceAnnually : config.priceMonthly;
  };

  const features: FeatureRow[] = [
    {
      label: t("compare.models"),
      values: {
        free: t("compare.basicModels"),
        plus: t("compare.advancedModels"),
        pro: t("compare.allModels"),
        max: t("compare.allModels"),
      },
      tooltips: {
        free: tierTooltip("basic"),
        plus: tierTooltip("advanced"),
        pro: tierTooltip("all"),
        max: tierTooltip("all"),
      },
    },
    {
      label: t("compare.contextLength"),
      values: { free: "64K", plus: "128K", pro: "1M", max: "1M" },
    },
    {
      label: t("compare.thinking"),
      values: { free: true, plus: true, pro: true, max: true },
    },
    {
      label: t("compare.fileAnalysis"),
      values: { free: true, plus: true, pro: true, max: true },
    },
    {
      label: t("compare.signInRewards"),
      values: { free: true, plus: true, pro: true, max: true },
    },
    {
      label: t("compare.uploadSize"),
      values: { free: "1 MB", plus: "10 MB", pro: "10 MB", max: "10 MB" },
    },
    {
      label: t("compare.fileUploads"),
      values: { free: "3", plus: "3", pro: "5", max: "10" },
    },
    {
      label: t("compare.mcpTools"),
      values: {
        free: "1",
        plus: "3",
        pro: "5",
        max: t("compare.unlimited"),
      },
    },
    {
      label: t("compare.priorityAndEarly"),
      values: { free: false, plus: false, pro: false, max: true },
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        mutate({ openPlanModal: v });
        if (!v) setSelected(null);
      }}
    >
      <DialogContent
        hideClose
        className="sm:max-w-[700px] gap-0 p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("title")}
            </DialogDescription>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center rounded-lg bg-muted p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-all font-medium",
                billing === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("annual")}
            </button>
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-all font-medium",
                billing === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("monthly")}
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-4 pb-3 flex flex-col gap-2">
          {PLAN_ORDER.map((plan) => {
            const config = PLAN_CONFIGS[plan];
            const price = getPrice(plan);
            const isCurrent = plan === currentPlan;
            const isSelected = plan === selectedPlan;
            const isDowngrade =
              PLAN_RANK[plan] < PLAN_RANK[currentPlan] && !isCurrent;

            return (
              <button
                key={plan}
                type="button"
                disabled={isDowngrade}
                onClick={() => setSelected(plan)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3.5 text-left transition-all",
                  "flex items-center gap-3",
                  isSelected
                    ? "border-primary/60 bg-primary/5 shadow-sm"
                    : "border-border hover:border-foreground/15 hover:bg-accent/40",
                  isDowngrade && "opacity-30 cursor-not-allowed",
                  !isDowngrade && "cursor-pointer",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{config.label}</span>
                    {isCurrent && (
                      <span className="text-[10px] text-muted-foreground border border-border rounded px-1 py-px leading-none">
                        {t("current")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {config.monthlyCredits > 0
                      ? t("creditsIncluded", {
                          count: config.monthlyCredits.toLocaleString(),
                        })
                      : t("signupCredits")}
                    {" · "}
                    {t(`modelAccess.${plan}`)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-semibold tabular-nums">
                    {price === 0 ? t("free") : `¥${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {t("perMonth")}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feature comparison */}
        <div className="border-t mx-4 mb-2" />
        <div className="px-4 pb-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 px-1">
            {t("compareTitle")}
          </p>
          <div className="rounded-lg border overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_repeat(4,72px)] bg-muted/50 border-b text-[11px] font-medium text-muted-foreground">
              <div className="px-3 py-2" />
              {PLAN_ORDER.map((plan) => (
                <div
                  key={plan}
                  className={cn(
                    "px-1 py-2 text-center",
                    plan === selectedPlan && "text-foreground",
                  )}
                >
                  {PLAN_CONFIGS[plan].label}
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {features.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-[1fr_repeat(4,72px)] text-xs",
                  i < features.length - 1 && "border-b border-border/50",
                )}
              >
                <div className="px-3 py-2 text-muted-foreground">
                  {row.label}
                </div>
                {PLAN_ORDER.map((plan) => {
                  const val = row.values[plan];
                  const tip = row.tooltips?.[plan];

                  const content =
                    val === true ? (
                      <Check className="size-3.5 text-foreground/50" />
                    ) : val === false ? (
                      <Minus className="size-3.5 text-muted-foreground/25" />
                    ) : (
                      <span className="text-center text-muted-foreground leading-tight">
                        {val}
                      </span>
                    );

                  return (
                    <div
                      key={plan}
                      className={cn(
                        "px-1 py-2 flex items-center justify-center",
                        plan === selectedPlan && "bg-primary/[0.03]",
                      )}
                    >
                      {tip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="border-b border-dashed border-muted-foreground/40 cursor-help text-center text-muted-foreground leading-tight">
                              {val as string}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {tip}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        content
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => {
              mutate({ openPlanModal: false });
              mutate({ openRedeemDialog: true });
            }}
          >
            {t("haveRedeemCode")}
          </button>
          <div className="flex-1" />
          <Button disabled={!canProceed} size="sm">
            {t("next")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
