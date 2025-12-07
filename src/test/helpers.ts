/**
 * DRY Test Helpers
 *
 * Reusable assertions and utilities to reduce test boilerplate.
 */

import { expect } from 'vitest';
import type { SafeParseReturnType } from 'zod';

/**
 * Assert that a Zod parse result failed with a specific error message
 */
export function expectValidationError<T>(
  result: SafeParseReturnType<unknown, T>,
  messageContains: string
) {
  expect(result.success).toBe(false);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join(', ');
    expect(messages.toLowerCase()).toContain(messageContains.toLowerCase());
  }
}

/**
 * Assert that a Zod parse result failed on a specific field
 */
export function expectFieldError<T>(
  result: SafeParseReturnType<unknown, T>,
  fieldPath: string | string[]
) {
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    const expectedPath = Array.isArray(fieldPath) ? fieldPath.join('.') : fieldPath;
    expect(paths).toContain(expectedPath);
  }
}

/**
 * Assert that a Zod parse succeeded and return the data
 */
export function expectValidationSuccess<T>(
  result: SafeParseReturnType<unknown, T>
): T {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error(`Expected success but got: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Generate a valid UUID for tests
 */
export function testUUID(): string {
  return '550e8400-e29b-41d4-a716-446655440000';
}

/**
 * Generate a unique UUID for tests (different each call)
 */
let uuidCounter = 0;
export function uniqueTestUUID(): string {
  const hex = (uuidCounter++).toString(16).padStart(12, '0');
  return `550e8400-e29b-41d4-a716-${hex}`;
}

/**
 * Create a date in the past (days ago)
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Create a date in the future (days from now)
 */
export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Create a date at a specific hour today
 */
export function todayAt(hour: number, minute = 0): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Assert async function throws with specific error
 */
export async function expectAsyncError(
  fn: () => Promise<unknown>,
  errorContains: string
) {
  let error: Error | null = null;
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }
  expect(error).not.toBeNull();
  expect(error?.message.toLowerCase()).toContain(errorContains.toLowerCase());
}

/**
 * Assert tRPC error code
 */
export function expectTRPCErrorCode(error: unknown, code: string) {
  expect(error).toBeDefined();
  expect((error as { code?: string }).code).toBe(code);
}
