import { describe, it, expect } from 'vitest';
import { dateRangesOverlap, dateRangeContains } from '../date-range-utils';

describe('date-range-utils', () => {
  describe('dateRangesOverlap', () => {
    const testCases = [
      {
        desc: 'identical ranges overlap',
        rangeA: ['2025-12-01', '2025-12-31'],
        rangeB: ['2025-12-01', '2025-12-31'],
        expected: true,
      },
      {
        desc: 'range A completely contains range B',
        rangeA: ['2025-12-01', '2025-12-31'],
        rangeB: ['2025-12-10', '2025-12-20'],
        expected: true,
      },
      {
        desc: 'range B completely contains range A',
        rangeA: ['2025-12-10', '2025-12-20'],
        rangeB: ['2025-12-01', '2025-12-31'],
        expected: true,
      },
      {
        desc: 'ranges partially overlap (A starts first)',
        rangeA: ['2025-12-01', '2025-12-15'],
        rangeB: ['2025-12-10', '2025-12-31'],
        expected: true,
      },
      {
        desc: 'ranges partially overlap (B starts first)',
        rangeA: ['2025-12-10', '2025-12-31'],
        rangeB: ['2025-12-01', '2025-12-15'],
        expected: true,
      },
      {
        desc: 'ranges are adjacent but do not overlap (A before B)',
        rangeA: ['2025-12-01', '2025-12-10'],
        rangeB: ['2025-12-10', '2025-12-20'],
        expected: false,
      },
      {
        desc: 'ranges are adjacent but do not overlap (B before A)',
        rangeA: ['2025-12-10', '2025-12-20'],
        rangeB: ['2025-12-01', '2025-12-10'],
        expected: false,
      },
      {
        desc: 'range A is completely before range B',
        rangeA: ['2025-10-01', '2025-10-31'],
        rangeB: ['2025-12-01', '2025-12-31'],
        expected: false,
      },
      {
        desc: 'range A is completely after range B',
        rangeA: ['2025-12-01', '2025-12-31'],
        rangeB: ['2025-10-01', '2025-10-31'],
        expected: false,
      },
    ];

    testCases.forEach(({ desc, rangeA, rangeB, expected }) => {
      it(desc, () => {
        const [startA, endA] = rangeA.map((d) => new Date(d)) as [Date, Date];
        const [startB, endB] = rangeB.map((d) => new Date(d)) as [Date, Date];

        const result = dateRangesOverlap(startA, endA, startB, endB);

        expect(result).toBe(expected);
      });
    });

    it('handles time components correctly (overlapping by hours)', () => {
      const rangeA = {
        start: new Date('2025-12-09T09:00:00Z'),
        end: new Date('2025-12-09T17:00:00Z'),
      };
      const rangeB = {
        start: new Date('2025-12-09T14:00:00Z'),
        end: new Date('2025-12-09T20:00:00Z'),
      };

      expect(dateRangesOverlap(rangeA.start, rangeA.end, rangeB.start, rangeB.end)).toBe(true);
    });

    it('handles time components correctly (non-overlapping by hours)', () => {
      const rangeA = {
        start: new Date('2025-12-09T09:00:00Z'),
        end: new Date('2025-12-09T12:00:00Z'),
      };
      const rangeB = {
        start: new Date('2025-12-09T12:00:00Z'),
        end: new Date('2025-12-09T17:00:00Z'),
      };

      expect(dateRangesOverlap(rangeA.start, rangeA.end, rangeB.start, rangeB.end)).toBe(false);
    });
  });

  describe('dateRangeContains', () => {
    it('returns true when inner range is completely within outer range', () => {
      const inner = {
        start: new Date('2025-12-10'),
        end: new Date('2025-12-20'),
      };
      const outer = {
        start: new Date('2025-12-01'),
        end: new Date('2025-12-31'),
      };

      expect(dateRangeContains(inner.start, inner.end, outer.start, outer.end)).toBe(true);
    });

    it('returns false when inner range extends before outer range', () => {
      const inner = {
        start: new Date('2025-11-28'),
        end: new Date('2025-12-10'),
      };
      const outer = {
        start: new Date('2025-12-01'),
        end: new Date('2025-12-31'),
      };

      expect(dateRangeContains(inner.start, inner.end, outer.start, outer.end)).toBe(false);
    });

    it('returns false when inner range extends after outer range', () => {
      const inner = {
        start: new Date('2025-12-28'),
        end: new Date('2026-01-05'),
      };
      const outer = {
        start: new Date('2025-12-01'),
        end: new Date('2025-12-31'),
      };

      expect(dateRangeContains(inner.start, inner.end, outer.start, outer.end)).toBe(false);
    });

    it('returns true when ranges are identical', () => {
      const range = {
        start: new Date('2025-12-01'),
        end: new Date('2025-12-31'),
      };

      expect(dateRangeContains(range.start, range.end, range.start, range.end)).toBe(true);
    });
  });
});
