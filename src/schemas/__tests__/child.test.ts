/**
 * Tests for child.ts Zod schemas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createChildSchema,
  updateChildSchema,
  deleteChildSchema,
} from '../child';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createChildSchema', () => {
  // Use fixed date for tests to avoid flakiness with "today" checks
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validChild = {
    firstName: 'Emma',
    lastName: 'Smith',
    dateOfBirth: new Date('2018-03-15'),
  };

  describe('valid inputs', () => {
    it('should accept valid child data', () => {
      const result = createChildSchema.safeParse(validChild);
      expect(result.success).toBe(true);
    });

    it('should coerce date string for dateOfBirth', () => {
      const result = createChildSchema.safeParse({
        firstName: 'Emma',
        lastName: 'Smith',
        dateOfBirth: '2018-03-15',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dateOfBirth instanceof Date).toBe(true);
      }
    });

    it('should accept name at max length (100)', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        firstName: 'a'.repeat(100),
        lastName: 'b'.repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it('should accept date of birth today', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        dateOfBirth: new Date('2025-06-15'), // Same as mocked "today"
      });
      expect(result.success).toBe(true);
    });

    it('should accept child born yesterday', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        dateOfBirth: new Date('2025-06-14'),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty firstName', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        firstName: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('required');
      }
    });

    it('should reject empty lastName', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        lastName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject firstName over 100 characters', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        firstName: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('too long');
      }
    });

    it('should reject lastName over 100 characters', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        lastName: 'b'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing firstName', () => {
      const { firstName, ...withoutFirst } = validChild;
      const result = createChildSchema.safeParse(withoutFirst);
      expect(result.success).toBe(false);
    });

    it('should reject missing lastName', () => {
      const { lastName, ...withoutLast } = validChild;
      const result = createChildSchema.safeParse(withoutLast);
      expect(result.success).toBe(false);
    });

    it('should reject missing dateOfBirth', () => {
      const { dateOfBirth, ...withoutDOB } = validChild;
      const result = createChildSchema.safeParse(withoutDOB);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        dateOfBirth: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('date of birth validation', () => {
    // Note: The schema uses .max(new Date()) which is evaluated at module load time,
    // not at validation time. So we must use dates that are actually in the future
    // from when the tests run, not relative to the mocked time.
    it('should reject future date of birth', () => {
      // Use a date far in the future to ensure it fails regardless of when tests run
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 5);

      const result = createChildSchema.safeParse({
        ...validChild,
        dateOfBirth: futureDate,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('future');
      }
    });

    it('should reject date far in the future', () => {
      const result = createChildSchema.safeParse({
        ...validChild,
        dateOfBirth: new Date('2050-01-01'),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('updateChildSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('valid inputs', () => {
    it('should accept update with only id', () => {
      const result = updateChildSchema.safeParse({ id: VALID_UUID });
      expect(result.success).toBe(true);
    });

    it('should accept update with all fields', () => {
      const result = updateChildSchema.safeParse({
        id: VALID_UUID,
        firstName: 'Updated',
        lastName: 'Name',
        dateOfBirth: new Date('2019-01-01'),
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial update - just firstName', () => {
      const result = updateChildSchema.safeParse({
        id: VALID_UUID,
        firstName: 'NewName',
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial update - just lastName', () => {
      const result = updateChildSchema.safeParse({
        id: VALID_UUID,
        lastName: 'NewLastName',
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial update - just dateOfBirth', () => {
      const result = updateChildSchema.safeParse({
        id: VALID_UUID,
        dateOfBirth: new Date('2020-01-01'),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid UUID', () => {
      const result = updateChildSchema.safeParse({
        id: 'not-valid',
        firstName: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = updateChildSchema.safeParse({
        firstName: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty firstName if provided', () => {
      const result = updateChildSchema.safeParse({
        id: VALID_UUID,
        firstName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject future dateOfBirth if provided', () => {
      const result = updateChildSchema.safeParse({
        id: VALID_UUID,
        dateOfBirth: new Date('2050-01-01'),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('deleteChildSchema', () => {
  it('should accept valid UUID', () => {
    const result = deleteChildSchema.safeParse({ id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = deleteChildSchema.safeParse({ id: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const result = deleteChildSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty string id', () => {
    const result = deleteChildSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});
