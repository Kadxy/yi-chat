import ShareError from "@/components/share/error";
import { chatShareRepository } from "lib/db/repository";
import ChatPreview from "@/components/share/chat-preview";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isExpired = await chatShareRepository.isExpired(id);
  if (isExpired) {
    return <ShareError message="This share has expired" />;
  }
  const thread = await chatShareRepository.selectByIdWithUser(id);
  if (!thread) {
    return <ShareError message="This share does not exist" />;
  }

  return <ChatPreview thread={thread} shareId={id} />;
}
