"use client";
import { MCPCard } from "@/components/mcp-card";
import { Button } from "@/components/ui/button";
import { MCPPresetGrid } from "@/components/mcp-overview";
import { Skeleton } from "ui/skeleton";
import { ScrollArea } from "ui/scroll-area";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";

interface MCPDashboardProps {
  message?: string;
}

export default function MCPDashboard({ message }: MCPDashboardProps) {
  const t = useTranslations("MCP");
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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
      <div className="pt-8 flex-1 relative flex flex-col gap-6 px-4 sm:px-8 max-w-3xl h-full mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            MCP
            {showValidating && isValidating && !isLoading && (
              <Loader2 className="size-4 animate-spin" />
            )}
          </h1>
          <div className="flex-1" />
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <PlusIcon className="fill-foreground size-3" />
                {t("addMcpServer")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[80vh] flex flex-col">
              <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
                <DialogTitle>{t("addMcpServer")}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <MCPPresetGrid
                  installedNames={installedNames}
                  onInstalled={() => setAddDialogOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
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

            {/* Empty state */}
            {(!mcpList || mcpList.length === 0) && (
              <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
                <MCPIcon className="fill-muted-foreground size-8" />
                <h3 className="text-xl font-semibold">{t("overviewTitle")}</h3>
                <p className="text-muted-foreground max-w-md text-sm">
                  {t("overviewDescription")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5" />
                  {t("addMcpServer")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
