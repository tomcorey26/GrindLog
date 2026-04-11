import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteHistoryEntry } from "@/server/db/history";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entryId = parseInt(id, 10);
  if (isNaN(entryId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const deleted = await deleteHistoryEntry(entryId, userId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
