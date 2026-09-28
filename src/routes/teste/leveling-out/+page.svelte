<script>
	import Icon from '@iconify/svelte';
	import PocketBase from 'pocketbase';
	import P5Frame from '$lib/components/P5Frame.svelte';
	import { resolve } from '$app/paths';
	import { getBackendUrl } from '$lib/config/backend.js';

	// @ts-ignore
	let { data } = $props();
	let project = $derived(data.project);

	const pb = new PocketBase(getBackendUrl());

	// Configurações do Stepper e Sala
	const roomCode = 'sala-debug';
	let reloadKeyA = $state(1);
	let reloadKeyB = $state(1);
	let showPlayerB = $state(true);

	// Estado de Autenticação do Desenvolvedor
	let isAuthChecked = $state(false);
	let isAuthenticated = $state(false);
	let authEmail = $state('');
	let authPassword = $state('');
	let authError = $state('');
	let isLoggingIn = $state(false);
	let currentUserEmail = $state('');

	// Bloqueio Físico do Canvas (Overlay Shroud)
	let isCanvasLocked = $state(true);

	// Estado do Debugger
	let currentStep = $state(0);
	let isPlaying = $state(false);
	let intervalMs = $state(2000);
	/** @type {any} */
	let autoTimer = null;
	let statusLog = $state('Pronto para iniciar a simulação.');

	// Breakpoints configuráveis por etapa (índices 0 a 9)
	/** @type {Record<number, boolean>} */
	let breakpoints = $state({
		0: false,
		1: false,
		2: true, // Pausa após o primeiro lance
		3: true, // Pausa após verificar o aviso no oponente
		4: false,
		5: true, // Pausa na revelação
		6: false,
		7: false,
		8: true, // Pausa no expurgo
		9: false
	});

	// Telemetria do PocketBase
	/** @type {any} */
	let dbSala = $state(null);
	/** @type {any[]} */
	// eslint-disable-next-line no-unused-vars
	let dbJogadores = $state([]);
	/** @type {any} */
	let telemetryTimer = null;

	const steps = [
		{
			id: 0,
			title: 'Etapa 1: Conectar Jogador A',
			desc: 'Cria a sala e conecta o primeiro jogador na Equipe A em modo Lobby.'
		},
		{
			id: 1,
			title: 'Etapa 2: Conectar Jogador B (Handshake)',
			desc: 'Conecta o segundo jogador na Equipe B. Ambos transicionam para 2 Conectados.'
		},
		{
			id: 2,
			title: 'Etapa 3: Jogador A joga Papel (Reatividade Otimista)',
			desc: 'Jogador A submete o lance. A interface local destaca a escolha instantaneamente.'
		},
		{
			id: 3,
			title: 'Etapa 4: Feedback Autoritativo no Jogador B',
			desc: 'Jogador B recebe o SSE do servidor e exibe: Oponente já fez a jogada!'
		},
		{
			id: 4,
			title: 'Etapa 5: Jogador B joga Pedra',
			desc: 'Jogador B envia o segundo lance para o backend processar a rodada.'
		},
		{
			id: 5,
			title: 'Etapa 6: Buffer de Revelação Dramática (Contagem)',
			desc: 'Ambos os clientes entram no estado REVELANDO e contam 1.4s em sincronia.'
		},
		{
			id: 6,
			title: 'Etapa 7: Revelação Simultânea e Placar',
			desc: 'Vitória do Jogador A. Placar avança para 1x0 e rodada atual para 2.'
		},
		{
			id: 7,
			title: 'Etapa 8: Simular Queda / Sleep do Jogador B',
			desc: 'Jogador B é desativado para simular saída abrupta ou oscilação de rede.'
		},
		{
			id: 8,
			title: 'Etapa 9: Simular Expurgo de Inatividade pelo Servidor',
			desc: 'Remove o Jogador B no banco. Jogador A deve retornar para Aguardando Jogador.'
		},
		{
			id: 9,
			title: 'Etapa 10: Retomada e Re-hidratação com sessionStorage',
			desc: 'Reconecta o Jogador B. O cliente revalida o banco e restaura a sessão sem bugs.'
		}
	];

	// Validação de Sessão Inicial
	$effect(() => {
		if (typeof window !== 'undefined') {
			if (pb.authStore.isValid && pb.authStore.record?.verified) {
				isAuthenticated = true;
				currentUserEmail = pb.authStore.record?.email || '';
			} else {
				pb.authStore.clear();
				isAuthenticated = false;
				currentUserEmail = '';
			}
			isAuthChecked = true;
		}
	});

	// Acesso com Credenciais de Desenvolvedor
	/**
	 * @param {SubmitEvent} [e]
	 */
	async function handleLogin(e) {
		if (e) e.preventDefault();
		authError = '';
		isLoggingIn = true;
		try {
			const authData = await pb.collection('users').authWithPassword(authEmail, authPassword);
			if (!authData.record?.verified) {
				pb.authStore.clear();
				authError = 'Acesso não autorizado: conta não possui status verificado no servidor.';
				isAuthenticated = false;
				currentUserEmail = '';
			} else {
				isAuthenticated = true;
				currentUserEmail = authData.record.email;
				await fetchTelemetry();
			}
			// eslint-disable-next-line no-unused-vars
		} catch (_) {
			authError = 'Credenciais de desenvolvedor inválidas ou servidor indisponível.';
			isAuthenticated = false;
			currentUserEmail = '';
		} finally {
			isLoggingIn = false;
		}
	}

	function handleLogout() {
		pb.authStore.clear();
		isAuthenticated = false;
		currentUserEmail = '';
		handlePause();
	}

	// Polling de telemetria do banco
	async function fetchTelemetry() {
		if (!isAuthenticated) return;
		try {
			const salas = await pb.collection('salas').getList(1, 1, {
				filter: `codigo = "${roomCode}"`
			});
			dbSala = salas.items[0] || null;

			const jogadores = await pb.collection('jogadores').getFullList({
				filter: `sala_codigo = "${roomCode}"`
			});
			dbJogadores = jogadores;
			// eslint-disable-next-line no-unused-vars
		} catch (_) {
			// Backend offline ou inacessível
		}
	}

	$effect(() => {
		if (isAuthenticated) {
			fetchTelemetry();
			telemetryTimer = setInterval(fetchTelemetry, 1000);
			return () => clearInterval(telemetryTimer);
		}
	});

	// Execução atômica dos passos do teste
	/**
	 * @param {number} stepIndex
	 */
	async function executeStep(stepIndex) {
		const baseUrl = getBackendUrl();
		statusLog = `Executando ${steps[stepIndex].title}...`;

		switch (stepIndex) {
			case 0:
				// Reset e inicialização da Sala com Jogador A
				await resetDatabase();
				reloadKeyA++;
				showPlayerB = false;
				statusLog = 'Jogador A conectado. Sala criada no PocketBase.';
				break;

			case 1:
				// Entrada do Jogador B
				showPlayerB = true;
				reloadKeyB++;
				statusLog = 'Jogador B conectado. Handshake SSE estabelecido.';
				break;

			case 2:
				// Jogador A joga 'papel'
				try {
					await fetch(`${baseUrl}/api/ppt/lance`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							sala_codigo: roomCode,
							player_id: 'player_debug_a',
							equipe: 'A',
							lance: 'papel',
							rodada: dbSala ? dbSala.rodada_atual : 1
						})
					});
					statusLog = 'Jogador A submeteu Papel. Verifique destaque otimista.';
				} catch (err) {
					// @ts-ignore
					statusLog = `Erro no lance do Jogador A: ${err.message}`;
				}
				break;

			case 3:
				// Apenas observação do feedback no Jogador B
				statusLog = 'Jogador B exibindo aviso verde: Oponente já fez a jogada.';
				break;

			case 4:
				// Jogador B joga 'pedra'
				try {
					await fetch(`${baseUrl}/api/ppt/lance`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							sala_codigo: roomCode,
							player_id: 'player_debug_b',
							equipe: 'B',
							lance: 'pedra',
							rodada: dbSala ? dbSala.rodada_atual : 1
						})
					});
					statusLog = 'Jogador B submeteu Pedra. Rodada resolvida no backend.';
				} catch (err) {
					// @ts-ignore
					statusLog = `Erro no lance do Jogador B: ${err.message}`;
				}
				break;

			case 5:
				// Buffer de Revelação
				statusLog = 'Contagem dramática de 1.4s ativa em ambas as telas.';
				break;

			case 6:
				// Placar atualizado
				statusLog = 'Resultado revelado: Papel vence Pedra. Placar: A=1 vs B=0.';
				break;

			case 7:
				// Simular queda do Jogador B
				showPlayerB = false;
				statusLog = 'Jogador B desconectado (simulação de sleep/queda).';
				break;

			case 8:
				// Simular expurgo do Jogador B na base (requer autenticação de desenvolvedor)
				try {
					const list = await pb.collection('jogadores').getFullList({
						filter: 'player_id = "player_debug_b"'
					});
					if (list.length > 0) {
						await pb.collection('jogadores').delete(list[0].id);
					}
					statusLog = 'Jogador B expurgado da base SQLite. Jogador A volta ao Lobby.';
				} catch (err) {
					// @ts-ignore
					statusLog = `Erro ao expurgar jogador B: ${err.message}`;
				}
				break;

			case 9:
				// Retomada e Reconciliação
				showPlayerB = true;
				reloadKeyB++;
				statusLog = 'Jogador B reingressou. Sessão restaurada e reconciliada.';
				break;
		}

		await fetchTelemetry();
	}

	// Limpeza autorizada do banco para a sala de teste
	async function resetDatabase() {
		try {
			const players = await pb.collection('jogadores').getFullList({
				filter: `sala_codigo = "${roomCode}"`
			});
			for (const p of players) {
				await pb.collection('jogadores').delete(p.id);
			}

			const salas = await pb.collection('salas').getFullList({
				filter: `codigo = "${roomCode}"`
			});
			for (const s of salas) {
				await pb.collection('salas').delete(s.id);
			}
		} catch (err) {
			console.warn('[Test Harness] Falha ao resetar banco com sessão autenticada:', err);
		}
	}

	// Controles do Stepper
	function handlePlay() {
		isPlaying = true;
		runNextStepAuto();
	}

	function handlePause() {
		isPlaying = false;
		clearTimeout(autoTimer);
	}

	async function handleStepOver() {
		handlePause();
		if (currentStep < steps.length) {
			await executeStep(currentStep);
			currentStep = Math.min(currentStep + 1, steps.length - 1);
		}
	}

	async function handleRepeatStep() {
		handlePause();
		await executeStep(currentStep);
	}

	async function handleResetScenario() {
		handlePause();
		currentStep = 0;
		await resetDatabase();
		reloadKeyA++;
		reloadKeyB++;
		showPlayerB = true;
		statusLog = 'Cenário reiniciado com banco limpo.';
		await fetchTelemetry();
	}

	function runNextStepAuto() {
		clearTimeout(autoTimer);
		if (!isPlaying) return;

		autoTimer = setTimeout(async () => {
			if (!isPlaying) return;

			// Executa o passo atual
			await executeStep(currentStep);

			// Se atingiu o final
			if (currentStep >= steps.length - 1) {
				isPlaying = false;
				statusLog = 'Todos os passos foram concluídos com sucesso.';
				return;
			}

			currentStep++;

			// Verifica se o próximo passo é um breakpoint
			if (breakpoints[currentStep]) {
				isPlaying = false;
				statusLog = `Pausa em Breakpoint: ${steps[currentStep].title}.`;
				return;
			}

			runNextStepAuto();
		}, intervalMs);
	}

	/**
	 * @param {number} stepId
	 */
	function toggleBreakpoint(stepId) {
		breakpoints[stepId] = !breakpoints[stepId];
	}
</script>

<svelte:head>
	<title>Bancada de Depuração Visual: Leveling Out | Programação para Jogos I</title>
</svelte:head>

{#if !isAuthChecked}
	<!-- Estado transitório de verificação de sessão -->
	<div
		class="font-code flex min-h-screen items-center justify-center bg-[#0d0d10] text-xs text-zinc-400"
	>
		<div class="flex items-center gap-2">
			<Icon icon="lucide:loader-2" class="h-4 w-4 animate-spin text-rose-400" />
			<span>Verificando credenciais de desenvolvedor...</span>
		</div>
	</div>
{:else if !isAuthenticated}
	<!-- Portão de Acesso Exclusivo (Auth Gate) -->
	<div
		class="flex min-h-screen flex-col items-center justify-center bg-[#0d0d10] p-6 text-zinc-200"
	>
		<div class="w-full max-w-md rounded-xl border border-zinc-800 bg-[#141417] p-8 shadow-2xl">
			<div class="flex items-center gap-3 border-b border-zinc-800 pb-5">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-950/40"
				>
					<Icon icon="lucide:shield-alert" class="h-5 w-5 text-rose-400" />
				</div>
				<div>
					<h1 class="font-heading text-lg font-bold text-zinc-100">Acesso Restrito ao Depurador</h1>
					<p class="font-code text-xs text-zinc-400">Autenticação de Desenvolvedor Verificado</p>
				</div>
			</div>

			<p class="font-body mt-4 text-xs leading-relaxed text-zinc-400">
				Esta bancada executa simulações de concorrência e comandos de expurgo na base de dados.
				Informe credenciais com privilégio verificado no PocketBase para inicializar os módulos de
				teste.
			</p>

			{#if authError}
				<div
					class="font-code mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300"
				>
					<Icon icon="lucide:alert-circle" class="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
					<span>{authError}</span>
				</div>
			{/if}

			<form
				onsubmit={handleLogin}
				class="font-code mt-6 flex flex-col gap-4 text-xs"
				id="dev-login-form"
			>
				<div class="flex flex-col gap-1.5">
					<label for="dev-email" class="font-medium text-zinc-300">E-mail de Desenvolvedor</label>
					<input
						id="dev-email"
						type="email"
						required
						bind:value={authEmail}
						placeholder="usuario@dominio.com"
						class="rounded-lg border border-zinc-700 bg-zinc-900/90 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 transition outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="dev-password" class="font-medium text-zinc-300">Senha</label>
					<input
						id="dev-password"
						type="password"
						required
						bind:value={authPassword}
						placeholder="Senha cadastrada no PocketBase"
						class="rounded-lg border border-zinc-700 bg-zinc-900/90 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 transition outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
					/>
				</div>

				<button
					type="submit"
					disabled={isLoggingIn}
					class="mt-2 flex items-center justify-center gap-2 rounded-lg border border-rose-500/50 bg-rose-600/20 px-4 py-2.5 font-semibold text-rose-300 transition hover:bg-rose-600/30 disabled:opacity-50"
					id="btn-login-dev"
				>
					{#if isLoggingIn}
						<Icon icon="lucide:loader-2" class="h-4 w-4 animate-spin text-rose-400" />
						<span>Autenticando sessão...</span>
					{:else}
						<Icon icon="lucide:key-round" class="h-4 w-4 text-rose-400" />
						<span>Acessar Bancada de Depuração</span>
					{/if}
				</button>
			</form>

			<div
				class="font-code mt-6 flex items-center justify-between border-t border-zinc-800/80 pt-4 text-[11px] text-zinc-400"
			>
				<span>PocketBase: {getBackendUrl()}</span>
				<a href={resolve('/')} class="text-zinc-400 transition hover:text-zinc-200"
					>Retornar à página inicial</a
				>
			</div>
		</div>
	</div>
{:else}
	<!-- Interface Principal da Bancada Autenticada -->
	<div class="flex min-h-screen flex-col bg-[#0d0d10] text-zinc-200" id="debugger-container">
		<!-- Barra de Ferramentas do Depurador (HUD) -->
		<header
			class="sticky top-0 z-50 border-b border-zinc-800 bg-[#141417]/95 px-6 py-4 backdrop-blur-md"
			id="debugger-hud"
		>
			<div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
				<!-- Título e Identificação -->
				<div class="flex items-center gap-3">
					<Icon icon="game-icons:test-tubes" class="h-6 w-6 text-rose-500" />
					<div>
						<h1 class="font-heading text-base font-bold text-zinc-100">
							Bancada de Depuração Visual: Leveling Out
						</h1>
						<p class="font-code text-xs text-zinc-400">
							Sala: <span class="font-semibold text-rose-400">{roomCode}</span> | Modo: Simulação Concorrente
						</p>
					</div>
				</div>

				<!-- Controles Principais estilo IDE -->
				<div class="flex flex-wrap items-center gap-2">
					{#if !isPlaying}
						<button
							onclick={handlePlay}
							class="font-code flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-900/60"
							title="Executar simulação contínua com pausas em breakpoints"
							id="btn-debugger-play"
						>
							<Icon icon="lucide:play" class="h-3.5 w-3.5" />
							<span>Continuar</span>
						</button>
					{:else}
						<button
							onclick={handlePause}
							class="font-code flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-900/60"
							title="Pausar execução"
							id="btn-debugger-pause"
						>
							<Icon icon="lucide:pause" class="h-3.5 w-3.5" />
							<span>Pausar</span>
						</button>
					{/if}

					<button
						onclick={handleStepOver}
						class="font-code flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
						title="Avançar exatamente um passo"
						id="btn-debugger-step"
					>
						<Icon icon="lucide:step-forward" class="h-3.5 w-3.5" />
						<span>Avançar Passo</span>
					</button>

					<button
						onclick={handleRepeatStep}
						class="font-code flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-700"
						title="Repetir o passo atual"
					>
						<Icon icon="lucide:rotate-ccw" class="h-3.5 w-3.5" />
						<span>Repetir</span>
					</button>

					<button
						onclick={handleResetScenario}
						class="font-code flex items-center gap-1.5 rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-900/40"
						title="Resetar banco e reiniciar ambos os clientes"
					>
						<Icon icon="lucide:trash-2" class="h-3.5 w-3.5" />
						<span>Reiniciar</span>
					</button>

					<!-- Botão de Bloqueio do Canvas (Overlay Shroud) -->
					<button
						onclick={() => (isCanvasLocked = !isCanvasLocked)}
						class="font-code flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition {isCanvasLocked
							? 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50'
							: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50'}"
						title={isCanvasLocked
							? 'Desbloquear interação manual com o canvas'
							: 'Bloquear interação manual com o canvas'}
						id="btn-toggle-lock"
					>
						{#if isCanvasLocked}
							<Icon icon="lucide:lock" class="h-3.5 w-3.5 text-amber-400" />
							<span>Canvas Travado</span>
						{:else}
							<Icon icon="lucide:unlock" class="h-3.5 w-3.5 text-emerald-400" />
							<span>Canvas Liberado</span>
						{/if}
					</button>
				</div>

				<!-- Velocidade e Sessão de Desenvolvedor -->
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-3 border-l border-zinc-800 pl-4">
						<Icon icon="lucide:clock" class="h-4 w-4 text-zinc-400" />
						<div class="flex flex-col">
							<div class="font-code flex items-center justify-between text-[11px] text-zinc-400">
								<span>Intervalo:</span>
								<span class="font-bold text-zinc-200">{intervalMs}ms</span>
							</div>
							<input
								type="range"
								min="500"
								max="5000"
								step="250"
								bind:value={intervalMs}
								class="h-1.5 w-24 cursor-pointer accent-rose-500"
							/>
						</div>
					</div>

					<div
						class="font-code flex items-center gap-2 border-l border-zinc-800 pl-4 text-xs text-zinc-400"
					>
						<Icon icon="lucide:user-check" class="h-4 w-4 text-emerald-400" />
						<span class="max-w-[130px] truncate text-zinc-300" title={currentUserEmail}
							>{currentUserEmail}</span
						>
						<button
							onclick={handleLogout}
							class="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-white"
							title="Encerrar sessão de desenvolvedor"
							id="btn-logout"
						>
							<Icon icon="lucide:log-out" class="h-3 w-3" />
							<span>Sair</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Status Log e Etapa Atual -->
			<div
				class="font-code mx-auto mt-3 flex max-w-7xl items-center justify-between border-t border-zinc-800/80 pt-2 text-xs"
			>
				<div class="flex items-center gap-2">
					<span class="text-zinc-400">Progresso:</span>
					<span class="font-semibold text-rose-400">{currentStep + 1} de {steps.length}</span>
					<span class="text-zinc-500">|</span>
					<span class="text-zinc-300">{statusLog}</span>
				</div>

				<div class="flex items-center gap-4 text-zinc-400">
					<span
						>PocketBase: <strong class="text-emerald-400"
							>{dbSala ? 'Conectado' : 'Aguardando'}</strong
						></span
					>
					<span
						>Rodada no BD: <strong class="text-zinc-200">{dbSala ? dbSala.rodada_atual : 1}</strong
						></span
					>
					<span
						>Placar BD: <strong class="text-rose-400">A={dbSala ? dbSala.placar_a : 0}</strong> vs
						<strong class="text-blue-400">B={dbSala ? dbSala.placar_b : 0}</strong></span
					>
				</div>
			</div>
		</header>

		<!-- Timeline Horizontal de Passos com Breakpoints -->
		<section class="border-b border-zinc-800/90 bg-[#101013] px-6 py-2.5">
			<div class="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto pb-1 text-xs">
				{#each steps as s (s.id)}
					<div
						class="font-code flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition {currentStep ===
						s.id
							? 'border-rose-500/80 bg-rose-950/30 text-rose-300 shadow-sm'
							: 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'}"
					>
						<!-- Botão de Toggle do Breakpoint (sem indicadores circulares) -->
						<button
							onclick={() => toggleBreakpoint(s.id)}
							class="flex items-center justify-center text-xs transition"
							title={breakpoints[s.id] ? 'Remover breakpoint' : 'Adicionar breakpoint'}
						>
							{#if breakpoints[s.id]}
								<Icon icon="lucide:pause-octagon" class="h-3.5 w-3.5 text-rose-500" />
							{:else}
								<Icon icon="lucide:square" class="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400" />
							{/if}
						</button>

						<button
							onclick={() => {
								handlePause();
								currentStep = s.id;
								executeStep(s.id);
							}}
							class="text-left font-medium"
						>
							{s.title.split(':')[0]}
						</button>
					</div>
				{/each}
			</div>
		</section>

		<!-- Viewport Duplo Lado a Lado (Dois Clientes Simultâneos) -->
		<main class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:p-6">
			<div class="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
				<!-- Painel do Jogador A -->
				<div class="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#141417]">
					<div
						class="font-code flex items-center justify-between border-b border-zinc-800 bg-[#18181c] px-4 py-2.5 text-xs"
					>
						<div class="flex items-center gap-2">
							<Icon icon="game-icons:rock" class="h-4 w-4 text-rose-400" />
							<strong class="font-heading text-zinc-100">Jogador A (Equipe A)</strong>
						</div>
						<div class="flex items-center gap-2 text-zinc-400">
							<span>ID: <code class="text-zinc-300">#debug_a</code></span>
							<button
								onclick={() => reloadKeyA++}
								class="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] hover:bg-zinc-700"
								title="Recarregar apenas este cliente"
							>
								Recarregar
							</button>
						</div>
					</div>

					<div class="relative flex h-115 w-full items-center justify-center bg-[#0a0a0c]">
						{#key reloadKeyA}
							<P5Frame
								sketch={project}
								{roomCode}
								playerId="player_debug_a"
								className="h-full w-full"
							/>
						{/key}

						<!-- Overlay Shroud Físico de Bloqueio -->
						{#if isCanvasLocked}
							<div
								class="absolute inset-0 z-20 flex cursor-not-allowed flex-col items-center justify-center bg-black/35 backdrop-blur-[1px] transition-all select-none"
								data-testid="canvas-overlay-a"
							>
								<div
									class="font-code pointer-events-none flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-200 shadow-xl"
								>
									<Icon icon="lucide:lock" class="h-4 w-4 text-amber-400" />
									<span>Interação manual bloqueada</span>
								</div>
								<p class="font-code pointer-events-none mt-2 text-[11px] text-zinc-400">
									Utilize os botões da barra superior para conduzir a simulação
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Painel do Jogador B -->
				<div class="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#141417]">
					<div
						class="font-code flex items-center justify-between border-b border-zinc-800 bg-[#18181c] px-4 py-2.5 text-xs"
					>
						<div class="flex items-center gap-2">
							<Icon icon="game-icons:paper" class="h-4 w-4 text-blue-400" />
							<strong class="font-heading text-zinc-100">Jogador B (Equipe B)</strong>
						</div>
						<div class="flex items-center gap-2 text-zinc-400">
							<span>ID: <code class="text-zinc-300">#debug_b</code></span>
							<button
								onclick={() => {
									showPlayerB = !showPlayerB;
									if (showPlayerB) reloadKeyB++;
								}}
								class="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] hover:bg-zinc-700"
								title={showPlayerB ? 'Desconectar este jogador' : 'Reconectar este jogador'}
							>
								{showPlayerB ? 'Desconectar' : 'Reconectar'}
							</button>
						</div>
					</div>

					<div class="relative flex h-115 w-full items-center justify-center bg-[#0a0a0c]">
						{#if showPlayerB}
							{#key reloadKeyB}
								<P5Frame
									sketch={project}
									{roomCode}
									playerId="player_debug_b"
									className="h-full w-full"
								/>
							{/key}

							<!-- Overlay Shroud Físico de Bloqueio -->
							{#if isCanvasLocked}
								<div
									class="absolute inset-0 z-20 flex cursor-not-allowed flex-col items-center justify-center bg-black/35 backdrop-blur-[1px] transition-all select-none"
									data-testid="canvas-overlay-b"
								>
									<div
										class="font-code pointer-events-none flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-200 shadow-xl"
									>
										<Icon icon="lucide:lock" class="h-4 w-4 text-amber-400" />
										<span>Interação manual bloqueada</span>
									</div>
									<p class="font-code pointer-events-none mt-2 text-[11px] text-zinc-400">
										Utilize os botões da barra superior para conduzir a simulação
									</p>
								</div>
							{/if}
						{:else}
							<div
								class="font-code flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-zinc-500"
							>
								<Icon icon="lucide:wifi-off" class="h-8 w-8 text-zinc-600" />
								<span>Cliente B desconectado (em segundo plano ou offline).</span>
								<button
									onclick={() => {
										showPlayerB = true;
										reloadKeyB++;
									}}
									class="mt-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 font-semibold text-zinc-200 hover:bg-zinc-700"
								>
									Retomar Conexão
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Detalhe da Etapa Selecionada -->
			<div class="font-code rounded-xl border border-zinc-800/80 bg-[#141417] px-4 py-3 text-xs">
				<div class="flex items-center justify-between text-zinc-400">
					<span class="font-bold text-zinc-200">{steps[currentStep].title}</span>
					<span
						>Breakpoint ativo: <strong
							class={breakpoints[currentStep] ? 'text-rose-400' : 'text-zinc-500'}
							>{breakpoints[currentStep] ? 'SIM' : 'NÃO'}</strong
						></span
					>
				</div>
				<p class="mt-1 text-zinc-400">{steps[currentStep].desc}</p>
			</div>
		</main>
	</div>
{/if}
