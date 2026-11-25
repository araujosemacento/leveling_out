<script lang="ts">
	import { fly } from 'svelte/transition';
	import { haptics } from '$lib/engine/input/haptics';
	import type { VictoryProjection } from '$lib/engine/render/projections';
	import TestTube from '$lib/components/TestTube.svelte';

	import IconDuck from '~icons/game-icons/duck';
	import IconGoose from '~icons/game-icons/goose';
	import IconRotateCcw from '~icons/lucide/rotate-ccw';
	import IconLogOut from '~icons/lucide/log-out';

	interface Props {
		victory: VictoryProjection;
		onRematch: () => void;
		onBackHome: () => void;
		isRequestingRematch?: boolean;
	}

	let { victory, onRematch, onBackHome, isRequestingRematch = false }: Props = $props();

	const prefersReducedMotion =
		typeof window !== 'undefined' &&
		Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

	let isGansoWinner = $derived(victory.vencedorEquipe === 'B');
	let winnerColorClass = $derived(isGansoWinner ? 'text-secondary' : 'text-accent');
	let winnerTeamProp = $derived<'pato' | 'ganso'>(isGansoWinner ? 'ganso' : 'pato');

	let outcomeContextLabel = $derived.by(() => {
		if (victory.minhaEquipeVenceu === true) return 'Vitória da sua equipe';
		if (victory.minhaEquipeVenceu === false) return 'Vitória da equipe adversária';
		return 'Partida encerrada';
	});

	function handleRematch() {
		if (isRequestingRematch || !victory.podePedirRevanche) return;
		haptics.tap();
		onRematch();
	}

	function handleBackHome() {
		haptics.tap();
		onBackHome();
	}
</script>

<section
	class="flex w-full flex-col items-center px-2 py-4 select-none sm:py-6"
	aria-label="Resultado Final da Partida"
>
	<!-- Cabeçalho Hero de Consagração -->
	<header
		class="flex w-full max-w-3xl flex-col items-center gap-4 pb-6 text-center"
		in:fly={{
			y: prefersReducedMotion ? 0 : 12,
			duration: prefersReducedMotion ? 0 : 280,
			delay: 0
		}}
	>
		<span class="font-util-heading text-xs font-bold tracking-wider text-text-muted uppercase">
			{outcomeContextLabel}
		</span>

		<div class="flex items-center justify-center gap-5 sm:gap-8">
			<TestTube
				level={100}
				team={winnerTeamProp}
				duration={0.35}
				showBubbles={true}
				class="h-auto w-24 shrink-0 sm:w-28"
			/>

			<div class="flex flex-col items-center justify-center gap-2">
				{#if isGansoWinner}
					<IconGoose
						class="h-16 w-16 -scale-x-100 text-secondary sm:h-20 sm:w-20"
						aria-hidden="true"
					/>
				{:else}
					<IconDuck class="h-16 w-16 text-accent sm:h-20 sm:w-20" aria-hidden="true" />
				{/if}
				<span
					class="font-util-heading text-xs font-bold tracking-widest uppercase {winnerColorClass}"
				>
					Campeã
				</span>
			</div>
		</div>

		<h1 class="font-display text-4xl tracking-tight sm:text-6xl {winnerColorClass}">
			{victory.vencedorNome} Venceu!
		</h1>

		<p class="font-subheading text-lg font-bold text-text-primary sm:text-2xl">
			<span class="text-accent">Pato</span>
			<span class="mx-2 font-code text-text-primary">{victory.placarA} : {victory.placarB}</span>
			<span class="text-secondary">Ganso</span>
		</p>
	</header>

	<!-- Faixa de Métricas de Sintonia -->
	{#if victory.historico.length > 0 && victory.melhorRodada}
		<div
			class="my-4 grid w-full max-w-3xl grid-cols-1 divide-y divide-border-subtle border-y border-border-subtle py-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
		>
			<div
				class="flex flex-col items-center justify-center gap-1 px-4 py-3 text-center sm:py-0"
				in:fly={{
					y: prefersReducedMotion ? 0 : 10,
					duration: prefersReducedMotion ? 0 : 240,
					delay: prefersReducedMotion ? 0 : 60
				}}
			>
				<span
					class="font-util-heading text-[11px] font-bold tracking-wider text-text-muted uppercase"
				>
					Sintonia Média
				</span>
				<span class="font-code text-2xl font-black text-text-primary sm:text-3xl">
					{victory.precisaoMedia}%
				</span>
				<span class="font-util-body text-xs text-text-muted">
					Precisão global em {victory.totalRodadas}
					{victory.totalRodadas === 1 ? 'rodada' : 'rodadas'}
				</span>
			</div>

			<div
				class="flex flex-col items-center justify-center gap-1 px-4 py-3 text-center sm:py-0"
				in:fly={{
					y: prefersReducedMotion ? 0 : 10,
					duration: prefersReducedMotion ? 0 : 240,
					delay: prefersReducedMotion ? 0 : 120
				}}
			>
				<span
					class="font-util-heading text-[11px] font-bold tracking-wider text-text-muted uppercase"
				>
					Calibrações Exatas
				</span>
				<span class="font-code text-2xl font-black text-primary sm:text-3xl">
					{victory.contagemNaMosca}
				</span>
				<span class="font-util-body text-xs text-text-muted"> Jogadas Na Mosca (+4 pts) </span>
			</div>

			<div
				class="flex flex-col items-center justify-center gap-1 px-4 py-3 text-center sm:py-0"
				in:fly={{
					y: prefersReducedMotion ? 0 : 10,
					duration: prefersReducedMotion ? 0 : 240,
					delay: prefersReducedMotion ? 0 : 180
				}}
			>
				<span
					class="font-util-heading text-[11px] font-bold tracking-wider text-text-muted uppercase"
				>
					Melhor Jogada da Partida
				</span>
				<span class="font-subheading text-base font-bold text-text-primary">
					"{victory.melhorRodada.dica || 'Sem dica'}"
				</span>
				<span class="font-util-body text-xs text-text-muted">
					{victory.melhorRodada.espectroEsquerda} / {victory.melhorRodada.espectroDireita} : erro de
					{victory.melhorRodada.diff}%
				</span>
			</div>
		</div>
	{:else}
		<div
			class="my-4 w-full max-w-3xl border-y border-border-subtle py-5 text-center"
			in:fly={{
				y: prefersReducedMotion ? 0 : 10,
				duration: prefersReducedMotion ? 0 : 240,
				delay: prefersReducedMotion ? 0 : 60
			}}
		>
			<p class="font-util-body text-sm text-text-muted">
				Partida encerrada antes da conclusão de rodadas completas ({victory.motivoFim}).
			</p>
		</div>
	{/if}

	<!-- Registro Compacto das Rodadas -->
	{#if victory.historico.length > 0}
		<div
			class="mt-2 mb-8 w-full max-w-3xl"
			in:fly={{
				y: prefersReducedMotion ? 0 : 10,
				duration: prefersReducedMotion ? 0 : 240,
				delay: prefersReducedMotion ? 0 : 240
			}}
		>
			<h2
				class="border-b border-border-subtle pb-2 font-util-heading text-xs font-bold tracking-wider text-text-muted uppercase"
			>
				Histórico da Partida
			</h2>

			<ul class="m-0 list-none p-0">
				{#each victory.historico as h (h.numero)}
					<li
						class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border-subtle/60 py-2.5 text-xs"
					>
						<div class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
							<span class="font-code font-bold text-text-primary">R{h.numero}</span>
							<span
								class="font-util-heading font-bold {h.equipe === 'B'
									? 'text-secondary'
									: 'text-accent'}"
							>
								{h.equipe === 'B' ? 'Ganso' : 'Pato'}
							</span>
							<span class="font-util-body text-text-muted">
								{h.espectroEsquerda} / {h.espectroDireita}
							</span>
							<span class="font-util-body font-semibold text-text-primary">
								"{h.dica}"
							</span>
						</div>

						<div class="flex items-center gap-3">
							<span class="font-code text-text-muted">
								Meta {h.metaOculta}% / Palpite {h.palpite}%
							</span>
							<span
								class="font-code font-bold {h.pontos >= 4
									? 'text-primary'
									: h.pontos > 0
										? 'text-tertiary'
										: 'text-text-muted'}"
							>
								+{h.pontos} pts
							</span>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Ações de Desfecho -->
	<div
		class="mt-2 flex flex-col items-center gap-4"
		in:fly={{
			y: prefersReducedMotion ? 0 : 10,
			duration: prefersReducedMotion ? 0 : 240,
			delay: prefersReducedMotion ? 0 : 300
		}}
	>
		<button
			type="button"
			class="btn-soft-elevated group gap-3 px-9 py-4 font-util-heading text-base font-bold text-accent"
			disabled={isRequestingRematch || !victory.podePedirRevanche}
			onclick={handleRematch}
		>
			<span>{isRequestingRematch ? 'Preparando Revanche' : 'Jogar Revanche'}</span>
			<IconRotateCcw
				class="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-rotate-45 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
				aria-hidden="true"
			/>
		</button>

		<button
			type="button"
			class="group inline-flex cursor-pointer items-center gap-2 py-2 font-util-heading text-sm font-medium text-text-muted underline-offset-4 transition-colors hover:text-text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
			onclick={handleBackHome}
		>
			<span>Sair para a Tela Inicial</span>
			<IconLogOut
				class="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
				aria-hidden="true"
			/>
		</button>
	</div>
</section>
