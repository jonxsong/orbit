import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { calculateGoalProgress } from '../domain/progress';
import { localDateKey } from '../domain/dates';
import type {
  Goal,
  Habit,
  Language,
  Milestone,
  OnboardingInput,
  OrbitSnapshot,
  Reflection,
  Task,
} from '../domain/types';
import { sqlite } from './database';

type GoalRow = Omit<Goal, 'targetDate' | 'progress' | 'completedMilestones' | 'totalMilestones'> & {
  target_date: string | null;
};
type MilestoneRow = Omit<Milestone, 'goalId'> & { goal_id: string };
type TaskRow = Omit<Task, 'goalId' | 'dueDate' | 'scheduledTime' | 'estimatedMinutes' | 'completedAt'> & {
  goal_id: string | null;
  due_date: string | null;
  scheduled_time: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
};
type HabitRow = Omit<Habit, 'goalId' | 'targetPerWeek' | 'completedToday' | 'streak'> & {
  goal_id: string | null;
  target_per_week: number;
  completed_today: number;
};
type ReflectionRow = Omit<Reflection, 'periodKey' | 'updatedAt'> & {
  period_key: string;
  updated_at: string;
};

const id = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

async function enqueue(
  tx: SQLiteDatabase,
  entityType: string,
  entityId: string,
  operation: 'upsert' | 'delete',
  payload: Record<string, unknown>,
): Promise<void> {
  await tx.runAsync(
    `INSERT INTO sync_outbox
      (mutation_id, entity_type, entity_id, operation, base_version, payload, schema_version, created_at)
      VALUES (?, ?, ?, ?, 0, ?, 1, ?)`,
    id(),
    entityType,
    entityId,
    operation,
    JSON.stringify(payload),
    now(),
  );
}

export async function loadSnapshot(): Promise<OrbitSnapshot> {
  const today = localDateKey();
  const [goalRows, milestoneRows, taskRows, habitRows, reflectionRow, languageRow, onboardingRow] =
    await Promise.all([
      sqlite.getAllAsync<GoalRow>(
        `SELECT id, title, description, category, target_date, priority, status
         FROM goals WHERE deleted_at IS NULL AND status != 'archived'
         ORDER BY priority DESC, created_at ASC`,
      ),
      sqlite.getAllAsync<MilestoneRow>(
        `SELECT id, goal_id, title, status, weight
         FROM milestones WHERE deleted_at IS NULL ORDER BY created_at ASC`,
      ),
      sqlite.getAllAsync<TaskRow>(
        `SELECT id, title, notes, goal_id, due_date, scheduled_time, priority,
                estimated_minutes, status, completed_at
         FROM tasks WHERE deleted_at IS NULL
         ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, priority DESC, created_at ASC`,
      ),
      sqlite.getAllAsync<HabitRow>(
        `SELECT h.id, h.title, h.goal_id, h.schedule, h.target_per_week,
                EXISTS(
                  SELECT 1 FROM habit_completions hc
                  WHERE hc.habit_id = h.id AND hc.occurrence_key = ? AND hc.deleted_at IS NULL
                ) AS completed_today
         FROM habits h WHERE h.deleted_at IS NULL ORDER BY h.created_at ASC`,
        today,
      ),
      sqlite.getFirstAsync<ReflectionRow>(
        `SELECT id, period_key, body, accomplishments, obstacles, updated_at
         FROM reflections WHERE period_key = ? AND deleted_at IS NULL`,
        today,
      ),
      sqlite.getFirstAsync<{ value: Language }>(
        `SELECT value FROM app_settings WHERE key = 'language'`,
      ),
      sqlite.getFirstAsync<{ value: string }>(
        `SELECT value FROM app_settings WHERE key = 'onboarding_complete'`,
      ),
    ]);

  const milestones: Milestone[] = milestoneRows.map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    status: row.status,
    weight: row.weight,
  }));
  const goals: Goal[] = goalRows.map((row) => {
    const goalMilestones = milestones.filter((milestone) => milestone.goalId === row.id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      targetDate: row.target_date,
      priority: row.priority,
      status: row.status,
      progress: calculateGoalProgress(goalMilestones),
      completedMilestones: goalMilestones.filter((milestone) => milestone.status === 'completed').length,
      totalMilestones: goalMilestones.length,
    };
  });

  return {
    language: languageRow?.value ?? 'en',
    onboardingComplete: onboardingRow?.value === 'true',
    goals,
    milestones,
    tasks: taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      notes: row.notes,
      goalId: row.goal_id,
      dueDate: row.due_date,
      scheduledTime: row.scheduled_time,
      priority: row.priority,
      estimatedMinutes: row.estimated_minutes,
      status: row.status,
      completedAt: row.completed_at,
    })),
    habits: habitRows.map((row) => ({
      id: row.id,
      title: row.title,
      goalId: row.goal_id,
      schedule: row.schedule,
      targetPerWeek: row.target_per_week,
      completedToday: row.completed_today === 1,
      streak: 0,
    })),
    todayReflection: reflectionRow
      ? {
          id: reflectionRow.id,
          periodKey: reflectionRow.period_key,
          body: reflectionRow.body,
          accomplishments: reflectionRow.accomplishments,
          obstacles: reflectionRow.obstacles,
          updatedAt: reflectionRow.updated_at,
        }
      : null,
  };
}

export async function completeOnboarding(input: OnboardingInput): Promise<void> {
  const goalId = id();
  const milestoneId = id();
  const habitId = id();
  const timestamp = now();

  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO goals
        (id, title, description, category, priority, status, created_at, updated_at, version)
       VALUES (?, ?, '', 'personal', 3, 'active', ?, ?, 0)`,
      goalId,
      input.goalTitle.trim(),
      timestamp,
      timestamp,
    );
    await tx.runAsync(
      `INSERT INTO milestones
        (id, goal_id, title, weight, status, created_at, updated_at, version)
       VALUES (?, ?, ?, 1, 'pending', ?, ?, 0)`,
      milestoneId,
      goalId,
      input.milestoneTitle.trim(),
      timestamp,
      timestamp,
    );
    await tx.runAsync(
      `INSERT INTO habits
        (id, goal_id, title, schedule, target_per_week, created_at, updated_at, version)
       VALUES (?, ?, ?, 'weekly', 3, ?, ?, 0)`,
      habitId,
      goalId,
      input.habitTitle.trim(),
      timestamp,
      timestamp,
    );
    await tx.runAsync(
      `INSERT INTO relationships
        (id, from_type, from_id, to_type, to_id, relationship_type, created_at, updated_at, version)
       VALUES (?, 'habit', ?, 'goal', ?, 'supports', ?, ?, 0)`,
      id(),
      habitId,
      goalId,
      timestamp,
      timestamp,
    );
    await tx.runAsync(
      `UPDATE app_settings SET value = 'true' WHERE key = 'onboarding_complete'`,
    );
    await enqueue(tx, 'goal', goalId, 'upsert', { title: input.goalTitle.trim() });
    await enqueue(tx, 'milestone', milestoneId, 'upsert', {
      goalId,
      title: input.milestoneTitle.trim(),
    });
    await enqueue(tx, 'habit', habitId, 'upsert', {
      goalId,
      title: input.habitTitle.trim(),
      schedule: 'weekly',
      targetPerWeek: 3,
    });
  });
}

export async function createTask(input: {
  title: string;
  goalId: string | null;
  estimatedMinutes: number;
}): Promise<void> {
  const taskId = id();
  const timestamp = now();
  const dueDate = localDateKey();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO tasks
        (id, goal_id, title, notes, due_date, priority, estimated_minutes, status,
         created_at, updated_at, version)
       VALUES (?, ?, ?, '', ?, 2, ?, 'open', ?, ?, 0)`,
      taskId,
      input.goalId,
      input.title.trim(),
      dueDate,
      input.estimatedMinutes,
      timestamp,
      timestamp,
    );
    await enqueue(tx, 'task', taskId, 'upsert', {
      title: input.title.trim(),
      goalId: input.goalId,
      dueDate,
      estimatedMinutes: input.estimatedMinutes,
    });
  });
}

export async function createGoal(title: string): Promise<void> {
  const goalId = id();
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO goals
        (id, title, description, category, priority, status, created_at, updated_at, version)
       VALUES (?, ?, '', 'personal', 2, 'active', ?, ?, 0)`,
      goalId,
      title.trim(),
      timestamp,
      timestamp,
    );
    await enqueue(tx, 'goal', goalId, 'upsert', { title: title.trim() });
  });
}

export async function createMilestone(goalId: string, title: string): Promise<void> {
  const milestoneId = id();
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO milestones
        (id, goal_id, title, weight, status, created_at, updated_at, version)
       VALUES (?, ?, ?, 1, 'pending', ?, ?, 0)`,
      milestoneId,
      goalId,
      title.trim(),
      timestamp,
      timestamp,
    );
    await enqueue(tx, 'milestone', milestoneId, 'upsert', {
      goalId,
      title: title.trim(),
      weight: 1,
      status: 'pending',
    });
  });
}

export async function createHabit(title: string): Promise<void> {
  const habitId = id();
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO habits
        (id, goal_id, title, schedule, target_per_week, created_at, updated_at, version)
       VALUES (?, NULL, ?, 'weekly', 3, ?, ?, 0)`,
      habitId,
      title.trim(),
      timestamp,
      timestamp,
    );
    await enqueue(tx, 'habit', habitId, 'upsert', {
      goalId: null,
      title: title.trim(),
      schedule: 'weekly',
      targetPerWeek: 3,
    });
  });
}

export async function toggleTask(taskId: string): Promise<void> {
  const current = await sqlite.getFirstAsync<{ status: string }>(
    `SELECT status FROM tasks WHERE id = ? AND deleted_at IS NULL`,
    taskId,
  );
  if (!current) return;
  const status = current.status === 'completed' ? 'open' : 'completed';
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
      status,
      status === 'completed' ? timestamp : null,
      timestamp,
      taskId,
    );
    await enqueue(tx, 'task', taskId, 'upsert', {
      status,
      completedAt: status === 'completed' ? timestamp : null,
    });
  });
}

export async function updateTask(
  taskId: string,
  input: { title: string; dueDate: string; estimatedMinutes: number },
): Promise<void> {
  const current = await sqlite.getFirstAsync<{ version: number }>(
    `SELECT version FROM tasks WHERE id = ? AND deleted_at IS NULL`,
    taskId,
  );
  if (!current) return;
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `UPDATE tasks
       SET title = ?, due_date = ?, estimated_minutes = ?, updated_at = ?
       WHERE id = ?`,
      input.title.trim(),
      input.dueDate,
      input.estimatedMinutes,
      timestamp,
      taskId,
    );
    await enqueue(tx, 'task', taskId, 'upsert', {
      title: input.title.trim(),
      dueDate: input.dueDate,
      estimatedMinutes: input.estimatedMinutes,
    });
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      timestamp,
      timestamp,
      taskId,
    );
    await enqueue(tx, 'task', taskId, 'delete', {});
  });
}

export async function toggleMilestone(milestoneId: string): Promise<void> {
  const current = await sqlite.getFirstAsync<{ status: string; version: number }>(
    `SELECT status, version FROM milestones WHERE id = ? AND deleted_at IS NULL`,
    milestoneId,
  );
  if (!current) return;
  const status = current.status === 'completed' ? 'pending' : 'completed';
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `UPDATE milestones SET status = ?, updated_at = ? WHERE id = ?`,
      status,
      timestamp,
      milestoneId,
    );
    await enqueue(tx, 'milestone', milestoneId, 'upsert', { status });
  });
}

export async function toggleHabit(habitId: string): Promise<void> {
  const occurrenceKey = localDateKey();
  const existing = await sqlite.getFirstAsync<{ id: string }>(
    `SELECT id FROM habit_completions
     WHERE habit_id = ? AND occurrence_key = ? AND deleted_at IS NULL`,
    habitId,
    occurrenceKey,
  );
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    if (existing) {
      await tx.runAsync(`DELETE FROM habit_completions WHERE id = ?`, existing.id);
      await enqueue(tx, 'habit_completion', existing.id, 'delete', {
        habitId,
        occurrenceKey,
      });
    } else {
      const completionId = id();
      await tx.runAsync(
        `INSERT INTO habit_completions
          (id, habit_id, occurrence_key, completed_at, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        completionId,
        habitId,
        occurrenceKey,
        timestamp,
        timestamp,
        timestamp,
      );
      await enqueue(tx, 'habit_completion', completionId, 'upsert', {
        habitId,
        occurrenceKey,
        completedAt: timestamp,
      });
    }
  });
}

export async function saveReflection(body: string): Promise<void> {
  const periodKey = localDateKey();
  const existing = await sqlite.getFirstAsync<{ id: string }>(
    `SELECT id FROM reflections WHERE period_key = ? AND deleted_at IS NULL`,
    periodKey,
  );
  const reflectionId = existing?.id ?? id();
  const timestamp = now();
  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO reflections
        (id, period_key, body, accomplishments, obstacles, created_at, updated_at, version)
       VALUES (?, ?, ?, '', '', ?, ?, 0)
       ON CONFLICT(period_key) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
      reflectionId,
      periodKey,
      body.trim(),
      timestamp,
      timestamp,
    );
    await enqueue(tx, 'reflection', reflectionId, 'upsert', {
      periodKey,
      body: body.trim(),
    });
  });
}

export async function setLanguage(language: Language): Promise<void> {
  await sqlite.runAsync(
    `INSERT INTO app_settings(key, value) VALUES ('language', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    language,
  );
}

