import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const syncColumns = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  version: integer('version').notNull().default(0),
};

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('personal'),
  targetDate: text('target_date'),
  priority: integer('priority').notNull().default(2),
  status: text('status').notNull().default('active'),
  ...syncColumns,
});

export const milestones = sqliteTable(
  'milestones',
  {
    id: text('id').primaryKey(),
    goalId: text('goal_id').notNull().references(() => goals.id),
    parentId: text('parent_id'),
    title: text('title').notNull(),
    weight: integer('weight').notNull().default(1),
    status: text('status').notNull().default('pending'),
    ...syncColumns,
  },
  (table) => [index('milestones_goal_idx').on(table.goalId)],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    goalId: text('goal_id').references(() => goals.id),
    title: text('title').notNull(),
    notes: text('notes').notNull().default(''),
    dueDate: text('due_date'),
    scheduledTime: text('scheduled_time'),
    priority: integer('priority').notNull().default(2),
    estimatedMinutes: integer('estimated_minutes'),
    status: text('status').notNull().default('open'),
    completedAt: text('completed_at'),
    ...syncColumns,
  },
  (table) => [index('tasks_due_idx').on(table.dueDate, table.status)],
);

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').references(() => goals.id),
  title: text('title').notNull(),
  schedule: text('schedule').notNull().default('daily'),
  targetPerWeek: integer('target_per_week').notNull().default(7),
  ...syncColumns,
});

export const habitCompletions = sqliteTable(
  'habit_completions',
  {
    id: text('id').primaryKey(),
    habitId: text('habit_id').notNull().references(() => habits.id),
    occurrenceKey: text('occurrence_key').notNull(),
    completedAt: text('completed_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    version: integer('version').notNull().default(0),
  },
  (table) => [uniqueIndex('habit_occurrence_idx').on(table.habitId, table.occurrenceKey)],
);

export const reflections = sqliteTable(
  'reflections',
  {
    id: text('id').primaryKey(),
    periodKey: text('period_key').notNull(),
    body: text('body').notNull().default(''),
    accomplishments: text('accomplishments').notNull().default(''),
    obstacles: text('obstacles').notNull().default(''),
    ...syncColumns,
  },
  (table) => [uniqueIndex('reflections_period_idx').on(table.periodKey)],
);

export const syncOutbox = sqliteTable(
  'sync_outbox',
  {
    mutationId: text('mutation_id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    operation: text('operation').notNull(),
    baseVersion: integer('base_version').notNull().default(0),
    payload: text('payload').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
  },
  (table) => [index('outbox_created_idx').on(table.createdAt)],
);

