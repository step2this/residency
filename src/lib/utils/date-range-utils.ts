/**
 * Date Range Utilities
 *
 * Pure functions for date range overlap detection and filtering.
 * Used for schedule queries and overlap validation.
 *
 * Core concept: Two date ranges overlap if startA < endB AND startB < endA
 * This handles all overlap scenarios:
 * - Range A completely contains Range B
 * - Range B completely contains Range A
 * - Ranges partially overlap (either direction)
 * - Ranges are identical
 */

/**
 * Check if two date ranges overlap
 *
 * @param startA - Start of first range
 * @param endA - End of first range
 * @param startB - Start of second range
 * @param endB - End of second range
 * @returns true if ranges overlap, false otherwise
 *
 * @example
 * // Ranges overlap
 * dateRangesOverlap(
 *   new Date('2025-12-01'),
 *   new Date('2025-12-10'),
 *   new Date('2025-12-05'),
 *   new Date('2025-12-15')
 * ) // → true
 *
 * @example
 * // Ranges don't overlap
 * dateRangesOverlap(
 *   new Date('2025-12-01'),
 *   new Date('2025-12-10'),
 *   new Date('2025-12-15'),
 *   new Date('2025-12-20')
 * ) // → false
 */
export function dateRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  // Two ranges overlap if: startA < endB AND startB < endA
  // This is equivalent to: NOT (endA <= startB OR endB <= startA)
  return startA < endB && startB < endA;
}

/**
 * Check if a date range is completely contained within another range
 *
 * @param innerStart - Start of inner range (to check if contained)
 * @param innerEnd - End of inner range (to check if contained)
 * @param outerStart - Start of outer range (container)
 * @param outerEnd - End of outer range (container)
 * @returns true if inner range is completely within outer range
 *
 * @example
 * // Inner range is contained
 * dateRangeContains(
 *   new Date('2025-12-05'),
 *   new Date('2025-12-10'),
 *   new Date('2025-12-01'),
 *   new Date('2025-12-31')
 * ) // → true
 */
export function dateRangeContains(
  innerStart: Date,
  innerEnd: Date,
  outerStart: Date,
  outerEnd: Date
): boolean {
  return innerStart >= outerStart && innerEnd <= outerEnd;
}
