'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEffect, useState } from 'react';

type Habit = {
  id: number;
  name: string;
  todaySeconds: number;
  streak: number;
  activeTimer: { startTime: string } | null;
};

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatElapsed(startTimeIso: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startTimeIso).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function HabitCard({
  habit, onStart, onDelete,
}: {
  habit: Habit;
  onStart: (habitId: number) => void;
  onDelete: (habitId: number) => void;
}) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!habit.activeTimer) return;
    setElapsed(formatElapsed(habit.activeTimer.startTime));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(habit.activeTimer!.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [habit.activeTimer]);

  const isActive = !!habit.activeTimer;

  return (
    <Card className={`transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{habit.name}</h3>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-muted-foreground text-sm hover:text-destructive">Delete</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &quot;{habit.name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>This will delete the habit and all its time data. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(habit.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {isActive && <p className="text-2xl font-mono text-primary">{elapsed}</p>}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Today: {formatTime(habit.todaySeconds)}</span>
          <span>{habit.streak > 0 ? `${habit.streak} day streak` : 'No streak'}</span>
        </div>
        {!isActive && (
          <Button onClick={() => onStart(habit.id)} className="mt-1">Start</Button>
        )}
      </CardContent>
    </Card>
  );
}
