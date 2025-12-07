/**
 * Tests for schedule.ts Zod schemas
 * Tests the actual application schemas, not mock examples
 */

import { describe, it, expect } from 'vitest';
import {
  recurrenceRuleSchema,
  createVisitationEventSchema,
  updateVisitationEventSchema,
  deleteVisitationEventSchema,
  listVisitationEventsSchema,
} from '../schedule';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_PARENT_UUID = '660e8400-e29b-41d4-a716-446655440001';

describe('recurrenceRuleSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid weekly recurrence', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
        interval: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept biweekly with days of week', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
        interval: 2,
        daysOfWeek: [0, 6], // Sunday and Saturday
      });
      expect(result.success).toBe(true);
    });

    it('should accept monthly with end date', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'monthly',
        interval: 1,
        endDate: new Date('2025-12-31'),
      });
      expect(result.success).toBe(true);
    });

    it('should accept daily with count', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'daily',
        interval: 1,
        count: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should default interval to 1', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.interval).toBe(1);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid frequency', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'yearly',
        interval: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject interval below 1', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
        interval: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject interval above 52', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
        interval: 53,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid day of week (>6)', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [7],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid day of week (<0)', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [-1],
      });
      expect(result.success).toBe(false);
    });

    it('should reject count above 365', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
        interval: 1,
        count: 366,
      });
      expect(result.success).toBe(false);
    });

    it('should reject count below 1', () => {
      const result = recurrenceRuleSchema.safeParse({
        frequency: 'weekly',
        interval: 1,
        count: 0,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('createVisitationEventSchema', () => {
  const validEvent = {
    childId: VALID_UUID,
    parentId: VALID_PARENT_UUID,
    startTime: new Date('2025-06-01T09:00:00Z'),
    endTime: new Date('2025-06-01T17:00:00Z'),
  };

  describe('valid inputs', () => {
    it('should accept minimal valid event', () => {
      const result = createVisitationEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should accept event with notes', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        notes: 'Pick up from school',
      });
      expect(result.success).toBe(true);
    });

    it('should accept recurring event with recurrence rule', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        isRecurring: true,
        recurrenceRule: {
          frequency: 'weekly',
          interval: 1,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept holiday exception', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        isHolidayException: true,
      });
      expect(result.success).toBe(true);
    });

    it('should coerce date strings to dates', () => {
      const result = createVisitationEventSchema.safeParse({
        childId: VALID_UUID,
        parentId: VALID_PARENT_UUID,
        startTime: '2025-06-01T09:00:00Z',
        endTime: '2025-06-01T17:00:00Z',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startTime instanceof Date).toBe(true);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid child UUID', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        childId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.path).toContain('childId');
      }
    });

    it('should reject invalid parent UUID', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        parentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing start time', () => {
      const { startTime, ...withoutStart } = validEvent;
      const result = createVisitationEventSchema.safeParse(withoutStart);
      expect(result.success).toBe(false);
    });

    it('should reject notes over 500 characters', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        notes: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('too long');
      }
    });
  });

  describe('refinements', () => {
    it('should reject when end time is before start time', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        startTime: new Date('2025-06-01T17:00:00Z'),
        endTime: new Date('2025-06-01T09:00:00Z'),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('End time must be after start time');
      }
    });

    it('should reject when end time equals start time', () => {
      const sameTime = new Date('2025-06-01T09:00:00Z');
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        startTime: sameTime,
        endTime: sameTime,
      });
      expect(result.success).toBe(false);
    });

    it('should reject recurring event without recurrence rule', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        isRecurring: true,
        // Missing recurrenceRule
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('Recurrence rule is required');
      }
    });

    it('should accept non-recurring event without recurrence rule', () => {
      const result = createVisitationEventSchema.safeParse({
        ...validEvent,
        isRecurring: false,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('updateVisitationEventSchema', () => {
  const validUpdate = {
    id: VALID_UUID,
    startTime: new Date('2025-06-01T10:00:00Z'),
    endTime: new Date('2025-06-01T18:00:00Z'),
  };

  describe('valid inputs', () => {
    it('should accept partial update with only id', () => {
      const result = updateVisitationEventSchema.safeParse({ id: VALID_UUID });
      expect(result.success).toBe(true);
    });

    it('should accept update with all fields', () => {
      const result = updateVisitationEventSchema.safeParse({
        ...validUpdate,
        childId: VALID_UUID,
        parentId: VALID_PARENT_UUID,
        isRecurring: true,
        recurrenceRule: { frequency: 'weekly', interval: 2 },
        isHolidayException: false,
        notes: 'Updated notes',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null for optional nullable fields', () => {
      const result = updateVisitationEventSchema.safeParse({
        id: VALID_UUID,
        notes: null,
        recurrenceRule: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('refinements', () => {
    it('should reject when both times provided and end before start', () => {
      const result = updateVisitationEventSchema.safeParse({
        id: VALID_UUID,
        startTime: new Date('2025-06-01T18:00:00Z'),
        endTime: new Date('2025-06-01T10:00:00Z'),
      });
      expect(result.success).toBe(false);
    });

    it('should allow update of just start time (no end time validation)', () => {
      const result = updateVisitationEventSchema.safeParse({
        id: VALID_UUID,
        startTime: new Date('2025-06-01T10:00:00Z'),
      });
      expect(result.success).toBe(true);
    });

    it('should allow update of just end time (no validation)', () => {
      const result = updateVisitationEventSchema.safeParse({
        id: VALID_UUID,
        endTime: new Date('2025-06-01T18:00:00Z'),
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('deleteVisitationEventSchema', () => {
  it('should accept valid UUID', () => {
    const result = deleteVisitationEventSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = deleteVisitationEventSchema.safeParse({ id: 'not-valid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const result = deleteVisitationEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('listVisitationEventsSchema', () => {
  const validQuery = {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
  };

  describe('valid inputs', () => {
    it('should accept date range', () => {
      const result = listVisitationEventsSchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should accept with child filter', () => {
      const result = listVisitationEventsSchema.safeParse({
        ...validQuery,
        childId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it('should accept same start and end date', () => {
      const sameDay = new Date('2025-01-15');
      const result = listVisitationEventsSchema.safeParse({
        startDate: sameDay,
        endDate: sameDay,
      });
      expect(result.success).toBe(true);
    });

    it('should coerce date strings', () => {
      const result = listVisitationEventsSchema.safeParse({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('refinements', () => {
    it('should reject when end date is before start date', () => {
      const result = listVisitationEventsSchema.safeParse({
        startDate: new Date('2025-01-31'),
        endDate: new Date('2025-01-01'),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('End date must be after');
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing startDate', () => {
      const result = listVisitationEventsSchema.safeParse({
        endDate: new Date('2025-01-31'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing endDate', () => {
      const result = listVisitationEventsSchema.safeParse({
        startDate: new Date('2025-01-01'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid childId UUID', () => {
      const result = listVisitationEventsSchema.safeParse({
        ...validQuery,
        childId: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
