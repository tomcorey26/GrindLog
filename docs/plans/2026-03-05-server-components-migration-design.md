# Server Components Migration Design

## Goal
Migrate from client-side SPA pattern to proper Next.js App Router architecture with server components, real routing, and server-side data fetching. Keep React Query for mutations and cache management.

## Approach: Incremental Migration
Add routes and server-side data fetching while preserving React Query for mutations and client interactivity.

## Route Structure

```
src/app/
  layout.tsx              # root layout (existing, server component)
  page.tsx                # redirect to /dashboard
  middleware.ts           # auth guard
  login/
    page.tsx              # login/signup (client component, wraps AuthForm)
  (app)/                  # route group for authenticated pages
    layout.tsx            # tab nav + Providers wrapper
    loading.tsx           # shared loading state
    dashboard/
      page.tsx            # server component, fetches habits
    sessions/
      page.tsx            # server component, fetches sessions
    rankings/
      page.tsx            # server component, fetches rankings
    timer/
      page.tsx            # server component, fetches active timer + habits
```

## Authentication
- `middleware.ts` checks session cookie JWT on every request
- Protected routes: /dashboard, /sessions, /rankings, /timer
- Unauthenticated → redirect to /login
- Authenticated on /login or / → redirect to /dashboard
- Server components still call `getSessionUserId()` for userId

## Data Fetching Pattern
- Server components fetch data directly from DB via shared query functions
- Pass data as `initialData` to client component React Query hooks
- React Query takes over for refetching, mutations, cache invalidation
- No double-fetch on page load

Example:
```
dashboard/page.tsx (server)
  → getHabitsForUser(userId)
  → <DashboardClient initialHabits={habits} />

DashboardClient (client)
  → useHabits({ initialData: habits })
```

Shared query functions in `src/lib/queries.ts`:
- `getHabitsForUser(userId)` — extracted from GET /api/habits
- `getSessionsForUser(userId, filters)` — extracted from GET /api/sessions
- `getRankingsForUser(userId)` — extracted from GET /api/rankings

## Navigation
- Tab component wired to routes via `<Link>` instead of local state
- Active tab determined by `usePathname()`
- `TabNav` client component in `(app)/layout.tsx`
- Visually identical to current tabs, but URL-backed

## Loading States
- Single `loading.tsx` in `(app)` route group
- Automatic Suspense boundary per-route via Next.js

## File Changes

### New files
- `src/app/middleware.ts` — auth guard
- `src/app/login/page.tsx` — login page
- `src/app/(app)/layout.tsx` — tab nav + Providers
- `src/app/(app)/loading.tsx` — shared loading state
- `src/app/(app)/dashboard/page.tsx` — server component
- `src/app/(app)/sessions/page.tsx` — server component
- `src/app/(app)/rankings/page.tsx` — server component
- `src/app/(app)/timer/page.tsx` — server component
- `src/components/TabNav.tsx` — route-backed tab navigation
- `src/lib/queries.ts` — shared DB query functions

### Modified files
- `src/app/page.tsx` — becomes redirect to /dashboard
- `src/app/layout.tsx` — remove Providers (moves to (app)/layout.tsx)
- `src/components/Dashboard.tsx` — strip tabs/views, keep habit list + modals
- `src/hooks/use-habits.ts` — accept initialData option
- `src/hooks/use-sessions.ts` — accept initialData option
- `src/hooks/use-rankings.ts` — accept initialData option

### Unchanged
- All API routes (still used for mutations)
- All mutation hooks
- AuthForm, HabitCard, TimerView, CalendarView, SessionsView, RankingsView

## Decisions
- Timer re-fetches from server on navigation (no client-side persistence)
- Flat routes (/dashboard, /sessions, etc.)
- Keep API routes + React Query for mutations
- Middleware for auth guards
