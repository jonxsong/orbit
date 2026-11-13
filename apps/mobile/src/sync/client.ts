import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';
import { sqlite } from '../db/database';

const DEVICE_ID_KEY = 'orbit.device-id';
const ACCESS_TOKEN_KEY = 'orbit.access-token';
const SCHEMA_VERSION = 1;
const PUSH_LIMIT = 100;
const PULL_LIMIT = 500;

type OutboxRow = {
  mutation_id: string;
  entity_type: string;
  entity_id: string;
  operation: 'upsert' | 'delete';
  base_version: number;
  payload: string;
};

type MutationResult = {
  mutation_id: string;
  status: 'applied' | 'conflict';
  revision?: number;
  conflict?: Record<string, unknown>;
};

type Change = {
  revision: number;
  entity_type: string;
  entity_id: string;
  operation: 'upsert' | 'delete';
  version: number;
  data?: Record<string, unknown>;
};

export type SyncResult = {
  pushed: number;
  pulled: number;
  conflicts: number;
  completedAt: string;
};

export class SyncUnavailableError extends Error {}

async function getDeviceID(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return created;
}

async function headers(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const baseURL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!baseURL) throw new SyncUnavailableError('EXPO_PUBLIC_API_URL is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${baseURL}${path}`, {
      ...init,
      headers: { ...(await headers()), ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`sync request failed with status ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function synchronize(): Promise<SyncResult> {
  const deviceID = await getDeviceID();
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;

  while (true) {
    const outbox = await sqlite.getAllAsync<OutboxRow>(
      `SELECT mutation_id, entity_type, entity_id, operation, base_version, payload
       FROM sync_outbox ORDER BY created_at ASC LIMIT ?`,
      PUSH_LIMIT,
    );
    if (outbox.length === 0) break;
    const response = await request('/v1/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceID,
        schema_version: SCHEMA_VERSION,
        mutations: outbox.map((row) => ({
          mutation_id: row.mutation_id,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          operation: row.operation,
          base_version: row.base_version,
          fields: JSON.parse(row.payload),
        })),
      }),
    });
    const body = (await response.json()) as { results: MutationResult[] };
    await sqlite.withExclusiveTransactionAsync(async (tx) => {
      for (const result of body.results) {
        if (result.status === 'conflict') {
          const row = outbox.find((candidate) => candidate.mutation_id === result.mutation_id);
          if (row) {
            await tx.runAsync(
              `INSERT OR REPLACE INTO sync_conflicts
                (mutation_id, entity_type, entity_id, conflict_json, created_at)
               VALUES (?, ?, ?, ?, ?)`,
              result.mutation_id,
              row.entity_type,
              row.entity_id,
              JSON.stringify(result.conflict ?? {}),
              new Date().toISOString(),
            );
          }
          conflicts += 1;
        } else {
          pushed += 1;
        }
        await tx.runAsync(`DELETE FROM sync_outbox WHERE mutation_id = ?`, result.mutation_id);
      }
    });
    if (outbox.length < PUSH_LIMIT) break;
  }

  let hasMore = true;
  let pageCount = 0;
  while (hasMore && pageCount < 20) {
    const cursorRow = await sqlite.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_state WHERE key = 'server_cursor'`,
    );
    const cursor = Number(cursorRow?.value ?? 0);
    const response = await request(`/v1/sync/pull?after=${cursor}&limit=${PULL_LIMIT}`);
    const body = (await response.json()) as {
      changes: Change[];
      next_cursor: number;
      has_more: boolean;
    };
    await sqlite.withExclusiveTransactionAsync(async (tx) => {
      for (const change of body.changes) {
        await applyChange(tx, change);
        pulled += 1;
      }
      await tx.runAsync(
        `INSERT INTO sync_state(key, value) VALUES ('server_cursor', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        String(body.next_cursor),
      );
    });
    hasMore = body.has_more;
    pageCount += 1;
  }

  const completedAt = new Date().toISOString();
  await sqlite.runAsync(
    `INSERT INTO sync_state(key, value) VALUES ('last_success_at', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    completedAt,
  );
  return { pushed, pulled, conflicts, completedAt };
}

async function applyChange(tx: SQLiteDatabase, change: Change): Promise<void> {
  const tableByType: Record<string, string> = {
    goal: 'goals',
    milestone: 'milestones',
    task: 'tasks',
    habit: 'habits',
    habit_completion: 'habit_completions',
    reflection: 'reflections',
    relationship: 'relationships',
    recommendation: 'recommendations',
  };
  const table = tableByType[change.entity_type];
  if (!table) return;
  if (change.operation === 'delete') {
    await tx.runAsync(
      `UPDATE ${table} SET deleted_at = ?, version = ? WHERE id = ?`,
      new Date().toISOString(),
      change.version,
      change.entity_id,
    );
    return;
  }

  const data = change.data ?? {};
  const timestamp = new Date().toISOString();
  switch (change.entity_type) {
    case 'goal':
      await tx.runAsync(
        `INSERT INTO goals
          (id, title, description, category, priority, status, target_date, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title, description = excluded.description, category = excluded.category,
           priority = excluded.priority, status = excluded.status, target_date = excluded.target_date,
           updated_at = excluded.updated_at, version = excluded.version, deleted_at = NULL`,
        change.entity_id,
        stringValue(data.title, 'Untitled goal'),
        stringValue(data.description, ''),
        stringValue(data.category, 'personal'),
        numberValue(data.priority, 2),
        stringValue(data.status, 'active'),
        nullableString(data.targetDate),
        timestamp,
        timestamp,
        change.version,
      );
      break;
    case 'task':
      await tx.runAsync(
        `INSERT INTO tasks
          (id, goal_id, title, notes, due_date, scheduled_time, priority, estimated_minutes,
           status, completed_at, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           goal_id = excluded.goal_id, title = excluded.title, notes = excluded.notes,
           due_date = excluded.due_date, scheduled_time = excluded.scheduled_time,
           priority = excluded.priority, estimated_minutes = excluded.estimated_minutes,
           status = excluded.status, completed_at = excluded.completed_at,
           updated_at = excluded.updated_at, version = excluded.version, deleted_at = NULL`,
        change.entity_id,
        nullableString(data.goalId),
        stringValue(data.title, 'Untitled task'),
        stringValue(data.notes, ''),
        nullableString(data.dueDate),
        nullableString(data.scheduledTime),
        numberValue(data.priority, 2),
        nullableNumber(data.estimatedMinutes),
        stringValue(data.status, 'open'),
        nullableString(data.completedAt),
        timestamp,
        timestamp,
        change.version,
      );
      break;
    case 'milestone':
      await tx.runAsync(
        `INSERT INTO milestones
          (id, goal_id, title, weight, status, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, weight = excluded.weight,
           status = excluded.status, updated_at = excluded.updated_at, version = excluded.version,
           deleted_at = NULL`,
        change.entity_id,
        stringValue(data.goalId, ''),
        stringValue(data.title, 'Untitled milestone'),
        numberValue(data.weight, 1),
        stringValue(data.status, 'pending'),
        timestamp,
        timestamp,
        change.version,
      );
      break;
    case 'habit':
      await tx.runAsync(
        `INSERT INTO habits
          (id, goal_id, title, schedule, target_per_week, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET goal_id = excluded.goal_id, title = excluded.title,
           schedule = excluded.schedule, target_per_week = excluded.target_per_week,
           updated_at = excluded.updated_at, version = excluded.version, deleted_at = NULL`,
        change.entity_id,
        nullableString(data.goalId),
        stringValue(data.title, 'Untitled habit'),
        stringValue(data.schedule, 'daily'),
        numberValue(data.targetPerWeek, 7),
        timestamp,
        timestamp,
        change.version,
      );
      break;
    case 'reflection':
      await tx.runAsync(
        `INSERT INTO reflections
          (id, period_key, body, accomplishments, obstacles, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET body = excluded.body, accomplishments = excluded.accomplishments,
           obstacles = excluded.obstacles, updated_at = excluded.updated_at, version = excluded.version,
           deleted_at = NULL`,
        change.entity_id,
        stringValue(data.periodKey, ''),
        stringValue(data.body, ''),
        stringValue(data.accomplishments, ''),
        stringValue(data.obstacles, ''),
        timestamp,
        timestamp,
        change.version,
      );
      break;
    default:
      // Completion, relationship, and recommendation projections are retained by the server.
      // Their dedicated mobile materializers are introduced when their editing UI ships.
      break;
  }
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}
function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

