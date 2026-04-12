import { ChatShareByThreadIdSchema } from "app-types/chat-share";
import { getSession } from "auth/auth-instance";
import { chatShareRepository, chatRepository } from "lib/db/repository";

export async function POST(req: Request) {
  const { threadId, expiresAt } = await ChatShareByThreadIdSchema.parse(
    await req.json(),
  );
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const isAccess = await chatRepository.checkAccess(threadId, session.user.id);
  if (!isAccess) {
    return new Response("Unauthorized", { status: 401 });
  }

  await chatShareRepository.shareChat({
    threadId,
    sharerId: session.user.id,
    expiresAt: expiresAt ?? undefined,
  });

  return Response.json({
    message: "Chat shared successfully",
  });
}
