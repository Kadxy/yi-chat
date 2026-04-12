import { getSession } from "auth/server";
import { chatShareRepository } from "lib/db/repository";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shares = await chatShareRepository.selectSummaryBySharerId(
      session.user.id,
    );
    return NextResponse.json(shares);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get shares" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await chatShareRepository.deleteAllBySharerId(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete shares" },
      { status: 500 },
    );
  }
}
