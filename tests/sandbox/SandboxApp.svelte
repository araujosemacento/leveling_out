<script lang="ts">
	import { onMount } from 'svelte';
	import './sandbox.css';
	import { theme } from '$lib/stores/theme';
	import Header from '$lib/components/Header.svelte';
	import DevToolbar from './DevToolbar.svelte';
	import SandboxRoundLab from './SandboxRoundLab.svelte';
	import RoomPage from '../../src/routes/[sala]/+page.svelte';
	import { sandboxController } from './mocks/mock-game-socket';

	let viewMode = $state<'route' | 'lab'>('route');
	let currentFase = $state(sandboxController.rawSnapshot.fase);

	onMount(() => {
		theme.init();
		const unsub = sandboxController.subscribe(() => {
			currentFase = sandboxController.rawSnapshot.fase;
		});
		return unsub;
	});

	let isRoundOrVictoryPhase = $derived(
		currentFase === 'RODADA_DICA' ||
			currentFase === 'RODADA_PALPITE' ||
			currentFase === 'RODADA_REVELACAO' ||
			currentFase === 'FIM_DE_JOGO' ||
			currentFase === 'VITORIA'
	);
</script>

<div
	class="flex min-h-screen flex-col bg-bg-base text-text-primary antialiased transition-colors duration-200"
>
	<DevToolbar bind:viewMode />

	<Header />

	<main class="w-full flex-1">
		{#if viewMode === 'route'}
			<RoomPage data={{ roomCode: 'SALA-DEV' }} params={{ sala: 'SALA-DEV' }} />

			{#if isRoundOrVictoryPhase}
				<div
					class="mx-auto my-8 max-w-5xl border-t-2 border-dashed border-border-strong px-4 pt-6 sm:px-6 lg:px-8"
				>
					<div class="mb-4 text-center font-mono text-xs tracking-widest text-text-muted uppercase">
						Laboratório de Interação da Rodada (Visão Sandbox Acoplada)
					</div>
					<SandboxRoundLab />
				</div>
			{/if}
		{:else}
			<SandboxRoundLab />
		{/if}
	</main>
</div>
