import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(),
  setSessionCookie: vi.fn(),
}));

const mockCreateUser = vi.fn();
const mockGetUserByEmail = vi.fn();
const mockSeedDefaultHabits = vi.fn();

vi.mock("@/server/db/users", () => ({
  createUser: (...args: any[]) => mockCreateUser(...args),
  getUserByEmail: (...args: any[]) => mockGetUserByEmail(...args),
}));

vi.mock("@/server/db/habits", () => ({
  seedDefaultHabits: (...args: any[]) => mockSeedDefaultHabits(...args),
}));

import { hashPassword, setSessionCookie } from "@/lib/auth";

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hashPassword).mockResolvedValue("hashed");
    vi.mocked(setSessionCookie).mockResolvedValue(undefined);
  });

  it("seeds default habits after creating user", async () => {
    mockGetUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue({ id: 42, email: "new@test.com" });
    mockSeedDefaultHabits.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", password: "password123" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
    expect(mockSeedDefaultHabits).toHaveBeenCalledTimes(1);
    expect(mockSeedDefaultHabits).toHaveBeenCalledWith(42);
  });

  it("does not seed habits if user already exists", async () => {
    mockGetUserByEmail.mockResolvedValue({ id: 1, email: "existing@test.com" });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "existing@test.com", password: "password123" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockSeedDefaultHabits).not.toHaveBeenCalled();
  });
});
