/**
 * Swap Router Integration Tests
 *
 * Tests the swap request business logic with a real database.
 * Key behaviors tested:
 * - Only recipient can approve/reject
 * - Only requester can cancel
 * - Status transitions (pending → approved/rejected/cancelled)
 * - Event times update on approval
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDatabase, destroyTestDatabase, clearTestDatabase } from '@/test/db';
import { createTestCaller } from '@/test/trpc';
import {
  createTestFamilySetup,
  createVisitationEvent,
  createSwapRequest,
} from '@/test/fixtures';
import { daysFromNow, todayAt } from '@/test/helpers';

describe('swap router', () => {
  beforeAll(async () => {
    await createTestDatabase();
  });

  afterAll(async () => {
    await destroyTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('swap.create', () => {
    it('creates a swap request for an event', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();

      // Create an event owned by parent1
      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: daysFromNow(1),
        endTime: daysFromNow(2),
      });

      // Parent2 requests a swap
      const caller = createTestCaller(
        (await import('@/test/db')).getTestDatabase(),
        parent2.id
      );

      const newStart = daysFromNow(3);
      const newEnd = daysFromNow(4);

      const swap = await caller.swap.create({
        eventId: event.id,
        newStartTime: newStart,
        newEndTime: newEnd,
        reason: 'Work conflict',
      });

      expect(swap).toBeDefined();
      expect(swap!.eventId).toBe(event.id);
      expect(swap!.requestedBy).toBe(parent2.id);
      expect(swap!.requestedTo).toBe(parent1.id); // Event owner
      expect(swap!.status).toBe('pending');
      expect(swap!.reason).toBe('Work conflict');
    });

    it('routes request to creator when requester owns the event', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();

      // Event owned by parent1, created by parent1
      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent2.id, // Parent2 created it
        startTime: daysFromNow(1),
        endTime: daysFromNow(2),
      });

      // Parent1 (event owner) requests swap - should go to parent2 (creator)
      const caller = createTestCaller(
        (await import('@/test/db')).getTestDatabase(),
        parent1.id
      );

      const swap = await caller.swap.create({
        eventId: event.id,
        newStartTime: daysFromNow(3),
        newEndTime: daysFromNow(4),
        reason: 'Schedule change',
      });

      expect(swap!.requestedTo).toBe(parent2.id);
    });

    it('rejects swap for event in different family', async () => {
      const { parent1 } = await createTestFamilySetup();
      const setup2 = await createTestFamilySetup();

      // Create event in family2
      const event = await createVisitationEvent({
        familyId: setup2.family.id,
        childId: setup2.child.id,
        parentId: setup2.parent1.id,
        createdBy: setup2.parent1.id,
        startTime: daysFromNow(1),
        endTime: daysFromNow(2),
      });

      // Parent1 from family1 tries to create swap
      const caller = createTestCaller(
        (await import('@/test/db')).getTestDatabase(),
        parent1.id
      );

      await expect(
        caller.swap.create({
          eventId: event.id,
          newStartTime: daysFromNow(3),
          newEndTime: daysFromNow(4),
          reason: 'Test',
        })
      ).rejects.toThrow('Visitation event not found');
    });
  });

  describe('swap.approve', () => {
    it('allows recipient to approve pending swap', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      const newStart = daysFromNow(1);
      const newEnd = daysFromNow(2);

      const swap = await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: newStart,
        newEndTime: newEnd,
      });

      // Parent1 (recipient) approves
      const caller = createTestCaller(db, parent1.id);
      const approved = await caller.swap.approve({ id: swap.id });

      expect(approved!.status).toBe('approved');
      expect(approved!.respondedAt).toBeDefined();

      // Verify event times were updated
      const updatedEvent = await db.query.visitationEvents.findFirst({
        where: (events, { eq }) => eq(events.id, event.id),
      });

      expect(updatedEvent?.startTime).toEqual(newStart);
      expect(updatedEvent?.endTime).toEqual(newEnd);
    });

    it('rejects approval from non-recipient', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      const swap = await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
      });

      // Parent2 (requester, NOT recipient) tries to approve
      const caller = createTestCaller(db, parent2.id);

      await expect(caller.swap.approve({ id: swap.id })).rejects.toThrow(
        'Only the recipient can approve'
      );
    });

    it('rejects approval of already approved swap', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      const swap = await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
        status: 'approved', // Already approved
      });

      const caller = createTestCaller(db, parent1.id);

      await expect(caller.swap.approve({ id: swap.id })).rejects.toThrow(
        'already approved'
      );
    });
  });

  describe('swap.reject', () => {
    it('allows recipient to reject pending swap', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      const swap = await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
      });

      const caller = createTestCaller(db, parent1.id);
      const rejected = await caller.swap.reject({ id: swap.id });

      expect(rejected!.status).toBe('rejected');
      expect(rejected!.respondedAt).toBeDefined();
    });

    it('rejects rejection from non-recipient', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      const swap = await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
      });

      // Parent2 (requester) tries to reject
      const caller = createTestCaller(db, parent2.id);

      await expect(caller.swap.reject({ id: swap.id })).rejects.toThrow(
        'Only the recipient can reject'
      );
    });
  });

  describe('swap.cancel', () => {
    it('allows requester to cancel pending swap', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      const swap = await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
      });

      // Parent2 (requester) cancels
      const caller = createTestCaller(db, parent2.id);
      const cancelled = await caller.swap.cancel({ id: swap.id });

      expect(cancelled!.status).toBe('cancelled');
    });

    it('rejects cancellation from non-requester', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      const swap = await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
      });

      // Parent1 (recipient) tries to cancel
      const caller = createTestCaller(db, parent1.id);

      await expect(caller.swap.cancel({ id: swap.id })).rejects.toThrow(
        'Only the requester can cancel'
      );
    });

    it('rejects cancellation of already cancelled swap', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      const swap = await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
        status: 'cancelled',
      });

      const caller = createTestCaller(db, parent2.id);

      await expect(caller.swap.cancel({ id: swap.id })).rejects.toThrow(
        'already cancelled'
      );
    });
  });

  describe('swap.list', () => {
    it('lists swaps for the current user', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      // Create swap from parent2 to parent1
      await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
      });

      // Both parents should see it
      const caller1 = createTestCaller(db, parent1.id);
      const caller2 = createTestCaller(db, parent2.id);

      const list1 = await caller1.swap.list({});
      const list2 = await caller2.swap.list({});

      expect(list1).toHaveLength(1);
      expect(list2).toHaveLength(1);
    });

    it('filters by status', async () => {
      const { parent1, parent2, family, child } = await createTestFamilySetup();
      const db = (await import('@/test/db')).getTestDatabase();

      const event = await createVisitationEvent({
        familyId: family.id,
        childId: child.id,
        parentId: parent1.id,
        createdBy: parent1.id,
        startTime: todayAt(9),
        endTime: todayAt(17),
      });

      // Create pending and approved swaps
      await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(1),
        newEndTime: daysFromNow(2),
        status: 'pending',
      });

      await createSwapRequest({
        familyId: family.id,
        eventId: event.id,
        requestedBy: parent2.id,
        requestedTo: parent1.id,
        newStartTime: daysFromNow(3),
        newEndTime: daysFromNow(4),
        status: 'approved',
      });

      const caller = createTestCaller(db, parent1.id);

      const pendingOnly = await caller.swap.list({ status: 'pending' });
      const approvedOnly = await caller.swap.list({ status: 'approved' });
      const all = await caller.swap.list({});

      expect(pendingOnly).toHaveLength(1);
      expect(pendingOnly[0]!.status).toBe('pending');
      expect(approvedOnly).toHaveLength(1);
      expect(approvedOnly[0]!.status).toBe('approved');
      expect(all).toHaveLength(2);
    });
  });
});
