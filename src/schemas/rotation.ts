/**
 * Rotation Pattern Zod Schemas
 *
 * Shared validation schemas for rotation pattern operations.
 * Used by both client and server for consistent validation.
 */

import { z } from 'zod';

// ============================================================================
// Pattern Type Enum
// ============================================================================

export const rotationPatternTypeSchema = z.enum([
  '2-2-3',
  '2-2-5-5',
  '3-4-4-3',
  'alternating-weeks',
  'every-weekend',
]);

export type RotationPatternType = z.infer<typeof rotationPatternTypeSchema>;

// ============================================================================
// Create Rotation Pattern
// ============================================================================

export const createRotationPatternSchema = z
  .object({
    familyId: z.string().uuid('Invalid family ID'),
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name must be 255 characters or less'),
    patternType: rotationPatternTypeSchema,
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      .optional(),
    primaryParentId: z.string().uuid('Invalid parent ID'),
    secondaryParentId: z.string().uuid('Invalid parent ID'),
  })
  .refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => data.primaryParentId !== data.secondaryParentId,
    {
      message: 'Primary and secondary parents must be different',
      path: ['secondaryParentId'],
    }
  );

export type CreateRotationPatternInput = z.infer<typeof createRotationPatternSchema>;

// ============================================================================
// Get Calendar Events
// ============================================================================

export const getRotationCalendarEventsSchema = z.object({
  rotationId: z.string().uuid('Invalid rotation ID'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export type GetRotationCalendarEventsInput = z.infer<typeof getRotationCalendarEventsSchema>;

// ============================================================================
// Delete Rotation Pattern
// ============================================================================

export const deleteRotationPatternSchema = z.object({
  rotationId: z.string().uuid('Invalid rotation ID'),
});

export type DeleteRotationPatternInput = z.infer<typeof deleteRotationPatternSchema>;
