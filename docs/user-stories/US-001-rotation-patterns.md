# US-001: Create Rotation Patterns (MVP)

**Epic**: Schedule Management
**Story Points**: 8
**Priority**: P0 (Critical Path)
**Created**: 2025-12-08

---

## User Story

**As a** co-parent
**I want to** create a recurring visitation rotation pattern from preset templates
**So that** I can establish a consistent custody schedule without manually creating individual calendar events

---

## Context

Most child visitation schedules operate on recurring cycles. Common patterns include:
- **50/50 splits**: 2-2-3, 2-2-5-5, 3-4-4-3, alternating weeks
- **80/20 splits**: Every weekend with midweek visits
- **70/30 splits**: Alternating weekends

Parents need a simple way to establish these patterns with a start date and optional end date. The system should automatically calculate which parent has custody on any given day based on the pattern.

---

## Acceptance Criteria

### 1. Pattern Selection
- [ ] **Given** I'm viewing the schedule page
      **When** I click "Create Rotation"
      **Then** I see a form with preset pattern options

- [ ] **Given** I'm selecting a rotation pattern
      **When** I choose a preset template
      **Then** I see a preview showing the pattern cycle (e.g., "14-day cycle: AABBAAAABBBBB")

### 2. Pattern Configuration
- [ ] **Given** I've selected a pattern template
      **When** I configure the rotation
      **Then** I can set:
  - Pattern type (dropdown with presets)
  - Start date (required, date picker)
  - End date (optional, date picker)
  - Primary parent (who gets the first segment of the pattern)

- [ ] **Given** I'm configuring a rotation
      **When** I select a start date
      **Then** the system validates that no overlapping rotation exists for those dates

### 3. Pattern Creation
- [ ] **Given** I've filled in all required fields
      **When** I submit the form
      **Then** the rotation is created and saved to the database

- [ ] **Given** a rotation is successfully created
      **When** I return to the schedule view
      **Then** I see calendar events generated from the rotation pattern

### 4. Pattern Viewing
- [ ] **Given** I have created rotation patterns
      **When** I view the schedule calendar
      **Then** I see which parent has custody for each day

- [ ] **Given** I'm viewing the calendar
      **When** I click on a day that's part of a rotation
      **Then** I see rotation details (pattern name, which parent, part of cycle)

### 5. Pattern Deletion (MVP)
- [ ] **Given** I have a rotation pattern
      **When** I click "Delete Rotation"
      **Then** I see a confirmation dialog warning about removing all future events

- [ ] **Given** I confirm rotation deletion
      **When** the deletion completes
      **Then** the rotation and its generated events are removed from the calendar

### 6. Security & Validation
- [ ] **Given** I'm creating a rotation
      **When** I submit the form
      **Then** the system verifies I'm a member of the family with edit permissions

- [ ] **Given** I'm viewing rotations
      **When** the data is loaded
      **Then** I only see rotations for families I belong to

---

## Preset Pattern Definitions

### 1. **2-2-3 Schedule** (7-day cycle, 50/50 split)
- **Pattern**: `[A, A, B, B, A, A, A]`
- **Cycle Days**: 7
- **Description**: Parent A gets 2 days, Parent B gets 2 days, Parent A gets 3 days, then repeat

### 2. **2-2-5-5 Schedule** (14-day cycle, 50/50 split)
- **Pattern**: `[A, A, B, B, A, A, A, A, A, B, B, B, B, B]`
- **Cycle Days**: 14
- **Description**: Parent A: 2 days, Parent B: 2 days, Parent A: 5 days, Parent B: 5 days, then repeat

### 3. **3-4-4-3 Schedule** (14-day cycle, 50/50 split)
- **Pattern**: `[A, A, A, B, B, B, B, A, A, A, A, B, B, B]`
- **Cycle Days**: 14
- **Description**: Parent A: 3 days, Parent B: 4 days, Parent A: 4 days, Parent B: 3 days, then repeat

### 4. **Alternating Weeks** (14-day cycle, 50/50 split)
- **Pattern**: `[A, A, A, A, A, A, A, B, B, B, B, B, B, B]`
- **Cycle Days**: 14
- **Description**: Parent A gets one week, Parent B gets one week, then repeat

### 5. **Every Weekend** (14-day cycle, ~70/30 split)
- **Pattern**: `[A, A, A, A, B, B, B, A, A, A, A, B, B, B]`
- **Cycle Days**: 14
- **Description**: Parent B gets Friday-Sunday every week, Parent A gets Monday-Thursday
- **Note**: Friday starts at day index matching a Friday in the start week

---

## Technical Implementation

### Database Schema Changes

#### New Table: `rotation_patterns`

```typescript
export const rotationPatternTypeEnum = pgEnum('rotation_pattern_type', [
  '2-2-3',
  '2-2-5-5',
  '3-4-4-3',
  'alternating-weeks',
  'every-weekend',
]);

export const rotationPatterns = pgTable(
  'rotation_patterns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(), // User-friendly name
    patternType: rotationPatternTypeEnum('pattern_type').notNull(),
    startDate: date('start_date').notNull(), // When the rotation begins
    endDate: date('end_date'), // Optional end date
    primaryParentId: varchar('primary_parent_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    secondaryParentId: varchar('secondary_parent_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: varchar('created_by', { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('rotation_patterns_family_id_idx').on(table.familyId),
    startDateIdx: index('rotation_patterns_start_date_idx').on(table.startDate),
    isActiveIdx: index('rotation_patterns_is_active_idx').on(table.isActive),
  })
);
```

#### Relations

```typescript
export const rotationPatternsRelations = relations(rotationPatterns, ({ one }) => ({
  family: one(families, {
    fields: [rotationPatterns.familyId],
    references: [families.id],
  }),
  primaryParent: one(users, {
    fields: [rotationPatterns.primaryParentId],
    references: [users.id],
    relationName: 'primaryParent',
  }),
  secondaryParent: one(users, {
    fields: [rotationPatterns.secondaryParentId],
    references: [users.id],
    relationName: 'secondaryParent',
  }),
  creator: one(users, {
    fields: [rotationPatterns.createdBy],
    references: [users.id],
    relationName: 'createdBy',
  }),
}));
```

### Zod Schemas

**Location**: `src/schemas/rotation.ts`

```typescript
import { z } from 'zod';

// Pattern type enum
export const rotationPatternTypeSchema = z.enum([
  '2-2-3',
  '2-2-5-5',
  '3-4-4-3',
  'alternating-weeks',
  'every-weekend',
]);

// Create rotation input
export const createRotationPatternSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  patternType: rotationPatternTypeSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  primaryParentId: z.string().uuid('Invalid parent ID'),
  secondaryParentId: z.string().uuid('Invalid parent ID'),
}).refine(
  (data) => !data.endDate || data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  (data) => data.primaryParentId !== data.secondaryParentId,
  {
    message: 'Primary and secondary parents must be different',
    path: ['secondaryParentId'],
  }
);

// Get calendar events input
export const getRotationCalendarEventsSchema = z.object({
  rotationId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Delete rotation input
export const deleteRotationPatternSchema = z.object({
  rotationId: z.string().uuid(),
});

// Infer types
export type RotationPatternType = z.infer<typeof rotationPatternTypeSchema>;
export type CreateRotationPatternInput = z.infer<typeof createRotationPatternSchema>;
export type GetRotationCalendarEventsInput = z.infer<typeof getRotationCalendarEventsSchema>;
export type DeleteRotationPatternInput = z.infer<typeof deleteRotationPatternSchema>;
```

### tRPC Procedures

**Location**: `src/lib/trpc/routers/rotation.ts`

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/lib/db';
import { rotationPatterns, familyMembers } from '@/lib/db/schema';
import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  createRotationPatternSchema,
  getRotationCalendarEventsSchema,
  deleteRotationPatternSchema,
} from '@/schemas/rotation';
import {
  getPatternConfig,
  generateCalendarEvents,
  validateNoOverlap,
} from '@/lib/utils/rotation-utils';

export const rotationRouter = router({
  // Create a new rotation pattern
  create: protectedProcedure
    .input(createRotationPatternSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Verify user has edit permissions for the family
      const membership = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.userId, ctx.userId),
          eq(familyMembers.familyId, input.familyId), // Will need to add this
          eq(familyMembers.canEditSchedule, true)
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create rotations for this family',
        });
      }

      // 2. Verify both parents are members of the family
      const parents = await db.query.familyMembers.findMany({
        where: and(
          eq(familyMembers.familyId, membership.familyId),
          or(
            eq(familyMembers.userId, input.primaryParentId),
            eq(familyMembers.userId, input.secondaryParentId)
          )
        ),
      });

      if (parents.length !== 2) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Both parents must be members of the family',
        });
      }

      // 3. Check for overlapping rotations
      const hasOverlap = await validateNoOverlap(
        membership.familyId,
        input.startDate,
        input.endDate
      );

      if (hasOverlap) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This rotation overlaps with an existing rotation',
        });
      }

      // 4. Create the rotation pattern
      const [rotation] = await db
        .insert(rotationPatterns)
        .values({
          familyId: membership.familyId,
          name: input.name,
          patternType: input.patternType,
          startDate: input.startDate,
          endDate: input.endDate,
          primaryParentId: input.primaryParentId,
          secondaryParentId: input.secondaryParentId,
          createdBy: ctx.userId,
        })
        .returning();

      // 5. Log audit trail
      // TODO: Add audit log entry

      return rotation;
    }),

  // List all rotations for user's families
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Get all families the user belongs to
      const memberships = await db.query.familyMembers.findMany({
        where: eq(familyMembers.userId, ctx.userId),
        with: {
          family: true,
        },
      });

      const familyIds = memberships.map(m => m.familyId);

      // Get all rotations for these families
      const rotations = await db.query.rotationPatterns.findMany({
        where: and(
          eq(rotationPatterns.isActive, true),
          // Need to use OR for multiple family IDs
        ),
        with: {
          family: true,
          primaryParent: true,
          secondaryParent: true,
        },
        orderBy: (patterns, { desc }) => [desc(patterns.startDate)],
      });

      return rotations;
    }),

  // Get calendar events for a rotation within a date range
  getCalendarEvents: protectedProcedure
    .input(getRotationCalendarEventsSchema)
    .query(async ({ ctx, input }) => {
      // 1. Get the rotation and verify access
      const rotation = await db.query.rotationPatterns.findFirst({
        where: eq(rotationPatterns.id, input.rotationId),
        with: {
          family: {
            with: {
              members: true,
            },
          },
          primaryParent: true,
          secondaryParent: true,
        },
      });

      if (!rotation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Rotation not found',
        });
      }

      // Verify user is a member of the family
      const isMember = rotation.family.members.some(m => m.userId === ctx.userId);
      if (!isMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this rotation',
        });
      }

      // 2. Generate calendar events
      const events = generateCalendarEvents(
        rotation,
        input.startDate,
        input.endDate
      );

      return events;
    }),

  // Delete a rotation pattern
  delete: protectedProcedure
    .input(deleteRotationPatternSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Get rotation and verify permissions
      const rotation = await db.query.rotationPatterns.findFirst({
        where: eq(rotationPatterns.id, input.rotationId),
        with: {
          family: {
            with: {
              members: true,
            },
          },
        },
      });

      if (!rotation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Rotation not found',
        });
      }

      // Verify user has edit permissions
      const membership = rotation.family.members.find(
        m => m.userId === ctx.userId && m.canEditSchedule
      );

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this rotation',
        });
      }

      // 2. Soft delete (set isActive to false)
      await db
        .update(rotationPatterns)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(rotationPatterns.id, input.rotationId));

      // 3. Log audit trail
      // TODO: Add audit log entry

      return { success: true };
    }),
});
```

### Utility Functions

**Location**: `src/lib/utils/rotation-utils.ts`

```typescript
import { RotationPatternType } from '@/schemas/rotation';
import { rotationPatterns } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { and, eq, lte, gte, or, isNull } from 'drizzle-orm';

// Pattern configurations
export const PATTERN_CONFIGS = {
  '2-2-3': {
    cycleDays: 7,
    pattern: ['A', 'A', 'B', 'B', 'A', 'A', 'A'] as const,
    displayName: '2-2-3 Schedule',
    description: '7-day cycle: 2 days / 2 days / 3 days (50/50 split)',
  },
  '2-2-5-5': {
    cycleDays: 14,
    pattern: ['A', 'A', 'B', 'B', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B'] as const,
    displayName: '2-2-5-5 Schedule',
    description: '14-day cycle: 2 / 2 / 5 / 5 (50/50 split)',
  },
  '3-4-4-3': {
    cycleDays: 14,
    pattern: ['A', 'A', 'A', 'B', 'B', 'B', 'B', 'A', 'A', 'A', 'A', 'B', 'B', 'B'] as const,
    displayName: '3-4-4-3 Schedule',
    description: '14-day cycle: 3 / 4 / 4 / 3 (50/50 split)',
  },
  'alternating-weeks': {
    cycleDays: 14,
    pattern: ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B'] as const,
    displayName: 'Alternating Weeks',
    description: '14-day cycle: 1 week / 1 week (50/50 split)',
  },
  'every-weekend': {
    cycleDays: 14,
    pattern: ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'A', 'A', 'A', 'A', 'B', 'B', 'B'] as const,
    displayName: 'Every Weekend',
    description: '14-day cycle: Weekends to one parent (~70/30 split)',
  },
} as const;

export function getPatternConfig(patternType: RotationPatternType) {
  return PATTERN_CONFIGS[patternType];
}

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  parentId: string;
  parentName: string;
  dayOfCycle: number;
  rotationId: string;
  rotationName: string;
}

export function generateCalendarEvents(
  rotation: {
    id: string;
    name: string;
    patternType: RotationPatternType;
    startDate: string;
    endDate: string | null;
    primaryParentId: string;
    secondaryParentId: string;
    primaryParent: { firstName: string | null; lastName: string | null };
    secondaryParent: { firstName: string | null; lastName: string | null };
  },
  rangeStart: string,
  rangeEnd: string
): CalendarEvent[] {
  const config = getPatternConfig(rotation.patternType);
  const events: CalendarEvent[] = [];

  const startDate = new Date(Math.max(
    new Date(rotation.startDate).getTime(),
    new Date(rangeStart).getTime()
  ));

  const endDate = new Date(Math.min(
    rotation.endDate ? new Date(rotation.endDate).getTime() : Infinity,
    new Date(rangeEnd).getTime()
  ));

  const rotationStartDate = new Date(rotation.startDate);

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Calculate which day of the cycle we're on
    const daysSinceStart = Math.floor(
      (currentDate.getTime() - rotationStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dayOfCycle = daysSinceStart % config.cycleDays;

    // Determine which parent based on pattern
    const patternValue = config.pattern[dayOfCycle];
    const parentId = patternValue === 'A'
      ? rotation.primaryParentId
      : rotation.secondaryParentId;
    const parent = patternValue === 'A'
      ? rotation.primaryParent
      : rotation.secondaryParent;

    events.push({
      date: currentDate.toISOString().split('T')[0],
      parentId,
      parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
      dayOfCycle,
      rotationId: rotation.id,
      rotationName: rotation.name,
    });

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return events;
}

export async function validateNoOverlap(
  familyId: string,
  startDate: string,
  endDate?: string
): Promise<boolean> {
  const existingRotations = await db.query.rotationPatterns.findMany({
    where: and(
      eq(rotationPatterns.familyId, familyId),
      eq(rotationPatterns.isActive, true),
      or(
        // New rotation starts during existing rotation
        and(
          lte(rotationPatterns.startDate, startDate),
          or(
            isNull(rotationPatterns.endDate),
            gte(rotationPatterns.endDate, startDate)
          )
        ),
        // New rotation ends during existing rotation
        endDate ? and(
          lte(rotationPatterns.startDate, endDate),
          or(
            isNull(rotationPatterns.endDate),
            gte(rotationPatterns.endDate, endDate)
          )
        ) : undefined,
        // New rotation completely contains existing rotation
        endDate ? and(
          gte(rotationPatterns.startDate, startDate),
          lte(rotationPatterns.startDate, endDate)
        ) : undefined,
      )
    ),
  });

  return existingRotations.length > 0;
}
```

### UI Components

#### 1. Rotation Form Component

**Location**: `src/components/forms/rotation-form.tsx`

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRotationPatternSchema, type CreateRotationPatternInput } from '@/schemas/rotation';
import { trpc } from '@/lib/trpc/provider';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { PATTERN_CONFIGS } from '@/lib/utils/rotation-utils';

interface RotationFormProps {
  familyId: string;
  parents: Array<{ id: string; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RotationForm({ familyId, parents, onSuccess, onCancel }: RotationFormProps) {
  const form = useForm<CreateRotationPatternInput>({
    resolver: zodResolver(createRotationPatternSchema),
    defaultValues: {
      name: '',
      patternType: '2-2-3',
      startDate: '',
      endDate: undefined,
      primaryParentId: '',
      secondaryParentId: '',
    },
  });

  const createMutation = trpc.rotation.create.useMutation({
    onSuccess: () => {
      onSuccess();
      form.reset();
    },
  });

  const selectedPattern = form.watch('patternType');
  const patternConfig = selectedPattern ? PATTERN_CONFIGS[selectedPattern] : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
        <div className="space-y-4">
          {/* Pattern Type */}
          <FormField
            control={form.control}
            name="patternType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Pattern</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a pattern" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(PATTERN_CONFIGS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {patternConfig && (
                  <FormDescription>
                    {patternConfig.description}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rotation Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rotation Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Summer 2024 Schedule" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Primary Parent */}
          <FormField
            control={form.control}
            name="primaryParentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Parent (starts cycle)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Secondary Parent */}
          <FormField
            control={form.control}
            name="secondaryParentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secondary Parent</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Date */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className="pl-3 text-left font-normal">
                        {field.value ? format(new Date(field.value), 'PPP') : 'Pick a date'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Date (Optional) */}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className="pl-3 text-left font-normal">
                        {field.value ? format(new Date(field.value), 'PPP') : 'No end date'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Leave blank for ongoing rotation
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Rotation'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
```

---

## Out of Scope (Future Stories)

The following are explicitly NOT included in this MVP story:

- **US-002**: Edit existing rotation patterns
- **US-003**: Custom pattern builder (visual week grid)
- **US-004**: Holiday exceptions and overrides
- **US-005**: School break handling
- **US-006**: Specific pickup/dropoff times
- **US-007**: Per-child rotation patterns
- **US-008**: Rotation approval workflow
- **US-009**: Pattern conflict resolution
- **US-010**: Email notifications for rotation changes

---

## Testing Checklist

### Unit Tests
- [ ] Pattern configuration utilities
- [ ] Calendar event generation logic
- [ ] Date overlap validation
- [ ] Zod schema validation

### Integration Tests
- [ ] tRPC procedure: create rotation
- [ ] tRPC procedure: list rotations
- [ ] tRPC procedure: get calendar events
- [ ] tRPC procedure: delete rotation
- [ ] Database queries with Drizzle

### E2E Tests (Playwright)
- [ ] Complete rotation creation flow
- [ ] View calendar with rotation events
- [ ] Delete rotation flow
- [ ] Validation error handling

---

## Migration Script

**File**: `drizzle/migrations/XXXX_add_rotation_patterns.sql`

```sql
-- Create enum for rotation pattern types
CREATE TYPE rotation_pattern_type AS ENUM (
  '2-2-3',
  '2-2-5-5',
  '3-4-4-3',
  'alternating-weeks',
  'every-weekend'
);

-- Create rotation_patterns table
CREATE TABLE rotation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  pattern_type rotation_pattern_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  primary_parent_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secondary_parent_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(255) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX rotation_patterns_family_id_idx ON rotation_patterns(family_id);
CREATE INDEX rotation_patterns_start_date_idx ON rotation_patterns(start_date);
CREATE INDEX rotation_patterns_is_active_idx ON rotation_patterns(is_active);

-- Add CHECK constraint to ensure dates are valid
ALTER TABLE rotation_patterns
  ADD CONSTRAINT rotation_patterns_date_order_check
  CHECK (end_date IS NULL OR end_date > start_date);

-- Add CHECK constraint to ensure parents are different
ALTER TABLE rotation_patterns
  ADD CONSTRAINT rotation_patterns_different_parents_check
  CHECK (primary_parent_id != secondary_parent_id);
```

---

## Definition of Done

- [ ] Database schema updated and migration run
- [ ] Zod schemas created and exported
- [ ] tRPC router implemented with all procedures
- [ ] Utility functions for pattern calculation
- [ ] UI form component created
- [ ] Calendar integration displays rotation events
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests covering critical flows
- [ ] TypeScript type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Code reviewed and approved
- [ ] Committed with proper message format
- [ ] Documented in CURRENT.md

---

## Questions & Decisions

### Q1: How to handle overlapping rotations?
**Decision**: For MVP, prevent overlapping rotations entirely. Future stories will handle transition periods and handoff logic.

### Q2: Should rotations apply to specific children or all children in family?
**Decision**: MVP applies rotation to entire family. Future story will support per-child rotations.

### Q3: What happens if a parent is removed from the family?
**Decision**: CASCADE delete ensures rotation is deleted if parent is removed. Future story will handle parent replacement.

### Q4: How to handle timezone considerations?
**Decision**: MVP uses calendar days (no time component). Future story will add timezone support for specific pickup times.

### Q5: Should we materialize events or calculate on-demand?
**Decision**: Calculate on-demand (query-time) for MVP. Can optimize with materialized views or caching if performance becomes an issue.

---

## Dependencies

- Existing database schema (families, family_members, users)
- Clerk authentication (userId → family membership)
- tRPC v11 infrastructure
- Drizzle ORM with Neon Postgres
- shadcn/ui components (Form, Select, Calendar, etc.)
- date-fns for date formatting

---

## Notes

- This is the foundation story for schedule management
- Keep it simple - focus on core functionality
- Future stories will add complexity (editing, holidays, custom patterns)
- Calendar event generation should be performant (< 100ms for 3-month range)
- Consider adding caching layer if query performance becomes an issue
