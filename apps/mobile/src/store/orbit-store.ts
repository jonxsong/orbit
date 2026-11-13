import { create } from 'zustand';
import { initializeDatabase } from '../db/database';
import * as repository from '../db/repository';
import type { Language, OnboardingInput, OrbitSnapshot } from '../domain/types';

const emptySnapshot: OrbitSnapshot = {
  language: 'en',
  onboardingComplete: false,
  goals: [],
  milestones: [],
  tasks: [],
  habits: [],
  todayReflection: null,
};

type OrbitStore = OrbitSnapshot & {
  initialized: boolean;
  busy: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  addTask: (input: { title: string; goalId: string | null; estimatedMinutes: number }) => Promise<void>;
  addGoal: (title: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  toggleHabit: (habitId: string) => Promise<void>;
  saveReflection: (body: string) => Promise<void>;
  changeLanguage: (language: Language) => Promise<void>;
  clearError: () => void;
};

export const useOrbitStore = create<OrbitStore>((set) => {
  const hydrate = async () => {
    const snapshot = await repository.loadSnapshot();
    set(snapshot);
  };

  const mutate = async (operation: () => Promise<void>) => {
    set({ busy: true, error: null });
    try {
      await operation();
      await hydrate();
    } catch (error) {
      console.error('Orbit local mutation failed', error);
      set({ error: 'savingError' });
      throw error;
    } finally {
      set({ busy: false });
    }
  };

  return {
    ...emptySnapshot,
    initialized: false,
    busy: false,
    error: null,
    initialize: async () => {
      try {
        await initializeDatabase();
        await hydrate();
        set({ initialized: true, error: null });
      } catch (error) {
        console.error('Orbit database initialization failed', error);
        set({ initialized: true, error: 'savingError' });
      }
    },
    completeOnboarding: (input) => mutate(() => repository.completeOnboarding(input)),
    addTask: (input) => mutate(() => repository.createTask(input)),
    addGoal: (title) => mutate(() => repository.createGoal(title)),
    toggleTask: (taskId) => mutate(() => repository.toggleTask(taskId)),
    toggleHabit: (habitId) => mutate(() => repository.toggleHabit(habitId)),
    saveReflection: (body) => mutate(() => repository.saveReflection(body)),
    changeLanguage: async (language) => {
      await repository.setLanguage(language);
      set({ language });
    },
    clearError: () => set({ error: null }),
  };
});

