/**
 * Frontend Integration Test
 *
 * Reproduces the exact query logic the frontend uses to help debug
 * why events aren't visible in the UI.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import 'temporal-polyfill/global';
import { createTestDatabase, destroyTestDatabase, clearTestDatabase, getTestDatabase } from '@/test/db';
import { createTestCaller } from '@/test/trpc';
import {
  createTestFamilySetup,
  createVisitationEvent,
} from '@/test/fixtures';
import { getDateRange, toPlainDate } from '@/lib/utils/date-utils';

describe('schedule frontend integration', () => {
  beforeAll(async () => {
    await createTestDatabase();
  });

  afterAll(async () => {
    await destroyTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('reproduces frontend query: event Dec 9-13 should be visible in Dec 8-14 week view', async () => {
    const { parent1, family, child } = await createTestFamilySetup();
    const db = getTestDatabase();

    // Create event exactly as reported by user: Dec 9-13
    const event = await createVisitationEvent({
      familyId: family.id,
      childId: child.id,
      parentId: parent1.id,
      createdBy: parent1.id,
      startTime: new Date('2025-12-09T09:00:00Z'),
      endTime: new Date('2025-12-13T17:00:00Z'),
    });

    console.log('Created event:', {
      id: event.id,
      startTime: event.startTime,
      endTime: event.endTime,
      startISO: event.startTime.toISOString(),
      endISO: event.endTime.toISOString(),
    });

    // Frontend logic: User is viewing Dec 9, 2025
    const selectedDateStr = '2025-12-09';
    const selectedDate = toPlainDate(selectedDateStr);

    // Frontend uses getDateRange which calculates: selectedDate -1 month to +2 months
    const { startDate, endDate } = getDateRange(selectedDate);

    console.log('Frontend date range:', {
      selectedDate: selectedDateStr,
      queryStart: startDate.toISOString(),
      queryEnd: endDate.toISOString(),
    });

    // Query using frontend's exact date range
    const caller = createTestCaller(db, parent1.id);
    const events = await caller.schedule.list({
      startDate,
      endDate,
    });

    console.log('Query returned events:', events.length);
    if (events.length > 0) {
      console.log('First event:', {
        id: events[0]?.id,
        startTime: events[0]?.startTime,
        endTime: events[0]?.endTime,
      });
    }

    // This should pass - if it fails, we've reproduced the bug
    expect(events).toHaveLength(1);
    expect(events[0]?.childId).toBe(child.id);
  });

  it('tests current date (today) to see if events around now are visible', async () => {
    const { parent1, family, child } = await createTestFamilySetup();
    const db = getTestDatabase();

    // Create event for current week
    const now = new Date();
    const startTime = new Date(now);
    startTime.setDate(now.getDate() - 2); // 2 days ago
    startTime.setHours(9, 0, 0, 0);

    const endTime = new Date(now);
    endTime.setDate(now.getDate() + 2); // 2 days from now
    endTime.setHours(17, 0, 0, 0);

    const event = await createVisitationEvent({
      familyId: family.id,
      childId: child.id,
      parentId: parent1.id,
      createdBy: parent1.id,
      startTime,
      endTime,
    });

    console.log('Created event for current week:', {
      id: event.id,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
    });

    // Use today's date as frontend would
    const todayStr = now.toISOString().split('T')[0] as string;
    const selectedDate = toPlainDate(todayStr);
    const { startDate, endDate } = getDateRange(selectedDate);

    console.log('Query range for today:', {
      today: todayStr,
      queryStart: startDate.toISOString(),
      queryEnd: endDate.toISOString(),
    });

    const caller = createTestCaller(db, parent1.id);
    const events = await caller.schedule.list({
      startDate,
      endDate,
    });

    console.log('Events returned:', events.length);

    // Event spanning current week should be visible
    expect(events).toHaveLength(1);
  });

  it('logs exact SQL query parameters to help debug', async () => {
    const { parent1, family } = await createTestFamilySetup();
    const db = getTestDatabase();

    // Use the exact date from user's report
    const selectedDateStr = '2025-12-09';
    const selectedDate = toPlainDate(selectedDateStr);
    const { startDate, endDate } = getDateRange(selectedDate);

    console.log('\n=== EXACT QUERY PARAMETERS ===');
    console.log('familyId:', family.id);
    console.log('startDate (JS Date):', startDate);
    console.log('startDate (ISO):', startDate.toISOString());
    console.log('startDate (timestamp):', startDate.getTime());
    console.log('endDate (JS Date):', endDate);
    console.log('endDate (ISO):', endDate.toISOString());
    console.log('endDate (timestamp):', endDate.getTime());
    console.log('\n=== SQL WHERE CLAUSE (conceptual) ===');
    console.log(`WHERE familyId = '${family.id}'`);
    console.log(`  AND startTime < '${endDate.toISOString()}'`);
    console.log(`  AND endTime > '${startDate.toISOString()}'`);
    console.log('==============================\n');

    const caller = createTestCaller(db, parent1.id);
    const events = await caller.schedule.list({
      startDate,
      endDate,
    });

    console.log('Query returned:', events.length, 'events');
  });
});
