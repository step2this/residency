import { router, familyProcedure } from '../init';
import {
  createVisitationEventSchema,
  updateVisitationEventSchema,
  deleteVisitationEventSchema,
  listVisitationEventsSchema,
} from '@/schemas/schedule';
import { visitationEvents, auditLogs } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const scheduleRouter = router({
  // Create a new visitation event
  create: familyProcedure
    .input(createVisitationEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

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

      // Build where conditions
      const conditions = [
        eq(visitationEvents.familyId, familyId),
        gte(visitationEvents.startTime, input.startDate),
        lte(visitationEvents.endTime, input.endDate),
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
      const { db, familyId, userId } = ctx;

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
      const { db, familyId, userId } = ctx;

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
