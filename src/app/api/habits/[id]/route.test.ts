import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserId, deleteHabitForUser, habitIsInActiveRoutineSession } = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  deleteHabitForUser: vi.fn(),
  habitIsInActiveRoutineSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId,
}));

vi.mock("@/server/db/habits", () => ({
  deleteHabitForUser,
}));

vi.mock("@/server/db/routine-sessions", () => ({
  habitIsInActiveRoutineSession,
}));

import { DELETE } from "./route";

function makeRequest() {
  return new Request("http://localhost/api/habits/1", { method: "DELETE" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/habits/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionUserId.mockResolvedValue(null);

    const response = await DELETE(makeRequest(), makeParams("1"));

    expect(response.status).toBe(401);
    expect(habitIsInActiveRoutineSession).not.toHaveBeenCalled();
    expect(deleteHabitForUser).not.toHaveBeenCalled();
  });

  it("returns 400 when id is invalid", async () => {
    getSessionUserId.mockResolvedValue(42);

    const response = await DELETE(makeRequest(), makeParams("not-a-number"));

    expect(response.status).toBe(400);
    expect(habitIsInActiveRoutineSession).not.toHaveBeenCalled();
    expect(deleteHabitForUser).not.toHaveBeenCalled();
  });

  it("returns 409 when habit is in use by active routine session", async () => {
    getSessionUserId.mockResolvedValue(42);
    habitIsInActiveRoutineSession.mockResolvedValue(true);

    const response = await DELETE(makeRequest(), makeParams("7"));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("habit_in_use");
    expect(body.error).toBe("Habit is in use by your active routine");
    expect(deleteHabitForUser).not.toHaveBeenCalled();
  });

  it("returns 404 when habit is not found", async () => {
    getSessionUserId.mockResolvedValue(42);
    habitIsInActiveRoutineSession.mockResolvedValue(false);
    deleteHabitForUser.mockResolvedValue(null);

    const response = await DELETE(makeRequest(), makeParams("7"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
  });

  it("returns 200 when habit is deleted", async () => {
    getSessionUserId.mockResolvedValue(42);
    habitIsInActiveRoutineSession.mockResolvedValue(false);
    deleteHabitForUser.mockResolvedValue({ id: 7, userId: 42, name: "Coding" });

    const response = await DELETE(makeRequest(), makeParams("7"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteHabitForUser).toHaveBeenCalledWith(7, 42);
  });
});
