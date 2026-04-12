"use client";

import { FileUIPart, getToolName, ToolUIPart, UIMessage } from "ai";
import {
  Check,
  Copy,
  Loader,
  Pencil,
  ChevronDownIcon,
  ChevronUp,
  RefreshCw,
  ChevronRight,
  TriangleAlert,
  EllipsisIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Button } from "ui/button";
import { Markdown } from "./markdown";
import { cn, safeJSONParse, truncateString } from "lib/utils";
import { useMemo, useState, memo, useEffect, useRef, useCallback } from "react";
import { MessageEditor } from "./message-editor";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useCopy } from "@/hooks/use-copy";

import { SelectModel } from "./select-model";
import { deleteMessagesByChatIdAfterTimestampAction } from "@/app/api/chat/actions";

import { toast } from "sonner";
import { safe } from "ts-safe";
import { ChatMetadata, ChatModel } from "app-types/chat";

import { useTranslations } from "next-intl";
import { extractMCPToolId } from "lib/ai/mcp/mcp-tool-id";

import { TextShimmer } from "ui/text-shimmer";
import equal from "lib/equal";
import { DefaultToolName } from "lib/ai/tools";
import { DefaultToolIcon } from "./default-tool-icon";

import dynamic from "next/dynamic";
import { ModelProviderIcon } from "ui/model-provider-icon";
import { useChatModels } from "@/hooks/queries/use-chat-models";

type MessagePart = UIMessage["parts"][number];
type TextMessagePart = Extract<MessagePart, { type: "text" }>;
type AssistMessagePart = Extract<MessagePart, { type: "text" }>;

import { FileTypeIcon } from "./file-type-icon";

interface UserMessagePartProps {
  part: TextMessagePart;
  isLast: boolean;
  message: UIMessage;
  setMessages?: UseChatHelpers<UIMessage>["setMessages"];
  sendMessage?: UseChatHelpers<UIMessage>["sendMessage"];
  status?: UseChatHelpers<UIMessage>["status"];
  isError?: boolean;
  readonly?: boolean;
}

interface AssistMessagePartProps {
  part: AssistMessagePart;
  isLast?: boolean;
  isLoading?: boolean;
  message: UIMessage;
  prevMessage?: UIMessage;
  showActions: boolean;
  threadId?: string;
  setMessages?: UseChatHelpers<UIMessage>["setMessages"];
  sendMessage?: UseChatHelpers<UIMessage>["sendMessage"];
  isError?: boolean;
  readonly?: boolean;
}

interface ToolMessagePartProps {
  part: ToolUIPart;
  messageId: string;
  showActions: boolean;
  isLast?: boolean;
  addToolResult?: UseChatHelpers<UIMessage>["addToolResult"];
  isError?: boolean;
  setMessages?: UseChatHelpers<UIMessage>["setMessages"];
  readonly?: boolean;
}

const MAX_TEXT_LENGTH = 600;
export const UserMessagePart = memo(
  function UserMessagePart({
    part,
    isLast,
    status,
    message,
    setMessages,
    sendMessage,
    readonly,
    isError,
  }: UserMessagePartProps) {
    const { copied, copy } = useCopy();
    const t = useTranslations();
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [expanded, setExpanded] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const scrolledRef = useRef(false);

    const isLongText = part.text.length > MAX_TEXT_LENGTH;
    const displayText =
      expanded || !isLongText
        ? part.text
        : truncateString(part.text, MAX_TEXT_LENGTH);

    useEffect(() => {
      if (status === "submitted" && isLast && !scrolledRef.current) {
        scrolledRef.current = true;
        ref.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [status]);

    if (mode === "edit" && setMessages && sendMessage) {
      return (
        <div className="flex flex-row gap-2 items-start w-full">
          <MessageEditor
            message={message}
            setMode={setMode}
            setMessages={setMessages}
            sendMessage={sendMessage}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 items-end my-2">
        <div
          data-testid="message-content"
          className={cn(
            "flex flex-col gap-4 max-w-full ring ring-input relative overflow-hidden",
            {
              "bg-accent text-accent-foreground px-4 py-3 rounded-2xl": isLast,
              "opacity-50": isError,
            },
            isError && "border-destructive border",
          )}
        >
          {isLongText && !expanded && (
            <div className="absolute pointer-events-none bg-gradient-to-t from-accent to-transparent w-full h-40 bottom-0 left-0" />
          )}
          <p className={cn("whitespace-pre-wrap text-sm break-words")}>
            {displayText}
          </p>
          {isLongText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-auto p-1 text-xs z-10 text-muted-foreground hover:text-foreground self-start"
            >
              <span className="flex items-center gap-1">
                {t(expanded ? "Common.showLess" : "Common.showMore")}
                {expanded ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDownIcon className="size-3" />
                )}
              </span>
            </Button>
          )}
        </div>
        {isLast && (
          <div className="flex w-full justify-end md:opacity-0 group-hover/message:opacity-100 transition-opacity duration-300">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="message-edit-button"
                  variant="ghost"
                  size="icon"
                  className={cn("size-3! p-4!")}
                  onClick={() => copy(part.text)}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy</TooltipContent>
            </Tooltip>
            {!readonly && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="message-edit-button"
                      variant="ghost"
                      size="icon"
                      className="size-3! p-4!"
                      onClick={() => setMode("edit")}
                    >
                      <Pencil />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Edit</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        )}
        <div ref={ref} className="min-w-0" />
      </div>
    );
  },
  (prev, next) => {
    if (prev.part.text != next.part.text) return false;
    if (prev.isError != next.isError) return false;
    if (prev.isLast != next.isLast) return false;
    if (prev.status != next.status) return false;
    if (prev.message.id != next.message.id) return false;
    if (!equal(prev.part, next.part)) return false;
    return true;
  },
);
UserMessagePart.displayName = "UserMessagePart";

export const AssistMessagePart = memo(function AssistMessagePart({
  part,
  showActions,
  message,
  prevMessage,
  isError,
  threadId,
  setMessages,
  readonly,
  sendMessage,
}: AssistMessagePartProps) {
  const { copied, copy } = useCopy();
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations();
  const metadata = message.metadata as ChatMetadata | undefined;
  const { data: providers } = useChatModels();

  const modelDisplayInfo = metadata?.chatModel
    ? (() => {
        const provider = providers?.find(
          (p) => p.provider === metadata.chatModel!.provider,
        );
        const model = provider?.models.find(
          (m) => m.name === metadata.chatModel!.model,
        );
        return {
          providerName: provider?.displayName || metadata.chatModel.provider,
          modelName: model?.displayName || metadata.chatModel.model,
        };
      })()
    : undefined;

  const handleModelChange = (model: ChatModel) => {
    if (!setMessages || !sendMessage || !prevMessage) return;
    safe(() => setIsLoading(true))
      .ifOk(() =>
        threadId
          ? deleteMessagesByChatIdAfterTimestampAction(message.id)
          : Promise.resolve(),
      )
      .ifOk(() =>
        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === prevMessage.id);
          if (index !== -1) {
            return [...messages.slice(0, index)];
          }
          return messages;
        }),
      )
      .ifOk(() =>
        sendMessage(prevMessage, {
          body: {
            model,
          },
        }),
      )
      .ifFail((error) => toast.error(error.message))
      .watch(() => setIsLoading(false))
      .unwrap();
  };

  return (
    <div
      className={cn(
        isLoading && "animate-pulse",
        "flex flex-col gap-2 group/message",
      )}
    >
      <div
        data-testid="message-content"
        className={cn("flex flex-col gap-4 px-2", {
          "opacity-50 border border-destructive bg-card rounded-lg": isError,
        })}
      >
        <Markdown>{part.text}</Markdown>
      </div>
      {showActions && (
        <div className="flex w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="message-edit-button"
                variant="ghost"
                size="icon"
                className="size-3! p-4!"
                onClick={() => copy(part.text)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          {!readonly && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SelectModel
                      onSelect={handleModelChange}
                      currentModel={metadata?.chatModel}
                    >
                      <Button
                        data-testid="message-edit-button data-[state=open]:bg-secondary!"
                        variant="ghost"
                        size="icon"
                        className="size-3! p-4!"
                      >
                        {<RefreshCw />}
                      </Button>
                    </SelectModel>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Change Model</TooltipContent>
              </Tooltip>
            </>
          )}

          {metadata && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-3! p-4! opacity-0 group-hover/message:opacity-100 transition-opacity duration-300"
                >
                  <EllipsisIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="p-4 w-72 bg-card border shadow-lg">
                <div className="space-y-4">
                  {metadata.chatModel && (
                    <>
                      <div className="flex gap-3 items-center">
                        <ModelProviderIcon
                          provider={metadata.chatModel.provider}
                          className="size-5 flex-shrink-0"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {modelDisplayInfo?.providerName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {modelDisplayInfo?.modelName}
                            {metadata.toolCount !== undefined &&
                              metadata.toolCount > 0 && (
                                <span className="ml-2">
                                  • {metadata.toolCount} tools
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                      {metadata.creditCost !== undefined && (
                        <div className="border-t border-border/50" />
                      )}
                    </>
                  )}

                  {metadata.creditCost !== undefined && (
                    <>
                      <div className="flex items-center justify-between py-1 px-1">
                        <span className="text-xs text-muted-foreground">
                          {t("Chat.Usage.title")}
                        </span>
                        <span className="text-xs font-mono font-medium">
                          {metadata.creditCost.toLocaleString()} credits
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      <div ref={ref} className="min-w-0" />
    </div>
  );
});
AssistMessagePart.displayName = "AssistMessagePart";
export const ReasoningPart = memo(function ReasoningPart({
  reasoningText,
  isThinking,
  savedDurationMs,
}: {
  reasoningText: string;
  isThinking?: boolean;
  readonly?: boolean;
  savedDurationMs?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const frozenSecondsRef = useRef<number | null>(null);

  const savedSeconds = savedDurationMs ? Math.floor(savedDurationMs / 1000) : 0;

  // Start timer when thinking begins
  useEffect(() => {
    if (isThinking) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      frozenSecondsRef.current = null;
      const timer = setInterval(() => {
        setElapsedSeconds(
          Math.floor((Date.now() - startTimeRef.current!) / 1000),
        );
      }, 1000);
      return () => clearInterval(timer);
    }
    // Thinking just ended — freeze the elapsed time
    if (startTimeRef.current && frozenSecondsRef.current === null) {
      frozenSecondsRef.current = Math.floor(
        (Date.now() - startTimeRef.current) / 1000,
      );
      setElapsedSeconds(frozenSecondsRef.current);
    }
  }, [isThinking]);

  // Pick the best available duration: live > frozen > saved from DB
  const seconds = elapsedSeconds || savedSeconds;

  const displayText = isThinking
    ? seconds > 0
      ? `Thinking for ${seconds}s`
      : "Thinking"
    : seconds > 0
      ? `Thought for ${seconds}s`
      : "Thought";

  useEffect(() => {
    if (!isThinking && isExpanded) {
      setIsExpanded(false);
    }
  }, [isThinking]);

  return (
    <div
      className="flex flex-col cursor-pointer"
      onClick={() => {
        setIsExpanded(!isExpanded);
      }}
    >
      <div className="flex flex-row gap-2 items-center text-ring hover:text-primary transition-colors">
        {isThinking ? (
          <TextShimmer>{displayText}</TextShimmer>
        ) : (
          <div className="font-medium">{displayText}</div>
        )}

        <button
          data-testid="message-reasoning-toggle"
          type="button"
          className={cn(
            "cursor-pointer transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
        >
          <ChevronDownIcon size={16} />
        </button>
      </div>

      <div
        data-testid="message-reasoning"
        className={cn(
          "pl-6 text-muted-foreground border-l ml-4 overflow-hidden",
          "transition-[grid-template-rows] duration-200 ease-in-out grid",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 pt-2">
            <Markdown>
              {reasoningText || (isThinking ? "" : "Hmm, let's see...🤔")}
            </Markdown>
          </div>
        </div>
      </div>
    </div>
  );
});
ReasoningPart.displayName = "ReasoningPart";

const loading = memo(function Loading() {
  return (
    <div className="px-6 py-4">
      <div className="h-44 w-full rounded-md opacity-0" />
    </div>
  );
});

const PieChart = dynamic(
  () => import("./tool-invocation/pie-chart").then((mod) => mod.PieChart),
  {
    ssr: false,
    loading,
  },
);

const BarChart = dynamic(
  () => import("./tool-invocation/bar-chart").then((mod) => mod.BarChart),
  {
    ssr: false,
    loading,
  },
);

const LineChart = dynamic(
  () => import("./tool-invocation/line-chart").then((mod) => mod.LineChart),
  {
    ssr: false,
    loading,
  },
);

const InteractiveTable = dynamic(
  () =>
    import("./tool-invocation/interactive-table").then(
      (mod) => mod.InteractiveTable,
    ),
  {
    ssr: false,
    loading,
  },
);

const WebSearchToolInvocation = dynamic(
  () =>
    import("./tool-invocation/web-search").then(
      (mod) => mod.WebSearchToolInvocation,
    ),
  {
    ssr: false,
    loading,
  },
);

const AcademicSearchToolInvocation = dynamic(
  () =>
    import("./tool-invocation/academic-search").then(
      (mod) => mod.AcademicSearchToolInvocation,
    ),
  {
    ssr: false,
    loading,
  },
);

const CodeExecutor = dynamic(
  () =>
    import("./tool-invocation/code-executor").then((mod) => mod.CodeExecutor),
  {
    ssr: false,
    loading,
  },
);

export const ToolMessagePart = memo(
  ({ part, isLast, addToolResult, isError }: ToolMessagePartProps) => {
    const { output, toolCallId, state, input, errorText } = part;

    const toolName = useMemo(() => getToolName(part), [part.type]);

    const isCompleted = useMemo(() => {
      return state.startsWith("output");
    }, [state]);

    const [expanded, setExpanded] = useState(false);

    const onToolCallDirect = useCallback(
      (result: any) => {
        addToolResult?.({
          tool: toolName,
          toolCallId,
          output: result,
        });
      },
      [addToolResult, toolCallId],
    );

    const result = useMemo(() => {
      if (state == "output-error") {
        return errorText;
      }
      if (isCompleted) {
        return Array.isArray(output)
          ? {
              ...output,
              content: output.map((node) => {
                // mcp tools
                if (node?.type === "text" && typeof node?.text === "string") {
                  const parsed = safeJSONParse(node.text);
                  return {
                    ...node,
                    text: parsed.success ? parsed.value : node.text,
                  };
                }
                return node;
              }),
            }
          : output;
      }
      return null;
    }, [isCompleted, output, state, errorText]);

    const CustomToolComponent = useMemo(() => {
      if (toolName === DefaultToolName.WebSearch) {
        return <WebSearchToolInvocation part={part} />;
      }

      if (toolName === DefaultToolName.AcademicSearch) {
        return <AcademicSearchToolInvocation part={part} />;
      }

      if (toolName === DefaultToolName.JavascriptExecution) {
        return (
          <CodeExecutor
            part={part}
            key={part.toolCallId}
            onResult={onToolCallDirect}
            type="javascript"
          />
        );
      }

      if (toolName === DefaultToolName.PythonExecution) {
        return (
          <CodeExecutor
            part={part}
            key={part.toolCallId}
            onResult={onToolCallDirect}
            type="python"
          />
        );
      }

      if (state === "output-available") {
        switch (toolName) {
          case DefaultToolName.CreatePieChart:
            return (
              <PieChart key={`${toolCallId}-${toolName}`} {...(input as any)} />
            );
          case DefaultToolName.CreateBarChart:
            return (
              <BarChart key={`${toolCallId}-${toolName}`} {...(input as any)} />
            );
          case DefaultToolName.CreateLineChart:
            return (
              <LineChart
                key={`${toolCallId}-${toolName}`}
                {...(input as any)}
              />
            );
          case DefaultToolName.CreateTable:
            return (
              <InteractiveTable
                key={`${toolCallId}-${toolName}`}
                {...(input as any)}
              />
            );
        }
      }
      return null;
    }, [toolName, state, onToolCallDirect, result, input]);

    const { serverName: mcpServerName, toolName: mcpToolName } = useMemo(() => {
      const defaultToolLabels: Partial<Record<DefaultToolName, string>> = {
        [DefaultToolName.ReadUserFile]: "Read File",
        [DefaultToolName.CreateUserFile]: "Create File",
        [DefaultToolName.WebSearch]: "Web Search",
        [DefaultToolName.WebContent]: "Web Content",
        [DefaultToolName.AcademicSearch]: "Academic Search",
        [DefaultToolName.Http]: "HTTP Request",
        [DefaultToolName.JavascriptExecution]: "JavaScript",
        [DefaultToolName.PythonExecution]: "Python",
        [DefaultToolName.CreatePieChart]: "Pie Chart",
        [DefaultToolName.CreateBarChart]: "Bar Chart",
        [DefaultToolName.CreateLineChart]: "Line Chart",
        [DefaultToolName.CreateTable]: "Table",
      };
      const friendly = defaultToolLabels[toolName as DefaultToolName];
      if (friendly) {
        return { serverName: friendly, toolName: "" };
      }
      return extractMCPToolId(toolName);
    }, [toolName]);

    const isExpanded = useMemo(() => {
      return expanded || result === null;
    }, [expanded, result]);

    const isExecuting = useMemo(() => {
      return !isCompleted && isLast;
    }, [isCompleted, isLast]);

    const toolSummary = useMemo(() => {
      const inp = input as Record<string, any> | undefined;
      if (!inp) return "";
      // Extract a readable hint — prefer filename, extract from URL if needed
      if (inp.filename) {
        return inp.filename;
      }
      if (inp.url && typeof inp.url === "string") {
        // R2 URL pattern: .../uploads/{uuid}-{filename}
        const match = inp.url.match(
          /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+?)(?:\?|$)/,
        );
        if (match) {
          return decodeURIComponent(match[1]);
        }
      }
      const hint = inp.query || inp.code || inp.method;
      if (typeof hint === "string") {
        return hint.length > 60 ? hint.slice(0, 60) + "…" : hint;
      }
      return "";
    }, [input]);

    return (
      <div className="group w-full">
        {CustomToolComponent ? (
          CustomToolComponent
        ) : (
          <div className="flex flex-col fade-in duration-300 animate-in text-sm">
            <div
              className="flex gap-2 items-center cursor-pointer select-none group/title py-0.5"
              onClick={() => setExpanded(!expanded)}
            >
              {isExecuting ? (
                <Loader className="size-4 animate-spin text-muted-foreground shrink-0" />
              ) : isError ? (
                <TriangleAlert className="size-4 text-destructive shrink-0" />
              ) : (
                <DefaultToolIcon
                  name={toolName as DefaultToolName}
                  className="size-4 shrink-0"
                />
              )}
              <span className="font-semibold text-sm">
                {isExecuting ? (
                  <TextShimmer>{mcpServerName}</TextShimmer>
                ) : (
                  mcpServerName
                )}
              </span>
              {mcpToolName && (
                <>
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {mcpToolName}
                  </span>
                </>
              )}
              {!isExpanded && toolSummary && (
                <span className="text-xs text-muted-foreground truncate max-w-md">
                  {toolSummary}
                </span>
              )}
              <ChevronDownIcon
                className={cn(
                  "size-3 text-muted-foreground ml-auto shrink-0 transition-transform",
                  isExpanded && "rotate-180",
                )}
              />
            </div>

            {isExpanded && (
              <div className="ml-5 mt-1.5 flex flex-col gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground select-none font-medium">
                    Input
                  </span>
                  <pre className="mt-1 max-h-[200px] overflow-y-auto no-scrollbar rounded-md bg-secondary/50 px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                    {JSON.stringify(input, null, 2)}
                  </pre>
                </div>
                {!!result && (
                  <div>
                    <span className="text-muted-foreground select-none font-medium">
                      Output
                    </span>
                    <pre className="mt-1 max-h-[200px] overflow-y-auto no-scrollbar rounded-md bg-secondary/50 px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.isError !== next.isError) return false;
    if (prev.isLast !== next.isLast) return false;
    if (prev.showActions !== next.showActions) return false;
    if (prev.messageId !== next.messageId) return false;
    if (!equal(prev.part, next.part)) return false;
    return true;
  },
);

ToolMessagePart.displayName = "ToolMessagePart";

// File Message Part Component
interface FileMessagePartProps {
  part: FileUIPart;
  isUserMessage: boolean;
}

export const FileMessagePart = memo(
  ({ part, isUserMessage: _isUserMessage }: FileMessagePartProps) => {
    const isImage = part.mediaType?.startsWith("image/");

    const fileExtension =
      part.filename?.split(".").pop()?.toUpperCase() ||
      part.mediaType?.split("/").pop()?.toUpperCase() ||
      "FILE";
    const fileUrl = part.url;
    const filename =
      part.filename || part.url?.split("/").pop() || "Attachment";

    if (isImage && fileUrl) {
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "block w-16 h-16 rounded-xl overflow-hidden border border-border hover:opacity-80 transition-opacity",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={part.filename || "Uploaded image"}
            className="w-full h-full object-cover"
          />
        </a>
      );
    }

    // Non-image file — compact chip, clickable to open in new tab
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "w-44 h-16 inline-flex items-center gap-2.5 rounded-xl border border-border px-3 hover:bg-accent/60 transition-colors bg-background/80",
            )}
          >
            <FileTypeIcon
              mimeType={part.mediaType || ""}
              filename={part.filename || ""}
              className="size-8 p-1"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium truncate">{filename}</span>
              <span className="text-[10px] text-muted-foreground">
                {fileExtension}
              </span>
            </div>
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {filename}
        </TooltipContent>
      </Tooltip>
    );
  },
);

FileMessagePart.displayName = "FileMessagePart";

// Source URL (non-model) attachment renderer
export function SourceUrlMessagePart({
  part,
  isUserMessage: _isUserMessage,
}: {
  part: { type: "source-url"; url: string; title?: string; mediaType?: string };
  isUserMessage: boolean;
}) {
  const name = part.title || part.url?.split("/").pop() || "attachment";
  const ext = name.split(".").pop()?.toUpperCase() || "FILE";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "w-44 h-16 inline-flex items-center gap-2.5 rounded-xl border border-border px-3 hover:bg-accent/60 transition-colors bg-background/80",
          )}
        >
          <FileTypeIcon
            mimeType={part.mediaType || ""}
            filename={name}
            className="size-8 p-1"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium truncate">{name}</span>
            <span className="text-[10px] text-muted-foreground">{ext}</span>
          </div>
        </a>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {name}
      </TooltipContent>
    </Tooltip>
  );
}
