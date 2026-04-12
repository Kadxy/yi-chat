import "server-only";
import {
  LoadAPIKeyError,
  UIMessage,
  Tool,
  tool as createTool,
  isToolUIPart,
  UIMessagePart,
  ToolUIPart,
  getToolName,
} from "ai";
import { ChatMetadata, ManualToolConfirmTag } from "app-types/chat";
import { errorToString, exclude, objectFlow } from "lib/utils";
import logger from "logger";
import { VercelAIMcpTool, VercelAIMcpToolTag } from "app-types/mcp";
import { MANUAL_REJECT_RESPONSE_PROMPT } from "lib/ai/prompts";

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

export function excludeToolExecution(
  tool: Record<string, Tool>,
): Record<string, Tool> {
  return objectFlow(tool).map((value) => {
    return createTool({
      inputSchema: value.inputSchema,
      description: value.description,
    });
  });
}

export function mergeSystemPrompt(
  ...prompts: (string | undefined | false)[]
): string {
  const filteredPrompts = prompts
    .map((prompt) => (prompt ? prompt.trim() : ""))
    .filter(Boolean);
  return filteredPrompts.join("\n\n");
}

export function manualToolExecuteByLastMessage(
  part: ToolUIPart,
  tools: Record<string, VercelAIMcpTool | Tool>,
  abortSignal?: AbortSignal,
) {
  const { input } = part;

  const toolName = getToolName(part);

  const tool = tools[toolName];
  return safe(() => {
    if (!tool) throw new Error(`tool not found: ${toolName}`);
    if (!ManualToolConfirmTag.isMaybe(part.output))
      throw new Error("manual tool confirm not found");
    return part.output;
  })
    .map(({ confirm }) => {
      if (!confirm) return MANUAL_REJECT_RESPONSE_PROMPT;
      if (VercelAIMcpToolTag.isMaybe(tool)) {
        return mcpClientsManager.toolCall(
          tool._mcpServerId,
          tool._originToolName,
          input,
        );
      }
      return tool.execute!(input, {
        toolCallId: part.toolCallId,
        abortSignal: abortSignal ?? new AbortController().signal,
        messages: [],
      });
    })
    .ifFail((error) => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error),
    }))
    .unwrap();
}

export function handleError(error: any) {
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message;
  }
  logger.error(error);
  logger.error(`Route Error: ${error.name}`);
  return errorToString(error.message);
}

export function extractInProgressToolPart(message: UIMessage): ToolUIPart[] {
  if (message.role != "assistant") return [];
  if ((message.metadata as ChatMetadata)?.toolChoice != "manual") return [];
  return message.parts.filter(
    (part) =>
      isToolUIPart(part) &&
      part.state == "output-available" &&
      ManualToolConfirmTag.isMaybe(part.output),
  ) as ToolUIPart[];
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
