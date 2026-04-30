import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { parseId } from "@/lib/utils";
import {
  getRoutineById,
  getRoutineByNameForUser,
  updateRoutineForUser,
  deleteRoutineForUser,
} from "@/server/db/routines";

const setSchema = z.object({
  durationSeconds: z.number().min(60).max(7200),
  breakSeconds: z.number().min(0).max(3600),
});

const blockSchema = z.object({
  habitId: z.number(),
  sortOrder: z.number(),
  notes: z.string().max(500).nullable().optional().transform((v) => v ?? null),
  sets: z.array(setSchema).min(1).max(10),
});

const updateRoutineSchema = z.object({
  name: z.string().trim().min(1).max(100),
  blocks: z.array(blockSchema).min(1).max(20),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const routineId = parseId(id);
  if (!routineId)
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const routine = await getRoutineById(routineId, userId);
  if (!routine)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ routine });
}

export async function PUT(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateRoutineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid routine data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const routineId = parseId(id);
  if (!routineId)
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const existing = await getRoutineByNameForUser(userId, parsed.data.name);
  if (existing && existing.id !== routineId) {
    return NextResponse.json(
      { error: "A routine with this name already exists" },
      { status: 409 },
    );
  }

  const routine = await updateRoutineForUser(routineId, userId, parsed.data);
  if (!routine)
    return NextResponse.json({ error: "Not found or invalid habit references" }, { status: 404 });

  return NextResponse.json({ routine });
}

export async function DELETE(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const routineId = parseId(id);
  if (!routineId)
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const deleted = await deleteRoutineForUser(routineId, userId);
  if (!deleted)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
