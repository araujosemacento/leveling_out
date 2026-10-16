import { beforeEach, describe, expect, it } from 'bun:test';
import { theme, THEME_STORAGE_KEY } from '../../src/lib/stores/theme';

describe('theme store (stores/theme.ts)', () => {
	let storage: Map<string, string>;
	let attributes: Map<string, string>;

	beforeEach(() => {
		storage = new Map<string, string>();
		attributes = new Map<string, string>();

		globalThis.localStorage = {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
			clear: () => storage.clear(),
			key: () => null,
			length: 0
		} as Storage;

		globalThis.document = {
			documentElement: {
				setAttribute: (k: string, v: string) => attributes.set(k, v),
				getAttribute: (k: string) => attributes.get(k) ?? null
			}
		} as unknown as Document;
	});

	it('deve alternar entre light e dark', () => {
		theme.set('light');
		expect(theme.current).toBe('light');

		theme.toggle();
		expect(theme.current).toBe('dark');
		expect(storage.get(THEME_STORAGE_KEY)).toBe('dark');
		expect(attributes.get('data-theme')).toBe('dark');

		theme.toggle();
		expect(theme.current).toBe('light');
		expect(storage.get(THEME_STORAGE_KEY)).toBe('light');
		expect(attributes.get('data-theme')).toBe('light');
	});

	it('deve inicializar a partir do localStorage', () => {
		storage.set(THEME_STORAGE_KEY, 'dark');
		theme.init();

		expect(theme.current).toBe('dark');
		expect(attributes.get('data-theme')).toBe('dark');
	});

	it('deve aplicar tema claro se preferência salva for light', () => {
		storage.set(THEME_STORAGE_KEY, 'light');
		theme.init();

		expect(theme.current).toBe('light');
		expect(attributes.get('data-theme')).toBe('light');
	});
});
