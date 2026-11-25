import { calculateScore } from '$lib/engine/update/score-rules';
import type {
	LobbyTeamChoice,
	PptMove,
	RoundHistoryEntry,
	SnapshotSalaProjetado,
	SpectrumCard,
	TeamId
} from '$lib/engine/types';
import {
	projectSnapshotForPlayer,
	SANDBOX_PLAYERS,
	SANDBOX_PRESETS,
	SANDBOX_SPECTRUM_DECK,
	PRESET_SEQUENCE,
	type SandboxPresetId
} from '../presets';

export type SocketStatus = 'DESCONECTADO' | 'CONECTANDO' | 'CONECTADO' | 'ERRO';
export type RevealTierTrigger = 'NA_MOSCA' | 'MUITO_PERTO' | 'PERTO' | 'FORA_DA_MARGEM';

export interface GameSocketCallbacks {
	onWelcome?: (data: {
		playerId: string;
		sessionToken: string;
		isHost: boolean;
		nome: string;
		salaCodigo: string;
	}) => void;
	onSync?: (snapshot: SnapshotSalaProjetado) => void;
	onSliderStream?: (posicao: number) => void;
	onKicked?: (motivo?: string) => void;
	onBanned?: (motivo?: string) => void;
	onNotification?: (mensagem: string, tipo?: 'info' | 'sucesso' | 'erro') => void;
	onError?: (mensagem: string) => void;
	onStatusChange?: (status: SocketStatus) => void;
}

export interface GameSocketOptions {
	backendUrl?: string;
	proxySecret?: string;
}

export interface ActionLogEntry {
	timestamp: string;
	tipo: string;
	detalhe: string;
}

const PPT_MOVES: PptMove[] = ['pedra', 'papel', 'tesoura'];

function clampInt(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, Math.round(val)));
}

function drawTwoCards(): [SpectrumCard, SpectrumCard] {
	const pool = [...SANDBOX_SPECTRUM_DECK];
	const idx1 = Math.floor(Math.random() * pool.length);
	const [c1] = pool.splice(idx1, 1);
	const idx2 = Math.floor(Math.random() * pool.length);
	const [c2] = pool.splice(idx2, 1);
	return [c1, c2];
}

function resolvePptMoves(lanceA: PptMove, lanceB: PptMove): 'EMPATE' | 'VITORIA_A' | 'VITORIA_B' {
	if (lanceA === lanceB) return 'EMPATE';
	if (
		(lanceA === 'pedra' && lanceB === 'tesoura') ||
		(lanceA === 'papel' && lanceB === 'pedra') ||
		(lanceA === 'tesoura' && lanceB === 'papel')
	) {
		return 'VITORIA_A';
	}
	return 'VITORIA_B';
}

class SandboxController {
	public activePresetId: SandboxPresetId = 'lobby_quorum_completo';
	public activePovId: string = 'p1';
	public rawSnapshot: SnapshotSalaProjetado = JSON.parse(
		JSON.stringify(SANDBOX_PRESETS.lobby_quorum_completo.snapshot)
	);
	public actionLog: ActionLogEntry[] = [];
	public activeSocket: GameSocket | null = null;
	public animationNonce = 0;

	private _autoFollowPov = true;
	private _autoBotsEnabled = true;
	private _autoAdvanceReveal = true;
	private pendingBotTimers: ReturnType<typeof setTimeout>[] = [];
	private lastCodificadorByTeam: Partial<Record<TeamId, string>> = {};
	private lastLiderByTeam: Partial<Record<TeamId, string>> = {};
	private lockedHiddenTarget: number | null = null;
	private listeners = new Set<() => void>();

	constructor() {
		this.syncSessionStorage();
	}

	public get autoFollowPov(): boolean {
		return this._autoFollowPov;
	}

	public set autoFollowPov(val: boolean) {
		if (this._autoFollowPov === val) return;
		this._autoFollowPov = val;
		this.notify();
	}

	public get autoBotsEnabled(): boolean {
		return this._autoBotsEnabled;
	}

	public set autoBotsEnabled(val: boolean) {
		if (this._autoBotsEnabled === val) return;
		this._autoBotsEnabled = val;
		this.notify();
	}

	public get autoAdvanceReveal(): boolean {
		return this._autoAdvanceReveal;
	}

	public set autoAdvanceReveal(val: boolean) {
		if (this._autoAdvanceReveal === val) return;
		this._autoAdvanceReveal = val;
		const fase = this.rawSnapshot.fase;
		if (!val && (fase === 'REVELACAO' || fase === 'RODADA_REVELACAO')) {
			this.clearTimers();
		} else if (val && (fase === 'REVELACAO' || fase === 'RODADA_REVELACAO')) {
			if (this.rawSnapshot.rodadaAtiva) {
				this.rawSnapshot.rodadaAtiva.transicaoEm = new Date(Date.now() + 6500).toISOString();
			}
			this.scheduleRevealAdvance();
			this.emitSyncToSocket(false);
		}
		this.notify();
	}

	public clearTimers() {
		for (const timer of this.pendingBotTimers) {
			clearTimeout(timer);
		}
		this.pendingBotTimers = [];
	}

	private scheduleTimer(fn: () => void, ms: number) {
		const id = setTimeout(() => {
			this.pendingBotTimers = this.pendingBotTimers.filter((t) => t !== id);
			fn();
		}, ms);
		this.pendingBotTimers.push(id);
	}

	private syncSessionStorage() {
		if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
			if (this.activePresetId === 'modal_apelido') {
				window.sessionStorage.removeItem('leveling_roomCode');
				window.sessionStorage.removeItem('leveling_playerId');
				window.sessionStorage.removeItem('leveling_sessionToken');
				window.sessionStorage.removeItem('leveling_playerName');
			} else {
				const player = SANDBOX_PLAYERS[this.activePovId] || SANDBOX_PLAYERS.p1;
				window.sessionStorage.setItem('leveling_roomCode', 'SALA-DEV');
				window.sessionStorage.setItem('leveling_playerId', player.id);
				window.sessionStorage.setItem('leveling_sessionToken', 'mock-token-' + player.id);
				window.sessionStorage.setItem('leveling_playerName', player.nome);
			}
		}
	}

	public subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	public notify() {
		for (const listener of this.listeners) {
			try {
				listener();
			} catch (err) {
				console.error('[SandboxController] Erro no listener:', err);
			}
		}
	}

	public logAction(tipo: string, detalhe: string) {
		const now = new Date();
		const timeStr =
			now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
		this.actionLog = [{ timestamp: timeStr, tipo, detalhe }, ...this.actionLog.slice(0, 49)];
		this.notify();
	}

	private refreshTemporalTriggers() {
		const now = Date.now();
		if (this.rawSnapshot.ppt) {
			if (this.rawSnapshot.ppt.estado === 'ESCOLHA') {
				this.rawSnapshot.ppt.prazo = new Date(now + 20000).toISOString();
			} else if (this.rawSnapshot.ppt.estado === 'CONTAGEM') {
				this.rawSnapshot.ppt.revelacaoEm = new Date(now + 3000).toISOString();
			} else if (this.rawSnapshot.ppt.estado === 'RESULTADO') {
				this.rawSnapshot.ppt.revelacaoEm = new Date(now).toISOString();
			}
		}
		if (this.rawSnapshot.rodadaAtiva) {
			const fase = this.rawSnapshot.fase;
			if (fase === 'ESCOLHA_ESPECTRO' || fase === 'ESCOLHA_CARTA') {
				this.rawSnapshot.rodadaAtiva.prazoEspectro = new Date(now + 30000).toISOString();
			}
			if (fase === 'REVELACAO' || fase === 'RODADA_REVELACAO') {
				this.rawSnapshot.rodadaAtiva.transicaoEm = new Date(now + 6500).toISOString();
			}
		}
	}

	public loadPreset(presetId: SandboxPresetId, keepCurrentPov = false) {
		this.clearTimers();
		const preset = SANDBOX_PRESETS[presetId];
		if (!preset) return;

		this.activePresetId = presetId;
		this.lockedHiddenTarget = null;
		this.lastCodificadorByTeam = {};
		this.lastLiderByTeam = {};

		if (!keepCurrentPov) {
			this.activePovId = preset.defaultPovId;
		}
		this.rawSnapshot = JSON.parse(JSON.stringify(preset.snapshot));
		this.refreshTemporalTriggers();

		this.syncSessionStorage();
		this.emitSyncToSocket(false);
		this.logAction('LOAD_PRESET', `Preset "${preset.titulo}" carregado`);
	}

	public setPov(povId: string) {
		this.clearTimers();
		if (!SANDBOX_PLAYERS[povId]) return;
		this.activePovId = povId;

		this.syncSessionStorage();
		this.emitSyncToSocket(false);
		this.logAction('SET_POV', `Ponto de vista alterado para: ${SANDBOX_PLAYERS[povId].nome}`);
	}

	public stepNextPreset() {
		const idx = PRESET_SEQUENCE.indexOf(this.activePresetId);
		const nextIdx = (idx + 1) % PRESET_SEQUENCE.length;
		this.loadPreset(PRESET_SEQUENCE[nextIdx], true);
	}

	public stepPrevPreset() {
		const idx = PRESET_SEQUENCE.indexOf(this.activePresetId);
		const prevIdx = (idx - 1 + PRESET_SEQUENCE.length) % PRESET_SEQUENCE.length;
		this.loadPreset(PRESET_SEQUENCE[prevIdx], true);
	}

	public setScores(placarA: number, placarB: number) {
		this.rawSnapshot.placarA = Math.max(0, placarA);
		this.rawSnapshot.placarB = Math.max(0, placarB);
		this.emitSyncToSocket(false);
		this.logAction(
			'SET_SCORES',
			`Placar ajustado: Pato ${this.rawSnapshot.placarA} x ${this.rawSnapshot.placarB} Ganso`
		);
	}

	public setHiddenTarget(val: number) {
		const clamped = clampInt(val, 0, 100);
		this.lockedHiddenTarget = clamped;
		const fase = this.rawSnapshot.fase;
		if (this.rawSnapshot.rodadaAtiva && (fase === 'RODADA_DICA' || fase === 'RODADA_PALPITE')) {
			this.rawSnapshot.rodadaAtiva.metaOculta = clamped;
			this.emitSyncToSocket(false);
			this.logAction('SET_HIDDEN_TARGET', `Meta oculta ajustada para ${clamped}%`);
		}
	}

	public replayCurrentAnimation() {
		this.clearTimers();
		this.refreshTemporalTriggers();
		this.animationNonce += 1;

		const fase = this.rawSnapshot.fase;
		if ((fase === 'REVELACAO' || fase === 'RODADA_REVELACAO') && this._autoAdvanceReveal) {
			this.scheduleRevealAdvance();
		} else if (fase === 'INICIATIVA' && this.rawSnapshot.ppt?.estado === 'CONTAGEM') {
			this.scheduleTimer(() => this.resolvePptContest(), 3000);
		}

		this.emitSyncToSocket(false);
		this.logAction('REPLAY_ANIMATION', `Animação reiniciada na fase ${fase}`);
	}

	public triggerRevealWithScore(tier: RevealTierTrigger) {
		this.clearTimers();

		if (!this.rawSnapshot.jogadores || this.rawSnapshot.jogadores.length < 4) {
			this.rawSnapshot.jogadores = JSON.parse(
				JSON.stringify(SANDBOX_PRESETS.rodada_palpite.snapshot.jogadores)
			);
		}

		const currentRound = this.rawSnapshot.rodadaAtiva;
		const meta = clampInt(currentRound?.metaOculta ?? 72, 25, 75);
		const offsetMap: Record<RevealTierTrigger, number> = {
			NA_MOSCA: 1,
			MUITO_PERTO: 4,
			PERTO: 10,
			FORA_DA_MARGEM: 28
		};
		const offset = offsetMap[tier];
		const palpite = clampInt(meta >= 50 ? meta - offset : meta + offset, 0, 100);

		const equipe: TeamId = currentRound?.equipe ?? this.rawSnapshot.equipeAtiva ?? 'A';
		const codificadorId = currentRound?.codificadorId ?? (equipe === 'A' ? 'p1' : 'p3');
		const palpiteiroId = currentRound?.palpiteiroId ?? (equipe === 'A' ? 'p2' : 'p4');

		this.rawSnapshot.equipeAtiva = equipe;
		this.rawSnapshot.rodada = currentRound?.numero ?? this.rawSnapshot.rodada ?? 1;
		this.rawSnapshot.rodadaAtiva = {
			numero: this.rawSnapshot.rodada,
			equipe,
			codificadorId,
			palpiteiroId,
			espectroEsquerda: currentRound?.espectroEsquerda || 'Insosso',
			espectroDireita: currentRound?.espectroDireita || 'Salgado',
			dica: currentRound?.dica || 'Pipoca de cinema com manteiga extra',
			metaOculta: meta,
			palpite
		};

		this.animationNonce += 1;
		this.applyRevealFromRound();
	}

	public triggerTimeout() {
		this.clearTimers();
		const fase = this.rawSnapshot.fase;
		if (fase === 'INICIATIVA' && this.rawSnapshot.ppt) {
			if (!this.rawSnapshot.ppt.enviouA) {
				this.rawSnapshot.ppt.enviouA = true;
				this.rawSnapshot.ppt.lanceA = 'pedra';
			}
			if (!this.rawSnapshot.ppt.enviouB) {
				this.rawSnapshot.ppt.enviouB = true;
				this.rawSnapshot.ppt.lanceB = 'tesoura';
			}
			this.resolvePptContest();
		} else if (fase === 'ESCOLHA_ESPECTRO' || fase === 'ESCOLHA_CARTA') {
			const fallbackId =
				this.rawSnapshot.rodadaAtiva?.cartaSelecionadaId ||
				this.rawSnapshot.rodadaAtiva?.votoParceiroCartaId ||
				this.rawSnapshot.cartasOpcoes?.[0]?.id ||
				this.rawSnapshot.cartasEspectroOpcoes?.[0]?.id ||
				'c1';
			this.confirmSpectrumChoice(fallbackId);
		} else if (fase === 'REVELACAO' || fase === 'RODADA_REVELACAO') {
			this.advanceAfterReveal();
		}
		this.logAction('TRIGGER_TIMEOUT', 'Timeout disparado manualmente');
	}

	public emitSyncToSocket(shouldNotify = false) {
		if (this.activeSocket) {
			if (this.activePresetId === 'modal_apelido') {
				this.activeSocket.callbacks.onStatusChange?.('CONECTANDO');
				this.activeSocket.callbacks.onError?.('');
			} else {
				const player = SANDBOX_PLAYERS[this.activePovId] || SANDBOX_PLAYERS.p1;
				const projected = projectSnapshotForPlayer(this.rawSnapshot, this.activePovId);

				this.activeSocket.callbacks.onWelcome?.({
					playerId: player.id,
					sessionToken: 'mock-token-' + player.id,
					isHost: player.isHost,
					nome: player.nome,
					salaCodigo: 'SALA-DEV'
				});

				this.activeSocket.callbacks.onSync?.(projected);
			}
		}

		if (shouldNotify) {
			this.notify();
		}
	}

	private getActivePlayerTeam(): LobbyTeamChoice {
		const jog = (this.rawSnapshot.jogadores || []).find(
			(j) => (j.playerId || j.id) === this.activePovId
		);
		if (jog) return jog.equipe;
		return SANDBOX_PLAYERS[this.activePovId]?.equipe ?? 'ALEATORIO';
	}

	private enterPptContagem() {
		if (!this.rawSnapshot.ppt) return;
		this.rawSnapshot.ppt.estado = 'CONTAGEM';
		this.rawSnapshot.ppt.revelacaoEm = new Date(Date.now() + 3000).toISOString();
		this.emitSyncToSocket(true);
		this.scheduleTimer(() => this.resolvePptContest(), 3000);
	}

	private resolvePptContest() {
		const ppt = this.rawSnapshot.ppt;
		if (!ppt) return;

		const lanceA: PptMove = ppt.lanceA || 'pedra';
		const lanceB: PptMove = ppt.lanceB || 'tesoura';
		const resultado = resolvePptMoves(lanceA, lanceB);

		ppt.estado = 'RESULTADO';
		ppt.lanceA = lanceA;
		ppt.lanceB = lanceB;
		ppt.resultado = resultado;
		ppt.revelacaoEm = new Date().toISOString();

		if (resultado === 'VITORIA_A') {
			this.rawSnapshot.equipeAtiva = 'A';
		} else if (resultado === 'VITORIA_B') {
			this.rawSnapshot.equipeAtiva = 'B';
		}

		this.emitSyncToSocket(true);

		if (resultado === 'EMPATE') {
			this.scheduleTimer(() => {
				if (!this.rawSnapshot.ppt) return;
				this.rawSnapshot.ppt.estado = 'ESCOLHA';
				this.rawSnapshot.ppt.enviouA = false;
				this.rawSnapshot.ppt.enviouB = false;
				this.rawSnapshot.ppt.lanceA = null;
				this.rawSnapshot.ppt.lanceB = null;
				this.rawSnapshot.ppt.meuLance = null;
				this.rawSnapshot.ppt.resultado = null;
				this.rawSnapshot.ppt.revelacaoEm = null;
				this.rawSnapshot.ppt.prazo = new Date(Date.now() + 20000).toISOString();
				this.emitSyncToSocket(true);
			}, 3500);
		} else {
			const winnerTeam: TeamId = resultado === 'VITORIA_A' ? 'A' : 'B';
			this.scheduleTimer(() => {
				this.openSpectrumChoice(winnerTeam, 1);
			}, 3500);
		}
	}

	private getTeamMemberIds(equipe: TeamId): [string, string] {
		const membros = (this.rawSnapshot.jogadores || [])
			.filter((j) => j.equipe === equipe)
			.map((j) => j.playerId || j.id || '')
			.filter(Boolean);
		if (membros.length >= 2) {
			return [membros[0], membros[1]];
		}
		return equipe === 'A' ? ['p1', 'p2'] : ['p3', 'p4'];
	}

	private openSpectrumChoice(equipe: TeamId, numeroRodada: number) {
		const [m0, m1] = this.getTeamMemberIds(equipe);
		const prevCod = this.lastCodificadorByTeam[equipe];
		const prevLid = this.lastLiderByTeam[equipe];

		let codificadorId = m0;
		let palpiteiroId = m1;
		let liderRodadaId = m0;

		if (prevCod) {
			codificadorId = prevCod === m0 ? m1 : m0;
			palpiteiroId = codificadorId === m0 ? m1 : m0;
			liderRodadaId = prevLid === m0 ? m1 : m0;
		} else if (Math.random() >= 0.5) {
			codificadorId = m1;
			palpiteiroId = m0;
		}

		this.lastCodificadorByTeam[equipe] = codificadorId;
		this.lastLiderByTeam[equipe] = liderRodadaId;

		for (const j of this.rawSnapshot.jogadores || []) {
			const jid = j.playerId || j.id;
			if (jid === codificadorId) j.papel = 'CODIFICADOR';
			else if (jid === palpiteiroId) j.papel = 'PALPITEIRO';
			else j.papel = 'ESPECTADOR';
		}

		const [c1, c2] = drawTwoCards();
		this.rawSnapshot.fase = 'ESCOLHA_ESPECTRO';
		this.rawSnapshot.rodada = numeroRodada;
		this.rawSnapshot.equipeAtiva = equipe;
		this.rawSnapshot.ppt = undefined;
		this.rawSnapshot.cartasOpcoes = [c1, c2];
		this.rawSnapshot.cartasEspectroOpcoes = [c1, c2];
		this.rawSnapshot.rodadaAtiva = {
			numero: numeroRodada,
			equipe,
			codificadorId,
			palpiteiroId,
			liderRodadaId,
			cartaSelecionadaId: '',
			votoParceiroCartaId: null,
			prazoEspectro: new Date(Date.now() + 30000).toISOString()
		};

		if (this._autoFollowPov) {
			this.activePovId = liderRodadaId;
			this.syncSessionStorage();
		}

		this.emitSyncToSocket(true);
	}

	private confirmSpectrumChoice(cartaId: string) {
		const rodada = this.rawSnapshot.rodadaAtiva;
		if (!rodada) return;

		const opcoes =
			this.rawSnapshot.cartasOpcoes ||
			this.rawSnapshot.cartasEspectroOpcoes ||
			SANDBOX_SPECTRUM_DECK;
		const resolvedId = cartaId || rodada.cartaSelecionadaId || rodada.votoParceiroCartaId || '';
		const carta = opcoes.find((c) => c.id === resolvedId) || opcoes[0];

		const metaOculta =
			this.lockedHiddenTarget !== null
				? this.lockedHiddenTarget
				: Math.floor(Math.random() * 91) + 5;

		this.rawSnapshot.fase = 'RODADA_DICA';
		this.rawSnapshot.cartasOpcoes = undefined;
		this.rawSnapshot.cartasEspectroOpcoes = undefined;
		this.rawSnapshot.rodadaAtiva = {
			...rodada,
			cartaSelecionadaId: carta.id,
			espectroEsquerda: carta.esquerda || carta.left || 'Insosso',
			espectroDireita: carta.direita || carta.right || 'Salgado',
			metaOculta,
			dica: '',
			palpite: 50,
			prazoEspectro: null
		};

		if (this._autoFollowPov && rodada.codificadorId) {
			this.activePovId = rodada.codificadorId;
			this.syncSessionStorage();
		}

		this.emitSyncToSocket(true);

		if (
			!this._autoFollowPov &&
			this._autoBotsEnabled &&
			this.activePovId !== rodada.codificadorId
		) {
			this.scheduleTimer(() => {
				if (this.rawSnapshot.fase === 'RODADA_DICA') {
					this.submitClueAndTransition('Ponto de equilíbrio do dia a dia');
				}
			}, 1500);
		}
	}

	private submitClueAndTransition(rawDica: string) {
		const dica = rawDica.trim() || 'Dica conceitual';
		if (!this.rawSnapshot.rodadaAtiva) return;
		this.rawSnapshot.rodadaAtiva.dica = dica;

		this.scheduleTimer(() => {
			if (!this.rawSnapshot.rodadaAtiva) return;
			this.rawSnapshot.fase = 'RODADA_PALPITE';
			this.rawSnapshot.rodadaAtiva.dica = dica;
			this.rawSnapshot.rodadaAtiva.palpite = 50;
			this.rawSnapshot.rodadaAtiva.sliderPosicao = 50;

			if (this._autoFollowPov && this.rawSnapshot.rodadaAtiva.palpiteiroId) {
				this.activePovId = this.rawSnapshot.rodadaAtiva.palpiteiroId;
				this.syncSessionStorage();
			}

			this.emitSyncToSocket(true);

			if (
				!this._autoFollowPov &&
				this._autoBotsEnabled &&
				this.activePovId !== this.rawSnapshot.rodadaAtiva.palpiteiroId
			) {
				this.simulateBotSliderAndConfirm();
			}
		}, 1150);
	}

	private simulateBotSliderAndConfirm() {
		const rodada = this.rawSnapshot.rodadaAtiva;
		if (!rodada) return;
		const meta = rodada.metaOculta ?? 50;
		const offset = Math.floor(Math.random() * 17) - 8;
		const target = clampInt(meta + offset, 5, 95);
		const start = rodada.palpite ?? 50;
		const totalFrames = 12;

		for (let i = 1; i <= totalFrames; i++) {
			this.scheduleTimer(
				() => {
					if (this.rawSnapshot.fase !== 'RODADA_PALPITE' || !this.rawSnapshot.rodadaAtiva) return;
					const progress = i / totalFrames;
					const pos = clampInt(start + (target - start) * progress, 0, 100);
					this.rawSnapshot.rodadaAtiva.palpite = pos;
					this.rawSnapshot.rodadaAtiva.sliderPosicao = pos;
					this.activeSocket?.callbacks.onSliderStream?.(pos);
					this.notify();

					if (i === totalFrames) {
						this.scheduleTimer(() => {
							if (this.rawSnapshot.fase === 'RODADA_PALPITE') {
								this.applyRevealFromRound();
							}
						}, 350);
					}
				},
				1300 + i * 110
			);
		}
	}

	private applyRevealFromRound() {
		const rodada = this.rawSnapshot.rodadaAtiva;
		if (!rodada) return;

		const meta = rodada.metaOculta ?? 50;
		const palpite = clampInt(rodada.palpite ?? 50, 0, 100);
		const score = calculateScore(meta, palpite);
		const tierGo = score.tier === 'ERRO' ? 'FORA_DA_MARGEM' : score.tier;
		const equipe: TeamId = rodada.equipe ?? this.rawSnapshot.equipeAtiva ?? 'A';

		if (equipe === 'A') {
			this.rawSnapshot.placarA = (this.rawSnapshot.placarA ?? 0) + score.points;
		} else {
			this.rawSnapshot.placarB = (this.rawSnapshot.placarB ?? 0) + score.points;
		}

		rodada.palpite = palpite;
		rodada.pontos = score.points;
		rodada.tier = tierGo;
		rodada.label = score.label;
		rodada.diff = score.diff;
		rodada.sliderPosicao = null;
		rodada.transicaoEm = new Date(Date.now() + 6500).toISOString();

		const historyEntry: RoundHistoryEntry = {
			numero: rodada.numero ?? this.rawSnapshot.rodada ?? 1,
			equipe,
			codificadorId: rodada.codificadorId ?? 'p1',
			palpiteiroId: rodada.palpiteiroId ?? 'p2',
			espectroEsquerda: rodada.espectroEsquerda ?? 'Insosso',
			espectroDireita: rodada.espectroDireita ?? 'Salgado',
			metaOculta: meta,
			palpite,
			dica: rodada.dica ?? '',
			pontos: score.points,
			tier: score.tier,
			diff: score.diff,
			duracaoSegundos: 18
		};
		this.rawSnapshot.historico = [...(this.rawSnapshot.historico ?? []), historyEntry];
		this.rawSnapshot.fase = 'REVELACAO';

		this.emitSyncToSocket(true);

		if (this._autoAdvanceReveal) {
			this.scheduleRevealAdvance();
		}
	}

	private scheduleRevealAdvance() {
		this.scheduleTimer(() => {
			this.advanceAfterReveal();
		}, 6500);
	}

	private advanceAfterReveal() {
		const placarA = this.rawSnapshot.placarA ?? 0;
		const placarB = this.rawSnapshot.placarB ?? 0;

		if (placarA >= 10 || placarB >= 10) {
			this.rawSnapshot.fase = 'FIM_JOGO';
			this.rawSnapshot.vencedor = placarA >= 10 ? 'A' : 'B';
			this.rawSnapshot.motivoFim = 'VITORIA';
			if (this.rawSnapshot.rodadaAtiva) {
				this.rawSnapshot.rodadaAtiva.transicaoEm = null;
			}
			this.emitSyncToSocket(true);
			return;
		}

		const nextTeam: TeamId = (this.rawSnapshot.equipeAtiva ?? 'A') === 'A' ? 'B' : 'A';
		const nextRodada = (this.rawSnapshot.rodada ?? 1) + 1;
		this.openSpectrumChoice(nextTeam, nextRodada);
	}

	private ensureFourPlayers() {
		if (!this.rawSnapshot.jogadores || this.rawSnapshot.jogadores.length < 4) {
			this.rawSnapshot.jogadores = JSON.parse(
				JSON.stringify(SANDBOX_PRESETS.lobby_quorum_completo.snapshot.jogadores)
			);
		}
		for (const j of this.rawSnapshot.jogadores || []) {
			j.papel = 'ESPECTADOR';
		}
	}

	public handleSocketAction(tipo: string, payload: Record<string, any>) {
		if (tipo !== 'SLIDER_MOVER' && tipo !== 'MOVER_SLIDER') {
			this.logAction(tipo, JSON.stringify(payload));
		}

		switch (tipo) {
			case 'ESCOLHER_EQUIPE': {
				const eq = payload.equipe as LobbyTeamChoice;
				const jogs = this.rawSnapshot.jogadores || [];
				const me = jogs.find((j) => (j.playerId || j.id) === this.activePovId);
				if (me) {
					me.equipe = eq;
				}
				this.emitSyncToSocket(true);
				break;
			}

			case 'INICIAR_PARTIDA': {
				this.loadPreset('ppt_escolha', true);
				break;
			}

			case 'LANCE_PPT': {
				const lance = payload.lance as PptMove;
				const ppt = this.rawSnapshot.ppt;
				if (!ppt) break;

				const myTeam = this.getActivePlayerTeam();
				if (myTeam === 'A') {
					ppt.enviouA = true;
					ppt.lanceA = lance;
					ppt.meuLance = lance;
				} else if (myTeam === 'B') {
					ppt.enviouB = true;
					ppt.lanceB = lance;
					ppt.meuLance = lance;
				}

				this.emitSyncToSocket(true);

				if (ppt.enviouA && ppt.enviouB) {
					this.enterPptContagem();
				} else if (this._autoBotsEnabled) {
					this.scheduleTimer(() => {
						if (!this.rawSnapshot.ppt || this.rawSnapshot.ppt.estado !== 'ESCOLHA') return;
						const botLance = PPT_MOVES[Math.floor(Math.random() * PPT_MOVES.length)];
						if (!this.rawSnapshot.ppt.enviouA) {
							this.rawSnapshot.ppt.enviouA = true;
							this.rawSnapshot.ppt.lanceA = botLance;
						} else if (!this.rawSnapshot.ppt.enviouB) {
							this.rawSnapshot.ppt.enviouB = true;
							this.rawSnapshot.ppt.lanceB = botLance;
						}
						this.enterPptContagem();
					}, 650);
				}
				break;
			}

			case 'PRE_SELECIONAR_ESPECTRO': {
				if (this.rawSnapshot.rodadaAtiva) {
					this.rawSnapshot.rodadaAtiva.cartaSelecionadaId = payload.cartaId;
					this.emitSyncToSocket(true);
				}
				break;
			}

			case 'VOTAR_ESPECTRO': {
				if (this.rawSnapshot.rodadaAtiva) {
					const atual = this.rawSnapshot.rodadaAtiva.votoParceiroCartaId;
					this.rawSnapshot.rodadaAtiva.votoParceiroCartaId =
						atual === payload.cartaId ? null : payload.cartaId;
					this.emitSyncToSocket(true);
				}
				break;
			}

			case 'ESCOLHER_ESPECTRO': {
				this.confirmSpectrumChoice(String(payload.cartaId || ''));
				break;
			}

			case 'SUBMETER_DICA': {
				this.submitClueAndTransition(String(payload.dica || ''));
				break;
			}

			case 'SLIDER_MOVER':
			case 'MOVER_SLIDER': {
				const pos = clampInt(Number(payload.posicao), 0, 100);
				if (this.rawSnapshot.rodadaAtiva) {
					if (this.rawSnapshot.rodadaAtiva.palpite === pos) {
						break;
					}
					this.rawSnapshot.rodadaAtiva.palpite = pos;
					this.rawSnapshot.rodadaAtiva.sliderPosicao = pos;
				}
				this.activeSocket?.callbacks.onSliderStream?.(pos);
				this.notify();
				break;
			}

			case 'CONFIRMAR_PALPITE': {
				this.applyRevealFromRound();
				break;
			}

			case 'REVANCHE': {
				this.clearTimers();
				this.ensureFourPlayers();
				this.lastCodificadorByTeam = {};
				this.lastLiderByTeam = {};
				this.lockedHiddenTarget = null;
				this.rawSnapshot.fase = 'INICIATIVA';
				this.rawSnapshot.rodada = 1;
				this.rawSnapshot.equipeAtiva = 'A';
				this.rawSnapshot.placarA = 0;
				this.rawSnapshot.placarB = 0;
				this.rawSnapshot.vencedor = null;
				this.rawSnapshot.motivoFim = null;
				this.rawSnapshot.historico = [];
				this.rawSnapshot.rodadaAtiva = undefined;
				this.rawSnapshot.cartasOpcoes = undefined;
				this.rawSnapshot.cartasEspectroOpcoes = undefined;
				this.rawSnapshot.ppt = {
					estado: 'ESCOLHA',
					prazo: new Date(Date.now() + 20000).toISOString(),
					enviouA: false,
					enviouB: false,
					representanteA: 'p1',
					representanteB: 'p3'
				};
				if (this._autoFollowPov) {
					this.activePovId = 'p1';
					this.syncSessionStorage();
				}
				this.emitSyncToSocket(true);
				break;
			}

			case 'DESFAZER_PARTIDA': {
				this.clearTimers();
				this.ensureFourPlayers();
				this.lastCodificadorByTeam = {};
				this.lastLiderByTeam = {};
				this.lockedHiddenTarget = null;
				this.rawSnapshot.fase = 'LOBBY';
				this.rawSnapshot.rodada = 1;
				this.rawSnapshot.equipeAtiva = 'A';
				this.rawSnapshot.placarA = 0;
				this.rawSnapshot.placarB = 0;
				this.rawSnapshot.vencedor = null;
				this.rawSnapshot.motivoFim = null;
				this.rawSnapshot.historico = [];
				this.rawSnapshot.ppt = undefined;
				this.rawSnapshot.rodadaAtiva = undefined;
				this.rawSnapshot.cartasOpcoes = undefined;
				this.rawSnapshot.cartasEspectroOpcoes = undefined;
				this.emitSyncToSocket(true);
				break;
			}

			case 'EXPULSAR_JOGADOR': {
				this.logAction('EXPULSAR_JOGADOR', `Jogador expulso: ${payload.targetPlayerId}`);
				break;
			}

			case 'BANIR_JOGADOR': {
				this.logAction('BANIR_JOGADOR', `Jogador banido: ${payload.targetPlayerId}`);
				break;
			}
		}
	}
}

export const sandboxController = new SandboxController();

export class GameSocket {
	public roomCode = '';
	public playerId = '';
	public token = '';
	public nome = '';
	public callbacks: GameSocketCallbacks;
	public options: GameSocketOptions;
	private status: SocketStatus = 'DESCONECTADO';

	constructor(callbacks: GameSocketCallbacks = {}, options: GameSocketOptions = {}) {
		this.callbacks = callbacks;
		this.options = options;
		sandboxController.activeSocket = this;
	}

	public conectar(roomCode: string, playerId: string, token: string, nome: string) {
		this.roomCode = roomCode;
		this.playerId = playerId;
		this.token = token;
		this.nome = nome;
		this.status = 'CONECTADO';
		this.callbacks.onStatusChange?.('CONECTADO');

		sandboxController.activeSocket = this;
		if (playerId && SANDBOX_PLAYERS[playerId]) {
			sandboxController.activePovId = playerId;
		}
		if (sandboxController.activePresetId === 'modal_apelido') {
			sandboxController.activePresetId = 'lobby_host_sozinho';
			sandboxController.rawSnapshot = JSON.parse(
				JSON.stringify(SANDBOX_PRESETS.lobby_host_sozinho.snapshot)
			);
			sandboxController.emitSyncToSocket(true);
		} else {
			// Ponto Crítico 5: NÃO disparar notify() em presets normais ao conectar
			sandboxController.emitSyncToSocket(false);
		}
	}

	public desconectar() {
		this.status = 'DESCONECTADO';
		this.callbacks.onStatusChange?.('DESCONECTADO');
	}

	public enviar(tipo: string, payload: Record<string, any> = {}) {
		sandboxController.handleSocketAction(tipo, payload);
		return true;
	}

	public escolherEquipe(equipe: 'A' | 'B' | 'ALEATORIO') {
		return this.enviar('ESCOLHER_EQUIPE', { equipe });
	}

	public iniciarPartida() {
		return this.enviar('INICIAR_PARTIDA', {});
	}

	public expulsarJogador(targetPlayerId: string) {
		return this.enviar('EXPULSAR_JOGADOR', { targetPlayerId, alvoId: targetPlayerId });
	}

	public banirJogador(targetPlayerId: string) {
		return this.enviar('BANIR_JOGADOR', { targetPlayerId, alvoId: targetPlayerId });
	}

	public desfazerPartida() {
		return this.enviar('DESFAZER_PARTIDA', {});
	}

	public lancePpt(lance: 'pedra' | 'papel' | 'tesoura') {
		return this.enviar('LANCE_PPT', { lance });
	}

	public preSelecionarEspectro(cartaId: string) {
		return this.enviar('PRE_SELECIONAR_ESPECTRO', { cartaId });
	}

	public votarEspectro(cartaId: string) {
		return this.enviar('VOTAR_ESPECTRO', { cartaId });
	}

	public escolherEspectro(cartaId: string) {
		return this.enviar('ESCOLHER_ESPECTRO', { cartaId });
	}

	public submeterDica(dica: string) {
		return this.enviar('SUBMETER_DICA', { dica });
	}

	public moverSlider(posicao: number) {
		return this.enviar('SLIDER_MOVER', { posicao });
	}

	public confirmarPalpite() {
		return this.enviar('CONFIRMAR_PALPITE', {});
	}

	public revanche() {
		return this.enviar('REVANCHE', {});
	}

	public getStatus(): SocketStatus {
		return this.status;
	}
}
