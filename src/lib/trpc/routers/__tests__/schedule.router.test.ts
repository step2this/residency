/**
 * Schedule Router Integration Tests
 *
 * Tests the schedule business logic with a real database.
 * Key behaviors tested:
 * - Schedule overlap validation (prevent double-booking children)
 * - Parent and child validation
 * - Edit permission checks
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDatabase, destroyTestDatabase, clearTestDatabase, getTestDatabase } from '@/test/db';
import { createTestCaller } from '@/test/trpc';
import {
  createTestFamilySetup,
  createVisitationEvent,
} from '@/test/fixtures';
import { daysFromNow, todayAt } from '@/test/helpers';

describe('schedule router', () => {
  beforeAll(async () => {
    await createTestDatabase();
  });

  afterAll(async () => {
    await destroyTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('schedule.create overlap validation', () => {
    it('allows creating non-overlapping events for the same child', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create first event: 9am-5pm today
      await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      // Create non-overlapping event: next day
      const caller = createTestCaller(db, parent1.id);
      const event = await caller.schedule.create({
        childId: child.id,
        parentId: parent1.id,
        startTime: daysFromNow(1),
        endTime: new Date(daysFromNow(1).getTime() + 8 * 60 * 60 * 1000), // +8 hours
        isRecurring: false,
      });

      expect(event).toBeDefined();
      expect(event!.childId).toBe(child.id);
    });

    it('rejects overlapping events for the same child', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create first event: 9am-5pm today
      await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      // Try to create overlapping event: 2pm-8pm (overlaps 2pm-5pm)
      const caller = createTestCaller(db, parent1.id);

      await expect(
        caller.schedule.create({
          childId: child.id,
          parentId: parent1.id,
          startTime: todayAt(14), // 2pm
          endTime: todayAt(20), // 8pm
          isRecurring: false,
        })
      ).rejects.toThrow('Schedule conflict');
    });

    it('rejects event fully contained within existing event', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create first event: 9am-5pm
      await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      // Try to create event within: 11am-3pm
      const caller = createTestCaller(db, parent1.id);

      await expect(
        caller.schedule.create({
          childId: child.id,
          parentId: parent1.id,
          startTime: todayAt(11),
          endTime: todayAt(15),
          isRecurring: false,
        })
      ).rejects.toThrow('Schedule conflict');
    });

    it('rejects event that fully contains existing event', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create first event: 11am-3pm
      await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(11),
        endTime: todayAt(15),
      });

      // Try to create encompassing event: 9am-5pm
      const caller = createTestCaller(db, parent1.id);

      await expect(
        caller.schedule.create({
          childId: child.id,
          parentId: parent1.id,
          startTime: todayAt(9),
          endTime: todayAt(17),
          isRecurring: false,
        })
      ).rejects.toThrow('Schedule conflict');
    });

    it('allows adjacent events (end time = start time)', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create first event: 9am-12pm
      await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(12),
      });

      // Create adjacent event: 12pm-5pm (starts exactly when first ends)
      const caller = createTestCaller(db, parent1.id);
      const event = await caller.schedule.create({
        childId: child.id,
        parentId: parent1.id,
        startTime: todayAt(12),
        endTime: todayAt(17),
        isRecurring: false,
      });

      expect(event).toBeDefined();
    });

    it('allows overlapping events for different children', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Add second child
      const { children } = await import('@/lib/db/schema');
      const [child2] = await db
        .insert(children)
        .values({
          familyId: family.id,
          firstName: 'Sibling',
          lastName: 'Test',
          dateOfBirth: '2020-01-01',
        })
        .returning();

      // Create event for child1: 9am-5pm
      await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      // Create overlapping event for child2 - should be allowed
      const caller = createTestCaller(db, parent1.id);
      const event = await caller.schedule.create({
        childId: child2!.id,
        parentId: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
        isRecurring: false,
      });

      expect(event).toBeDefined();
      expect(event!.childId).toBe(child2!.id);
    });
  });

  describe('schedule.update overlap validation', () => {
    it('allows updating event without changing times', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create event
      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      // Update notes only - no time change
      const caller = createTestCaller(db, parent1.id);
      const updated = await caller.schedule.update({
        id: event.id,
        notes: 'Updated notes',
      });

      expect(updated!.notes).toBe('Updated notes');
    });

    it('allows moving event to non-overlapping time', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create two events
      await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(12),
      });

      const event2 = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(14),
        endTime: todayAt(17),
      });

      // Move event2 to evening - should work
      const caller = createTestCaller(db, parent1.id);
      const updated = await caller.schedule.update({
        id: event2.id,
        startTime: todayAt(18),
        endTime: todayAt(21),
      });

      expect(updated!.startTime).toEqual(todayAt(18));
    });

    it('rejects moving event to overlapping time', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create two events
      await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(12),
      });

      const event2 = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(14),
        endTime: todayAt(17),
      });

      // Try to move event2 to overlap with event1
      const caller = createTestCaller(db, parent1.id);

      await expect(
        caller.schedule.update({
          id: event2.id,
          startTime: todayAt(10), // Overlaps 10am-12pm with event1
          endTime: todayAt(15),
        })
      ).rejects.toThrow('Schedule conflict');
    });

    it('allows extending event that does not create overlap', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create event: 9am-12pm
      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(12),
      });

      // Extend to 9am-5pm - no other events, should work
      const caller = createTestCaller(db, parent1.id);
      const updated = await caller.schedule.update({
        id: event.id,
        endTime: todayAt(17),
      });

      expect(updated!.endTime).toEqual(todayAt(17));
    });

    it('allows shrinking event', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Create event: 9am-5pm
      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      // Shrink to 10am-3pm
      const caller = createTestCaller(db, parent1.id);
      const updated = await caller.schedule.update({
        id: event.id,
        startTime: todayAt(10),
        endTime: todayAt(15),
      });

      expect(updated!.startTime).toEqual(todayAt(10));
      expect(updated!.endTime).toEqual(todayAt(15));
    });
  });

  describe('schedule.create authorization', () => {
    it('rejects creation from user without edit permission', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      // Add attorney (no edit permission by default)
      const { users, familyMembers } = await import('@/lib/db/schema');
      const [attorney] = await db
        .insert(users)
        .values({
          id: 'attorney-1',
          email: 'attorney@test.com',
          firstName: 'Legal',
          lastName: 'Eagle',
        })
        .returning();

      await db.insert(familyMembers).values({
        familyId: family.id,
        userId: attorney!.id,
        role: 'attorney',
        canEditSchedule: false,
      });

      // Attorney tries to create event
      const caller = createTestCaller(db, attorney!.id);

      await expect(
        caller.schedule.create({
          childId: child.id,
          parentId: parent1.id,
          startTime: todayAt(9),
          endTime: todayAt(17),
          isRecurring: false,
        })
      ).rejects.toThrow('permission');
    });

    it('rejects creation with child from different family', async () => {
      const { parent1 } = await createTestFamilySetup();
      const setup2 = await createTestFamilySetup();
      const db = getTestDatabase();

      // Parent1 tries to create event with child from family2
      const caller = createTestCaller(db, parent1.id);

      await expect(
        caller.schedule.create({
          childId: setup2.child.id, // Wrong family's child
          parentId: parent1.id,
          startTime: todayAt(9),
          endTime: todayAt(17),
          isRecurring: false,
        })
      ).rejects.toThrow('Child not found');
    });

    it('rejects creation with invalid parent ID', async () => {
      const { parent1, family, child } = await createTestFamilySetup();
      const db = getTestDatabase();

      const caller = createTestCaller(db, parent1.id);

      await expect(
        caller.schedule.create({
          childId: child.id,
          parentId: 'nonexistent-user-id',
          startTime: todayAt(9),
          endTime: todayAt(17),
          isRecurring: false,
        })
      ).rejects.toThrow('Invalid parent ID');
    });
  });
});
