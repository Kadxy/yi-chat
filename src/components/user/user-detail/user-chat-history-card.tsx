"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { ScrollArea } from "ui/scroll-area";
import {
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Archive,
  User,
  Bot,
} from "lucide-react";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import type { ChatThread, ChatMessage } from "app-types/chat";

interface UserChatHistoryCardProps {
  userId: string;
}

type ThreadWithLastMessage = ChatThread & { lastMessageAt: number };

export function UserChatHistoryCard({ userId }: UserChatHistoryCardProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const { data: threads, isLoading: threadsLoading } = useSWR<
    ThreadWithLastMessage[]
  >(`/api/admin/users/${userId}/threads?archived=${showArchived}`, fetcher);

  const { data: messages, isLoading: messagesLoading } = useSWR<ChatMessage[]>(
    selectedThreadId
      ? `/api/admin/users/${userId}/threads/${selectedThreadId}`
      : null,
    fetcher,
  );

  const selectedThread = threads?.find((t) => t.id === selectedThreadId);

  return (
    <Card className="transition-all duration-200 hover:shadow-md md:col-span-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Chat History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowArchived(!showArchived);
                setSelectedThreadId(null);
              }}
            >
              <Archive className="size-3.5 mr-1" />
              {showArchived ? "Archived" : "Active"}
            </Button>
            {threads && (
              <Badge variant="secondary">{threads.length} threads</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {selectedThreadId ? (
          <ThreadMessages
            thread={selectedThread}
            messages={messages}
            isLoading={messagesLoading}
            onBack={() => setSelectedThreadId(null)}
          />
        ) : (
          <ThreadList
            threads={threads}
            isLoading={threadsLoading}
            onSelectThread={setSelectedThreadId}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ThreadList({
  threads,
  isLoading,
  onSelectThread,
}: {
  threads?: ThreadWithLastMessage[];
  isLoading: boolean;
  onSelectThread: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!threads?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No threads found.
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="space-y-1">
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className="w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {thread.title || "Untitled"}
              </p>
              <p className="text-xs text-muted-foreground">
                {thread.lastMessageAt
                  ? new Date(thread.lastMessageAt).toLocaleString()
                  : new Date(thread.createdAt).toLocaleString()}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function ThreadMessages({
  thread,
  messages,
  isLoading,
  onBack,
}: {
  thread?: ThreadWithLastMessage;
  messages?: ChatMessage[];
  isLoading: boolean;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
        <span className="text-sm font-medium truncate">
          {thread?.title || "Untitled"}
        </span>
        {messages && (
          <Badge variant="secondary" className="ml-auto shrink-0">
            {messages.length} messages
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !messages?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No messages in this thread.
        </p>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {messages
              .filter((m) => (m.role as string) !== "thinking")
              .map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [expanded, setExpanded] = useState(false);

  const textContent = message.parts
    ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  const isLong = textContent && textContent.length > 300;
  const displayText =
    isLong && !expanded ? textContent.slice(0, 300) + "..." : textContent;

  const model = message.metadata?.chatModel;

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`size-6 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? <User className="size-3" /> : <Bot className="size-3" />}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {model && !isUser && (
          <p className="text-[10px] opacity-60 mb-1">
            {model.provider}/{model.model}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{displayText}</p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs underline opacity-70 mt-1"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
        <p className="text-[10px] opacity-50 mt-1">
          {new Date(message.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
