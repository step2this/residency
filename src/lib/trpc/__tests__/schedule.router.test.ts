/**
 * Example tRPC Router Testing
 *
 * This demonstrates the recommended pattern for testing tRPC procedures
 * using createCallerFactory without mocking the entire tRPC setup.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createMockContext, expectTRPCError } from './test-utils';

/**
 * Example router implementation (your actual router)
 * In real code, import your actual router
 */

// First, let's create a minimal example router for demonstration
import { initTRPC } from '@trpc/server';

const t = initTRPC.context<Awaited<ReturnType<typeof createMockContext>>>().create();

const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

// Example router
const exampleScheduleRouter = t.router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        startTime: z.date(),
        endTime: z.date(),
        childIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // In real code, this would save to database
      return {
        id: 'schedule-123',
        userId: ctx.userId,
        ...input,
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    // In real code, fetch from database
    return [
      {
        id: 'schedule-123',
        title: 'Test Schedule',
        userId: ctx.userId,
        startTime: new Date('2025-01-01'),
        endTime: new Date('2025-01-02'),
      },
    ];
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Simulate database lookup
      if (input.id === 'not-found') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      return {
        id: input.id,
        userId: ctx.userId,
        title: 'Test',
        startTime: new Date('2025-01-01'),
        endTime: new Date('2025-01-02'),
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Simulate ownership check
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      return { success: true };
    }),
});

// Create caller factory (tRPC v11 syntax)
const createCaller = t.createCallerFactory(exampleScheduleRouter);

describe('Schedule Router', () => {
  describe('Protected procedures', () => {
    it('should reject unauthenticated calls', async () => {
      const context = await createMockContext({ userId: null });
      const caller = exampleScheduleRouter.createCaller(context);

      await expect(caller.create({
        title: 'Test',
        startTime: new Date(),
        endTime: new Date(),
        childIds: ['550e8400-e29b-41d4-a716-446655440000'],
      })).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('create mutation', () => {
    let caller: Awaited<ReturnType<typeof createCaller>>;

    beforeEach(async () => {
      const context = await createMockContext({
        userId: 'user-123',
      });
      caller = await createCaller(context);
    });

    it('should create a schedule with valid input', async () => {
      const input = {
        title: 'Summer vacation',
        startTime: new Date('2025-06-01'),
        endTime: new Date('2025-06-08'),
        childIds: ['550e8400-e29b-41d4-a716-446655440000'],
      };

      const result = await caller.create(input);

      expect(result).toMatchObject({
        id: 'schedule-123',
        userId: 'user-123',
        title: 'Summer vacation',
      });
    });

    it('should reject empty title', async () => {
      await expect(caller.create({
        title: '',
        startTime: new Date(),
        endTime: new Date(),
        childIds: ['550e8400-e29b-41d4-a716-446655440000'],
      })).rejects.toThrow();
    });

    it('should reject empty childIds array', async () => {
      await expect(caller.create({
        title: 'Test',
        startTime: new Date(),
        endTime: new Date(),
        childIds: [],
      })).rejects.toThrow();
    });
  });

  describe('list query', () => {
    it('should return schedules for authenticated user', async () => {
      const context = await createMockContext({ userId: 'user-123' });
      const caller = await createCaller(context);

      const result = await caller.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.userId).toBe('user-123');
    });

    it('should not return schedules for unauthenticated users', async () => {
      const context = await createMockContext({ userId: null });
      const caller = exampleScheduleRouter.createCaller(context);

      await expect(caller.list()).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('getById query', () => {
    let caller: Awaited<ReturnType<typeof createCaller>>;

    beforeEach(async () => {
      const context = await createMockContext({ userId: 'user-123' });
      caller = await createCaller(context);
    });

    it('should return schedule by id', async () => {
      const result = await caller.getById({ id: 'schedule-123' });

      expect(result).toMatchObject({
        id: 'schedule-123',
        title: 'Test',
      });
    });

    it('should throw NOT_FOUND for missing schedule', async () => {
      await expect(caller.getById({ id: 'not-found' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('delete mutation', () => {
    it('should delete schedule successfully', async () => {
      const context = await createMockContext({ userId: 'user-123' });
      const caller = await createCaller(context);

      const result = await caller.delete({ id: 'schedule-123' });

      expect(result.success).toBe(true);
    });
  });
});
