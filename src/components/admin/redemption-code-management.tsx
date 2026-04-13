"use client";

import { useState, useActionState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { Badge } from "ui/badge";
import { Loader2, Plus, TicketCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "lib/utils";
import type { RedemptionCodeEntity } from "lib/db/pg/schema.pg";
import type { ActionState } from "lib/action-utils";
import {
  createRedemptionCodeAction,
  toggleRedemptionCodeAction,
} from "@/app/api/admin/actions";

interface RedemptionCodeManagementProps {
  initialCodes: RedemptionCodeEntity[];
}

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RedemptionCodeManagement({
  initialCodes,
}: RedemptionCodeManagementProps) {
  const [codes, setCodes] = useState<RedemptionCodeEntity[]>(initialCodes);
  const [showCreate, setShowCreate] = useState(false);
  const [codeType, setCodeType] = useState<"credits" | "plan">("credits");

  const refreshCodes = useCallback(async () => {
    const res = await fetch("/api/admin/redemption");
    if (res.ok) {
      setCodes(await res.json());
    }
  }, []);

  const [, createAction, isCreating] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      const result = await createRedemptionCodeAction(null, formData);
      if (result?.success) {
        toast.success(result.message);
        setShowCreate(false);
        await refreshCodes();
      } else {
        toast.error(result?.message ?? "Failed to create code");
      }
      return result;
    },
    null,
  );

  const [, toggleAction, isToggling] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      const result = await toggleRedemptionCodeAction(null, formData);
      if (result?.success) {
        toast.success(result.message);
        await refreshCodes();
      } else {
        toast.error(result?.message ?? "Failed to toggle code");
      }
      return result;
    },
    null,
  );

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  return (
    <div className="min-h-full p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TicketCheck className="size-6" />
            Redemption Codes
          </h1>
          <p className="text-muted-foreground text-sm">
            Create and manage single-use redemption codes
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="size-4 mr-1" />
          Create Code
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create Redemption Code</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  name="type"
                  value={codeType}
                  onValueChange={(v) => setCodeType(v as "credits" | "plan")}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credits">Credits</SelectItem>
                    <SelectItem value="plan">Plan</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Code will be auto-generated (format: XXXX-XXXX-XXXX-XXXX)
                </p>
              </div>

              {codeType === "credits" && (
                <div className="space-y-2">
                  <Label>Credits Amount (1 - 1,000,000)</Label>
                  <Input
                    name="credits"
                    type="number"
                    placeholder="e.g. 5000"
                    min="1"
                    max="1000000"
                    required
                  />
                </div>
              )}

              {codeType === "plan" && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select name="plan" defaultValue="pro">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plus">Plus</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="max">Max</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Days (1 - 3650)</Label>
                    <Input
                      name="planDays"
                      type="number"
                      placeholder="30"
                      defaultValue="30"
                      min="1"
                      max="3650"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus Credits</Label>
                    <Input
                      name="planCredits"
                      type="number"
                      placeholder="0"
                      defaultValue="0"
                      min="0"
                      max="1000000"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expires At (optional)</Label>
                  <Input name="expiresAt" type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input name="description" placeholder="Internal note" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  )}
                  Create
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            All Codes ({codes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No redemption codes yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Code</th>
                    <th className="text-left py-2 px-2 font-medium">Type</th>
                    <th className="text-left py-2 px-2 font-medium">Value</th>
                    <th className="text-left py-2 px-2 font-medium">Status</th>
                    <th className="text-left py-2 px-2 font-medium hidden md:table-cell">
                      Expires
                    </th>
                    <th className="text-left py-2 px-2 font-medium hidden lg:table-cell">
                      Created
                    </th>
                    <th className="text-right py-2 px-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => {
                    const isExpired =
                      c.expiresAt && new Date(c.expiresAt) <= new Date();

                    return (
                      <tr
                        key={c.id}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="py-2 px-2">
                          <button
                            type="button"
                            className="group flex items-center gap-1.5 cursor-pointer"
                            onClick={() => copyCode(c.code)}
                            title="Click to copy"
                          >
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                              {c.code}
                            </code>
                            <Copy className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-[11px]">
                            {c.type}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-xs">
                          {c.type === "credits"
                            ? `${c.credits?.toLocaleString()} credits`
                            : `${c.plan} / ${c.planDays}d${c.planCredits ? ` +${c.planCredits}cr` : ""}`}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium",
                              !c.isActive
                                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                : c.isUsed
                                  ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                  : isExpired
                                    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                            )}
                          >
                            {!c.isActive
                              ? "Disabled"
                              : c.isUsed
                                ? "Used"
                                : isExpired
                                  ? "Expired"
                                  : "Active"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground hidden md:table-cell">
                          {formatDate(c.expiresAt)}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground hidden lg:table-cell">
                          {formatDate(c.createdAt)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <form action={toggleAction} className="inline">
                            <input type="hidden" name="codeId" value={c.id} />
                            <input
                              type="hidden"
                              name="isActive"
                              value={c.isActive ? "false" : "true"}
                            />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              disabled={isToggling}
                            >
                              {c.isActive ? "Disable" : "Enable"}
                            </Button>
                          </form>
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
