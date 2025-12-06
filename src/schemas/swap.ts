import { z } from 'zod';

// Create swap request schema
export const createSwapRequestSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  newStartTime: z.coerce.date({
    required_error: 'New start time is required',
    invalid_type_error: 'Invalid start time',
  }),
  newEndTime: z.coerce.date({
    required_error: 'New end time is required',
    invalid_type_error: 'Invalid end time',
  }),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason is too long'),
}).refine(
  (data) => data.newEndTime > data.newStartTime,
  {
    message: 'New end time must be after new start time',
    path: ['newEndTime'],
  }
);

export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>;

// Approve swap request schema
export const approveSwapRequestSchema = z.object({
  id: z.string().uuid('Invalid swap request ID'),
});

export type ApproveSwapRequestInput = z.infer<typeof approveSwapRequestSchema>;

// Reject swap request schema
export const rejectSwapRequestSchema = z.object({
  id: z.string().uuid('Invalid swap request ID'),
});

export type RejectSwapRequestInput = z.infer<typeof rejectSwapRequestSchema>;

// Cancel swap request schema
export const cancelSwapRequestSchema = z.object({
  id: z.string().uuid('Invalid swap request ID'),
});

export type CancelSwapRequestInput = z.infer<typeof cancelSwapRequestSchema>;

// List swap requests schema
export const listSwapRequestsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
});

export type ListSwapRequestsInput = z.infer<typeof listSwapRequestsSchema>;
