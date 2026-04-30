import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Routine, RoutineSet } from "@/lib/types";

type CreateRoutineInput = {
  name: string;
  blocks: {
    habitId: number;
    sortOrder: number;
    notes: string | null;
    sets: RoutineSet[];
  }[];
};

type UpdateRoutineInput = CreateRoutineInput & { id: number };

const ROUTINES_STALE_TIME = 30_000;

export function useRoutines(initialData?: Routine[]) {
  return useSuspenseQuery({
    queryKey: queryKeys.routines.all,
    queryFn: () => api<{ routines: Routine[] }>("/api/routines"),
    select: (data) => data.routines,
    ...(initialData
      ? { initialData: { routines: initialData }, staleTime: ROUTINES_STALE_TIME }
      : {}),
  });
}

export function useRoutine(id: number, initialData?: Routine) {
  return useSuspenseQuery({
    queryKey: queryKeys.routines.detail(id),
    queryFn: () => api<{ routine: Routine }>(`/api/routines/${id}`),
    select: (data) => data.routine,
    ...(initialData
      ? { initialData: { routine: initialData }, staleTime: ROUTINES_STALE_TIME }
      : {}),
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoutineInput) =>
      api<{ routine: Routine }>("/api/routines", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.routines.all }),
  });
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateRoutineInput) =>
      api<{ routine: Routine }>(`/api/routines/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.routines.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.routines.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api(`/api/routines/${id}`, { method: "DELETE" }),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.routines.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.routines.detail(id),
        }),
      ]);
    },
  });
}
