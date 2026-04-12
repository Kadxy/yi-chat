"use client";
import { MCPCard } from "@/components/mcp-card";
import { canCreateMCP } from "lib/auth/client-permissions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MCPPresetGrid } from "@/components/mcp-overview";
import { Skeleton } from "ui/skeleton";
import { ScrollArea } from "ui/scroll-area";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BasicUser } from "app-types/user";

interface MCPDashboardProps {
  message?: string;
  user: BasicUser;
}

export default function MCPDashboard({ message, user }: MCPDashboardProps) {
  const t = useTranslations("MCP");
  const canCreate = canCreateMCP(user?.role);

  const {
    data: mcpList,
    isLoading,
    isValidating,
  } = useMcpList({
    refreshInterval: 10000,
  });

  const installedNames = useMemo(
    () => new Set((mcpList ?? []).map((s) => s.name)),
    [mcpList],
  );

  const [showValidating, setShowValidating] = useState(false);

  useEffect(() => {
    if (isValidating) {
      setShowValidating(false);
      const timerId = setTimeout(() => setShowValidating(true), 500);
      return () => clearTimeout(timerId);
    }
    setShowValidating(false);
  }, [isValidating]);

  useEffect(() => {
    if (message) {
      toast(<p className="whitespace-pre-wrap break-all">{message}</p>, {
        id: "mcp-list-message",
      });
    }
  }, []);

  return (
    <ScrollArea className="h-full w-full">
      <div className="pt-8 flex-1 relative flex flex-col gap-6 px-8 max-w-3xl h-full mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            MCP
            {showValidating && isValidating && !isLoading && (
              <Loader2 className="size-4 animate-spin" />
            )}
          </h1>
          <div className="flex-1" />
          {canCreate && (
            <Link href="/mcp/create">
              <Button variant="outline" size="sm" className="gap-1.5">
                <MCPIcon className="fill-foreground size-3" />
                {t("addCustomServer")}
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <>
            {/* Installed servers */}
            {mcpList && mcpList.length > 0 && (
              <div className="flex flex-col gap-2">
                {mcpList.map((mcp) => (
                  <MCPCard key={mcp.id} {...mcp} />
                ))}
              </div>
            )}

            {/* Preset marketplace */}
            {canCreate && (
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t("availableIntegrations")}
                </h2>
                <MCPPresetGrid installedNames={installedNames} />
              </div>
            )}

            {/* Empty state for non-creators */}
            {!canCreate && (!mcpList || mcpList.length === 0) && (
              <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
                <h3 className="text-2xl font-semibold">
                  {t("noMcpServersAvailable")}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {t("noMcpServersAvailableDescription")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
