"use client";

import { continueSharedChatAction } from "@/app/api/chat/actions";
import { MessageSquarePlus, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "ui/button";
import { useTranslations } from "next-intl";

export function ContinueConversationButton({ shareId }: { shareId: string }) {
  const router = useRouter();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const threadId = await continueSharedChatAction(shareId);
      router.push(`/chat/${threadId}`);
    } catch {
      router.push("/sign-in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      className="rounded-full shadow-lg border bg-background/80 backdrop-blur-sm"
      onClick={handleContinue}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader className="size-4 animate-spin" />
      ) : (
        <MessageSquarePlus className="size-4" />
      )}
      {t("Share.continueConversation")}
    </Button>
  );
}
