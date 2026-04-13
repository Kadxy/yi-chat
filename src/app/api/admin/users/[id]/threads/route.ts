import { requireAdminPermission } from "lib/auth/permissions";
import { chatRepository } from "lib/db/repository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("view user chat threads");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";

  const threads = await chatRepository.selectThreadsByUserId(userId, {
    archived,
  });
  return NextResponse.json(threads);
}
