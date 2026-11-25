<script lang="ts">
	import { onMount } from 'svelte';
	import './sandbox.css';
	import { theme } from '$lib/stores/theme';
	import { GameEngine } from '$lib/engine';
	import Header from '$lib/components/Header.svelte';
	import TestTube from '$lib/components/TestTube.svelte';
	import DevToolbar from './DevToolbar.svelte';
	import SandboxRoundLab from './SandboxRoundLab.svelte';
	import RoomPage from '../../src/routes/[sala]/+page.svelte';
	import { projectSnapshotForPlayer, SANDBOX_PLAYERS } from './presets';
	import { sandboxController } from './mocks/mock-game-socket';

	let viewMode = $state<'route' | 'lab' | 'split'>('route');
	let rawSnapshot = $state(sandboxController.rawSnapshot);
	let animationNonce = $state(sandboxController.animationNonce);

	onMount(() => {
		theme.init();
		const unsub = sandboxController.subscribe(() => {
			rawSnapshot = sandboxController.rawSnapshot;
			animationNonce = sandboxController.animationNonce;
		});
		return unsub;
	});

	function buildProjectedView(povId: string) {
		const projected = projectSnapshotForPlayer(rawSnapshot, povId);
		const eng = new GameEngine('SALA-DEV');
		const player = SANDBOX_PLAYERS[povId];
		const nome =
			projected.jogadores?.find((j) => (j.playerId || j.id) === povId)?.nome ||
			player?.nome ||
			povId;
		eng.setPlayer(povId, nome, player?.equipe || 'ALEATORIO', player?.isHost);
		eng.reconcileFullSync(projected);
		return {
			povId,
			nome,
			projected,
			role: eng.getRoleProjection(povId),
			tube: eng.getTubeProjection(povId)
		};
	}

	let splitCodificadorId = $derived(rawSnapshot.rodadaAtiva?.codificadorId || 'p1');
	let splitPalpiteiroId = $derived(rawSnapshot.rodadaAtiva?.palpiteiroId || 'p2');
	let codificadorView = $derived(buildProjectedView(splitCodificadorId));
	let palpiteiroView = $derived(buildProjectedView(splitPalpiteiroId));
	let teamSlug = $derived<'pato' | 'ganso'>(rawSnapshot.equipeAtiva === 'B' ? 'ganso' : 'pato');
</script>

<div
	class="flex min-h-screen flex-col bg-bg-base text-text-primary antialiased transition-colors duration-200"
>
	<DevToolbar bind:viewMode />

	<Header />

	<main class="w-full flex-1">
		{#if viewMode === 'route'}
			{#key animationNonce}
				<RoomPage data={{ roomCode: 'SALA-DEV' }} params={{ sala: 'SALA-DEV' }} />
			{/key}
		{:else if viewMode === 'split'}
			<section
				aria-label="Visão Dupla Zero Trust: Codificador versus Palpiteiro"
				class="mx-auto w-full max-w-6xl border-b border-border-subtle px-4 py-4 sm:px-6 lg:px-8"
			>
				<div
					class="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2 text-xs"
				>
					<span class="font-display font-bold tracking-wide text-accent uppercase">
						Visão Dupla Zero Trust : Codificador / Palpiteiro
					</span>
					<span class="font-mono text-text-muted">
						Fase: {rawSnapshot.fase} / Menisco: {codificadorView.tube.periodoMeniscoSegundos}s
					</span>
				</div>

				<div
					class="grid grid-cols-1 divide-y divide-border-subtle md:grid-cols-2 md:divide-x md:divide-y-0"
				>
					{#each [{ label: 'Visão do Codificador', view: codificadorView }, { label: 'Visão do Palpiteiro', view: palpiteiroView }] as col (col.label)}
						<div class="flex items-center justify-between gap-4 py-4 md:px-5">
							<div class="flex min-w-0 flex-1 flex-col gap-1.5 text-xs">
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-util-heading font-bold text-text-primary">{col.label}</span>
									<span class="font-mono text-text-muted">({col.view.nome})</span>
								</div>
								<div class="font-mono text-[11px] text-text-muted">
									Papel: {col.view.role.descricaoPapel}
								</div>
								<div class="font-mono text-[11px]">
									{#if col.view.tube.isMetaOculta}
										<span class="font-semibold text-secondary"> metaOculta: null (Blindada) </span>
									{:else}
										<span class="font-semibold text-primary">
											metaOculta: {col.view.tube.metaVisivel}% (Visível)
										</span>
									{/if}
								</div>
								<div class="font-mono text-[11px] text-text-muted">
									diff: {col.view.projected.rodadaAtiva?.diff ?? 'Blindado'} / slider: {col.view
										.projected.rodadaAtiva?.sliderPosicao ??
										col.view.projected.rodadaAtiva?.palpite ??
										50}%
								</div>
								<div class="truncate font-util-body text-[11px] text-text-primary">
									Dica: {col.view.projected.rodadaAtiva?.dica || 'Aguardando envio'}
								</div>
							</div>

							<div class="shrink-0">
								<TestTube
									level={col.view.tube.metaVisivel ?? col.view.tube.marcadorPalpite}
									team={teamSlug}
									duration={col.view.tube.periodoMeniscoSegundos}
									showBubbles={col.view.tube.mostrarBorbulhas}
									class="h-28 w-auto"
								/>
							</div>
						</div>
					{/each}
				</div>
			</section>

			{#key animationNonce}
				<RoomPage data={{ roomCode: 'SALA-DEV' }} params={{ sala: 'SALA-DEV' }} />
			{/key}
		{:else}
			{#key animationNonce}
				<SandboxRoundLab />
			{/key}
		{/if}
	</main>
</div>
