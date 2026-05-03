'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRoutineSessionStore } from '@/stores/routine-session-store';
import {
  useDiscardRoutineSession, useFinishRoutineSession, useStartSet,
  useCompleteSet, usePatchSet, useSkipBreak,
} from '@/hooks/use-active-routine';
import { RoutineBlockCard } from '@/components/RoutineBlockCard';
import { DiscardRoutineDialog } from '@/components/DiscardRoutineDialog';
import { NoSetsCompletedDialog } from '@/components/NoSetsCompletedDialog';
import { RoutineSessionSummary } from '@/components/RoutineSessionSummary';
import { useHaptics } from '@/hooks/use-haptics';
import { ApiError } from '@/lib/api';
import type { RoutineSessionSet } from '@/lib/types';

export function ActiveRoutineView() {
  const router = useRouter();
  const { trigger } = useHaptics();
  const session = useRoutineSessionStore((s) => s.session);
  const summary = useRoutineSessionStore((s) => s.summary);
  const setSummary = useRoutineSessionStore((s) => s.setSummary);
  const reset = useRoutineSessionStore((s) => s.reset);
  const displayTime = useRoutineSessionStore((s) => s.displayTime);

  const discard = useDiscardRoutineSession();
  const finish = useFinishRoutineSession();
  const startSet = useStartSet();
  const completeSet = useCompleteSet();
  const patchSet = usePatchSet();
  const skipBreak = useSkipBreak();

  const [discardOpen, setDiscardOpen] = useState(false);
  const [noCompletedOpen, setNoCompletedOpen] = useState(false);

  if (summary) {
    return (
      <RoutineSessionSummary
        summary={summary}
        onDiscard={() => setDiscardOpen(true)}
        onSaved={() => {
          setSummary(null);
          reset();
          router.push('/routines');
        }}
      />
    );
  }

  if (!session) return null;

  const blocks = groupSetsByBlock(session.sets);
  const activeTimer = session.activeTimer;

  function rowState(set: RoutineSessionSet) {
    if (set.completedAt) return 'completed' as const;
    if (activeTimer?.routineSessionSetId === set.id) {
      return activeTimer.phase === 'break' ? ('break-running' as const) : ('running' as const);
    }
    return activeTimer ? ('upcoming-disabled' as const) : ('upcoming-idle' as const);
  }

  async function handleFinish() {
    try {
      const data = await finish.mutateAsync();
      setSummary(data.summary);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setNoCompletedOpen(true);
      else toast.error('Could not finish routine');
    }
  }

  async function handleDiscard() {
    trigger('error');
    setDiscardOpen(false);
    setNoCompletedOpen(false);
    await discard.mutateAsync();
    setSummary(null);
    reset();
    router.push('/routines');
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="sticky -top-0.5 md:-top-6 z-10 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 md:-mx-6 px-4 md:px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{session.routineNameSnapshot}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDiscardOpen(true)}>Discard</Button>
          <Button size="sm" onClick={handleFinish}>Finish</Button>
        </div>
      </div>

      <div className="flex-1 py-4 space-y-3">
        {blocks.map((block, i) => (
          <RoutineBlockCard
            key={i}
            mode="active"
            habitName={block.sets[0].habitNameSnapshot}
            notes={block.sets[0].notesSnapshot}
            rows={block.sets.map((set) => ({
              set,
              state: rowState(set),
              displayTime,
              onStart: () => startSet.mutate(set.id),
              onEnd: () => completeSet.mutate({ setRowId: set.id }),
              onSkipBreak: () => skipBreak.mutate(),
              onPatch: (patch) => patchSet.mutate({ setRowId: set.id, patch }),
            }))}
          />
        ))}
      </div>

      <DiscardRoutineDialog open={discardOpen} onOpenChange={setDiscardOpen} onConfirm={handleDiscard} />
      <NoSetsCompletedDialog open={noCompletedOpen} onOpenChange={setNoCompletedOpen} onDiscard={handleDiscard} />
    </div>
  );
}

function groupSetsByBlock(sets: RoutineSessionSet[]) {
  const map = new Map<number, RoutineSessionSet[]>();
  for (const s of sets) {
    const list = map.get(s.blockIndex) ?? [];
    list.push(s);
    map.set(s.blockIndex, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([_, set]) => ({ sets: set.sort((x, y) => x.setIndex - y.setIndex) }));
}
