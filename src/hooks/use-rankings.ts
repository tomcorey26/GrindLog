import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

type Ranking = {
  rank: number;
  habitId: number;
  habitName: string;
  totalSeconds: number;
};

export function useRankings() {
  return useSuspenseQuery({
    queryKey: queryKeys.rankings.all,
    queryFn: () => api<{ rankings: Ranking[] }>('/api/rankings'),
    select: (data) => data.rankings,
  });
}
