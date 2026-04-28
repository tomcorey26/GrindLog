"use client";

import type { Habit } from "@/lib/types";

type HabitListProps = {
  habits: Habit[];
  renderAction?: (habit: Habit) => React.ReactNode;
  onSelectHabit?: (habit: { id: number; name: string }) => void;
};

export function HabitList({
  habits,
  renderAction,
  onSelectHabit,
}: HabitListProps) {
  const sorted = [...habits].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex-1 overflow-auto">
      {sorted.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">
          No habits match your search.
        </p>
      ) : (
        <div className="space-y-0.5">
          {sorted.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <button
                type="button"
                onClick={() =>
                  onSelectHabit?.({ id: habit.id, name: habit.name })
                }
                className={`text-left flex-1 ${onSelectHabit ? "cursor-pointer" : "cursor-default"}`}
              >
                {habit.name}
              </button>
              {renderAction?.(habit)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
