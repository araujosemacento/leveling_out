<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { haptics } from '$lib/engine/input/haptics';
	import type { RevealProjection } from '$lib/engine/render/projections';
	import type { SpectrumCard as SpectrumCardType } from '$lib/engine/types';
	import SpectrumCard from '$lib/components/SpectrumCard.svelte';
	import TestTube from '$lib/components/TestTube.svelte';

	interface Props {
		reveal: RevealProjection;
		periodoMenisco: number;
	}

	let { reveal, periodoMenisco }: Props = $props();

	const RADIAL_RAYS = [
		{ idx: 0, x1: 66, y1: 48, x2: 90, y2: 48 },
		{ idx: 1, x1: 60.7, y1: 60.7, x2: 77.7, y2: 77.7 },
		{ idx: 2, x1: 48, y1: 66, x2: 48, y2: 90 },
		{ idx: 3, x1: 35.3, y1: 60.7, x2: 18.3, y2: 77.7 },
		{ idx: 4, x1: 30, y1: 48, x2: 6, y2: 48 },
		{ idx: 5, x1: 35.3, y1: 35.3, x2: 18.3, y2: 18.3 },
		{ idx: 6, x1: 48, y1: 30, x2: 48, y2: 6 },
		{ idx: 7, x1: 60.7, y1: 35.3, x2: 77.7, y2: 18.3 }
	] as const;

	// Estados da coreografia determinística em 4 tempos
	let targetLevel = $state(0);
	let showBubbles = $state(false);
	let showToleranceZones = $state(false);
	let verdictVisible = $state(false);
	let showCountdown = $state(false);
	let agora = $state(Date.now());

	let timers: ReturnType<typeof setTimeout>[] = [];
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	function limparTimers(): void {
		for (const timer of timers) {
			clearTimeout(timer);
		}
		timers = [];
		if (countdownInterval !== null) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	}

	function isReducedMotion(): boolean {
		return (
			typeof window !== 'undefined' &&
			Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
		);
	}

	onMount(() => {
		countdownInterval = setInterval(() => {
			agora = Date.now();
		}, 250);

		if (isReducedMotion()) {
			targetLevel = reveal.metaReal;
			showBubbles = true;
			showToleranceZones = true;
			verdictVisible = true;
			showCountdown = true;
			return;
		}

		// Tempo 1 (0ms a 320ms): Expectativa com nível em 0% e agulha do palpite visível
		// Tempo 2 (320ms a 1450ms): Subida dramática do fluido e ativação das faixas de tolerância
		timers.push(
			setTimeout(() => {
				targetLevel = reveal.metaReal;
				showBubbles = true;
			}, 320)
		);

		timers.push(
			setTimeout(() => {
				showToleranceZones = true;
			}, 1250)
		);

		// Tempo 3 (1450ms): Veredito tipográfico e impacto háptico
		timers.push(
			setTimeout(() => {
				verdictVisible = true;
				haptics.reveal(reveal.tier);
			}, 1450)
		);

		// Tempo 4 (1800ms em diante): Contagem suave para a próxima rodada ou resultado final
		timers.push(
			setTimeout(() => {
				showCountdown = true;
			}, 1800)
		);
	});

	onDestroy(() => {
		limparTimers();
	});

	let teamSlug = $derived<'pato' | 'ganso'>(reveal.equipeAtiva === 'A' ? 'pato' : 'ganso');

	let cartaExibicao = $derived<SpectrumCardType>({
		id: `reveal-r${reveal.numeroRodada}`,
		esquerda: reveal.poloEsquerdo,
		direita: reveal.poloDireito
	});

	let verdictColorClass = $derived.by(() => {
		if (reveal.tier === 'NA_MOSCA') return 'text-primary';
		if (reveal.tier === 'MUITO_PERTO') return 'text-tertiary';
		if (reveal.tier === 'PERTO') return 'text-accent';
		return 'text-secondary';
	});

	let pontosTexto = $derived(reveal.pontosGanhos > 0 ? `+${reveal.pontosGanhos}` : '0');

	let partidaEncerrada = $derived(
		reveal.placarA >= reveal.metaPontuacao || reveal.placarB >= reveal.metaPontuacao
	);

	let segundosRestantes = $derived.by(() => {
		if (!reveal.transicaoEmIso) return null;
		const diffMs = new Date(reveal.transicaoEmIso).getTime() - agora;
		if (Number.isNaN(diffMs)) return null;
		return Math.max(0, Math.ceil(diffMs / 1000));
	});
</script>

<section
	class="flex w-full flex-col items-center gap-6 py-2 select-none sm:gap-8"
	aria-label="Revelação da rodada {reveal.numeroRodada}"
>
	<!-- Cabeçalho Tipográfico Aberto -->
	<header
		class="flex w-full max-w-4xl flex-col items-center gap-1 border-b border-border-subtle pb-4 text-center"
	>
		<span class="font-util-heading text-xs font-bold tracking-wider text-text-muted uppercase">
			Rodada {reveal.numeroRodada} : Equipe {reveal.equipeAtivaNome} : Revelação
		</span>
		<p class="font-util-body text-xs text-text-subtle">
			Codificador: <strong class="font-semibold text-text-primary">{reveal.codificadorNome}</strong>
			/ Palpiteiro: <strong class="font-semibold text-text-primary">{reveal.palpiteiroNome}</strong>
		</p>
	</header>

	<!-- Palco Central: Carta de Espectro + Dica Lida ao lado do Tubo de Ensaio -->
	<div
		class="flex w-full max-w-4xl flex-col items-center justify-center gap-8 md:flex-row md:items-center md:gap-12"
	>
		<div class="flex w-full max-w-97.5 shrink-0 flex-col items-center gap-4">
			<SpectrumCard carta={cartaExibicao} equipe={reveal.equipeAtiva} interativo={false} />

			<div class="w-full border-y border-border-subtle py-3 text-center">
				<span
					class="block font-util-heading text-[11px] font-bold tracking-wider text-text-subtle uppercase"
				>
					Dica enviada
				</span>
				<p class="mt-1 font-subheading text-xl font-bold text-text-primary sm:text-2xl">
					"{reveal.dica || 'Sem dica'}"
				</p>
			</div>
		</div>

		<div class="flex shrink-0 flex-col items-center justify-center">
			<TestTube
				level={targetLevel}
				team={teamSlug}
				guessLevel={reveal.palpite}
				{showToleranceZones}
				{showBubbles}
				smoothLevel={true}
				duration={periodoMenisco}
				class="h-64 w-auto sm:h-72"
			/>
		</div>
	</div>

	<!-- Tempo 3: Veredito Tipográfico (Sem cards flutuantes) -->
	<div
		class="flex min-h-28 w-full max-w-2xl flex-col items-center justify-center text-center"
		aria-live="polite"
	>
		{#if verdictVisible}
			<div class="reveal-verdict-enter flex flex-col items-center gap-2">
				{#if reveal.tier === 'NA_MOSCA'}
					<div class="flex items-center justify-center gap-3">
						<svg
							viewBox="0 0 96 96"
							class="reveal-burst h-12 w-12 shrink-0 text-primary"
							fill="none"
							stroke="currentColor"
							stroke-width="3.5"
							stroke-linecap="square"
							aria-hidden="true"
						>
							{#each RADIAL_RAYS as ray (ray.idx)}
								<line
									x1={ray.x1}
									y1={ray.y1}
									x2={ray.x2}
									y2={ray.y2}
									pathLength="24"
									class="reveal-ray"
									style="--ray-idx: {ray.idx};"
								/>
							{/each}
						</svg>

						<h2 class="font-display text-3xl tracking-tight text-primary sm:text-4xl">
							{reveal.rotuloSintonia} : {pontosTexto} pontos
						</h2>
					</div>
				{:else}
					<h2
						class="font-display text-3xl tracking-tight sm:text-4xl {verdictColorClass} {reveal.tier ===
						'ERRO'
							? 'animate-miss-shake'
							: ''}"
					>
						{reveal.rotuloSintonia} : {pontosTexto} pontos
					</h2>
				{/if}

				<p class="font-util-body text-sm font-medium text-text-muted sm:text-base">
					Meta <span class="font-code font-bold text-text-primary">{reveal.metaReal}%</span>
					/ Palpite <span class="font-code font-bold text-text-primary">{reveal.palpite}%</span>
					(diferença de <span class="font-code font-bold text-text-primary">{reveal.diff}%</span>)
				</p>
			</div>
		{:else}
			<p class="font-util-heading text-xs font-bold tracking-wider text-text-subtle uppercase">
				Calculando sintonia da rodada...
			</p>
		{/if}
	</div>

	<!-- Tempo 4: Linha Discreta de Transição Automática -->
	<footer
		class="flex min-h-7 w-full max-w-2xl items-center justify-center border-t border-border-subtle pt-3 text-center"
	>
		{#if showCountdown}
			<p class="reveal-fade-in font-util-body text-xs font-medium text-text-muted">
				{#if partidaEncerrada}
					Conferindo resultado final...
				{:else if segundosRestantes !== null}
					Próxima rodada em <span class="font-code font-bold text-text-primary"
						>{segundosRestantes}s</span
					>
				{:else}
					Preparando próxima rodada...
				{/if}
			</p>
		{/if}
	</footer>
</section>

<style>
	.reveal-verdict-enter {
		animation: revealVerdictPop 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	.reveal-fade-in {
		animation: revealFadeIn 240ms ease-out forwards;
	}

	.reveal-burst {
		animation: revealBurstScale 420ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	.reveal-ray {
		stroke-dasharray: 24;
		stroke-dashoffset: 24;
		animation: revealRayDraw 460ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--ray-idx) * 25ms);
	}

	.animate-miss-shake {
		animation: missShake 260ms ease-out;
	}

	@keyframes revealVerdictPop {
		0% {
			opacity: 0;
			transform: translateY(8px) scale(0.96);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes revealFadeIn {
		0% {
			opacity: 0;
			transform: translateY(4px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes revealBurstScale {
		0% {
			opacity: 0;
			transform: scale(0.75);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes revealRayDraw {
		0% {
			stroke-dashoffset: 24;
		}
		100% {
			stroke-dashoffset: 0;
		}
	}

	@keyframes missShake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-4px);
		}
		45% {
			transform: translateX(4px);
		}
		70% {
			transform: translateX(-3px);
		}
		88% {
			transform: translateX(2px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal-verdict-enter,
		.reveal-fade-in,
		.reveal-burst,
		.animate-miss-shake {
			animation: none !important;
			opacity: 1 !important;
			transform: none !important;
		}

		.reveal-ray {
			animation: none !important;
			stroke-dashoffset: 0 !important;
		}
	}
</style>
