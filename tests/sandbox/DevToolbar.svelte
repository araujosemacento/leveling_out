<script lang="ts">
	import { onMount } from 'svelte';
	import {
		sandboxController,
		type ActionLogEntry,
		type RevealTierTrigger
	} from './mocks/mock-game-socket';
	import {
		SANDBOX_PRESETS,
		SANDBOX_PLAYERS,
		PRESET_SEQUENCE,
		type SandboxPresetDefinition,
		type SandboxPresetId,
		projectSnapshotForPlayer
	} from './presets';

	import IconChevronLeft from '~icons/lucide/chevron-left';
	import IconChevronRight from '~icons/lucide/chevron-right';
	import IconClock from '~icons/lucide/clock';
	import IconSliders from '~icons/lucide/sliders';
	import IconLayers from '~icons/lucide/layers';
	import IconColumns2 from '~icons/lucide/columns-2';
	import IconCode from '~icons/lucide/code';
	import IconTerminal from '~icons/lucide/terminal';
	import IconChevronUp from '~icons/lucide/chevron-up';
	import IconChevronDown from '~icons/lucide/chevron-down';
	import IconRotateCcw from '~icons/lucide/rotate-ccw';
	import IconEye from '~icons/lucide/eye';
	import IconBot from '~icons/lucide/bot';
	import IconPause from '~icons/lucide/pause';
	import IconPlay from '~icons/lucide/play';
	import IconTarget from '~icons/lucide/target';

	interface Props {
		viewMode?: 'route' | 'lab' | 'split';
	}

	let { viewMode = $bindable('route') }: Props = $props();

	const PRESET_CATEGORIES: ReadonlyArray<SandboxPresetDefinition['categoria']> = [
		'Lobby',
		'Iniciativa PPT',
		'Escolha de Espectro',
		'Rodada',
		'Vitória'
	];

	const POV_SHORTCUT_IDS = ['p1', 'p2', 'p3', 'p4', 'p_spec'] as const;

	const REVEAL_QUICK_TRIGGERS: ReadonlyArray<{
		tier: RevealTierTrigger;
		label: string;
		hint: string;
	}> = [
		{ tier: 'NA_MOSCA', label: '+4', hint: 'Na Mosca (diff <= 2%)' },
		{ tier: 'MUITO_PERTO', label: '+3', hint: 'Muito Perto (diff <= 6%)' },
		{ tier: 'PERTO', label: '+2', hint: 'Perto (diff <= 12%)' },
		{ tier: 'FORA_DA_MARGEM', label: '0', hint: 'Fora da Margem (diff > 12%)' }
	];

	let isCollapsed = $state(false);
	let showJsonDrawer = $state(false);
	let showLogDrawer = $state(false);

	let activePresetId = $state<SandboxPresetId>(sandboxController.activePresetId);
	let activePovId = $state<string>(sandboxController.activePovId);
	let rawSnapshot = $state(sandboxController.rawSnapshot);
	let logs = $state<ActionLogEntry[]>(sandboxController.actionLog);
	let autoFollowPov = $state(sandboxController.autoFollowPov);
	let autoBotsEnabled = $state(sandboxController.autoBotsEnabled);
	let autoAdvanceReveal = $state(sandboxController.autoAdvanceReveal);

	onMount(() => {
		const unsub = sandboxController.subscribe(() => {
			activePresetId = sandboxController.activePresetId;
			activePovId = sandboxController.activePovId;
			rawSnapshot = sandboxController.rawSnapshot;
			logs = sandboxController.actionLog;
			autoFollowPov = sandboxController.autoFollowPov;
			autoBotsEnabled = sandboxController.autoBotsEnabled;
			autoAdvanceReveal = sandboxController.autoAdvanceReveal;
		});
		return unsub;
	});

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		const target = e.target;
		if (
			target instanceof HTMLElement &&
			(target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT' ||
				target.isContentEditable)
		) {
			return;
		}

		if (e.key === '[') {
			e.preventDefault();
			sandboxController.stepPrevPreset();
		} else if (e.key === ']') {
			e.preventDefault();
			sandboxController.stepNextPreset();
		} else if (e.key >= '1' && e.key <= '5') {
			const pov = POV_SHORTCUT_IDS[Number(e.key) - 1];
			if (pov) {
				e.preventDefault();
				sandboxController.setPov(pov);
			}
		} else if (e.key === 'r' || e.key === 'R') {
			e.preventDefault();
			sandboxController.replayCurrentAnimation();
		} else if (e.key === 'p' || e.key === 'P') {
			e.preventDefault();
			sandboxController.autoAdvanceReveal = !sandboxController.autoAdvanceReveal;
		}
	}

	function handlePresetChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value as SandboxPresetId;
		sandboxController.loadPreset(val);
	}

	function handlePovSelect(povId: string) {
		sandboxController.setPov(povId);
	}

	function handleScore(team: 'A' | 'B', delta: number) {
		const placarA = rawSnapshot.placarA ?? 0;
		const placarB = rawSnapshot.placarB ?? 0;
		if (team === 'A') {
			sandboxController.setScores(placarA + delta, placarB);
		} else {
			sandboxController.setScores(placarA, placarB + delta);
		}
	}

	function handleHiddenTargetInput(e: Event) {
		const val = Number((e.target as HTMLInputElement).value);
		sandboxController.setHiddenTarget(val);
	}

	let projectedSnapshot = $derived(projectSnapshotForPlayer(rawSnapshot, activePovId));

	let activeRoleDesc = $derived.by(() => {
		const player = SANDBOX_PLAYERS[activePovId];
		if (!player) return 'Desconhecido';
		if (player.id === 'p_spec') return 'Espectador Conectado';

		const fase = rawSnapshot.fase;
		if (fase === 'LOBBY') {
			return player.isHost ? 'Host / Moderador' : `Membro Equipe ${player.equipe}`;
		}
		if (fase === 'INICIATIVA') {
			const isLeader = activePovId === 'p1' || activePovId === 'p3';
			return isLeader ? 'Líder Disputa PPT' : 'Observador PPT';
		}
		if (fase === 'ESCOLHA_ESPECTRO' || fase === 'ESCOLHA_CARTA') {
			const activeTeam = rawSnapshot.equipeAtiva || 'A';
			const isMyTeam = player.equipe === activeTeam;
			if (!isMyTeam) return 'Adversário Observando';
			return rawSnapshot.rodadaAtiva?.liderRodadaId === activePovId
				? 'Líder Escolha Espectro'
				: 'Parceiro com Voto';
		}
		if (fase === 'RODADA_DICA') {
			const rodada = rawSnapshot.rodadaAtiva || (rawSnapshot as any).rodada;
			if (rodada?.codificadorId === activePovId) return 'Codificador Ativo';
			if (rodada?.palpiteiroId === activePovId) return 'Palpiteiro Aguardando';
			return 'Observador da Rodada';
		}
		if (fase === 'RODADA_PALPITE') {
			const rodada = rawSnapshot.rodadaAtiva || (rawSnapshot as any).rodada;
			if (rodada?.palpiteiroId === activePovId) return 'Palpiteiro Ativo (Slider)';
			if (rodada?.codificadorId === activePovId) return 'Codificador Observando';
			return 'Observador da Rodada';
		}
		if (fase === 'RODADA_REVELACAO' || fase === 'REVELACAO') {
			return 'Revelação de Pontuação';
		}
		if (fase === 'VITORIA' || fase === 'FIM_JOGO' || fase === 'FIM_DE_JOGO') {
			return 'Fim de Jogo : Revanche';
		}
		return 'Jogador Conectado';
	});

	let canTriggerTimeout = $derived(
		rawSnapshot.fase === 'INICIATIVA' ||
			rawSnapshot.fase === 'ESCOLHA_ESPECTRO' ||
			rawSnapshot.fase === 'ESCOLHA_CARTA' ||
			rawSnapshot.fase === 'REVELACAO' ||
			rawSnapshot.fase === 'RODADA_REVELACAO'
	);

	let isRoundCalibrationPhase = $derived(
		rawSnapshot.fase === 'RODADA_DICA' || rawSnapshot.fase === 'RODADA_PALPITE'
	);

	let isQuickRevealAvailable = $derived(
		rawSnapshot.fase === 'ESCOLHA_ESPECTRO' ||
			rawSnapshot.fase === 'ESCOLHA_CARTA' ||
			rawSnapshot.fase === 'RODADA_DICA' ||
			rawSnapshot.fase === 'RODADA_PALPITE' ||
			rawSnapshot.fase === 'REVELACAO' ||
			rawSnapshot.fase === 'RODADA_REVELACAO'
	);

	let currentHiddenTarget = $derived(rawSnapshot.rodadaAtiva?.metaOculta ?? 50);
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<aside
	aria-label="Barra de Desenvolvimento Sandbox"
	class="sticky top-0 z-50 w-full border-b border-border-strong bg-bg-surface text-text-primary shadow-md backdrop-blur-md transition-all duration-200 motion-reduce:transition-none"
>
	<!-- Cabeçalho / Barra Compacta Superior -->
	<div
		class="border-b border-border-subtle bg-bg-surface-elevated px-4 py-2 text-xs sm:px-6 lg:px-8"
	>
		<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<span class="font-display font-bold tracking-tight text-primary">DEV SANDBOX</span>
				<span class="text-text-muted">/</span>
				<span class="font-mono text-text-muted">{rawSnapshot.fase}</span>
				<span class="text-text-muted">/</span>
				<span class="font-util font-semibold text-accent">{activeRoleDesc}</span>
			</div>

			<div class="flex items-center gap-2">
				<span class="hidden font-mono text-[10px] text-text-muted md:inline">
					Atalhos: [ ] Presets / 1..5 POV / R Repetir / P Auto-Avanço
				</span>

				<button
					type="button"
					onclick={() => (isCollapsed = !isCollapsed)}
					class="btn-soft font-util flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium"
					aria-expanded={!isCollapsed}
				>
					<span>{isCollapsed ? 'Expandir Painel' : 'Recolher Painel'}</span>
					{#if isCollapsed}
						<IconChevronDown class="h-3.5 w-3.5" />
					{:else}
						<IconChevronUp class="h-3.5 w-3.5" />
					{/if}
				</button>
			</div>
		</div>
	</div>

	{#if !isCollapsed}
		<div class="px-4 py-3 sm:px-6 lg:px-8">
			<div class="mx-auto flex max-w-6xl flex-col gap-2.5 text-xs">
				<!-- Linha 1: Estágio da Pipeline e Simulação -->
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-util text-[10px] font-bold tracking-wider text-text-muted uppercase">
							Etapa:
						</span>

						<button
							type="button"
							onclick={() => sandboxController.stepPrevPreset()}
							class="btn-soft flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
							title="Estágio anterior na sequência ([)"
						>
							<span>Anterior</span>
							<IconChevronLeft class="h-3.5 w-3.5" />
						</button>

						<select
							aria-label="Selecionar cenário do Sandbox"
							value={activePresetId}
							onchange={handlePresetChange}
							class="font-util max-w-xs truncate rounded-md border border-border-subtle bg-bg-base px-2.5 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none sm:max-w-sm"
						>
							{#each PRESET_CATEGORIES as categoria (categoria)}
								<optgroup label={categoria}>
									{#each PRESET_SEQUENCE.filter((id) => SANDBOX_PRESETS[id].categoria === categoria) as presetId (presetId)}
										<option value={presetId}>
											{SANDBOX_PRESETS[presetId].titulo} ({SANDBOX_PRESETS[presetId].fase})
										</option>
									{/each}
								</optgroup>
							{/each}
						</select>

						<button
							type="button"
							onclick={() => sandboxController.stepNextPreset()}
							class="btn-soft flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
							title="Próximo estágio na sequência (])"
						>
							<span>Próxima</span>
							<IconChevronRight class="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							onclick={() => sandboxController.replayCurrentAnimation()}
							class="btn-soft flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
							title="Repetir animação da fase atual (R)"
						>
							<span>Repetir Animação</span>
							<IconRotateCcw class="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							onclick={() => sandboxController.triggerTimeout()}
							disabled={!canTriggerTimeout}
							class="btn-soft flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
							title="Disparar encerramento imediato do cronômetro"
						>
							<span>Simular Timeout</span>
							<IconClock class="h-3.5 w-3.5" />
						</button>
					</div>

					<!-- Chaves Liga/Desliga do Motor Simulado -->
					<div class="flex flex-wrap items-center gap-1.5">
						<button
							type="button"
							aria-pressed={autoFollowPov}
							onclick={() => (sandboxController.autoFollowPov = !autoFollowPov)}
							class="font-util flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors {autoFollowPov
								? 'bg-primary font-bold text-text-on-primary'
								: 'border border-border-subtle bg-bg-base text-text-muted hover:border-primary/50'}"
							title="Alternar POV automaticamente para quem tem a ação da fase"
						>
							<span>Auto-POV</span>
							<IconEye class="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							aria-pressed={autoBotsEnabled}
							onclick={() => (sandboxController.autoBotsEnabled = !autoBotsEnabled)}
							class="font-util flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors {autoBotsEnabled
								? 'bg-primary font-bold text-text-on-primary'
								: 'border border-border-subtle bg-bg-base text-text-muted hover:border-primary/50'}"
							title="Simular respostas orgânicas dos demais assentos"
						>
							<span>Bots</span>
							<IconBot class="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							aria-pressed={autoAdvanceReveal}
							onclick={() => (sandboxController.autoAdvanceReveal = !autoAdvanceReveal)}
							class="font-util flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors {autoAdvanceReveal
								? 'bg-primary font-bold text-text-on-primary'
								: 'border border-border-subtle bg-bg-base text-text-muted hover:border-primary/50'}"
							title="Avançar após 6.5s da revelação (P)"
						>
							<span>Auto-Avanço (6.5s)</span>
							{#if autoAdvanceReveal}
								<IconPlay class="h-3.5 w-3.5" />
							{:else}
								<IconPause class="h-3.5 w-3.5" />
							{/if}
						</button>
					</div>
				</div>

				<!-- Linha 2: Seletor de Ponto de Vista (POV) + Calibração de Meta / Revelação -->
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="font-util text-[10px] font-bold tracking-wider text-text-muted uppercase">
							POV:
						</span>

						{#each Object.values(SANDBOX_PLAYERS) as p, idx (p.id)}
							{@const isSelected = activePovId === p.id}
							<button
								type="button"
								onclick={() => handlePovSelect(p.id)}
								title="Atalho {idx + 1}: {p.descricao}"
								class="font-util rounded-md px-3 py-1.5 text-xs transition-colors {isSelected
									? 'bg-primary font-bold text-text-on-primary shadow-xs'
									: 'border border-border-subtle bg-bg-base text-text-primary hover:border-primary/50'}"
							>
								<span>{idx + 1}: {p.nome}</span>
								{#if p.isHost}
									<span class="opacity-80"> (Host)</span>
								{:else if p.id !== 'p_spec'}
									<span class="opacity-80"> ({p.equipe})</span>
								{:else}
									<span class="opacity-80"> (Spec)</span>
								{/if}
							</button>
						{/each}
					</div>

					{#if isRoundCalibrationPhase || isQuickRevealAvailable}
						<div class="flex flex-wrap items-center gap-2">
							{#if isRoundCalibrationPhase}
								<label class="flex items-center gap-2 font-mono text-[11px]">
									<span class="font-util font-semibold text-text-muted">Meta Oculta:</span>
									<input
										type="range"
										min="0"
										max="100"
										value={currentHiddenTarget}
										oninput={handleHiddenTargetInput}
										class="h-1.5 w-24 accent-primary"
										aria-label="Ajustar meta oculta da rodada"
									/>
									<span class="w-9 font-bold text-primary">{currentHiddenTarget}%</span>
								</label>
							{/if}

							{#if isQuickRevealAvailable}
								<div class="flex items-center gap-1">
									<span class="font-util text-[10px] font-bold text-text-muted uppercase">
										Revelar:
									</span>
									{#each REVEAL_QUICK_TRIGGERS as trig (trig.tier)}
										<button
											type="button"
											title={trig.hint}
											onclick={() => sandboxController.triggerRevealWithScore(trig.tier)}
											class="btn-soft flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px]"
										>
											<span>{trig.label}</span>
											<IconTarget class="h-3 w-3" />
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Linha 3: Modo de Visualização e Ajustes -->
				<div
					class="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2"
				>
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-util text-[10px] font-bold tracking-wider text-text-muted uppercase">
							Visão:
						</span>

						<button
							type="button"
							onclick={() => (viewMode = 'route')}
							class="font-util flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs {viewMode ===
							'route'
								? 'bg-accent font-bold text-text-on-primary'
								: 'border border-border-subtle bg-bg-base text-text-primary hover:border-accent/40'}"
						>
							<span>Pipeline Rota</span>
							<IconLayers class="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							onclick={() => (viewMode = 'split')}
							class="font-util flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs {viewMode ===
							'split'
								? 'bg-accent font-bold text-text-on-primary'
								: 'border border-border-subtle bg-bg-base text-text-primary hover:border-accent/40'}"
						>
							<span>Visão Dupla</span>
							<IconColumns2 class="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							onclick={() => (viewMode = 'lab')}
							class="font-util flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs {viewMode ===
							'lab'
								? 'bg-accent font-bold text-text-on-primary'
								: 'border border-border-subtle bg-bg-base text-text-primary hover:border-accent/40'}"
						>
							<span>Laboratório Rodada</span>
							<IconSliders class="h-3.5 w-3.5" />
						</button>
					</div>

					<!-- Placar rápido -->
					<div class="flex items-center gap-3 font-mono text-xs">
						<div class="flex items-center gap-1">
							<span class="font-util font-semibold text-accent">Pato:</span>
							<button
								type="button"
								onclick={() => handleScore('A', -1)}
								class="btn-soft h-6 w-6 rounded border border-border-subtle bg-bg-base text-center"
							>
								-
							</button>
							<span class="w-5 text-center font-bold">{rawSnapshot.placarA ?? 0}</span>
							<button
								type="button"
								onclick={() => handleScore('A', 1)}
								class="btn-soft h-6 w-6 rounded border border-border-subtle bg-bg-base text-center"
							>
								+
							</button>
						</div>

						<span class="text-text-muted">/</span>

						<div class="flex items-center gap-1">
							<span class="font-util font-semibold text-secondary">Ganso:</span>
							<button
								type="button"
								onclick={() => handleScore('B', -1)}
								class="btn-soft h-6 w-6 rounded border border-border-subtle bg-bg-base text-center"
							>
								-
							</button>
							<span class="w-5 text-center font-bold">{rawSnapshot.placarB ?? 0}</span>
							<button
								type="button"
								onclick={() => handleScore('B', 1)}
								class="btn-soft h-6 w-6 rounded border border-border-subtle bg-bg-base text-center"
							>
								+
							</button>
						</div>
					</div>

					<!-- Gavetas Expansíveis -->
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => {
								showJsonDrawer = !showJsonDrawer;
								if (showJsonDrawer) showLogDrawer = false;
							}}
							class="btn-soft flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
						>
							<span>JSON</span>
							<IconCode class="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							onclick={() => {
								showLogDrawer = !showLogDrawer;
								if (showLogDrawer) showJsonDrawer = false;
							}}
							class="btn-soft flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
						>
							<span>Logs ({logs.length})</span>
							<IconTerminal class="h-3.5 w-3.5" />
						</button>
					</div>
				</div>

				<!-- Gaveta 1: Inspeção de Estado JSON -->
				{#if showJsonDrawer}
					<div
						class="mt-2 max-h-72 overflow-auto rounded-lg border border-border-subtle bg-bg-base p-3 font-mono text-[11px]"
					>
						<div class="mb-2 flex items-center justify-between border-b border-border-subtle pb-1">
							<span class="font-bold text-accent">
								Snapshot Projetado (Zero Trust POV: {activePovId})
							</span>
							<span class="text-text-muted">
								metaOculta: {projectedSnapshot.rodadaAtiva?.metaOculta !== undefined &&
								projectedSnapshot.rodadaAtiva?.metaOculta !== null
									? `${projectedSnapshot.rodadaAtiva.metaOculta}% (Visível)`
									: 'Blindada (Oculta)'}
							</span>
						</div>
						<pre>{JSON.stringify(projectedSnapshot, null, 2)}</pre>
					</div>
				{/if}

				<!-- Gaveta 2: Logs de Intenções -->
				{#if showLogDrawer}
					<div
						class="mt-2 max-h-72 overflow-auto rounded-lg border border-border-subtle bg-bg-base p-3 font-mono text-[11px]"
					>
						<div class="mb-2 border-b border-border-subtle pb-1 font-bold text-accent">
							Histórico de Intenções e Eventos Emitidos
						</div>
						{#if logs.length === 0}
							<p class="text-text-muted italic">Nenhuma intenção registrada ainda.</p>
						{:else}
							<div class="flex flex-col gap-1">
								{#each logs as log, i (log.timestamp + i)}
									<div class="flex items-start gap-2 border-b border-border-subtle/40 pb-1">
										<span class="font-mono text-text-muted">{log.timestamp}</span>
										<span class="font-bold text-primary">[{log.tipo}]</span>
										<span class="break-all text-text-primary">{log.detalhe}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</aside>
