<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { haptics } from '$lib/engine/input/haptics';
	import { sanitizeClue } from '$lib/engine/input/sanitize';

	export type ClueEnvelopeMode = 'envio' | 'espera' | 'chegada' | 'leitura';

	interface Props {
		dica?: string;
		podeDigitar?: boolean;
		modo?: ClueEnvelopeMode;
		titulo?: string;
		subtitulo?: string;
		placeholder?: string;
		disabled?: boolean;
		autoFocus?: boolean;
		onSubmit?: (dica: string) => void;
		onComplete?: () => void;
		onArrived?: () => void;
	}

	let {
		dica = $bindable(''),
		podeDigitar = true,
		modo,
		titulo = 'Forneça sua dica:',
		subtitulo = 'Pista Conceitual',
		placeholder = 'Digite sua dica...',
		disabled = false,
		autoFocus = false,
		onSubmit,
		onComplete,
		onArrived
	}: Props = $props();

	type AnimationPhase =
		| 'idle'
		| 'emerge'
		| 'fold-1'
		| 'fold-2'
		| 'fold-3'
		| 'wobble'
		| 'launch'
		| 'completed'
		| 'arrive-slide'
		| 'arrive-wobble'
		| 'unfold-3'
		| 'unfold-2'
		| 'unfold-1'
		| 'revealed';

	let faseAnimacao = $state<AnimationPhase>('idle');
	let isDustActive = $state(false);
	let isArrivalDustActive = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let timers: ReturnType<typeof setTimeout>[] = [];

	let modoEfetivo = $derived.by<ClueEnvelopeMode>(() => {
		if (modo) return modo;
		if (podeDigitar) return 'envio';
		if (dica && dica.trim().length > 0) return 'leitura';
		return 'espera';
	});

	let dicaLimpa = $derived(sanitizeClue(dica));
	let podeSubmeter = $derived(
		modoEfetivo === 'envio' &&
			podeDigitar &&
			!disabled &&
			faseAnimacao === 'idle' &&
			dicaLimpa.length > 0
	);

	onMount(() => {
		if (autoFocus && inputEl && podeDigitar && modoEfetivo === 'envio') {
			inputEl.focus();
		}
		if (modoEfetivo === 'chegada') {
			dispararChegada();
		}
	});

	$effect(() => {
		if (modo === 'chegada' && faseAnimacao === 'idle') {
			dispararChegada();
		}
	});

	function limparTimers() {
		timers.forEach((t) => clearTimeout(t));
		timers = [];
	}

	function prefersReducedMotion(): boolean {
		return (
			typeof window !== 'undefined' &&
			Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
		);
	}

	onDestroy(() => {
		limparTimers();
	});

	export function dispararEnvio(textoManual?: string) {
		if (faseAnimacao !== 'idle') return;

		if (textoManual !== undefined) {
			dica = textoManual;
		}

		const dicaFinal = sanitizeClue(dica);
		if (!dicaFinal) return;

		// Notifica o callback de submissão imediatamente para despacho ágil de rede
		onSubmit?.(dicaFinal);

		limparTimers();

		if (prefersReducedMotion()) {
			timers.push(
				setTimeout(() => {
					faseAnimacao = 'completed';
					onComplete?.();
				}, 50)
			);
			return;
		}

		// T = 10ms: As 4 abas emergem de trás do card (100ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'emerge';
			}, 10)
		);

		// T = 110ms: Dobra 1 (Abas laterais fecham em 100ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'fold-1';
			}, 110)
		);

		// T = 210ms: Dobra 2 (Flap inferior trapezoidal sobe até 3/5 em 100ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'fold-2';
			}, 210)
		);

		// T = 310ms: Dobra 3 (Aba superior com língua tangente sela em 100ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'fold-3';
				haptics.tap();
			}, 310)
		);

		// T = 410ms: Envelope fechado em 90° retos. Inicia Bubble Wobble elástico (180ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'wobble';
			}, 410)
		);

		// T = 590ms: Inicia Antecipação Expressiva contínua (-80px / +5° Esq em exatos 300ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'launch';
			}, 590)
		);

		// T = 890ms: Ápice da antecipação (50% de 600ms). Dispara o Skid Dust enquanto o envelope sai à direita!
		timers.push(
			setTimeout(() => {
				isDustActive = true;
			}, 890)
		);

		// T = 1190ms: O envelope conclui a saída além da tela (590ms + 600ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'completed';
				onComplete?.();
			}, 1190)
		);

		// T = 1370ms: Limpeza do rastro do skid dust (890ms + 480ms)
		timers.push(
			setTimeout(() => {
				isDustActive = false;
			}, 1370)
		);
	}

	export function dispararChegada(textoManual?: string) {
		if (faseAnimacao !== 'idle' && faseAnimacao !== 'completed') return;

		if (textoManual !== undefined) {
			dica = textoManual;
		}

		limparTimers();

		if (prefersReducedMotion()) {
			faseAnimacao = 'revealed';
			timers.push(
				setTimeout(() => {
					faseAnimacao = 'completed';
					onArrived?.();
				}, 50)
			);
			return;
		}

		// T = 0ms: Voo veloz de entrada da esquerda até o centro em 300ms
		faseAnimacao = 'arrive-slide';

		// T = 300ms: Pouso no centro, aciona rastro de frenagem e bubble wobble elástico (180ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'arrive-wobble';
				isArrivalDustActive = true;
				haptics.tap();
			}, 300)
		);

		// T = 480ms: Fim do amortecimento. Desdobra Flap Superior (100ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'unfold-3';
				isArrivalDustActive = false;
			}, 480)
		);

		// T = 580ms: Desdobra Flap Inferior (100ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'unfold-2';
			}, 580)
		);

		// T = 680ms: Desdobra Abas Laterais (100ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'unfold-1';
			}, 680)
		);

		// T = 780ms: Cartão interno com a pista transmitida revelado em foco nítido (100ms)
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'revealed';
			}, 780)
		);

		// T = 880ms: Conclui animação e notifica consumidor
		timers.push(
			setTimeout(() => {
				faseAnimacao = 'completed';
				onArrived?.();
			}, 880)
		);
	}

	export function resetar() {
		limparTimers();
		faseAnimacao = 'idle';
		isDustActive = false;
		isArrivalDustActive = false;
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (podeSubmeter) {
			dispararEnvio();
		}
	}

	// Classes reativas de estados de abas e envelope
	let isEmergeActive = $derived(faseAnimacao !== 'idle' && faseAnimacao !== 'completed');
	let isFold1 = $derived(
		faseAnimacao === 'fold-1' ||
			faseAnimacao === 'fold-2' ||
			faseAnimacao === 'fold-3' ||
			faseAnimacao === 'wobble' ||
			faseAnimacao === 'launch' ||
			(faseAnimacao === 'completed' && modoEfetivo === 'envio') ||
			faseAnimacao === 'arrive-slide' ||
			faseAnimacao === 'arrive-wobble' ||
			faseAnimacao === 'unfold-3' ||
			faseAnimacao === 'unfold-2' ||
			modoEfetivo === 'espera'
	);
	let isFold2 = $derived(
		faseAnimacao === 'fold-2' ||
			faseAnimacao === 'fold-3' ||
			faseAnimacao === 'wobble' ||
			faseAnimacao === 'launch' ||
			(faseAnimacao === 'completed' && modoEfetivo === 'envio') ||
			faseAnimacao === 'arrive-slide' ||
			faseAnimacao === 'arrive-wobble' ||
			faseAnimacao === 'unfold-3' ||
			modoEfetivo === 'espera'
	);
	let isFold3 = $derived(
		faseAnimacao === 'fold-3' ||
			faseAnimacao === 'wobble' ||
			faseAnimacao === 'launch' ||
			(faseAnimacao === 'completed' && modoEfetivo === 'envio') ||
			faseAnimacao === 'arrive-slide' ||
			faseAnimacao === 'arrive-wobble' ||
			modoEfetivo === 'espera'
	);
	let isWobbling = $derived(faseAnimacao === 'wobble' || faseAnimacao === 'arrive-wobble');
	let isShootingOut = $derived(faseAnimacao === 'launch');
	let isShootingIn = $derived(faseAnimacao === 'arrive-slide');
	let isCompletedOut = $derived(faseAnimacao === 'completed' && modoEfetivo === 'envio');
	let isModeLeitura = $derived(
		modoEfetivo === 'leitura' ||
			faseAnimacao === 'revealed' ||
			(faseAnimacao === 'completed' && modoEfetivo === 'chegada')
	);
</script>

<!-- BAÍA DE TRANSMISSÃO E POUSO DO ENVELOPE -->
<div class="envelope-launch-bay">
	<!-- RASTRO DE POEIRA / SAÍDA (SKID DUST WAKE DIREITA) -->
	<div
		class="skid-dust-layer skid-dust-outbound {isDustActive ? 'active animating' : ''}"
		aria-hidden="true"
	>
		<svg viewBox="0 0 230 230" width="230" height="230" class="skid-svg">
			<path
				class="skid-path trail-top"
				pathLength="100"
				d="M 244,42 C 195,34 142,22 100,40 C 72,52 60,78 80,90 C 98,98 116,82 106,64 C 96,48 65,42 25,52"
				stroke="var(--dust-solid)"
				stroke-width="2.6"
			/>
			<path
				class="skid-path trail-mid"
				pathLength="100"
				d="M 244,115 C 190,110 138,125 90,115 C 60,108 35,112 10,118"
				stroke="var(--dust-solid)"
				stroke-width="2.5"
			/>
			<path
				class="skid-path trail-bot"
				pathLength="100"
				d="M 244,188 C 195,196 142,208 100,190 C 72,178 60,152 80,140 C 98,132 116,148 106,166 C 96,182 65,188 25,178"
				stroke="var(--dust-solid)"
				stroke-width="2.6"
			/>
		</svg>
	</div>

	<!-- RASTRO DE POEIRA / CHEGADA (SKID DUST WAKE ESQUERDA) -->
	<div
		class="skid-dust-layer skid-dust-inbound {isArrivalDustActive ? 'active animating' : ''}"
		aria-hidden="true"
	>
		<svg viewBox="0 0 230 230" width="230" height="230" class="skid-svg">
			<path
				class="skid-path trail-top"
				pathLength="100"
				d="M 244,42 C 195,34 142,22 100,40 C 72,52 60,78 80,90 C 98,98 116,82 106,64 C 96,48 65,42 25,52"
				stroke="var(--dust-solid)"
				stroke-width="2.6"
			/>
			<path
				class="skid-path trail-mid"
				pathLength="100"
				d="M 244,115 C 190,110 138,125 90,115 C 60,108 35,112 10,118"
				stroke="var(--dust-solid)"
				stroke-width="2.5"
			/>
			<path
				class="skid-path trail-bot"
				pathLength="100"
				d="M 244,188 C 195,196 142,208 100,190 C 72,178 60,152 80,140 C 98,132 116,148 106,166 C 96,182 65,188 25,178"
				stroke="var(--dust-solid)"
				stroke-width="2.6"
			/>
		</svg>
	</div>

	<!-- ÂNCORA DO ENVELOPE (380px x 230px, Cantos Retos 90° em conformidade com o Mandamento 5) -->
	<div
		class="card-envelope-anchor {isEmergeActive || modoEfetivo === 'espera'
			? 'step-emerge'
			: ''} {isFold1 ? 'state-folding step-fold-1' : ''} {isFold2 ? 'step-fold-2' : ''} {isFold3
			? 'step-fold-3 state-sealed'
			: ''} {isWobbling ? 'step-wobble' : ''} {isShootingOut
			? 'step-shoot-right'
			: ''} {isShootingIn ? 'step-shoot-in' : ''} {isCompletedOut
			? 'state-completed'
			: ''} {modoEfetivo === 'espera' ? 'modo-espera' : ''} {isModeLeitura ? 'modo-leitura' : ''}"
	>
		<!-- 1. BASE FÍSICA / CARD DA DICA -->
		<section class="clue-card" aria-label="Cartão da Dica da Rodada">
			{#if modoEfetivo === 'envio'}
				<!-- Formulário do Codificador -->
				<form class="clue-card-inner" onsubmit={handleFormSubmit}>
					<h2 class="clue-title-tag">{titulo}</h2>

					<div class="clue-input-box">
						<label for="clue-input-field" class="clue-input-label">{subtitulo}</label>
						<input
							bind:this={inputEl}
							id="clue-input-field"
							type="text"
							class="clue-input-text"
							bind:value={dica}
							{placeholder}
							readonly={!podeDigitar || faseAnimacao !== 'idle'}
							disabled={disabled || faseAnimacao !== 'idle'}
							maxlength={60}
							autocomplete="off"
							spellcheck="false"
						/>
					</div>

					{#if podeDigitar}
						<button
							type="submit"
							class="btn-send-soft"
							disabled={!podeSubmeter}
							aria-label="Enviar dica e lacrar envelope"
						>
							<span>Enviar Dica</span>
							<svg
								width="15"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<line x1="22" y1="2" x2="11" y2="13"></line>
								<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
							</svg>
						</button>
					{/if}
				</form>
			{:else if modoEfetivo === 'espera'}
				<!-- Estado de Espera do Destinatário (Lacrado) -->
				<div class="clue-waiting-box" role="status" aria-live="polite">
					<div class="clue-stamp-seal" aria-hidden="true">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect width="20" height="16" x="2" y="4" rx="0"></rect>
							<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
						</svg>
					</div>
					<h3 class="clue-waiting-heading">Aguardando Dica</h3>
					<p class="clue-waiting-subtext">
						O Codificador está analisando a carta e formulando a dica<span class="animated-ellipsis"
							><span>.</span><span>.</span><span>.</span></span
						>
					</p>
				</div>
			{:else}
				<!-- Estado de Leitura / Revelação (Dica Transmitida) -->
				<div class="clue-reading-card" role="region" aria-label="Dica transmitida pela equipe">
					<div class="clue-reading-header">
						<span class="clue-reading-tag">{subtitulo}</span>
						<span class="clue-reading-badge">Dica Transmitida</span>
					</div>
					<div class="clue-reading-body">
						<p class="clue-reading-text">"{dicaLimpa}"</p>
					</div>
					<div class="clue-reading-footer">
						<span>Calibre o marcador analógico de acordo com os polos</span>
					</div>
				</div>
			{/if}
		</section>

		<!-- 2. ABA ESQUERDA (Dobra 1: Triângulo Limpo 135px x 230px) -->
		<div class="flap flap-left" aria-hidden="true">
			<svg viewBox="0 0 135 230" preserveAspectRatio="none">
				<path
					d="M 135,0 L 10,108 Q 0,115 10,122 L 135,230 Z"
					fill="var(--env-side)"
					stroke="var(--env-stroke)"
					stroke-width="2"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- 3. ABA DIREITA (Dobra 1: Triângulo Limpo 135px x 230px) -->
		<div class="flap flap-right" aria-hidden="true">
			<svg viewBox="0 0 135 230" preserveAspectRatio="none">
				<path
					d="M 0,0 L 125,108 Q 135,115 125,122 L 0,230 Z"
					fill="var(--env-side)"
					stroke="var(--env-stroke)"
					stroke-width="2"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- 4. ABA INFERIOR (Dobra 2: Trapézio 380px x 138px [3/5 da altura]) -->
		<div class="flap flap-bottom" aria-hidden="true">
			<svg viewBox="0 0 380 138" preserveAspectRatio="none">
				<path
					d="M 0,0 L 95,124 Q 105,138 120,138 L 260,138 Q 275,138 285,124 L 380,0 Z"
					fill="var(--env-bottom)"
					stroke="var(--env-stroke)"
					stroke-width="2"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- 5. ABA SUPERIOR (Dobra 3: 380px x 172.5px com arco R=40 tangente contínuo) -->
		<div class="flap flap-top" aria-hidden="true">
			<svg viewBox="0 0 380 172.5" preserveAspectRatio="none">
				<path
					d="M 0,172.5 L 161.8,11.63 A 40 40 0 0 1 218.2,11.63 L 380,172.5 Z"
					fill="var(--env-top)"
					stroke="var(--env-stroke)"
					stroke-width="2"
					stroke-linejoin="round"
				/>
			</svg>
		</div>
	</div>
</div>

<style>
	/* =========================================================================
     PALETA CANÔNICA DO ENVELOPE (Papel Kraft Físico Homogêneo em Ambos os Modos)
     ========================================================================= */
	:global(:root) {
		--env-body: #d2b48c;
		--env-side: #c9ab83;
		--env-bottom: #c0a27a;
		--env-top: #b89a72;
		--env-stroke: #8d6b42;
		--env-shadow: rgba(0, 0, 0, 0.18);
		--dust-solid: #26737c;
	}

	.envelope-launch-bay {
		position: relative;
		width: 380px;
		height: 230px;
		display: flex;
		align-items: center;
		justify-content: center;
		user-select: none;
	}

	/* =========================================================================
     RASTRO DE POEIRA / VENTO (SKID DUST WAKE)
     ========================================================================= */
	.skid-dust-layer {
		position: absolute;
		top: 0;
		width: 230px;
		height: 230px;
		pointer-events: none;
		overflow: visible;
		z-index: 2;
		opacity: 0;
		visibility: hidden;
	}

	.skid-dust-outbound {
		right: 100%;
	}

	.skid-dust-inbound {
		left: 100%;
		transform: scaleX(-1);
	}

	.skid-svg {
		width: 230px;
		height: 230px;
		display: block;
		overflow: visible;
	}

	.skid-dust-layer.active {
		opacity: 1;
		visibility: visible;
	}

	.skid-path {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 100 200;
		stroke-dashoffset: 104;
	}

	.skid-dust-layer.animating .trail-top {
		animation: fillAndEmptyTrail 0.46s cubic-bezier(0.35, 0, 0.25, 1) forwards;
	}
	.skid-dust-layer.animating .trail-mid {
		animation: fillAndEmptyTrail 0.42s 0.02s cubic-bezier(0.35, 0, 0.25, 1) forwards;
	}
	.skid-dust-layer.animating .trail-bot {
		animation: fillAndEmptyTrail 0.48s 0.01s cubic-bezier(0.35, 0, 0.25, 1) forwards;
	}

	@keyframes fillAndEmptyTrail {
		0% {
			stroke-dashoffset: 104;
		}
		46% {
			stroke-dashoffset: 0;
		}
		54% {
			stroke-dashoffset: 0;
		}
		100% {
			stroke-dashoffset: -104;
		}
	}

	/* =========================================================================
     ÂNCOPA DO ENVELOPE (380px x 230px, Cantos Retos 90°)
     ========================================================================= */
	.card-envelope-anchor {
		width: 380px;
		height: 230px;
		position: relative;
		border-radius: 0;
		transform-style: preserve-3d;
		will-change: transform, box-shadow;
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
		transform: scale(1) skewX(0deg);
		transition: box-shadow 0.24s ease;
		z-index: 10;
	}

	/* CARD DA DICA */
	.clue-card {
		position: absolute;
		inset: 0;
		background: var(--bg-surface);
		border: 2px solid var(--border-medium);
		border-radius: 0;
		padding: 1.4rem 1.65rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		z-index: 5;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	.state-folding .clue-card {
		border-color: var(--env-stroke);
	}

	.state-sealed .clue-card {
		background-color: var(--env-body);
		border-color: var(--env-stroke);
	}

	.modo-leitura .clue-card {
		background: var(--bg-surface);
		border-color: var(--border-medium);
	}

	.clue-card-inner {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
		transition: opacity 0.1s ease;
	}

	.state-sealed .clue-card-inner {
		opacity: 0;
		pointer-events: none;
	}

	.clue-title-tag {
		font-family: var(--font-subheading);
		font-size: 1.25rem;
		color: var(--text-primary);
		margin: 0;
	}

	.clue-input-box {
		background: var(--bg-base);
		border: 2px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.7rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.clue-input-label {
		font-size: 0.68rem;
		text-transform: uppercase;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		font-family: var(--font-util-heading);
	}

	.clue-input-text {
		font-family: var(--font-util-body);
		font-size: 1.12rem;
		font-weight: 700;
		color: var(--accent);
		background: transparent;
		border: none;
		outline: none;
		width: 100%;
	}

	/* BOTÃO SOFT UI ELEVADO */
	.btn-send-soft {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		align-self: flex-end;
		background-color: var(--bg-base);
		color: var(--accent);
		border: 0;
		outline: none;
		border-radius: 9999px;
		padding: 0.6rem 1.35rem;
		font-size: 0.84rem;
		font-weight: 700;
		font-family: var(--font-util-heading);
		cursor: pointer;
		box-shadow:
			4px -4px 12px var(--shadow-neumorph-light),
			-4px 4px 12px var(--shadow-neumorph-dark);
		transition: all 0.2s ease-in-out;
	}

	.btn-send-soft:hover:not(:disabled) {
		box-shadow:
			2px -2px 6px var(--shadow-neumorph-light),
			-2px 2px 6px var(--shadow-neumorph-dark);
	}

	.btn-send-soft:active:not(:disabled) {
		box-shadow:
			inset 1px 1px 2px var(--shadow-neumorph-dark),
			inset -1px -1px 2px var(--shadow-neumorph-light);
	}

	.btn-send-soft:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* ESTADO DE ESPERA (REMETENTE OU DESTINATÁRIO) */
	.clue-waiting-box {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.5rem;
		text-align: center;
		z-index: 35;
	}

	.clue-stamp-seal {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 9999px;
		background: var(--bg-base);
		color: var(--env-stroke);
		border: 2px solid var(--env-stroke);
		box-shadow: 0 2px 8px var(--env-shadow);
	}

	.clue-waiting-heading {
		font-family: var(--font-subheading);
		font-size: 1.15rem;
		color: var(--text-primary);
		margin: 0;
	}

	.clue-waiting-subtext {
		font-family: var(--font-util-heading);
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-muted);
		max-width: 280px;
		line-height: 1.35;
		margin: 0;
	}

	/* ESTADO DE LEITURA (DICA REVELADA) */
	.clue-reading-card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
		z-index: 35;
	}

	.clue-reading-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border-subtle);
		padding-bottom: 0.5rem;
	}

	.clue-reading-tag {
		font-family: var(--font-util-heading);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}

	.clue-reading-badge {
		font-family: var(--font-code);
		font-size: 0.68rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-surface-elevated);
		color: var(--accent);
	}

	.clue-reading-body {
		margin: auto 0;
		padding: 0.75rem 0;
		text-align: center;
	}

	.clue-reading-text {
		font-family: var(--font-display);
		font-size: 1.35rem;
		line-height: 1.3;
		color: var(--text-primary);
		word-break: break-word;
		margin: 0;
	}

	.clue-reading-footer {
		text-align: center;
		font-family: var(--font-util-heading);
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}

	/* =========================================================================
     AS 4 ABAS COM DOBRA ÁGIL EM 100ms
     ========================================================================= */
	.flap {
		position: absolute;
		pointer-events: none;
		transform-style: preserve-3d;
		will-change: transform, opacity;
		z-index: 1;
		opacity: 0;
		visibility: hidden;
		transition:
			transform 0.1s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.06s ease;
	}

	.flap svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.flap-left {
		top: 0;
		left: -135px;
		width: 135px;
		height: 230px;
		transform-origin: right center;
		transform: translate3d(160px, 0, 0) scale(0.85) rotateY(0deg);
	}

	.flap-right {
		top: 0;
		right: -135px;
		width: 135px;
		height: 230px;
		transform-origin: left center;
		transform: translate3d(-160px, 0, 0) scale(0.85) rotateY(0deg);
	}

	.flap-bottom {
		bottom: -138px;
		left: 0;
		width: 380px;
		height: 138px;
		transform-origin: top center;
		transform: translate3d(0, -140px, 0) scale(0.85) rotateX(0deg);
	}

	.flap-top {
		top: -172.5px;
		left: 0;
		width: 380px;
		height: 172.5px;
		transform-origin: bottom center;
		transform: translate3d(0, 175px, 0) scale(0.85) rotateX(0deg);
	}

	/* ETAPAS DA ANIMAÇÃO DE DOBRA E DESDOBRA */
	.step-emerge .flap {
		opacity: 1;
		visibility: visible;
	}

	.step-emerge .flap-left {
		transform: translate3d(0, 0, 0) scale(1) rotateY(0deg);
	}
	.step-emerge .flap-right {
		transform: translate3d(0, 0, 0) scale(1) rotateY(0deg);
	}
	.step-emerge .flap-bottom {
		transform: translate3d(0, 0, 0) scale(1) rotateX(0deg);
	}
	.step-emerge .flap-top {
		transform: translate3d(0, 0, 0) scale(1) rotateX(0deg);
	}

	.step-fold-1 .flap-left {
		z-index: 10;
		transform: translate3d(0, 0, 2px) scale(1) rotateY(180deg);
	}
	.step-fold-1 .flap-right {
		z-index: 11;
		transform: translate3d(0, 0, 3px) scale(1) rotateY(-180deg);
	}

	.step-fold-2 .flap-bottom {
		z-index: 20;
		transform: translate3d(0, 0, 5px) scale(1) rotateX(180deg);
	}

	.step-fold-3 .flap-top {
		z-index: 30;
		transform: translate3d(0, 0, 8px) scale(1) rotateX(-180deg);
	}

	/* BUBBLE WOBBLE (180ms) */
	.step-wobble {
		animation: subtleBubbleWobble 0.18s cubic-bezier(0.2, 0.8, 0.35, 1) forwards;
	}

	@keyframes subtleBubbleWobble {
		0% {
			transform: scale(1) skewX(0deg);
			box-shadow: 0 10px 28px rgba(0, 0, 0, 0.1);
		}
		32% {
			transform: scale(1.04) skewX(0deg);
			box-shadow: 0 14px 32px var(--env-shadow);
		}
		60% {
			transform: scale(0.992) skewX(0deg);
			box-shadow: 0 9px 22px var(--env-shadow);
		}
		84% {
			transform: scale(1.022) skewX(0deg);
			box-shadow: 0 14px 34px var(--env-shadow);
		}
		100% {
			transform: scale(1.018) skewX(0deg);
			box-shadow: 0 13px 30px var(--env-shadow);
		}
	}

	/* SAÍDA VELOZ (ANTECIPAÇÃO 300ms + DISPARO 300ms = 600ms TOTAL) */
	.step-shoot-right {
		transform-origin: bottom center;
		animation: anticipateAndShoot 0.6s forwards;
	}

	@keyframes anticipateAndShoot {
		0% {
			transform: translate3d(0px, 0, 0) scale(1.018) skewX(0deg);
			animation-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
		}
		50% {
			transform: translate3d(-80px, 0, 0) scale(1.018) skewX(5deg);
			animation-timing-function: cubic-bezier(0.55, 0, 0.8, 0.2);
		}
		68% {
			transform: translate3d(30px, 0, 0) scale(1.018) skewX(-5deg);
			animation-timing-function: cubic-bezier(0.35, 0, 0.85, 0.35);
		}
		100% {
			transform: translate3d(120vw, 0, 0) scale(1.018) skewX(-5deg);
		}
	}

	/* CHEGADA VELOZ (VOO DE ENTRADA DA ESQUERDA EM 300ms) */
	.step-shoot-in {
		transform-origin: bottom center;
		animation: shootInFromLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes shootInFromLeft {
		0% {
			transform: translate3d(-120vw, 0, 0) scale(1.018) skewX(-5deg);
		}
		75% {
			transform: translate3d(18px, 0, 0) scale(1.018) skewX(3deg);
		}
		100% {
			transform: translate3d(0px, 0, 0) scale(1.018) skewX(0deg);
		}
	}

	.state-completed {
		transform: translate3d(120vw, 0, 0) scale(1.018) skewX(-5deg);
		visibility: hidden;
		pointer-events: none;
	}

	.modo-leitura .flap {
		display: none;
	}

	.modo-espera {
		animation: envelopeIdleFloat 2.8s ease-in-out infinite;
	}

	@keyframes envelopeIdleFloat {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.step-shoot-right,
		.step-shoot-in,
		.step-wobble,
		.modo-espera {
			animation: none !important;
			transform: none !important;
		}
		.flap {
			transition: none !important;
		}
		.skid-dust-layer {
			display: none !important;
		}
	}
</style>
