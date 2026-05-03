'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSaveRoutineSession } from '@/hooks/use-active-routine';
import { useHaptics } from '@/hooks/use-haptics';
import { formatTime } from '@/lib/format';
import type { RoutineSessionSummary as Summary } from '@/lib/types';

function playFanfare() {
  try {
    new Audio('/fanfare.mp3').play().catch(() => {});
  } catch {}
}

type Props = {
  summary: Summary;
  onDiscard: () => void;
  onSaved: () => void;
};

export function RoutineSessionSummary({ summary, onDiscard, onSaved }: Props) {
  const save = useSaveRoutineSession();
  const { trigger } = useHaptics();

  useEffect(() => {
    trigger('light');
  }, [trigger]);

  async function handleSave() {
    try {
      await save.mutateAsync();
      trigger('buzz');
      playFanfare();
      toast.success('Routine saved');
      onSaved();
    } catch {
      toast.error('Could not save routine');
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center text-center px-6 space-y-4 py-8">
      <h2 className="text-2xl font-bold">{summary.routineNameSnapshot}</h2>
      <p className="text-4xl font-mono">{formatTime(summary.totalElapsedSeconds)}</p>
      <p className="text-sm text-muted-foreground">
        {summary.completedSetCount} {summary.completedSetCount === 1 ? 'set' : 'sets'} ·
        {' '}{formatTime(summary.totalActiveSeconds)} active
      </p>

      <div className="w-full max-w-sm space-y-1">
        {summary.byHabit.map((h) => (
          <div key={h.habitName} className="flex justify-between text-sm">
            <span>{h.habitName}</span>
            <span className="font-mono text-muted-foreground">
              {h.sets} {h.sets === 1 ? 'set' : 'sets'} · {formatTime(h.totalSeconds)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 w-full max-w-sm pt-4">
        <Button variant="outline" className="flex-1" onClick={onDiscard}>Discard</Button>
        <Button className="flex-1" onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
