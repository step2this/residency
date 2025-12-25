---
name: typescript-best-practices
description: TypeScript strict mode correctness and type safety patterns for this codebase. Use proactively when writing or reviewing TypeScript code to ensure strict mode compliance, eliminate any types, and follow proper type inference from Zod/Drizzle schemas.
allowed-tools: Read, Grep, Glob, Edit
---

# TypeScript Best Practices for CoParent Schedule

## Core Constraints

**From CLAUDE.md:**
- Strict mode enabled
- No `any` - use `unknown` and narrow
- Prefer `type` over `interface`
- Infer types from Drizzle/Zod (NEVER define manually when schema exists)

## Type Inference Pattern (Critical!)

### ✅ CORRECT: Infer from Source
```typescript
// Drizzle schema is source of truth
export const events = pgTable('events', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
});

// Infer types from schema
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
```

### ✅ CORRECT: Infer from Zod
```typescript
// Zod schema is source of truth
export const createEventSchema = z.object({
  title: z.string(),
  startDate: z.date(),
});

// Infer types from schema
export type CreateEventInput = z.infer<typeof createEventSchema>;
```

### ❌ WRONG: Manual Type Definition
```typescript
// DON'T DO THIS - duplicates schema definition
type CreateEventInput = {
  title: string;
  startDate: Date;
};

const createEventSchema = z.object({
  title: z.string(),
  startDate: z.date(),
});
```

## tRPC + Zod Contract Pattern

**Single source of truth:**
```typescript
// 1. Define Zod schema
export const getEventsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  familyId: z.string().uuid(),
});

// 2. Infer type
export type GetEventsInput = z.infer<typeof getEventsSchema>;

// 3. Use in tRPC
export const scheduleRouter = router({
  getEvents: protectedProcedure
    .input(getEventsSchema)
    .query(async ({ input }) => {
      // input is fully typed!
      const { startDate, endDate, familyId } = input;
    }),
});
```

## Narrowing Unknown Types

```typescript
function processValue(value: unknown): string {
  // Type guard
  if (typeof value === 'string') {
    return value.toUpperCase();
  }

  // Validation with Zod
  const schema = z.string();
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data.toUpperCase();
  }

  throw new Error('Expected string');
}
```

## Discriminated Unions for Variants

```typescript
// Define variants with literal types
type SwapStatus =
  | { status: 'pending'; requestedBy: string }
  | { status: 'approved'; approvedBy: string; approvedAt: Date }
  | { status: 'rejected'; rejectedBy: string; reason: string };

function handleSwap(swap: SwapStatus) {
  // TypeScript narrows based on discriminant
  switch (swap.status) {
    case 'pending':
      return `Requested by ${swap.requestedBy}`;
    case 'approved':
      return `Approved by ${swap.approvedBy} at ${swap.approvedAt}`;
    case 'rejected':
      return `Rejected: ${swap.reason}`;
  }
}
```

## Explicit Return Types

```typescript
// ✅ GOOD: Explicit return type prevents errors
function calculateEndDate(startDate: Date, days: number): Date {
  // TypeScript ensures we return a Date
  return new Date(startDate.getTime() + days * 86400000);
}

// ❌ BAD: Implicit return could accidentally change
function calculateEndDate(startDate: Date, days: number) {
  // Easy to accidentally return wrong type
  return startDate.getTime() + days * 86400000; // Returns number!
}
```

## Generic Constraints

```typescript
// Constrain generics for type safety
function findById<T extends { id: string }>(
  items: T[],
  id: string
): T | undefined {
  return items.find(item => item.id === id);
}

// Usage with inferred types
const events: Event[] = [];
const event = findById(events, 'abc-123'); // Type is Event | undefined
```

## Type Guards

```typescript
// Custom type guard
function isEvent(value: unknown): value is Event {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value
  );
}

// Better: Use Zod for runtime validation
const eventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
});

function parseEvent(value: unknown): Event {
  return eventSchema.parse(value); // Throws if invalid
}

function validateEvent(value: unknown): Event | null {
  const result = eventSchema.safeParse(value);
  return result.success ? result.data : null;
}
```

## Code Review Checklist

When reviewing TypeScript code, check for:

- [ ] No `any` types anywhere
- [ ] Types inferred from Zod/Drizzle (not manually defined)
- [ ] Explicit return types on all functions
- [ ] `unknown` used instead of `any` for uncertain types
- [ ] Proper type narrowing with guards or Zod
- [ ] Discriminated unions for variants
- [ ] Generic constraints where needed
- [ ] No type assertions (`as`) unless absolutely necessary

## Common Anti-Patterns to Avoid

### ❌ Type Assertions
```typescript
// Avoid unless absolutely necessary
const event = data as Event;

// Prefer validation
const event = eventSchema.parse(data);
```

### ❌ Non-null Assertions
```typescript
// Risky
const user = maybeUser!;

// Prefer explicit checks
if (!maybeUser) throw new Error('User required');
const user = maybeUser;
```

### ❌ Duplicate Type Definitions
```typescript
// Schema and type out of sync
type User = { name: string };
const userSchema = z.object({ name: z.string(), email: z.string() });

// Keep single source of truth
const userSchema = z.object({ name: z.string(), email: z.string() });
type User = z.infer<typeof userSchema>;
```

## Project-Specific Patterns

### Database Queries
```typescript
// Infer from Drizzle schema
import { events } from '@/lib/db/schema';

type Event = typeof events.$inferSelect;

// Query is fully typed
const eventList: Event[] = await db.query.events.findMany({
  where: eq(events.familyId, familyId),
});
```

### Server Actions
```typescript
'use server'

export async function createEvent(
  input: CreateEventInput
): Promise<Event> {
  // Validate at runtime
  const validated = createEventSchema.parse(input);

  // Insert with typed schema
  const [event] = await db
    .insert(events)
    .values(validated)
    .returning();

  return event; // Type is Event
}
```

### tRPC Context
```typescript
// Context is typed from schema
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { userId } = await auth();

  return {
    db,
    userId: userId ?? null,
  };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;
```

## When to Use This Skill

Use this skill when:
- Writing new TypeScript files
- Reviewing TypeScript code
- Refactoring for type safety
- Defining schemas (Zod/Drizzle)
- Creating tRPC procedures
- Fixing type errors
- Upgrading to stricter TypeScript settings

Always prioritize type inference from schemas and avoid manual type definitions that duplicate schema information.
