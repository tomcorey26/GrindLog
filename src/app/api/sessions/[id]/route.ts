import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { deleteSessionForUser } from "@/server/db/sessions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (isNaN(sessionId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const deleted = await deleteSessionForUser(sessionId, userId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
