/**
 * tRPC Testing Utilities
 *
 * Provides helpers for testing tRPC routers without mocking the entire setup.
 * Uses createCallerFactory which is the official recommended pattern.
 */

import { vi, expect } from 'vitest';
import type { inferRouterInputs, inferRouterOutputs, AnyRouter } from '@trpc/server';

/**
 * Create a test context for tRPC procedures
 * Replace with your actual context factory
 */
export async function createMockContext(overrides = {}) {
  return {
    userId: 'test-user-id',
    db: {
      query: {},
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any,
    ...overrides,
  };
}

/**
 * Helper to create a tRPC router caller for testing
 *
 * Usage:
 * ```typescript
 * const caller = await createRouterCaller(router, { userId: 'custom-id' });
 * const result = await caller.schedule.create({ ... });
 * ```
 *
 * Note: Use your router's createCallerFactory() method directly:
 * const caller = await router.createCaller(ctx);
 */
export async function createRouterCaller<T extends { createCaller: any }>(
  routerOrFactory: T,
  contextOverrides?: Record<string, any>,
) {
  const context = await createMockContext(contextOverrides);
  // This assumes your router has createCaller method from createCallerFactory
  return routerOrFactory.createCaller(context);
}

/**
 * Create a protected caller (for authenticated tests)
 */
export async function createProtectedCaller<T extends { createCaller: any }>(
  routerOrFactory: T,
  userId: string = 'test-user-id',
) {
  return createRouterCaller(routerOrFactory, { userId });
}

/**
 * Helper to mock Drizzle database responses
 * Pattern for mocking chained methods
 */
export function mockDrizzleQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
  };
}

/**
 * Helper to mock Drizzle insert/update/delete operations
 */
export function mockDrizzleMutation() {
  return {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
}

/**
 * Assert that a tRPC error was thrown with the expected code
 */
export function expectTRPCError(error: any, expectedCode: string) {
  expect(error).toBeDefined();
  expect(error.code).toBe(expectedCode);
}

/**
 * Helper type for inferring router inputs
 */
export type RouterInputs<T extends AnyRouter> = inferRouterInputs<T>;

/**
 * Helper type for inferring router outputs
 */
export type RouterOutputs<T extends AnyRouter> = inferRouterOutputs<T>;
