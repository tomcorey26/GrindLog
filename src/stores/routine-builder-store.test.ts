import { describe, it, expect, beforeEach } from "vitest";
import { useRoutineBuilderStore } from "./routine-builder-store";

beforeEach(() => {
  useRoutineBuilderStore.getState().initEmpty();
});

describe("routine builder store", () => {
  describe("initEmpty", () => {
    it("resets to empty state", () => {
      const state = useRoutineBuilderStore.getState();
      expect(state.routineId).toBeNull();
      expect(state.name).toBe("");
      expect(state.blocks).toEqual([]);
      expect(state.isDirty).toBe(false);
    });
  });

  describe("setName", () => {
    it("sets routine name and marks dirty", () => {
      useRoutineBuilderStore.getState().setName("Morning");
      const state = useRoutineBuilderStore.getState();
      expect(state.name).toBe("Morning");
      expect(state.isDirty).toBe(true);
    });
  });

  describe("addBlock", () => {
    it("adds a block and marks dirty", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1,
        habitName: "Guitar",
        notes: null,
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      const state = useRoutineBuilderStore.getState();
      expect(state.blocks).toHaveLength(1);
      expect(state.blocks[0].habitId).toBe(1);
      expect(state.blocks[0].habitName).toBe("Guitar");
      expect(state.blocks[0].clientId).toBeTruthy();
      expect(state.isDirty).toBe(true);
    });
  });

  describe("removeBlock", () => {
    it("removes a block by clientId", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      const clientId = useRoutineBuilderStore.getState().blocks[0].clientId;
      useRoutineBuilderStore.getState().removeBlock(clientId);
      expect(useRoutineBuilderStore.getState().blocks).toHaveLength(0);
    });
  });

  describe("updateBlockNotes", () => {
    it("updates notes for a block", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      const clientId = useRoutineBuilderStore.getState().blocks[0].clientId;
      useRoutineBuilderStore.getState().updateBlockNotes(clientId, "Focus on scales");
      expect(useRoutineBuilderStore.getState().blocks[0].notes).toBe("Focus on scales");
    });
  });

  describe("addSet", () => {
    it("adds a set copying last set values", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      const clientId = useRoutineBuilderStore.getState().blocks[0].clientId;
      useRoutineBuilderStore.getState().addSet(clientId);
      const sets = useRoutineBuilderStore.getState().blocks[0].sets;
      expect(sets).toHaveLength(2);
      expect(sets[1].durationSeconds).toBe(1500);
      expect(sets[1].breakSeconds).toBe(300);
    });

    it("does not add beyond 10 sets", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: Array.from({ length: 10 }, () => ({ durationSeconds: 1500, breakSeconds: 300 })),
      });
      const clientId = useRoutineBuilderStore.getState().blocks[0].clientId;
      useRoutineBuilderStore.getState().addSet(clientId);
      expect(useRoutineBuilderStore.getState().blocks[0].sets).toHaveLength(10);
    });
  });

  describe("removeSet", () => {
    it("removes a set by index", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: [
          { durationSeconds: 1500, breakSeconds: 300 },
          { durationSeconds: 900, breakSeconds: 300 },
        ],
      });
      const clientId = useRoutineBuilderStore.getState().blocks[0].clientId;
      useRoutineBuilderStore.getState().removeSet(clientId, 0);
      const sets = useRoutineBuilderStore.getState().blocks[0].sets;
      expect(sets).toHaveLength(1);
      expect(sets[0].durationSeconds).toBe(900);
    });

    it("does not remove the last set", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      const clientId = useRoutineBuilderStore.getState().blocks[0].clientId;
      useRoutineBuilderStore.getState().removeSet(clientId, 0);
      expect(useRoutineBuilderStore.getState().blocks[0].sets).toHaveLength(1);
    });
  });

  describe("updateSetDuration", () => {
    it("updates duration for a specific set", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      const clientId = useRoutineBuilderStore.getState().blocks[0].clientId;
      useRoutineBuilderStore.getState().updateSetDuration(clientId, 0, 900);
      expect(useRoutineBuilderStore.getState().blocks[0].sets[0].durationSeconds).toBe(900);
    });
  });

  describe("updateSetBreak", () => {
    it("updates break for a specific set", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      const clientId = useRoutineBuilderStore.getState().blocks[0].clientId;
      useRoutineBuilderStore.getState().updateSetBreak(clientId, 0, 600);
      expect(useRoutineBuilderStore.getState().blocks[0].sets[0].breakSeconds).toBe(600);
    });
  });

  describe("moveBlock", () => {
    it("reorders blocks", () => {
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: null,
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      useRoutineBuilderStore.getState().addBlock({
        habitId: 2, habitName: "Reading", notes: null,
        sets: [{ durationSeconds: 900, breakSeconds: 0 }],
      });
      useRoutineBuilderStore.getState().moveBlock(1, 0);
      const blocks = useRoutineBuilderStore.getState().blocks;
      expect(blocks[0].habitName).toBe("Reading");
      expect(blocks[1].habitName).toBe("Guitar");
    });
  });

  describe("initFromRoutine", () => {
    it("hydrates from existing routine", () => {
      useRoutineBuilderStore.getState().initFromRoutine({
        id: 5,
        name: "Evening",
        blocks: [
          {
            id: 10, habitId: 1, habitName: "Guitar", sortOrder: 0,
            notes: "Scales",
            sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
          },
        ],
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      });
      const state = useRoutineBuilderStore.getState();
      expect(state.routineId).toBe(5);
      expect(state.name).toBe("Evening");
      expect(state.blocks).toHaveLength(1);
      expect(state.blocks[0].habitName).toBe("Guitar");
      expect(state.blocks[0].notes).toBe("Scales");
      expect(state.isDirty).toBe(false);
    });
  });

  describe("toPayload", () => {
    it("converts store state to API payload", () => {
      useRoutineBuilderStore.getState().setName("Morning");
      useRoutineBuilderStore.getState().addBlock({
        habitId: 1, habitName: "Guitar", notes: "Scales",
        sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
      });
      const payload = useRoutineBuilderStore.getState().toPayload();
      expect(payload).toEqual({
        name: "Morning",
        blocks: [
          {
            habitId: 1, sortOrder: 0, notes: "Scales",
            sets: [{ durationSeconds: 1500, breakSeconds: 300 }],
          },
        ],
      });
    });
  });
});
