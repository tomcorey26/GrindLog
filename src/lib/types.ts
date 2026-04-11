export type Habit = {
  id: number;
  name: string;
  todaySeconds: number;
  totalSeconds: number;
  streak: number;
  activeTimer: {
    startTime: string;
    targetDurationSeconds: number | null;
  } | null;
};

export type Session = {
  id: number;
  habitName: string;
  habitId: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  timerMode: string;
};

export type RoutineSet = {
  durationSeconds: number;
  breakSeconds: number;
};

export type RoutineBlock = {
  id: number;
  habitId: number;
  habitName: string;
  sortOrder: number;
  notes: string | null;
  sets: RoutineSet[];
};

export type Routine = {
  id: number;
  name: string;
  blocks: RoutineBlock[];
  createdAt: string;
  updatedAt: string;
};

export type BuilderSet = RoutineSet;

export type BuilderBlock = {
  clientId: string;
  habitId: number;
  habitName: string;
  notes: string | null;
  sets: BuilderSet[];
};
