import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

export const sqlite = openDatabaseSync('orbit.db');
export const db = drizzle(sqlite, { schema });

export async function initializeDatabase(): Promise<void> {
  await sqlite.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'personal',
      target_date TEXT,
      priority INTEGER NOT NULL DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES milestones(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1 CHECK(weight > 0),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS milestones_goal_idx ON milestones(goal_id);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      due_date TEXT,
      scheduled_time TEXT,
      priority INTEGER NOT NULL DEFAULT 2,
      estimated_minutes INTEGER,
      status TEXT NOT NULL DEFAULT 'open',
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_date, status);

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      schedule TEXT NOT NULL DEFAULT 'daily',
      target_per_week INTEGER NOT NULL DEFAULT 7,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      occurrence_key TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 0,
      UNIQUE(habit_id, occurrence_key)
    );

    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY NOT NULL,
      period_key TEXT NOT NULL UNIQUE,
      body TEXT NOT NULL DEFAULT '',
      accomplishments TEXT NOT NULL DEFAULT '',
      obstacles TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY NOT NULL,
      from_type TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_type TEXT NOT NULL,
      to_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 0,
      UNIQUE(from_type, from_id, to_type, to_id, relationship_type)
    );
    CREATE INDEX IF NOT EXISTS relationships_from_idx ON relationships(from_type, from_id);
    CREATE INDEX IF NOT EXISTS relationships_to_idx ON relationships(to_type, to_id);

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      explanation TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      proposal_json TEXT NOT NULL,
      confidence REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      mutation_id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      base_version INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS outbox_created_idx ON sync_outbox(created_at);

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_settings(key, value) VALUES ('language', 'en');
    INSERT OR IGNORE INTO app_settings(key, value) VALUES ('onboarding_complete', 'false');
    PRAGMA user_version = 1;
  `);
}

