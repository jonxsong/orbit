import type { Milestone } from './types';

export function calculateGoalProgress(milestones: Milestone[]): number | null {
  if (milestones.length === 0) return null;

  const totalWeight = milestones.reduce((sum, milestone) => sum + milestone.weight, 0);
  if (totalWeight <= 0) return null;

  const completedWeight = milestones
    .filter((milestone) => milestone.status === 'completed')
    .reduce((sum, milestone) => sum + milestone.weight, 0);

  return Math.round((completedWeight / totalWeight) * 100);
}

