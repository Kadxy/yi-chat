import "server-only";
import { LoadAPIKeyError, Tool, UIMessagePart } from "ai";
import { errorToString, exclude, objectFlow } from "lib/utils";
import logger from "logger";
import { VercelAIMcpTool } from "app-types/mcp";

import { safe } from "ts-safe";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { APP_DEFAULT_TOOL_KIT } from "lib/ai/tools/tool-kit";
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

export const loadAppDefaultTools = () =>
  safe(APP_DEFAULT_TOOL_KIT)
    .map((tools) =>
      Object.values(AppDefaultToolkit).reduce(
        (acc, key) => ({ ...acc, ...tools[key] }),
        {} as Record<string, Tool>,
      ),
    )
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
