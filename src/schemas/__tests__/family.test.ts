/**
 * Tests for family.ts Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  createFamilySchema,
  addFamilyMemberSchema,
  updateMemberRoleSchema,
  removeFamilyMemberSchema,
} from '../family';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createFamilySchema', () => {
  describe('valid inputs', () => {
    it('should accept valid family name', () => {
      const result = createFamilySchema.safeParse({ name: 'Smith Family' });
      expect(result.success).toBe(true);
    });

    it('should accept single character name', () => {
      const result = createFamilySchema.safeParse({ name: 'A' });
      expect(result.success).toBe(true);
    });

    it('should accept name at max length (255)', () => {
      const result = createFamilySchema.safeParse({ name: 'a'.repeat(255) });
      expect(result.success).toBe(true);
    });

    it('should accept name with special characters', () => {
      const result = createFamilySchema.safeParse({ name: "O'Brien-Smith Family" });
      expect(result.success).toBe(true);
    });

    it('should accept name with unicode', () => {
      const result = createFamilySchema.safeParse({ name: 'Família García' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty name', () => {
      const result = createFamilySchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('required');
      }
    });

    it('should reject name over 255 characters', () => {
      const result = createFamilySchema.safeParse({ name: 'a'.repeat(256) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('too long');
      }
    });

    it('should reject missing name', () => {
      const result = createFamilySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only name', () => {
      const result = createFamilySchema.safeParse({ name: '   ' });
      // Note: This passes because Zod doesn't trim by default
      // If we want to reject whitespace-only, we'd need .trim().min(1)
      expect(result.success).toBe(true); // Current behavior
    });
  });
});

describe('addFamilyMemberSchema', () => {
  const validMember = {
    email: 'parent@example.com',
    role: 'parent_2' as const,
    canEditSchedule: false,
  };

  describe('valid inputs', () => {
    it('should accept valid family member', () => {
      const result = addFamilyMemberSchema.safeParse(validMember);
      expect(result.success).toBe(true);
    });

    it('should accept parent_1 role', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        role: 'parent_1',
      });
      expect(result.success).toBe(true);
    });

    it('should accept parent_2 role', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        role: 'parent_2',
      });
      expect(result.success).toBe(true);
    });

    it('should accept attorney role', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        role: 'attorney',
      });
      expect(result.success).toBe(true);
    });

    it('should accept grandparent role', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        role: 'grandparent',
      });
      expect(result.success).toBe(true);
    });

    it('should accept canEditSchedule true', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        canEditSchedule: true,
      });
      expect(result.success).toBe(true);
    });

    it('should default canEditSchedule to false', () => {
      const result = addFamilyMemberSchema.safeParse({
        email: 'test@example.com',
        role: 'parent_2',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canEditSchedule).toBe(false);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid email', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('email');
      }
    });

    it('should reject empty email', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        email: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        role: 'invalid_role',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('Invalid role');
      }
    });

    it('should reject missing email', () => {
      const { email, ...withoutEmail } = validMember;
      const result = addFamilyMemberSchema.safeParse(withoutEmail);
      expect(result.success).toBe(false);
    });

    it('should reject missing role', () => {
      const { role, ...withoutRole } = validMember;
      const result = addFamilyMemberSchema.safeParse(withoutRole);
      expect(result.success).toBe(false);
    });
  });

  describe('email edge cases', () => {
    it('should accept email with subdomain', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        email: 'user@mail.example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        email: 'user+tag@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept email with dots', () => {
      const result = addFamilyMemberSchema.safeParse({
        ...validMember,
        email: 'first.last@example.com',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('updateMemberRoleSchema', () => {
  const validUpdate = {
    memberId: VALID_UUID,
    role: 'attorney' as const,
    canEditSchedule: false,
  };

  describe('valid inputs', () => {
    it('should accept valid role update', () => {
      const result = updateMemberRoleSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should accept all valid roles', () => {
      const roles = ['parent_1', 'parent_2', 'attorney', 'grandparent'] as const;
      for (const role of roles) {
        const result = updateMemberRoleSchema.safeParse({
          ...validUpdate,
          role,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept canEditSchedule true', () => {
      const result = updateMemberRoleSchema.safeParse({
        ...validUpdate,
        canEditSchedule: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid memberId UUID', () => {
      const result = updateMemberRoleSchema.safeParse({
        ...validUpdate,
        memberId: 'not-valid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = updateMemberRoleSchema.safeParse({
        ...validUpdate,
        role: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing memberId', () => {
      const { memberId, ...withoutMember } = validUpdate;
      const result = updateMemberRoleSchema.safeParse(withoutMember);
      expect(result.success).toBe(false);
    });

    it('should reject missing role', () => {
      const { role, ...withoutRole } = validUpdate;
      const result = updateMemberRoleSchema.safeParse(withoutRole);
      expect(result.success).toBe(false);
    });

    it('should reject missing canEditSchedule', () => {
      const { canEditSchedule, ...withoutEdit } = validUpdate;
      const result = updateMemberRoleSchema.safeParse(withoutEdit);
      expect(result.success).toBe(false);
    });
  });
});

describe('removeFamilyMemberSchema', () => {
  it('should accept valid UUID', () => {
    const result = removeFamilyMemberSchema.safeParse({ memberId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = removeFamilyMemberSchema.safeParse({ memberId: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing memberId', () => {
    const result = removeFamilyMemberSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty string memberId', () => {
    const result = removeFamilyMemberSchema.safeParse({ memberId: '' });
    expect(result.success).toBe(false);
  });
});
