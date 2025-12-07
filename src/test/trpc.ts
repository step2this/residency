/**
 * tRPC Test Utilities
 *
 * Create tRPC callers with test database for integration tests.
 */

import { appRouter } from '@/lib/trpc/routers';
import type { TestDatabase } from './db';
import type { Context } from '@/lib/trpc/context';

/**
 * Create a tRPC caller for testing
 * @param db - Test database instance
 * @param userId - User ID (null for unauthenticated)
 */
export function createTestCaller(db: TestDatabase, userId: string | null = null) {
  // Cast TestDatabase to Database type - they're compatible for testing
  const ctx: Context = {
    db: db as unknown as Context['db'],
    userId,
  };

  // In tRPC v11, routers have a createCaller method directly
  return appRouter.createCaller(ctx);
}

/**
 * Type for the test caller
 */
export type TestCaller = ReturnType<typeof createTestCaller>;
