"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { CreditCard, ArrowUpDown } from "lucide-react";
import { BasicUserWithLastLogin } from "app-types/user";
import { PLAN_CONFIGS, type PlanName } from "app-types/plans";
import { toast } from "sonner";
import {
  adjustCreditsAction,
  updateUserPlanAction,
} from "@/app/api/admin/actions";

interface UserCreditPlanCardProps {
  user: BasicUserWithLastLogin;
  onUserDetailsUpdate: (user: Partial<BasicUserWithLastLogin>) => void;
}

export function UserCreditPlanCard({
  user,
  onUserDetailsUpdate,
}: UserCreditPlanCardProps) {
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  const currentPlan = (user.plan as PlanName) || "free";
  const currentBalance = user.creditBalance ?? 0;

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(creditAmount);
    if (!amount || isNaN(amount)) return;

    setIsAdjusting(true);
    const formData = new FormData();
    formData.set("userId", user.id);
    formData.set("amount", String(amount));
    if (creditReason) formData.set("description", creditReason);

    const result = await adjustCreditsAction({}, formData);
    setIsAdjusting(false);

    if (result?.success) {
      toast.success(result.message);
      onUserDetailsUpdate({
        creditBalance: result.newBalance ?? currentBalance + amount,
      });
      setCreditAmount("");
      setCreditReason("");
    } else {
      toast.error(result?.message || "Failed to adjust credits");
    }
  };

  const handlePlanChange = async (newPlan: PlanName) => {
    if (newPlan === currentPlan) return;
    setIsChangingPlan(true);

    const formData = new FormData();
    formData.set("userId", user.id);
    formData.set("plan", newPlan);

    const result = await updateUserPlanAction({}, formData);
    setIsChangingPlan(false);

    if (result?.success) {
      toast.success(result.message);
      onUserDetailsUpdate({ plan: newPlan });
    } else {
      toast.error(result?.message || "Failed to update plan");
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Plan & Credits
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <p className="text-lg font-semibold capitalize">{currentPlan}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Credits</p>
            <p className="text-lg font-semibold tabular-nums">
              {currentBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Change Plan */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Change Plan</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PLAN_CONFIGS) as PlanName[]).map((plan) => (
              <Button
                key={plan}
                variant={plan === currentPlan ? "default" : "outline"}
                size="sm"
                disabled={isChangingPlan || plan === currentPlan}
                onClick={() => handlePlanChange(plan)}
                className="capitalize"
              >
                {PLAN_CONFIGS[plan].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Adjust Credits */}
        <form onSubmit={handleAdjustCredits} className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ArrowUpDown className="size-3.5" />
            Adjust Credits
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="any"
              placeholder="Amount (+ or -)"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isAdjusting || !creditAmount}
            >
              {isAdjusting ? "..." : "Apply"}
            </Button>
          </div>
          <Input
            placeholder="Reason (optional)"
            value={creditReason}
            onChange={(e) => setCreditReason(e.target.value)}
          />
        </form>
      </CardContent>
    </Card>
  );
}
