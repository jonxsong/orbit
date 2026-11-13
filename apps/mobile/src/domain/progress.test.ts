/// <reference types="jest" />

import { calculateGoalProgress } from './progress';
import type { Milestone } from './types';

const milestone = (id: string, status: Milestone['status'], weight = 1): Milestone => ({
  id,
  goalId: 'goal-1',
  title: id,
  status,
  weight,
});

describe('calculateGoalProgress', () => {
  it('returns indeterminate progress when a goal has no milestones', () => {
    expect(calculateGoalProgress([])).toBeNull();
  });

  it('uses explicit milestone weights', () => {
    expect(
      calculateGoalProgress([
        milestone('small', 'completed', 1),
        milestone('large', 'pending', 3),
      ]),
    ).toBe(25);
  });
});

