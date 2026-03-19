import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserId, deleteSessionForUser } = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  deleteSessionForUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId,
}));

vi.mock("@/server/db/sessions", () => ({
  deleteSessionForUser,
}));

import { DELETE } from "./route";

function makeRequest() {
  return new Request("http://localhost/api/sessions/5", { method: "DELETE" });
}

describe("DELETE /api/sessions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    getSessionUserId.mockResolvedValue(null);

    const response = await DELETE(makeRequest(), {
      params: Promise.resolve({ id: "5" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
  });

  it("returns 400 for invalid session id", async () => {
    getSessionUserId.mockResolvedValue(42);

    const response = await DELETE(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid ID",
    });
  });

  it("returns 404 when session not found or not owned by user", async () => {
    getSessionUserId.mockResolvedValue(42);
    deleteSessionForUser.mockResolvedValue(null);

    const response = await DELETE(makeRequest(), {
      params: Promise.resolve({ id: "5" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Not found",
    });
    expect(deleteSessionForUser).toHaveBeenCalledWith(5, 42);
  });

  it("deletes session and returns ok", async () => {
    getSessionUserId.mockResolvedValue(42);
    deleteSessionForUser.mockResolvedValue({ id: 5 });

    const response = await DELETE(makeRequest(), {
      params: Promise.resolve({ id: "5" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteSessionForUser).toHaveBeenCalledWith(5, 42);
  });
});
