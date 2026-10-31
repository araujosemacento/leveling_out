import type { LobbyTeamChoice, PptMove, SnapshotSalaProjetado } from '$lib/engine/types';
import {
	projectSnapshotForPlayer,
	SANDBOX_PLAYERS,
	SANDBOX_PRESETS,
	PRESET_SEQUENCE,
	type SandboxPresetId
} from '../presets';

export type SocketStatus = 'DESCONECTADO' | 'CONECTANDO' | 'CONECTADO' | 'ERRO';

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

class SandboxController {
	public activePresetId: SandboxPresetId = 'lobby_quorum_completo';
	public activePovId: string = 'p1';
	public rawSnapshot: SnapshotSalaProjetado = JSON.parse(
		JSON.stringify(SANDBOX_PRESETS.lobby_quorum_completo.snapshot)
	);
	public actionLog: ActionLogEntry[] = [];
	public activeSocket: GameSocket | null = null;
	private listeners = new Set<() => void>();

	constructor() {
		this.syncSessionStorage();
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

	public loadPreset(presetId: SandboxPresetId, keepCurrentPov = false) {
		const preset = SANDBOX_PRESETS[presetId];
		if (!preset) return;

		this.activePresetId = presetId;
		if (!keepCurrentPov) {
			this.activePovId = preset.defaultPovId;
		}
		this.rawSnapshot = JSON.parse(JSON.stringify(preset.snapshot));

		this.syncSessionStorage();
		this.emitSyncToSocket(false);
		this.logAction('LOAD_PRESET', `Preset "${preset.titulo}" carregado`);
	}

	public setPov(povId: string) {
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

	public triggerTimeout() {
		const fase = this.rawSnapshot.fase;
		if (fase === 'INICIATIVA') {
			this.loadPreset('ppt_resultado_vitoria', true);
		} else if (fase === 'ESCOLHA_ESPECTRO') {
			this.loadPreset('rodada_dica', true);
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

	public handleSocketAction(tipo: string, payload: Record<string, any>) {
		if (tipo !== 'SLIDER_MOVER' && tipo !== 'MOVER_SLIDER') {
			this.logAction(tipo, JSON.stringify(payload));
		}

		switch (tipo) {
			case 'ESCOLHER_EQUIPE': {
				const eq = payload.equipe as LobbyTeamChoice;
				const jogs = this.rawSnapshot.jogadores || [];
				const me = jogs.find((j: any) => (j.playerId || j.id) === this.activePovId);
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
				if (this.rawSnapshot.ppt) {
					if (this.activePovId === 'p1' || this.activePovId === 'p2') {
						this.rawSnapshot.ppt.enviouA = true;
						this.rawSnapshot.ppt.lanceA = lance;
						this.rawSnapshot.ppt.meuLance = lance;
					} else {
						this.rawSnapshot.ppt.enviouB = true;
						this.rawSnapshot.ppt.lanceB = lance;
						this.rawSnapshot.ppt.meuLance = lance;
					}

					if (this.rawSnapshot.ppt.enviouA && this.rawSnapshot.ppt.enviouB) {
						this.loadPreset('ppt_resultado_vitoria', true);
					} else {
						this.emitSyncToSocket(true);
					}
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
				this.loadPreset('rodada_dica', true);
				break;
			}

			case 'SUBMETER_DICA': {
				this.loadPreset('rodada_palpite', true);
				if (this.rawSnapshot.rodadaAtiva && payload.dica) {
					this.rawSnapshot.rodadaAtiva.dica = payload.dica;
					this.emitSyncToSocket(true);
				}
				break;
			}

			case 'SLIDER_MOVER':
			case 'MOVER_SLIDER': {
				const pos = Math.round(payload.posicao);
				if (this.rawSnapshot.rodadaAtiva) {
					if (this.rawSnapshot.rodadaAtiva.palpite === pos) {
						break;
					}
					this.rawSnapshot.rodadaAtiva.palpite = pos;
				}
				this.activeSocket?.callbacks.onSliderStream?.(pos);
				this.notify();
				break;
			}

			case 'CONFIRMAR_PALPITE': {
				const palpiteAtual = this.rawSnapshot.rodadaAtiva?.palpite;
				this.loadPreset('rodada_revelacao', true);
				if (this.rawSnapshot.rodadaAtiva && palpiteAtual !== undefined && palpiteAtual !== null) {
					this.rawSnapshot.rodadaAtiva.palpite = palpiteAtual;
					this.emitSyncToSocket(true);
				}
				break;
			}

			case 'REVANCHE': {
				this.loadPreset('ppt_escolha', true);
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
