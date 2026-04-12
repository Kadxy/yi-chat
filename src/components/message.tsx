"use client";

import { isToolUIPart, type UIMessage } from "ai";
import { memo, useMemo, useState } from "react";
import equal from "lib/equal";

import { cn, truncateString } from "lib/utils";
import type { UseChatHelpers } from "@ai-sdk/react";
import {
  UserMessagePart,
  AssistMessagePart,
  ToolMessagePart,
  ReasoningPart,
  FileMessagePart,
  SourceUrlMessagePart,
} from "./message-parts";
import { ChevronDown, ChevronUp, TriangleAlertIcon } from "lucide-react";
import { Button } from "ui/button";
import { useTranslations } from "next-intl";
import { ChatMetadata } from "app-types/chat";
import { appStore } from "@/app/store";
import { CHAT_ERROR_CODE, parseChatErrorCode } from "app-types/errors";

interface Props {
  message: UIMessage;
  prevMessage?: UIMessage;
  threadId?: string;
  isLoading?: boolean;
  isLastMessage?: boolean;
  setMessages?: UseChatHelpers<UIMessage>["setMessages"];
  sendMessage?: UseChatHelpers<UIMessage>["sendMessage"];
  className?: string;
  addToolResult?: UseChatHelpers<UIMessage>["addToolResult"];
  messageIndex?: number;
  status?: UseChatHelpers<UIMessage>["status"];
  readonly?: boolean;
}

const PurePreviewMessage = ({
  message,
  prevMessage,
  readonly,
  threadId,
  isLoading,
  isLastMessage,
  status,
  className,
  setMessages,
  addToolResult,
  messageIndex,
  sendMessage,
}: Props) => {
  const isUserMessage = useMemo(() => message.role === "user", [message.role]);
  const partsForDisplay = useMemo(
    () =>
      message.parts.filter(
        (part) => !(part.type === "text" && (part as any).ingestionPreview),
      ),
    [message.parts],
  );

  // Group consecutive file/source-url parts for horizontal layout
  const groupedParts = useMemo(() => {
    const groups: Array<
      | { type: "attachment-group"; parts: Array<{ part: any; key: string }> }
      | {
          type: "single";
          part: any;
          key: string;
          index: number;
          isLastPart: boolean;
        }
    > = [];
    let currentAttachments: Array<{ part: any; key: string }> = [];

    const flushAttachments = () => {
      if (currentAttachments.length > 0) {
        groups.push({
          type: "attachment-group",
          parts: [...currentAttachments],
        });
        currentAttachments = [];
      }
    };

    partsForDisplay.forEach((part, index) => {
      const key = `message-${messageIndex}-part-${part.type}-${index}`;
      const isLastPart = index === partsForDisplay.length - 1;
      const isAttachment =
        part.type === "file" || (part as any).type === "source-url";

      if (isAttachment) {
        currentAttachments.push({ part, key });
        if (isLastPart) flushAttachments();
      } else {
        flushAttachments();
        groups.push({ type: "single", part, key, index, isLastPart });
      }
    });
    flushAttachments();
    return groups;
  }, [partsForDisplay, messageIndex]);

  if (message.role == "system") {
    return null; // system message is not shown
  }
  if (!partsForDisplay.length) return null;

  return (
    <div className="w-full mx-auto max-w-3xl px-6 group/message">
      <div
        className={cn(
          "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
          className,
        )}
      >
        <div className="flex flex-col gap-4 w-full">
          {groupedParts.map((group) => {
            if (group.type === "attachment-group") {
              return (
                <div
                  key={group.parts[0].key}
                  className={cn(
                    "flex flex-wrap gap-2",
                    isUserMessage && "justify-end",
                  )}
                >
                  {group.parts.map(({ part, key }) => {
                    if (part.type === "file") {
                      return (
                        <FileMessagePart
                          key={key}
                          part={part}
                          isUserMessage={isUserMessage}
                        />
                      );
                    }
                    return (
                      <SourceUrlMessagePart
                        key={key}
                        part={part as any}
                        isUserMessage={isUserMessage}
                      />
                    );
                  })}
                </div>
              );
            }

            const { part, key, index, isLastPart } = group;

            if (part.type === "reasoning") {
              const savedDurationMs = (message.metadata as ChatMetadata)
                ?.thinkingDurationMs;
              const hasTextAfter = partsForDisplay
                .slice(index + 1)
                .some((p) => p.type === "text");
              return (
                <ReasoningPart
                  key={key}
                  messageId={message.id}
                  readonly={readonly}
                  reasoningText={part.text}
                  isThinking={isLastMessage && isLoading && !hasTextAfter}
                  savedDurationMs={savedDurationMs}
                />
              );
            }

            if (isUserMessage && part.type === "text" && part.text) {
              return (
                <UserMessagePart
                  key={key}
                  status={status}
                  part={part}
                  readonly={readonly}
                  isLast={isLastPart}
                  message={message}
                  setMessages={setMessages}
                  sendMessage={sendMessage}
                />
              );
            }

            if (part.type === "text" && !isUserMessage) {
              return (
                <AssistMessagePart
                  threadId={threadId}
                  isLast={isLastMessage && isLastPart}
                  isLoading={isLoading}
                  key={key}
                  readonly={readonly}
                  part={part}
                  prevMessage={prevMessage}
                  showActions={
                    isLastMessage ? isLastPart && !isLoading : isLastPart
                  }
                  message={message}
                  setMessages={setMessages}
                  sendMessage={sendMessage}
                />
              );
            }

            if (isToolUIPart(part)) {
              const isLast = isLastMessage && isLastPart;
              return (
                <ToolMessagePart
                  isLast={isLast}
                  readonly={readonly}
                  messageId={message.id}
                  showActions={
                    !readonly &&
                    (isLastMessage ? isLastPart && !isLoading : isLastPart)
                  }
                  addToolResult={addToolResult}
                  key={key}
                  part={part as any}
                  setMessages={setMessages}
                />
              );
            } else if (part.type === "step-start") {
              return null;
            } else {
              return <div key={key}> unknown part {part.type}</div>;
            }
          })}
        </div>
      </div>
    </div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  function equalMessage(prevProps: Props, nextProps: Props) {
    if (prevProps.message.id !== nextProps.message.id) return false;

    if (prevProps.isLoading !== nextProps.isLoading) return false;

    if (prevProps.isLastMessage !== nextProps.isLastMessage) return false;

    if (prevProps.className !== nextProps.className) return false;

    if (nextProps.isLoading && nextProps.isLastMessage) return false;

    if (!equal(prevProps.message.metadata, nextProps.message.metadata))
      return false;

    if (prevProps.message.parts.length !== nextProps.message.parts.length) {
      return false;
    }
    if (!equal(prevProps.message.parts, nextProps.message.parts)) {
      return false;
    }

    return true;
  },
);

export const ErrorMessage = ({
  error,
}: {
  error: Error;
  message?: UIMessage;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 200;
  const t = useTranslations();

  const errorCode = parseChatErrorCode(error.message);

  // Credit/plan errors — clean card with action
  if (errorCode) {
    const isCredits = errorCode === CHAT_ERROR_CODE.INSUFFICIENT_CREDITS;
    return (
      <div className="w-full mx-auto max-w-3xl px-6 animate-in fade-in mt-4">
        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <p className="text-sm font-medium mb-0.5">
            {isCredits
              ? t("Chat.Errors.insufficientCredits")
              : t("Chat.Errors.modelNotAllowed")}
          </p>
          <p className="text-xs text-muted-foreground mb-2.5">
            {isCredits
              ? t("Chat.Errors.insufficientCreditsDesc")
              : t("Chat.Errors.modelNotAllowedDesc")}
          </p>
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={() => appStore.getState().mutate({ openPlanModal: true })}
          >
            {t("Chat.Errors.viewPlans")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto max-w-3xl px-6 animate-in fade-in mt-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-4 px-2 opacity-70">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-muted rounded-sm">
              <TriangleAlertIcon className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm mb-2">{t("Chat.Error")}</p>
              <div className="text-sm text-muted-foreground">
                <div className="whitespace-pre-wrap">
                  {isExpanded
                    ? error.message
                    : truncateString(error.message, maxLength)}
                </div>
                {error.message.length > maxLength && (
                  <Button
                    onClick={() => setIsExpanded(!isExpanded)}
                    variant={"ghost"}
                    className="h-auto p-1 text-xs mt-2"
                    size={"sm"}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        {t("Common.showLess")}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        {t("Common.showMore")}
                      </>
                    )}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-3 italic">
                  {t("Chat.thisMessageWasNotSavedPleaseTryTheChatAgain")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
