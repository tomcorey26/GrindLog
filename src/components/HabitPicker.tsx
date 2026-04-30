"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { HabitToolbar } from "@/components/HabitToolbar";
import { HabitList } from "@/components/HabitList";
import type { Habit } from "@/lib/types";

type HabitPickerProps = {
  habits: Habit[];
  onSelectHabit: (habit: { id: number; name: string }) => void;
  onClose: () => void;
  onCreateHabit: (name: string) => Promise<void>;
};

export function HabitPicker({
  habits,
  onSelectHabit,
  onClose,
  onCreateHabit,
}: HabitPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = habits.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Select Habit</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3">
        <HabitToolbar
          habits={habits}
          search={search}
          onSearchChange={setSearch}
          onCreateHabit={onCreateHabit}
        />
        <HabitList
          habits={filtered}
          onSelectHabit={onSelectHabit}
        />
      </div>
    </div>
  );
}
