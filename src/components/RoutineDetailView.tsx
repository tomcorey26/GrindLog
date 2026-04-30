"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoutineBlockCard } from "@/components/RoutineBlockCard";
import { useRoutine } from "@/hooks/use-routines";
import type { Routine } from "@/lib/types";

export function RoutineDetailView({
  routineId,
  initialRoutine,
}: {
  routineId: number;
  initialRoutine?: Routine;
}) {
  const { data: routine } = useRoutine(routineId, initialRoutine);

  const totalSeconds = routine.blocks.reduce(
    (acc, block) =>
      acc + block.sets.reduce((s, set) => s + set.durationSeconds + set.breakSeconds, 0),
    0
  );
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="flex flex-col flex-1">
      {/* Sticky header */}
      <div className="sticky -top-0.5 md:-top-6 z-10 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 md:-mx-6 px-4 md:px-6 py-3">
        <Link href="/routines" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Routines
        </Link>
        <h2 className="text-lg font-semibold mt-1">{routine.name}</h2>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {timeDisplay}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {routine.blocks.length} {routine.blocks.length === 1 ? "habit" : "habits"}
          </span>
        </div>
      </div>

      {/* Block list */}
      <div className="flex-1 py-4 space-y-3">
        {routine.blocks.map((block) => (
          <RoutineBlockCard
            key={block.id}
            block={{
              clientId: String(block.id),
              ...block,
              sets: block.sets.map((s, i) => ({ ...s, clientId: `${block.id}-${i}` })),
            }}
            mode="readonly"
          />
        ))}

        {routine.blocks.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            This routine has no habits. Edit it to add some.
          </p>
        )}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border -mx-4 md:-mx-6 px-4 md:px-6 py-3">
        <Button className="w-full" disabled>
          Start Routine (Coming Soon)
        </Button>
      </div>
    </div>
  );
}
