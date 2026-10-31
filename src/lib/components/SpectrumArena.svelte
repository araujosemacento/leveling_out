<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { SpectrumPickerProjection } from '$lib/engine/render/projections';
	import SpectrumCard from '$lib/components/SpectrumCard.svelte';
	import PptIcon from '$lib/components/PptIcon.svelte';

	interface Props {
		projection: SpectrumPickerProjection;
		onPreSelect?: (cartaId: string) => void;
		onVote?: (cartaId: string) => void;
		onConfirm?: (cartaId: string) => void;
	}

	let { projection, onPreSelect, onVote, onConfirm }: Props = $props();

	let agora = $state(Date.now());
	let animTimer: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		animTimer = setInterval(() => {
			agora = Date.now();
		}, 100);
	});

	onDestroy(() => {
		if (animTimer) clearInterval(animTimer);
	});

	// Cálculo contínuo do tempo restante de 30 segundos
	let segundosRestantes = $derived.by(() => {
		if (!projection.prazoIso) return 30;
		const diff = new Date(projection.prazoIso).getTime() - agora;
		return Math.max(0, Math.ceil(diff / 1000));
	});

	let progressoPercentual = $derived(Math.max(0, Math.min(100, (segundosRestantes / 30) * 100)));

	let cartas = $derived(projection.cartas);
	let carta0 = $derived(cartas[0]);
	let carta1 = $derived(cartas[1]);

	// Determina a carta selecionada padrão (primeira carta como fallback)
	let cartaSelecionadaEfetiva = $derived.by(() => {
		if (projection.cartaSelecionadaId) return projection.cartaSelecionadaId;
		if (projection.votoParceiroCartaId) return projection.votoParceiroCartaId;
		return carta0 ? carta0.id : '';
	});

	function handleCardClick(cartaId: string) {
		if (projection.souLider) {
			onPreSelect?.(cartaId);
		} else if (projection.souParceiroVotante) {
			onVote?.(cartaId);
		}
	}

	function handleConfirm() {
		if (projection.podeConfirmar && cartaSelecionadaEfetiva) {
			onConfirm?.(cartaSelecionadaEfetiva);
		}
	}
</script>

<div class="flex w-full flex-col items-center select-none">
	<!-- Temporizador de 30 Segundos e Status Superior -->
	<header class="mb-6 flex w-full max-w-3xl flex-col gap-2 sm:mb-8">
		<div
			class="flex items-center justify-between text-xs font-bold tracking-wider text-text-muted uppercase"
		>
			<div class="flex items-center gap-2">
				<span class="inline-block h-2 w-2 bg-primary"></span>
				<span class="font-sn">
					Equipe {projection.equipeAtivaNome} : Escolha de Espectro
				</span>
			</div>
			<div class="flex items-center gap-1.5 font-mono text-sm font-black text-text-primary">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="shrink-0 text-primary"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10"></circle>
					<polyline points="12 6 12 12 16 14"></polyline>
				</svg>
				<span>{segundosRestantes}s</span>
			</div>
		</div>

		<!-- Barra de Progresso Contínua do Temporizador -->
		<div class="bg-surface-muted h-1.5 w-full overflow-hidden">
			<div
				class="h-full bg-primary transition-all duration-100 ease-linear"
				style="width: {progressoPercentual}%;"
			></div>
		</div>

		<!-- Status Contextual da Rodada -->
		<p class="mt-1 text-center text-xs font-medium text-text-muted sm:text-sm">
			{projection.statusMensagem}
		</p>
	</header>

	<!-- Arena das Duas Cartas de Espectro com Indicador de Voto Responsivo -->
	<!-- Em Landscape (desktop/telas horizontais): lado a lado com mãozinhas nas extremidades -->
	<!-- Em Portrait (mobile/telas verticais): empilhadas com mãozinhas acima da 1ª e abaixo da 2ª -->
	<main
		class="mb-8 flex w-full max-w-4xl flex-col items-center justify-center gap-6 md:flex-row md:gap-4 lg:gap-8"
	>
		<!-- SLOT 1: Carta Esquerda (Landscape) ou Superior (Portrait) -->
		{#if carta0}
			<div
				class="flex w-full max-w-97.5 flex-col items-center justify-center md:max-w-none md:flex-row"
			>
				<!-- Indicador de Voto da Mãozinha: Acima no Portrait, À Esquerda no Landscape -->
				<div
					class="flex items-center justify-center transition-all duration-200 {projection.maoCartaEsquerdaAtiva
						? 'scale-100 opacity-100'
						: 'pointer-events-none scale-75 opacity-0'} order-first mb-2 md:mr-3 md:mb-0"
					aria-label="Voto do parceiro nesta carta"
				>
					<div
						class="font-sn flex items-center gap-1.5 border-2 border-primary bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary shadow-xs"
					>
						<PptIcon move="papel" class="h-6 w-auto shrink-0" />
						<span class="hidden sm:inline">Voto</span>
					</div>
				</div>

				<!-- Carta 0 -->
				<div class="w-full max-w-97.5">
					<SpectrumCard
						carta={carta0}
						equipe={projection.equipeAtiva}
						selecionada={cartaSelecionadaEfetiva === carta0.id}
						interativo={projection.souLider || projection.souParceiroVotante}
						onclick={() => handleCardClick(carta0.id)}
					/>
				</div>
			</div>
		{/if}

		<!-- SLOT 2: Carta Direita (Landscape) ou Inferior (Portrait) -->
		{#if carta1}
			<div
				class="flex w-full max-w-97.5 flex-col items-center justify-center md:max-w-none md:flex-row"
			>
				<!-- Carta 1 -->
				<div class="w-full max-w-97.5">
					<SpectrumCard
						carta={carta1}
						equipe={projection.equipeAtiva}
						selecionada={cartaSelecionadaEfetiva === carta1.id}
						interativo={projection.souLider || projection.souParceiroVotante}
						onclick={() => handleCardClick(carta1.id)}
					/>
				</div>

				<!-- Indicador de Voto da Mãozinha: Abaixo no Portrait, À Direita no Landscape -->
				<div
					class="flex items-center justify-center transition-all duration-200 {projection.maoCartaDireitaAtiva
						? 'scale-100 opacity-100'
						: 'pointer-events-none scale-75 opacity-0'} order-last mt-2 md:mt-0 md:ml-3"
					aria-label="Voto do parceiro nesta carta"
				>
					<div
						class="font-sn flex items-center gap-1.5 border-2 border-primary bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary shadow-xs"
					>
						<PptIcon move="papel" class="h-6 w-auto shrink-0" />
						<span class="hidden sm:inline">Voto</span>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- Rodapé de Ação: Botão do Líder ou Feedback de Espera -->
	<footer class="flex w-full max-w-md flex-col items-center gap-3">
		{#if projection.souLider}
			<button
				onclick={handleConfirm}
				disabled={!projection.podeConfirmar}
				class="text-primary-contrast font-capriola inline-flex w-full cursor-pointer items-center justify-center gap-3 border-2 border-primary bg-primary px-8 py-3.5 text-base font-bold shadow-md transition-all duration-150 hover:brightness-105 active:translate-y-0.5 active:shadow-xs disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
			>
				<span>Confirmar Carta</span>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="shrink-0"
					aria-hidden="true"
				>
					<polyline points="9 18 15 12 9 6"></polyline>
				</svg>
			</button>
		{:else if projection.souParceiroVotante}
			<div
				class="border-surface-border bg-surface-muted border px-4 py-2 text-center text-xs font-medium text-text-muted"
			>
				Clique em uma das cartas para votar. O Líder {projection.liderNome} confirmará a escolha final.
			</div>
		{:else}
			<div
				class="border-surface-border bg-surface-muted border px-4 py-2 text-center text-xs font-medium text-text-muted"
			>
				Aguardando {projection.liderNome} (Líder da Equipe {projection.equipeAtivaNome}) confirmar a
				carta de espectro...
			</div>
		{/if}
	</footer>
</div>
