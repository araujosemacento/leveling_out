<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { GameEngine, type LobbyTeamChoice, type PptMove } from '$lib/engine';
	import { sanitizeNickname } from '$lib/engine/input/sanitize';
	import { GameSocket } from '$lib/network/game-socket';

	import NicknameModal from '$lib/components/NicknameModal.svelte';
	import RoomHeader from '$lib/components/RoomHeader.svelte';
	import LobbyArena from '$lib/components/LobbyArena.svelte';
	import PptArena from '$lib/components/PptArena.svelte';
	import SpectrumArena from '$lib/components/SpectrumArena.svelte';
	import SpectrumCard from '$lib/components/SpectrumCard.svelte';
	import TestTube from '$lib/components/TestTube.svelte';
	import ClueEnvelope from '$lib/components/ClueEnvelope.svelte';
	import GamePlaceholder from '$lib/components/GamePlaceholder.svelte';

	import IconAlertCircle from '~icons/lucide/alert-circle';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let roomCode = $derived(data.roomCode);

	// Estados de ciclo de vida e conectividade
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

	// Instância desacoplada da GameEngine
	let engine = $state<GameEngine | null>(null);
	let gameState = $state<any>(null);

	// Projeções reativas do Lobby, PPT e Escolha de Espectro via GameEngine
	let lobby = $derived(engine && gameState ? engine.getLobbyProjection(localPlayerId) : null);
	let pptProjection = $derived(engine && gameState ? engine.getPptProjection(localPlayerId) : null);
	let spectrumProjection = $derived(
		engine && gameState ? engine.getSpectrumPickerProjection(localPlayerId) : null
	);
	let roleProjection = $derived(
		engine && gameState ? engine.getRoleProjection(localPlayerId) : null
	);
	let roundSpectrumProjection = $derived(
		engine && gameState ? engine.getSpectrumProjection() : null
	);
	let tubeProjection = $derived(
		engine && gameState ? engine.getTubeProjection(localPlayerId) : null
	);

	let unsubscribeEngine: (() => void) | null = null;
	let socket: GameSocket | null = null;

	// Trava otimista para troca de equipe
	let pendingTeamChoice = $state<{ target: LobbyTeamChoice; timestamp: number } | null>(null);
	let pendingTeamTimeout: ReturnType<typeof setTimeout> | null = null;

	function mostrarAviso(msg: string) {
		avisoTemporario = msg;
		if (avisoTimeout) clearTimeout(avisoTimeout);
		avisoTimeout = setTimeout(() => {
			avisoTemporario = '';
		}, 3500);
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			inicializarSocket();
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
		if (socket) {
			socket.desconectar();
			socket = null;
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

	function inicializarSocket() {
		socket = new GameSocket({
			onWelcome: (data) => {
				salvarCredenciaisLocais(data.playerId, data.sessionToken, data.nome || playerName);
				statusConexao = 'CONECTADO';
			},
			onSync: (snapshot) => {
				aplicarSnapshotNaEngine(snapshot);
				statusConexao = 'CONECTADO';
			},
			onSliderStream: (posicao) => {
				if (engine) {
					engine.updateSliderPreview(posicao);
				}
			},
			onKicked: (motivo) => {
				pararCiclosDeRede();
				limparCredenciaisLocais();
				if (typeof window !== 'undefined') {
					window.sessionStorage.setItem(
						'leveling_alerta_global',
						motivo || 'Você foi expulso da sala pelo anfitrião.'
					);
				}
				goto(resolve('/'));
			},
			onBanned: (motivo) => {
				pararCiclosDeRede();
				limparCredenciaisLocais();
				if (typeof window !== 'undefined') {
					window.sessionStorage.setItem(
						'leveling_alerta_global',
						motivo ||
							'Você foi banido desta sala pelo anfitrião e não poderá retornar deste dispositivo.'
					);
				}
				goto(resolve('/'));
			},
			onNotification: (msg) => {
				mostrarAviso(msg);
			},
			onError: (msg) => {
				if (statusConexao === 'CONECTANDO' || statusConexao === 'AGUARDANDO_APELIDO') {
					erroIngresso = msg;
					statusConexao = 'AGUARDANDO_APELIDO';
				} else {
					mostrarAviso(msg);
				}
			},
			onStatusChange: (s) => {
				if (s === 'CONECTANDO' && statusConexao !== 'AGUARDANDO_APELIDO') {
					statusConexao = 'CONECTANDO';
				}
			}
		});
	}

	function verificarSessaoExistente() {
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

			inicializarEngine();
			socket?.conectar(roomCode, savedPlayerId, savedToken, playerName);
		} else {
			statusConexao = 'AGUARDANDO_APELIDO';
		}
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

	function handleEntrarComApelido(e: SubmitEvent) {
		e.preventDefault();
		if (!cleanNickname.trim() || statusConexao === 'CONECTANDO') return;

		statusConexao = 'CONECTANDO';
		erroIngresso = '';

		inicializarEngine();
		const novoId = localPlayerId || 'p_' + crypto.randomUUID().slice(0, 10);
		localPlayerId = novoId;
		playerName = cleanNickname;

		socket?.conectar(roomCode, novoId, sessionToken, cleanNickname);
	}

	function inicializarEngine() {
		if (engine) return;

		engine = new GameEngine(roomCode);
		if (localPlayerId) {
			engine.setPlayer(localPlayerId, playerName, 'ALEATORIO');
		}
		gameState = engine.getState();

		unsubscribeEngine = engine.subscribe((novoEstado) => {
			gameState = novoEstado;
		});
	}

	function aplicarSnapshotNaEngine(snap: any) {
		if (!engine || !snap) return;

		let equipeFinal: LobbyTeamChoice = 'ALEATORIO';
		if (pendingTeamChoice) {
			equipeFinal = pendingTeamChoice.target;
		}

		// Encaminha snapshot nativo diretamente à engine em conformidade com o WebSocket
		engine.reconcileFullSync({
			codigo: snap.codigo,
			fase: snap.fase || 'LOBBY',
			hostId: snap.hostId || null,
			rodada: snap.rodada || 1,
			equipeAtiva: snap.equipeAtiva || 'A',
			placarA: snap.placarA || 0,
			placarB: snap.placarB || 0,
			vencedor: snap.vencedor || null,
			motivoFim: snap.motivoFim || null,
			ppt: snap.ppt,
			rodadaAtiva: snap.rodadaAtiva,
			cartasOpcoes: snap.cartasOpcoes || snap.cartasEspectroOpcoes,
			jogadores: (snap.jogadores || []).map((j: any) => {
				const isMe = j.playerId === localPlayerId;
				const eq = isMe && pendingTeamChoice ? equipeFinal : j.equipe || 'ALEATORIO';
				return {
					id: j.playerId,
					playerId: j.playerId,
					nome: j.nome,
					equipe: eq,
					papel: j.papel || 'ESPECTADOR',
					isHost: j.isHost || false,
					isOnline: j.isOnline ?? true
				};
			})
		});

		// Lance privado recebido no snapshot sob medida
		if (snap.ppt?.meuLance) {
			engine.setMeuLancePpt(snap.ppt.meuLance);
		}

		// Limpa trava otimista
		if (pendingTeamChoice) {
			const me = (snap.jogadores || []).find((j: any) => j.playerId === localPlayerId);
			if (me && me.equipe === pendingTeamChoice.target) {
				pendingTeamChoice = null;
				if (pendingTeamTimeout) clearTimeout(pendingTeamTimeout);
			}
		}
	}

	function solicitarTrocaEquipe(targetEquipe: LobbyTeamChoice) {
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

		// Trava otimista local
		if (pendingTeamTimeout) clearTimeout(pendingTeamTimeout);
		pendingTeamChoice = { target: targetEquipe, timestamp: Date.now() };
		pendingTeamTimeout = setTimeout(() => {
			pendingTeamChoice = null;
		}, 3500);

		socket?.escolherEquipe(targetEquipe);
	}

	function handleIniciarPartida() {
		if (!lobby || !lobby.podeIniciarPartida || isStartingMatch || statusConexao !== 'CONECTADO')
			return;
		isStartingMatch = true;
		socket?.iniciarPartida();
		setTimeout(() => {
			isStartingMatch = false;
		}, 1000);
	}

	function handleExpulsarJogador(alvoPlayerId: string, alvoNome: string) {
		if (!lobby?.isHost || statusConexao !== 'CONECTADO') return;

		if (
			!confirm(
				`Tem certeza de que deseja expulsar "${alvoNome}" da sala? O jogador poderá se reconectar novamente caso tente.`
			)
		) {
			return;
		}

		socket?.expulsarJogador(alvoPlayerId);
		mostrarAviso(`"${alvoNome}" foi expulso da sala.`);
	}

	function handleBanirJogador(alvoPlayerId: string, alvoNome: string) {
		if (!lobby?.isHost || statusConexao !== 'CONECTADO') return;

		if (
			!confirm(
				`Tem certeza de que deseja banir "${alvoNome}" da sala? O jogador será banido desta sala enquanto ela estiver aberta e não poderá ingressar do mesmo dispositivo novamente.`
			)
		) {
			return;
		}

		socket?.banirJogador(alvoPlayerId);
		mostrarAviso(`"${alvoNome}" foi banido desta sala.`);
	}

	function handleLancePpt(move: PptMove) {
		if (!engine) return;
		engine.submitPptMove(move);
		socket?.lancePpt(move);
	}

	function handlePreSelectSpectrum(cartaId: string) {
		if (!engine) return;
		engine.preSelectSpectrum(cartaId);
		socket?.preSelecionarEspectro(cartaId);
	}

	function handleVoteSpectrum(cartaId: string) {
		if (!engine) return;
		engine.voteSpectrum(cartaId);
		socket?.votarEspectro(cartaId);
	}

	function handleConfirmSpectrum(cartaId: string) {
		if (!engine) return;
		engine.confirmSpectrum(cartaId);
		socket?.escolherEspectro(cartaId);
	}

	function handleSubmitClue(dica: string) {
		if (!engine) return;
		engine.submitClue(dica);
		socket?.submeterDica(dica);
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
			Conectando ao servidor da sala...
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
				onBanPlayer={handleBanirJogador}
			/>
		{:else if (gameState?.fase === 'PPT_DISPUTA' || gameState?.fase === 'PPT_RESULTADO' || gameState?.fase === 'INICIATIVA') && pptProjection}
			<!-- Arena de Disputa de Iniciativa (Pedra, Papel e Tesoura) -->
			<PptArena ppt={pptProjection} onSelectMove={handleLancePpt} />
		{:else if (gameState?.fase === 'ESCOLHA_CARTA' || gameState?.fase === 'ESCOLHA_ESPECTRO') && spectrumProjection}
			<!-- Arena de Escolha de Espectro da Rodada (30 segundos) -->
			<SpectrumArena
				projection={spectrumProjection}
				onPreSelect={handlePreSelectSpectrum}
				onVote={handleVoteSpectrum}
				onConfirm={handleConfirmSpectrum}
			/>
		{:else if gameState?.fase === 'RODADA_DICA'}
			<!-- Arena de Envio de Dica da Rodada (Codificador & Espectadores) -->
			<div class="flex w-full flex-col items-center gap-6 py-2 sm:gap-8">
				<!-- Status Superior do Turno -->
				<div class="flex flex-col items-center gap-1 text-center">
					<span class="font-sn text-xs font-bold tracking-wider text-text-muted uppercase">
						Rodada {gameState.rodadaAtual?.numero || 1} : Equipe {roundSpectrumProjection?.equipeAtivaNome ||
							'Ativa'}
					</span>
					<p class="font-sn text-sm font-semibold text-text-primary">
						{tubeProjection?.statusTexto || 'Aguardando o envio da dica conceitual...'}
					</p>
				</div>

				<!-- Visualização Conjunta: Carta de Espectro + Tubo de Ensaio (Zero Trust) -->
				<div
					class="flex w-full max-w-4xl flex-col items-center justify-center gap-6 md:flex-row md:items-center md:gap-12"
				>
					{#if gameState.rodadaAtual?.carta}
						<div class="w-full max-w-97.5 shrink-0">
							<SpectrumCard
								carta={gameState.rodadaAtual.carta}
								equipe={gameState.equipeAtiva}
								interativo={false}
							/>
						</div>
					{/if}

					{#if tubeProjection}
						<div class="flex shrink-0 flex-col items-center justify-center">
							<TestTube
								level={tubeProjection.metaVisivel ?? 0}
								team={gameState.equipeAtiva === 'A' ? 'pato' : 'ganso'}
								class="h-64 w-auto"
							/>
						</div>
					{/if}
				</div>

				<!-- Envelope Físico com Abas, Dobra e Voo (ClueEnvelope) -->
				<div class="mt-2 flex w-full justify-center">
					<ClueEnvelope
						podeDigitar={Boolean(roleProjection?.podeDigitarDica)}
						onSubmit={handleSubmitClue}
					/>
				</div>
			</div>
		{:else}
			<!-- Demais Fases da Partida -->
			<GamePlaceholder />
		{/if}
	</div>
{/if}
