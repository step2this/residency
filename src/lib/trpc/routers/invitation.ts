import { router, publicProcedure, protectedProcedure, familyProcedure } from '../init';
import {
  createEmailInvitationSchema,
  createLinkInvitationSchema,
  acceptInvitationSchema,
  getInvitationByTokenSchema,
  revokeInvitationSchema,
  listInvitationsSchema,
} from '@/schemas/invitation';
import { familyInvitations, familyMembers, auditLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  assertCanEdit,
  generateInvitationToken,
  getInvitationExpirationDate,
  validatePendingInvitation,
  formatUserDisplayName,
} from '../helpers';

export const invitationRouter = router({
  // Create an email invitation
  createEmailInvite: familyProcedure
    .input(createEmailInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId, canEdit } = ctx;

      assertCanEdit(canEdit, 'invite family members');

      // Check if there's already a pending invitation for this email in this family
      const existingInvitation = await db.query.familyInvitations.findFirst({
        where: and(
          eq(familyInvitations.familyId, familyId),
          eq(familyInvitations.email, input.email),
          eq(familyInvitations.status, 'pending')
        ),
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An invitation has already been sent to this email address',
        });
      }

      const token = generateInvitationToken();
      const expiresAt = getInvitationExpirationDate(true);

      const [invitation] = await db.insert(familyInvitations).values({
        familyId,
        invitedBy: userId,
        email: input.email,
        token,
        role: input.role,
        canEditSchedule: input.canEditSchedule,
        status: 'pending',
        expiresAt,
      }).returning();

      // Log invitation creation
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'invitation.create_email',
        entityType: 'family_invitation',
        entityId: invitation!.id,
        newData: {
          email: invitation!.email,
          role: invitation!.role,
          expiresAt: invitation!.expiresAt,
        },
      });

      return {
        id: invitation!.id,
        email: invitation!.email,
        role: invitation!.role,
        token: invitation!.token,
        expiresAt: invitation!.expiresAt,
      };
    }),

  // Create a shareable link invitation
  createLinkInvite: familyProcedure
    .input(createLinkInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId, canEdit } = ctx;

      assertCanEdit(canEdit, 'invite family members');

      const token = generateInvitationToken();
      const expiresAt = getInvitationExpirationDate(false);

      const [invitation] = await db.insert(familyInvitations).values({
        familyId,
        invitedBy: userId,
        email: null, // Link invites don't have an email
        token,
        role: input.role,
        canEditSchedule: input.canEditSchedule,
        status: 'pending',
        expiresAt,
      }).returning();

      // Log invitation creation
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'invitation.create_link',
        entityType: 'family_invitation',
        entityId: invitation!.id,
        newData: {
          role: invitation!.role,
          expiresAt: invitation!.expiresAt,
        },
      });

      return {
        id: invitation!.id,
        role: invitation!.role,
        token: invitation!.token,
        expiresAt: invitation!.expiresAt,
      };
    }),

  // Get invitation details by token (public - for invite page)
  getByToken: publicProcedure
    .input(getInvitationByTokenSchema)
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const invitation = await db.query.familyInvitations.findFirst({
        where: eq(familyInvitations.token, input.token),
        with: {
          family: true,
          inviter: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      await validatePendingInvitation(db, invitation);

      return {
        id: invitation.id,
        familyName: invitation.family.name,
        inviterName: formatUserDisplayName(invitation.inviter),
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      };
    }),

  // Accept an invitation (requires auth but not family membership)
  accept: protectedProcedure
    .input(acceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      const invitation = await db.query.familyInvitations.findFirst({
        where: eq(familyInvitations.token, input.token),
        with: {
          family: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      await validatePendingInvitation(db, invitation);

      // Check if user is already a member of this family
      const existingMembership = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.familyId, invitation.familyId),
          eq(familyMembers.userId, userId)
        ),
      });

      if (existingMembership) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You are already a member of this family',
        });
      }

      // Check if user is already a member of another family
      const otherMembership = await db.query.familyMembers.findFirst({
        where: eq(familyMembers.userId, userId),
      });

      if (otherMembership) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You are already a member of another family',
        });
      }

      // Add user to family
      await db.insert(familyMembers).values({
        familyId: invitation.familyId,
        userId,
        role: invitation.role,
        canEditSchedule: invitation.canEditSchedule,
      });

      // Mark invitation as accepted
      await db
        .update(familyInvitations)
        .set({
          status: 'accepted',
          acceptedBy: userId,
          acceptedAt: new Date(),
        })
        .where(eq(familyInvitations.id, invitation.id));

      // Log invitation acceptance
      await db.insert(auditLogs).values({
        familyId: invitation.familyId,
        userId,
        action: 'invitation.accept',
        entityType: 'family_invitation',
        entityId: invitation.id,
        newData: {
          role: invitation.role,
          canEditSchedule: invitation.canEditSchedule,
        },
      });

      return {
        familyId: invitation.familyId,
        familyName: invitation.family.name,
        role: invitation.role,
      };
    }),

  // List invitations for the family
  list: familyProcedure
    .input(listInvitationsSchema)
    .query(async ({ ctx, input }) => {
      const { db, familyId } = ctx;

      const conditions = [eq(familyInvitations.familyId, familyId)];

      if (input.status) {
        conditions.push(eq(familyInvitations.status, input.status));
      }

      const invitations = await db.query.familyInvitations.findMany({
        where: and(...conditions),
        with: {
          inviter: true,
          acceptor: true,
        },
        orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
      });

      return invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        canEditSchedule: inv.canEditSchedule,
        invitedBy: formatUserDisplayName(inv.inviter),
        acceptedBy: inv.acceptor ? formatUserDisplayName(inv.acceptor) : null,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        createdAt: inv.createdAt,
      }));
    }),

  // Revoke a pending invitation
  revoke: familyProcedure
    .input(revokeInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, familyId, userId, canEdit } = ctx;

      const invitation = await db.query.familyInvitations.findFirst({
        where: eq(familyInvitations.id, input.id),
      });

      if (!invitation || invitation.familyId !== familyId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      // Only the inviter or someone with edit permission can revoke
      if (invitation.invitedBy !== userId && !canEdit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the inviter or a family admin can revoke this invitation',
        });
      }

      if (invitation.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot revoke an invitation that is already ${invitation.status}`,
        });
      }

      const [revokedInvitation] = await db
        .update(familyInvitations)
        .set({ status: 'revoked' })
        .where(eq(familyInvitations.id, input.id))
        .returning();

      // Log revocation
      await db.insert(auditLogs).values({
        familyId,
        userId,
        action: 'invitation.revoke',
        entityType: 'family_invitation',
        entityId: input.id,
        oldData: { status: 'pending' },
        newData: { status: 'revoked' },
      });

      return revokedInvitation;
    }),
});
