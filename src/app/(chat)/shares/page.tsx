"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";
import { ChatShareSummary } from "app-types/chat-share";
import { toast } from "sonner";
import { Copy, Trash, Trash2, Loader, Share2 } from "lucide-react";
import { Button } from "ui/button";
import { useState } from "react";
import { formatDate } from "date-fns";
import { notify } from "lib/notify";

export default function SharesPage() {
  const t = useTranslations("");

  const {
    data: shares,
    isLoading,
    mutate: refetchShares,
  } = useSWR<ChatShareSummary[]>("/api/share", fetcher, {
    onError: handleErrorWithToast,
    fallbackData: [],
  });

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAll = async () => {
    const answer = await notify.confirm({
      description: t("Share.confirmDeleteAll"),
    });
    if (!answer) return;

    try {
      setIsDeletingAll(true);
      const response = await fetch("/api/share", { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.success(t("Share.allDeleted"));
      refetchShares();
    } catch {
      toast.error(t("Share.failedToDeleteShare"));
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{t("Share.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Share.description")}
        </p>
      </div>

      {shares && shares.length > 0 && (
        <div className="mb-6 flex justify-center">
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            disabled={isDeletingAll}
          >
            {isDeletingAll ? (
              <Loader className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t("Share.deleteAllLinks")}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !shares || shares.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Share2 className="size-10 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">{t("Share.noShares")}</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {t("Share.noSharesHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {shares.map((share) => (
            <ShareItem
              key={share.id}
              share={share}
              onDeleted={() => refetchShares()}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShareItem({
  share,
  onDeleted,
  t,
}: {
  share: ChatShareSummary;
  onDeleted: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [loading, setLoading] = useState<"delete" | null>(null);
  const link = `${window.location.origin}/share/${share.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    toast.success(t("Share.linkCopied"));
  };

  const handleDelete = async () => {
    const answer = await notify.confirm({
      description: t("Share.confirmDeleteShare"),
    });
    if (!answer) return;

    try {
      setLoading("delete");
      const response = await fetch(`/api/share/${share.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      toast.success(t("Share.shareDeleted"));
      onDeleted();
    } catch {
      toast.error(t("Share.failedToDeleteShare"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="group border rounded-lg px-4 py-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{share.title}</h3>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate block mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            {link}
          </a>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(new Date(share.sharedAt), "yyyy-MM-dd HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            title={t("Share.copyLink")}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={loading !== null}
            title={t("Common.delete")}
          >
            {loading === "delete" ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
