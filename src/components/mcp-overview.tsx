"use client";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { NotionIcon } from "ui/notion-icon";
import { LinearIcon } from "ui/linear-icon";
import { NeonIcon } from "ui/neon-icon";
import { StripeIcon } from "ui/stripe-icon";
import { CanvaIcon } from "ui/canva-icon";
import { PaypalIcon } from "ui/paypal-icon";
import { Button } from "ui/button";
import { AtlassianIcon } from "ui/atlassian-icon";
import { AsanaIcon } from "ui/asana-icon";
import { GithubIcon } from "ui/github-icon";
import { ComponentType, useCallback, useState } from "react";
import { MCPServerConfig } from "app-types/mcp";
import {
  existMcpClientByServerNameAction,
  saveMcpClientAction,
} from "@/app/api/mcp/actions";
import { handleErrorWithToast } from "ui/shared-toast";
import { toast } from "sonner";
import { mutate } from "swr";
import { Loader, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Input } from "ui/input";
import { Label } from "ui/label";

type AuthType = "oauth" | "token" | "none";

export type RecommendedMCP = {
  name: string;
  label: string;
  description: string;
  config: MCPServerConfig;
  icon: ComponentType<{ className?: string }>;
  authType: AuthType;
  tokenLabel?: string;
  tokenHelpUrl?: string;
  tokenHeaderKey?: string; // defaults to "Authorization"
  tokenHeaderValuePrefix?: string; // defaults to "Bearer "
};

export const RECOMMENDED_MCPS: RecommendedMCP[] = [
  {
    name: "github",
    label: "GitHub",
    description: "Repos, issues, pull requests, code search",
    config: { url: "https://api.githubcopilot.com/mcp/" },
    icon: GithubIcon,
    authType: "token",
    tokenLabel: "GitHub Personal Access Token",
    tokenHelpUrl:
      "https://github.com/settings/tokens/new?scopes=repo,read:org&description=Yi+Chat+MCP",
    tokenHeaderKey: "Authorization",
    tokenHeaderValuePrefix: "Bearer ",
  },
  {
    name: "notion",
    label: "Notion",
    description: "Search, read & write pages, databases",
    config: { url: "https://mcp.notion.com/mcp" },
    icon: NotionIcon,
    authType: "oauth",
  },
  {
    name: "linear",
    label: "Linear",
    description: "Issues, projects, comments",
    config: { url: "https://mcp.linear.app/sse" },
    icon: LinearIcon,
    authType: "oauth",
  },
  {
    name: "neon",
    label: "Neon",
    description: "Serverless Postgres management",
    config: { url: "https://mcp.neon.tech/mcp" },
    icon: NeonIcon,
    authType: "oauth",
  },
  {
    name: "paypal",
    label: "Paypal",
    description: "Payments, invoices, subscriptions",
    config: { url: "https://mcp.paypal.com/mcp" },
    icon: PaypalIcon,
    authType: "oauth",
  },
  {
    name: "stripe",
    label: "Stripe",
    description: "Payments, customers, subscriptions",
    config: { url: "https://mcp.stripe.com" },
    icon: StripeIcon,
    authType: "oauth",
  },
  {
    name: "canva",
    label: "Canva",
    description: "Design creation and management",
    config: { url: "https://mcp.canva.com/mcp" },
    icon: CanvaIcon,
    authType: "oauth",
  },
  {
    name: "atlassian",
    label: "Atlassian",
    description: "Jira, Confluence, Bitbucket",
    config: { url: "https://mcp.atlassian.com/v1/sse" },
    icon: AtlassianIcon,
    authType: "oauth",
  },
  {
    name: "asana",
    label: "Asana",
    description: "Tasks, projects, timelines",
    config: { url: "https://mcp.asana.com/sse" },
    icon: AsanaIcon,
    authType: "oauth",
  },
];

export function MCPPresetGrid({
  installedNames,
}: {
  installedNames: Set<string>;
}) {
  const t = useTranslations("MCP");
  const [installing, setInstalling] = useState<string | null>(null);
  const [tokenDialog, setTokenDialog] = useState<RecommendedMCP | null>(null);
  const [tokenValue, setTokenValue] = useState("");

  const install = useCallback(
    async (mcp: RecommendedMCP, tokenHeaders?: Record<string, string>) => {
      setInstalling(mcp.name);
      try {
        const exists = await existMcpClientByServerNameAction(mcp.name);
        if (exists) {
          toast.error(`${mcp.label} is already installed`);
          return;
        }
        const config = tokenHeaders
          ? { ...mcp.config, headers: tokenHeaders }
          : mcp.config;
        await saveMcpClientAction({ name: mcp.name, config } as any);
        toast.success(`${mcp.label} installed`);
        mutate("/api/mcp/list");
      } catch (e) {
        handleErrorWithToast(e as Error);
      } finally {
        setInstalling(null);
      }
    },
    [],
  );

  const handleClick = useCallback(
    (mcp: RecommendedMCP) => {
      if (installedNames.has(mcp.name) || installing) return;
      if (mcp.authType === "token") {
        setTokenValue("");
        setTokenDialog(mcp);
      } else {
        install(mcp);
      }
    },
    [installedNames, install],
  );

  const handleTokenSubmit = useCallback(() => {
    if (!tokenDialog || !tokenValue.trim()) return;
    const key = tokenDialog.tokenHeaderKey ?? "Authorization";
    const prefix = tokenDialog.tokenHeaderValuePrefix ?? "Bearer ";
    install(tokenDialog, { [key]: `${prefix}${tokenValue.trim()}` });
    setTokenDialog(null);
    setTokenValue("");
  }, [tokenDialog, tokenValue, install]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {RECOMMENDED_MCPS.map((mcp) => {
          const Icon = mcp.icon;
          const isInstalled = installedNames.has(mcp.name);
          const isInstalling = installing === mcp.name;
          return (
            <button
              key={mcp.name}
              disabled={isInstalled || !!installing}
              onClick={() => handleClick(mcp)}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition-all hover:border-foreground/20 hover:bg-accent/50 disabled:opacity-50 disabled:cursor-default disabled:hover:bg-card disabled:hover:border-border"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{mcp.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {mcp.description}
                </p>
              </div>
              {isInstalling ? (
                <Loader className="size-4 animate-spin shrink-0" />
              ) : isInstalled ? (
                <span className="text-xs text-muted-foreground shrink-0">
                  {t("installed")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Token input dialog */}
      <Dialog
        open={!!tokenDialog}
        onOpenChange={(open) => !open && setTokenDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              {tokenDialog?.label}
            </DialogTitle>
            <DialogDescription>{tokenDialog?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="token-input">
                {tokenDialog?.tokenLabel ?? "API Token"}
              </Label>
              <Input
                id="token-input"
                type="password"
                value={tokenValue}
                onChange={(e) => setTokenValue(e.target.value)}
                placeholder="Paste your token here..."
                onKeyDown={(e) => e.key === "Enter" && handleTokenSubmit()}
              />
            </div>
            {tokenDialog?.tokenHelpUrl && (
              <a
                href={tokenDialog.tokenHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                How to get a token?
              </a>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleTokenSubmit}
              disabled={!tokenValue.trim()}
              className="w-full"
            >
              Install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Legacy export for backward compat during transition — empty state hero
export function MCPOverview() {
  const t = useTranslations("MCP");
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-16 text-center">
      <MCPIcon className="fill-foreground size-8" />
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold">{t("overviewTitle")}</h3>
        <p className="text-muted-foreground max-w-md">
          {t("overviewDescription")}
        </p>
      </div>
      <MCPPresetGrid installedNames={new Set()} />
    </div>
  );
}
