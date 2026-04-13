import { NextResponse } from "next/server";
import { requireAdminPermission } from "lib/auth/permissions";
import { redemptionRepository } from "lib/db/repository";

export async function GET(request: Request) {
  try {
    await requireAdminPermission("view redemption codes");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const codes = await redemptionRepository.listCodes(limit, offset);
  return NextResponse.json(codes);
}
