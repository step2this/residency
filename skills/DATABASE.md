# Database Patterns - Drizzle ORM & Neon

## Connection Strategy

### ALWAYS Use Neon Cloud (Never Local)
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Always Neon connection string
  },
});

// lib/db/client.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### Environment Variables
```bash
# .env.local
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/residency?sslmode=require"

# Never use localhost
# ❌ DATABASE_URL="postgresql://localhost:5432/residency"
```

## Schema Definition Patterns

### Use Drizzle's Type Inference
```typescript
// lib/db/schema.ts
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  name: text('name'),
  familyId: uuid('family_id').references(() => families.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id').references(() => families.id).notNull(),
  title: text('title').notNull(),
  startTime: timestamp('start_time', { mode: 'string' }).notNull(),
  endTime: timestamp('end_time', { mode: 'string' }).notNull(),
  parentId: text('parent_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Infer types from schema
export type Family = typeof families.$inferSelect;
export type InsertFamily = typeof families.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
```

### Define Relations
```typescript
// lib/db/schema.ts
import { relations } from 'drizzle-orm';

export const familiesRelations = relations(families, ({ many }) => ({
  users: many(users),
  events: many(events),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
  }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  family: one(families, {
    fields: [events.familyId],
    references: [families.id],
  }),
  parent: one(users, {
    fields: [events.parentId],
    references: [users.id],
  }),
}));
```

## Query Patterns

### ✅ Use Relational Queries
```typescript
// ✅ GOOD - Drizzle relational query (type-safe joins)
const family = await db.query.families.findFirst({
  where: eq(families.id, familyId),
  with: {
    users: true,
    events: {
      where: gte(events.startTime, new Date().toISOString()),
      orderBy: [asc(events.startTime)],
    },
  },
});

// ✅ GOOD - Filter with relational data
const userEvents = await db.query.events.findMany({
  where: eq(events.parentId, userId),
  with: {
    family: {
      columns: { name: true },
    },
  },
});
```

### ❌ Avoid N+1 Queries
```typescript
// ❌ BAD - N+1 queries
const events = await db.query.events.findMany();
for (const event of events) {
  const family = await db.query.families.findFirst({
    where: eq(families.id, event.familyId),
  }); // This runs N times!
}

// ✅ GOOD - Single query with join
const events = await db.query.events.findMany({
  with: { family: true },
});
```

### ✅ Use Prepared Statements for Repeated Queries
```typescript
// lib/db/prepared.ts
import { eq } from 'drizzle-orm';

export const getEventById = db.query.events
  .findFirst({
    where: eq(events.id, sql.placeholder('id')),
    with: { family: true, parent: true },
  })
  .prepare('get_event_by_id');

// Usage
const event = await getEventById.execute({ id: eventId });
```

## Mutation Patterns

### ✅ Use Transactions for Related Changes
```typescript
// ✅ GOOD - Atomic operations
export async function createFamilyWithParent(
  parentData: { id: string; email: string; name: string },
  familyData: { name: string }
) {
  return db.transaction(async (tx) => {
    const [family] = await tx
      .insert(families)
      .values(familyData)
      .returning();
    
    const [user] = await tx
      .insert(users)
      .values({
        ...parentData,
        familyId: family.id,
      })
      .returning();
    
    return { family, user };
  });
}
```

### ✅ Use Returning for Insert/Update
```typescript
// ✅ GOOD - Get created record back
const [newEvent] = await db
  .insert(events)
  .values({
    familyId,
    title: 'Soccer Practice',
    startTime: '2025-12-20T10:00:00Z',
    endTime: '2025-12-20T11:00:00Z',
    parentId: userId,
  })
  .returning();

// ✅ GOOD - Get updated record back
const [updated] = await db
  .update(events)
  .set({ title: 'Updated Title' })
  .where(eq(events.id, eventId))
  .returning();
```

### ❌ Don't Use Raw SQL Unless Necessary
```typescript
// ❌ BAD - Raw SQL loses type safety
const result = await db.execute(sql`
  SELECT * FROM events WHERE family_id = ${familyId}
`);

// ✅ GOOD - Use query builder
const result = await db.query.events.findMany({
  where: eq(events.familyId, familyId),
});
```

## Migration Patterns

### Generate Migrations from Schema
```bash
# Generate migration
pnpm db:generate

# Review generated SQL in drizzle/ folder
# Apply migration
pnpm db:push
```

### Migration Naming
```typescript
// drizzle/0001_add_swap_requests.sql
CREATE TABLE "swap_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "requested_by" text NOT NULL REFERENCES "users"("id"),
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

### Never Manually Edit Database
```bash
# ❌ BAD
psql $DATABASE_URL -c "ALTER TABLE events ADD COLUMN description TEXT;"

# ✅ GOOD
# 1. Edit schema.ts
export const events = pgTable('events', {
  // ... existing columns
  description: text('description'),
});

# 2. Generate migration
pnpm db:generate

# 3. Review and apply
pnpm db:push
```

## Validation with Zod

### Create Schemas Matching Database
```typescript
// schemas/events.ts
import { z } from 'zod';
import { events } from '@/lib/db/schema';

export const insertEventSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().min(1).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  parentId: z.string(),
});

// Infer type
export type InsertEventInput = z.infer<typeof insertEventSchema>;

// Use in tRPC
export const eventsRouter = router({
  create: protectedProcedure
    .input(insertEventSchema)
    .mutation(async ({ ctx, input }) => {
      const [event] = await db.insert(events).values(input).returning();
      return event;
    }),
});
```

## Performance Patterns

### ✅ Use Indexes for Common Queries
```typescript
// lib/db/schema.ts
import { index } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  // ... columns
}, (table) => ({
  familyIdIdx: index('events_family_id_idx').on(table.familyId),
  parentIdIdx: index('events_parent_id_idx').on(table.parentId),
  startTimeIdx: index('events_start_time_idx').on(table.startTime),
}));
```

### ✅ Use Partial Selects
```typescript
// ✅ GOOD - Only select needed columns
const eventTitles = await db.query.events.findMany({
  columns: { id: true, title: true },
  where: eq(events.familyId, familyId),
});
```

### ✅ Limit Results
```typescript
// ✅ GOOD - Paginate large result sets
import { desc, limit, offset } from 'drizzle-orm';

const recentEvents = await db.query.events.findMany({
  orderBy: [desc(events.createdAt)],
  limit: 20,
  offset: page * 20,
});
```

## Common Query Helpers

### lib/db/queries.ts
```typescript
import { and, eq, gte, lte } from 'drizzle-orm';

export async function getFamilyEvents(
  familyId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    parentId?: string;
  }
) {
  const conditions = [eq(events.familyId, familyId)];
  
  if (options?.startDate) {
    conditions.push(gte(events.startTime, options.startDate.toISOString()));
  }
  
  if (options?.endDate) {
    conditions.push(lte(events.startTime, options.endDate.toISOString()));
  }
  
  if (options?.parentId) {
    conditions.push(eq(events.parentId, options.parentId));
  }
  
  return db.query.events.findMany({
    where: and(...conditions),
    orderBy: [asc(events.startTime)],
    with: { parent: true },
  });
}

export async function getUpcomingEvents(userId: string) {
  return db.query.events.findMany({
    where: and(
      eq(events.parentId, userId),
      gte(events.startTime, new Date().toISOString())
    ),
    orderBy: [asc(events.startTime)],
    limit: 10,
  });
}
```

## Testing Database Code

### Use Neon Branching for Tests
```typescript
// lib/db/test-client.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const testSql = neon(process.env.TEST_DATABASE_URL!);
export const testDb = drizzle(testSql, { schema });

// Cleanup between tests
export async function cleanupTestDb() {
  await testDb.delete(events);
  await testDb.delete(users);
  await testDb.delete(families);
}
```

## Common Mistakes to Avoid

### ❌ Don't Mix String and Date Types
```typescript
// ❌ BAD - Inconsistent date handling
const event = await db.insert(events).values({
  startTime: new Date(), // JavaScript Date
  endTime: '2025-12-20T10:00:00Z', // ISO string
});

// ✅ GOOD - Use consistent format (ISO strings)
const event = await db.insert(events).values({
  startTime: new Date().toISOString(),
  endTime: '2025-12-20T10:00:00Z',
});
```

### ❌ Don't Forget ON DELETE CASCADE
```typescript
// ❌ BAD - Orphaned records on parent deletion
export const events = pgTable('events', {
  familyId: uuid('family_id').references(() => families.id),
});

// ✅ GOOD - Cascade deletes
export const events = pgTable('events', {
  familyId: uuid('family_id')
    .references(() => families.id, { onDelete: 'cascade' })
    .notNull(),
});
```

### ❌ Don't Use SELECT *
```typescript
// ❌ BAD - Over-fetching data
const events = await db.select().from(events);

// ✅ GOOD - Select only needed columns
const events = await db.query.events.findMany({
  columns: { id: true, title: true, startTime: true },
});
```

## Neon-Specific Features

### Use Neon's Connection Pooling
```typescript
// lib/db/client.ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

// For WebSocket connections (serverless functions)
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### Leverage Neon Branching
```bash
# Create a branch for testing
neon branches create --name test-branch

# Get connection string
neon connection-string test-branch

# Use in tests
TEST_DATABASE_URL="postgresql://..."
```

## Database Checklist

Before committing database changes:
- [ ] Schema changes in schema.ts
- [ ] Migration generated via `pnpm db:generate`
- [ ] Migration reviewed (check SQL in drizzle/)
- [ ] Foreign keys have ON DELETE CASCADE where appropriate
- [ ] Indexes added for common query patterns
- [ ] Zod schemas match database schema
- [ ] Types inferred from schema (no manual types)
- [ ] Queries use relational API (not raw SQL)
- [ ] Transactions used for related operations
- [ ] Tests use separate test database
