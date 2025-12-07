/**
 * Test Database Setup with PGLite
 *
 * Provides an in-memory Postgres database for integration tests.
 * Each test file gets a fresh database instance.
 */

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';

export type TestDatabase = ReturnType<typeof drizzle<typeof schema>>;

let testDb: TestDatabase | null = null;
let pgliteInstance: PGlite | null = null;

/**
 * Initialize a fresh test database
 * Call this in beforeAll() or beforeEach() depending on isolation needs
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  // Create in-memory PGLite instance
  pgliteInstance = new PGlite();
  testDb = drizzle(pgliteInstance, { schema });

  // Create enums first (PGLite requires explicit enum creation)
  await pgliteInstance.exec(`
    DO $$ BEGIN
      CREATE TYPE family_member_role AS ENUM ('parent_1', 'parent_2', 'attorney', 'grandparent');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE swap_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE notification_type AS ENUM ('schedule_change', 'swap_request', 'pickup_reminder');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create tables
  await pgliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS families (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role family_member_role NOT NULL,
      can_edit_schedule BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(family_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS children (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS visitation_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      parent_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      is_recurring BOOLEAN NOT NULL DEFAULT false,
      recurrence_rule JSONB,
      is_holiday_exception BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      created_by VARCHAR(255) NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS swap_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      event_id UUID NOT NULL REFERENCES visitation_events(id) ON DELETE CASCADE,
      requested_by VARCHAR(255) NOT NULL REFERENCES users(id),
      requested_to VARCHAR(255) NOT NULL REFERENCES users(id),
      new_start_time TIMESTAMPTZ NOT NULL,
      new_end_time TIMESTAMPTZ NOT NULL,
      reason TEXT NOT NULL,
      status swap_request_status NOT NULL DEFAULT 'pending',
      responded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id UUID NOT NULL,
      old_data JSONB,
      new_data JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      type notification_type NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      link VARCHAR(500),
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS family_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      invited_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255),
      token VARCHAR(64) NOT NULL UNIQUE,
      role family_member_role NOT NULL,
      can_edit_schedule BOOLEAN NOT NULL DEFAULT false,
      status invitation_status NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_by VARCHAR(255) REFERENCES users(id),
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  return testDb;
}

/**
 * Clean up the test database
 * Call this in afterAll() or afterEach()
 */
export async function destroyTestDatabase(): Promise<void> {
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
    testDb = null;
  }
}

/**
 * Get the current test database instance
 */
export function getTestDatabase(): TestDatabase {
  if (!testDb) {
    throw new Error('Test database not initialized. Call createTestDatabase() first.');
  }
  return testDb;
}

/**
 * Clear all data from the database (keeps schema)
 * Useful for resetting between tests without full teardown
 */
export async function clearTestDatabase(): Promise<void> {
  if (!pgliteInstance) return;

  await pgliteInstance.exec(`
    TRUNCATE TABLE family_invitations CASCADE;
    TRUNCATE TABLE notifications CASCADE;
    TRUNCATE TABLE audit_logs CASCADE;
    TRUNCATE TABLE swap_requests CASCADE;
    TRUNCATE TABLE visitation_events CASCADE;
    TRUNCATE TABLE children CASCADE;
    TRUNCATE TABLE family_members CASCADE;
    TRUNCATE TABLE families CASCADE;
    TRUNCATE TABLE users CASCADE;
  `);
}
