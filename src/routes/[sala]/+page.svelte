<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getBackendUrl, getProxySecret, getApiHeaders } from '$lib/config/backend';
	import { GameEngine, type LobbyTeamChoice } from '$lib/engine';
	import { sanitizeNickname } from '$lib/engine/input/sanitize';

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
	import IconArrowRight from '~icons/lucide/arrow-right';
	import IconClock from '~icons/lucide/clock';
	import IconTrash2 from '~icons/lucide/trash-2';
	import IconShieldAlert from '~icons/lucide/shield-alert';

	let { data } = $props<{ data: { roomCode: string } }>();
	let roomCode = $derived(data.roomCode);

	// Estados de ciclo de vida e autoritarismo Zero Trust
	type StatusConexao = 'VERIFICANDO' | 'AGUARDANDO_APELIDO' | 'CONECTANDO' | 'CONECTADO' | 'ERRO';
	let statusConexao = $state<StatusConexao>('VERIFICANDO');
	let erroIngresso = $state('');

	let rawNickname = $state('');
	let cleanNickname = $derived(sanitizeNickname(rawNickname));

	let localPlayerId = $state('');
	let sessionToken = $state('');
	let playerName = $state('Jogador');

	let copied = $state(false);
	let avisoTemporario = $state('');
	let avisoTimeout: ReturnType<typeof setTimeout> | null = null;
	let isStartingMatch = $state(false);
	let backendUrl = $state(getBackendUrl());

	// Instância desacoplada da GameEngine
	let engine = $state<GameEngine | null>(null);
	let gameState = $state<any>(null);

	// Projeção reativa do Lobby via GameEngine
	let lobby = $derived(engine && gameState ? engine.getLobbyProjection(localPlayerId) : null);

	// Aviso para o anfitrião sobre jogadores desconectados
	let jogadorDesconectadoNome = $state<string | null>(null);
	let ignorarAvisoDesconexao = $state(false);

	let unsubscribeEngine: (() => void) | null = null;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
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
			verificarSessaoExistente();
		}
	});

	onDestroy(() => {
		pararCiclosDeRede();
	});

	function pararCiclosDeRede() {
		if (unsubscribeEngine) {
			unsubscribeEngine();
			unsubscribeEngine = null;
		}
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = null;
		}
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		if (avisoTimeout) {
			clearTimeout(avisoTimeout);
			avisoTimeout = null;
		}
	}

	/**
	 * Verifica credenciais salvas no sessionStorage.
	 * Se válidas para esta sala, realiza handshake / ping de validação antes de qualquer projeção.
	 */
	async function verificarSessaoExistente() {
		statusConexao = 'VERIFICANDO';
		erroIngresso = '';

		const savedRoom = window.sessionStorage.getItem('leveling_roomCode');
		const savedPlayerId = window.sessionStorage.getItem('leveling_playerId');
		const savedToken = window.sessionStorage.getItem('leveling_sessionToken');
		const savedName = window.sessionStorage.getItem('leveling_playerName');

		if (savedName) {
			rawNickname = savedName;
		}

		if (savedRoom === roomCode && savedPlayerId && savedToken) {
			localPlayerId = savedPlayerId;
			sessionToken = savedToken;
			playerName = savedName || 'Jogador';

			try {
				// Valida credenciais via ping no servidor
				const pingRes = await fetch(
					`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/ping`,
					{
						method: 'POST',
						headers: getApiHeaders({
							'X-Player-Id': savedPlayerId,
							'X-Session-Token': savedToken
						})
					}
				);

				if (pingRes.ok) {
					// Credenciais ativas: inicializa GameEngine e reconciliação
					await inicializarEngineEConexao();
					return;
				}
			} catch (err) {
				console.warn('[ZERO TRUST] Erro ao validar credenciais existentes:', err);
			}
		}

		// Se não há credenciais válidas, exige preenchimento do apelido via diálogo modal
		limparCredenciaisLocais();
		statusConexao = 'AGUARDANDO_APELIDO';
	}

	function limparCredenciaisLocais() {
		localPlayerId = '';
		sessionToken = '';
		if (typeof window !== 'undefined') {
			window.sessionStorage.removeItem('leveling_playerId');
			window.sessionStorage.removeItem('leveling_sessionToken');
			window.sessionStorage.removeItem('leveling_roomCode');
		}
	}

	/**
	 * Submissão autoritativa de entrada na sala.
	 * O front-end aguarda confirmação 200/201 do servidor com session_token antes de projetar o lobby.
	 */
	async function handleEntrarComApelido(e?: SubmitEvent) {
		if (e) e.preventDefault();

		const nomeValidado = cleanNickname.trim();
		if (!nomeValidado) {
			erroIngresso = 'Por favor, digite seu apelido para continuar.';
			return;
		}

		erroIngresso = '';
		statusConexao = 'CONECTANDO';

		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/entrar`,
				{
					method: 'POST',
					headers: getApiHeaders({ 'Content-Type': 'application/json' }),
					body: JSON.stringify({
						nome: nomeValidado
					})
				}
			);

			const payload = await res.json();

			if (!res.ok || !payload.success) {
				erroIngresso = payload.message || 'Não foi possível entrar na sala. Tente novamente.';
				statusConexao = 'AGUARDANDO_APELIDO';
				return;
			}

			// Armazena credenciais autoritativas
			localPlayerId = payload.playerId;
			sessionToken = payload.sessionToken;
			playerName = nomeValidado;

			if (typeof window !== 'undefined') {
				window.sessionStorage.setItem('leveling_playerId', localPlayerId);
				window.sessionStorage.setItem('leveling_sessionToken', sessionToken);
				window.sessionStorage.setItem('leveling_playerName', playerName);
				window.sessionStorage.setItem('leveling_roomCode', roomCode);
			}

			// Inicializa GameEngine e sincronização
			await inicializarEngineEConexao();
		} catch (err) {
			console.error('[ZERO TRUST] Falha de comunicação no handshake:', err);
			erroIngresso = 'Falha de conexão com o servidor. Verifique se o backend está ativo.';
			statusConexao = 'AGUARDANDO_APELIDO';
		}
	}

	async function inicializarEngineEConexao() {
		// Instancia motor canônico
		const newEngine = new GameEngine(roomCode);
		unsubscribeEngine = newEngine.subscribe((nextState) => {
			gameState = nextState;
		});
		engine = newEngine;

		// Reconciliação inicial do snapshot autoritativo
		await reconciliarSala();

		// Ativa ciclo de Heartbeats periódicos (a cada 5 segundos)
		iniciarHeartbeat();

		// Ativa polling de reconciliação de estado a cada 2.5s
		if (pollingInterval) clearInterval(pollingInterval);
		pollingInterval = setInterval(() => {
			reconciliarSala();
		}, 2500);

		// Conecta SSE para sincronização instantânea
		conectarRealtimePocketBase();

		statusConexao = 'CONECTADO';
	}

	function iniciarHeartbeat() {
		if (heartbeatInterval) clearInterval(heartbeatInterval);

		heartbeatInterval = setInterval(async () => {
			if (!localPlayerId || !sessionToken) return;

			try {
				const res = await fetch(
					`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/ping`,
					{
						method: 'POST',
						headers: getApiHeaders({
							'X-Player-Id': localPlayerId,
							'X-Session-Token': sessionToken
						})
					}
				);

				if (res.status === 401) {
					// Sessão revogada (ex: reassumida em outro dispositivo)
					pararCiclosDeRede();
					limparCredenciaisLocais();
					erroIngresso = 'Sua sessão foi encerrada ou conectada a partir de outro dispositivo.';
					statusConexao = 'AGUARDANDO_APELIDO';
				} else if (res.status === 404) {
					// Sala desfeita ou purgada
					pararCiclosDeRede();
					limparCredenciaisLocais();
					erroIngresso = 'Esta sala foi desfeita pelo anfitrião ou expirou por inatividade.';
					statusConexao = 'AGUARDANDO_APELIDO';
				}
			} catch {
				// Falha temporária de rede no ping é tolerada pelo threshold
			}
		}, 5000);
	}

	async function reconciliarSala() {
		if (!engine) return;

		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/snapshot`,
				{
					headers: getApiHeaders()
				}
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

					// Sincroniza nome local caso tenha sido normalizado
					const me = (snapshot.jogadores || []).find(
						(j: any) => j.playerId === localPlayerId || j.id === localPlayerId
					);
					if (me && me.nome) {
						playerName = me.nome;
					}

					// Se a sala foi dissolvida pelo host
					if (snapshot.fase === 'FIM_JOGO' && snapshot.motivoFim === 'DISSOLVIDA_HOST') {
						pararCiclosDeRede();
						limparCredenciaisLocais();
						erroIngresso = 'A sala foi desfeita pelo anfitrião.';
						statusConexao = 'AGUARDANDO_APELIDO';
					}
				}
			} else if (res.status === 404) {
				pararCiclosDeRede();
				limparCredenciaisLocais();
				erroIngresso = 'A sala não foi encontrada ou foi removida pelo servidor.';
				statusConexao = 'AGUARDANDO_APELIDO';
			}
		} catch (err) {
			console.error('[ZERO TRUST] Erro ao reconciliar snapshot da sala:', err);
		}
	}

	function conectarRealtimePocketBase() {
		try {
			if (eventSource) eventSource.close();
			const proxySec = getProxySecret();
			const sseUrl = proxySec
				? `${backendUrl}/api/realtime?x-proxy-secret=${encodeURIComponent(proxySec)}`
				: `${backendUrl}/api/realtime`;
			eventSource = new EventSource(sseUrl);

			eventSource.addEventListener('PB_CONNECT', async (e: MessageEvent) => {
				try {
					const dataParsed = JSON.parse(e.data);
					const clientId = dataParsed.clientId;
					if (clientId) {
						await fetch(`${backendUrl}/api/realtime`, {
							method: 'POST',
							headers: getApiHeaders({ 'Content-Type': 'application/json' }),
							body: JSON.stringify({
								clientId,
								subscriptions: ['salas/*', 'jogadores/*']
							})
						});
					}
				} catch (subErr) {
					console.warn('[SSE] Erro ao registrar subscrição:', subErr);
				}
			});

			const processarAtualizacao = (e: MessageEvent) => {
				try {
					const msg = JSON.parse(e.data);
					if (msg.action === 'create' || msg.action === 'update' || msg.action === 'delete') {
						const rec = msg.record || {};
						// Atualização atômica imediata no motor de estado se for evento de equipe
						if (rec.player_id && rec.equipe && engine) {
							engine.selectTeam(rec.player_id, rec.equipe);
						}
						// Reconciliação do snapshot autoritativo para garantir integridade completa
						if (!rec.sala_codigo && !rec.codigo) {
							reconciliarSala();
						} else if (rec.sala_codigo === roomCode || rec.codigo === roomCode) {
							reconciliarSala();
						}
					}
				} catch {
					// Ignora pings de conexão ou formatos não JSON
				}
			};

			// O PocketBase despacha SSE com o nome do tópico subscrito no cabeçalho 'event:'
			eventSource.addEventListener('salas/*', processarAtualizacao);
			eventSource.addEventListener('jogadores/*', processarAtualizacao);
			eventSource.addEventListener('salas', processarAtualizacao);
			eventSource.addEventListener('jogadores', processarAtualizacao);
			eventSource.addEventListener('message', processarAtualizacao);
			eventSource.onmessage = processarAtualizacao;

			eventSource.onerror = () => {
				// Polling continua ativo como fallback resiliente
			};
		} catch (err) {
			console.warn('[LOBBY] SSE indisponível, operando via polling autoritativo:', err);
		}
	}

	async function solicitarTrocaEquipe(targetEquipe: LobbyTeamChoice) {
		if (!lobby || statusConexao !== 'CONECTADO') return;

		if (lobby.minhaEquipe === targetEquipe) return;

		if (targetEquipe === 'A' && !lobby.podeEscolherCorvo) {
			mostrarAviso('A Equipe Corvo já atingiu a lotação máxima de 2 integrantes.');
			return;
		}
		if (targetEquipe === 'B' && !lobby.podeEscolherAguia) {
			mostrarAviso('A Equipe Águia já atingiu a lotação máxima de 2 integrantes.');
			return;
		}

		// Atualização otimista local
		if (engine) {
			engine.selectTeam(localPlayerId, targetEquipe);
		}

		// Atualização autoritativa via endpoint Go com session_token
		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/equipe`,
				{
					method: 'POST',
					headers: getApiHeaders({
						'Content-Type': 'application/json',
						'X-Player-Id': localPlayerId,
						'X-Session-Token': sessionToken
					}),
					body: JSON.stringify({ equipe: targetEquipe })
				}
			);

			if (!res.ok) {
				const errBody = await res.json();
				mostrarAviso(errBody.message || 'Não foi possível alterar de equipe.');
			}
			await reconciliarSala();
		} catch (err) {
			console.error('[ZERO TRUST] Erro ao persistir equipe no servidor:', err);
			await reconciliarSala();
		}
	}

	async function handleIniciarPartida() {
		if (!lobby || !lobby.podeIniciarPartida || isStartingMatch || statusConexao !== 'CONECTADO')
			return;

		isStartingMatch = true;
		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/iniciar`,
				{
					method: 'POST',
					headers: getApiHeaders({
						'Content-Type': 'application/json',
						'X-Player-Id': localPlayerId,
						'X-Session-Token': sessionToken
					}),
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
			console.error('[ZERO TRUST] Falha na requisição de início:', err);
			mostrarAviso('Falha de conexão com o servidor ao iniciar a partida.');
		} finally {
			isStartingMatch = false;
		}
	}

	async function handleDesfazerSala() {
		if (
			!lobby?.isHost ||
			!confirm(
				'Tem certeza de que deseja desfazer esta sala? Todos os jogadores serão desconectados.'
			)
		) {
			return;
		}

		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/desfazer`,
				{
					method: 'POST',
					headers: getApiHeaders({
						'X-Player-Id': localPlayerId,
						'X-Session-Token': sessionToken
					})
				}
			);

			if (res.ok) {
				pararCiclosDeRede();
				limparCredenciaisLocais();
				goto(resolve('/'));
			} else {
				const errData = await res.json();
				mostrarAviso(errData.message || 'Falha ao desfazer a sala.');
			}
		} catch (err) {
			console.error('[HOST] Erro ao desfazer a sala:', err);
			mostrarAviso('Erro de conexão ao tentar desfazer a sala.');
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

<!-- Modal Bloqueante de Identificação do Apelido (Zero Trust Handshake) -->
{#if statusConexao === 'AGUARDANDO_APELIDO' || statusConexao === 'CONECTANDO'}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
		transition:fade={{ duration: 200 }}
	>
		<div
			class="flex w-full max-w-md flex-col items-center rounded-3xl border border-border-subtle bg-bg-base p-6 shadow-2xl sm:p-8"
			in:fly={{ y: 20, duration: 300 }}
		>
			<div
				class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
			>
				<IconVial class="h-8 w-8" />
			</div>

			<h2 class="text-center font-subheading text-xl text-text-primary sm:text-2xl">
				Identifique-se para entrar
			</h2>

			<p class="mt-1.5 text-center font-util-body text-xs text-text-muted sm:text-sm">
				Você está prestes a ingressar na sala <strong class="font-code text-accent"
					>{roomCode}</strong
				>
			</p>

			<form onsubmit={handleEntrarComApelido} class="mt-6 flex w-full flex-col items-center">
				<div class="relative w-full">
					<input
						type="text"
						bind:value={rawNickname}
						placeholder="Seu apelido..."
						maxlength="20"
						required
						autocomplete="off"
						spellcheck="false"
						disabled={statusConexao === 'CONECTANDO'}
						class="w-full border-b-2 border-border-medium bg-transparent px-3 py-3 text-center font-subheading text-2xl text-text-primary placeholder:text-text-subtle/50 focus:border-accent focus:outline-none sm:text-3xl"
					/>
				</div>

				{#if erroIngresso}
					<div
						class="mt-4 rounded-xl border border-secondary/30 bg-secondary-soft px-4 py-2.5 text-center text-xs text-secondary"
					>
						<span class="font-util-body font-semibold">{erroIngresso}</span>
					</div>
				{/if}

				<button
					type="submit"
					disabled={statusConexao === 'CONECTANDO' || !cleanNickname.trim()}
					class="btn-soft-elevated group mt-7 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-util-heading text-sm font-semibold tracking-wide disabled:pointer-events-none disabled:opacity-50"
				>
					<span
						>{statusConexao === 'CONECTANDO' ? 'Validando no servidor...' : 'Entrar na Sala'}</span
					>
					<IconArrowRight
						class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
					/>
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Estado de Verificação Inicial -->
{#if statusConexao === 'VERIFICANDO'}
	<div class="flex min-h-[60vh] flex-col items-center justify-center gap-4">
		<div
			class="h-10 w-10 animate-spin rounded-full border-3 border-accent border-t-transparent"
		></div>
		<p class="font-util-heading text-xs tracking-wider text-text-muted uppercase">
			Verificando credenciais no servidor...
		</p>
	</div>
{:else if statusConexao === 'CONECTADO'}
	<div class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
		<!-- Barra Superior de Status da Sala -->
		<header
			class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-surface px-5 py-4 shadow-sm"
		>
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"
				>
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

		<!-- Painel de Aviso de Desconexão para o Anfitrião -->
		{#if lobby?.isHost && jogadorDesconectadoNome && !ignorarAvisoDesconexao}
			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-amber-800 dark:text-amber-200"
			>
				<div class="flex items-center gap-2.5">
					<IconShieldAlert class="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
					<div class="flex flex-col">
						<span class="font-util-heading text-xs font-bold tracking-wider uppercase">
							Aviso de Desconexão
						</span>
						<span class="font-util-body text-xs">
							O jogador <strong class="font-semibold">{jogadorDesconectadoNome}</strong> perdeu a conexão
							com o servidor.
						</span>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => (ignorarAvisoDesconexao = true)}
						class="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 font-util-heading text-xs font-semibold text-amber-800 transition hover:bg-amber-500/30 dark:text-amber-200"
					>
						<span>Aguardar</span>
						<IconClock class="h-3.5 w-3.5" />
					</button>

					<button
						type="button"
						onclick={handleDesfazerSala}
						class="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 font-util-heading text-xs font-semibold text-red-700 transition hover:bg-red-500/30 dark:text-red-300"
					>
						<span>Desfazer Sala</span>
						<IconTrash2 class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		{/if}

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
				<!-- Título e Diretiva de Ação -->
				<div class="flex flex-col items-center text-center">
					<h1 class="font-display text-2xl text-text-primary sm:text-3xl">
						Distribuição de Equipes
					</h1>
					<p class="mt-1 font-subheading text-xs text-text-muted sm:text-sm">
						Clique em uma caixa para escolher sua equipe
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
							<h2 class="font-display text-lg font-bold tracking-tight text-accent sm:text-xl">
								Equipe Corvo
							</h2>
							<span
								class="rounded-lg bg-accent-soft px-2.5 py-1 font-code text-xs font-bold text-accent"
							>
								{lobby?.membrosCorvo.length || 0}/2
							</span>
						</div>

						<!-- Lista de Membros da Equipe Corvo -->
						<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
							{#each lobby?.membrosCorvo || [] as membro (membro.id)}
								<div
									class="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 shadow-xs"
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
							<h2
								class="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl"
							>
								Aleatório
							</h2>
							<span
								class="rounded-lg bg-bg-surface-elevated px-2.5 py-1 font-code text-xs font-bold text-text-muted"
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
							<h2 class="font-display text-lg font-bold tracking-tight text-secondary sm:text-xl">
								Equipe Águia
							</h2>
							<span
								class="rounded-lg bg-secondary-soft px-2.5 py-1 font-code text-xs font-bold text-secondary"
							>
								{lobby?.membrosAguia.length || 0}/2
							</span>
						</div>

						<!-- Lista de Membros da Equipe Águia -->
						<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
							{#each lobby?.membrosAguia || [] as membro (membro.id)}
								<div
									class="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 shadow-xs"
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
								{#if isStartingMatch}
									Iniciando Partida<span class="animated-ellipsis"
										><span>.</span><span>.</span><span>.</span></span
									>
								{:else if lobby?.quorumCompleto}
									Iniciar Partida
								{:else}
									Aguardando 4 Jogadores ({lobby?.totalJogadores || 0}/4)<span
										class="animated-ellipsis"><span>.</span><span>.</span><span>.</span></span
									>
								{/if}
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
									Quórum de 4 jogadores completo! Aguardando o anfitrião iniciar a partida<span
										class="animated-ellipsis"><span>.</span><span>.</span><span>.</span></span
									>
								</span>
							{:else}
								<span>
									Aguardando o anfitrião e mais jogadores entrarem ({lobby?.totalJogadores ||
										0}/4)<span class="animated-ellipsis"
										><span>.</span><span>.</span><span>.</span></span
									>
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
{/if}
