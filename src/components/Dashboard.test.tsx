// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useTimerStore } from "@/stores/timer-store";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();
vi.mock("@/hooks/use-habits", () => ({
  useHabits: (initial: unknown) => ({ data: initial }),
  useAddHabit: () => ({ mutateAsync: mockMutateAsync }),
  useDeleteHabit: () => ({ mutate: mockMutate }),
  useStartTimer: () => ({ mutate: mockMutate }),
  useStopTimer: () => ({ mutate: mockMutate }),
}));

vi.mock("@/hooks/use-feature-flags", () => ({
  useFeatureFlags: () => ({ data: { logSession: true } }),
}));

import { Dashboard } from "./Dashboard";
import type { Habit } from "@/lib/types";

function makeHabit(
  overrides: Partial<Habit> & { id: number; name: string },
): Habit {
  return {
    todaySeconds: 0,
    totalSeconds: 0,
    streak: 0,
    activeTimer: null,
    ...overrides,
  };
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTimerStore.setState({
      activeTimer: null,
      view: { type: "habits_list" },
    });
  });

  it("renders habits in the order they are passed (newest first)", () => {
    const habits = [
      makeHabit({ id: 3, name: "Piano" }),
      makeHabit({ id: 2, name: "Guitar" }),
      makeHabit({ id: 1, name: "Drawing" }),
    ];

    render(<Dashboard initialHabits={habits} />);

    const cards = screen.getAllByText(/Piano|Guitar|Drawing/);
    expect(cards[0]).toHaveTextContent("Piano");
    expect(cards[1]).toHaveTextContent("Guitar");
    expect(cards[2]).toHaveTextContent("Drawing");
  });

  it("renders empty state when no habits exist", () => {
    render(<Dashboard initialHabits={[]} />);

    expect(
      screen.getByText("Start by adding your first habit"),
    ).toBeInTheDocument();
  });

  it("shows timer config when view is timer_config", () => {
    useTimerStore.setState({
      view: { type: "timer_config", habitId: 1, habitName: "Guitar" },
    });
    const habits = [makeHabit({ id: 1, name: "Guitar" })];
    render(<Dashboard initialHabits={habits} />);
    expect(screen.getByText("Guitar")).toBeInTheDocument();
    expect(screen.getByText("Choose timer mode")).toBeInTheDocument();
  });

  it("opens timer config when Start is clicked on a habit", async () => {
    const user = userEvent.setup();
    const habits = [makeHabit({ id: 1, name: "Guitar" })];
    render(<Dashboard initialHabits={habits} />);

    await user.click(screen.getByText("Start"));
    expect(useTimerStore.getState().view.type).toBe("timer_config");
  });

  it("shows inline timer on habit card when timer is active", () => {
    const habits = [
      makeHabit({
        id: 1,
        name: "Guitar",
        activeTimer: {
          startTime: new Date().toISOString(),
          targetDurationSeconds: null,
        },
      }),
    ];
    useTimerStore.setState({
      activeTimer: {
        habitId: 1,
        habitName: "Guitar",
        startTime: new Date().toISOString(),
        targetDurationSeconds: null,
      },
      view: { type: "habits_list" },
    });

    render(<Dashboard initialHabits={habits} />);

    expect(screen.getByText("Recording...")).toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
  });

  it("shows store displayTime in active timer card", () => {
    const startTime = new Date().toISOString();
    const habits = [
      makeHabit({
        id: 1,
        name: "Guitar",
        activeTimer: { startTime, targetDurationSeconds: null },
      }),
    ];
    useTimerStore.setState({
      activeTimer: {
        habitId: 1,
        habitName: "Guitar",
        startTime,
        targetDurationSeconds: null,
      },
      view: { type: "habits_list" },
      displayTime: "00:12:34",
      isTimesUp: false,
    });

    render(<Dashboard initialHabits={habits} />);

    expect(screen.getByText("00:12:34")).toBeInTheDocument();
  });

  it("shows Time's up! in active timer card when isTimesUp is true", () => {
    const startTime = new Date().toISOString();
    const habits = [
      makeHabit({
        id: 1,
        name: "Guitar",
        activeTimer: { startTime, targetDurationSeconds: 600 },
      }),
    ];
    useTimerStore.setState({
      activeTimer: {
        habitId: 1,
        habitName: "Guitar",
        startTime,
        targetDurationSeconds: 600,
      },
      view: { type: "habits_list" },
      displayTime: "00:00:00",
      isTimesUp: true,
    });

    render(<Dashboard initialHabits={habits} />);

    expect(screen.getByText("Time's up!")).toBeInTheDocument();
    expect(screen.queryByText("Counting down...")).not.toBeInTheDocument();
  });

  it("navigates to timer view when active timer card is clicked", async () => {
    const user = userEvent.setup();
    const startTime = new Date().toISOString();
    const habits = [
      makeHabit({
        id: 1,
        name: "Guitar",
        activeTimer: { startTime, targetDurationSeconds: null },
      }),
    ];
    useTimerStore.setState({
      activeTimer: {
        habitId: 1,
        habitName: "Guitar",
        startTime,
        targetDurationSeconds: null,
      },
      view: { type: "habits_list" },
    });

    render(<Dashboard initialHabits={habits} />);

    await user.click(screen.getByText("Guitar"));
    expect(useTimerStore.getState().view.type).toBe("active_timer");
  });

  it("shows switch confirmation with elapsed time when starting different habit", async () => {
    const user = userEvent.setup();
    const startTime = new Date(Date.now() - 60000).toISOString();
    const habits = [
      makeHabit({
        id: 1,
        name: "Guitar",
        activeTimer: { startTime, targetDurationSeconds: null },
      }),
      makeHabit({ id: 2, name: "Piano" }),
    ];
    useTimerStore.setState({
      activeTimer: {
        habitId: 1,
        habitName: "Guitar",
        startTime,
        targetDurationSeconds: null,
      },
      view: { type: "habits_list" },
    });

    render(<Dashboard initialHabits={habits} />);

    await user.click(screen.getByText("Start"));
    expect(
      screen.getByText(/Switching will save this session/),
    ).toBeInTheDocument();
  });
});
