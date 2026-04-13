import ShareError from "@/components/share/error";
import { chatShareRepository } from "lib/db/repository";
import ChatPreview from "@/components/share/chat-preview";
import type { Metadata } from "next";
import { cache } from "react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Yi Chat";

const fetchShare = cache(async (id: string) => {
  const isExpired = await chatShareRepository.isExpired(id);
  if (isExpired) return null;
  return chatShareRepository.selectByIdWithUser(id);
});

function getShareDescription(
  thread: Awaited<ReturnType<typeof fetchShare>>,
): string {
  if (!thread?.messages?.length) return `Shared conversation on ${APP_NAME}`;
  const firstAssistant = thread.messages.find((m) => m.role === "assistant");
  if (!firstAssistant?.parts) return `Shared conversation on ${APP_NAME}`;
  const text = firstAssistant.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");
  return text.slice(0, 160) || `Shared conversation on ${APP_NAME}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const thread = await fetchShare(id);

  if (!thread) {
    return { title: APP_NAME };
  }

  const description = getShareDescription(thread);

  return {
    title: thread.title,
    description,
    alternates: {
      canonical: `/share/${id}`,
    },
    openGraph: {
      title: `${thread.title} - ${APP_NAME}`,
      description,
      type: "article",
      publishedTime: thread.sharedAt.toISOString(),
    },
    twitter: {
      card: "summary",
      title: `${thread.title} - ${APP_NAME}`,
      description,
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await fetchShare(id);

  if (!thread) {
    const isExpired = await chatShareRepository.isExpired(id);
    if (isExpired) {
      return <ShareError message="This share has expired" />;
    }
    return <ShareError message="This share does not exist" />;
  }

  return <ChatPreview thread={thread} shareId={id} />;
}
