# Rankings Tab Design

## Summary
New "Rankings" tab showing skills ranked by total time practiced. Server-side aggregation via new API endpoint.

## API: `GET /api/rankings`
- Auth: JWT cookie (same as other routes)
- Query: `SELECT habit_id, SUM(duration_seconds) as total_seconds FROM time_sessions JOIN habits GROUP BY habit_id ORDER BY total_seconds DESC`
- Filter: only habits belonging to authenticated user
- Response: `{ rankings: [{ rank: 1, habitName: string, totalSeconds: number }] }`

## UI: `RankingsView` component
- New 3rd tab in Dashboard tab bar: Skills / Sessions / Rankings
- `activeView` state gains `'rankings'` value
- Each ranking = card with: rank number | skill name | formatted time (Xh Xm)
- Top 3 ranks get gold/silver/bronze colored rank numbers
- Empty state when no sessions exist

## No schema changes needed
Pure read query over existing `time_sessions` + `habits` tables.
