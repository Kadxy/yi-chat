import { selectThreadWithMessagesAction } from "@/app/api/chat/actions";
import ChatBot from "@/components/chat-bot";

import { ChatMessage, ChatThread } from "app-types/chat";
import { Metadata } from "next";
import { cache } from "react";
import { redirect, RedirectType } from "next/navigation";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Yi Chat";

const fetchThread = cache(
  async (
    threadId: string,
  ): Promise<(ChatThread & { messages: ChatMessage[] }) | null> => {
    return await selectThreadWithMessagesAction(threadId);
  },
);

export async function generateMetadata({
  params,
}: { params: Promise<{ thread: string }> }): Promise<Metadata> {
  const { thread: threadId } = await params;
  const thread = await fetchThread(threadId);
  return {
    title: thread?.title ? `${thread.title} - ${APP_NAME}` : APP_NAME,
    robots: { index: false, follow: false },
  };
}

export default async function Page({
  params,
}: { params: Promise<{ thread: string }> }) {
  const { thread: threadId } = await params;

  const thread = await fetchThread(threadId);

  if (!thread) redirect("/", RedirectType.replace);

  return (
    <ChatBot
      threadId={threadId}
      initialMessages={thread.messages}
      initialTitle={thread.title}
    />
  );
}
