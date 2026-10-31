<script lang="ts">
	import { onMount } from 'svelte';
	import { GameEngine } from '$lib/engine';
	import { projectSnapshotForPlayer, SANDBOX_PLAYERS } from './presets';
	import { sandboxController } from './mocks/mock-game-socket';
	import TestTube from '$lib/components/TestTube.svelte';
	import AnalogSlider from '$lib/components/AnalogSlider.svelte';

	import IconSend from '~icons/lucide/send';
	import IconCheck from '~icons/lucide/check';
	import IconRotateCcw from '~icons/lucide/rotate-ccw';
	import IconLock from '~icons/lucide/lock';
	import IconUnlock from '~icons/lucide/unlock';
	import IconChevronRight from '~icons/lucide/chevron-right';

	let activePovId = $state(sandboxController.activePovId);
	let rawSnapshot = $state(sandboxController.rawSnapshot);
	let inputDica = $state('Muito Salgado');
	let localSliderVal = $state(50);

	function syncFromController() {
		activePovId = sandboxController.activePovId;
		rawSnapshot = sandboxController.rawSnapshot;

		const rodada = rawSnapshot.rodadaAtiva || (rawSnapshot as any).rodada;
		if (rodada?.palpite !== undefined && rodada.palpite !== null) {
			localSliderVal = rodada.palpite;
		}
	}

	onMount(() => {
		syncFromController();
		const unsub = sandboxController.subscribe(() => {
			syncFromController();
		});
		return unsub;
	});

	let engine = $derived.by(() => {
		const eng = new GameEngine('SALA-DEV');
		const proj = projectSnapshotForPlayer(rawSnapshot, activePovId);
		const jogadorNome =
			proj.jogadores?.find((j) => (j.playerId || j.id) === activePovId)?.nome || 'Jogador';
		const equipeChoice = SANDBOX_PLAYERS[activePovId]?.equipe || 'ALEATORIO';
		eng.setPlayer(activePovId, jogadorNome, equipeChoice);
		eng.reconcileFullSync(proj);
		return eng;
	});

	let tubeProj = $derived(engine.getTubeProjection(activePovId));
	let roleProj = $derived(engine.getRoleProjection(activePovId));
	let spectrumProj = $derived(engine.getSpectrumProjection());
	let scoreProj = $derived(engine.getScoreBoardProjection());

	function handleEnviarDica() {
		if (!inputDica.trim()) return;
		sandboxController.handleSocketAction('SUBMETER_DICA', { dica: inputDica.trim() });
	}

	function handleSliderChange(val: number) {
		const rounded = Math.round(val);
		localSliderVal = rounded;
		const currentPalpite = rawSnapshot.rodadaAtiva?.palpite ?? 50;
		if (rounded !== currentPalpite) {
			sandboxController.handleSocketAction('SLIDER_MOVER', { posicao: rounded });
		}
	}

	function handleConfirmarPalpite() {
		sandboxController.handleSocketAction('CONFIRMAR_PALPITE', {});
	}

	function handleRevanche() {
		sandboxController.handleSocketAction('REVANCHE', {});
	}
</script>

<section
	aria-label="Laboratório de Rodada do Sandbox"
	class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
>
	<!-- Status Zero Trust e Contexto do Papel -->
	<header
		class="flex flex-col gap-2 rounded border border-border-subtle bg-bg-surface p-4 text-xs shadow-xs"
	>
		<div
			class="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2"
		>
			<div class="flex items-center gap-2">
				<span class="font-display font-bold text-accent">LABORATÓRIO DE RODADA</span>
				<span class="text-text-muted">/</span>
				<span class="font-mono font-semibold">{rawSnapshot.fase}</span>
				<span class="text-text-muted">/</span>
				<span class="font-util text-text-primary">Rodada {spectrumProj.numeroRodada}</span>
			</div>

			<div class="flex items-center gap-2">
				<span class="font-util font-semibold text-text-muted">Equipe Ativa:</span>
				<span
					class="font-display font-bold {spectrumProj.equipeAtiva === 'A'
						? 'text-team-pato'
						: 'text-team-ganso'}"
				>
					{spectrumProj.equipeAtivaNome}
				</span>
			</div>
		</div>

		<!-- Alerta Zero Trust -->
		<div class="flex items-center gap-2 font-mono text-[11px]">
			{#if tubeProj.isMetaOculta}
				<IconLock class="h-4 w-4 shrink-0 text-text-muted" />
				<span class="text-text-muted">
					Zero Trust Ativo : Meta secreta oculta para o seu POV ({activePovId}) para prevenir
					fraudes.
				</span>
			{:else}
				<IconUnlock class="h-4 w-4 shrink-0 text-primary" />
				<span class="font-bold text-primary">
					Meta Visível : Nível real posicionado em {tubeProj.metaVisivel}%
				</span>
			{/if}
		</div>
	</header>

	<!-- Área de Simulação Visual (Tubo de Ensaio + Espectro Bipolar) -->
	<div class="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
		<!-- Tubo de Ensaio Procedural -->
		<div class="flex flex-col items-center justify-center md:col-span-4">
			<TestTube
				level={tubeProj.isMetaOculta
					? rawSnapshot.fase === 'RODADA_PALPITE'
						? localSliderVal
						: 0
					: tubeProj.nivelLiquido}
				team={spectrumProj.equipeAtiva === 'A' ? 'pato' : 'ganso'}
				showScale={true}
				animated={true}
				class="h-auto w-36 sm:w-44"
			/>
			<div class="mt-2 text-center font-mono text-xs text-text-muted">
				{tubeProj.statusTexto}
			</div>
		</div>

		<!-- Espectro, Pista e Controles de Entrada -->
		<div class="flex flex-col gap-6 md:col-span-8">
			<!-- Carta de Espectro Bipolar -->
			<div
				class="relative flex flex-col gap-3 rounded border-2 border-border-strong bg-bg-surface-elevated p-5"
			>
				<div class="flex items-center justify-between font-mono text-[11px] text-text-muted">
					<span>ESPECTRO BIPOLAR DA RODADA</span>
					<span
						class="font-bold {spectrumProj.equipeAtiva === 'A'
							? 'text-team-pato'
							: 'text-team-ganso'}"
					>
						Turno: {spectrumProj.equipeAtivaNome}
					</span>
				</div>

				<div
					class="flex items-center justify-between gap-4 font-display text-xl font-bold sm:text-2xl"
				>
					<span class="text-left text-text-primary">{spectrumProj.poloEsquerdo}</span>
					<span class="font-util text-sm font-normal text-text-muted">/</span>
					<span class="text-right text-text-primary">{spectrumProj.poloDireito}</span>
				</div>

				<!-- Dica Atual -->
				<div
					class="mt-2 flex flex-col gap-1 rounded border border-border-subtle bg-bg-base p-3 text-sm"
				>
					<span
						class="font-util text-[11px] font-semibold tracking-wider text-text-muted uppercase"
					>
						Dica do Codificador:
					</span>
					<div class="font-display text-lg font-bold text-accent">
						{#if spectrumProj.dica}
							"{spectrumProj.dica}"
						{:else}
							<span class="font-sans text-sm font-normal text-text-muted italic">
								Nenhuma dica enviada ainda
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Fase 1: Envio de Dica pelo Codificador -->
			{#if rawSnapshot.fase === 'RODADA_DICA'}
				<div class="flex flex-col gap-3 rounded border border-border-subtle bg-bg-surface p-4">
					<div class="flex items-center justify-between text-xs">
						<span class="font-util font-bold text-text-primary">Envio de Pista Textual</span>
						<span class="font-mono text-text-muted">
							{roleProj.podeDigitarDica ? 'Seu Turno de Digitar' : 'Aguardando Codificador'}
						</span>
					</div>

					{#if roleProj.podeDigitarDica}
						<div class="flex gap-2">
							<input
								type="text"
								bind:value={inputDica}
								placeholder="Digite sua dica contextualizada..."
								class="font-body flex-1 rounded border border-border-subtle bg-bg-base px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
							/>
							<button
								type="button"
								onclick={handleEnviarDica}
								class="btn-primary font-util flex items-center gap-2 rounded px-4 py-2 text-xs font-bold"
							>
								<span>Enviar Dica</span>
								<IconSend class="h-4 w-4" />
							</button>
						</div>
					{:else}
						<p class="font-body text-xs text-text-muted italic">
							Apenas o Codificador da equipe ativa pode submeter a dica nesta etapa.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Fase 2: Arrasto do Slider pelo Palpiteiro -->
			{#if rawSnapshot.fase === 'RODADA_PALPITE'}
				<div class="flex flex-col gap-4 rounded border border-border-subtle bg-bg-surface p-4">
					<div class="flex items-center justify-between text-xs">
						<span class="font-util font-bold text-text-primary">Ajuste do Marcador Analógico</span>
						<span class="font-mono text-text-muted">
							{roleProj.podeArrastarSlider ? 'Seu Turno de Palpitar' : 'Observando Ajuste'}
						</span>
					</div>

					<AnalogSlider
						value={localSliderVal}
						disabled={!roleProj.podeArrastarSlider}
						label="Ajuste fino do palpite"
						leftLabel={spectrumProj.poloEsquerdo}
						rightLabel={spectrumProj.poloDireito}
						onChange={handleSliderChange}
					/>

					{#if roleProj.podeArrastarSlider}
						<div class="flex justify-end">
							<button
								type="button"
								onclick={handleConfirmarPalpite}
								class="btn-primary font-util flex items-center gap-2 rounded px-5 py-2.5 text-xs font-bold"
							>
								<span>Confirmar Palpite</span>
								<IconCheck class="h-4 w-4" />
							</button>
						</div>
					{:else}
						<p class="font-body text-xs text-text-muted italic">
							O Palpiteiro da equipe ativa está ajustando o slider em tempo real.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Fase 3: Revelação Dramática e Pontuação -->
			{#if rawSnapshot.fase === 'RODADA_REVELACAO'}
				<div class="flex flex-col gap-3 rounded border-2 border-primary bg-bg-surface p-4 text-xs">
					<span class="font-display text-base font-bold text-primary">
						Resultado da Revelação
					</span>

					<div class="grid grid-cols-3 gap-2 text-center font-mono">
						<div class="rounded border border-border-subtle bg-bg-base p-2">
							<span class="block text-[10px] text-text-muted">META REAL</span>
							<span class="text-base font-bold text-accent">{tubeProj.metaVisivel}%</span>
						</div>
						<div class="rounded border border-border-subtle bg-bg-base p-2">
							<span class="block text-[10px] text-text-muted">PALPITE</span>
							<span class="text-base font-bold text-primary">{tubeProj.marcadorPalpite}%</span>
						</div>
						<div class="rounded border border-border-subtle bg-bg-base p-2">
							<span class="block text-[10px] text-text-muted">PONTOS</span>
							<span class="text-team-pato text-base font-bold">
								+{rawSnapshot.rodadaAtiva?.pontos || 0}
							</span>
						</div>
					</div>

					<div class="mt-2 flex justify-end">
						<button
							type="button"
							onclick={() => sandboxController.stepNextPreset()}
							class="btn-primary font-util flex items-center gap-2 rounded px-4 py-2 text-xs font-bold"
						>
							<span>Próxima Etapa</span>
							<IconChevronRight class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/if}

			<!-- Fase 4: Fim de Jogo e Revanche -->
			{#if rawSnapshot.fase === 'VITORIA' || rawSnapshot.fase === 'FIM_DE_JOGO'}
				<div
					class="flex flex-col gap-3 rounded border-2 border-accent bg-bg-surface p-5 text-center"
				>
					<span class="font-display text-2xl font-bold text-accent">
						VITÓRIA DA EQUIPE {rawSnapshot.vencedor === 'A' ? 'PATO' : 'GANSO'}!
					</span>
					<p class="font-body text-xs text-text-muted">
						A meta de pontuação de {scoreProj.metaPontuacao} pontos foi alcançada com sucesso.
					</p>

					<div class="mt-3 flex justify-center">
						<button
							type="button"
							onclick={handleRevanche}
							class="btn-primary font-util flex items-center gap-2 rounded px-6 py-2.5 text-xs font-bold"
						>
							<span>Solicitar Revanche</span>
							<IconRotateCcw class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>
