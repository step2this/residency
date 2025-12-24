# Database Schema Change

Guide for making database changes with Drizzle ORM.

## Load Context
Read `skills/DATABASE.md` for full patterns.

## Steps

### 1. Modify Schema
Edit `src/lib/db/schema.ts`:
- Add/modify table definitions
- Add relations if needed
- Use type inference: `typeof table.$inferSelect`

### 2. Create Zod Schema
Add validation in `src/schemas/<domain>.ts`:
- Match database schema
- Add business validation rules
- Export inferred types

### 3. Generate Migration
```bash
pnpm db:generate
```

Review the generated SQL in `drizzle/` folder.

### 4. Apply Migration
**Let the user run this command:**
```bash
pnpm db:push
```

### 5. Update tRPC Router
If needed, update `src/lib/trpc/routers/<domain>.ts`:
- Add new procedures
- Update existing procedures
- Use the new Zod schema for input validation

### 6. Run Tests
```bash
pnpm test --run
pnpm typecheck
```

## Checklist

- [ ] Schema changes in schema.ts
- [ ] Relations defined if needed
- [ ] Foreign keys have ON DELETE CASCADE where appropriate
- [ ] Indexes added for common query patterns
- [ ] Zod schemas match database schema
- [ ] Types inferred from schema (no manual types)
- [ ] Migration generated and reviewed
- [ ] tRPC procedures updated
- [ ] Tests passing

## Common Patterns

### Add a new table
```typescript
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id')
    .references(() => families.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type NewTable = typeof newTable.$inferSelect;
export type InsertNewTable = typeof newTable.$inferInsert;
```

### Add an enum
```typescript
export const statusEnum = pgEnum('status_enum', [
  'pending',
  'active',
  'completed',
]);
```
