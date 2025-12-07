/**
 * Database Testing Setup
 *
 * For your Neon Postgres + Drizzle setup, we have two strategies:
 *
 * 1. UNIT TESTS: Mock the database entirely (faster, isolated)
 * 2. INTEGRATION TESTS: Use PGLite for in-memory Postgres (more realistic)
 *
 * This file demonstrates both approaches.
 */

import { vi, expect } from 'vitest';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

/**
 * STRATEGY 1: Mock Database (Unit Tests)
 * ========================================
 *
 * Use this for fast, isolated tests that don't need a real database.
 * Best for testing business logic, validation, and error handling.
 */

export function createMockDatabase() {
  return {
    query: {
      schedules: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      children: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
  } as unknown as NeonHttpDatabase;
}

/**
 * Example mock responses for common operations
 */
export const mockScheduleData = {
  id: 'sched-123',
  userId: 'user-123',
  title: 'Summer vacation',
  startTime: new Date('2025-06-01'),
  endTime: new Date('2025-06-08'),
  recurring: null,
  createdAt: new Date('2025-01-01'),
};

export const mockChildData = {
  id: 'child-123',
  userId: 'user-123',
  name: 'Alice',
  dateOfBirth: new Date('2015-01-01'),
  createdAt: new Date('2025-01-01'),
};

/**
 * STRATEGY 2: In-Memory PGLite (Integration Tests)
 * =================================================
 *
 * This approach uses PGLite (Postgres compiled to WASM) for real testing.
 * Setup requires: pnpm add -D @electric-sql/pglite drizzle-kit
 *
 * Uncomment and use this in your test files for integration tests.
 */

/*
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '../schema';

let testDb: ReturnType<typeof drizzle>;

export async function initializeTestDatabase() {
  // Create in-memory Postgres instance
  const client = new PGlite();

  // Initialize Drizzle with PGLite
  testDb = drizzle(client, { schema });

  // Push schema to test database (replaces migrations)
  // This requires: import { pushSchema } from 'drizzle-kit/api';
  // await pushSchema(testDb);

  return testDb;
}

export async function teardownTestDatabase() {
  // Cleanup (PGLite closes automatically)
}

export function getTestDatabase() {
  return testDb;
}
*/

/**
 * Database Mock Helper Functions
 * ==============================
 */

/**
 * Mock a query that returns data
 */
export function mockDatabaseQuery<T>(data: T) {
  const mockDb = createMockDatabase();

  return {
    db: mockDb,
    mockQueryResponse: (path: string[], response: T) => {
      if (path.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current = mockDb.query as any;
      for (const key of path.slice(0, -1)) {
        current = current[key];
      }
      const lastKey = path[path.length - 1];
      if (lastKey) {
        current[lastKey].findMany.mockResolvedValue(response);
      }
    },
  };
}

/**
 * Verify database interactions in tests
 */
export function expectDatabaseCall(mockFn: ReturnType<typeof vi.fn>, args?: any) {
  expect(mockFn).toHaveBeenCalled();
  if (args) {
    expect(mockFn).toHaveBeenCalledWith(expect.objectContaining(args));
  }
}

/**
 * Create a test context with mocked database
 */
export function createTestContextWithDb(userId: string = 'test-user') {
  return {
    userId,
    db: createMockDatabase(),
  };
}
