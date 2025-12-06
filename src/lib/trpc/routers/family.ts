import { router, protectedProcedure, familyProcedure } from '../init';
import {
  createFamilySchema,
  addFamilyMemberSchema,
  updateMemberRoleSchema,
  removeFamilyMemberSchema,
} from '@/schemas/family';
import { families, familyMembers, users, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const familyRouter = router({
  // Create a new family (onboarding)
  create: protectedProcedure
    .input(createFamilySchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      // Check if user already has a family
      const existingMembership = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, userId),
      });

      if (existingMembership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You are already a member of a family',
        });
      }

      // Create family
      const [family] = await db.insert(families).values({
        name: input.name,
      }).returning();

      // Add user as parent_1 with edit permissions
      await db.insert(familyMembers).values({
        familyId: family!.id,
        userId,
        role: 'parent_1',
        canEditSchedule: true,
      });

      // Log family creation
      await db.insert(auditLogs).values({
        familyId: family!.id,
        userId,
        action: 'family.create',
        entityType: 'family',
        entityId: family!.id,
        newData: { name: family!.name },
      });

      return family;
    }),

  // Get user's family
  get: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;

    // Find user's family membership
    const membership = await db.query.familyMembers.findFirst({
      where: eq(familyMembers.userId, userId),
    });

    // Return null if user has no family (onboarding not completed)
    if (!membership) {
      return null;
    }

    // Get family with members and children
    const family = await db.query.families.findFirst({
      where: eq(families.id, membership.familyId),
      with: {
        members: {
          with: {
            user: true,
          },
        },
        children: true,
      },
    });

    return family;
  }),

  // Add family member (invite co-parent/attorney/grandparent)
  addMember: familyProcedure
    .input(addFamilyMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Find user by email
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found. They must sign up first.',
        });
      }

      // Check if user is already a member
      const existingMember = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, user.id),
      });

      if (existingMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User is already a member of a family',
        });
      }

      // Add member
      const [member] = await db.insert(familyMembers).values({
        familyId,
        userId: user.id,
        role: input.role,
        canEditSchedule: input.canEditSchedule,
      }).returning();

      // Log member addition
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'family.addMember',
        entityType: 'family_member',
        entityId: member!.id,
        newData: {
          userId: user.id,
          role: input.role,
          canEditSchedule: input.canEditSchedule,
        },
      });

      return member;
    }),

  // Update member role/permissions
  updateMemberRole: familyProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Get existing member
      const member = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, input.memberId),
      });

      if (!member || member.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Family member not found',
        });
      }

      const oldData = {
        role: member.role,
        canEditSchedule: member.canEditSchedule,
      };

      // Update member
      const [updatedMember] = await db
        .update(familyMembers)
        .set({
          role: input.role,
          canEditSchedule: input.canEditSchedule,
          updatedAt: new Date(),
        })
        .where(eq(familyMembers.id, input.memberId))
        .returning();

      // Log member update
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'family.updateMemberRole',
        entityType: 'family_member',
        entityId: input.memberId,
        oldData,
        newData: {
          role: input.role,
          canEditSchedule: input.canEditSchedule,
        },
      });

      return updatedMember;
    }),

  // Remove family member
  removeMember: familyProcedure
    .input(removeFamilyMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId } = ctx;

      // Get member to remove
      const member = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.id, input.memberId),
      });

      if (!member || member.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Family member not found',
        });
      }

      // Prevent removing yourself
      if (member.userId === userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot remove yourself from the family',
        });
      }

      // Log member removal before deleting
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'family.removeMember',
        entityType: 'family_member',
        entityId: input.memberId,
        oldData: {
          userId: member.userId,
          role: member.role,
        },
        newData: null,
      });

      // Remove member
      await db.delete(familyMembers).where(eq(familyMembers.id, input.memberId));

      return { success: true };
    }),
});
