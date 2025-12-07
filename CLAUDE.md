# CoParent Schedule - Child Visitation Scheduling App

## Quick Reference (Check This First!)
- **Database**: Neon Postgres (ALL environments - never local) → See "Database Strategy"
- **API**: tRPC v11 (never GraphQL)
- **ORM**: Drizzle (never Prisma)
- **Auth**: Clerk (passkeys + 2FA)
- **Deployment**: SST v3 → AWS Lambda
- **NEVER start servers** - user controls all processes
- **Git** - always do git commits after finishing a unit of work 
- **Database** - let the user perform migrations

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

### Database Strategy (READ THIS FIRST)
**USE NEON FOR EVERYTHING - NO EXCEPTIONS**
- **Development**: Connect directly to Neon cloud database
- **Staging**: Neon cloud database
- **Production**: Neon cloud database
- **NEVER use local Postgres** - always use Neon's connection string
- **Connection**: Direct to Neon via `postgresql://...neon.tech/...` (no localhost proxy)
- **Driver**: `drizzle-orm/neon-serverless` with `@neondatabase/serverless`

**Why:** Neon is serverless, has built-in branching, and ensures dev/prod parity.

### DO NOT USE
- GraphQL (use tRPC instead)
- Redux/Zustand for server state (use Server Components)
- Prisma (use Drizzle for serverless)
- Aurora Serverless (use Neon)
- AWS Amplify for deployment (use SST)
- react-big-calendar or FullCalendar (use Schedule-X)
- **Local Postgres** (use Neon cloud for all environments)

### Security Requirements
- All auth flows via Clerk
- Passkey support required
- TOTP 2FA for sensitive operations
- Row-level security in database
- Input validation on both client AND server
- Never trust client-side data

### Development Workflow Rules
- **NEVER start dev servers** (pnpm dev, npm start, etc.) - they become zombie background processes
- User will start and stop all servers manually
- NEVER run background processes without explicit user request
- If user needs a server started, inform them but don't start it yourself

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

## Git Commit Strategy

### Organize Commits by Logical Boundaries

Create separate, focused commits for each distinct concern:

**Good commit organization:**
```bash
feat: initialize project foundation        # Dependencies, configs
feat: implement database schema           # Complete schema in one commit
feat: implement Clerk authentication      # All auth files together
feat: build tRPC v11 infrastructure       # Complete tRPC setup
feat: add Zod validation schemas          # All schemas together
feat: implement family router             # One router at a time
```

**Why this works:**
- Each commit is self-contained and functional
- Easy to review changes by feature
- Simple to revert if needed
- Clear project evolution in git log

### Commit Message Format

Use conventional commits with descriptive bodies:

```
<type>: <short description>

<detailed explanation if needed>

<any breaking changes or notes>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation only
- `test:` - Adding tests
- `chore:` - Tooling, configs
- `security:` - Security improvements

### Handling Secrets and Sensitive Data

**Never commit:**
- API keys, tokens, passwords
- `.env.local` files
- Files with personal credentials

**Best practices:**
1. Create `.example` template files (`.env.example`, `.mcp.json.example`)
2. Add real files to `.gitignore`
3. If accidentally committed, use `git filter-branch` to rewrite history:

```bash
# Remove file from all commits
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .mcp.json' \
  --prune-empty --tag-name-filter cat -- --all

# Clean up refs
git for-each-ref --format='%(refname)' refs/original/ | \
  xargs -n 1 git update-ref -d

# Garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Files to always gitignore:**
- `.env`, `.env.local` (env vars with secrets)
- `.mcp.json` (MCP server configs with tokens)
- `/.clerk/` (Clerk config directory)
- `/.claude/` (Claude Code plans/cache)

### When to Commit

Commit when you've completed a logical unit of work:

✅ **Good times to commit:**
- Finished implementing a complete feature
- Added all files for a specific layer (schema, routes, etc.)
- Fixed a bug and added tests
- Completed a refactoring

❌ **Avoid committing:**
- Work-in-progress / broken code
- Half-implemented features
- Commented-out code
- Debug console.logs

### Multiple Files Per Commit

Group related files together:

```bash
# Database layer
git add drizzle.config.ts src/lib/db/
git commit -m "feat: implement database schema with Drizzle ORM"

# Authentication
git add src/middleware.ts src/app/(auth)/ src/app/api/webhooks/clerk/
git commit -m "feat: implement Clerk authentication"
```

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
