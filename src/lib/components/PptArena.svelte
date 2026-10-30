<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';
	import type { PptMove } from '$lib/engine/types';
	import type { PptProjection } from '$lib/engine/render/projections';

	import IconFist from '~icons/emojione-monotone/raised-fist';
	import IconHand from '~icons/emojione-monotone/raised-hand';
	import IconVictory from '~icons/emojione-monotone/victory-hand';
	import IconTimer from '~icons/lucide/timer';

	interface Props {
		ppt: PptProjection;
		onSelectMove?: (move: PptMove) => void;
		disabled?: boolean;
	}

	let { ppt, onSelectMove, disabled = false }: Props = $props();

	let agora = $state(Date.now());
	let inicioResultadoMs = $state<number | null>(null);
	let subfaseAnterior = $state<string>('ESCOLHA');
	let animTimer: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		animTimer = setInterval(() => {
			agora = Date.now();
		}, 40);
	});

	onDestroy(() => {
		if (animTimer) clearInterval(animTimer);
	});

	// Rastreia o instante exato em que a subfase RESULTADO se inicia para exibir "Já!" por 1.2s
	$effect(() => {
		if (ppt.subfase === 'RESULTADO' && subfaseAnterior !== 'RESULTADO') {
			inicioResultadoMs = Date.now();
		} else if (ppt.subfase !== 'RESULTADO') {
			inicioResultadoMs = null;
		}
		subfaseAnterior = ppt.subfase;
	});

	// Tempo restante da escolha (padrão 20 segundos)
	let segundosEscolha = $derived.by(() => {
		if (!ppt.prazoIso) return 20;
		const diff = new Date(ppt.prazoIso).getTime() - agora;
		return Math.max(0, Math.ceil(diff / 1000));
	});

	// Passo da contagem regressiva sincronizada (3, 2, 1)
	let contagemPasso = $derived.by(() => {
		if (!ppt.revelacaoEmIso) return 3;
		const diff = new Date(ppt.revelacaoEmIso).getTime() - agora;
		if (diff > 2000) return 3;
		if (diff > 1000) return 2;
		return 1;
	});

	// Define se estamos nos primeiros 1200ms da revelação para exibir "Já!" junto da abertura das mãos
	let exibindoJa = $derived.by(() => {
		if (ppt.subfase !== 'RESULTADO') return false;
		if (inicioResultadoMs !== null) {
			return agora - inicioResultadoMs < 1200;
		}
		if (ppt.revelacaoEmIso) {
			const desdeRevelacao = agora - new Date(ppt.revelacaoEmIso).getTime();
			return desdeRevelacao >= 0 && desdeRevelacao < 1200;
		}
		return false;
	});

	let desfechoConsolidado = $derived(ppt.subfase === 'RESULTADO' && !exibindoJa);

	function handleEscolha(lance: PptMove) {
		if (!ppt.podeEscolherLance || disabled) return;
		onSelectMove?.(lance);
	}

	function getIconeMao(lance: PptMove | null) {
		switch (lance) {
			case 'papel':
				return IconHand;
			case 'tesoura':
				return IconVictory;
			case 'pedra':
			default:
				return IconFist;
		}
	}

	let IconeLocal = $derived(
		ppt.subfase === 'RESULTADO' ? getIconeMao(ppt.lanceLocalRevelado) : IconFist
	);

	let IconeAdversario = $derived(
		ppt.subfase === 'RESULTADO' ? getIconeMao(ppt.lanceAdversarioRevelado) : IconFist
	);

	const opcoesBotoeira: { id: PptMove; label: string; Icon: typeof IconFist }[] = [
		{ id: 'pedra', label: 'Pedra', Icon: IconFist },
		{ id: 'tesoura', label: 'Tesoura', Icon: IconVictory },
		{ id: 'papel', label: 'Papel', Icon: IconHand }
	];
</script>

<section
	in:fade={{ duration: 220, easing: cubicOut }}
	class="flex min-h-120 w-full flex-col items-center justify-between rounded-3xl border border-border-subtle bg-bg-surface px-5 py-8 text-center shadow-xs transition-colors sm:px-8"
	aria-label="Arena de Disputa de Iniciativa"
>
	<!-- 1. Linha Superior: Cronômetro / Contagem 3, 2, 1 / Grito "Já!" / Desfecho -->
	<header class="relative flex min-h-16 w-full flex-col items-center justify-center">
		{#if ppt.subfase === 'ESCOLHA'}
			<div
				in:scale={{ duration: 200, start: 0.9, easing: cubicOut }}
				out:fade={{ duration: 140 }}
				class="flex items-center gap-2.5 rounded-full border border-border-subtle bg-bg-surface-soft px-5 py-2 shadow-xs"
			>
				<IconTimer
					class="h-5 w-5 transition-colors {segundosEscolha <= 5
						? 'animate-pulse text-secondary'
						: 'text-primary'}"
				/>
				{#key segundosEscolha}
					<span
						class="animate-timer-tick font-display text-xl tracking-wide {segundosEscolha <= 5
							? 'text-secondary'
							: 'text-text-primary'}"
					>
						{segundosEscolha}s
					</span>
				{/key}
			</div>
		{:else if ppt.subfase === 'CONTAGEM'}
			{#key contagemPasso}
				<span
					class="animate-ppt-pop font-display text-5xl font-black text-accent drop-shadow-sm sm:text-6xl"
				>
					{contagemPasso}
				</span>
			{/key}
		{:else if exibindoJa}
			<span
				class="animate-ppt-pop font-display text-5xl font-black text-primary drop-shadow-sm sm:text-6xl"
			>
				Já!
			</span>
		{:else}
			<div
				in:fly={{ y: 10, duration: 280, easing: backOut }}
				class="flex flex-col items-center gap-1"
			>
				<span
					class="font-display text-2xl sm:text-3xl {ppt.resultado === 'EMPATE'
						? 'text-secondary'
						: ppt.vitoriaLocal
							? 'text-accent'
							: 'text-primary'}"
				>
					{#if ppt.resultado === 'EMPATE'}
						Empate!
					{:else if ppt.vitoriaLocal}
						Iniciativa Garantida!
					{:else}
						Iniciativa do Adversário
					{/if}
				</span>
			</div>
		{/if}
	</header>

	<!-- 2. Linha Central: Confronto Horizontal [Você / Sua Equipe] [Mão] x [Mão] [Oponente / Adversário] -->
	<div class="my-6 flex w-full max-w-3xl items-center justify-center gap-3 px-2 sm:gap-8 sm:px-6">
		<!-- Bloco Local (Esquerda) -->
		<div class="flex flex-1 flex-col-reverse items-center justify-end gap-3 sm:flex-row sm:gap-5">
			<div class="flex flex-col items-center sm:items-end">
				<span
					class="font-subheading text-base font-bold transition-colors duration-200 sm:text-lg {desfechoConsolidado &&
					ppt.vitoriaLocal === true
						? 'text-accent'
						: 'text-text-primary'}"
				>
					{ppt.rotuloLocal}
				</span>
				{#if !ppt.souRepresentante}
					<span class="font-util-body text-xs text-text-subtle">
						{ppt.nomeRepresentanteLocal}
					</span>
				{/if}
			</div>

			{#key ppt.subfase === 'CONTAGEM' ? `beat-L-${contagemPasso}` : `state-L-${ppt.subfase}`}
				<div
					class="relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36 {ppt.subfase ===
					'CONTAGEM'
						? 'animate-ppt-beat-left'
						: ppt.subfase === 'RESULTADO'
							? 'animate-ppt-reveal-left'
							: ''}"
				>
					<div
						class="transition-all duration-300 {desfechoConsolidado
							? ppt.vitoriaLocal === true
								? 'scale-112 text-accent drop-shadow-md'
								: ppt.vitoriaLocal === false
									? 'scale-90 text-text-muted opacity-45'
									: 'text-secondary'
							: !ppt.souRepresentante && ppt.minhaEquipeEnviou
								? 'text-accent'
								: 'text-text-primary'}"
					>
						<IconeLocal class="h-22 w-22 rotate-90 sm:h-28 sm:w-28" />
					</div>
				</div>
			{/key}
		</div>

		<!-- Divisor Central -->
		<div class="flex shrink-0 flex-col items-center justify-center px-1 sm:px-3">
			<span class="font-display text-2xl text-border-medium select-none sm:text-3xl">x</span>
		</div>

		<!-- Bloco Adversário (Direita, Espelhado Horizontalmente) -->
		<div class="flex flex-1 flex-col items-center justify-start gap-3 sm:flex-row sm:gap-5">
			{#key ppt.subfase === 'CONTAGEM' ? `beat-R-${contagemPasso}` : `state-R-${ppt.subfase}`}
				<div
					class="relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36 {ppt.subfase ===
					'CONTAGEM'
						? 'animate-ppt-beat-right'
						: ppt.subfase === 'RESULTADO'
							? 'animate-ppt-reveal-right'
							: ''}"
				>
					<div
						class="transition-all duration-300 {desfechoConsolidado
							? ppt.vitoriaLocal === false && ppt.resultado !== 'EMPATE'
								? 'scale-112 text-primary drop-shadow-md'
								: ppt.vitoriaLocal === true
									? 'scale-90 text-text-muted opacity-45'
									: 'text-secondary'
							: ppt.adversarioEnviou
								? 'text-primary'
								: 'text-text-primary'}"
					>
						<IconeAdversario class="h-22 w-22 -scale-x-100 rotate-90 sm:h-28 sm:w-28" />
					</div>
				</div>
			{/key}

			<div class="flex flex-col items-center sm:items-start">
				<span
					class="font-subheading text-base font-bold transition-colors duration-200 sm:text-lg {ppt.adversarioEnviou &&
					ppt.subfase === 'ESCOLHA'
						? 'text-primary'
						: desfechoConsolidado && ppt.vitoriaLocal === false && ppt.resultado !== 'EMPATE'
							? 'text-primary'
							: 'text-text-primary'}"
				>
					{ppt.rotuloAdversario}
				</span>
				{#if !ppt.souRepresentante}
					<span class="font-util-body text-xs text-text-subtle">
						{ppt.nomeRepresentanteAdversario}
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- 3. Linha Inferior: Faixa Dedicada de Status + Botoeira Persistente do Representante -->
	<footer class="flex min-h-28 w-full flex-col items-center justify-end gap-4">
		<!-- Faixa de Mensagem de Orientação (Altura Fixa para evitar Layout Shift) -->
		<div class="flex min-h-6 items-center justify-center">
			{#key `${ppt.subfase}-${exibindoJa}-${ppt.mensagemStatus}`}
				<p
					in:fade={{ duration: 180 }}
					class="font-subheading text-sm transition-colors sm:text-base {ppt.subfase ===
						'ESCOLHA' &&
					ppt.adversarioEnviou &&
					!ppt.minhaEquipeEnviou
						? 'font-semibold text-primary'
						: 'text-text-muted'}"
				>
					{#if ppt.subfase === 'ESCOLHA' && !ppt.souRepresentante && !ppt.minhaEquipeEnviou}
						Aguardando jogada do representante da sua equipe<span class="animated-ellipsis"
							><span>.</span><span>.</span><span>.</span></span
						>
					{:else if ppt.subfase === 'ESCOLHA' && ppt.souRepresentante && !ppt.minhaEquipeEnviou && ppt.adversarioEnviou}
						O oponente realizou um lance<span class="animated-ellipsis"
							><span>.</span><span>.</span><span>.</span></span
						>
					{:else if ppt.subfase === 'ESCOLHA' && ppt.souRepresentante && ppt.minhaEquipeEnviou && !ppt.adversarioEnviou}
						Aguardando lance do oponente<span class="animated-ellipsis"
							><span>.</span><span>.</span><span>.</span></span
						>
					{:else if exibindoJa}
						Revelando escolhas<span class="animated-ellipsis"
							><span>.</span><span>.</span><span>.</span></span
						>
					{:else if ppt.subfase === 'RESULTADO' && ppt.resultado === 'EMPATE'}
						Empate! Nova disputa<span class="animated-ellipsis"
							><span>.</span><span>.</span><span>.</span></span
						>
					{:else}
						{ppt.mensagemStatus}
					{/if}
				</p>
			{/key}
		</div>

		<!-- Botoeira Persistente dos Representantes (Permanece ancorada na Escolha, Contagem e Resultado) -->
		{#if ppt.souRepresentante}
			<div
				class="flex items-center justify-center gap-4 sm:gap-6"
				role="group"
				aria-label="Escolha seu lance: Pedra, Tesoura ou Papel"
			>
				{#each opcoesBotoeira as opcao (opcao.id)}
					{@const selecionado = ppt.meuLance === opcao.id}
					<button
						type="button"
						onclick={() => handleEscolha(opcao.id)}
						disabled={!ppt.podeEscolherLance}
						aria-label={opcao.label}
						aria-pressed={selecionado}
						class="group relative flex h-16 w-24 items-center justify-center rounded-2xl border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-18 sm:w-28 {ppt.podeEscolherLance
							? 'cursor-pointer border-border-subtle bg-bg-surface-soft text-text-primary hover:-translate-y-1 hover:scale-105 hover:border-accent hover:text-accent active:scale-95'
							: selecionado
								? 'scale-108 cursor-default border-accent bg-accent/10 text-accent shadow-xs'
								: 'scale-92 cursor-not-allowed border-border-subtle/50 bg-bg-surface text-text-subtle opacity-25'}"
					>
						<opcao.Icon
							class="h-10 w-10 rotate-90 transition-transform duration-200 sm:h-11 sm:w-11 {selecionado
								? 'scale-110'
								: 'group-hover:scale-110'}"
						/>
					</button>
				{/each}
			</div>
		{/if}
	</footer>
</section>

<style>
	/* Pulso elástico a cada segundo da contagem regressiva (3, 2, 1, Já!) */
	@keyframes pptPop {
		0% {
			transform: scale(1.38);
			opacity: 0.25;
		}
		55% {
			transform: scale(0.95);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* Micro-pulso suave no cronômetro de 20s */
	@keyframes timerTick {
		0% {
			transform: scale(1.12);
		}
		100% {
			transform: scale(1);
		}
	}

	/* Batida física completa de 1 segundo do punho esquerdo (Sobe em arco -> Desce com impacto -> Vibra) */
	@keyframes pptBeatLeft {
		0% {
			transform: translate(0, 0) rotate(0deg) scale(1);
		}
		42% {
			transform: translate(-10px, -26px) rotate(-22deg) scale(1.08);
		}
		76% {
			transform: translate(4px, 6px) rotate(6deg) scale(0.96);
		}
		86% {
			transform: translate(-3px, 0) rotate(-3deg) scale(1.02);
		}
		94% {
			transform: translate(2px, 0) rotate(2deg) scale(1);
		}
		100% {
			transform: translate(0, 0) rotate(0deg) scale(1);
		}
	}

	/* Batida física completa de 1 segundo do punho direito (Espelhado) */
	@keyframes pptBeatRight {
		0% {
			transform: translate(0, 0) rotate(0deg) scale(1);
		}
		42% {
			transform: translate(10px, -26px) rotate(22deg) scale(1.08);
		}
		76% {
			transform: translate(-4px, 6px) rotate(-6deg) scale(0.96);
		}
		86% {
			transform: translate(3px, 0) rotate(3deg) scale(1.02);
		}
		94% {
			transform: translate(-2px, 0) rotate(-2deg) scale(1);
		}
		100% {
			transform: translate(0, 0) rotate(0deg) scale(1);
		}
	}

	/* Impulso de abertura dos gestos no instante do "Já!" */
	@keyframes pptRevealLeft {
		0% {
			transform: translate(-14px, -20px) rotate(-18deg) scale(0.85);
		}
		60% {
			transform: translate(6px, 2px) rotate(5deg) scale(1.12);
		}
		100% {
			transform: translate(0, 0) rotate(0deg) scale(1);
		}
	}

	@keyframes pptRevealRight {
		0% {
			transform: translate(14px, -20px) rotate(18deg) scale(0.85);
		}
		60% {
			transform: translate(-6px, 2px) rotate(-5deg) scale(1.12);
		}
		100% {
			transform: translate(0, 0) rotate(0deg) scale(1);
		}
	}

	.animate-ppt-pop {
		animation: pptPop 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	.animate-timer-tick {
		animation: timerTick 0.2s ease-out forwards;
	}

	.animate-ppt-beat-left {
		animation: pptBeatLeft 0.92s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	.animate-ppt-beat-right {
		animation: pptBeatRight 0.92s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	.animate-ppt-reveal-left {
		animation: pptRevealLeft 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	.animate-ppt-reveal-right {
		animation: pptRevealRight 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	/* Em ambientes com movimento reduzido, atenua a amplitude mas preserva o pulso visual de ritmo */
	@media (prefers-reduced-motion: reduce) {
		.animate-ppt-beat-left,
		.animate-ppt-beat-right,
		.animate-ppt-reveal-left,
		.animate-ppt-reveal-right {
			animation-duration: 0.45s !important;
		}
	}
</style>
