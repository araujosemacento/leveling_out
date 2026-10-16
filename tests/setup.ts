import { mock } from 'bun:test';

mock.module('$app/environment', () => ({
	dev: true,
	browser: true,
	building: false,
	version: 'test'
}));

mock.module('$env/dynamic/public', () => ({
	env: {}
}));
