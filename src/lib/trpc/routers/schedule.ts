import { router, familyProcedure } from '../init';
import {
  createVisitationEventSchema,
  updateVisitationEventSchema,
  deleteVisitationEventSchema,
  listVisitationEventsSchema,
} from '@/schemas/schedule';
import { visitationEvents, auditLogs } from '@/lib/db/schema';
import { type Database } from '@/lib/db/client';
import { eq, and, gte, lte, lt, gt, ne } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { assertCanEdit, validateChildInFamily, validateParentInFamily } from '../helpers';
import { dateRangesOverlap } from '@/lib/utils/date-range-utils';

// Helper function to check for overlapping events for a child
async function checkForOverlappingEvents(
  db: Database,
  childId: string,
  startTime: Date,
  endTime: Date,
  excludeEventId?: string
): Promise<{ hasOverlap: boolean; overlappingEvent?: typeof visitationEvents.$inferSelect }> {
  // Two time ranges overlap if: start1 < end2 AND start2 < end1
  const conditions = [
    eq(visitationEvents.childId, childId),
    lt(visitationEvents.startTime, endTime),
    gt(visitationEvents.endTime, startTime),
  ];

  // Exclude the current event when updating
  if (excludeEventId) {
    conditions.push(ne(visitationEvents.id, excludeEventId));
  }

  const overlappingEvent = await db.query.visitationEvents.findFirst({
    where: and(...conditions),
  });

  return {
    hasOverlap: !!overlappingEvent,
    overlappingEvent: overlappingEvent ?? undefined,
  };
}

export const scheduleRouter = router({
  // Create a new visitation event
  create: familyProcedure
    .input(createVisitationEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId, canEdit } = ctx;

      assertCanEdit(canEdit, 'modify the schedule');
      await validateChildInFamily(db, input.childId, familyId);
      await validateParentInFamily(db, input.parentId, familyId);

      // Check for overlapping events for this child
      const { hasOverlap, overlappingEvent } = await checkForOverlappingEvents(
        db,
        input.childId,
        input.startTime,
        input.endTime
      );

      if (hasOverlap && overlappingEvent) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Schedule conflict: This child already has a visitation event from ${overlappingEvent.startTime.toLocaleString()} to ${overlappingEvent.endTime.toLocaleString()}`,
        });
      }

      // Create event
      const [event] = await db.insert(visitationEvents).values({
        familyId,
        childId: input.childId,
        parentId: input.parentId,
        startTime: input.startTime,
        endTime: input.endTime,
        isRecurring: input.isRecurring,
        recurrenceRule: input.recurrenceRule ?? null,
        isHolidayException: input.isHolidayException,
        notes: input.notes ?? null,
        createdBy: userId,
      }).returning();

      // Log event creation
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'schedule.create',
        entityType: 'visitation_event',
        entityId: event!.id,
        newData: {
          childId: event!.childId,
          parentId: event!.parentId,
          startTime: event!.startTime,
          endTime: event!.endTime,
          isRecurring: event!.isRecurring,
          recurrenceRule: event!.recurrenceRule,
        },
      });

      return event;
    }),

  // List visitation events by date range
  list: familyProcedure
    .input(listVisitationEventsSchema)
    .query(async ({ ctx, input }) => {
      const { db, familyId } = ctx;

      // Build where conditions using overlap logic:
      // Two ranges overlap if: startA < endB AND startB < endA
      // Event overlaps query range if: event.startTime < query.endDate AND event.endTime > query.startDate
      const conditions = [
        eq(visitationEvents.familyId, familyId),
        lt(visitationEvents.startTime, input.endDate),   // Event starts before query range ends
        gt(visitationEvents.endTime, input.startDate),   // Event ends after query range starts
      ];

      // Add optional child filter
      if (input.childId) {
        conditions.push(eq(visitationEvents.childId, input.childId));
      }

      const events = await db.query.visitationEvents.findMany({
        where: and(...conditions),
        with: {
          child: true,
          parent: true,
        },
        orderBy: (visitationEvents, { asc }) => [asc(visitationEvents.startTime)],
      });

      return events;
    }),

  // Update visitation event
  update: familyProcedure
    .input(updateVisitationEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId, canEdit } = ctx;

      assertCanEdit(canEdit, 'modify the schedule');

      // Get existing event
      const existingEvent = await db.query.visitationEvents.findFirst({
        where: eq(visitationEvents.id, input.id),
      });

      if (!existingEvent || existingEvent.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Visitation event not found',
        });
      }

      // Validate childId if provided
      if (input.childId) {
        await validateChildInFamily(db, input.childId, familyId);
      }

      // Validate parentId if provided
      if (input.parentId) {
        await validateParentInFamily(db, input.parentId, familyId);
      }

      // Check for overlapping events if time or child is changing
      const newChildId = input.childId ?? existingEvent.childId;
      const newStartTime = input.startTime ?? existingEvent.startTime;
      const newEndTime = input.endTime ?? existingEvent.endTime;

      // Only check if something relevant is actually changing
      const isTimeOrChildChanging =
        newChildId !== existingEvent.childId ||
        newStartTime.getTime() !== existingEvent.startTime.getTime() ||
        newEndTime.getTime() !== existingEvent.endTime.getTime();

      if (isTimeOrChildChanging) {
        const { hasOverlap, overlappingEvent } = await checkForOverlappingEvents(
          db,
          newChildId,
          newStartTime,
          newEndTime,
          input.id // Exclude the current event being updated
        );

        if (hasOverlap && overlappingEvent) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Schedule conflict: This child already has a visitation event from ${overlappingEvent.startTime.toLocaleString()} to ${overlappingEvent.endTime.toLocaleString()}`,
          });
        }
      }

      const oldData = {
        childId: existingEvent.childId,
        parentId: existingEvent.parentId,
        startTime: existingEvent.startTime,
        endTime: existingEvent.endTime,
        isRecurring: existingEvent.isRecurring,
        recurrenceRule: existingEvent.recurrenceRule,
        notes: existingEvent.notes,
      };

      // Update event
      const [updatedEvent] = await db
        .update(visitationEvents)
        .set({
          childId: input.childId ?? existingEvent.childId,
          parentId: input.parentId ?? existingEvent.parentId,
          startTime: input.startTime ?? existingEvent.startTime,
          endTime: input.endTime ?? existingEvent.endTime,
          isRecurring: input.isRecurring ?? existingEvent.isRecurring,
          recurrenceRule: input.recurrenceRule !== undefined
            ? input.recurrenceRule
            : existingEvent.recurrenceRule,
          isHolidayException: input.isHolidayException ?? existingEvent.isHolidayException,
          notes: input.notes !== undefined ? input.notes : existingEvent.notes,
          updatedAt: new Date(),
        })
        .where(eq(visitationEvents.id, input.id))
        .returning();

      // Log event update
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'schedule.update',
        entityType: 'visitation_event',
        entityId: input.id,
        oldData,
        newData: {
          childId: updatedEvent!.childId,
          parentId: updatedEvent!.parentId,
          startTime: updatedEvent!.startTime,
          endTime: updatedEvent!.endTime,
          isRecurring: updatedEvent!.isRecurring,
          recurrenceRule: updatedEvent!.recurrenceRule,
        },
      });

      return updatedEvent;
    }),

  // Delete visitation event
  delete: familyProcedure
    .input(deleteVisitationEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId, canEdit } = ctx;

      assertCanEdit(canEdit, 'modify the schedule');

      // Get event to delete
      const event = await db.query.visitationEvents.findFirst({
        where: eq(visitationEvents.id, input.id),
      });

      if (!event || event.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Visitation event not found',
        });
      }

      // Log event deletion before deleting
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'schedule.delete',
        entityType: 'visitation_event',
        entityId: input.id,
        oldData: {
          childId: event.childId,
          parentId: event.parentId,
          startTime: event.startTime,
          endTime: event.endTime,
        },
        newData: null,
      });

      // Delete event (cascade will handle related swap requests)
      await db.delete(visitationEvents).where(eq(visitationEvents.id, input.id));

      return { success: true };
    }),
});
