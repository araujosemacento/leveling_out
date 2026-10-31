import path from 'node:path';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import Icons from 'unplugin-icons/vite';

const currentDir = import.meta.dirname || import.meta.dir;
const repoRoot = path.resolve(currentDir, '..');
const sandboxRoot = path.resolve(repoRoot, 'tests/sandbox');

async function startSandbox() {
	const server = await createServer({
		configFile: false,
		root: sandboxRoot,
		publicDir: path.resolve(repoRoot, 'static'),
		plugins: [
			tailwindcss(),
			svelte({
				configFile: path.resolve(repoRoot, 'svelte.config.js')
			}),
			Icons({
				compiler: 'svelte'
			})
		],
		resolve: {
			alias: [
				{
					find: /^\$lib\/network\/game-socket$/,
					replacement: path.resolve(sandboxRoot, 'mocks/mock-game-socket.ts')
				},
				{
					find: '$lib',
					replacement: path.resolve(repoRoot, 'src/lib')
				},
				{
					find: '$app/navigation',
					replacement: path.resolve(sandboxRoot, 'mocks/app-navigation.ts')
				},
				{
					find: '$app/paths',
					replacement: path.resolve(sandboxRoot, 'mocks/app-paths.ts')
				},
				{
					find: '$app/state',
					replacement: path.resolve(sandboxRoot, 'mocks/app-state.ts')
				}
			]
		},
		server: {
			port: 5174,
			strictPort: false,
			fs: {
				allow: [repoRoot]
			}
		}
	});

	await server.listen();
	console.log('\n======================================================');
	console.log(' LEVELING OUT : AMBIENTE SANDBOX INICIADO (100% MOCK)');
	console.log('======================================================');
	server.printUrls();
}

startSandbox().catch((err) => {
	console.error('Erro ao iniciar o ambiente Sandbox:', err);
	process.exit(1);
});
