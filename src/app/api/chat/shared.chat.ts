import "server-only";
import { LoadAPIKeyError, Tool, UIMessagePart } from "ai";
import { errorToString, exclude, objectFlow } from "lib/utils";
import logger from "logger";
import { VercelAIMcpTool } from "app-types/mcp";

import { safe } from "ts-safe";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import {
  APP_DEFAULT_TOOL_KIT,
  CONDITIONAL_FILE_TOOLS,
} from "lib/ai/tools/tool-kit";
import { AppDefaultToolkit } from "lib/ai/tools";

export function filterMCPToolsByEnabledServers(
  tools: Record<string, VercelAIMcpTool>,
  enabledServerIds?: string[],
): Record<string, VercelAIMcpTool> {
  if (!Array.isArray(enabledServerIds) || !enabledServerIds.length) {
    return {};
  }
  return objectFlow(tools).filter((_tool) =>
    enabledServerIds.includes(_tool._mcpServerId),
  );
}

export function mergeSystemPrompt(
  ...prompts: (string | undefined | false)[]
): string {
  const filteredPrompts = prompts
    .map((prompt) => (prompt ? prompt.trim() : ""))
    .filter(Boolean);
  return filteredPrompts.join("\n\n");
}

export function handleError(error: any) {
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message;
  }
  logger.error(error);
  logger.error(`Route Error: ${error.name}`);
  return errorToString(error.message);
}

export const loadMcpTools = (enabledServerIds?: string[]) =>
  safe(() => mcpClientsManager.tools())
    .map((tools) => filterMCPToolsByEnabledServers(tools, enabledServerIds))
    .orElse({} as Record<string, VercelAIMcpTool>);

export const loadAppDefaultTools = (
  enabledToolkits?: string[],
  hasAttachments?: boolean,
) =>
  safe(APP_DEFAULT_TOOL_KIT)
    .map((toolKit) => {
      // undefined = all enabled (backward compat), [] = none
      const kits =
        enabledToolkits === undefined
          ? Object.values(AppDefaultToolkit)
          : enabledToolkits.filter((k): k is AppDefaultToolkit =>
              Object.values(AppDefaultToolkit).includes(k as AppDefaultToolkit),
            );

      const tools = kits.reduce(
        (acc, key) => ({ ...acc, ...toolKit[key] }),
        {} as Record<string, Tool>,
      );

      // Conditional tools (readUserFile - only when attachments present)
      if (hasAttachments) {
        Object.assign(tools, CONDITIONAL_FILE_TOOLS);
      }

      return tools;
    })
    .ifFail((e) => {
      console.error(e);
      throw e;
    })
    .orElse({} as Record<string, Tool>);

export const convertToSavePart = <T extends UIMessagePart<any, any>>(
  part: T,
) => {
  return exclude(part as any, [
    "providerMetadata",
    "callProviderMetadata",
  ]) as T;
};
