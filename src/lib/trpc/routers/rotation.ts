import { router, protectedProcedure } from '../init';
import {
  createRotationPatternSchema,
  getRotationCalendarEventsSchema,
  deleteRotationPatternSchema,
} from '@/schemas/rotation';
import { rotationPatterns, familyMembers } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { validateNoOverlap, generateCalendarEvents } from '@/lib/utils/rotation-utils';

export const rotationRouter = router({
  /**
   * Create a new rotation pattern
   * - Requires edit permissions
   * - Validates both parents are family members
   * - Checks for overlapping rotations
   */
  create: protectedProcedure
    .input(createRotationPatternSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      // Get user's family membership
      const membership = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.familyId, input.familyId),
          eq(familyMembers.userId, userId)
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this family',
        });
      }

      // Check edit permissions
      if (!membership.canEditSchedule) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit schedules',
        });
      }

      // Verify both parents are family members
      const primaryMember = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.familyId, input.familyId),
          eq(familyMembers.userId, input.primaryParentId)
        ),
      });

      const secondaryMember = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.familyId, input.familyId),
          eq(familyMembers.userId, input.secondaryParentId)
        ),
      });

      if (!primaryMember || !secondaryMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Both parents must be members of the family',
        });
      }

      // Check for overlapping rotations
      const hasOverlap = await validateNoOverlap(
        input.familyId,
        input.startDate,
        input.endDate,
        db
      );

      if (hasOverlap) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This rotation overlaps with an existing active rotation',
        });
      }

      // Create rotation
      const [rotation] = await db
        .insert(rotationPatterns)
        .values({
          familyId: input.familyId,
          name: input.name,
          patternType: input.patternType,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          primaryParentId: input.primaryParentId,
          secondaryParentId: input.secondaryParentId,
          createdBy: userId,
        })
        .returning();

      return rotation!;
    }),

  /**
   * List all active rotation patterns for user's families
   * - Returns only active rotations
   * - Includes family and parent relations
   * - Filters by user's family memberships
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;

    // Get all families user is a member of
    const memberships = await db.query.familyMembers.findMany({
      where: eq(familyMembers.userId, userId),
    });

    if (memberships.length === 0) {
      return [];
    }

    const familyIds = memberships.map((m) => m.familyId);

    // Get all active rotations for user's families
    const rotations = await db.query.rotationPatterns.findMany({
      where: and(
        eq(rotationPatterns.isActive, true),
        inArray(rotationPatterns.familyId, familyIds)
      ),
      with: {
        family: true,
        primaryParent: true,
        secondaryParent: true,
      },
    });

    return rotations;
  }),

  /**
   * Get calendar events for a rotation pattern within a date range
   * - Verifies user is family member
   * - Generates events using pattern configuration
   * - Returns empty array if rotation not found
   */
  getCalendarEvents: protectedProcedure
    .input(getRotationCalendarEventsSchema)
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      // Fetch rotation with family members
      const rotation = await db.query.rotationPatterns.findFirst({
        where: eq(rotationPatterns.id, input.rotationId),
        with: {
          family: {
            with: {
              members: true,
            },
          },
          primaryParent: true,
          secondaryParent: true,
        },
      });

      if (!rotation) {
        return [];
      }

      // Verify user is a family member
      const isMember = rotation.family.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this rotation',
        });
      }

      // Generate calendar events
      const events = generateCalendarEvents(
        rotation,
        input.startDate,
        input.endDate
      );

      return events;
    }),

  /**
   * Soft delete a rotation pattern (sets isActive = false)
   * - Requires edit permissions
   * - Preserves data for audit trail
   * - Updates updatedAt timestamp
   */
  delete: protectedProcedure
    .input(deleteRotationPatternSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      // Fetch rotation with family members
      const rotation = await db.query.rotationPatterns.findFirst({
        where: eq(rotationPatterns.id, input.rotationId),
        with: {
          family: {
            with: {
              members: true,
            },
          },
        },
      });

      if (!rotation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Rotation pattern not found',
        });
      }

      // Verify user is a family member with edit permissions
      const membership = rotation.family.members.find((m) => m.userId === userId);
      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this family',
        });
      }

      if (!membership.canEditSchedule) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit schedules',
        });
      }

      // Soft delete: set isActive = false
      await db
        .update(rotationPatterns)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(rotationPatterns.id, input.rotationId));

      return { success: true };
    }),
});
