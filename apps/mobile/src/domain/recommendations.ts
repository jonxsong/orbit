import { isPastDate } from './dates';
import type { OrbitSnapshot } from './types';

export type LocalRecommendation = {
  type: 'overdue_tasks' | 'daily_capacity' | 'momentum';
  titleKey: 'insightOverdueTitle' | 'insightCapacityTitle' | 'insightMomentumTitle';
  bodyKey: 'insightOverdueBody' | 'insightCapacityBody' | 'insightMomentumBody';
  evidenceCount: number;
};

export function recommend(snapshot: OrbitSnapshot): LocalRecommendation {
  const overdue = snapshot.tasks.filter(
    (task) => task.status === 'open' && isPastDate(task.dueDate),
  );
  if (overdue.length >= 2) {
    return {
      type: 'overdue_tasks',
      titleKey: 'insightOverdueTitle',
      bodyKey: 'insightOverdueBody',
      evidenceCount: overdue.length,
    };
  }

  const plannedMinutes = snapshot.tasks
    .filter((task) => task.status === 'open')
    .reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  if (plannedMinutes > 360) {
    return {
      type: 'daily_capacity',
      titleKey: 'insightCapacityTitle',
      bodyKey: 'insightCapacityBody',
      evidenceCount: plannedMinutes,
    };
  }

  return {
    type: 'momentum',
    titleKey: 'insightMomentumTitle',
    bodyKey: 'insightMomentumBody',
    evidenceCount: snapshot.tasks.filter((task) => task.status === 'completed').length,
  };
}

