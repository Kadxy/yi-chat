"use client";
import {
  Loader,
  RotateCw,
  ShieldAlertIcon,
  Trash2,
  Wrench,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Button } from "ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { memo, useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { safe } from "ts-safe";

import { handleErrorWithToast } from "ui/shared-toast";
import {
  refreshMcpClientAction,
  removeMcpClientAction,
} from "@/app/api/mcp/actions";

import type { MCPServerInfo, MCPToolInfo } from "app-types/mcp";

import { useTranslations } from "next-intl";
import { isString } from "lib/utils";
import { redriectMcpOauth } from "lib/ai/mcp/oauth-redirect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { RECOMMENDED_MCPS } from "./mcp-overview";

export const MCPCard = memo(function MCPCard({
  id,
  error,
  status,
  name,
  toolInfo,
}: MCPServerInfo) {
  const [isProcessing, setIsProcessing] = useState(false);
  const t = useTranslations("MCP");
  const { mutate } = useSWRConfig();

  const isLoading = isProcessing || status === "loading";
  const needsAuthorization = status === "authorizing";

  const errorMessage = useMemo(() => {
    if (error) return isString(error) ? error : JSON.stringify(error);
    return null;
  }, [error]);

  const presetMcp = useMemo(
    () => RECOMMENDED_MCPS.find((m) => m.name === name),
    [name],
  );
  const PresetIcon = presetMcp?.icon;

  const pipeProcessing = useCallback(
    async (fn: () => Promise<any>) =>
      safe(() => setIsProcessing(true))
        .ifOk(fn)
        .ifOk(() => mutate("/api/mcp/list"))
        .ifFail(handleErrorWithToast)
        .watch(() => setIsProcessing(false)),
    [],
  );

  const handleRefresh = useCallback(
    () => pipeProcessing(() => refreshMcpClientAction(id)),
    [id],
  );

  const handleDelete = useCallback(
    () => pipeProcessing(() => removeMcpClientAction(id)),
    [id],
  );

  const handleAuthorize = useCallback(
    () => pipeProcessing(() => redriectMcpOauth(id)),
    [id],
  );

  return (
    <div className="group relative flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/20">
      {/* Main row */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Icon */}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
          {PresetIcon ? (
            <PresetIcon className="size-4" />
          ) : (
            <Wrench className="size-4 text-muted-foreground" />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {presetMcp?.label ?? name}
            </span>
            <StatusDot status={status} />
          </div>
        </div>

        {/* Tools count badge → opens dialog */}
        {toolInfo.length > 0 && (
          <ToolsDialog tools={toolInfo} count={toolInfo.length} />
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Loader className="size-3.5 animate-spin text-muted-foreground" />
        )}

        {/* Authorization button */}
        {needsAuthorization && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAuthorize}
            disabled={isProcessing}
            className="h-7 text-xs gap-1"
          >
            <ShieldAlertIcon className="size-3" />
            {t("authorize")}
          </Button>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RotateCw className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("refresh")}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("delete")}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Error row */}
      {errorMessage && (
        <Alert variant="destructive" className="border-destructive py-2">
          <AlertTitle className="text-xs">Error</AlertTitle>
          <AlertDescription className="text-xs whitespace-pre-wrap break-words">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Authorization prompt */}
      {needsAuthorization && !errorMessage && (
        <div
          className="flex items-center gap-2 rounded-md bg-accent/50 px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-accent transition-colors"
          onClick={handleAuthorize}
        >
          <ShieldAlertIcon className="size-3.5 shrink-0" />
          <span>Click to authorize this MCP server and access its tools.</span>
        </div>
      )}
    </div>
  );
});

function StatusDot({ status }: { status: MCPServerInfo["status"] }) {
  if (status === "connected") {
    return (
      <Tooltip>
        <TooltipTrigger>
          <CheckCircle2 className="size-3 text-emerald-500" />
        </TooltipTrigger>
        <TooltipContent>Connected</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "loading") {
    return <Loader className="size-3 animate-spin text-muted-foreground" />;
  }
  if (status === "authorizing") {
    return (
      <Tooltip>
        <TooltipTrigger>
          <ShieldAlertIcon className="size-3 text-amber-500" />
        </TooltipTrigger>
        <TooltipContent>Authorization required</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger>
        <WifiOff className="size-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>Disconnected</TooltipContent>
    </Tooltip>
  );
}

function ToolsDialog({
  tools,
  count,
}: { tools: MCPToolInfo[]; count: number }) {
  const t = useTranslations("MCP");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
          <Wrench className="size-3" />
          {count} tools
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("availableTools")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
          {tools.map((tool) => (
            <div key={tool.name} className="rounded-md bg-secondary p-2.5">
              <p className="font-medium text-sm truncate">{tool.name}</p>
              {tool.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {tool.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
