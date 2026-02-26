'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatTime } from '@/lib/format';

type Ranking = {
  rank: number;
  habitId: number;
  habitName: string;
  totalSeconds: number;
};

const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

export function RankingsView() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRankings() {
      const res = await fetch('/api/rankings');
      if (res.ok) {
        const data = await res.json();
        setRankings(data.rankings);
      }
      setLoading(false);
    }
    fetchRankings();
  }, []);

  if (loading) {
    return <p className="text-center text-muted-foreground">Loading...</p>;
  }

  if (rankings.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No rankings yet</p>;
  }

  return (
    <div className="space-y-2">
      {rankings.map((r) => (
        <Card key={r.habitId}>
          <CardContent className="p-3 flex items-center gap-3">
            <span className={`text-lg font-bold w-8 ${RANK_COLORS[r.rank] || 'text-muted-foreground'}`}>
              #{r.rank}
            </span>
            <span className="font-medium flex-1">{r.habitName}</span>
            <span className="font-mono text-sm text-muted-foreground">{formatTime(r.totalSeconds)}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
