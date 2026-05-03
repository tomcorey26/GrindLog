'use client';

import { Play, Square, Check, SkipForward, Coffee } from 'lucide-react';
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
  const isUpcoming = state === 'upcoming-idle' || state === 'upcoming-disabled';
  const isCompleted = state === 'completed';
  const isRunning = state === 'running';
  const isBreak = state === 'break-running';

  const rowClasses = [
    'grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center py-1.5 px-2 rounded transition-colors',
    isRunning ? 'bg-primary/15 border-l-4 border-primary ring-1 ring-primary/20' : '',
    isBreak ? 'bg-amber-500/15 border-l-4 border-amber-500 ring-1 ring-amber-500/30' : '',
    isCompleted ? 'bg-emerald-500/10 border-l-4 border-emerald-500/70 opacity-90' : '',
    !isRunning && !isBreak && !isCompleted && setNumber % 2 === 0 ? 'bg-muted/60' : '',
  ].join(' ');

  const setNumberCircleClass = isCompleted
    ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-medium relative'
    : isBreak
      ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-mono font-medium relative'
      : 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-medium relative';

  return (
    <div className={rowClasses} aria-current={isRunning || isBreak ? 'step' : undefined}>
      <span className={setNumberCircleClass}>
        {setNumber}
        {isRunning && (
          <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
        {isBreak && (
          <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
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
        <span className={`text-sm font-mono ${isRunning ? 'text-primary font-semibold' : 'text-foreground'}`}>
          {isRunning ? displayTime : fmtMins(set.plannedDurationSeconds)}
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
      ) : isBreak ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-amber-700 dark:text-amber-400">
          <Coffee className="h-3.5 w-3.5 animate-pulse" />
          <span>Break {displayTime}</span>
        </span>
      ) : (
        <span className="text-xs text-muted-foreground italic">
          {set.plannedBreakSeconds > 0
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
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onSkipBreak}
            aria-label="Skip break"
            className="text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        )}
        {state === 'completed' && (
          <span aria-label="Set completed" className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500 text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}
      </div>
    </div>
  );
}
