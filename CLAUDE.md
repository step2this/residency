# CoParent Schedule - Child Visitation Scheduling App

## Quick Start (Read This First!)

**Essential Context:**
- Mobile-first web app for divorced families to manage child visitation
- Modern React/Next.js stack with serverless AWS backend
- Security-first: Clerk auth + Neon Postgres
- **MVP Focus**: Build what's needed now, not enterprise features

**Critical Files to Reference:**
- `MVP_SCOPE.md` - What NOT to build, avoid over-engineering
- `UI_PATTERNS.md` - Component architecture, React patterns
- `CODING_PRINCIPLES.md` - SOLID, DRY, YAGNI with examples
- `TESTING.md` - Testing philosophy (no mocks, behavior-focused)
- `DATABASE.md` - Drizzle ORM patterns, Neon usage
- `GIT_WORKFLOW.md` - Commit strategy, message format

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **React**: React 19 (stable)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Calendar**: Schedule-X (mobile-first)
- **State**: React 19 primitives + nuqs for URL state
- **Forms**: react-hook-form + zod

### Backend  
- **API**: tRPC v11 (NOT GraphQL)
- **Validation**: Zod schemas (shared)
- **Database**: Neon Postgres (ALL environments)
- **ORM**: Drizzle ORM
- **Auth**: Clerk (passkeys + 2FA)

### Infrastructure
- **Deployment**: SST v3 → AWS Lambda
- **CDN**: CloudFront via SST
- **Monitoring**: AWS CloudWatch

## Critical Constraints

### Database: ALWAYS Use Neon
- **Development**: Neon cloud database (NOT localhost)
- **Connection**: `postgresql://...neon.tech/...`
- **Driver**: `drizzle-orm/neon-serverless`
- **Why**: Serverless, branching, dev/prod parity

### DO NOT USE
- Local Postgres (use Neon for everything)
- GraphQL (use tRPC)
- Prisma (use Drizzle)
- Redux/Zustand for server state (use Server Components)
- react-big-calendar or FullCalendar (use Schedule-X)

### Development Workflow
- **NEVER start dev servers** - user controls all processes
- No background processes without explicit request
- If server needed, inform user but don't start

## Project Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes
│   │   ├── (dashboard)/       # Protected routes
│   │   └── api/               # tRPC endpoints
│   ├── components/
│   │   ├── ui/                # shadcn/ui base
│   │   ├── calendar/          # Schedule-X wrappers
│   │   └── [domain]/          # Feature components
│   ├── lib/
│   │   ├── db/                # Drizzle schema & client
│   │   ├── trpc/              # tRPC routers
│   │   └── [domain]/          # Business logic
│   ├── schemas/               # Zod validation
│   └── hooks/                 # React hooks
├── sst.config.ts              # SST deployment
├── drizzle.config.ts          # Migrations config
└── CLAUDE.md                  # This file
```

## Commands

```bash
# Development
pnpm dev                       # Start dev server (user runs)
pnpm build                     # Production build
pnpm typecheck                 # TypeScript checks
pnpm lint                      # ESLint
pnpm test                      # Run tests

# Database
pnpm db:generate               # Generate migrations
pnpm db:push                   # Push schema to Neon
pnpm db:studio                 # Drizzle Studio

# Deployment
pnpm sst:dev                   # SST dev mode
pnpm sst:deploy                # Deploy to AWS
```

## Code Style Quick Reference

### TypeScript
- Strict mode enabled
- No `any` - use `unknown` and narrow
- Prefer `type` over `interface`
- Infer types from Drizzle/Zod

### React/Next.js
- Server Components by default
- `'use client'` only when needed
- Server Actions for mutations
- tRPC for complex data fetching
- Colocate with routes

### Naming
- Components: `PascalCase` (ScheduleCalendar.tsx)
- Files: `kebab-case` (schedule-utils.ts)
- tRPC procedures: `camelCase` (schedule.create)
- Database tables: `snake_case` (visitation_events)

## Key Architecture Patterns

### Separation of Concerns
```
app/[route]/page.tsx       → Orchestration (what to render)
lib/[domain]/queries.ts    → Data access (how to fetch)
lib/[domain]/utils.ts      → Business logic (domain rules)
components/[domain]/       → Presentation (how to display)
schemas/[domain].ts        → Validation (what's valid)
```

### tRPC + Zod Contract
```typescript
// Single source of truth
export const createEventSchema = z.object({ /* */ });
export type CreateEventInput = z.infer<typeof createEventSchema>;

// Used in tRPC
.input(createEventSchema)
.mutation(async ({ input }) => { /* fully typed */ })
```

### Server Components Pattern
```tsx
// Fetch in Server Component
export default async function Page() {
  const data = await db.query.events.findMany();
  return <ClientComponent initialData={data} />;
}
```

## Before Committing

1. ✅ `pnpm typecheck` - must pass
2. ✅ `pnpm lint` - fix errors
3. ✅ `pnpm test` - all green
4. ✅ Remove debug code
5. ✅ Check mobile responsiveness
6. ✅ Follow commit message format (see GIT_WORKFLOW.md)

## Skill File Guide

**When working on...**

| Task | Read These Files |
|------|------------------|
| New feature planning | MVP_SCOPE.md, CODING_PRINCIPLES.md |
| UI/components | UI_PATTERNS.md, CODING_PRINCIPLES.md |
| Database changes | DATABASE.md |
| Testing | TESTING.md |
| Git commits | GIT_WORKFLOW.md |
| Architecture decisions | CODING_PRINCIPLES.md, UI_PATTERNS.md |

## Domain Context

### Users
- Two co-parents per family
- Optional: attorneys, grandparents (view-only)
- Children are managed entities, not users

### Core Features (MVP)
1. Authentication (Clerk)
2. Family/child profiles
3. Calendar view (Schedule-X)
4. Create/view visitation events
5. Recurring schedules
6. Swap requests
7. Email notifications

### Out of Scope (See MVP_SCOPE.md)
- Multi-tenant architecture
- Advanced analytics
- Payment processing
- Admin panels
- Real-time collaboration
- Mobile native apps
- Complex RBAC (just 2 roles)

## Security Requirements
- All auth via Clerk
- Passkey support required
- TOTP 2FA for sensitive ops
- Row-level security in DB
- Input validation client AND server
- Never trust client data

## Remember
- **MVP First** - Read MVP_SCOPE.md before adding features
- **Separation of Concerns** - Logic ≠ Presentation (see UI_PATTERNS.md)
- **SOLID Principles** - See CODING_PRINCIPLES.md for examples
- **Test Behavior** - Not implementation (see TESTING.md)
- **Commit Clean** - Follow GIT_WORKFLOW.md conventions
