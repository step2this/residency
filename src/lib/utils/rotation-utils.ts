/**
 * Rotation Pattern Utilities
 *
 * Business logic for rotation pattern calculations.
 * Handles pattern configs, event generation, and overlap validation.
 */

import type { RotationPatternType } from '@/schemas/rotation';
import { rotationPatterns } from '@/lib/db/schema';
import { and, eq, lte, gte, or, isNull } from 'drizzle-orm';
import { differenceInDays } from 'date-fns';

// ============================================================================
// Pattern Configurations
// ============================================================================

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

/**
 * Get the pattern configuration for a given rotation type
 */
export function getPatternConfig(patternType: RotationPatternType) {
  return PATTERN_CONFIGS[patternType];
}

// ============================================================================
// Calendar Event Generation
// ============================================================================

export type CalendarEvent = {
  date: string; // YYYY-MM-DD
  parentId: string;
  parentName: string;
  dayOfCycle: number;
  rotationId: string;
  rotationName: string;
};

/**
 * Generate calendar events for a rotation pattern within a date range
 */
// Maximum number of events to generate (prevents performance issues with large date ranges)
const MAX_EVENTS = 1000;

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

  // Determine the actual start and end dates for event generation
  const rotationStartDate = new Date(rotation.startDate);
  const rotationEndDate = rotation.endDate ? new Date(rotation.endDate) : null;
  const requestStartDate = new Date(rangeStart);
  const requestEndDate = new Date(rangeEnd);

  // Start from the later of rotation start or range start
  const startDate = new Date(
    Math.max(rotationStartDate.getTime(), requestStartDate.getTime())
  );

  // End at the earlier of rotation end (if exists) or range end
  const endDate = new Date(
    Math.min(
      rotationEndDate ? rotationEndDate.getTime() : Infinity,
      requestEndDate.getTime()
    )
  );

  // If the range doesn't overlap with the rotation, return empty array
  if (startDate > endDate) {
    return [];
  }

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Calculate which day of the cycle we're on
    const daysSinceStart = differenceInDays(currentDate, rotationStartDate);
    const dayOfCycle = daysSinceStart % config.cycleDays;

    // Determine which parent based on pattern
    const patternValue = config.pattern[dayOfCycle];
    const parentId = patternValue === 'A'
      ? rotation.primaryParentId
      : rotation.secondaryParentId;
    const parent = patternValue === 'A'
      ? rotation.primaryParent
      : rotation.secondaryParent;

    const firstName = parent.firstName ?? '';
    const lastName = parent.lastName ?? '';
    const dateStr = currentDate.toISOString().split('T')[0];

    events.push({
      date: dateStr!,
      parentId,
      parentName: `${firstName} ${lastName}`.trim() || 'Unknown',
      dayOfCycle,
      rotationId: rotation.id,
      rotationName: rotation.name,
    });

    // Safety limit to prevent performance issues with very large date ranges
    if (events.length >= MAX_EVENTS) {
      console.warn(
        `Event generation limited to ${MAX_EVENTS} events for rotation ${rotation.id}. ` +
        `Consider requesting a smaller date range.`
      );
      break;
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return events;
}

// ============================================================================
// Overlap Validation
// ============================================================================

/**
 * Check if a new rotation would overlap with existing active rotations
 * Returns true if there's an overlap, false otherwise
 */
export async function validateNoOverlap(
  familyId: string,
  startDate: string,
  endDate?: string,
  dbInstance?: any
): Promise<boolean> {
  // Lazy-load db only when not provided (avoids DATABASE_URL check in tests)
  const database = dbInstance || (await import('@/lib/db/client')).db;

  // Find all active rotations for this family
  const existingRotations = await database.query.rotationPatterns.findMany({
    where: and(
      eq(rotationPatterns.familyId, familyId),
      eq(rotationPatterns.isActive, true)
    ),
  });

  // Check each existing rotation for overlap
  for (const existing of existingRotations) {
    const existingStart = existing.startDate;
    const existingEnd = existing.endDate;

    // CRITICAL: If existing rotation has no end date, it extends forever
    // Any new rotation will overlap with it
    if (!existingEnd) {
      return true;
    }

    // CRITICAL: If new rotation has no end date, it extends forever
    // It will overlap with any existing rotation
    if (!endDate) {
      return true;
    }

    // Both rotations have end dates - check for specific overlaps
    // Case 1: New rotation starts during existing rotation
    if (startDate >= existingStart && startDate <= existingEnd) {
      return true;
    }

    // Case 2: New rotation ends during existing rotation
    if (endDate >= existingStart && endDate <= existingEnd) {
      return true;
    }

    // Case 3: New rotation completely contains existing rotation
    if (startDate <= existingStart && endDate >= existingEnd) {
      return true;
    }
  }

  return false;
}
