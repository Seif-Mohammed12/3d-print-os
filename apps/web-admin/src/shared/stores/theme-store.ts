import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, THEME } from '../lib/constants';

interface ThemeStore {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: THEME.LIGHT,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === THEME.LIGHT ? THEME.DARK : THEME.LIGHT,
        })),
    }),
    {
      name: STORAGE_KEYS.THEME,
    },
  ),
);
