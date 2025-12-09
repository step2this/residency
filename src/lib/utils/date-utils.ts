/**
 * Date Utilities using Temporal API
 *
 * Centralized date handling using the Temporal API for:
 * - Safe date arithmetic (no mutation bugs)
 * - Type-safe date operations
 * - Timezone-aware conversions
 * - Testable pure functions
 *
 * Why Temporal over date-fns:
 * - Immutable by design (no Invalid Date edge cases)
 * - Native timezone support (DST-aware)
 * - Future JavaScript standard (Stage 3 TC39)
 * - Better performance (no unnecessary conversions)
 */

/**
 * Convert ISO date string (YYYY-MM-DD) to Temporal.PlainDate
 * @example toPlainDate('2025-01-15') → Temporal.PlainDate
 */
export function toPlainDate(isoString: string): Temporal.PlainDate {
  return Temporal.PlainDate.from(isoString);
}

/**
 * Convert Temporal.PlainDate to ISO date string (YYYY-MM-DD)
 * @example toISODateString(Temporal.PlainDate.from('2025-01-15')) → '2025-01-15'
 */
export function toISODateString(date: Temporal.PlainDate): string {
  return date.toString();
}

/**
 * Convert JavaScript Date to Temporal.PlainDate (date-only, no time)
 * @example dateToPlainDate(new Date('2025-01-15T10:30:00')) → Temporal.PlainDate '2025-01-15'
 */
export function dateToPlainDate(date: Date): Temporal.PlainDate {
  const isoString = date.toISOString().split('T')[0];
  return Temporal.PlainDate.from(isoString as string);
}

/**
 * Convert JavaScript Date to Temporal.ZonedDateTime (preserves time and timezone)
 * @example dateToZonedDateTime(new Date()) → Temporal.ZonedDateTime in local timezone
 */
export function dateToZonedDateTime(
  date: Date,
  timezone?: string
): Temporal.ZonedDateTime {
  const tz = timezone || Temporal.Now.timeZoneId();
  const instant = Temporal.Instant.fromEpochMilliseconds(date.getTime());
  return instant.toZonedDateTimeISO(tz);
}

/**
 * Get current date as Temporal.PlainDate
 * @example today() → Temporal.PlainDate for current date
 */
export function today(): Temporal.PlainDate {
  return Temporal.Now.plainDateISO();
}

/**
 * Add months to a PlainDate safely (handles edge cases like Jan 31 → Feb 28)
 * @example addMonths(toPlainDate('2025-01-31'), 1) → '2025-02-28'
 */
export function addMonths(
  date: Temporal.PlainDate,
  months: number
): Temporal.PlainDate {
  return date.add({ months });
}

/**
 * Subtract months from a PlainDate safely
 * @example subtractMonths(toPlainDate('2025-03-31'), 1) → '2025-02-28'
 */
export function subtractMonths(
  date: Temporal.PlainDate,
  months: number
): Temporal.PlainDate {
  return date.subtract({ months });
}

/**
 * Add days to a PlainDate
 * @example addDays(toPlainDate('2025-01-15'), 7) → '2025-01-22'
 */
export function addDays(date: Temporal.PlainDate, days: number): Temporal.PlainDate {
  return date.add({ days });
}

/**
 * Subtract days from a PlainDate
 * @example subtractDays(toPlainDate('2025-01-15'), 7) → '2025-01-08'
 */
export function subtractDays(
  date: Temporal.PlainDate,
  days: number
): Temporal.PlainDate {
  return date.subtract({ days });
}

/**
 * Get date range (start/end) for calendar queries
 * Calculates a range centered on the given date
 * @param centerDate - Center date for the range
 * @param monthsBefore - Months before center date (default: 1)
 * @param monthsAfter - Months after center date (default: 2)
 * @returns Object with start/end as JavaScript Date objects for API queries
 */
export function getDateRange(
  centerDate: Temporal.PlainDate,
  monthsBefore = 1,
  monthsAfter = 2
): { startDate: Date; endDate: Date } {
  const start = subtractMonths(centerDate, monthsBefore);
  const end = addMonths(centerDate, monthsAfter);

  // Convert to JavaScript Date for API compatibility
  return {
    startDate: new Date(start.toString()),
    endDate: new Date(end.toString()),
  };
}

/**
 * Format a PlainDate for display
 * @example formatDate(toPlainDate('2025-01-15')) → 'January 15, 2025'
 */
export function formatDate(
  date: Temporal.PlainDate,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  // Convert to Date for Intl.DateTimeFormat compatibility
  return new Date(date.toString()).toLocaleDateString(undefined, options);
}

/**
 * Check if two PlainDates are equal
 * @example datesEqual(toPlainDate('2025-01-15'), toPlainDate('2025-01-15')) → true
 */
export function datesEqual(
  date1: Temporal.PlainDate,
  date2: Temporal.PlainDate
): boolean {
  return Temporal.PlainDate.compare(date1, date2) === 0;
}

/**
 * Check if date1 is before date2
 * @example isBefore(toPlainDate('2025-01-15'), toPlainDate('2025-01-16')) → true
 */
export function isBefore(
  date1: Temporal.PlainDate,
  date2: Temporal.PlainDate
): boolean {
  return Temporal.PlainDate.compare(date1, date2) < 0;
}

/**
 * Check if date1 is after date2
 * @example isAfter(toPlainDate('2025-01-16'), toPlainDate('2025-01-15')) → true
 */
export function isAfter(
  date1: Temporal.PlainDate,
  date2: Temporal.PlainDate
): boolean {
  return Temporal.PlainDate.compare(date1, date2) > 0;
}
