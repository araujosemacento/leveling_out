import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig([
	includeIgnoreFile(gitignorePath),
	{
		ignores: ['static/**', 'build/**', '.svelte-kit/**', 'backend/**']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},

	{
		files: ['**/*.svelte', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},

	{
		// Override or add rule settings here, such as:
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'no-control-regex': 'off'
		}
	}
]);
