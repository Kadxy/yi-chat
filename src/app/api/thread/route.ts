import { getSession } from "auth/server";
import { chatRepository } from "lib/db/repository";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";

  const threads = await chatRepository.selectThreadsByUserId(session.user.id, {
    archived,
  });
  return Response.json(threads);
}
