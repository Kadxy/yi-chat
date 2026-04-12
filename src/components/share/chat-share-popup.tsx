import { shareChatAction } from "@/app/api/chat/actions";
import { Check, LinkIcon, Loader } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { useTranslations } from "next-intl";

type Props = {
  threadId: string;
  onShare?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export function ChatSharePopup(props: Props) {
  const t = useTranslations();
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);

  const open = props.open ?? internalOpen;
  const onOpenChange = props.onOpenChange ?? setInternalOpen;

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setShareLink(null);
    }
  };

  const handleShare = useCallback(() => {
    setIsSharing(true);
    safe(() =>
      shareChatAction({
        threadId: props.threadId,
      }),
    )
      .watch(() => setIsSharing(false))
      .ifOk((shareId) => {
        const link = `${window.location.origin}/share/${shareId}`;
        navigator.clipboard.writeText(link);
        setShareLink(link);
        props.onShare?.();
      })
      .ifFail((error) => {
        toast.error(error.message || "Failed to share chat");
      })
      .unwrap();
  }, [props.threadId, props.onShare]);

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success(t("Chat.Thread.linkCopied"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("Chat.Thread.sharePublicLink")}</DialogTitle>
          <DialogDescription>
            {t("Chat.Thread.sharePublicLinkDescription")}
          </DialogDescription>
        </DialogHeader>

        {shareLink ? (
          <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 min-w-0">
            <span className="flex-1 min-w-0 truncate text-sm select-all">
              {shareLink}
            </span>
            <Button
              className="rounded-full shrink-0"
              size="sm"
              onClick={handleCopy}
            >
              <Check className="size-3.5" />
              {t("Chat.Thread.linkCopied")}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <Button onClick={handleShare} disabled={isSharing}>
              {isSharing ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <LinkIcon className="size-4" />
              )}
              {isSharing
                ? t("Chat.Thread.creatingLink")
                : t("Chat.Thread.createLink")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
