import { z } from 'zod';

// Create child schema
export const createChildSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  dateOfBirth: z.coerce
    .date({
      required_error: 'Date of birth is required',
      invalid_type_error: 'Invalid date format',
    })
    .max(new Date(), 'Date of birth cannot be in the future'),
});

export type CreateChildInput = z.infer<typeof createChildSchema>;

// Update child schema
export const updateChildSchema = z.object({
  id: z.string().uuid('Invalid child ID'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.coerce
    .date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .optional(),
});

export type UpdateChildInput = z.infer<typeof updateChildSchema>;

// Delete child schema
export const deleteChildSchema = z.object({
  id: z.string().uuid('Invalid child ID'),
});

export type DeleteChildInput = z.infer<typeof deleteChildSchema>;
