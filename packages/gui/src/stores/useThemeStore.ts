import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'dark',
            setTheme: (theme) => {
                set({ theme });
                updateThemeClass(theme);
            },
            toggleTheme: () => {
                set((state) => {
                    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
                    updateThemeClass(newTheme);
                    return { theme: newTheme };
                });
            },
        }),
        {
            name: 'radius-theme',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    updateThemeClass(state.theme);
                }
            },
        }
    )
);

function updateThemeClass(theme: Theme) {
    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.classList.remove('dark', 'light');
        root.classList.add(theme);
        // Force dark mode sync for tailwind strategy
        if (theme === 'dark') {
            root.style.colorScheme = 'dark';
        } else {
            root.style.colorScheme = 'light';
        }
    }
}
