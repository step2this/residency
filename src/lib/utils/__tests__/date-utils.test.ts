import { describe, it, expect } from 'vitest';
import 'temporal-polyfill/global';
import {
  toPlainDate,
  toISODateString,
  dateToPlainDate,
  dateToZonedDateTime,
  today,
  addMonths,
  subtractMonths,
  addDays,
  subtractDays,
  getDateRange,
  formatDate,
  datesEqual,
  isBefore,
  isAfter,
} from '../date-utils';

describe('date-utils', () => {
  describe('conversions maintain data integrity', () => {
    it('converts ISO string to PlainDate and back without data loss', () => {
      const isoString = '2025-01-15';
      const plainDate = toPlainDate(isoString);
      const backToString = toISODateString(plainDate);

      expect(backToString).toBe(isoString);
    });

    it('converts JavaScript Date to PlainDate preserving only the date part', () => {
      const jsDate = new Date('2025-01-15T14:30:00Z');
      const plainDate = dateToPlainDate(jsDate);

      expect(toISODateString(plainDate)).toBe('2025-01-15');
    });

    it('converts JavaScript Date to ZonedDateTime preserving time information', () => {
      const jsDate = new Date('2025-01-15T14:30:00Z');
      const zonedDateTime = dateToZonedDateTime(jsDate);

      // Should preserve the timestamp
      expect(zonedDateTime.epochMilliseconds).toBe(jsDate.getTime());
    });
  });

  describe('date arithmetic handles edge cases correctly', () => {
    const edgeCases = [
      {
        desc: 'Jan 31 + 1 month = Feb 28 (non-leap year)',
        start: '2025-01-31',
        months: 1,
        expected: '2025-02-28',
      },
      {
        desc: 'Jan 31 + 1 month = Feb 29 (leap year)',
        start: '2024-01-31',
        months: 1,
        expected: '2024-02-29',
      },
      {
        desc: 'Mar 31 - 1 month = Feb 28 (non-leap year)',
        start: '2025-03-31',
        months: -1,
        expected: '2025-02-28',
      },
      {
        desc: 'Dec 15 + 2 months crosses year boundary',
        start: '2024-12-15',
        months: 2,
        expected: '2025-02-15',
      },
      {
        desc: 'Feb 15 - 2 months crosses year boundary',
        start: '2025-02-15',
        months: -2,
        expected: '2024-12-15',
      },
    ];

    edgeCases.forEach(({ desc, start, months, expected }) => {
      it(desc, () => {
        const date = toPlainDate(start);
        const result =
          months > 0 ? addMonths(date, months) : subtractMonths(date, Math.abs(months));

        expect(toISODateString(result)).toBe(expected);
      });
    });

    it('adds days correctly across month boundaries', () => {
      const date = toPlainDate('2025-01-28');
      const result = addDays(date, 5);

      expect(toISODateString(result)).toBe('2025-02-02');
    });

    it('subtracts days correctly across month boundaries', () => {
      const date = toPlainDate('2025-02-02');
      const result = subtractDays(date, 5);

      expect(toISODateString(result)).toBe('2025-01-28');
    });
  });

  describe('date range calculations produce correct boundaries', () => {
    it('calculates range with default 1 month before and 2 months after', () => {
      const centerDate = toPlainDate('2025-02-15');
      const { startDate, endDate } = getDateRange(centerDate);

      // Should be Jan 15 to Apr 15
      expect(startDate.toISOString().split('T')[0]).toBe('2025-01-15');
      expect(endDate.toISOString().split('T')[0]).toBe('2025-04-15');
    });

    it('handles custom range parameters', () => {
      const centerDate = toPlainDate('2025-06-15');
      const { startDate, endDate } = getDateRange(centerDate, 2, 3);

      // Should be Apr 15 to Sep 15
      expect(startDate.toISOString().split('T')[0]).toBe('2025-04-15');
      expect(endDate.toISOString().split('T')[0]).toBe('2025-09-15');
    });

    it('returns JavaScript Date objects for API compatibility', () => {
      const centerDate = toPlainDate('2025-02-15');
      const { startDate, endDate } = getDateRange(centerDate);

      expect(startDate).toBeInstanceOf(Date);
      expect(endDate).toBeInstanceOf(Date);
    });
  });

  describe('date comparisons work correctly', () => {
    const testCases = [
      { date1: '2025-01-15', date2: '2025-01-15', equal: true, before: false, after: false },
      { date1: '2025-01-14', date2: '2025-01-15', equal: false, before: true, after: false },
      { date1: '2025-01-16', date2: '2025-01-15', equal: false, before: false, after: true },
      {
        date1: '2024-12-31',
        date2: '2025-01-01',
        equal: false,
        before: true,
        after: false,
      },
    ];

    testCases.forEach(({ date1, date2, equal, before, after }) => {
      it(`correctly compares ${date1} to ${date2}`, () => {
        const d1 = toPlainDate(date1);
        const d2 = toPlainDate(date2);

        expect(datesEqual(d1, d2)).toBe(equal);
        expect(isBefore(d1, d2)).toBe(before);
        expect(isAfter(d1, d2)).toBe(after);
      });
    });
  });

  describe('utility functions behave as expected', () => {
    it('today() returns current date without time', () => {
      const todayDate = today();
      const nowDate = Temporal.Now.plainDateISO();

      expect(datesEqual(todayDate, nowDate)).toBe(true);
    });

    it('formatDate() produces human-readable output', () => {
      const date = toPlainDate('2025-01-15');
      const formatted = formatDate(date);

      // Should contain year, month name, and day (locale-dependent but validates format works)
      expect(formatted).toMatch(/2025/);
      expect(formatted).toMatch(/January|Jan/);
      expect(formatted).toMatch(/15/);
    });

    it('formatDate() respects custom formatting options', () => {
      const date = toPlainDate('2025-01-15');
      const formatted = formatDate(date, {
        year: '2-digit',
        month: 'short',
        day: 'numeric',
      });

      expect(formatted).toMatch(/25/); // 2-digit year
    });
  });

  describe('functions are immutable', () => {
    it('addMonths does not mutate the original date', () => {
      const original = toPlainDate('2025-01-15');
      const originalString = toISODateString(original);

      addMonths(original, 3);

      expect(toISODateString(original)).toBe(originalString);
    });

    it('subtractDays does not mutate the original date', () => {
      const original = toPlainDate('2025-01-15');
      const originalString = toISODateString(original);

      subtractDays(original, 5);

      expect(toISODateString(original)).toBe(originalString);
    });
  });
});
