/**
 * Invitation Router Integration Tests
 *
 * Tests the invitation system business logic with a real database.
 * Key behaviors tested:
 * - Email and link invitation creation
 * - Invitation acceptance and family joining
 * - Token validation and expiration
 * - Authorization (only users with edit permission can invite)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDatabase, destroyTestDatabase, clearTestDatabase, getTestDatabase } from '@/test/db';
import { createTestCaller, createPublicCaller } from '@/test/trpc';
import {
  createUser,
  createFamily,
  createFamilyMember,
  createInvitation,
} from '@/test/fixtures';

describe('invitation router', () => {
  beforeAll(async () => {
    await createTestDatabase();
  });

  afterAll(async () => {
    await destroyTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('invitation.createEmailInvite', () => {
    it('creates an email invitation successfully', async () => {
      const user = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: user.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, user.id);

      const invitation = await caller.invitation.createEmailInvite({
        email: 'invited@test.com',
        role: 'parent_2',
        canEditSchedule: true,
      });

      expect(invitation).toBeDefined();
      expect(invitation!.email).toBe('invited@test.com');
      expect(invitation!.role).toBe('parent_2');
      expect(invitation!.token).toBeDefined();
      expect(invitation!.token!.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('rejects invitation from user without edit permission', async () => {
      const user = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: user.id,
        role: 'attorney',
        canEditSchedule: false,
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, user.id);

      await expect(
        caller.invitation.createEmailInvite({
          email: 'invited@test.com',
          role: 'parent_2',
          canEditSchedule: false,
        })
      ).rejects.toThrow('permission');
    });

    it('rejects duplicate pending invitation for same email', async () => {
      const user = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: user.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      // Create existing pending invitation
      await createInvitation({
        familyId: family.id,
        invitedBy: user.id,
        email: 'invited@test.com',
        status: 'pending',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, user.id);

      await expect(
        caller.invitation.createEmailInvite({
          email: 'invited@test.com',
          role: 'parent_2',
          canEditSchedule: false,
        })
      ).rejects.toThrow('already been sent');
    });
  });

  describe('invitation.createLinkInvite', () => {
    it('creates a link invitation without email', async () => {
      const user = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: user.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, user.id);

      const invitation = await caller.invitation.createLinkInvite({
        role: 'grandparent',
        canEditSchedule: false,
      });

      expect(invitation).toBeDefined();
      expect(invitation!.role).toBe('grandparent');
      expect(invitation!.token).toBeDefined();
      // Link invites should not have email property in response
      expect(invitation).not.toHaveProperty('email');
    });
  });

  describe('invitation.getByToken', () => {
    it('returns invitation details for valid token', async () => {
      const inviter = await createUser({ firstName: 'John', lastName: 'Doe' });
      const family = await createFamily({ name: 'Doe Family' });
      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
        email: 'invitee@test.com',
        role: 'parent_2',
      });

      const db = getTestDatabase();
      const caller = createPublicCaller(db);

      const result = await caller.invitation.getByToken({
        token: invitation.token,
      });

      expect(result.familyName).toBe('Doe Family');
      expect(result.inviterName).toBe('John Doe');
      expect(result.role).toBe('parent_2');
    });

    it('rejects invalid token', async () => {
      const db = getTestDatabase();
      const caller = createPublicCaller(db);

      await expect(
        caller.invitation.getByToken({ token: 'nonexistent-token' })
      ).rejects.toThrow('not found');
    });

    it('rejects expired invitation', async () => {
      const inviter = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      // Create expired invitation
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
        expiresAt: expiredDate,
      });

      const db = getTestDatabase();
      const caller = createPublicCaller(db);

      await expect(
        caller.invitation.getByToken({ token: invitation.token })
      ).rejects.toThrow('expired');
    });

    it('rejects already accepted invitation', async () => {
      const inviter = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
        status: 'accepted',
      });

      const db = getTestDatabase();
      const caller = createPublicCaller(db);

      await expect(
        caller.invitation.getByToken({ token: invitation.token })
      ).rejects.toThrow('accepted');
    });
  });

  describe('invitation.accept', () => {
    it('accepts invitation and adds user to family', async () => {
      const inviter = await createUser();
      const family = await createFamily({ name: 'Test Family' });
      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
        role: 'parent_2',
        canEditSchedule: true,
      });

      // Create the new user who will accept
      const invitee = await createUser({ email: 'newuser@test.com' });

      const db = getTestDatabase();
      const caller = createTestCaller(db, invitee.id);

      const result = await caller.invitation.accept({
        token: invitation.token,
      });

      expect(result.familyId).toBe(family.id);
      expect(result.familyName).toBe('Test Family');
      expect(result.role).toBe('parent_2');

      // Verify user is now a member
      const { familyMembers } = await import('@/lib/db/schema');
      const { eq, and } = await import('drizzle-orm');

      const membership = await db.query.familyMembers.findFirst({
        where: and(
          eq(familyMembers.familyId, family.id),
          eq(familyMembers.userId, invitee.id)
        ),
      });

      expect(membership).toBeDefined();
      expect(membership!.role).toBe('parent_2');
      expect(membership!.canEditSchedule).toBe(true);
    });

    it('rejects acceptance if user already in family', async () => {
      const inviter = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
      });

      // Create user and add them to the family already
      const existingMember = await createUser();
      await createFamilyMember({
        familyId: family.id,
        userId: existingMember.id,
        role: 'parent_2',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, existingMember.id);

      await expect(
        caller.invitation.accept({ token: invitation.token })
      ).rejects.toThrow('already a member');
    });

    it('rejects acceptance if user belongs to another family', async () => {
      // Create first family with invitation
      const inviter1 = await createUser();
      const family1 = await createFamily({ name: 'Family 1' });
      await createFamilyMember({
        familyId: family1.id,
        userId: inviter1.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const invitation = await createInvitation({
        familyId: family1.id,
        invitedBy: inviter1.id,
      });

      // Create second family with user already a member
      const family2 = await createFamily({ name: 'Family 2' });
      const userInFamily2 = await createUser();
      await createFamilyMember({
        familyId: family2.id,
        userId: userInFamily2.id,
        role: 'parent_1',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, userInFamily2.id);

      await expect(
        caller.invitation.accept({ token: invitation.token })
      ).rejects.toThrow('already a member of another family');
    });
  });

  describe('invitation.list', () => {
    it('lists all invitations for a family', async () => {
      const user = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: user.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      // Create multiple invitations
      await createInvitation({
        familyId: family.id,
        invitedBy: user.id,
        email: 'invite1@test.com',
        status: 'pending',
      });
      await createInvitation({
        familyId: family.id,
        invitedBy: user.id,
        email: 'invite2@test.com',
        status: 'accepted',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, user.id);

      const invitations = await caller.invitation.list({});

      expect(invitations).toHaveLength(2);
    });

    it('filters invitations by status', async () => {
      const user = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: user.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      await createInvitation({
        familyId: family.id,
        invitedBy: user.id,
        status: 'pending',
      });
      await createInvitation({
        familyId: family.id,
        invitedBy: user.id,
        status: 'accepted',
      });
      await createInvitation({
        familyId: family.id,
        invitedBy: user.id,
        status: 'revoked',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, user.id);

      const pending = await caller.invitation.list({ status: 'pending' });
      expect(pending).toHaveLength(1);
      expect(pending[0]!.status).toBe('pending');
    });
  });

  describe('invitation.revoke', () => {
    it('allows inviter to revoke their invitation', async () => {
      const inviter = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
        status: 'pending',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, inviter.id);

      const revoked = await caller.invitation.revoke({ id: invitation.id });

      expect(revoked!.status).toBe('revoked');
    });

    it('allows user with edit permission to revoke any invitation', async () => {
      const inviter = await createUser();
      const admin = await createUser();
      const family = await createFamily();

      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });
      await createFamilyMember({
        familyId: family.id,
        userId: admin.id,
        role: 'parent_2',
        canEditSchedule: true,
      });

      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
        status: 'pending',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, admin.id);

      const revoked = await caller.invitation.revoke({ id: invitation.id });

      expect(revoked!.status).toBe('revoked');
    });

    it('rejects revocation from non-inviter without edit permission', async () => {
      const inviter = await createUser();
      const viewer = await createUser();
      const family = await createFamily();

      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });
      await createFamilyMember({
        familyId: family.id,
        userId: viewer.id,
        role: 'grandparent',
        canEditSchedule: false,
      });

      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
        status: 'pending',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, viewer.id);

      await expect(
        caller.invitation.revoke({ id: invitation.id })
      ).rejects.toThrow('inviter or a family admin');
    });

    it('rejects revoking non-pending invitation', async () => {
      const inviter = await createUser();
      const family = await createFamily();
      await createFamilyMember({
        familyId: family.id,
        userId: inviter.id,
        role: 'parent_1',
        canEditSchedule: true,
      });

      const invitation = await createInvitation({
        familyId: family.id,
        invitedBy: inviter.id,
        status: 'accepted',
      });

      const db = getTestDatabase();
      const caller = createTestCaller(db, inviter.id);

      await expect(
        caller.invitation.revoke({ id: invitation.id })
      ).rejects.toThrow('already accepted');
    });
  });
});
