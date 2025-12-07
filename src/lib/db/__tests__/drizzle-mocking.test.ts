/**
 * Drizzle Database Mocking Examples
 *
 * Shows common patterns for mocking Drizzle queries in tests.
 * These examples demonstrate how to handle Drizzle's chainable API.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDatabase, mockScheduleData, mockChildData } from './test-db';

// Type helper for the mock database - uses 'any' since this file demonstrates mocking patterns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockDb = ReturnType<typeof createMockDatabase> & { query: any };

/**
 * Pattern 1: Mocking Query Operations
 */
describe('Drizzle Query Mocking', () => {
  it('should mock findMany with return value', async () => {
    const db = createMockDatabase() as MockDb;

    // Mock response
    vi.mocked(db.query.schedules.findMany).mockResolvedValue([mockScheduleData]);

    // Call
    const result = await db.query.schedules.findMany();

    // Assert
    expect(result).toEqual([mockScheduleData]);
    expect(db.query.schedules.findMany).toHaveBeenCalled();
  });

  it('should mock findUnique with specific ID', async () => {
    const db = createMockDatabase() as MockDb;

    vi.mocked(db.query.schedules.findUnique).mockResolvedValue(mockScheduleData);

    const result = await db.query.schedules.findUnique({
      where: { id: 'sched-123' },
    });

    expect(result).toEqual(mockScheduleData);
    expect(db.query.schedules.findUnique).toHaveBeenCalledWith({
      where: { id: 'sched-123' },
    });
  });

  it('should mock findUnique returning null for not found', async () => {
    const db = createMockDatabase() as MockDb;

    vi.mocked(db.query.schedules.findUnique).mockResolvedValue(null);

    const result = await db.query.schedules.findUnique({
      where: { id: 'non-existent' },
    });

    expect(result).toBeNull();
  });
});

/**
 * Pattern 2: Mocking Insert/Update/Delete (Chainable Methods)
 *
 * Drizzle uses chainable methods like:
 * db.insert(table).values(...).returning()
 *
 * To mock these, we need to mock each level of the chain.
 */
describe('Drizzle Mutation Mocking', () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDatabase() as MockDb;
  });

  it('should mock insert chain', async () => {
    const inserted = { ...mockScheduleData, id: 'new-sched' };

    // Mock the chainable methods
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([inserted]),
      }),
    } as any);

    // Simulate the chain: db.insert(table).values(...).returning()
    const result = await db.insert({} as any)
      .values({} as any)
      .returning();

    expect(result).toEqual([inserted]);
  });

  it('should mock update chain', async () => {
    const updated = { ...mockScheduleData, title: 'Updated title' };

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    } as any);

    const result = await db.update({} as any)
      .set({} as any)
      .where({} as any)
      .returning();

    expect(result).toEqual([updated]);
  });

  it('should mock delete chain', async () => {
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockScheduleData]),
      }),
    } as any);

    const result = await db.delete({} as any)
      .where({} as any)
      .returning();

    expect(result).toEqual([mockScheduleData]);
  });
});

/**
 * Pattern 3: Query-specific mocking with complex filters
 */
describe('Complex Query Mocking', () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDatabase() as MockDb;
  });

  it('should mock filtered query with relations', async () => {
    const scheduleWithChildren = {
      ...mockScheduleData,
      children: [mockChildData],
    };

    vi.mocked(db.query.schedules.findMany).mockResolvedValue([scheduleWithChildren] as any);

    const result = await db.query.schedules.findMany({
      where: { userId: 'user-123' },
      with: { children: true },
    });

    expect(result).toHaveLength(1);
    expect(result[0].children).toBeDefined();
  });

  it('should handle filtered queries returning empty array', async () => {
    vi.mocked(db.query.schedules.findMany).mockResolvedValue([]);

    const result = await db.query.schedules.findMany({
      where: { userId: 'non-existent-user' },
    });

    expect(result).toEqual([]);
  });
});

/**
 * Pattern 4: Error Handling in Mocked Queries
 */
describe('Mocked Database Errors', () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDatabase() as MockDb;
  });

  it('should handle database constraint violations', async () => {
    const error = new Error('Unique constraint violation');
    vi.mocked(db.insert).mockRejectedValue(error);

    await expect(db.insert({} as any)).rejects.toThrow('Unique constraint violation');
  });

  it('should handle connection errors', async () => {
    const error = new Error('Database connection failed');
    vi.mocked(db.query.schedules.findMany).mockRejectedValue(error);

    await expect(db.query.schedules.findMany()).rejects.toThrow('connection failed');
  });

  it('should handle timeout errors', async () => {
    const error = new Error('Query timeout');
    vi.mocked(db.query.schedules.findMany).mockRejectedValue(error);

    await expect(db.query.schedules.findMany()).rejects.toThrow('timeout');
  });
});

/**
 * Pattern 5: Verifying Database Calls
 *
 * Assert how your code interacted with the database
 */
describe('Verifying Database Interactions', () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDatabase() as MockDb;
    vi.mocked(db.query.schedules.findMany).mockResolvedValue([mockScheduleData]);
  });

  it('should verify correct query parameters were passed', async () => {
    await db.query.schedules.findMany({
      where: { userId: 'user-123' },
    });

    expect(db.query.schedules.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
      }),
    );
  });

  it('should verify multiple database calls in sequence', async () => {
    // First call
    await db.query.schedules.findMany();

    // Second call
    await db.query.schedules.findMany();

    expect(db.query.schedules.findMany).toHaveBeenCalledTimes(2);
  });
});
