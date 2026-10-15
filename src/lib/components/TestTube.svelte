<!--
  TestTube.svelte: Componente SVG procedural do Tubo de Ensaio / Proveta Graduada
  Fiel ao design canônico: bico dosador no topo, graduação à direita e menisco senoidal
  em duas camadas (foreground da cor do líquido e background escuro para profundidade).
  Implementado com Svelte 5 Runes ($props, $derived).
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		level?: number;
		team?: 'pato' | 'ganso' | 'neutral';
		customColor?: string;
		customDarkColor?: string;
		showScale?: boolean;
		animated?: boolean;
		duration?: number;
		interactiveShake?: boolean;
		cycleHue?: boolean;
		class?: string;
	}

	let {
		level = 50,
		team = 'pato',
		customColor,
		customDarkColor,
		showScale = true,
		animated = true,
		duration = 5,
		interactiveShake = false,
		cycleHue = false,
		class: className = 'w-44 h-auto'
	}: Props = $props();

	// Limites geométricos da coluna útil de líquido no viewBox (0 a 380)
	const Y_BASE = 320; // 0%
	const Y_TOPO = 70; // 100%

	// Cálculo da posição vertical do menisco a partir do nível percentual
	let clampedLevel = $derived(Math.max(0, Math.min(100, level)));
	let currentY = $derived(Y_BASE - (clampedLevel / 100) * (Y_BASE - Y_TOPO));

	// Período senoidal exato das ondas (comprimento de onda lambda no viewBox)
	const WAVE_LENGTH = 80;

	let isPressed = $state(false);
	let wavePhase = $state(0); // Offset angular contínuo da onda no ciclo [0, WAVE_LENGTH)

	// Cores semânticas das equipes ou rotação contínua de matiz (Hue) no mesmo ciclo temporal da onda
	let currentHue = $derived((245 + (wavePhase / WAVE_LENGTH) * 360) % 360);

	let liquidColor = $derived(
		cycleHue
			? `hsl(${currentHue.toFixed(1)}, 80%, 55%)`
			: (customColor ?? (team === 'ganso' ? '#f59e0b' : team === 'neutral' ? '#0ea5e9' : '#4f46e5'))
	);

	let liquidDarkColor = $derived(
		cycleHue
			? `hsl(${currentHue.toFixed(1)}, 80%, 30%)`
			: (customDarkColor ??
					(team === 'ganso' ? '#78350f' : team === 'neutral' ? '#0369a1' : '#272269'))
	);

	// Gera o contorno superior contínuo da onda senoidal de startCycle até endCycle
	// Cada ciclo de 80px possui uma crista (semi-círculo convexo) e um vale (semi-círculo côncavo)
	function generateWaveTop(y: number, startCycle: number, endCycle: number): string {
		let path = `M ${startCycle * WAVE_LENGTH},${y}`;
		for (let i = startCycle; i < endCycle; i++) {
			const x0 = i * WAVE_LENGTH;
			// Meio ciclo (40px): crista convexa para cima (semi-círculo senoidal)
			path += ` C ${x0 + 13},${y - 19} ${x0 + 27},${y - 19} ${x0 + 40},${y}`;
			// Meio ciclo (40px): vale côncavo para baixo
			path += ` C ${x0 + 53},${y + 19} ${x0 + 67},${y + 19} ${x0 + 80},${y}`;
		}
		return path;
	}

	// Gera os arcos de reflexo especular na crista de cada ciclo
	function generateWaveHighlights(y: number, startCycle: number, endCycle: number): string {
		let path = '';
		for (let i = startCycle; i < endCycle; i++) {
			const x0 = i * WAVE_LENGTH;
			path += ` M ${x0 + 8},${y - 5} C ${x0 + 15},${y - 17} ${x0 + 25},${y - 17} ${x0 + 32},${y - 5}`;
		}
		return path;
	}

	// Caminho SVG do elemento de background: 4 ciclos (-1 até 3 = x de -80 a 240)
	let bgWavePath = $derived(`${generateWaveTop(currentY, -1, 3)} L 240,380 L -80,380 Z`);

	// Linha de contorno superior da crista traseira de background
	let bgCrestPath = $derived(generateWaveTop(currentY, -1, 3));

	// Caminho SVG do elemento de foreground: 4 ciclos (-1 até 3 = x de -80 a 240)
	let fgWavePath = $derived(`${generateWaveTop(currentY, -1, 3)} L 240,380 L -80,380 Z`);

	// Linha de contorno superior da onda de foreground
	let fgCrestPath = $derived(generateWaveTop(currentY, -1, 3));

	// Linhas de brilho especular nas cristas de foreground
	let fgHighlightPath = $derived(generateWaveHighlights(currentY, -1, 3));

	// --- INTEGRAÇÃO CONTÍNUA DE FASE E FÍSICA ADITIVA DO EASTER EGG ---
	const MIN_DURATION = 0.25; // Duração mínima segura (tensão máxima / agitação máxima)

	let shakeEnergy = 0; // Energia cinética acumulada [0, 1]
	let lastPointerX = 0;
	let lastPointerY = 0;
	let lastFrameTime = 0;
	let animFrameId: number | null = null;

	function tick(now: number) {
		if (!lastFrameTime) lastFrameTime = now;
		const dt = Math.min(0.1, (now - lastFrameTime) / 1000); // Segundos decorridos protegidos contra tab inativa
		lastFrameTime = now;

		if (interactiveShake) {
			// Decaimento exponencial contínuo da agitação (viscosidade/amortecimento)
			// Dissipa a energia suavemente em cerca de 1 a 1.5s sem resets abruptos
			shakeEnergy *= Math.pow(0.95, dt * 60);
			if (shakeEnergy < 0.0005) shakeEnergy = 0;
		} else {
			shakeEnergy = 0;
		}

		// A duração efetiva interpola suavemente da duração base até MIN_DURATION (0.25s)
		const effectiveDuration = Math.max(
			MIN_DURATION,
			duration - shakeEnergy * (duration - MIN_DURATION)
		);

		// Velocidade linear da onda em pixels por segundo
		const speed = WAVE_LENGTH / effectiveDuration;

		// Integração contínua da fase: avança continuamente sem saltos de fase nem flickering
		if (animated) {
			wavePhase = (wavePhase + speed * dt) % WAVE_LENGTH;
		}

		animFrameId = requestAnimationFrame(tick);
	}

	onMount(() => {
		lastFrameTime = performance.now();
		animFrameId = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		if (animFrameId !== null) {
			cancelAnimationFrame(animFrameId);
		}
	});

	function handlePointerDown(e: PointerEvent) {
		if (!interactiveShake) return;
		isPressed = true;
		try {
			(e.currentTarget as Element)?.setPointerCapture?.(e.pointerId);
		} catch {
			// Suporte defensivo para ambientes que não implementam Pointer Capture
		}
		lastPointerX = e.clientX;
		lastPointerY = e.clientY;
	}

	function handlePointerMove(e: PointerEvent) {
		if (!interactiveShake || !isPressed) return;
		const dx = e.clientX - lastPointerX;
		const dy = e.clientY - lastPointerY;
		const dist = Math.hypot(dx, dy);

		// Comportamento ADITIVO: cada movimento do mouse adiciona impulso de energia ao fluido,
		// acumulando velocidade proporcionalmente à agitação contínua
		const impulse = dist / 240;
		shakeEnergy = Math.min(1.0, shakeEnergy + impulse);

		lastPointerX = e.clientX;
		lastPointerY = e.clientY;
	}

	function handlePointerUp(e: PointerEvent) {
		if (!interactiveShake) return;
		isPressed = false;
		try {
			(e.currentTarget as Element)?.releasePointerCapture?.(e.pointerId);
		} catch {
			// Suporte defensivo
		}
	}

	function handlePointerCancel(e: PointerEvent) {
		handlePointerUp(e);
	}
</script>

<svg
	viewBox="0 0 140 380"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="{className} {interactiveShake
		? isPressed
			? 'cursor-grabbing touch-none select-none'
			: 'cursor-grab touch-none select-none'
		: ''}"
	role="img"
	aria-label="Tubo de ensaio com nível em {clampedLevel} por cento"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
>
	<defs>
		<!-- Máscara do interior do tubo para recorte perfeito do líquido e da base arredondada em U -->
		<clipPath id="tubeInteriorClip-{team}">
			<path
				d="
					M 34,42 
					L 114,42 
					L 114,320 
					C 114,355 98,366 74,366 
					C 50,366 34,355 34,320 
					Z
				"
			/>
		</clipPath>

		<!-- Padrão hachurado sutil para evidenciar a área de background do menisco -->
		<pattern
			id="diagonalHatch-{team}"
			width="6"
			height="6"
			patternTransform="rotate(45 0 0)"
			patternUnits="userSpaceOnUse"
		>
			<line x1="0" y1="0" x2="0" y2="6" stroke={liquidDarkColor} stroke-width="1.8" />
		</pattern>

		<!-- Gradiente de reflexo da parede externa de vidro -->
		<linearGradient id="glassGlazeReflect" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
			<stop offset="25%" stop-color="#ffffff" stop-opacity="0.05" />
			<stop offset="75%" stop-color="#ffffff" stop-opacity="0" />
			<stop offset="100%" stop-color="#ffffff" stop-opacity="0.25" />
		</linearGradient>
	</defs>

	<!-- 1. Fundo de vidro translúcido -->
	<path
		d="
			M 34,42 
			L 114,42 
			L 114,320 
			C 114,355 98,366 74,366 
			C 50,366 34,355 34,320 
			Z
		"
		fill="currentColor"
		fill-opacity="0.03"
	/>

	<!-- 2. LÍQUIDO RECORTADO NO INTERIOR DO TUBO -->
	<g clip-path="url(#tubeInteriorClip-{team})">
		<!-- ELEMENTO DE BACKGROUND DO LÍQUIDO (Mais escuro / onda posterior animada em sentido oposto) -->
		<g
			class="meniscus-bg-group"
			style="transform: translateX({animated ? (40 - wavePhase).toFixed(2) : '0'}px);"
		>
			<path d={bgWavePath} fill={liquidDarkColor} />

			<!-- Hachuras de profundidade no elemento escuro (conforme rascunho) -->
			<path d={bgWavePath} fill="url(#diagonalHatch-{team})" opacity="0.6" />

			<!-- Traço de contorno da crista traseira -->
			<path d={bgCrestPath} fill="none" stroke={liquidDarkColor} stroke-width="1.8" />
		</g>

		<!-- ELEMENTO DE FOREGROUND DO LÍQUIDO (Animado em translação horizontal contínua) -->
		<g
			class="meniscus-fg-group"
			style="transform: translateX({animated ? (-80 + wavePhase).toFixed(2) : '0'}px);"
		>
			<path d={fgWavePath} fill={liquidColor} />

			<!-- Traço de contorno da crista frontal do menisco -->
			<path d={fgCrestPath} fill="none" stroke="currentColor" stroke-width="2" />

			<!-- Linha de reflexo especular na crista frontal -->
			<path
				d={fgHighlightPath}
				fill="none"
				stroke="#ffffff"
				stroke-opacity="0.5"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</g>
	</g>

	<!-- 3. ESCALA GRADUADA NA PAREDE DIREITA (1 a 10) -->
	{#if showScale}
		<g stroke="currentColor" stroke-linecap="round">
			{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as n (n)}
				{@const yPos = Y_BASE - (n / 10) * (Y_BASE - Y_TOPO)}
				<!-- Traço principal da unidade -->
				<line
					x1={n === 10 || n === 5 ? 94 : 97}
					y1={yPos}
					x2="114"
					y2={yPos}
					stroke-width={n === 10 || n === 5 ? 2.2 : 1.8}
				/>
				<!-- Traço intermediário de meia unidade (entre marcas inteiras) -->
				{#if n < 10}
					<line
						x1="105"
						y1={yPos - 12.5}
						x2="114"
						y2={yPos - 12.5}
						stroke-width="1.4"
						opacity="0.7"
					/>
				{/if}
			{/each}
		</g>

		<!-- Números da escala (1 a 10) -->
		<g
			font-family="'SN Pro', 'Capriola', sans-serif"
			font-size="10"
			font-weight="700"
			fill="currentColor"
			text-anchor="end"
		>
			{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as n (n)}
				{@const yPos = Y_BASE - (n / 10) * (Y_BASE - Y_TOPO)}
				<text x="90" y={yPos + 3.5}>{n}</text>
			{/each}
		</g>
	{/if}

	<!-- 4. CONTORNO EXTERNO DO VIDRO (Linhas sólidas / stroke="currentColor") -->
	<!-- Paredes verticais e fundo em U -->
	<path
		d="
			M 34,44 
			L 34,320 
			C 34,355 50,366 74,366 
			C 98,366 114,355 114,320 
			L 114,38
		"
		fill="url(#glassGlazeReflect)"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
	/>

	<!-- Bico dosador na lateral esquerda superior (projetado para fora) -->
	<path
		d="
			M 34,44 
			C 28,38 20,28 15,24 
			C 20,23 30,26 38,28
		"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	<!-- Borda da boca superior (elipse com bico integrado) -->
	<path
		d="
			M 15,24 
			C 22,23 38,26 74,26 
			C 102,26 114,30 114,34 
			C 114,38 102,42 74,42 
			C 46,42 34,38 34,38
		"
		fill="#ffffff"
		fill-opacity="0.35"
		stroke="currentColor"
		stroke-width="2"
	/>

	<!-- Borda anterior da boca superior -->
	<path
		d="
			M 15,24 
			C 24,32 34,38 74,38 
			C 100,38 114,35 114,34
		"
		fill="none"
		stroke="currentColor"
		stroke-width="2.2"
	/>

	<!-- Linha vertical de reflexo de vidro na lateral esquerda -->
	<line
		x1="40"
		y1="54"
		x2="40"
		y2="310"
		stroke="#ffffff"
		stroke-opacity="0.6"
		stroke-width="2.5"
		stroke-linecap="round"
	/>
</svg>

<style>
	.meniscus-fg-group,
	.meniscus-bg-group {
		will-change: transform;
	}

	@media (prefers-reduced-motion: reduce) {
		.meniscus-fg-group,
		.meniscus-bg-group {
			transform: none !important;
		}
	}
</style>
