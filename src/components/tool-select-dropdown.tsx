"use client";

import { appStore } from "@/app/store";
import { cn } from "lib/utils";
import {
  ChevronRight,
  Loader,
  ShieldAlertIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";

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
import { AppDefaultToolkit } from "lib/ai/tools";

const TOOLKIT_KEYS: AppDefaultToolkit[] = [
  AppDefaultToolkit.WebSearch,
  AppDefaultToolkit.Code,
  AppDefaultToolkit.Visualization,
  AppDefaultToolkit.AcademicSearch,
  AppDefaultToolkit.Http,
  AppDefaultToolkit.File,
];

const ALL_TOOLKIT_KEYS = Object.values(AppDefaultToolkit);

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
  const [allowedMcpServers, enabledBuiltinToolTypes, mcpList] = appStore(
    useShallow((state) => [
      state.allowedMcpServers,
      state.enabledBuiltinToolTypes,
      state.mcpList,
    ]),
  );

  const { isLoading } = useMcpList();

  const mcpEnabledCount = useMemo(() => {
    if (!Array.isArray(allowedMcpServers)) return 0;
    return allowedMcpServers.filter((id) => mcpList.some((s) => s.id === id))
      .length;
  }, [allowedMcpServers, mcpList]);

  const builtinEnabledCount = useMemo(() => {
    if (!Array.isArray(enabledBuiltinToolTypes)) return TOOLKIT_KEYS.length;
    return enabledBuiltinToolTypes.filter((k) =>
      ALL_TOOLKIT_KEYS.includes(k as AppDefaultToolkit),
    ).length;
  }, [enabledBuiltinToolTypes]);

  const totalEnabledCount = mcpEnabledCount + builtinEnabledCount;

  const triggerButton = useMemo(() => {
    return (
      <Button
        variant="ghost"
        size={"sm"}
        className={cn(
          "gap-0.5 bg-input/60 border rounded-full data-[state=open]:bg-input! hover:bg-input!",
          !totalEnabledCount &&
            !isLoading &&
            "text-muted-foreground bg-transparent border-transparent",
          isLoading && "bg-input/60",
          open && "bg-input!",
          className,
        )}
      >
        <span className={!totalEnabledCount ? "text-muted-foreground" : ""}>
          <WrenchIcon className="size-3.5" />
        </span>

        {(totalEnabledCount > 0 || isLoading) && (
          <>
            <div className="h-4 hidden sm:block mx-1">
              <Separator orientation="vertical" />
            </div>

            <div className="min-w-5 flex justify-center">
              {isLoading ? (
                <Loader className="animate-spin size-3.5" />
              ) : (
                <CountAnimation
                  number={totalEnabledCount}
                  className="text-xs"
                />
              )}
            </div>
          </>
        )}
      </Button>
    );
  }, [totalEnabledCount, isLoading, open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div>
          <Tooltip>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent align={align} side={side}>
              Tools
            </TooltipContent>
          </Tooltip>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="md:w-72" align={align} side={side}>
        <div className="py-2">
          <BuiltinToolSelector />
          <div className="py-1.5">
            <Separator />
          </div>
          <McpServerSelector />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BuiltinToolSelector() {
  const t = useTranslations("Chat.Tool");
  const [appStoreMutate, enabledBuiltinToolTypes] = appStore(
    useShallow((state) => [state.mutate, state.enabledBuiltinToolTypes]),
  );

  const enabledSet = useMemo(
    () =>
      Array.isArray(enabledBuiltinToolTypes)
        ? new Set(enabledBuiltinToolTypes)
        : new Set(ALL_TOOLKIT_KEYS as string[]),
    [enabledBuiltinToolTypes],
  );

  const toggleToolkit = useCallback(
    (key: AppDefaultToolkit) => {
      appStoreMutate((prev) => {
        // First toggle: initialize from full list
        const current = Array.isArray(prev.enabledBuiltinToolTypes)
          ? prev.enabledBuiltinToolTypes
          : [...ALL_TOOLKIT_KEYS];
        const isEnabled = current.includes(key);
        return {
          enabledBuiltinToolTypes: isEnabled
            ? current.filter((k) => k !== key)
            : [...current, key],
        };
      });
    },
    [appStoreMutate],
  );

  const toolkitI18nKeys: Record<AppDefaultToolkit, string> = {
    [AppDefaultToolkit.WebSearch]: "toolkitWebSearch",
    [AppDefaultToolkit.Code]: "toolkitCode",
    [AppDefaultToolkit.Visualization]: "toolkitVisualization",
    [AppDefaultToolkit.AcademicSearch]: "toolkitAcademicSearch",
    [AppDefaultToolkit.Http]: "toolkitHttp",
    [AppDefaultToolkit.File]: "toolkitFile",
  };

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="text-xs text-muted-foreground px-2 pb-1">
        {t("builtInTools")}
      </DropdownMenuLabel>
      {TOOLKIT_KEYS.map((key) => {
        const isEnabled = enabledSet.has(key);
        return (
          <DropdownMenuItem
            key={key}
            className="flex items-center gap-2 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              toggleToolkit(key);
            }}
          >
            <span className={cn("truncate flex-1", !isEnabled && "opacity-30")}>
              {t(toolkitI18nKeys[key])}
            </span>
            <Switch checked={isEnabled} />
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuGroup>
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
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 pb-1">
          MCP
        </DropdownMenuLabel>
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
      <DropdownMenuLabel className="text-xs text-muted-foreground px-2 pb-1">
        MCP
      </DropdownMenuLabel>
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
