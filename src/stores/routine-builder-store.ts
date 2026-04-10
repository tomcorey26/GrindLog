import { create } from "zustand";
import type { Routine, RoutineSet } from "@/lib/types";

export type BuilderSet = RoutineSet;

export type BuilderBlock = {
  clientId: string;
  habitId: number;
  habitName: string;
  notes: string | null;
  sets: BuilderSet[];
};

type AddBlockInput = {
  habitId: number;
  habitName: string;
  notes: string | null;
  sets: BuilderSet[];
};

type RoutineBuilderState = {
  routineId: number | null;
  name: string;
  blocks: BuilderBlock[];
  isDirty: boolean;

  initEmpty: () => void;
  initFromRoutine: (routine: Routine) => void;
  setName: (name: string) => void;
  addBlock: (input: AddBlockInput) => void;
  removeBlock: (clientId: string) => void;
  updateBlockNotes: (clientId: string, notes: string) => void;
  addSet: (clientId: string) => void;
  removeSet: (clientId: string, setIndex: number) => void;
  updateSetDuration: (clientId: string, setIndex: number, durationSeconds: number) => void;
  updateSetBreak: (clientId: string, setIndex: number, breakSeconds: number) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  toPayload: () => {
    name: string;
    blocks: { habitId: number; sortOrder: number; notes: string | null; sets: RoutineSet[] }[];
  };
};

function generateId(): string {
  return crypto.randomUUID();
}

function updateBlock(
  blocks: BuilderBlock[],
  clientId: string,
  updater: (block: BuilderBlock) => BuilderBlock
): BuilderBlock[] {
  return blocks.map((b) => (b.clientId === clientId ? updater(b) : b));
}

export const useRoutineBuilderStore = create<RoutineBuilderState>((set, get) => ({
  routineId: null,
  name: "",
  blocks: [],
  isDirty: false,

  initEmpty: () =>
    set({ routineId: null, name: "", blocks: [], isDirty: false }),

  initFromRoutine: (routine: Routine) =>
    set({
      routineId: routine.id,
      name: routine.name,
      blocks: routine.blocks.map((b) => ({
        clientId: generateId(),
        habitId: b.habitId,
        habitName: b.habitName,
        notes: b.notes,
        sets: [...b.sets],
      })),
      isDirty: false,
    }),

  setName: (name: string) => set({ name, isDirty: true }),

  addBlock: (input: AddBlockInput) =>
    set((state) => ({
      blocks: [...state.blocks, { clientId: generateId(), ...input }],
      isDirty: true,
    })),

  removeBlock: (clientId: string) =>
    set((state) => ({
      blocks: state.blocks.filter((b) => b.clientId !== clientId),
      isDirty: true,
    })),

  updateBlockNotes: (clientId: string, notes: string) =>
    set((state) => ({
      blocks: updateBlock(state.blocks, clientId, (b) => ({ ...b, notes })),
      isDirty: true,
    })),

  addSet: (clientId: string) =>
    set((state) => ({
      blocks: updateBlock(state.blocks, clientId, (b) => {
        if (b.sets.length >= 10) return b;
        const lastSet = b.sets[b.sets.length - 1];
        return {
          ...b,
          sets: [
            ...b.sets,
            { durationSeconds: lastSet.durationSeconds, breakSeconds: lastSet.breakSeconds },
          ],
        };
      }),
      isDirty: true,
    })),

  removeSet: (clientId: string, setIndex: number) =>
    set((state) => ({
      blocks: updateBlock(state.blocks, clientId, (b) => {
        if (b.sets.length <= 1) return b;
        return { ...b, sets: b.sets.filter((_, i) => i !== setIndex) };
      }),
      isDirty: true,
    })),

  updateSetDuration: (clientId: string, setIndex: number, durationSeconds: number) =>
    set((state) => ({
      blocks: updateBlock(state.blocks, clientId, (b) => ({
        ...b,
        sets: b.sets.map((s, i) => (i === setIndex ? { ...s, durationSeconds } : s)),
      })),
      isDirty: true,
    })),

  updateSetBreak: (clientId: string, setIndex: number, breakSeconds: number) =>
    set((state) => ({
      blocks: updateBlock(state.blocks, clientId, (b) => ({
        ...b,
        sets: b.sets.map((s, i) => (i === setIndex ? { ...s, breakSeconds } : s)),
      })),
      isDirty: true,
    })),

  moveBlock: (fromIndex: number, toIndex: number) =>
    set((state) => {
      const blocks = [...state.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      return { blocks, isDirty: true };
    }),

  toPayload: () => {
    const { name, blocks } = get();
    return {
      name,
      blocks: blocks.map((b, i) => ({
        habitId: b.habitId,
        sortOrder: i,
        notes: b.notes,
        sets: b.sets.map((s) => ({
          durationSeconds: s.durationSeconds,
          breakSeconds: s.breakSeconds,
        })),
      })),
    };
  },
}));
