import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserId, getSessionsForUser } = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  getSessionsForUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId,
}));

vi.mock("@/server/db/sessions", () => ({
  getSessionsForUser,
  createManualSessionForUser: vi.fn(),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/sessions");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionsForUser.mockResolvedValue({ sessions: [], totalSeconds: 0 });
  });

  it("returns 401 when not authenticated", async () => {
    getSessionUserId.mockResolvedValue(null);

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
  });

  it("passes date and tzOffset to getSessionsForUser", async () => {
    getSessionUserId.mockResolvedValue(42);

    await GET(makeRequest({ date: "2026-03-19", tzOffset: "240" }));

    expect(getSessionsForUser).toHaveBeenCalledWith(42, {
      habitId: undefined,
      range: "all",
      date: "2026-03-19",
      tzOffset: 240,
    });
  });

  it("passes range and habitId without date", async () => {
    getSessionUserId.mockResolvedValue(42);

    await GET(makeRequest({ range: "week", habitId: "5" }));

    expect(getSessionsForUser).toHaveBeenCalledWith(42, {
      habitId: "5",
      range: "week",
      date: undefined,
      tzOffset: undefined,
    });
  });
});
