/**
 * Test Fixtures Factory
 *
 * Create consistent test data for integration tests.
 * All fixtures use real database inserts for behavior testing.
 */

import { getTestDatabase } from './db';
import {
  users,
  families,
  familyMembers,
  children,
  visitationEvents,
  swapRequests,
} from '@/lib/db/schema';

// Counter for unique IDs
let idCounter = 0;
const uniqueId = () => `test-${++idCounter}-${Date.now()}`;

/**
 * Create a test user
 */
export async function createUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const db = getTestDatabase();
  const id = overrides.id ?? uniqueId();

  const [user] = await db
    .insert(users)
    .values({
      id,
      email: overrides.email ?? `${id}@test.com`,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      ...overrides,
    })
    .returning();

  return user!;
}

/**
 * Create a test family
 */
export async function createFamily(overrides: Partial<typeof families.$inferInsert> = {}) {
  const db = getTestDatabase();

  const [family] = await db
    .insert(families)
    .values({
      name: overrides.name ?? 'Test Family',
      ...overrides,
    })
    .returning();

  return family!;
}

/**
 * Create a family member (links user to family)
 */
export async function createFamilyMember(
  overrides: Partial<typeof familyMembers.$inferInsert> & {
    familyId: string;
    userId: string;
  }
) {
  const db = getTestDatabase();

  const [member] = await db
    .insert(familyMembers)
    .values({
      role: overrides.role ?? 'parent_1',
      canEditSchedule: overrides.canEditSchedule ?? true,
      ...overrides,
    })
    .returning();

  return member!;
}

/**
 * Create a child
 */
export async function createChild(
  overrides: Partial<typeof children.$inferInsert> & { familyId: string }
) {
  const db = getTestDatabase();

  const [child] = await db
    .insert(children)
    .values({
      firstName: overrides.firstName ?? 'Child',
      lastName: overrides.lastName ?? 'Test',
      dateOfBirth: overrides.dateOfBirth ?? '2018-01-15',
      ...overrides,
    })
    .returning();

  return child!;
}

/**
 * Create a visitation event
 */
export async function createVisitationEvent(
  overrides: Partial<typeof visitationEvents.$inferInsert> & {
    familyId: string;
    childId: string;
    parentId: string;
    createdBy: string;
  }
) {
  const db = getTestDatabase();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [event] = await db
    .insert(visitationEvents)
    .values({
      startTime: overrides.startTime ?? now,
      endTime: overrides.endTime ?? tomorrow,
      isRecurring: overrides.isRecurring ?? false,
      ...overrides,
    })
    .returning();

  return event!;
}

/**
 * Create a swap request
 */
export async function createSwapRequest(
  overrides: Partial<typeof swapRequests.$inferInsert> & {
    familyId: string;
    eventId: string;
    requestedBy: string;
    requestedTo: string;
  }
) {
  const db = getTestDatabase();
  const now = new Date();
  const later = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const [swap] = await db
    .insert(swapRequests)
    .values({
      newStartTime: overrides.newStartTime ?? now,
      newEndTime: overrides.newEndTime ?? later,
      reason: overrides.reason ?? 'Test swap reason',
      status: overrides.status ?? 'pending',
      ...overrides,
    })
    .returning();

  return swap!;
}

/**
 * Create a complete test family setup with two parents and a child
 * Returns all created entities for use in tests
 */
export async function createTestFamilySetup() {
  // Create users
  const parent1 = await createUser({
    firstName: 'Parent',
    lastName: 'One',
  });

  const parent2 = await createUser({
    firstName: 'Parent',
    lastName: 'Two',
  });

  // Create family
  const family = await createFamily({ name: 'Test Family' });

  // Add both parents to family
  const member1 = await createFamilyMember({
    familyId: family.id,
    userId: parent1.id,
    role: 'parent_1',
    canEditSchedule: true,
  });

  const member2 = await createFamilyMember({
    familyId: family.id,
    userId: parent2.id,
    role: 'parent_2',
    canEditSchedule: true,
  });

  // Create a child
  const child = await createChild({
    familyId: family.id,
    firstName: 'Emma',
    lastName: 'Test',
  });

  return {
    parent1,
    parent2,
    family,
    member1,
    member2,
    child,
  };
}
