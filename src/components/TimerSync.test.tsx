// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTimerStore } from "@/stores/timer-store";
import type { ReactNode } from "react";

// Mock dependencies
vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/habits"),
}));

import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { TimerSync } from "./TimerSync";

const mockedApi = vi.mocked(api);
const mockedPathname = vi.mocked(usePathname);

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  useTimerStore.setState({
    activeTimer: null,
    view: { type: "habits_list" },
    timerViewMounted: false,
  });
  vi.clearAllMocks();
  mockedPathname.mockReturnValue("/habits");

  // Stub Notification API for jsdom
  vi.stubGlobal("Notification", { permission: "denied" });
});

describe("TimerSync", () => {
  describe("hydration", () => {
    it("hydrates zustand when server has an active timer", async () => {
      mockedApi.mockResolvedValueOnce({
        habits: [
          {
            id: 1,
            name: "Guitar",
            todaySeconds: 0,
            totalSeconds: 0,
            streak: 0,
            activeTimer: {
              startTime: "2026-04-09T12:00:00.000Z",
              targetDurationSeconds: null,
            },
          },
        ],
        autoStopped: null,
      });

      renderHook(() => TimerSync(), { wrapper: createWrapper() });

      await waitFor(() => {
        const state = useTimerStore.getState();
        expect(state.activeTimer).toEqual({
          habitId: 1,
          habitName: "Guitar",
          startTime: "2026-04-09T12:00:00.000Z",
          targetDurationSeconds: null,
        });
      });
    });

    it("does not hydrate when no active timer in response", async () => {
      mockedApi.mockResolvedValueOnce({
        habits: [
          { id: 1, name: "Guitar", todaySeconds: 0, totalSeconds: 0, streak: 0, activeTimer: null },
        ],
        autoStopped: null,
      });

      renderHook(() => TimerSync(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockedApi).toHaveBeenCalled();
      });
      expect(useTimerStore.getState().activeTimer).toBeNull();
    });
  });

  describe("server auto-stop toast", () => {
    it("shows toast when autoStopped is present in response", async () => {
      mockedApi.mockResolvedValueOnce({
        habits: [
          { id: 1, name: "Guitar", todaySeconds: 0, totalSeconds: 0, streak: 0, activeTimer: null },
        ],
        autoStopped: { habitName: "Guitar", durationSeconds: 300 },
      });

      useTimerStore.setState({
        activeTimer: {
          habitId: 1,
          habitName: "Guitar",
          startTime: "2026-04-09T12:00:00.000Z",
          targetDurationSeconds: 300,
        },
      });

      renderHook(() => TimerSync(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("Guitar session was auto-recorded"),
        );
      });
      expect(useTimerStore.getState().activeTimer).toBeNull();
    });
  });

  describe("dismiss success on nav", () => {
    it("dismisses success view when navigating away from /habits", async () => {
      mockedApi.mockResolvedValueOnce({
        habits: [],
        autoStopped: null,
      });

      useTimerStore.setState({
        view: { type: "success", durationSeconds: 120 },
      });
      mockedPathname.mockReturnValue("/sessions");

      renderHook(() => TimerSync(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(useTimerStore.getState().view).toEqual({ type: "habits_list" });
      });
    });
  });
});
