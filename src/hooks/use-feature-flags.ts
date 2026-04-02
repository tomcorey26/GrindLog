import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { FeatureFlags } from "@/lib/feature-flags";

export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.features.all,
    queryFn: () => api<FeatureFlags>("/api/features"),
    staleTime: Infinity,
  });
}
