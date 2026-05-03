'use client';

import { Play, Square, Check, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import type { RoutineSessionSet } from '@/lib/types';

export type SetRowState =
  | 'upcoming-idle'
  | 'upcoming-disabled'
  | 'running'
  | 'break-running'
  | 'completed';

type Props = {
  set: RoutineSessionSet;
  setNumber: number;
  state: SetRowState;
  displayTime: string;
  onStart: () => void;
  onEnd: () => void;
  onSkipBreak: () => void;
  onPatch: (patch: { plannedDurationSeconds?: number; plannedBreakSeconds?: number; actualDurationSeconds?: number }) => void;
};

function fmtMins(s: number) {
  return `${Math.round(s / 60)} min`;
}

export function ActiveRoutineSetRow({ set, setNumber, state, displayTime, onStart, onEnd, onSkipBreak, onPatch }: Props) {
  const isActive = state === 'running' || state === 'break-running';
  const isUpcoming = state === 'upcoming-idle' || state === 'upcoming-disabled';
  const isCompleted = state === 'completed';
  const rowClasses = [
    'grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center py-1.5 px-1 rounded',
    isActive ? 'bg-primary/10 border-l-2 border-primary' : '',
    setNumber % 2 === 0 ? 'bg-muted/60' : '',
  ].join(' ');

  return (
    <div className={rowClasses}>
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-medium relative">
        {setNumber}
        {state === 'running' && (
          <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </span>

      {isUpcoming ? (
        <Stepper
          value={Math.round(set.plannedDurationSeconds / 60)}
          min={1}
          max={120}
          onChange={(mins) => onPatch({ plannedDurationSeconds: mins * 60 })}
          aria-label={`Set ${setNumber} duration in minutes`}
        />
      ) : isCompleted ? (
        <Stepper
          value={Math.round((set.actualDurationSeconds ?? 0) / 60)}
          min={0}
          max={120}
          onChange={(mins) => onPatch({ actualDurationSeconds: mins * 60 })}
          aria-label={`Set ${setNumber} duration in minutes`}
        />
      ) : (
        <span className="text-sm text-foreground font-mono">
          {state === 'running' ? displayTime : fmtMins(set.plannedDurationSeconds)}
        </span>
      )}

      {isUpcoming ? (
        <Stepper
          value={Math.round(set.plannedBreakSeconds / 60)}
          min={0}
          max={60}
          onChange={(mins) => onPatch({ plannedBreakSeconds: mins * 60 })}
          aria-label={`Set ${setNumber} break in minutes`}
        />
      ) : (
        <span className="text-xs text-muted-foreground italic">
          {state === 'break-running'
            ? `Break ${displayTime}`
            : set.plannedBreakSeconds > 0
              ? `${fmtMins(set.plannedBreakSeconds)} break`
              : 'No break'}
        </span>
      )}

      <div className="flex items-center justify-end">
        {state === 'upcoming-idle' && (
          <Button size="icon-sm" variant="default" onClick={onStart} aria-label="Start set">
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        {state === 'upcoming-disabled' && (
          <Button size="icon-sm" variant="default" disabled aria-label="Start set">
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        {state === 'running' && (
          <Button size="icon-sm" variant="destructive" onClick={onEnd} aria-label="End set">
            <Square className="h-3.5 w-3.5" />
          </Button>
        )}
        {state === 'break-running' && (
          <Button size="icon-sm" variant="ghost" onClick={onSkipBreak} aria-label="Skip break">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        )}
        {state === 'completed' && (
          <span aria-label="Set completed" className="text-primary">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
