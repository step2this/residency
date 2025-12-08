/**
 * Rotation Utils Tests
 *
 * TDD: RED phase - testing business logic
 * These tests verify:
 * - Pattern config retrieval
 * - Calendar event generation
 * - Overlap validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  getPatternConfig,
  generateCalendarEvents,
  validateNoOverlap,
  PATTERN_CONFIGS,
} from '../rotation-utils';
import { createTestDatabase, destroyTestDatabase, clearTestDatabase } from '@/test/db';
import { createFamily, createUser, createFamilyMember } from '@/test/fixtures';
import type { RotationPatternType } from '@/schemas/rotation';

describe('rotation-utils', () => {
  describe('getPatternConfig', () => {
    it('should return correct config for 2-2-3 pattern', () => {
      const config = getPatternConfig('2-2-3');

      expect(config.cycleDays).toBe(7);
      expect(config.pattern).toEqual(['A', 'A', 'B', 'B', 'A', 'A', 'A']);
      expect(config.displayName).toBe('2-2-3 Schedule');
    });

    it('should return correct config for 2-2-5-5 pattern', () => {
      const config = getPatternConfig('2-2-5-5');

      expect(config.cycleDays).toBe(14);
      expect(config.pattern).toHaveLength(14);
      expect(config.displayName).toBe('2-2-5-5 Schedule');
    });

    it('should return correct config for all pattern types', () => {
      const patternTypes: RotationPatternType[] = [
        '2-2-3',
        '2-2-5-5',
        '3-4-4-3',
        'alternating-weeks',
        'every-weekend',
      ];

      for (const type of patternTypes) {
        const config = getPatternConfig(type);
        expect(config).toBeDefined();
        expect(config.cycleDays).toBeGreaterThan(0);
        expect(config.pattern.length).toBe(config.cycleDays);
      }
    });
  });

  describe('generateCalendarEvents', () => {
    it('should generate events for a single week with 2-2-3 pattern', () => {
      const rotation = {
        id: 'rotation-1',
        name: 'Test Rotation',
        patternType: '2-2-3' as const,
        startDate: '2024-01-01', // Monday
        endDate: null,
        primaryParentId: 'parent-1',
        secondaryParentId: 'parent-2',
        primaryParent: { firstName: 'Alice', lastName: 'Smith' },
        secondaryParent: { firstName: 'Bob', lastName: 'Jones' },
      };

      const events = generateCalendarEvents(rotation, '2024-01-01', '2024-01-07');

      expect(events).toHaveLength(7);

      // Pattern: A A B B A A A
      expect(events[0]!.parentId).toBe('parent-1'); // Mon - A
      expect(events[1]!.parentId).toBe('parent-1'); // Tue - A
      expect(events[2]!.parentId).toBe('parent-2'); // Wed - B
      expect(events[3]!.parentId).toBe('parent-2'); // Thu - B
      expect(events[4]!.parentId).toBe('parent-1'); // Fri - A
      expect(events[5]!.parentId).toBe('parent-1'); // Sat - A
      expect(events[6]!.parentId).toBe('parent-1'); // Sun - A

      // Check event structure
      expect(events[0]?.date).toBe('2024-01-01');
      expect(events[0]?.parentName).toBe('Alice Smith');
      expect(events[0]?.dayOfCycle).toBe(0);
      expect(events[0]?.rotationId).toBe('rotation-1');
    });

    it('should handle rotation starting before range start', () => {
      const rotation = {
        id: 'rotation-1',
        name: 'Test Rotation',
        patternType: '2-2-3' as const,
        startDate: '2024-01-01',
        endDate: null,
        primaryParentId: 'parent-1',
        secondaryParentId: 'parent-2',
        primaryParent: { firstName: 'Alice', lastName: 'Smith' },
        secondaryParent: { firstName: 'Bob', lastName: 'Jones' },
      };

      // Request events starting Jan 8 (day 7 of cycle = day 0 again)
      const events = generateCalendarEvents(rotation, '2024-01-08', '2024-01-14');

      expect(events).toHaveLength(7);
      // Cycle repeats, so should match first week
      expect(events[0]?.parentId).toBe('parent-1'); // Jan 8 = day 0 of cycle
      expect(events[0]?.dayOfCycle).toBe(0);
    });

    it('should handle rotation ending within range', () => {
      const rotation = {
        id: 'rotation-1',
        name: 'Test Rotation',
        patternType: '2-2-3' as const,
        startDate: '2024-01-01',
        endDate: '2024-01-05', // Ends on Jan 5
        primaryParentId: 'parent-1',
        secondaryParentId: 'parent-2',
        primaryParent: { firstName: 'Alice', lastName: 'Smith' },
        secondaryParent: { firstName: 'Bob', lastName: 'Jones' },
      };

      const events = generateCalendarEvents(rotation, '2024-01-01', '2024-01-10');

      // Should only generate events until Jan 5
      expect(events).toHaveLength(5);
      expect(events[4]?.date).toBe('2024-01-05');
    });

    it('should handle range completely outside rotation period', () => {
      const rotation = {
        id: 'rotation-1',
        name: 'Test Rotation',
        patternType: '2-2-3' as const,
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        primaryParentId: 'parent-1',
        secondaryParentId: 'parent-2',
        primaryParent: { firstName: 'Alice', lastName: 'Smith' },
        secondaryParent: { firstName: 'Bob', lastName: 'Jones' },
      };

      const events = generateCalendarEvents(rotation, '2024-02-01', '2024-02-10');

      expect(events).toHaveLength(0);
    });

    it('should correctly calculate day of cycle for long periods', () => {
      const rotation = {
        id: 'rotation-1',
        name: 'Test Rotation',
        patternType: '2-2-3' as const, // 7-day cycle
        startDate: '2024-01-01',
        endDate: null,
        primaryParentId: 'parent-1',
        secondaryParentId: 'parent-2',
        primaryParent: { firstName: 'Alice', lastName: 'Smith' },
        secondaryParent: { firstName: 'Bob', lastName: 'Jones' },
      };

      // Day 14 should be day 0 of cycle (14 % 7 = 0)
      const events = generateCalendarEvents(rotation, '2024-01-15', '2024-01-15');

      expect(events).toHaveLength(1);
      expect(events[0]?.dayOfCycle).toBe(0); // 14 days since start, 14 % 7 = 0
    });

    it('should work with alternating weeks pattern', () => {
      const rotation = {
        id: 'rotation-1',
        name: 'Alternating Weeks',
        patternType: 'alternating-weeks' as const,
        startDate: '2024-01-01',
        endDate: null,
        primaryParentId: 'parent-1',
        secondaryParentId: 'parent-2',
        primaryParent: { firstName: 'Alice', lastName: 'Smith' },
        secondaryParent: { firstName: 'Bob', lastName: 'Jones' },
      };

      const events = generateCalendarEvents(rotation, '2024-01-01', '2024-01-14');

      expect(events).toHaveLength(14);

      // First 7 days should be parent-1 (A)
      for (let i = 0; i < 7; i++) {
        expect(events[i]?.parentId).toBe('parent-1');
      }

      // Next 7 days should be parent-2 (B)
      for (let i = 7; i < 14; i++) {
        expect(events[i]?.parentId).toBe('parent-2');
      }
    });
  });

  describe('validateNoOverlap', () => {
    beforeAll(async () => {
      await createTestDatabase();
    });

    afterAll(async () => {
      await destroyTestDatabase();
    });

    beforeEach(async () => {
      await clearTestDatabase();
    });

    it('should return false when no overlapping rotations exist', async () => {
      const db = (await import('@/test/db')).getTestDatabase();
      const family = await createFamily();
      const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
      const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

      await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
      await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

      const hasOverlap = await validateNoOverlap(family.id, '2024-01-01', '2024-12-31', db);

      expect(hasOverlap).toBe(false);
    });

    it('should return true when new rotation overlaps existing rotation', async () => {
      const db = (await import('@/test/db')).getTestDatabase();
      const { rotationPatterns } = await import('@/lib/db/schema');

      const family = await createFamily();
      const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
      const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

      await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
      await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

      // Create existing rotation: Jan 1 - Jun 30
      await db.insert(rotationPatterns).values({
        familyId: family.id,
        name: 'Existing Rotation',
        patternType: '2-2-3',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
      });

      // Try to create rotation that overlaps: May 1 - Dec 31
      const hasOverlap = await validateNoOverlap(family.id, '2024-05-01', '2024-12-31', db);

      expect(hasOverlap).toBe(true);
    });

    it('should return true when new rotation is contained within existing rotation', async () => {
      const db = (await import('@/test/db')).getTestDatabase();
      const { rotationPatterns } = await import('@/lib/db/schema');

      const family = await createFamily();
      const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
      const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

      await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
      await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

      // Create existing rotation: Jan 1 - Dec 31
      await db.insert(rotationPatterns).values({
        familyId: family.id,
        name: 'Existing Rotation',
        patternType: '2-2-3',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
      });

      // Try to create rotation inside existing: May 1 - Jun 30
      const hasOverlap = await validateNoOverlap(family.id, '2024-05-01', '2024-06-30', db);

      expect(hasOverlap).toBe(true);
    });

    it('should return false for adjacent non-overlapping rotations', async () => {
      const db = (await import('@/test/db')).getTestDatabase();
      const { rotationPatterns } = await import('@/lib/db/schema');

      const family = await createFamily();
      const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
      const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

      await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
      await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

      // Create existing rotation: Jan 1 - Jun 30
      await db.insert(rotationPatterns).values({
        familyId: family.id,
        name: 'Existing Rotation',
        patternType: '2-2-3',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
      });

      // Try to create rotation starting after existing ends: Jul 1 - Dec 31
      const hasOverlap = await validateNoOverlap(family.id, '2024-07-01', '2024-12-31', db);

      expect(hasOverlap).toBe(false);
    });

    it('should ignore inactive rotations when checking overlap', async () => {
      const db = (await import('@/test/db')).getTestDatabase();
      const { rotationPatterns } = await import('@/lib/db/schema');

      const family = await createFamily();
      const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
      const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

      await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
      await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

      // Create inactive rotation: Jan 1 - Dec 31
      await db.insert(rotationPatterns).values({
        familyId: family.id,
        name: 'Inactive Rotation',
        patternType: '2-2-3',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        isActive: false,
        createdBy: parent1.id,
      });

      // Should not overlap with inactive rotation
      const hasOverlap = await validateNoOverlap(family.id, '2024-05-01', '2024-06-30', db);

      expect(hasOverlap).toBe(false);
    });

    it('should handle open-ended rotations (no end date)', async () => {
      const db = (await import('@/test/db')).getTestDatabase();
      const { rotationPatterns } = await import('@/lib/db/schema');

      const family = await createFamily();
      const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
      const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

      await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
      await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

      // Create open-ended rotation starting Jan 1
      await db.insert(rotationPatterns).values({
        familyId: family.id,
        name: 'Ongoing Rotation',
        patternType: '2-2-3',
        startDate: '2024-01-01',
        endDate: null, // No end date
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
      });

      // Should overlap with any future rotation
      const hasOverlap = await validateNoOverlap(family.id, '2025-01-01', '2025-12-31', db);

      expect(hasOverlap).toBe(true);
    });
  });
});
