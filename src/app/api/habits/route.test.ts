import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

const mockGetHabitsForUser = vi.fn();
const mockGetHabitByNameForUser = vi.fn();
const mockCreateHabitForUser = vi.fn();

vi.mock("@/server/db/habits", () => ({
  getHabitsForUser: (...args: any[]) => mockGetHabitsForUser(...args),
  getHabitByNameForUser: (...args: any[]) => mockGetHabitByNameForUser(...args),
  createHabitForUser: (...args: any[]) => mockCreateHabitForUser(...args),
}));

import { getSessionUserId } from "@/lib/auth";

describe("POST /api/habits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects duplicate habit name with 409", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    mockGetHabitByNameForUser.mockResolvedValue({ id: 5, userId: 1, name: "Coding" });
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Coding" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(mockCreateHabitForUser).not.toHaveBeenCalled();
  });

  it("rejects case-insensitive duplicate", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    // Simulate case-insensitive match returned by DB query
    mockGetHabitByNameForUser.mockResolvedValue({ id: 5, userId: 1, name: "Coding" });
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "CODING" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("creates habit when name is unique", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(1);
    mockGetHabitByNameForUser.mockResolvedValue(undefined);
    mockCreateHabitForUser.mockResolvedValue({ id: 10, userId: 1, name: "New Habit" });
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Habit" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockCreateHabitForUser).toHaveBeenCalledWith(1, "New Habit");
  });
});
