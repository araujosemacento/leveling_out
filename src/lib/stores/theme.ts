import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

function createThemeStore() {
	const { subscribe, set } = writable<Theme>('light');
	let currentTheme: Theme = 'light';

	subscribe((val) => {
		currentTheme = val;
	});

	function init() {
		if (typeof localStorage !== 'undefined') {
			try {
				const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
				if (saved === 'light' || saved === 'dark') {
					setTheme(saved);
					return;
				}
			} catch {
				// Silencia restrições de localStorage
			}
		}

		if (
			typeof window !== 'undefined' &&
			window.matchMedia &&
			window.matchMedia('(prefers-color-scheme: dark)').matches
		) {
			setTheme('dark');
			return;
		}

		setTheme('light');
	}

	function setTheme(theme: Theme) {
		set(theme);
		if (typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(THEME_STORAGE_KEY, theme);
			} catch {
				// Silencia restrições de localStorage
			}
		}
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', theme);
		}
	}

	function toggle() {
		const next: Theme = currentTheme === 'light' ? 'dark' : 'light';
		setTheme(next);
		return next;
	}

	return {
		subscribe,
		set: setTheme,
		toggle,
		init,
		get current() {
			return currentTheme;
		}
	};
}

export const theme = createThemeStore();
