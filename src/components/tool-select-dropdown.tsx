"use client";

import { appStore } from "@/app/store";
import { cn } from "lib/utils";
import { ChevronRight, Loader, ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { MCPIcon } from "ui/mcp-icon";

import { useTranslations } from "next-intl";

import { Switch } from "ui/switch";
import { useShallow } from "zustand/shallow";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import { CountAnimation } from "ui/count-animation";

import { Separator } from "ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { safe } from "ts-safe";
import { mutate } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { redriectMcpOauth } from "lib/ai/mcp/oauth-redirect";

interface ToolSelectDropdownProps {
  align?: "start" | "end" | "center";
  side?: "left" | "right" | "top" | "bottom";
  disabled?: boolean;
  className?: string;
}

export function ToolSelectDropdown({
  align,
  side,
  className,
}: ToolSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [toolChoice, allowedMcpServers, mcpList] = appStore(
    useShallow((state) => [
      state.toolChoice,
      state.allowedMcpServers,
      state.mcpList,
    ]),
  );

  const t = useTranslations("Chat.Tool");
  const { isLoading } = useMcpList();

  const enabledCount = useMemo(() => {
    if (toolChoice == "none") return 0;
    if (!Array.isArray(allowedMcpServers)) return 0;
    return allowedMcpServers.filter((id) => mcpList.some((s) => s.id === id))
      .length;
  }, [allowedMcpServers, toolChoice, mcpList]);

  const triggerButton = useMemo(() => {
    return (
      <Button
        variant="ghost"
        size={"sm"}
        className={cn(
          "gap-0.5 bg-input/60 border rounded-full data-[state=open]:bg-input! hover:bg-input!",
          !enabledCount &&
            !isLoading &&
            "text-muted-foreground bg-transparent border-transparent",
          isLoading && "bg-input/60",
          open && "bg-input!",
          className,
        )}
      >
        <span className={!enabledCount ? "text-muted-foreground" : ""}>
          {t("tools")}
        </span>

        {(enabledCount > 0 || isLoading) && (
          <>
            <div className="h-4 hidden sm:block mx-1">
              <Separator orientation="vertical" />
            </div>

            <div className="min-w-5 flex justify-center">
              {isLoading ? (
                <Loader className="animate-spin size-3.5" />
              ) : (
                <CountAnimation number={enabledCount} className="text-xs" />
              )}
            </div>
          </>
        )}
      </Button>
    );
  }, [enabledCount, isLoading, open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div>
          <Tooltip>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent align={align} side={side}>
              {t("toolsSetup")}
            </TooltipContent>
          </Tooltip>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="md:w-72" align={align} side={side}>
        <div className="py-2">
          <McpServerSelector />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function McpServerSelector() {
  const t = useTranslations("Chat.Tool");
  const [appStoreMutate, allowedMcpServers, mcpServerList] = appStore(
    useShallow((state) => [
      state.mutate,
      state.allowedMcpServers,
      state.mcpList,
    ]),
  );

  const toggleServer = useCallback(
    (serverId: string) => {
      appStoreMutate((prev) => {
        const current = Array.isArray(prev.allowedMcpServers)
          ? prev.allowedMcpServers
          : [];
        const isEnabled = current.includes(serverId);
        return {
          allowedMcpServers: isEnabled
            ? current.filter((id) => id !== serverId)
            : [...current, serverId],
        };
      });
    },
    [appStoreMutate],
  );

  const sortedServers = useMemo(() => {
    if (mcpServerList.length === 0) return [];
    return [...mcpServerList].sort(
      (a, b) =>
        (a.status === "connected" ? -1 : 1) -
        (b.status === "connected" ? -1 : 1),
    );
  }, [mcpServerList]);

  const enabledSet = useMemo(
    () => new Set(Array.isArray(allowedMcpServers) ? allowedMcpServers : []),
    [allowedMcpServers],
  );

  if (!sortedServers.length) {
    return (
      <DropdownMenuGroup>
        <div className="text-sm text-muted-foreground w-full h-full flex flex-col items-center justify-center py-6">
          <div>{t("noMcpServersDetected")}</div>
          <Link href="/mcp">
            <Button
              variant={"ghost"}
              className="mt-2 text-primary flex items-center gap-1"
            >
              {t("addServer")} <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
      </DropdownMenuGroup>
    );
  }

  return (
    <DropdownMenuGroup>
      {sortedServers.map((server) => {
        const isEnabled = enabledSet.has(server.id);
        const isAuthorizing = server.status === "authorizing";

        return (
          <McpServerItem
            key={server.id}
            serverId={server.id}
            serverName={server.name}
            toolCount={server.toolInfo?.length ?? 0}
            isEnabled={isEnabled}
            isAuthorizing={isAuthorizing}
            hasError={Boolean(server.error)}
            onToggle={() => toggleServer(server.id)}
          />
        );
      })}
    </DropdownMenuGroup>
  );
}

function McpServerItem({
  serverId,
  serverName,
  toolCount,
  isEnabled,
  isAuthorizing,
  hasError,
  onToggle,
}: {
  serverId: string;
  serverName: string;
  toolCount: number;
  isEnabled: boolean;
  isAuthorizing: boolean;
  hasError: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Chat.Tool");
  const [loading, setLoading] = useState(false);

  const handleAuthorize = useCallback(
    () =>
      safe(() => setLoading(true))
        .map(() => redriectMcpOauth(serverId))
        .ifOk(() => mutate("/api/mcp/list"))
        .ifFail(handleErrorWithToast)
        .watch(() => setLoading(false)),
    [serverId],
  );

  if (isAuthorizing) {
    return (
      <DropdownMenuItem
        className="flex items-center gap-2 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          handleAuthorize();
        }}
      >
        {loading ? (
          <Loader className="size-3.5 animate-spin" />
        ) : (
          <ShieldAlertIcon className="size-3.5 text-muted-foreground" />
        )}
        <span className="truncate opacity-50">{serverName}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {t("authorizationRequired")}
        </span>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      className="flex items-center gap-2 cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      <div className="flex items-center justify-center p-1 rounded bg-input/40 border">
        <MCPIcon className="fill-foreground size-2.5" />
      </div>

      <span className={cn("truncate flex-1", !isEnabled && "opacity-30")}>
        {serverName}
      </span>

      {hasError && (
        <span className="text-xs text-destructive">{t("error")}</span>
      )}

      {toolCount > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {toolCount} tools
        </span>
      )}

      <Switch checked={isEnabled} />
    </DropdownMenuItem>
  );
}
