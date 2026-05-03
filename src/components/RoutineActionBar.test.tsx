// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRoutineSessionStore } from '@/stores/routine-session-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/use-haptics', () => ({
  useHaptics: () => ({ trigger: vi.fn() }),
}));

import { RoutineActionBar } from './RoutineActionBar';

describe('RoutineActionBar', () => {
  it('renders nothing when inactive', () => {
    useRoutineSessionStore.getState().reset();
    const { container } = render(<RoutineActionBar />);
    expect(container.firstChild).toBeNull();
  });

  it('shows habit name + set X of Y when running', () => {
    useRoutineSessionStore.getState().hydrate({
      id: 1, routineId: 1, routineNameSnapshot: 'M', status: 'active',
      startedAt: '', finishedAt: null,
      sets: [
        { id: 1, sessionId: 1, blockIndex: 0, setIndex: 0, habitId: 1, habitNameSnapshot: 'Guitar', notesSnapshot: null, plannedDurationSeconds: 60, plannedBreakSeconds: 30, actualDurationSeconds: null, startedAt: '2026-05-02T00:00:00Z', completedAt: null },
        { id: 2, sessionId: 1, blockIndex: 0, setIndex: 1, habitId: 1, habitNameSnapshot: 'Guitar', notesSnapshot: null, plannedDurationSeconds: 60, plannedBreakSeconds: 0, actualDurationSeconds: null, startedAt: null, completedAt: null },
      ],
      activeTimer: { routineSessionSetId: 1, phase: 'set', startTime: '2026-05-02T00:00:00Z', targetDurationSeconds: 60 },
    });
    render(<RoutineActionBar />);
    expect(screen.getByText(/Guitar/)).toBeInTheDocument();
    expect(screen.getByText(/Set 1 of 2/i)).toBeInTheDocument();
  });
});
