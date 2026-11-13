export type Language = 'en' | 'zh-Hans';

export type Goal = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  targetDate: string | null;
  priority: number;
  progress: number | null;
  completedMilestones: number;
  totalMilestones: number;
};

export type Milestone = {
  id: string;
  goalId: string;
  title: string;
  status: 'pending' | 'completed';
  weight: number;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  goalId: string | null;
  dueDate: string | null;
  scheduledTime: string | null;
  priority: number;
  estimatedMinutes: number | null;
  status: 'open' | 'completed' | 'cancelled';
  completedAt: string | null;
};

export type Habit = {
  id: string;
  title: string;
  goalId: string | null;
  schedule: 'daily' | 'weekly' | 'custom';
  targetPerWeek: number;
  completedToday: boolean;
  streak: number;
};

export type Reflection = {
  id: string;
  periodKey: string;
  body: string;
  accomplishments: string;
  obstacles: string;
  updatedAt: string;
};

export type OrbitSnapshot = {
  language: Language;
  onboardingComplete: boolean;
  goals: Goal[];
  milestones: Milestone[];
  tasks: Task[];
  habits: Habit[];
  todayReflection: Reflection | null;
};

export type OnboardingInput = {
  goalTitle: string;
  milestoneTitle: string;
  habitTitle: string;
};

