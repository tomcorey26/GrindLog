// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useDeleteWithUndo } from './use-delete-with-undo';

vi.mock('sonner', () => {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  fn.success = vi.fn();
  fn.error = vi.fn();
  return { toast: fn };
});

const mockToast = vi.mocked(toast) as unknown as ReturnType<typeof vi.fn> & { success: ReturnType<typeof vi.fn> };

type ToastOptions = {
  action: { onClick: (...args: unknown[]) => void };
};

function getToastOptions(callIndex = 0): ToastOptions {
  return mockToast.mock.calls[callIndex][1] as ToastOptions;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDeleteWithUndo', () => {
  it('adds id to pendingIds immediately on scheduleDelete', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteWithUndo(onDelete));

    act(() => {
      result.current.scheduleDelete(42, 'Piano session');
    });

    expect(result.current.pendingIds.has(42)).toBe(true);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete after delay but keeps id in pendingIds to prevent re-animation', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteWithUndo(onDelete));

    act(() => {
      result.current.scheduleDelete(42, 'Piano session');
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDelete).toHaveBeenCalledWith(42);
    expect(result.current.pendingIds.has(42)).toBe(true);
  });

  it('does not call onDelete if undo is clicked before timeout', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteWithUndo(onDelete));

    act(() => {
      result.current.scheduleDelete(42, 'Piano session');
    });

    act(() => {
      getToastOptions().action.onClick();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDelete).not.toHaveBeenCalled();
    expect(result.current.pendingIds.has(42)).toBe(false);
  });

  it('shows toast with session label and undo action', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteWithUndo(onDelete));

    act(() => {
      result.current.scheduleDelete(42, 'Piano session');
    });

    expect(mockToast).toHaveBeenCalledWith(
      'Piano session deleted',
      expect.objectContaining({
        action: expect.objectContaining({
          label: 'Undo',
          onClick: expect.any(Function),
        }),
      }),
    );
  });

  it('handles multiple pending deletes independently', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteWithUndo(onDelete));

    act(() => {
      result.current.scheduleDelete(1, 'Session 1');
      result.current.scheduleDelete(2, 'Session 2');
    });

    expect(result.current.pendingIds.has(1)).toBe(true);
    expect(result.current.pendingIds.has(2)).toBe(true);

    // undo only session 1
    act(() => {
      getToastOptions(0).action.onClick();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDelete).toHaveBeenCalledWith(2);
    expect(onDelete).not.toHaveBeenCalledWith(1);
    expect(result.current.pendingIds.has(1)).toBe(false);
    expect(result.current.pendingIds.has(2)).toBe(true);
  });

  it('removes id from pendingIds and shows error toast when onDelete rejects', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useDeleteWithUndo(onDelete));

    act(() => {
      result.current.scheduleDelete(42, 'Piano session');
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDelete).toHaveBeenCalledWith(42);
    expect(result.current.pendingIds.has(42)).toBe(false);
    expect(
      (toast as unknown as ReturnType<typeof vi.fn> & { error: ReturnType<typeof vi.fn> }).error,
    ).toHaveBeenCalledWith('Failed to delete Piano session');
  });

  it('cleans up timers on unmount', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useDeleteWithUndo(onDelete));

    act(() => {
      result.current.scheduleDelete(42, 'Piano session');
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDelete).not.toHaveBeenCalled();
  });
});
