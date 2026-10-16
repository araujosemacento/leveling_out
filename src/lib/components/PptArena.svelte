<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
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
	let animTimer: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		animTimer = setInterval(() => {
			agora = Date.now();
		}, 50);
	});

	onDestroy(() => {
		if (animTimer) clearInterval(animTimer);
	});

	// Cálculo do tempo restante da escolha (segundos)
	let segundosEscolha = $derived.by(() => {
		if (!ppt.prazoIso) return 10;
		const diff = new Date(ppt.prazoIso).getTime() - agora;
		return Math.max(0, Math.ceil(diff / 1000));
	});

	// Cálculo da contagem regressiva sincronizada (3, 2, 1, 0)
	let contagemPasso = $derived.by(() => {
		if (!ppt.revelacaoEmIso) return 3;
		const diff = new Date(ppt.revelacaoEmIso).getTime() - agora;
		if (diff > 2000) return 3;
		if (diff > 1000) return 2;
		if (diff > 0) return 1;
		return 0; // "Já!"
	});

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
</script>

<section
	class="flex min-h-115 w-full flex-col items-center justify-between rounded-3xl border border-border-subtle bg-bg-surface px-6 py-8 text-center shadow-xs transition-colors"
	aria-label="Arena de Disputa de Iniciativa"
>
	<!-- 1. Linha Superior: Cronômetro / Contagem Regressiva -->
	<header class="flex min-h-14 flex-col items-center justify-center">
		{#if ppt.subfase === 'ESCOLHA'}
			<div
				class="flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface-soft px-4 py-1.5 shadow-xs"
			>
				<IconTimer
					class="h-5 w-5 text-primary transition-transform {segundosEscolha <= 3
						? 'animate-pulse text-secondary'
						: ''}"
				/>
				<span
					class="font-display text-xl tracking-wide {segundosEscolha <= 3
						? 'text-secondary'
						: 'text-text-primary'}"
				>
					{segundosEscolha}s
				</span>
			</div>
		{:else if ppt.subfase === 'CONTAGEM'}
			<div class="flex flex-col items-center">
				{#if contagemPasso > 0}
					<span
						class="animate-ppt-pop font-display text-5xl font-black text-accent drop-shadow-sm transition-all sm:text-6xl"
					>
						{contagemPasso}
					</span>
				{:else}
					<span
						class="animate-ppt-pop font-display text-4xl font-black text-primary drop-shadow-sm transition-all sm:text-5xl"
					>
						Já!
					</span>
				{/if}
			</div>
		{:else}
			<!-- Subfase RESULTADO -->
			<div class="flex flex-col items-center gap-1">
				<span class="font-display text-2xl text-accent sm:text-3xl">
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

	<!-- 2. Linha Central: Duelo de Mãos [Você/Sua Equipe] vs [Oponente/Adversário] -->
	<div class="my-6 flex w-full max-w-2xl items-center justify-around gap-4 px-2 sm:gap-8 sm:px-6">
		<!-- Lado Local (Esquerda) -->
		<div class="flex flex-1 flex-col items-center gap-2">
			<div
				class="relative flex h-28 w-28 items-center justify-center transition-transform sm:h-36 sm:w-36 {ppt.subfase ===
				'CONTAGEM'
					? contagemPasso % 2 === 1
						? 'animate-ppt-odd-left'
						: 'animate-ppt-shake'
					: ''}"
			>
				<IconeLocal
					class="h-24 w-24 transition-colors duration-300 sm:h-32 sm:w-32 {ppt.minhaEquipeEnviou
						? 'text-accent'
						: 'text-text-muted'}"
				/>
			</div>

			<div class="flex flex-col items-center">
				<span
					class="font-subheading text-base font-bold sm:text-lg {ppt.minhaEquipeEnviou
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
		</div>

		<!-- Divisor Central -->
		<div class="flex flex-col items-center justify-center">
			<span class="font-display text-2xl text-border-medium sm:text-3xl">x</span>
		</div>

		<!-- Lado Adversário (Direita, Espelhado Horizontalmente) -->
		<div class="flex flex-1 flex-col items-center gap-2">
			<div
				class="relative flex h-28 w-28 items-center justify-center transition-transform sm:h-36 sm:w-36 {ppt.subfase ===
				'CONTAGEM'
					? contagemPasso % 2 === 1
						? 'animate-ppt-odd-right'
						: 'animate-ppt-shake'
					: ''}"
			>
				<IconeAdversario
					class="h-24 w-24 -scale-x-100 transition-colors duration-300 sm:h-32 sm:w-32 {ppt.adversarioEnviou
						? 'text-primary'
						: 'text-text-muted'}"
				/>
			</div>

			<div class="flex flex-col items-center">
				<span
					class="font-subheading text-base font-bold sm:text-lg {ppt.adversarioEnviou
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

	<!-- 3. Linha Inferior: Botoeira dos Representantes ou Mensagem do Espectador -->
	<footer class="flex min-h-22.5 w-full flex-col items-center justify-center gap-3">
		{#if ppt.souRepresentante && ppt.subfase === 'ESCOLHA'}
			<!-- Controles Interativos Sem Caixas: os próprios SVGs atuam como botões limpos -->
			<div
				class="flex items-center justify-center gap-8 sm:gap-12"
				role="group"
				aria-label="Escolha seu lance: Pedra, Papel ou Tesoura"
			>
				<!-- 1. Pedra -->
				<button
					type="button"
					onclick={() => handleEscolha('pedra')}
					disabled={!ppt.podeEscolherLance}
					aria-label="Pedra"
					aria-pressed={ppt.meuLance === 'pedra'}
					class="group relative flex items-center justify-center rounded-full p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent {ppt.podeEscolherLance
						? 'cursor-pointer text-text-primary hover:scale-115 hover:text-accent active:scale-95'
						: ppt.meuLance === 'pedra'
							? 'scale-110 cursor-default text-accent drop-shadow-md'
							: 'cursor-not-allowed text-text-subtle opacity-30'}"
				>
					<IconFist class="h-14 w-14 transition-colors sm:h-16 sm:w-16" />
				</button>

				<!-- 2. Papel -->
				<button
					type="button"
					onclick={() => handleEscolha('papel')}
					disabled={!ppt.podeEscolherLance}
					aria-label="Papel"
					aria-pressed={ppt.meuLance === 'papel'}
					class="group relative flex items-center justify-center rounded-full p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent {ppt.podeEscolherLance
						? 'cursor-pointer text-text-primary hover:scale-115 hover:text-accent active:scale-95'
						: ppt.meuLance === 'papel'
							? 'scale-110 cursor-default text-accent drop-shadow-md'
							: 'cursor-not-allowed text-text-subtle opacity-30'}"
				>
					<IconHand class="h-14 w-14 transition-colors sm:h-16 sm:w-16" />
				</button>

				<!-- 3. Tesoura -->
				<button
					type="button"
					onclick={() => handleEscolha('tesoura')}
					disabled={!ppt.podeEscolherLance}
					aria-label="Tesoura"
					aria-pressed={ppt.meuLance === 'tesoura'}
					class="group relative flex items-center justify-center rounded-full p-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent {ppt.podeEscolherLance
						? 'cursor-pointer text-text-primary hover:scale-115 hover:text-accent active:scale-95'
						: ppt.meuLance === 'tesoura'
							? 'scale-110 cursor-default text-accent drop-shadow-md'
							: 'cursor-not-allowed text-text-subtle opacity-30'}"
				>
					<IconVictory class="h-14 w-14 transition-colors sm:h-16 sm:w-16" />
				</button>
			</div>
		{/if}

		<!-- Mensagem Textual de Orientação e Reticências Animadas -->
		<p class="font-subheading text-sm text-text-muted sm:text-base">
			{#if ppt.subfase === 'ESCOLHA' && !ppt.souRepresentante && !ppt.minhaEquipeEnviou}
				Aguardando jogada do representante da sua equipe<span class="animated-ellipsis"
					><span>.</span><span>.</span><span>.</span></span
				>
			{:else if ppt.subfase === 'ESCOLHA' && ppt.souRepresentante && ppt.minhaEquipeEnviou && ppt.adversarioEnviou}
				O oponente realizou um lance<span class="animated-ellipsis"
					><span>.</span><span>.</span><span>.</span></span
				>
			{:else if ppt.subfase === 'ESCOLHA' && ppt.souRepresentante && ppt.minhaEquipeEnviou && !ppt.adversarioEnviou}
				Aguardando lance do oponente<span class="animated-ellipsis"
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
	</footer>
</section>

<style>
	/* Animações coreografadas para a contagem regressiva (3, 2, 1, 0) */
	@keyframes pptPop {
		0% {
			transform: scale(0.6);
			opacity: 0;
		}
		50% {
			transform: scale(1.15);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes pptOddLeft {
		0% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
		50% {
			transform: translate(-12px, -18px) scale(1.2) rotate(-20deg);
		}
		100% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
	}

	@keyframes pptOddRight {
		0% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
		50% {
			transform: translate(12px, -18px) scale(1.2) rotate(20deg);
		}
		100% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
	}

	@keyframes pptShake {
		0%,
		100% {
			transform: translateX(0);
		}
		20%,
		60% {
			transform: translateX(-6px);
		}
		40%,
		80% {
			transform: translateX(6px);
		}
	}

	.animate-ppt-pop {
		animation: pptPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
	}

	.animate-ppt-odd-left {
		animation: pptOddLeft 0.8s ease-in-out infinite;
	}

	.animate-ppt-odd-right {
		animation: pptOddRight 0.8s ease-in-out infinite;
	}

	.animate-ppt-shake {
		animation: pptShake 0.25s ease-in-out;
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-ppt-pop,
		.animate-ppt-odd-left,
		.animate-ppt-odd-right,
		.animate-ppt-shake {
			animation: none !important;
			transform: none !important;
		}
	}
</style>
