/**
 * tRPC Router Helpers
 *
 * Shared validation and utility functions for tRPC routers.
 * These helpers reduce duplication and ensure consistent error handling.
 */

import { TRPCError } from '@trpc/server';
import { type Database } from '@/lib/db/client';
import { children, familyMembers, familyInvitations } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import {
  EMAIL_INVITATION_EXPIRY_DAYS,
  LINK_INVITATION_EXPIRY_DAYS,
  INVITATION_TOKEN_BYTES,
} from '@/lib/constants';
import { randomBytes } from 'crypto';

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * Assert that the user has edit permissions
 * @throws TRPCError with FORBIDDEN code if user cannot edit
 */
export function assertCanEdit(canEdit: boolean, action: string = 'perform this action'): void {
  if (!canEdit) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You do not have permission to ${action}`,
    });
  }
}

// ============================================================================
// ENTITY VALIDATION
// ============================================================================

/**
 * Validate that a child belongs to a family
 * @returns The child if found
 * @throws TRPCError with BAD_REQUEST code if not found
 */
export async function validateChildInFamily(
  db: Database,
  childId: string,
  familyId: string
): Promise<typeof children.$inferSelect> {
  const child = await db.query.children.findFirst({
    where: and(eq(children.id, childId), eq(children.familyId, familyId)),
  });

  if (!child) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Child not found in your family',
    });
  }

  return child;
}

/**
 * Validate that a user is a parent in the family
 * @returns The family member if found
 * @throws TRPCError with BAD_REQUEST code if not a parent
 */
export async function validateParentInFamily(
  db: Database,
  userId: string,
  familyId: string
): Promise<typeof familyMembers.$inferSelect> {
  const parent = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.userId, userId),
      eq(familyMembers.familyId, familyId),
      or(eq(familyMembers.role, 'parent_1'), eq(familyMembers.role, 'parent_2'))
    ),
  });

  if (!parent) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid parent ID - must be a parent in this family',
    });
  }

  return parent;
}

// ============================================================================
// INVITATION HELPERS
// ============================================================================

/**
 * Generate a cryptographically secure invitation token
 */
export function generateInvitationToken(): string {
  return randomBytes(INVITATION_TOKEN_BYTES).toString('hex');
}

/**
 * Calculate invitation expiration date
 * @param isEmailInvite - true for email invites (7 days), false for link invites (30 days)
 */
export function getInvitationExpirationDate(isEmailInvite: boolean): Date {
  const daysToExpire = isEmailInvite
    ? EMAIL_INVITATION_EXPIRY_DAYS
    : LINK_INVITATION_EXPIRY_DAYS;
  return new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000);
}

/**
 * Validate invitation status and expiration
 * @returns The validated invitation
 * @throws TRPCError if invitation is invalid, expired, or already used
 */
export async function validatePendingInvitation(
  db: Database,
  invitation: typeof familyInvitations.$inferSelect
): Promise<typeof familyInvitations.$inferSelect> {
  // Check if expired
  if (invitation.status === 'pending' && new Date() > invitation.expiresAt) {
    // Mark as expired
    await db
      .update(familyInvitations)
      .set({ status: 'expired' })
      .where(eq(familyInvitations.id, invitation.id));

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This invitation has expired',
    });
  }

  if (invitation.status !== 'pending') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `This invitation has already been ${invitation.status}`,
    });
  }

  return invitation;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a user's display name from first/last name or email
 */
export function formatUserDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  if (user.firstName) {
    return `${user.firstName} ${user.lastName || ''}`.trim();
  }
  return user.email;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

/**
 * Assert that a swap request is still pending
 * @throws TRPCError if swap is not pending
 */
export function assertSwapPending(status: string): void {
  if (status !== 'pending') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Swap request is already ${status}`,
    });
  }
}
