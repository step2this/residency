import { z } from 'zod';

// Recurrence rule schema (RRULE format)
export const recurrenceRuleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: 'Invalid frequency' }),
  }),
  interval: z.number().int().min(1).max(52).default(1), // e.g., every 2 weeks
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), // 0 = Sunday, 6 = Saturday
  endDate: z.coerce.date().optional(), // When the recurrence ends
  count: z.number().int().min(1).max(365).optional(), // Number of occurrences
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

// Create visitation event schema
export const createVisitationEventSchema = z.object({
  childId: z.string().uuid('Invalid child ID'),
  parentId: z.string().uuid('Invalid parent ID'),
  startTime: z.coerce.date({
    required_error: 'Start time is required',
    invalid_type_error: 'Invalid start time',
  }),
  endTime: z.coerce.date({
    required_error: 'End time is required',
    invalid_type_error: 'Invalid end time',
  }),
  isRecurring: z.boolean().default(false),
  recurrenceRule: recurrenceRuleSchema.optional(),
  isHolidayException: z.boolean().default(false),
  notes: z.string().max(500, 'Notes are too long').optional(),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => !data.isRecurring || data.recurrenceRule !== undefined,
  {
    message: 'Recurrence rule is required for recurring events',
    path: ['recurrenceRule'],
  }
);

export type CreateVisitationEventInput = z.infer<typeof createVisitationEventSchema>;

// Update visitation event schema
export const updateVisitationEventSchema = z.object({
  id: z.string().uuid('Invalid event ID'),
  childId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: recurrenceRuleSchema.optional().nullable(),
  isHolidayException: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return data.endTime > data.startTime;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

export type UpdateVisitationEventInput = z.infer<typeof updateVisitationEventSchema>;

// Delete visitation event schema
export const deleteVisitationEventSchema = z.object({
  id: z.string().uuid('Invalid event ID'),
});

export type DeleteVisitationEventInput = z.infer<typeof deleteVisitationEventSchema>;

// List visitation events schema (query params)
export const listVisitationEventsSchema = z.object({
  startDate: z.coerce.date({
    required_error: 'Start date is required',
  }),
  endDate: z.coerce.date({
    required_error: 'End date is required',
  }),
  childId: z.string().uuid().optional(), // Filter by child
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

export type ListVisitationEventsInput = z.infer<typeof listVisitationEventsSchema>;
