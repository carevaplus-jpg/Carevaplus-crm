import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Small, separately-persisted store for device-local preferences (not synced, not org data). */
export const usePrefs = create<{
  taskReminders: boolean;
  setTaskReminders: (v: boolean) => void;
}>()(
  persist(
    (set) => ({
      taskReminders: false,
      setTaskReminders: (taskReminders) => set({ taskReminders }),
    }),
    { name: 'careva-crm-prefs-v1' },
  ),
);
