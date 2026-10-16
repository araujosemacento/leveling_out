import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

function getInitialTheme(): Theme {
	if (typeof localStorage !== 'undefined') {
		try {
			const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
			if (saved === 'light' || saved === 'dark') {
				return saved;
			}
		} catch {
			/* empty */
		}
	}
	if (typeof document !== 'undefined') {
		try {
			const match = document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);
			if (match && (match[1] === 'light' || match[1] === 'dark')) {
				return match[1] as Theme;
			}
		} catch {
			/* empty */
		}
		const docTheme = document.documentElement.getAttribute('data-theme') as Theme | null;
		if (docTheme === 'light' || docTheme === 'dark') {
			return docTheme;
		}
	}
	if (
		typeof window !== 'undefined' &&
		window.matchMedia &&
		window.matchMedia('(prefers-color-scheme: dark)').matches
	) {
		return 'dark';
	}
	return 'light';
}

function createThemeStore() {
	const initial = getInitialTheme();
	const { subscribe, set } = writable<Theme>(initial);
	let currentTheme: Theme = initial;

	subscribe((val) => {
		currentTheme = val;
	});

	function init() {
		if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
			// Sincroniza em tempo real se outra aba alterar o tema
			window.addEventListener('storage', (e) => {
				if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
					setTheme(e.newValue);
				}
			});
		}

		const current = getInitialTheme();
		setTheme(current);
	}

	function setTheme(t: Theme) {
		set(t);
		currentTheme = t;
		if (typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(THEME_STORAGE_KEY, t);
			} catch {
				// Silencia restrições de localStorage
			}
		}
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', t);
			try {
				document.cookie = `${THEME_STORAGE_KEY}=${t}; path=/; max-age=31536000; SameSite=Lax`;
			} catch {
				// Silencia restrições de cookies
			}
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
