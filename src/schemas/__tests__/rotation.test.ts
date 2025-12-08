/**
 * Rotation Zod Schema Tests
 *
 * TDD: RED phase - testing schema validation
 * These tests verify:
 * - Valid inputs pass validation
 * - Invalid inputs fail with appropriate errors
 * - Edge cases are handled correctly
 */

import { describe, it, expect } from 'vitest';
import {
  rotationPatternTypeSchema,
  createRotationPatternSchema,
  getRotationCalendarEventsSchema,
  deleteRotationPatternSchema,
} from '../rotation';
import {
  expectValidationError,
  expectFieldError,
  expectValidationSuccess,
  testUUID,
} from '@/test/helpers';

describe('rotation schemas', () => {
  describe('rotationPatternTypeSchema', () => {
    it('should accept valid pattern types', () => {
      const validTypes = ['2-2-3', '2-2-5-5', '3-4-4-3', 'alternating-weeks', 'every-weekend'];

      for (const type of validTypes) {
        const result = rotationPatternTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(type);
        }
      }
    });

    it('should reject invalid pattern types', () => {
      const invalidTypes = ['invalid', '1-1-1', 'weekly', '', null, undefined, 123];

      for (const type of invalidTypes) {
        const result = rotationPatternTypeSchema.safeParse(type);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('createRotationPatternSchema', () => {
    const validInput = {
      familyId: testUUID(),
      name: 'Summer 2024 Schedule',
      patternType: '2-2-3' as const,
      startDate: '2024-01-01',
      primaryParentId: testUUID(),
      secondaryParentId: '550e8400-e29b-41d4-a716-446655440001', // Different UUID
    };

    it('should accept valid input', () => {
      const result = createRotationPatternSchema.safeParse(validInput);
      expectValidationSuccess(result);
    });

    it('should accept valid input with end date', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        endDate: '2024-12-31',
      });
      expectValidationSuccess(result);
    });

    it('should reject missing required fields', () => {
      const requiredFields = ['familyId', 'name', 'patternType', 'startDate', 'primaryParentId', 'secondaryParentId'];

      for (const field of requiredFields) {
        const input = { ...validInput };
        delete input[field as keyof typeof input];
        const result = createRotationPatternSchema.safeParse(input);
        expectFieldError(result, field);
      }
    });

    it('should reject empty name', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        name: '',
      });
      expectValidationError(result, 'required');
    });

    it('should reject name exceeding 255 characters', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        name: 'a'.repeat(256),
      });
      expectValidationError(result, '255 characters');
    });

    it('should reject invalid date format for startDate', () => {
      const invalidDates = ['01/01/2024', '2024-1-1', 'not-a-date', ''];

      for (const date of invalidDates) {
        const result = createRotationPatternSchema.safeParse({
          ...validInput,
          startDate: date,
        });
        expect(result.success).toBe(false);
      }
    });

    it('should reject invalid date format for endDate', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        endDate: '01/01/2024',
      });
      expectValidationError(result, 'invalid date');
    });

    it('should reject end date before start date', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      });
      expectValidationError(result, 'end date must be after start date');
    });

    it('should reject same parent as primary and secondary', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        primaryParentId: testUUID(),
        secondaryParentId: testUUID(), // Same UUID
      });
      expectValidationError(result, 'primary and secondary parents must be different');
    });

    it('should reject invalid UUID format for familyId', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        familyId: 'not-a-uuid',
      });
      expectValidationError(result, 'invalid');
    });

    it('should reject invalid UUID format for parent IDs', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        primaryParentId: 'not-a-uuid',
      });
      expectValidationError(result, 'invalid');
    });

    it('should reject invalid pattern type', () => {
      const result = createRotationPatternSchema.safeParse({
        ...validInput,
        patternType: 'invalid-pattern',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getRotationCalendarEventsSchema', () => {
    const validInput = {
      rotationId: testUUID(),
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    };

    it('should accept valid input', () => {
      const result = getRotationCalendarEventsSchema.safeParse(validInput);
      expectValidationSuccess(result);
    });

    it('should reject missing required fields', () => {
      const requiredFields = ['rotationId', 'startDate', 'endDate'];

      for (const field of requiredFields) {
        const input = { ...validInput };
        delete input[field as keyof typeof input];
        const result = getRotationCalendarEventsSchema.safeParse(input);
        expectFieldError(result, field);
      }
    });

    it('should reject invalid UUID for rotationId', () => {
      const result = getRotationCalendarEventsSchema.safeParse({
        ...validInput,
        rotationId: 'not-a-uuid',
      });
      expectValidationError(result, 'invalid');
    });

    it('should reject invalid date formats', () => {
      const result = getRotationCalendarEventsSchema.safeParse({
        ...validInput,
        startDate: '01/01/2024',
      });
      expectValidationError(result, 'invalid date');
    });
  });

  describe('deleteRotationPatternSchema', () => {
    it('should accept valid input', () => {
      const result = deleteRotationPatternSchema.safeParse({
        rotationId: testUUID(),
      });
      expectValidationSuccess(result);
    });

    it('should reject missing rotationId', () => {
      const result = deleteRotationPatternSchema.safeParse({});
      expectFieldError(result, 'rotationId');
    });

    it('should reject invalid UUID', () => {
      const result = deleteRotationPatternSchema.safeParse({
        rotationId: 'not-a-uuid',
      });
      expectValidationError(result, 'invalid');
    });
  });
});
