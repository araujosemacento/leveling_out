<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getBackendUrl, getApiHeaders, getProxySecret } from '$lib/config/backend';
	import { GameEngine, type LobbyTeamChoice, type PptMove } from '$lib/engine';
	import { sanitizeNickname } from '$lib/engine/input/sanitize';

	import NicknameModal from '$lib/components/NicknameModal.svelte';
	import RoomHeader from '$lib/components/RoomHeader.svelte';
	import DisconnectionBanner from '$lib/components/DisconnectionBanner.svelte';
	import LobbyArena from '$lib/components/LobbyArena.svelte';
	import PptArena from '$lib/components/PptArena.svelte';
	import GamePlaceholder from '$lib/components/GamePlaceholder.svelte';

	import IconAlertCircle from '~icons/lucide/alert-circle';
	import IconUserX from '~icons/lucide/user-x';
	import IconArrowRight from '~icons/lucide/arrow-right';

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
	let foiExpulso = $state(false);
	let backendUrl = $state(getBackendUrl());

	// Instância desacoplada da GameEngine
	let engine = $state<GameEngine | null>(null);
	let gameState = $state<any>(null);

	// Projeções reativas do Lobby e PPT via GameEngine
	let lobby = $derived(engine && gameState ? engine.getLobbyProjection(localPlayerId) : null);
	let pptProjection = $derived(engine && gameState ? engine.getPptProjection(localPlayerId) : null);

	// Aviso para o anfitrião sobre jogadores desconectados
	let jogadorDesconectadoNome = $state<string | null>(null);
	let ignorarAvisoDesconexao = $state(false);

	let unsubscribeEngine: (() => void) | null = null;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
	let eventSource: EventSource | null = null;

	// Controle de atualização otimista e mutex de reconciliação para prevenir flickering
	let pendingTeamChoice = $state<{ target: LobbyTeamChoice; timestamp: number } | null>(null);
	let pendingTeamTimeout: ReturnType<typeof setTimeout> | null = null;
	let isReconciling = false;
	let pendingReconciliation = false;

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
		if (pendingTeamTimeout) {
			clearTimeout(pendingTeamTimeout);
			pendingTeamTimeout = null;
		}
		pendingTeamChoice = null;
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
					inicializarEngineEServicos();
					return;
				}
			} catch (e) {
				console.warn('[ZERO TRUST] Ping inicial falhou, exigindo novo ingresso:', e);
			}
		}

		// Sessão ausente, sala diferente ou credenciais inválidas: solicita apelido
		statusConexao = 'AGUARDANDO_APELIDO';
	}

	function salvarCredenciaisLocais(id: string, token: string, nome: string) {
		localPlayerId = id;
		sessionToken = token;
		playerName = nome;

		if (engine) {
			engine.setPlayer(id, nome, 'ALEATORIO');
		}

		window.sessionStorage.setItem('leveling_roomCode', roomCode);
		window.sessionStorage.setItem('leveling_playerId', id);
		window.sessionStorage.setItem('leveling_sessionToken', token);
		window.sessionStorage.setItem('leveling_playerName', nome);
	}

	function limparCredenciaisLocais() {
		window.sessionStorage.removeItem('leveling_roomCode');
		window.sessionStorage.removeItem('leveling_playerId');
		window.sessionStorage.removeItem('leveling_sessionToken');
		window.sessionStorage.removeItem('leveling_playerName');
	}

	/**
	 * Handshake de ingresso pelo endpoint Go /api/leveling/salas/{codigo}/entrar.
	 */
	async function handleEntrarComApelido(e: SubmitEvent) {
		e.preventDefault();
		if (!cleanNickname.trim() || statusConexao === 'CONECTANDO') return;

		statusConexao = 'CONECTANDO';
		erroIngresso = '';

		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/entrar`,
				{
					method: 'POST',
					headers: getApiHeaders({ 'Content-Type': 'application/json' }),
					body: JSON.stringify({
						nome: cleanNickname,
						playerId: localPlayerId || undefined,
						sessionToken: sessionToken || undefined
					})
				}
			);

			const dataRes = await res.json();

			if (!res.ok) {
				erroIngresso = dataRes.message || 'Não foi possível ingressar na sala.';
				statusConexao = 'AGUARDANDO_APELIDO';
				return;
			}

			salvarCredenciaisLocais(dataRes.playerId, dataRes.sessionToken, cleanNickname);
			inicializarEngineEServicos(dataRes.snapshot);
		} catch (err) {
			console.error('[HANDSHAKE ERROR]', err);
			erroIngresso = 'Erro de conexão com o servidor da partida.';
			statusConexao = 'AGUARDANDO_APELIDO';
		}
	}

	function inicializarEngineEServicos(snapshotInicial?: any) {
		statusConexao = 'CONECTADO';

		engine = new GameEngine(roomCode);
		if (localPlayerId) {
			engine.setPlayer(localPlayerId, playerName, 'ALEATORIO');
		}
		gameState = engine.getState();

		unsubscribeEngine = engine.subscribe((novoEstado) => {
			gameState = novoEstado;
		});

		// Se o handshake já forneceu o snapshot integrado, aplica-o imediatamente sem round-trip HTTP adicional
		if (snapshotInicial && typeof snapshotInicial === 'object' && snapshotInicial.salaCodigo) {
			aplicarSnapshotNaEngine(snapshotInicial);
		} else {
			reconciliarSala();
		}

		iniciarHeartbeat();
		assinarAtualizacoesTempoReal();

		// Polling periódico autoritativo contínuo a cada 3s como mecanismo de integridade e tolerância a falhas
		if (pollingInterval) clearInterval(pollingInterval);
		pollingInterval = setInterval(() => {
			reconciliarSala();
		}, 3000);
	}

	function aplicarSnapshotNaEngine(snap: any) {
		if (!engine || !snap) return;

		let equipeFinal: LobbyTeamChoice = 'ALEATORIO';
		if (pendingTeamChoice) {
			equipeFinal = pendingTeamChoice.target;
		}

		engine.reconcileFullSync({
			sala: {
				fase: snap.fase || 'LOBBY',
				host_id: snap.hostId || null,
				rodada_atual: snap.rodadaAtual || 1,
				equipe_da_vez: snap.equipeAtiva || 'A',
				placar_a: snap.placarA || 0,
				placar_b: snap.placarB || 0,
				vencedor: snap.vencedor || null,
				motivo_fim: snap.motivoFim || null,
				ppt_estado: snap.pptEstado || null,
				ppt_prazo: snap.pptPrazo || null,
				ppt_revelacao_em: snap.pptRevelacaoEm || null,
				ppt_enviou_a: snap.pptEnviouA ?? null,
				ppt_enviou_b: snap.pptEnviouB ?? null,
				ppt_representante_a: snap.pptRepresentanteA || null,
				ppt_representante_b: snap.pptRepresentanteB || null,
				ppt_resultado: snap.pptResultado || null,
				ppt_lance_a: snap.pptLanceA || null,
				ppt_lance_b: snap.pptLanceB || null
			},
			jogadores: (snap.jogadores || []).map((j: any) => {
				const isMe = j.playerId === localPlayerId;
				const eq = isMe && pendingTeamChoice ? equipeFinal : j.equipe || 'ALEATORIO';
				return {
					id: j.playerId,
					nome: j.nome,
					equipe: eq,
					papel: j.papel || 'ESPECTADOR',
					isHost: j.isHost || false
				};
			})
		});

		verificarMeuLancePpt(snap);
	}

	async function verificarMeuLancePpt(snap: any) {
		if (!engine || !localPlayerId || !sessionToken) return;
		const st = engine.getState();
		if (snap.fase !== 'INICIATIVA' && st.fase !== 'PPT_DISPUTA' && st.fase !== 'PPT_RESULTADO')
			return;
		if (st.ppt?.meuLance) return;

		const me = (snap.jogadores || []).find((j: any) => j.playerId === localPlayerId);
		const minhaEquipe = me?.equipe || st.minhaEquipe;
		const enviou =
			minhaEquipe === 'A' ? snap.pptEnviouA : minhaEquipe === 'B' ? snap.pptEnviouB : false;
		if (!enviou) return;

		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/ppt/meu-lance`,
				{
					headers: getApiHeaders({
						'X-Player-Id': localPlayerId,
						'X-Session-Token': sessionToken
					})
				}
			);
			if (res.ok) {
				const data = await res.json();
				if (data.lance && engine) {
					engine.setMeuLancePpt(data.lance);
				}
			}
		} catch (err) {
			console.warn('[PPT] Falha ao consultar meu-lance:', err);
		}
	}

	async function handleLancePpt(move: PptMove) {
		if (!engine) return;
		engine.submitPptMove(move);
		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/ppt/lance`,
				{
					method: 'POST',
					headers: getApiHeaders({
						'Content-Type': 'application/json',
						'X-Player-Id': localPlayerId,
						'X-Session-Token': sessionToken
					}),
					body: JSON.stringify({ lance: move })
				}
			);
			if (!res.ok) {
				const errData = await res.json();
				mostrarAviso(errData.message || 'Falha ao registrar lance.');
			} else {
				reconciliarSala();
			}
		} catch (err) {
			console.error('[PPT ERROR]', err);
			mostrarAviso('Erro de conexão ao enviar lance.');
		}
	}

	/**
	 * Reconciliação do estado completo via snapshot JSON gerado pelo SQLite.
	 */
	async function reconciliarSala() {
		if (isReconciling) {
			pendingReconciliation = true;
			return;
		}

		isReconciling = true;
		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/snapshot`,
				{
					headers: getApiHeaders({
						'X-Player-Id': localPlayerId,
						'X-Session-Token': sessionToken
					})
				}
			);

			if (res.status === 404) {
				pararCiclosDeRede();
				limparCredenciaisLocais();
				mostrarAviso('A sala foi desfeita ou não existe mais.');
				setTimeout(() => goto(resolve('/')), 2000);
				return;
			}

			if (res.ok) {
				const snap = await res.json();
				if (snap.fase === 'FIM_JOGO' && snap.motivoFim === 'DISSOLVIDA_HOST') {
					pararCiclosDeRede();
					limparCredenciaisLocais();
					mostrarAviso('A sala foi dissolvida pelo anfitrião.');
					setTimeout(() => goto(resolve('/')), 2000);
					return;
				}

				if (statusConexao === 'CONECTADO' && localPlayerId && snap.fase === 'LOBBY') {
					const euAindaNaSala = (snap.jogadores || []).some(
						(j: any) => j.playerId === localPlayerId
					);
					if (!euAindaNaSala && !pendingReconciliation && !foiExpulso) {
						pararCiclosDeRede();
						limparCredenciaisLocais();
						foiExpulso = true;
						return;
					}
				}

				aplicarSnapshotNaEngine(snap);

				if (lobby?.isHost) {
					verificarPresencaJogadores();
				}
			}
		} catch (err) {
			console.warn('[RECONCILIACAO] Falha ao reconciliar snapshot:', err);
		} finally {
			isReconciling = false;
			if (pendingReconciliation) {
				pendingReconciliation = false;
				reconciliarSala();
			}
		}
	}

	async function verificarPresencaJogadores() {
		try {
			const res = await fetch(
				`${backendUrl}/api/collections/jogadores/records?filter=${encodeURIComponent(`sala_codigo="${roomCode}"`)}`,
				{ headers: getApiHeaders() }
			);
			if (res.ok) {
				const data = await res.json();
				const now = Date.now();
				let desconectado: string | null = null;

				for (const item of data.items || []) {
					if (item.player_id === localPlayerId) continue;
					const lastSeen = item.last_seen ? new Date(item.last_seen).getTime() : 0;
					if (now - lastSeen > 12000) {
						desconectado = item.nome;
						break;
					}
				}
				jogadorDesconectadoNome = desconectado;
			}
		} catch {
			// Não bloqueia o loop
		}
	}

	function iniciarHeartbeat() {
		if (heartbeatInterval) clearInterval(heartbeatInterval);

		const enviarPing = async () => {
			if (!localPlayerId || !sessionToken || statusConexao !== 'CONECTADO') return;
			try {
				const pingRes = await fetch(
					`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/ping`,
					{
						method: 'POST',
						headers: getApiHeaders({
							'X-Player-Id': localPlayerId,
							'X-Session-Token': sessionToken
						})
					}
				);
				if (pingRes.status === 401 || pingRes.status === 404) {
					pararCiclosDeRede();
					limparCredenciaisLocais();
					statusConexao = 'AGUARDANDO_APELIDO';
					mostrarAviso('Sua sessão expirou ou foi desconectada.');
				}
			} catch {
				// Falha de rede momentânea
			}
		};

		enviarPing();
		heartbeatInterval = setInterval(enviarPing, 5000);
	}

	function assinarAtualizacoesTempoReal() {
		if (typeof window === 'undefined' || !window.EventSource) return;

		try {
			if (eventSource) eventSource.close();

			const proxySec = getProxySecret();
			const sseUrl = proxySec
				? `${backendUrl}/api/realtime?x-proxy-secret=${encodeURIComponent(proxySec)}`
				: `${backendUrl}/api/realtime`;
			eventSource = new EventSource(sseUrl);

			// O PocketBase envia PB_CONNECT com clientId e exige subscrição explícita
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
						if (msg.action === 'delete' && rec.player_id === localPlayerId) {
							pararCiclosDeRede();
							limparCredenciaisLocais();
							foiExpulso = true;
							return;
						}
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
					// Ignora pings ou formatos não JSON
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
				// Polling periódico continua ativo como fallback resiliente
			};
		} catch (err) {
			console.warn('[LOBBY] SSE indisponível, operando via polling autoritativo:', err);
		}
	}

	async function solicitarTrocaEquipe(targetEquipe: LobbyTeamChoice) {
		if (!lobby || statusConexao !== 'CONECTADO') return;

		if (lobby.minhaEquipe === targetEquipe) return;

		if (targetEquipe === 'A' && !lobby.podeEscolherPato) {
			mostrarAviso('A Equipe Pato já atingiu a lotação máxima de 2 integrantes.');
			return;
		}
		if (targetEquipe === 'B' && !lobby.podeEscolherGanso) {
			mostrarAviso('A Equipe Ganso já atingiu a lotação máxima de 2 integrantes.');
			return;
		}

		// Trava otimista: protege contra sobrescrita por snapshots obsoletos em trânsito
		if (pendingTeamTimeout) clearTimeout(pendingTeamTimeout);
		pendingTeamChoice = { target: targetEquipe, timestamp: Date.now() };

		// Timeout de segurança: limpa a trava após 3.5s caso o backend demore ou falhe
		pendingTeamTimeout = setTimeout(() => {
			pendingTeamChoice = null;
			pendingTeamTimeout = null;
		}, 3500);

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
				pendingTeamChoice = null;
				if (pendingTeamTimeout) {
					clearTimeout(pendingTeamTimeout);
					pendingTeamTimeout = null;
				}
				const errBody = await res.json().catch(() => ({}));
				mostrarAviso(errBody.message || 'Não foi possível alterar de equipe.');
				await reconciliarSala();
			} else {
				// Confirmado pelo servidor: absorve snapshots em voo mantendo a trava por mais 400ms
				setTimeout(() => {
					pendingTeamChoice = null;
				}, 400);
			}
		} catch (err) {
			console.error('[ZERO TRUST] Erro ao persistir equipe no servidor:', err);
			pendingTeamChoice = null;
			if (pendingTeamTimeout) {
				clearTimeout(pendingTeamTimeout);
				pendingTeamTimeout = null;
			}
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

	async function handleExpulsarJogador(alvoPlayerId: string, alvoNome: string) {
		if (!lobby?.isHost || statusConexao !== 'CONECTADO') return;

		if (!confirm(`Tem certeza de que deseja expulsar "${alvoNome}" da sala?`)) {
			return;
		}

		try {
			const res = await fetch(
				`${backendUrl}/api/leveling/salas/${encodeURIComponent(roomCode)}/expulsar`,
				{
					method: 'POST',
					headers: getApiHeaders({
						'Content-Type': 'application/json',
						'X-Player-Id': localPlayerId,
						'X-Session-Token': sessionToken
					}),
					body: JSON.stringify({
						host_player_id: localPlayerId,
						alvo_player_id: alvoPlayerId
					})
				}
			);

			if (res.ok) {
				mostrarAviso(`"${alvoNome}" foi expulso da sala.`);
				await reconciliarSala();
			} else {
				const errData = await res.json().catch(() => ({}));
				mostrarAviso(errData.message || 'Falha ao expulsar participante.');
			}
		} catch (err) {
			console.error('[HOST] Erro ao expulsar participante:', err);
			mostrarAviso('Erro de conexão ao tentar expulsar participante.');
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
	<title>Lobby: Sala {roomCode} | Leveling Out</title>
</svelte:head>

<!-- Modal Bloqueante de Identificação do Apelido (Zero Trust Handshake) -->
<NicknameModal
	isOpen={statusConexao === 'AGUARDANDO_APELIDO' || statusConexao === 'CONECTANDO'}
	{roomCode}
	{statusConexao}
	{erroIngresso}
	bind:rawNickname
	{cleanNickname}
	onSubmit={handleEntrarComApelido}
/>

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
		<RoomHeader
			{roomCode}
			{playerName}
			isHost={Boolean(lobby?.isHost)}
			{copied}
			onCopyLink={copyRoomLink}
		/>

		<!-- Painel de Aviso de Desconexão para o Anfitrião -->
		{#if lobby?.isHost && jogadorDesconectadoNome && !ignorarAvisoDesconexao}
			<DisconnectionBanner
				playerName={jogadorDesconectadoNome}
				onWait={() => (ignorarAvisoDesconexao = true)}
				onDissolveRoom={handleDesfazerSala}
			/>
		{/if}

		<!-- Feedback de Aviso Temporário -->
		{#if avisoTemporario}
			<div
				class="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-xs font-semibold text-text-primary shadow-xs"
			>
				<IconAlertCircle class="h-4 w-4 shrink-0 text-primary" />
				<span class="font-util-body">{avisoTemporario}</span>
			</div>
		{/if}

		{#if gameState?.fase === 'LOBBY'}
			<!-- Arena Central: Painel Tripartite de Escolha de Equipes -->
			<LobbyArena
				{lobby}
				{localPlayerId}
				{isStartingMatch}
				onSelectTeam={solicitarTrocaEquipe}
				onStartMatch={handleIniciarPartida}
				onKickPlayer={handleExpulsarJogador}
			/>
		{:else if (gameState?.fase === 'PPT_DISPUTA' || gameState?.fase === 'PPT_RESULTADO' || gameState?.fase === 'INICIATIVA') && pptProjection}
			<!-- Arena de Disputa de Iniciativa (Pedra, Papel e Tesoura) -->
			<PptArena ppt={pptProjection} onSelectMove={handleLancePpt} />
		{:else}
			<!-- Demais Fases da Partida -->
			<GamePlaceholder />
		{/if}
	</div>
{/if}

<!-- Modal Bloqueante de Jogador Expulso -->
{#if foiExpulso}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 p-4 backdrop-blur-sm"
	>
		<div
			class="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-secondary/30 bg-bg-surface p-6 text-center shadow-2xl"
		>
			<div
				class="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-soft text-secondary"
			>
				<IconUserX class="h-6 w-6" />
			</div>
			<div class="flex flex-col gap-1">
				<h2 class="font-display text-xl text-text-primary sm:text-2xl">Expulso da Sala</h2>
				<p class="font-subheading text-xs text-text-muted sm:text-sm">
					Você foi removido da sala pelo anfitrião.
				</p>
			</div>
			<button
				type="button"
				onclick={() => goto(resolve('/'))}
				class="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-util-heading text-xs font-bold text-white shadow-md transition-all hover:bg-primary-hover active:scale-98"
			>
				<span>Voltar ao Início</span>
				<IconArrowRight class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
