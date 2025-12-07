/**
 * tRPC Test Utilities
 *
 * Create tRPC callers with test database for integration tests.
 */

import { appRouter } from '@/lib/trpc/routers';
import type { TestDatabase } from './db';
import type { Context } from '@/lib/trpc/context';

/**
 * Create a tRPC caller for testing with authenticated user
 * @param db - Test database instance
 * @param userId - User ID
 */
export function createTestCaller(db: TestDatabase, userId: string) {
  // Cast TestDatabase to Database type - they're compatible for testing
  const ctx: Context = {
    db: db as unknown as Context['db'],
    userId,
  };

  // In tRPC v11, routers have a createCaller method directly
  return appRouter.createCaller(ctx);
}

/**
 * Create a tRPC caller for testing public/unauthenticated endpoints
 * @param db - Test database instance
 */
export function createPublicCaller(db: TestDatabase) {
  const ctx: Context = {
    db: db as unknown as Context['db'],
    userId: null,
  };

  return appRouter.createCaller(ctx);
}

/**
 * Type for the test caller
 */
export type TestCaller = ReturnType<typeof createTestCaller>;
export type PublicTestCaller = ReturnType<typeof createPublicCaller>;
