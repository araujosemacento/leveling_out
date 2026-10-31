import { mount } from 'svelte';
import SandboxApp from './SandboxApp.svelte';

const target = document.getElementById('app');
if (!target) {
	throw new Error('Elemento #app não encontrado no DOM');
}

const app = mount(SandboxApp, {
	target
});

export default app;
