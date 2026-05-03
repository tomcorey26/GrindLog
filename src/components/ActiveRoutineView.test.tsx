// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRoutineSessionStore } from '@/stores/routine-session-store';
import { ActiveRoutineView } from './ActiveRoutineView';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/hooks/use-haptics', () => ({
  useHaptics: () => ({ trigger: vi.fn() }),
}));

function renderWithQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ActiveRoutineView', () => {
  it('shows Discard and Finish buttons in active mode', () => {
    useRoutineSessionStore.getState().hydrate({
      id: 1, routineId: 1, routineNameSnapshot: 'Morning', status: 'active',
      startedAt: '', finishedAt: null, sets: [], activeTimer: null,
    });
    renderWithQuery(<ActiveRoutineView />);
    expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument();
  });
});
