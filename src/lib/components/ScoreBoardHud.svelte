<script lang="ts">
	import type { ScoreBoardProjection } from '$lib/engine/render/projections';
	import type { TeamId } from '$lib/engine/types';
	import IconDuck from '~icons/game-icons/duck';
	import IconGoose from '~icons/game-icons/goose';

	interface Props {
		score: ScoreBoardProjection;
		equipeAtiva: TeamId;
		numeroRodada: number;
	}

	let { score, equipeAtiva, numeroRodada }: Props = $props();

	const progressoA = $derived(Math.max(0, Math.min(1, score.progressoA / 100)));
	const progressoB = $derived(Math.max(0, Math.min(1, score.progressoB / 100)));
</script>

<section
	aria-label="Placar da partida"
	class="mx-auto flex w-full max-w-4xl items-center justify-between gap-2 border-b border-border-subtle px-1 py-2 sm:gap-4"
>
	<!-- Equipe Pato (Esquerda / Accent) -->
	<div
		class="flex shrink-0 items-center gap-1.5 sm:gap-2.5"
		aria-current={equipeAtiva === 'A' ? 'true' : undefined}
	>
		<span
			class="turn-indicator h-4 w-1 bg-accent {equipeAtiva === 'A' ? 'opacity-100' : 'opacity-0'}"
			aria-hidden="true"
		></span>
		<IconDuck class="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
		<span class="font-util-heading text-xs font-bold text-text-primary sm:text-sm">Pato</span>
		{#key score.placarA}
			<span
				class="score-pop font-display text-2xl leading-none text-accent tabular-nums"
				aria-label="Pontuação da Equipe Pato: {score.placarA}"
			>
				{score.placarA}
			</span>
		{/key}
	</div>

	<!-- Trilho Duplo Simétrico Rumo à Meta -->
	<div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
		<div
			class="h-2 flex-1 overflow-hidden rounded-full bg-bg-surface-soft shadow-inner"
			role="progressbar"
			aria-label="Progresso da Equipe Pato"
			aria-valuemin={0}
			aria-valuemax={score.metaPontuacao}
			aria-valuenow={score.placarA}
		>
			<div
				class="score-bar h-full w-full origin-left bg-accent"
				style="transform: scaleX({progressoA});"
			></div>
		</div>

		<div class="flex shrink-0 flex-col items-center leading-tight">
			{#if numeroRodada > 0}
				<span class="font-code text-[10px] text-text-subtle">Rodada {numeroRodada}</span>
			{/if}
			<span class="font-code text-[11px] font-semibold text-text-subtle">
				Meta {score.metaPontuacao}
			</span>
		</div>

		<div
			class="h-2 flex-1 overflow-hidden rounded-full bg-bg-surface-soft shadow-inner"
			role="progressbar"
			aria-label="Progresso da Equipe Ganso"
			aria-valuemin={0}
			aria-valuemax={score.metaPontuacao}
			aria-valuenow={score.placarB}
		>
			<div
				class="score-bar h-full w-full origin-right bg-secondary"
				style="transform: scaleX({progressoB});"
			></div>
		</div>
	</div>

	<!-- Equipe Ganso (Direita / Secondary) -->
	<div
		class="flex shrink-0 items-center gap-1.5 sm:gap-2.5"
		aria-current={equipeAtiva === 'B' ? 'true' : undefined}
	>
		{#key score.placarB}
			<span
				class="score-pop font-display text-2xl leading-none text-secondary tabular-nums"
				aria-label="Pontuação da Equipe Ganso: {score.placarB}"
			>
				{score.placarB}
			</span>
		{/key}
		<span class="font-util-heading text-xs font-bold text-text-primary sm:text-sm">Ganso</span>
		<IconGoose class="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
		<span
			class="turn-indicator h-4 w-1 bg-secondary {equipeAtiva === 'B'
				? 'opacity-100'
				: 'opacity-0'}"
			aria-hidden="true"
		></span>
	</div>
</section>

<style>
	.score-pop {
		display: inline-block;
		animation: scorePop 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	.score-bar {
		transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.turn-indicator {
		transition: opacity 180ms ease-out;
	}

	@keyframes scorePop {
		0% {
			transform: scale(1.25);
		}
		100% {
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.score-pop {
			animation: none;
		}

		.score-bar,
		.turn-indicator {
			transition: none;
		}
	}
</style>
