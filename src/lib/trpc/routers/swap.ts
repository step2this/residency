import { router, familyProcedure } from '../init';
import {
  createSwapRequestSchema,
  approveSwapRequestSchema,
  rejectSwapRequestSchema,
  cancelSwapRequestSchema,
  listSwapRequestsSchema,
} from '@/schemas/swap';
import { swapRequests, visitationEvents, auditLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const swapRouter = router({
  // Create a new swap request
  create: familyProcedure
    .input(createSwapRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Get the event to swap
      const event = await db.query.visitationEvents.findFirst({
        where: eq(visitationEvents.id, input.eventId),
      });

      if (!event || event.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Visitation event not found',
        });
      }

      // Determine who the request is to (the other parent)
      const requestedTo = event.parentId === userId
        ? event.createdBy  // If current user owns event, request to creator
        : event.parentId;  // Otherwise request to event owner

      // Create swap request
      const [swap] = await db.insert(swapRequests).values({
        familyId,
        eventId: input.eventId,
        requestedBy: userId,
        requestedTo,
        newStartTime: input.newStartTime,
        newEndTime: input.newEndTime,
        reason: input.reason,
        status: 'pending',
      }).returning();

      // Log swap request creation
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'swap.create',
        entityType: 'swap_request',
        entityId: swap!.id,
        newData: {
          eventId: swap!.eventId,
          requestedTo: swap!.requestedTo,
          newStartTime: swap!.newStartTime,
          newEndTime: swap!.newEndTime,
          reason: swap!.reason,
        },
      });

      return swap;
    }),

  // List swap requests
  list: familyProcedure
    .input(listSwapRequestsSchema)
    .query(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Build where conditions
      const conditions = [
        eq(swapRequests.familyId, familyId),
      ];

      // Add optional status filter
      if (input.status) {
        conditions.push(eq(swapRequests.status, input.status));
      }

      const swaps = await db.query.swapRequests.findMany({
        where: and(...conditions),
        with: {
          event: {
            with: {
              child: true,
            },
          },
          requester: true,
          recipient: true,
        },
        orderBy: (swapRequests, { desc }) => [desc(swapRequests.createdAt)],
      });

      // Filter to only show swaps relevant to the current user
      return swaps.filter(
        (swap) => swap.requestedBy === userId || swap.requestedTo === userId
      );
    }),

  // Approve swap request
  approve: familyProcedure
    .input(approveSwapRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Get swap request
      const swap = await db.query.swapRequests.findFirst({
        where: eq(swapRequests.id, input.id),
        with: {
          event: true,
        },
      });

      if (!swap || swap.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swap request not found',
        });
      }

      // Verify user is the recipient
      if (swap.requestedTo !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the recipient can approve this swap request',
        });
      }

      // Verify swap is still pending
      if (swap.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Swap request is already ${swap.status}`,
        });
      }

      // Update swap status
      const [approvedSwap] = await db
        .update(swapRequests)
        .set({
          status: 'approved',
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(swapRequests.id, input.id))
        .returning();

      // Update the visitation event with new times
      await db
        .update(visitationEvents)
        .set({
          startTime: swap.newStartTime,
          endTime: swap.newEndTime,
          updatedAt: new Date(),
        })
        .where(eq(visitationEvents.id, swap.eventId));

      // Log swap approval
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'swap.approve',
        entityType: 'swap_request',
        entityId: input.id,
        oldData: { status: 'pending' },
        newData: { status: 'approved' },
      });

      return approvedSwap;
    }),

  // Reject swap request
  reject: familyProcedure
    .input(rejectSwapRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Get swap request
      const swap = await db.query.swapRequests.findFirst({
        where: eq(swapRequests.id, input.id),
      });

      if (!swap || swap.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swap request not found',
        });
      }

      // Verify user is the recipient
      if (swap.requestedTo !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the recipient can reject this swap request',
        });
      }

      // Verify swap is still pending
      if (swap.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Swap request is already ${swap.status}`,
        });
      }

      // Update swap status
      const [rejectedSwap] = await db
        .update(swapRequests)
        .set({
          status: 'rejected',
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(swapRequests.id, input.id))
        .returning();

      // Log swap rejection
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'swap.reject',
        entityType: 'swap_request',
        entityId: input.id,
        oldData: { status: 'pending' },
        newData: { status: 'rejected' },
      });

      return rejectedSwap;
    }),

  // Cancel swap request
  cancel: familyProcedure
    .input(cancelSwapRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Get swap request
      const swap = await db.query.swapRequests.findFirst({
        where: eq(swapRequests.id, input.id),
      });

      if (!swap || swap.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swap request not found',
        });
      }

      // Verify user is the requester
      if (swap.requestedBy !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the requester can cancel this swap request',
        });
      }

      // Verify swap is still pending
      if (swap.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Swap request is already ${swap.status}`,
        });
      }

      // Update swap status
      const [cancelledSwap] = await db
        .update(swapRequests)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(swapRequests.id, input.id))
        .returning();

      // Log swap cancellation
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'swap.cancel',
        entityType: 'swap_request',
        entityId: input.id,
        oldData: { status: 'pending' },
        newData: { status: 'cancelled' },
      });

      return cancelledSwap;
    }),
});
