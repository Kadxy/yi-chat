"use client";
import { useState, useMemo } from "react";
import { MCPServerConfig, MCPRemoteConfigZodSchema } from "app-types/mcp";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { useRouter } from "next/navigation";
import { fetcher, isNull } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";
import { mutate } from "swr";
import { Loader, Plus, Trash2 } from "lucide-react";

import { z } from "zod";
import { useTranslations } from "next-intl";
import { existMcpClientByServerNameAction } from "@/app/api/mcp/actions";

interface MCPEditorProps {
  initialConfig?: MCPServerConfig;
  name?: string;
  id?: string;
}

export default function MCPEditor({
  initialConfig,
  name: initialName,
  id,
}: MCPEditorProps) {
  const t = useTranslations();
  const shouldInsert = useMemo(() => isNull(id), [id]);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [name, setName] = useState(initialName ?? "");
  const [url, setUrl] = useState(initialConfig?.url ?? "");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    () => {
      if (!initialConfig?.headers) return [];
      return Object.entries(initialConfig.headers).map(([key, value]) => ({
        key,
        value,
      }));
    },
  );

  const nameSchema = z.string().regex(/^[a-zA-Z0-9\-]+$/, {
    message: t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens"),
  });

  const validateName = (nameValue: string): boolean => {
    const result = nameSchema.safeParse(nameValue);
    if (!result.success) {
      setNameError(
        t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens"),
      );
      return false;
    }
    setNameError(null);
    return true;
  };

  const buildConfig = (): MCPServerConfig => {
    const headersObj = headers.reduce(
      (acc, { key, value }) => {
        if (key.trim() && value.trim()) acc[key.trim()] = value.trim();
        return acc;
      },
      {} as Record<string, string>,
    );
    return {
      url: url.trim(),
      ...(Object.keys(headersObj).length > 0 && { headers: headersObj }),
    };
  };

  const saveDisabled = useMemo(
    () => !name.trim() || !url.trim() || isLoading || !!nameError,
    [name, url, isLoading, nameError],
  );

  const handleSave = async () => {
    if (!validateName(name)) return;

    const config = buildConfig();
    const result = MCPRemoteConfigZodSchema.safeParse(config);
    if (!result.success) {
      handleErrorWithToast(result.error, "mcp-editor-error");
      return;
    }

    safe(() => setIsLoading(true))
      .map(async () => {
        if (shouldInsert) {
          const exist = await existMcpClientByServerNameAction(name);
          if (exist) throw new Error(t("MCP.nameAlreadyExists"));
        }
      })
      .map(() =>
        fetcher("/api/mcp", {
          method: "POST",
          body: JSON.stringify({ name, config, id }),
        }),
      )
      .ifOk(() => {
        toast.success(t("MCP.configurationSavedSuccessfully"));
        mutate("/api/mcp/list");
        router.push("/mcp");
      })
      .ifFail(handleErrorWithToast)
      .watch(() => setIsLoading(false));
  };

  const addHeader = () => setHeaders([...headers, { key: "", value: "" }]);

  const removeHeader = (index: number) =>
    setHeaders(headers.filter((_, i) => i !== index));

  const updateHeader = (index: number, field: "key" | "value", val: string) => {
    const updated = [...headers];
    updated[index][field] = val;
    setHeaders(updated);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          disabled={!shouldInsert}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value) validateName(e.target.value);
          }}
          placeholder={t("MCP.enterMcpServerName")}
          className={nameError ? "border-destructive" : ""}
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://mcp.example.com/mcp"
          type="url"
        />
      </div>

      {/* Headers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={addHeader}
            className="h-7 text-xs gap-1"
          >
            <Plus className="size-3" />
            Add Header
          </Button>
        </div>
        {headers.map((header, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={header.key}
              onChange={(e) => updateHeader(index, "key", e.target.value)}
              placeholder="Key (e.g. Authorization)"
              className="flex-1"
            />
            <Input
              value={header.value}
              onChange={(e) => updateHeader(index, "value", e.target.value)}
              placeholder="Value (e.g. Bearer sk-...)"
              className="flex-1"
              type="password"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeHeader(index)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Save */}
      <Button onClick={handleSave} className="w-full" disabled={saveDisabled}>
        {isLoading ? (
          <Loader className="size-4 animate-spin" />
        ) : (
          <span className="font-bold">{t("MCP.saveConfiguration")}</span>
        )}
      </Button>
    </div>
  );
}
