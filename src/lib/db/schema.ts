import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  date,
  pgEnum,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const familyMemberRoleEnum = pgEnum('family_member_role', [
  'parent_1',
  'parent_2',
  'attorney',
  'grandparent',
]);

export const swapRequestStatusEnum = pgEnum('swap_request_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'schedule_change',
  'swap_request',
  'pickup_reminder',
]);

// ============================================================================
// TABLES
// ============================================================================

// Users table (synced from Clerk)
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk user ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Families table (multi-tenancy boundary)
export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Family members table (co-parents, attorneys, grandparents)
export const familyMembers = pgTable(
  'family_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: familyMemberRoleEnum('role').notNull(),
    canEditSchedule: boolean('can_edit_schedule').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('family_members_family_id_idx').on(table.familyId),
    userIdIdx: index('family_members_user_id_idx').on(table.userId),
    familyUserUnique: unique('family_members_family_user_unique').on(
      table.familyId,
      table.userId
    ),
  })
);

// Children table (managed entities, not users)
export const children = pgTable(
  'children',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('children_family_id_idx').on(table.familyId),
  })
);

// Visitation events table (schedule entries)
export const visitationEvents = pgTable(
  'visitation_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    parentId: varchar('parent_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    isRecurring: boolean('is_recurring').notNull().default(false),
    recurrenceRule: jsonb('recurrence_rule'), // RRULE format
    isHolidayException: boolean('is_holiday_exception').notNull().default(false),
    notes: text('notes'),
    createdBy: varchar('created_by', { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('visitation_events_family_id_idx').on(table.familyId),
    familyStartTimeIdx: index('visitation_events_family_start_time_idx').on(
      table.familyId,
      table.startTime
    ),
    childIdIdx: index('visitation_events_child_id_idx').on(table.childId),
    parentIdIdx: index('visitation_events_parent_id_idx').on(table.parentId),
  })
);

// Swap requests table (parent-to-parent schedule changes)
export const swapRequests = pgTable(
  'swap_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => visitationEvents.id, { onDelete: 'cascade' }),
    requestedBy: varchar('requested_by', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestedTo: varchar('requested_to', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    newStartTime: timestamp('new_start_time', { withTimezone: true }).notNull(),
    newEndTime: timestamp('new_end_time', { withTimezone: true }).notNull(),
    reason: text('reason').notNull(),
    status: swapRequestStatusEnum('status').notNull().default('pending'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('swap_requests_family_id_idx').on(table.familyId),
    eventIdIdx: index('swap_requests_event_id_idx').on(table.eventId),
    statusIdx: index('swap_requests_status_idx').on(table.status),
    requestedToIdx: index('swap_requests_requested_to_idx').on(table.requestedTo),
  })
);

// Audit log table (for legal trail)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 100 }).notNull(), // e.g., 'schedule.create', 'swap.approve'
    entityType: varchar('entity_type', { length: 100 }).notNull(), // e.g., 'visitation_event', 'swap_request'
    entityId: uuid('entity_id').notNull(),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    familyIdIdx: index('audit_logs_family_id_idx').on(table.familyId),
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  })
);

// Notifications table
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    link: varchar('link', { length: 500 }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    familyIdIdx: index('notifications_family_id_idx').on(table.familyId),
    readAtIdx: index('notifications_read_at_idx').on(table.readAt),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  familyMembers: many(familyMembers),
  visitationEvents: many(visitationEvents),
  swapRequestsCreated: many(swapRequests, { relationName: 'requestedBy' }),
  swapRequestsReceived: many(swapRequests, { relationName: 'requestedTo' }),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
}));

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  children: many(children),
  visitationEvents: many(visitationEvents),
  swapRequests: many(swapRequests),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  family: one(families, {
    fields: [children.familyId],
    references: [families.id],
  }),
  visitationEvents: many(visitationEvents),
}));

export const visitationEventsRelations = relations(visitationEvents, ({ one, many }) => ({
  family: one(families, {
    fields: [visitationEvents.familyId],
    references: [families.id],
  }),
  child: one(children, {
    fields: [visitationEvents.childId],
    references: [children.id],
  }),
  parent: one(users, {
    fields: [visitationEvents.parentId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [visitationEvents.createdBy],
    references: [users.id],
  }),
  swapRequests: many(swapRequests),
}));

export const swapRequestsRelations = relations(swapRequests, ({ one }) => ({
  family: one(families, {
    fields: [swapRequests.familyId],
    references: [families.id],
  }),
  event: one(visitationEvents, {
    fields: [swapRequests.eventId],
    references: [visitationEvents.id],
  }),
  requester: one(users, {
    fields: [swapRequests.requestedBy],
    references: [users.id],
    relationName: 'requestedBy',
  }),
  recipient: one(users, {
    fields: [swapRequests.requestedTo],
    references: [users.id],
    relationName: 'requestedTo',
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  family: one(families, {
    fields: [auditLogs.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  family: one(families, {
    fields: [notifications.familyId],
    references: [families.id],
  }),
}));
