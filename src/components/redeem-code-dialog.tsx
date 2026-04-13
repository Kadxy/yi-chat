"use client";

import { useState } from "react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Loader2, Gift, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { redeemCodeAction } from "@/app/api/redemption/actions";
import { useActionState } from "react";
import type { ActionState } from "lib/action-utils";
import { mutate } from "swr";

export function RedeemCodeDialog() {
  const [open, storeMutate] = appStore(
    useShallow((state) => [state.openRedeemDialog, state.mutate]),
  );
  const t = useTranslations("Redemption");
  const [code, setCode] = useState("");
  const [redeemResult, setRedeemResult] = useState<{
    type: "credits" | "plan";
    credits: number;
    plan?: string;
    planDays?: number;
  } | null>(null);

  const [, formAction, isPending] = useActionState<ActionState, FormData>(
    async (_prevState, formData) => {
      const result = await redeemCodeAction(null, formData);

      if (result?.success) {
        setRedeemResult({
          type: result.plan ? "plan" : "credits",
          credits: result.creditsAwarded ?? 0,
          plan: result.plan,
          planDays: result.planDays,
        });
        toast.success(t("success"));
        mutate("/api/user/details");
      } else {
        const reason = result?.message ?? "redeemFailed";
        toast.error(t(reason as Parameters<typeof t>[0]));
      }
      return result;
    },
    null,
  );

  const handleClose = (v: boolean) => {
    storeMutate({ openRedeemDialog: v });
    if (!v) {
      setCode("");
      setRedeemResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {redeemResult ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              {redeemResult.credits > 0 && (
                <p className="text-sm font-medium">
                  {t("creditsAwarded", {
                    amount: redeemResult.credits.toLocaleString(),
                  })}
                </p>
              )}
              {redeemResult.type === "plan" && redeemResult.plan && (
                <p className="text-sm font-medium">
                  {t("planUpgraded", {
                    plan: redeemResult.plan,
                    days: redeemResult.planDays ?? 30,
                  })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <form action={formAction}>
            <div className="space-y-4 py-2">
              <Input
                name="code"
                placeholder={t("placeholder")}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isPending}
                className="font-mono tracking-wider"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending || !code.trim()}>
                {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {redeemResult && (
          <DialogFooter>
            <Button onClick={() => handleClose(false)}>{t("done")}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
