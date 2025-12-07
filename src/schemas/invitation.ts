import { z } from 'zod';

// Role validation (matches familyMemberRoleEnum)
const invitationRoleSchema = z.enum(['parent_2', 'attorney', 'grandparent'], {
  errorMap: () => ({ message: 'Invalid role. Must be parent_2, attorney, or grandparent' }),
});

// Status validation (matches invitationStatusEnum)
export const invitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked']);

export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type InvitationRole = z.infer<typeof invitationRoleSchema>;

// Create email invitation (sends email with token)
export const createEmailInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: invitationRoleSchema,
  canEditSchedule: z.boolean().default(false),
});

export type CreateEmailInvitationInput = z.infer<typeof createEmailInvitationSchema>;

// Create link invitation (generates shareable URL)
export const createLinkInvitationSchema = z.object({
  role: invitationRoleSchema,
  canEditSchedule: z.boolean().default(false),
});

export type CreateLinkInvitationInput = z.infer<typeof createLinkInvitationSchema>;

// Accept invitation
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required').max(64),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// Get invitation by token (for public viewing)
export const getInvitationByTokenSchema = z.object({
  token: z.string().min(1, 'Token is required').max(64),
});

export type GetInvitationByTokenInput = z.infer<typeof getInvitationByTokenSchema>;

// Revoke invitation
export const revokeInvitationSchema = z.object({
  id: z.string().uuid('Invalid invitation ID'),
});

export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>;

// List invitations (with optional status filter)
export const listInvitationsSchema = z.object({
  status: invitationStatusSchema.optional(),
});

export type ListInvitationsInput = z.infer<typeof listInvitationsSchema>;
