'use client';

import { Play, Square, Check, SkipForward, Coffee, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PressableButton } from '@/components/ui/pressable-button';
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
  progressPct?: number;
  onStart: () => void;
  onEnd: () => void;
  onSkipBreak: () => void;
  onPatch: (patch: { plannedDurationSeconds?: number; plannedBreakSeconds?: number; actualDurationSeconds?: number }) => void;
};

function fmtMins(s: number) {
  return `${Math.round(s / 60)} min`;
}

export function ActiveRoutineSetRow({ set, setNumber, state, displayTime, progressPct, onStart, onEnd, onSkipBreak, onPatch }: Props) {
  const isUpcoming = state === 'upcoming-idle' || state === 'upcoming-disabled';
  const isCompleted = state === 'completed';
  const isRunning = state === 'running';
  const isBreak = state === 'break-running';

  const rowClasses = [
    'relative grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center py-1.5 px-2 rounded transition-colors',
    isRunning ? 'bg-primary/15 border-l-4 border-primary ring-1 ring-primary/20' : '',
    isBreak ? 'bg-amber-500/20 border-l-4 border-amber-500 ring-2 ring-amber-500/40 shadow-sm' : '',
    isCompleted ? 'bg-emerald-500/10 border-l-4 border-emerald-500/70 opacity-90' : '',
    !isRunning && !isBreak && !isCompleted && setNumber % 2 === 0 ? 'bg-muted/60' : '',
  ].join(' ');

  const setNumberCircleClass = isCompleted
    ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-medium relative'
    : isBreak
      ? 'inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/30 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-medium relative'
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
      ) : isRunning ? (
        <span className="inline-flex items-center gap-1.5 text-base font-mono font-bold text-primary">
          <Timer className="h-4 w-4" />
          <span>{displayTime}</span>
        </span>
      ) : (
        <span className={`text-sm font-mono ${isBreak ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {fmtMins(set.plannedDurationSeconds)}
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
        <span className="inline-flex items-center gap-1.5 text-base font-mono font-bold text-amber-700 dark:text-amber-400">
          <Coffee className="h-4 w-4 animate-pulse" />
          <span>{displayTime}</span>
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
          <PressableButton size="icon-sm" variant="default" onClick={onStart} aria-label="Start set">
            <Play className="h-3.5 w-3.5" />
          </PressableButton>
        )}
        {state === 'upcoming-disabled' && (
          <Button size="icon-sm" variant="default" disabled aria-label="Start set">
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        {state === 'running' && (
          <PressableButton size="icon-sm" variant="destructive" onClick={onEnd} aria-label="End set">
            <Square className="h-3.5 w-3.5" />
          </PressableButton>
        )}
        {state === 'break-running' && (
          <PressableButton
            size="icon-sm"
            variant="default"
            onClick={onSkipBreak}
            aria-label="Skip break"
            className="bg-amber-500 hover:bg-amber-600 text-white shadow-[0_5px_0_0_color-mix(in_srgb,#f59e0b_70%,black)] active:shadow-none active:translate-y-1.25"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </PressableButton>
        )}
        {state === 'completed' && (
          <span aria-label="Set completed" className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500 text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}
      </div>

      {(isBreak || isRunning) && progressPct !== undefined && (
        <div
          className={`absolute left-0 right-0 bottom-0 h-1 rounded-b overflow-hidden ${
            isBreak ? 'bg-amber-500/20' : 'bg-primary/20'
          }`}
        >
          <div
            className={`h-full transition-[width] duration-1000 ease-linear ${
              isBreak ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${progressPct * 100}%` }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
