/**
 * Rotation Patterns Database Schema Tests
 *
 * TDD: RED phase - testing schema constraints and structure
 * These tests verify:
 * - rotation_patterns table exists with correct columns
 * - Enum type exists
 * - Constraints work (dates, different parents)
 * - Foreign keys cascade properly
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDatabase, destroyTestDatabase, clearTestDatabase } from '@/test/db';
import { createUser, createFamily, createFamilyMember } from '@/test/fixtures';

describe('rotation_patterns schema', () => {
  beforeAll(async () => {
    await createTestDatabase();
  });

  afterAll(async () => {
    await destroyTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should create rotation_patterns table with rotation_pattern_type enum', async () => {
    const db = (await import('@/test/db')).getTestDatabase();

    // This will fail until we add the schema
    const { rotationPatterns } = await import('@/lib/db/schema');

    expect(rotationPatterns).toBeDefined();
    expect(rotationPatterns.id).toBeDefined();
    expect(rotationPatterns.familyId).toBeDefined();
    expect(rotationPatterns.patternType).toBeDefined();
    expect(rotationPatterns.startDate).toBeDefined();
  });

  it('should enforce end_date > start_date constraint', async () => {
    const db = (await import('@/test/db')).getTestDatabase();
    const { rotationPatterns } = await import('@/lib/db/schema');

    const family = await createFamily();
    const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
    const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

    await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
    await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

    // Try to insert rotation with end_date before start_date
    const insertPromise = db.insert(rotationPatterns).values({
      familyId: family.id,
      name: 'Invalid Rotation',
      patternType: '2-2-3',
      startDate: '2024-12-31',
      endDate: '2024-01-01', // Before start date
      primaryParentId: parent1.id,
      secondaryParentId: parent2.id,
      createdBy: parent1.id,
    });

    await expect(insertPromise).rejects.toThrow();
  });

  it('should enforce primary_parent_id != secondary_parent_id constraint', async () => {
    const db = (await import('@/test/db')).getTestDatabase();
    const { rotationPatterns } = await import('@/lib/db/schema');

    const family = await createFamily();
    const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });

    await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });

    // Try to insert rotation with same parent as both primary and secondary
    const insertPromise = db.insert(rotationPatterns).values({
      familyId: family.id,
      name: 'Invalid Rotation',
      patternType: '2-2-3',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      primaryParentId: parent1.id,
      secondaryParentId: parent1.id, // Same as primary
      createdBy: parent1.id,
    });

    await expect(insertPromise).rejects.toThrow();
  });

  it('should cascade delete when family is deleted', async () => {
    const db = (await import('@/test/db')).getTestDatabase();
    const { rotationPatterns, families } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const family = await createFamily();
    const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
    const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

    await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
    await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

    // Create rotation
    const [rotation] = await db.insert(rotationPatterns).values({
      familyId: family.id,
      name: 'Test Rotation',
      patternType: '2-2-3',
      startDate: '2024-01-01',
      primaryParentId: parent1.id,
      secondaryParentId: parent2.id,
      createdBy: parent1.id,
    }).returning();

    expect(rotation).toBeDefined();

    // Delete family
    await db.delete(families).where(eq(families.id, family.id));

    // Rotation should be deleted
    const rotations = await db.query.rotationPatterns.findMany({
      where: eq(rotationPatterns.id, rotation!.id),
    });

    expect(rotations).toHaveLength(0);
  });

  it('should accept all valid pattern type enum values', async () => {
    const db = (await import('@/test/db')).getTestDatabase();
    const { rotationPatterns } = await import('@/lib/db/schema');

    const family = await createFamily();
    const parent1 = await createUser({ firstName: 'Parent', lastName: 'One' });
    const parent2 = await createUser({ firstName: 'Parent', lastName: 'Two' });

    await createFamilyMember({ familyId: family.id, userId: parent1.id, role: 'parent_1' });
    await createFamilyMember({ familyId: family.id, userId: parent2.id, role: 'parent_2' });

    const validPatterns = ['2-2-3', '2-2-5-5', '3-4-4-3', 'alternating-weeks', 'every-weekend'];

    for (const pattern of validPatterns) {
      const [rotation] = await db.insert(rotationPatterns).values({
        familyId: family.id,
        name: `${pattern} Rotation`,
        patternType: pattern as any,
        startDate: '2024-01-01',
        primaryParentId: parent1.id,
        secondaryParentId: parent2.id,
        createdBy: parent1.id,
      }).returning();

      expect(rotation!.patternType).toBe(pattern);
    }
  });
});
