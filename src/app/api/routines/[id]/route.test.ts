import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

const mockGetRoutineById = vi.fn();
const mockUpdateRoutineForUser = vi.fn();
const mockDeleteRoutineForUser = vi.fn();

vi.mock("@/server/db/routines", () => ({
  getRoutineById: (...args: any[]) => mockGetRoutineById(...args),
  updateRoutineForUser: (...args: any[]) => mockUpdateRoutineForUser(...args),
  deleteRoutineForUser: (...args: any[]) => mockDeleteRoutineForUser(...args),
}));

import { getSessionUserId } from "@/lib/auth";

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/routines/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/routines/1");
    const res = await GET(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when routine not found", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    mockGetRoutineById.mockResolvedValue(null);
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/routines/999");
    const res = await GET(req, makeParams("999"));
    expect(res.status).toBe(404);
  });

  it("returns routine when found", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    mockGetRoutineById.mockResolvedValue({ id: 1, name: "Morning", blocks: [] });
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/routines/1");
    const res = await GET(req, makeParams("1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.routine.name).toBe("Morning");
  });
});

describe("DELETE /api/routines/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/routines/1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when routine not found", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    mockDeleteRoutineForUser.mockResolvedValue(false);
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/routines/999", { method: "DELETE" });
    const res = await DELETE(req, makeParams("999"));
    expect(res.status).toBe(404);
  });

  it("deletes routine successfully", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    mockDeleteRoutineForUser.mockResolvedValue(true);
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/routines/1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("1"));
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/routines/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    const { PUT } = await import("./route");
    const req = new Request("http://localhost/api/routines/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated", blocks: [] }),
    });
    const res = await PUT(req, makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid data", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    const { PUT } = await import("./route");
    const req = new Request("http://localhost/api/routines/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", blocks: [] }),
    });
    const res = await PUT(req, makeParams("1"));
    expect(res.status).toBe(400);
  });

  it("updates routine successfully", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    const updated = { id: 1, name: "Updated", blocks: [], createdAt: "2026-04-10T00:00:00.000Z", updatedAt: "2026-04-10T00:00:00.000Z" };
    mockUpdateRoutineForUser.mockResolvedValue(updated);
    const { PUT } = await import("./route");
    const req = new Request("http://localhost/api/routines/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated",
        blocks: [{ habitId: 1, sortOrder: 0, notes: null, sets: [{ durationSeconds: 1500, breakSeconds: 300 }] }],
      }),
    });
    const res = await PUT(req, makeParams("1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.routine.name).toBe("Updated");
  });
});
