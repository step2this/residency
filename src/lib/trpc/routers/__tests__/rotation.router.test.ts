/**
 * Rotation Router Integration Tests
 *
 * Tests the rotation pattern business logic with a real database.
 * Key behaviors tested:
 * - Create: Permission checks, overlap validation, parent validation
 * - List: Security filtering, active rotations only
 * - GetCalendarEvents: Date range generation, access control
 * - Delete: Soft delete, permission checks, audit trail
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDatabase, destroyTestDatabase, clearTestDatabase } from '@/test/db';
import { createTestCaller } from '@/test/trpc';
import {
  createTestFamilySetup,
  createUser,
  createFamily,
  createFamilyMember,
} from '@/test/fixtures';
import { getTestDatabase } from '@/test/db';
import { rotationPatterns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Helper to create a rotation pattern in database
async function createRotationPattern(overrides: Partial<typeof rotationPatterns.$inferInsert> & {
  familyId: string;
  primaryParentId: string;
  secondaryParentId: string;
  createdBy: string;
}) {
  const db = getTestDatabase();
  const [rotation] = await db
    .insert(rotationPatterns)
    .values({
      name: overrides.name ?? 'Test Rotation',
      patternType: overrides.patternType ?? '2-2-3',
      startDate: overrides.startDate ?? '2025-01-01',
      endDate: overrides.endDate ?? null,
      isActive: overrides.isActive ?? true,
      ...overrides,
    })
    .returning();
  return rotation!;
}

describe('rotation router', () => {
  beforeAll(async () => {
    await createTestDatabase();
  });

  afterAll(async () => {
    await destroyTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('rotation.create', () => {
    it('creates rotation with valid data', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();
      const caller = createTestCaller(getTestDatabase(), parent1.id);

      const rotation = await caller.rotation.create({
        familyId: family.id,
        name: 'Summer Schedule',
        patternType: '2-2-3',
        startDate: '2025-06-01',
        endDate: '2025-08-31',
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
      });

      expect(rotation).toBeDefined();
      expect(rotation.name).toBe('Summer Schedule');
      expect(rotation.patternType).toBe('2-2-3');
      expect(rotation.startDate).toBe('2025-06-01');
      expect(rotation.endDate).toBe('2025-08-31');
      expect(rotation.primaryParentId).toBe(parent1.id);
      expect(rotation.secondaryParentId).toBe(parent2.id);
      expect(rotation.isActive).toBe(true);
      expect(rotation.createdBy).toBe(parent1.id);
    });

    it('rejects invalid pattern type', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();
      const caller = createTestCaller(getTestDatabase(), parent1.id);

      await expect(
        caller.rotation.create({
          familyId: family.id,
          name: 'Test',
          patternType: 'invalid-pattern' as any,
          startDate: '2025-01-01',
          primaryParentId: parent1.id,
          secondaryParentId: parent2.id,
        })
      ).rejects.toThrow();
    });

    it('rejects end date before start date', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();
      const caller = createTestCaller(getTestDatabase(), parent1.id);

      await expect(
        caller.rotation.create({
          familyId: family.id,
          name: 'Test',
          patternType: '2-2-3',
          startDate: '2025-12-31',
          endDate: '2025-01-01',
          primaryParentId: parent1.id,
          secondaryParentId: parent2.id,
        })
      ).rejects.toThrow('End date must be after start date');
    });

    it('rejects same parent for primary and secondary', async () => {
      const { parent1, family } = await createTestFamilySetup();
      const caller = createTestCaller(getTestDatabase(), parent1.id);

      await expect(
        caller.rotation.create({
          familyId: family.id,
          name: 'Test',
          patternType: '2-2-3',
          startDate: '2025-01-01',
          primaryParentId: parent1.id,
          secondaryParentId: parent1.id, // Same as primary
        })
      ).rejects.toThrow('Primary and secondary parents must be different');
    });

    it('rejects if user lacks edit permissions', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();

      // Create attorney with view-only access
      const attorney = await createUser({ firstName: 'Attorney', lastName: 'Smith' });
      await createFamilyMember({
        familyId: family.id,
        userId: attorney.id,
        role: 'attorney',
        canEditSchedule: false, // No edit permission
      });

      const caller = createTestCaller(getTestDatabase(), attorney.id);

      await expect(
        caller.rotation.create({
          familyId: family.id,
          name: 'Test',
          patternType: '2-2-3',
          startDate: '2025-01-01',
          primaryParentId: parent1.id,
          secondaryParentId: parent2.id,
        })
      ).rejects.toThrow('You do not have permission to edit schedules');
    });

    it('rejects if parents not in family', async () => {
      const { parent1, family } = await createTestFamilySetup();
      const outsider = await createUser({ firstName: 'Outsider', lastName: 'Parent' });

      const caller = createTestCaller(getTestDatabase(), parent1.id);

      await expect(
        caller.rotation.create({
          familyId: family.id,
          name: 'Test',
          patternType: '2-2-3',
          startDate: '2025-01-01',
          primaryParentId: parent1.id,
          secondaryParentId: outsider.id, // Not in family
        })
      ).rejects.toThrow('Both parents must be members of the family');
    });

    it('rejects overlapping rotations', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();
      const caller = createTestCaller(getTestDatabase(), parent1.id);

      // Create existing rotation: Jan 1 - Mar 31
      await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Existing Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
        endDate: '2025-03-31',
      });

      // Try to create overlapping rotation: Feb 1 - Apr 30
      await expect(
        caller.rotation.create({
          familyId: family.id,
          name: 'Overlapping Rotation',
          patternType: 'alternating-weeks',
          startDate: '2025-02-01',
          endDate: '2025-04-30',
          primaryParentId: parent1.id,
          secondaryParentId: parent2.id,
        })
      ).rejects.toThrow(/overlaps with an existing active rotation/);
    });
  });

  describe('rotation.list', () => {
    it('returns rotations for user\'s families', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();

      // Create rotation
      await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Test Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
      });

      const caller = createTestCaller(getTestDatabase(), parent1.id);
      const rotations = await caller.rotation.list();

      expect(rotations).toHaveLength(1);
      expect(rotations[0]!.name).toBe('Test Rotation');
      expect(rotations[0]!.family).toBeDefined();
      expect(rotations[0]!.primaryParent).toBeDefined();
      expect(rotations[0]!.secondaryParent).toBeDefined();
    });

    it('only returns active rotations', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();

      // Create active rotation
      await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Active Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
        isActive: true,
      });

      // Create inactive rotation
      await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Inactive Rotation',
        patternType: 'alternating-weeks',
        startDate: '2024-01-01',
        isActive: false,
      });

      const caller = createTestCaller(getTestDatabase(), parent1.id);
      const rotations = await caller.rotation.list();

      expect(rotations).toHaveLength(1);
      expect(rotations[0]!.name).toBe('Active Rotation');
      expect(rotations[0]!.isActive).toBe(true);
    });

    it('filters out rotations from families user doesn\'t belong to', async () => {
      const setup1 = await createTestFamilySetup();
      const setup2 = await createTestFamilySetup();

      // Create rotation in family 1
      await createRotationPattern({
        familyId: setup1.family.id,
        primaryParentId: setup1.parent1.id,
        secondaryParentId: setup1.parent2.id,
        createdBy: setup1.parent1.id,
        name: 'Family 1 Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
      });

      // Create rotation in family 2
      await createRotationPattern({
        familyId: setup2.family.id,
        primaryParentId: setup2.parent1.id,
        secondaryParentId: setup2.parent2.id,
        createdBy: setup2.parent1.id,
        name: 'Family 2 Rotation',
        patternType: 'alternating-weeks',
        startDate: '2025-01-01',
      });

      // Parent from family 1 should only see family 1 rotation
      const caller = createTestCaller(getTestDatabase(), setup1.parent1.id);
      const rotations = await caller.rotation.list();

      expect(rotations).toHaveLength(1);
      expect(rotations[0]!.name).toBe('Family 1 Rotation');
    });

    it('includes relations (family, parents)', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();

      await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Test Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
      });

      const caller = createTestCaller(getTestDatabase(), parent1.id);
      const rotations = await caller.rotation.list();

      expect(rotations[0]!.family).toBeDefined();
      expect(rotations[0]!.family.id).toBe(family.id);
      expect(rotations[0]!.primaryParent).toBeDefined();
      expect(rotations[0]!.primaryParent.id).toBe(parent1.id);
      expect(rotations[0]!.secondaryParent).toBeDefined();
      expect(rotations[0]!.secondaryParent.id).toBe(parent2.id);
    });
  });

  describe('rotation.getCalendarEvents', () => {
    it('generates correct events for date range', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();

      const rotation = await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Test Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
      });

      const caller = createTestCaller(getTestDatabase(), parent1.id);
      const events = await caller.rotation.getCalendarEvents({
        rotationId: rotation.id,
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      });

      expect(events).toHaveLength(7); // 7 days
      expect(events[0]!.date).toBe('2025-01-01');
      expect(events[0]!.rotationId).toBe(rotation.id);
      expect(events[0]!.rotationName).toBe('Test Rotation');

      // Verify 2-2-3 pattern: A, A, B, B, A, A, A
      expect(events[0]!.parentId).toBe(parent1.id); // A
      expect(events[1]!.parentId).toBe(parent1.id); // A
      expect(events[2]!.parentId).toBe(parent2.id); // B
      expect(events[3]!.parentId).toBe(parent2.id); // B
      expect(events[4]!.parentId).toBe(parent1.id); // A
      expect(events[5]!.parentId).toBe(parent1.id); // A
      expect(events[6]!.parentId).toBe(parent1.id); // A
    });

    it('rejects if user not family member', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();
      const outsider = await createUser({ firstName: 'Outsider', lastName: 'User' });

      const rotation = await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Test Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
      });

      const caller = createTestCaller(getTestDatabase(), outsider.id);

      await expect(
        caller.rotation.getCalendarEvents({
          rotationId: rotation.id,
          startDate: '2025-01-01',
          endDate: '2025-01-07',
        })
      ).rejects.toThrow('You do not have access to this rotation');
    });

    it('handles rotation without end date', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();

      const rotation = await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Ongoing Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
        endDate: null, // No end date
      });

      const caller = createTestCaller(getTestDatabase(), parent1.id);

      // Request events far in the future
      const events = await caller.rotation.getCalendarEvents({
        rotationId: rotation.id,
        startDate: '2026-01-01',
        endDate: '2026-01-07',
      });

      expect(events).toHaveLength(7);
      expect(events[0]!.date).toBe('2026-01-01');
    });

    it('returns empty array if rotation not found', async () => {
      const { parent1 } = await createTestFamilySetup();
      const caller = createTestCaller(getTestDatabase(), parent1.id);

      const events = await caller.rotation.getCalendarEvents({
        rotationId: '00000000-0000-0000-0000-000000000000', // Non-existent ID
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      });

      expect(events).toEqual([]);
    });
  });

  describe('rotation.delete', () => {
    it('soft deletes rotation (sets isActive = false)', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();
      const db = getTestDatabase();

      const rotation = await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Test Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
      });

      const caller = createTestCaller(db, parent1.id);
      const result = await caller.rotation.delete({
        rotationId: rotation.id,
      });

      expect(result.success).toBe(true);

      // Verify soft delete
      const deleted = await db.query.rotationPatterns.findFirst({
        where: eq(rotationPatterns.id, rotation.id),
      });

      expect(deleted).toBeDefined();
      expect(deleted!.isActive).toBe(false);
      expect(deleted!.name).toBe('Test Rotation'); // Data preserved
      expect(deleted!.updatedAt).toBeDefined();
    });

    it('rejects if user lacks edit permissions', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();

      const rotation = await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Test Rotation',
        patternType: '2-2-3',
        startDate: '2025-01-01',
      });

      // Create attorney with view-only access
      const attorney = await createUser({ firstName: 'Attorney', lastName: 'Smith' });
      await createFamilyMember({
        familyId: family.id,
        userId: attorney.id,
        role: 'attorney',
        canEditSchedule: false,
      });

      const caller = createTestCaller(getTestDatabase(), attorney.id);

      await expect(
        caller.rotation.delete({
          rotationId: rotation.id,
        })
      ).rejects.toThrow('You do not have permission to edit schedules');
    });

    it('returns 404 if rotation not found', async () => {
      const { parent1 } = await createTestFamilySetup();
      const caller = createTestCaller(getTestDatabase(), parent1.id);

      await expect(
        caller.rotation.delete({
          rotationId: '00000000-0000-0000-0000-000000000000',
        })
      ).rejects.toThrow('Rotation pattern not found');
    });

    it('preserves rotation data (audit trail)', async () => {
      const { parent1, parent2, family } = await createTestFamilySetup();
      const db = getTestDatabase();

      const rotation = await createRotationPattern({
        familyId: family.id,
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
        name: 'Important Rotation',
        patternType: 'alternating-weeks',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      const caller = createTestCaller(db, parent1.id);
      await caller.rotation.delete({ rotationId: rotation.id });

      // Verify all data is preserved
      const deleted = await db.query.rotationPatterns.findFirst({
        where: eq(rotationPatterns.id, rotation.id),
      });

      expect(deleted!.name).toBe('Important Rotation');
      expect(deleted!.patternType).toBe('alternating-weeks');
      expect(deleted!.startDate).toBe('2025-01-01');
      expect(deleted!.endDate).toBe('2025-12-31');
      expect(deleted!.primaryParentId).toBe(parent1.id);
      expect(deleted!.secondaryParentId).toBe(parent2.id);
      expect(deleted!.createdBy).toBe(parent1.id);
      expect(deleted!.isActive).toBe(false);
    });
  });
});
