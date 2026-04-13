import { requireAdminPermission } from "lib/auth/permissions";
import { chatRepository } from "lib/db/repository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  try {
    await requireAdminPermission("view user chat messages");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { threadId } = await params;
  const messages = await chatRepository.selectMessagesByThreadId(threadId);
  return NextResponse.json(messages);
}
