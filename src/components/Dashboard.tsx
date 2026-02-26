'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HabitCard } from '@/components/HabitCard';
import { AddHabitForm } from '@/components/AddHabitForm';
import { TimerView } from '@/components/TimerView';

type Habit = {
  id: number;
  name: string;
  todaySeconds: number;
  streak: number;
  activeTimer: { startTime: string } | null;
};

export function Dashboard({ user, onLogout }: { user: { id: number; email: string }; onLogout: () => void }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'timer'>('list');

  const fetchHabits = useCallback(async () => {
    const res = await fetch('/api/habits');
    if (res.ok) {
      const data = await res.json();
      setHabits(data.habits);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  // Auto-show timer view if there's an active timer on load
  useEffect(() => {
    const activeHabit = habits.find(h => h.activeTimer);
    if (activeHabit && activeView === 'list' && !loading) {
      // Don't auto-navigate, let user choose
    }
  }, [habits, activeView, loading]);

  async function handleStart(habitId: number) {
    await fetch('/api/timer/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId }),
    });
    await fetchHabits();
    setActiveView('timer');
  }

  async function handleStop() {
    await fetch('/api/timer/stop', { method: 'POST' });
    await fetchHabits();
    setActiveView('list');
  }

  async function handleDelete(habitId: number) {
    await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
    fetchHabits();
  }

  async function handleAdd(name: string) {
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    fetchHabits();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  }

  const activeHabit = habits.find(h => h.activeTimer);

  // Timer view
  if (activeView === 'timer' && activeHabit) {
    return (
      <TimerView
        habitName={activeHabit.name}
        habitId={activeHabit.id}
        startTime={activeHabit.activeTimer!.startTime}
        todaySeconds={activeHabit.todaySeconds}
        streak={activeHabit.streak}
        onStop={handleStop}
        onBack={() => setActiveView('list')}
      />
    );
  }

  // Dashboard list view
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 pb-[env(safe-area-inset-bottom)]">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">10,000 Hours</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Log out</Button>
        </header>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : habits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Start by adding your first habit</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {activeHabit && (
              <div onClick={() => setActiveView('timer')} className="cursor-pointer">
                <HabitCard key={activeHabit.id} habit={activeHabit} onStart={handleStart} onDelete={handleDelete} />
              </div>
            )}
            {habits.filter(h => !h.activeTimer).map((habit) => (
              <HabitCard key={habit.id} habit={habit} onStart={handleStart} onDelete={handleDelete} />
            ))}
          </div>
        )}

        <AddHabitForm onAdd={handleAdd} />
      </div>
    </div>
  );
}
