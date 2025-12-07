/**
 * Tests for swap.ts Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  createSwapRequestSchema,
  approveSwapRequestSchema,
  rejectSwapRequestSchema,
  cancelSwapRequestSchema,
  listSwapRequestsSchema,
} from '../swap';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createSwapRequestSchema', () => {
  const validSwap = {
    eventId: VALID_UUID,
    newStartTime: new Date('2025-06-15T09:00:00Z'),
    newEndTime: new Date('2025-06-15T17:00:00Z'),
    reason: 'Work conflict - need to swap this day',
  };

  describe('valid inputs', () => {
    it('should accept valid swap request', () => {
      const result = createSwapRequestSchema.safeParse(validSwap);
      expect(result.success).toBe(true);
    });

    it('should coerce date strings', () => {
      const result = createSwapRequestSchema.safeParse({
        eventId: VALID_UUID,
        newStartTime: '2025-06-15T09:00:00Z',
        newEndTime: '2025-06-15T17:00:00Z',
        reason: 'Date string test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newStartTime instanceof Date).toBe(true);
      }
    });

    it('should accept reason at max length (500)', () => {
      const result = createSwapRequestSchema.safeParse({
        ...validSwap,
        reason: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid event UUID', () => {
      const result = createSwapRequestSchema.safeParse({
        ...validSwap,
        eventId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const result = createSwapRequestSchema.safeParse({
        ...validSwap,
        reason: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('required');
      }
    });

    it('should reject reason over 500 characters', () => {
      const result = createSwapRequestSchema.safeParse({
        ...validSwap,
        reason: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('too long');
      }
    });

    it('should reject missing newStartTime', () => {
      const { newStartTime, ...withoutStart } = validSwap;
      const result = createSwapRequestSchema.safeParse(withoutStart);
      expect(result.success).toBe(false);
    });

    it('should reject missing newEndTime', () => {
      const { newEndTime, ...withoutEnd } = validSwap;
      const result = createSwapRequestSchema.safeParse(withoutEnd);
      expect(result.success).toBe(false);
    });

    it('should reject missing eventId', () => {
      const { eventId, ...withoutEvent } = validSwap;
      const result = createSwapRequestSchema.safeParse(withoutEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('refinements', () => {
    it('should reject when new end time is before new start time', () => {
      const result = createSwapRequestSchema.safeParse({
        ...validSwap,
        newStartTime: new Date('2025-06-15T17:00:00Z'),
        newEndTime: new Date('2025-06-15T09:00:00Z'),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('New end time must be after');
      }
    });

    it('should reject when new end time equals new start time', () => {
      const sameTime = new Date('2025-06-15T09:00:00Z');
      const result = createSwapRequestSchema.safeParse({
        ...validSwap,
        newStartTime: sameTime,
        newEndTime: sameTime,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('approveSwapRequestSchema', () => {
  it('should accept valid UUID', () => {
    const result = approveSwapRequestSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = approveSwapRequestSchema.safeParse({ id: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const result = approveSwapRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('rejectSwapRequestSchema', () => {
  it('should accept valid UUID', () => {
    const result = rejectSwapRequestSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = rejectSwapRequestSchema.safeParse({ id: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const result = rejectSwapRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('cancelSwapRequestSchema', () => {
  it('should accept valid UUID', () => {
    const result = cancelSwapRequestSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = cancelSwapRequestSchema.safeParse({ id: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const result = cancelSwapRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('listSwapRequestsSchema', () => {
  describe('valid inputs', () => {
    it('should accept empty object (all defaults)', () => {
      const result = listSwapRequestsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept pending status', () => {
      const result = listSwapRequestsSchema.safeParse({ status: 'pending' });
      expect(result.success).toBe(true);
    });

    it('should accept approved status', () => {
      const result = listSwapRequestsSchema.safeParse({ status: 'approved' });
      expect(result.success).toBe(true);
    });

    it('should accept rejected status', () => {
      const result = listSwapRequestsSchema.safeParse({ status: 'rejected' });
      expect(result.success).toBe(true);
    });

    it('should accept cancelled status', () => {
      const result = listSwapRequestsSchema.safeParse({ status: 'cancelled' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid status', () => {
      const result = listSwapRequestsSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject status with wrong case', () => {
      const result = listSwapRequestsSchema.safeParse({ status: 'PENDING' });
      expect(result.success).toBe(false);
    });
  });
});
