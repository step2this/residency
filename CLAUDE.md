# CoParent Schedule - Child Visitation Scheduling App

## Project Overview
Mobile-first web application for divorced families to manage child visitation schedules. Built with modern React/Next.js stack, serverless AWS backend, and emphasis on security for sensitive family data.

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **React**: React 19 (stable)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Calendar**: Schedule-X (mobile-first)
- **State**: React 19 primitives (useOptimistic, useActionState) + nuqs for URL state
- **Forms**: react-hook-form + zod

### Backend
- **API Layer**: tRPC v11 (NOT GraphQL)
- **Validation**: Zod schemas (shared frontend/backend)
- **Database**: Neon Postgres (serverless)
- **ORM**: Drizzle ORM
- **Auth**: Clerk (passkeys + TOTP 2FA)

### Infrastructure
- **Deployment**: SST v3 → AWS Lambda
- **CDN**: CloudFront via SST
- **Monitoring**: AWS CloudWatch

## Critical Constraints

### DO NOT USE
- GraphQL (use tRPC instead)
- Redux/Zustand for server state (use Server Components)
- Prisma (use Drizzle for serverless)
- Aurora Serverless (use Neon)
- AWS Amplify for deployment (use SST)
- react-big-calendar or FullCalendar (use Schedule-X)

### Security Requirements
- All auth flows via Clerk
- Passkey support required
- TOTP 2FA for sensitive operations
- Row-level security in database
- Input validation on both client AND server
- Never trust client-side data

## Project Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth routes (sign-in, sign-up)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── api/               # API routes (tRPC)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── calendar/          # Schedule-X wrappers
│   │   └── forms/             # Form components
│   ├── lib/
│   │   ├── db/                # Drizzle schema & client
│   │   ├── trpc/              # tRPC router & procedures
│   │   └── utils/             # Shared utilities
│   ├── schemas/               # Zod schemas (shared)
│   └── hooks/                 # Custom React hooks
├── sst.config.ts              # SST deployment config
├── drizzle.config.ts          # Drizzle migrations
└── CLAUDE.md                  # This file
```

## Commands

```bash
# Development
pnpm dev                       # Start dev server
pnpm build                     # Production build
pnpm typecheck                 # Run TypeScript checks
pnpm lint                      # ESLint
pnpm test                      # Run tests

# Database
pnpm db:generate               # Generate Drizzle migrations
pnpm db:push                   # Push schema to Neon
pnpm db:studio                 # Open Drizzle Studio

# Deployment
pnpm sst:dev                   # SST dev mode
pnpm sst:deploy                # Deploy to AWS
```

## Code Style

### TypeScript
- Strict mode enabled
- No `any` types - use `unknown` and narrow
- Prefer `type` over `interface` for consistency
- Use Zod for runtime validation, infer types from schemas

### React/Next.js
- Server Components by default, `'use client'` only when needed
- Use Server Actions for simple mutations
- Use tRPC for complex data fetching with caching
- Colocate components with their routes when possible

### Database
- Use Drizzle's relational queries for joins
- Always use parameterized queries
- Schema changes via migrations only

### Naming
- Components: PascalCase (`ScheduleCalendar.tsx`)
- Files: kebab-case (`schedule-utils.ts`)
- tRPC procedures: camelCase (`schedule.create`)
- Database tables: snake_case (`visitation_events`)

## Key Patterns

### tRPC + Zod Contract
```typescript
// schemas/schedule.ts - Single source of truth
export const createScheduleSchema = z.object({
  title: z.string().min(1).max(100),
  startTime: z.date(),
  endTime: z.date(),
  childIds: z.array(z.string().uuid()),
});
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

// lib/trpc/routers/schedule.ts
export const scheduleRouter = router({
  create: protectedProcedure
    .input(createScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      // input is fully typed
    }),
});
```

### Server Components Data Fetching
```tsx
// app/(dashboard)/schedule/page.tsx
export default async function SchedulePage() {
  const schedules = await db.query.schedules.findMany({
    where: eq(schedules.userId, auth().userId),
    with: { events: true },
  });
  return <ScheduleCalendar initialData={schedules} />;
}
```

### Clerk Auth Integration
```typescript
// lib/trpc/context.ts
export const createContext = async () => {
  const { userId } = await auth();
  return { userId, db };
};

// Protected procedure
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
```

## Testing Strategy
- Unit tests: Vitest for utilities and schemas
- Component tests: React Testing Library
- E2E tests: Playwright for critical user flows
- Run `pnpm typecheck` before all tests

## Before Committing
1. Run `pnpm typecheck` - must pass
2. Run `pnpm lint` - fix any errors
3. Run `pnpm test` - all tests green
4. Verify mobile responsiveness in dev tools

## Domain Context

### Users
- Two co-parents per family unit
- Optional: attorneys, grandparents with view-only access
- Children are managed entities, not users

### Schedules
- Recurring patterns (weekly, biweekly)
- Holiday exceptions
- Swap requests between parents
- Audit trail for legal purposes

### Notifications
- Schedule change alerts
- Swap request notifications
- Reminder before pickup/dropoff times
