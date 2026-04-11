"use client";

import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { fetcher } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";
import { ChatThread } from "app-types/chat";
import {
  unarchiveThreadAction,
  deleteThreadAction,
} from "@/app/api/chat/actions";
import { toast } from "sonner";
import { ArchiveRestoreIcon, Trash, Loader } from "lucide-react";
import { Button } from "ui/button";
import Link from "next/link";
import { useState } from "react";

export default function ArchivedPage() {
  const t = useTranslations("");

  const { data: threads, isLoading } = useSWR<
    (ChatThread & { lastMessageAt: number })[]
  >("/api/thread?archived=true", fetcher, {
    onError: handleErrorWithToast,
    fallbackData: [],
  });

  const handleUnarchive = async (threadId: string) => {
    try {
      await unarchiveThreadAction(threadId);
      toast.success(t("Archive.threadUnarchived"));
      mutate("/api/thread?archived=true");
      mutate("/api/thread");
    } catch {
      toast.error(t("Archive.failedToUnarchive"));
    }
  };

  const handleDelete = async (threadId: string) => {
    try {
      await deleteThreadAction(threadId);
      toast.success(t("Chat.Thread.threadDeleted"));
      mutate("/api/thread?archived=true");
    } catch {
      toast.error(t("Chat.Thread.failedToDeleteThread"));
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{t("Archive.archivedChats")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Archive.archivedChatsDescription")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !threads || threads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            {t("Archive.noArchivedChats")}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {threads.map((thread) => (
            <ArchivedThreadItem
              key={thread.id}
              thread={thread}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedThreadItem({
  thread,
  onUnarchive,
  onDelete,
  t,
}: {
  thread: ChatThread & { lastMessageAt: number };
  onUnarchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
}) {
  const [loading, setLoading] = useState<"unarchive" | "delete" | null>(null);

  const handleUnarchive = async () => {
    setLoading("unarchive");
    await onUnarchive(thread.id);
    setLoading(null);
  };

  const handleDelete = async () => {
    setLoading("delete");
    await onDelete(thread.id);
    setLoading(null);
  };

  return (
    <div className="flex items-center gap-2 group rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors">
      <Link
        href={`/chat/${thread.id}`}
        className="flex-1 min-w-0 truncate text-sm"
      >
        {thread.title || "New Chat"}
      </Link>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleUnarchive}
          disabled={loading !== null}
          title={t("Archive.unarchive")}
        >
          {loading === "unarchive" ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArchiveRestoreIcon className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={loading !== null}
          title={t("Chat.Thread.deleteChat")}
        >
          {loading === "delete" ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
