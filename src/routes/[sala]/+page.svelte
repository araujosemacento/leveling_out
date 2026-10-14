<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { getBackendUrl } from '$lib/config/backend';
	import { GameEngine, type LobbyTeamChoice } from '$lib/engine';
	import IconVial from '~icons/game-icons/vial';
	import IconCrowDive from '~icons/game-icons/crow-dive';
	import IconRollingDices from '~icons/game-icons/rolling-dices';
	import IconEagleEmblem from '~icons/game-icons/eagle-emblem';
	import IconUser from '~icons/lucide/user';
	import IconCrown from '~icons/lucide/crown';
	import IconPlay from '~icons/lucide/play';
	import IconCheck from '~icons/lucide/check';
	import IconCopy from '~icons/lucide/copy';
	import IconAlertCircle from '~icons/lucide/alert-circle';
	import IconSwords from '~icons/lucide/swords';

	let { data } = $props<{ data: { roomCode: string } }>();
	let roomCode = $derived(data.roomCode);

	let playerName = $state('Jogador');
	let localPlayerId = $state('');
	let jogadorRecordId = $state('');
	let copied = $state(false);
	let avisoTemporario = $state('');
	let avisoTimeout: ReturnType<typeof setTimeout> | null = null;
	let isStartingMatch = $state(false);
	let backendUrl = $state('http://localhost:8090');

	// Instância desacoplada da GameEngine
	let engine = $state<GameEngine | null>(null);
	let gameState = $state<any>(null);

	// Projeção reativa do Lobby via GameEngine
	let lobby = $derived(engine && gameState ? engine.getLobbyProjection(localPlayerId) : null);

	let unsubscribeEngine: (() => void) | null = null;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let eventSource: EventSource | null = null;

	function mostrarAviso(msg: string) {
		avisoTemporario = msg;
		if (avisoTimeout) clearTimeout(avisoTimeout);
		avisoTimeout = setTimeout(() => {
			avisoTemporario = '';
		}, 3500);
	}

	onMount(() => {
		backendUrl = getBackendUrl();

		if (typeof window !== 'undefined') {
			playerName = window.sessionStorage.getItem('playerName') || 'Jogador';

			let savedPlayerId = window.sessionStorage.getItem('playerId');
			if (!savedPlayerId) {
				savedPlayerId = 'p_' + Math.random().toString(36).substring(2, 10);
				window.sessionStorage.setItem('playerId', savedPlayerId);
			}
			localPlayerId = savedPlayerId;

			// Inicializa motor canônico com o jogador local imediatamente
			const newEngine = new GameEngine(roomCode);
			newEngine.setPlayer(localPlayerId, playerName, 'ALEATORIO', true);
			unsubscribeEngine = newEngine.subscribe((nextState) => {
				gameState = nextState;
			});
			engine = newEngine;
			gameState = newEngine.getState();

			// Inicializa presença e sincronização no PocketBase
			inicializarSessaoPocketBase();

			// Polling suave defensivo de reconciliação (a cada 2.5s enquanto no lobby)
			pollingInterval = setInterval(() => {
				if (gameState?.fase === 'LOBBY') {
					reconciliarSala();
				}
			}, 2500);
		}
	});

	onDestroy(() => {
		if (unsubscribeEngine) unsubscribeEngine();
		if (pollingInterval) clearInterval(pollingInterval);
		if (eventSource) eventSource.close();
		if (avisoTimeout) clearTimeout(avisoTimeout);
	});

	async function inicializarSessaoPocketBase() {
		try {
			// 1. Tenta carregar snapshot da sala
			await reconciliarSala();

			// 2. Registra o jogador na sala se não existir
			await registrarJogadorSeNecessario();

			// 3. Conecta no realtime SSE do PocketBase
			conectarRealtimePocketBase();
		} catch (err) {
			console.warn('[LOBBY] Aviso na inicialização de rede:', err);
		}
	}

	async function reconciliarSala() {
		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/snapshot`
			);
			if (res.ok) {
				const snapshot = await res.json();
				if (snapshot && engine) {
					engine.reconcileFullSync({
						sala: {
							codigo: snapshot.salaCodigo,
							fase: snapshot.fase,
							host_id: snapshot.hostId,
							placar_a: snapshot.placarA,
							placar_b: snapshot.placarB,
							equipe_da_vez: snapshot.equipeAtiva,
							rodada_atual: snapshot.rodadaAtual,
							vencedor: snapshot.vencedor
						},
						jogadores: (snapshot.jogadores || []).map((j: any) => ({
							id: j.playerId || j.id,
							nome: j.nome,
							equipe: (j.equipe || 'ALEATORIO') as LobbyTeamChoice,
							isOnline: true,
							isHost: Boolean(j.isHost)
						}))
					});

					// Encontra o registro deste jogador para salvar o id de banco
					const me = (snapshot.jogadores || []).find(
						(j: any) => j.playerId === localPlayerId || j.id === localPlayerId
					);
					if (me && me.id) {
						jogadorRecordId = me.id;
					}
				}
			} else if (res.status === 404) {
				// Cria a sala no servidor
				await criarSalaNoPocketBase();
			}
		} catch (err) {
			console.error('[LOBBY] Erro ao reconciliar snapshot da sala:', err);
		}
	}

	async function criarSalaNoPocketBase() {
		try {
			const res = await fetch(`${backendUrl}/api/collections/salas/records`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					codigo: roomCode,
					fase: 'LOBBY',
					placar_a: 0,
					placar_b: 0,
					rodada: 1,
					host_id: localPlayerId
				})
			});
			if (res.ok) {
				await reconciliarSala();
			}
		} catch (err) {
			console.error('[LOBBY] Falha ao criar sala no backend:', err);
		}
	}

	async function registrarJogadorSeNecessario() {
		try {
			// Busca jogadores já registrados na sala
			const resList = await fetch(
				`${backendUrl}/api/collections/jogadores/records?filter=(sala_codigo='${encodeURIComponent(roomCode)}')`
			);
			if (resList.ok) {
				const dataList = await resList.json();
				const itens = dataList.items || [];
				const jaExiste = itens.find((j: any) => j.player_id === localPlayerId);

				if (jaExiste) {
					jogadorRecordId = jaExiste.id;
					if (engine) {
						engine.setPlayer(
							localPlayerId,
							jaExiste.nome,
							jaExiste.equipe as LobbyTeamChoice,
							jaExiste.is_host
						);
					}
					return;
				}

				// Se a sala já tiver 4 jogadores, bloqueia novo cadastro
				if (itens.length >= 4) {
					mostrarAviso('Esta sala já atingiu a capacidade máxima de 4 jogadores.');
					return;
				}

				// Cadastra o jogador com equipe inicial ALEATORIO
				const resCreate = await fetch(`${backendUrl}/api/collections/jogadores/records`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						sala_codigo: roomCode,
						player_id: localPlayerId,
						nome: playerName,
						equipe: 'ALEATORIO'
					})
				});

				if (resCreate.ok) {
					const novoRecord = await resCreate.json();
					jogadorRecordId = novoRecord.id;
					if (engine) {
						engine.setPlayer(localPlayerId, playerName, 'ALEATORIO', novoRecord.is_host);
					}
					await reconciliarSala();
				}
			}
		} catch (err) {
			console.error('[LOBBY] Erro ao registrar presença do jogador:', err);
		}
	}

	function conectarRealtimePocketBase() {
		try {
			if (eventSource) eventSource.close();
			// Assina SSE padrão do PocketBase
			eventSource = new EventSource(`${backendUrl}/api/realtime`);
			eventSource.addEventListener('PB_CONNECT', async (e: MessageEvent) => {
				const dataParsed = JSON.parse(e.data);
				const clientId = dataParsed.clientId;
				if (clientId) {
					// Subscreve às coleções de salas e jogadores
					await fetch(`${backendUrl}/api/realtime`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							clientId,
							subscriptions: ['salas/*', 'jogadores/*']
						})
					});
				}
			});

			eventSource.onmessage = (e) => {
				try {
					const msg = JSON.parse(e.data);
					if (msg.action === 'create' || msg.action === 'update' || msg.action === 'delete') {
						reconciliarSala();
					}
				} catch {
					// ignora keep-alives não JSON
				}
			};

			eventSource.onerror = () => {
				// Fallback contínuo via polling já está ativo
			};
		} catch (err) {
			console.warn('[LOBBY] Não foi possível abrir SSE, polling ativo:', err);
		}
	}

	async function solicitarTrocaEquipe(targetEquipe: LobbyTeamChoice) {
		if (!lobby) return;

		// Se já está na equipe selecionada, não faz nada
		if (lobby.minhaEquipe === targetEquipe) return;

		// Valida quórum e lotação máxima de 2 integrantes por equipe
		if (targetEquipe === 'A' && !lobby.podeEscolherCorvo) {
			mostrarAviso('A Equipe Corvo já atingiu a lotação máxima de 2 integrantes.');
			return;
		}
		if (targetEquipe === 'B' && !lobby.podeEscolherAguia) {
			mostrarAviso('A Equipe Águia já atingiu a lotação máxima de 2 integrantes.');
			return;
		}

		// Atualização otimista na máquina de estados cliente
		if (engine) {
			engine.selectTeam(localPlayerId, targetEquipe);
		}

		// Disparo autoritativo para o PocketBase
		if (jogadorRecordId) {
			try {
				const res = await fetch(
					`${backendUrl}/api/collections/jogadores/records/${jogadorRecordId}`,
					{
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ equipe: targetEquipe })
					}
				);
				if (!res.ok) {
					const errBody = await res.json();
					mostrarAviso(errBody.message || 'Não foi possível alterar de equipe.');
					await reconciliarSala();
				} else {
					await reconciliarSala();
				}
			} catch (err) {
				console.error('[LOBBY] Erro ao persistir equipe no servidor:', err);
				await reconciliarSala();
			}
		}
	}

	async function handleIniciarPartida() {
		if (!lobby || !lobby.podeIniciarPartida || isStartingMatch) return;

		isStartingMatch = true;
		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/iniciar`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Player-Id': localPlayerId
					},
					body: JSON.stringify({ playerId: localPlayerId })
				}
			);

			if (res.ok) {
				if (engine) {
					engine.startMatch();
				}
				await reconciliarSala();
			} else {
				const errData = await res.json();
				mostrarAviso(errData.message || 'Erro ao iniciar a partida.');
			}
		} catch (err) {
			console.error('[LOBBY] Falha na requisição de início:', err);
			mostrarAviso('Falha de conexão com o servidor ao iniciar a partida.');
		} finally {
			isStartingMatch = false;
		}
	}

	async function copyRoomLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch (e) {
			console.error('Falha ao copiar link:', e);
		}
	}
</script>

<svelte:head>
	<title>Lobby : Sala {roomCode} | Leveling Out</title>
</svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
	<!-- Barra Superior de Status da Sala -->
	<header
		class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-surface px-5 py-4 shadow-sm"
	>
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
				<IconVial class="h-5 w-5" />
			</div>
			<div class="flex flex-col">
				<span class="font-util-heading text-xs leading-none text-text-muted">
					Partida Multiplayer : Lobby
				</span>
				<span
					class="mt-1 flex items-baseline gap-1.5 font-util-heading text-base font-bold text-text-primary"
				>
					<span>Sala:</span>
					<strong class="font-code text-accent">{roomCode}</strong>
				</span>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<!-- Identificação do Jogador -->
			<div
				class="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-base px-3.5 py-1.5 text-xs text-text-primary"
			>
				{#if lobby?.isHost}
					<span title="Você é o Anfitrião da Sala" class="flex items-center">
						<IconCrown class="h-3.5 w-3.5 text-amber-500" />
					</span>
				{:else}
					<IconUser class="h-3.5 w-3.5 text-text-muted" />
				{/if}
				<span class="font-util-body leading-none font-semibold">{playerName}</span>
				{#if lobby?.isHost}
					<span
						class="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400"
					>
						Host
					</span>
				{/if}
			</div>

			<!-- Botão de Copiar Link -->
			<button
				onclick={copyRoomLink}
				class="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-surface-soft px-3.5 py-2 font-util-heading text-xs leading-none font-semibold text-accent transition hover:bg-bg-surface-elevated"
				title="Copiar link para convidar colegas de equipe"
			>
				{#if copied}
					<span class="text-tertiary">Link Copiado!</span>
					<IconCheck class="h-3.5 w-3.5 text-tertiary" />
				{:else}
					<span>Copiar Link</span>
					<IconCopy class="h-3.5 w-3.5" />
				{/if}
			</button>
		</div>
	</header>

	<!-- Feedback de Aviso Temporário -->
	{#if avisoTemporario}
		<div
			class="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300"
		>
			<IconAlertCircle class="h-4 w-4 shrink-0" />
			<span>{avisoTemporario}</span>
		</div>
	{/if}

	{#if gameState?.fase === 'LOBBY'}
		<!-- Arena Central: Painel Tripartite de Escolha de Equipes -->
		<main class="flex flex-col gap-6">
			<!-- Título Contextual e Contagem de Quórum -->
			<div class="flex flex-col items-center text-center">
				<h1 class="font-display text-2xl text-text-primary sm:text-3xl">Distribuição de Equipes</h1>
				<p class="mt-1 font-subheading text-xs text-text-muted sm:text-sm">
					{lobby?.statusTexto || 'Aguardando sincronização de rede...'}
				</p>
			</div>

			<!-- Grade Tripartite de 3 Caixas: Corvo, Aleatório e Águia -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<!-- 1. Caixa Equipe Corvo (Índigo / Accent) -->
				<button
					type="button"
					onclick={() => solicitarTrocaEquipe('A')}
					class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
					'A'
						? 'border-accent bg-accent-soft/40 shadow-md ring-2 ring-accent ring-offset-2 ring-offset-bg-base'
						: 'border-border-subtle bg-bg-surface hover:border-accent/40 hover:bg-accent-soft/10'} p-5"
				>
					<!-- Watermark Sutil Centralizada -->
					<div
						class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
					>
						<IconCrowDive class="h-56 w-56 -rotate-12 text-accent" />
					</div>

					<!-- Cabeçalho da Equipe Corvo -->
					<div
						class="relative z-10 flex items-center justify-between border-b border-border-subtle/50 pb-3"
					>
						<div class="flex items-center gap-2.5">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
								<IconCrowDive class="h-5 w-5" />
							</div>
							<div>
								<h2 class="font-display text-base font-bold text-accent">Equipe Corvo</h2>
								<span class="font-util-heading text-[11px] text-text-muted">Estandarte A</span>
							</div>
						</div>
						<span
							class="rounded-lg bg-accent-soft px-2 py-0.5 font-code text-xs font-bold text-accent"
						>
							{lobby?.membrosCorvo.length || 0}/2
						</span>
					</div>

					<!-- Lista de Membros da Equipe Corvo -->
					<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
						{#each lobby?.membrosCorvo || [] as membro (membro.id)}
							<div
								class="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface-elevated px-3 py-2.5 shadow-xs"
							>
								<div class="flex items-center gap-2">
									<IconUser class="h-4 w-4 text-accent" />
									<span class="font-util-body text-xs font-semibold text-text-primary">
										{membro.nome}
									</span>
									{#if membro.id === localPlayerId}
										<span
											class="rounded-md bg-accent/15 px-1.5 py-0.5 font-util-heading text-[10px] font-bold text-accent"
										>
											Você
										</span>
									{/if}
								</div>
								{#if membro.isHost}
									<span title="Anfitrião da Sala" class="flex items-center">
										<IconCrown class="h-4 w-4 text-amber-500" />
									</span>
								{/if}
							</div>
						{/each}

						<!-- Slots de Vagas Disponíveis -->
						{#if (lobby?.membrosCorvo.length || 0) < 2}
							{#each Array.from({ length: 2 - (lobby?.membrosCorvo.length || 0) }, (_, i) => i) as slotIdx (slotIdx)}
								<div
									class="flex items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/60 py-3 text-center"
								>
									<span class="font-util-heading text-xs font-medium text-text-muted">
										+ Vaga livre
									</span>
								</div>
							{/each}
						{/if}
					</div>

					<!-- Rodapé Informativo da Caixa Corvo -->
					<div class="relative z-10 mt-4 pt-2 text-center">
						{#if lobby?.minhaEquipe === 'A'}
							<span class="font-util-heading text-xs font-bold text-accent">
								Sua equipe atual
							</span>
						{:else if !lobby?.podeEscolherCorvo}
							<span class="font-util-heading text-xs font-medium text-text-muted">
								Equipe lotada
							</span>
						{:else}
							<span
								class="font-util-heading text-xs font-medium text-text-muted group-hover:text-accent"
							>
								Clique para entrar
							</span>
						{/if}
					</div>
				</button>

				<!-- 2. Caixa Neutra de Sorteio Aleatório (Tons de Cinza / Indecisos) -->
				<button
					type="button"
					onclick={() => solicitarTrocaEquipe('ALEATORIO')}
					class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
					'ALEATORIO'
						? 'border-text-muted/60 bg-bg-surface-elevated shadow-md ring-2 ring-text-muted ring-offset-2 ring-offset-bg-base'
						: 'border-border-subtle bg-bg-surface-soft/40 hover:border-text-muted/40 hover:bg-bg-surface-soft'} p-5"
				>
					<!-- Watermark Sutil de Dados -->
					<div
						class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
					>
						<IconRollingDices class="h-52 w-52 text-text-muted" />
					</div>

					<!-- Cabeçalho da Caixa Aleatória -->
					<div
						class="relative z-10 flex items-center justify-between border-b border-border-subtle/50 pb-3"
					>
						<div class="flex items-center gap-2.5">
							<div
								class="text-text-secondary flex h-8 w-8 items-center justify-center rounded-lg bg-bg-surface-elevated"
							>
								<IconRollingDices class="h-5 w-5" />
							</div>
							<div>
								<h2 class="text-text-secondary font-display text-base font-bold">Aleatório</h2>
								<span class="font-util-heading text-[11px] text-text-muted"
									>Sorteio estocástico</span
								>
							</div>
						</div>
						<span
							class="rounded-lg bg-bg-surface-elevated px-2 py-0.5 font-code text-xs font-bold text-text-muted"
						>
							{lobby?.membrosAleatorio.length || 0}
						</span>
					</div>

					<!-- Lista de Participantes em Aleatório -->
					<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
						{#each lobby?.membrosAleatorio || [] as membro (membro.id)}
							<div
								class="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 shadow-xs"
							>
								<div class="flex items-center gap-2">
									<IconUser class="h-4 w-4 text-text-muted" />
									<span class="font-util-body text-xs font-semibold text-text-primary">
										{membro.nome}
									</span>
									{#if membro.id === localPlayerId}
										<span
											class="text-text-secondary rounded-md bg-text-muted/15 px-1.5 py-0.5 font-util-heading text-[10px] font-bold"
										>
											Você
										</span>
									{/if}
								</div>
								{#if membro.isHost}
									<span title="Anfitrião da Sala" class="flex items-center">
										<IconCrown class="h-4 w-4 text-amber-500" />
									</span>
								{/if}
							</div>
						{/each}

						{#if (lobby?.membrosAleatorio.length || 0) === 0}
							<div
								class="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/40 p-4 text-center"
							>
								<span class="font-util-body text-xs text-text-muted">
									Nenhum jogador indeciso no momento.
								</span>
								<span class="mt-1 font-util-body text-[11px] text-text-muted/70">
									Quem estiver aqui será balanceado pelo servidor no início.
								</span>
							</div>
						{/if}
					</div>

					<!-- Rodapé Informativo da Caixa Aleatória -->
					<div class="relative z-10 mt-4 pt-2 text-center">
						{#if lobby?.minhaEquipe === 'ALEATORIO'}
							<span class="text-text-secondary font-util-heading text-xs font-bold">
								Você será sorteado
							</span>
						{:else}
							<span class="font-util-heading text-xs font-medium text-text-muted">
								Clique para ser sorteado
							</span>
						{/if}
					</div>
				</button>

				<!-- 3. Caixa Equipe Águia (Âmbar / Secondary) -->
				<button
					type="button"
					onclick={() => solicitarTrocaEquipe('B')}
					class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
					'B'
						? 'border-secondary bg-secondary-soft/40 shadow-md ring-2 ring-secondary ring-offset-2 ring-offset-bg-base'
						: 'border-border-subtle bg-bg-surface hover:border-secondary/40 hover:bg-secondary-soft/10'} p-5"
				>
					<!-- Watermark Sutil Centralizada -->
					<div
						class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
					>
						<IconEagleEmblem class="h-56 w-56 rotate-12 text-secondary" />
					</div>

					<!-- Cabeçalho da Equipe Águia -->
					<div
						class="relative z-10 flex items-center justify-between border-b border-border-subtle/50 pb-3"
					>
						<div class="flex items-center gap-2.5">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white"
							>
								<IconEagleEmblem class="h-5 w-5" />
							</div>
							<div>
								<h2 class="font-display text-base font-bold text-secondary">Equipe Águia</h2>
								<span class="font-util-heading text-[11px] text-text-muted">Estandarte B</span>
							</div>
						</div>
						<span
							class="rounded-lg bg-secondary-soft px-2 py-0.5 font-code text-xs font-bold text-secondary"
						>
							{lobby?.membrosAguia.length || 0}/2
						</span>
					</div>

					<!-- Lista de Membros da Equipe Águia -->
					<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
						{#each lobby?.membrosAguia || [] as membro (membro.id)}
							<div
								class="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface-elevated px-3 py-2.5 shadow-xs"
							>
								<div class="flex items-center gap-2">
									<IconUser class="h-4 w-4 text-secondary" />
									<span class="font-util-body text-xs font-semibold text-text-primary">
										{membro.nome}
									</span>
									{#if membro.id === localPlayerId}
										<span
											class="rounded-md bg-secondary/15 px-1.5 py-0.5 font-util-heading text-[10px] font-bold text-secondary"
										>
											Você
										</span>
									{/if}
								</div>
								{#if membro.isHost}
									<span title="Anfitrião da Sala" class="flex items-center">
										<IconCrown class="h-4 w-4 text-amber-500" />
									</span>
								{/if}
							</div>
						{/each}

						<!-- Slots de Vagas Disponíveis -->
						{#if (lobby?.membrosAguia.length || 0) < 2}
							{#each Array.from({ length: 2 - (lobby?.membrosAguia.length || 0) }, (_, i) => i) as slotIdx (slotIdx)}
								<div
									class="flex items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/60 py-3 text-center"
								>
									<span class="font-util-heading text-xs font-medium text-text-muted">
										+ Vaga livre
									</span>
								</div>
							{/each}
						{/if}
					</div>

					<!-- Rodapé Informativo da Caixa Águia -->
					<div class="relative z-10 mt-4 pt-2 text-center">
						{#if lobby?.minhaEquipe === 'B'}
							<span class="font-util-heading text-xs font-bold text-secondary">
								Sua equipe atual
							</span>
						{:else if !lobby?.podeEscolherAguia}
							<span class="font-util-heading text-xs font-medium text-text-muted">
								Equipe lotada
							</span>
						{:else}
							<span
								class="font-util-heading text-xs font-medium text-text-muted group-hover:text-secondary"
							>
								Clique para entrar
							</span>
						{/if}
					</div>
				</button>
			</div>

			<!-- Painel Inferior: Ações e Botão Exclusivo do Anfitrião -->
			<div class="mt-4 flex flex-col items-center justify-center gap-4 text-center">
				{#if lobby?.isHost}
					<!-- Botão Verde de Iniciar Partida (Exclusivo do Dono da Sala) -->
					<button
						type="button"
						onclick={handleIniciarPartida}
						disabled={!lobby?.podeIniciarPartida || isStartingMatch}
						class="flex items-center gap-2 rounded-xl px-8 py-3.5 font-util-heading text-sm font-bold tracking-wide transition-all duration-200 {lobby?.podeIniciarPartida
							? 'animate-pulse cursor-pointer bg-emerald-600 text-white shadow-lg hover:bg-emerald-500 hover:shadow-xl active:scale-98'
							: 'cursor-not-allowed border border-border-subtle bg-bg-surface-elevated text-text-muted opacity-60'}"
					>
						<span>
							{isStartingMatch
								? 'Iniciando Partida...'
								: lobby?.quorumCompleto
									? 'Iniciar Partida'
									: `Aguardando 4 Jogadores (${lobby?.totalJogadores || 0}/4)`}
						</span>
						<IconPlay class="h-4 w-4" />
					</button>

					{#if !lobby?.quorumCompleto}
						<span class="font-util-body text-xs text-text-muted">
							A partida só poderá ser iniciada quando houver exatamente 4 jogadores conectados na
							sala.
						</span>
					{/if}
				{:else}
					<!-- Mensagem Receptiva para Convidados -->
					<div
						class="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-5 py-3 text-xs text-text-muted"
					>
						<IconUser class="h-4 w-4 text-text-muted" />
						{#if lobby?.quorumCompleto}
							<span class="font-semibold text-emerald-600 dark:text-emerald-400">
								Quórum de 4 jogadores completo! Aguardando o anfitrião iniciar a partida...
							</span>
						{:else}
							<span>
								Aguardando o anfitrião e mais jogadores entrarem ({lobby?.totalJogadores || 0}/4)...
							</span>
						{/if}
					</div>
				{/if}
			</div>
		</main>
	{:else}
		<!-- Fase Seguinte (Iniciativa / PPT) -->
		<main
			class="flex min-h-90 flex-col items-center justify-center rounded-2xl border border-border-subtle bg-bg-surface p-8 text-center shadow-sm"
		>
			<div
				class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"
			>
				<IconSwords class="h-7 w-7" />
			</div>

			<h2 class="font-display text-2xl text-accent sm:text-3xl">Partida em Andamento</h2>

			<p class="mt-2 max-w-md font-subheading text-sm text-text-muted">
				A partida foi iniciada com sucesso. As equipes estão definidas e o confronto inicial de
				Pedra, Papel e Tesoura para a primeira escolha de carta está pronto para começar.
			</p>
		</main>
	{/if}
</div>
