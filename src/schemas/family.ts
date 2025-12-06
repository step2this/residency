import { z } from 'zod';

// Create family schema
export const createFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required').max(255, 'Family name is too long'),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;

// Add family member schema
export const addFamilyMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['parent_1', 'parent_2', 'attorney', 'grandparent'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
  canEditSchedule: z.boolean().default(false),
});

export type AddFamilyMemberInput = z.infer<typeof addFamilyMemberSchema>;

// Update member role schema
export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  role: z.enum(['parent_1', 'parent_2', 'attorney', 'grandparent']),
  canEditSchedule: z.boolean(),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// Remove family member schema
export const removeFamilyMemberSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

export type RemoveFamilyMemberInput = z.infer<typeof removeFamilyMemberSchema>;
