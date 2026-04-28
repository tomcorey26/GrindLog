"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import type { Habit } from "@/lib/types";

type HabitListProps = {
  habits: Habit[];
  onCreateHabit: (name: string) => Promise<void>;
  renderAction?: (habit: Habit) => React.ReactNode;
  onSelectHabit?: (habit: { id: number; name: string }) => void;
};

export function HabitList({
  habits,
  onCreateHabit,
  renderAction,
  onSelectHabit,
}: HabitListProps) {
  const [search, setSearch] = useState("");
  const [newHabitName, setNewHabitName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const sorted = [...habits].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = sorted.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const isDuplicate = habits.some(
    (h) => h.name.toLowerCase() === newHabitName.trim().toLowerCase()
  );

  async function handleCreateHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newHabitName.trim() || isDuplicate) return;
    setError("");
    setCreating(true);
    try {
      await onCreateHabit(newHabitName.trim());
      setNewHabitName("");
    } catch {
      setError("Failed to create habit");
    }
    setCreating(false);
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search habits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <form onSubmit={handleCreateHabit} className="mb-3 flex gap-2">
        <Input
          placeholder="Create new habit..."
          value={newHabitName}
          onChange={(e) => {
            setNewHabitName(e.target.value);
            setError("");
          }}
          className="h-8 text-sm flex-1"
          maxLength={30}
        />
        <Button
          type="submit"
          size="sm"
          disabled={creating || !newHabitName.trim() || isDuplicate}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>

      {isDuplicate && newHabitName.trim() && (
        <p className="text-xs text-destructive mb-2">
          A habit with this name already exists
        </p>
      )}
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            {habits.length === 0
              ? "No habits yet. Create one above."
              : "No habits match your search."}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((habit) => (
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
    </div>
  );
}
