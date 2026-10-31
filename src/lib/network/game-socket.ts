import { getBackendUrl, getProxySecret } from '$lib/config/backend';
import { getOrCreateDeviceId } from '$lib/config/device';

export interface WelcomePayload {
	playerId: string;
	sessionToken: string;
	isHost: boolean;
	nome: string;
	salaCodigo: string;
}

export type SocketStatus = 'DESCONECTADO' | 'CONECTANDO' | 'CONECTADO';

export interface GameSocketCallbacks {
	onWelcome?: (welcome: WelcomePayload) => void;
	onSync?: (snapshot: any) => void;
	onSliderStream?: (posicao: number) => void;
	onNotification?: (msg: string, tipo: string) => void;
	onKicked?: (motivo: string) => void;
	onBanned?: (motivo: string) => void;
	onError?: (msg: string) => void;
	onStatusChange?: (status: SocketStatus) => void;
}

export interface GameSocketOptions {
	backendUrl?: string;
	proxySecret?: string;
}

/**
 * Cliente WebSocket autoritativo com reconexão automática resiliente e despacho tipado
 */
export class GameSocket {
	private ws: WebSocket | null = null;
	private status: SocketStatus = 'DESCONECTADO';
	private callbacks: GameSocketCallbacks = {};
	private options: GameSocketOptions = {};
	private roomCode = '';
	private playerId = '';
	private token = '';
	private nome = '';
	private reconectarTimer: ReturnType<typeof setTimeout> | null = null;
	private tentativasReconexao = 0;
	private desconexaoIntencional = false;
	private pendingSliderRaf: number | null = null;
	private lastSliderPos: number | null = null;

	constructor(callbacks: GameSocketCallbacks = {}, options: GameSocketOptions = {}) {
		this.callbacks = callbacks;
		this.options = options;
	}

	public conectar(roomCode: string, playerId: string, token: string = '', nome: string = '') {
		if (typeof window === 'undefined') return;

		this.roomCode = roomCode;
		this.playerId = playerId;
		this.token = token;
		this.nome = nome;
		this.desconexaoIntencional = false;

		this.estabelecerConexao();
	}

	private estabelecerConexao() {
		if (this.ws) {
			try {
				this.ws.close();
			} catch {
				// Ignora erro em fechamento anterior
			}
			this.ws = null;
		}

		this.atualizarStatus('CONECTANDO');

		const httpUrl = this.options.backendUrl || getBackendUrl();
		const wsProto = httpUrl.startsWith('https') ? 'wss:' : 'ws:';
		const host = httpUrl.replace(/^https?:\/\//, '');

		const params = new URLSearchParams({
			player_id: this.playerId,
			device_id: getOrCreateDeviceId(),
			token: this.token || '',
			nome: this.nome || ''
		});

		const proxySecret = this.options.proxySecret ?? getProxySecret();
		if (proxySecret) {
			params.set('x-proxy-secret', proxySecret);
		}

		const wsUrl = `${wsProto}//${host}/ws/salas/${encodeURIComponent(this.roomCode)}?${params.toString()}`;

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				this.tentativasReconexao = 0;
				this.atualizarStatus('CONECTADO');
			};

			this.ws.onmessage = (event: MessageEvent) => {
				try {
					const data = JSON.parse(event.data);
					this.processarMensagem(data);
				} catch {
					// Ignora formatos não JSON
				}
			};

			this.ws.onclose = (event: CloseEvent) => {
				this.atualizarStatus('DESCONECTADO');

				// 1. Banimento (código 1008 ou reason contendo "banido")
				if (event.code === 1008 || (event.reason && event.reason.includes('banido'))) {
					this.desconexaoIntencional = true;
					if (this.reconectarTimer) clearTimeout(this.reconectarTimer);
					if (this.callbacks.onBanned) {
						this.callbacks.onBanned('Você foi banido desta sala pelo anfitrião.');
					}
					return;
				}

				// 2. Expulsão pontual (código 4001 ou reason contendo "expulso")
				if (event.code === 4001 || (event.reason && event.reason.includes('expulso'))) {
					this.desconexaoIntencional = true;
					if (this.reconectarTimer) clearTimeout(this.reconectarTimer);
					if (this.callbacks.onKicked) {
						this.callbacks.onKicked('Você foi expulso da sala pelo anfitrião.');
					}
					return;
				}

				if (!this.desconexaoIntencional) {
					this.agendarReconexao();
				}
			};

			this.ws.onerror = () => {
				this.atualizarStatus('DESCONECTADO');
			};
		} catch (err) {
			console.warn('[WS] Falha ao iniciar WebSocket:', err);
			this.agendarReconexao();
		}
	}

	private processarMensagem(msg: { tipo: string; payload: any }) {
		switch (msg.tipo) {
			case 'BEM_VINDO':
				if (this.callbacks.onWelcome) {
					this.token = msg.payload.sessionToken;
					this.callbacks.onWelcome(msg.payload);
				}
				break;

			case 'SYNC':
				if (this.callbacks.onSync) {
					this.callbacks.onSync(msg.payload);
				}
				break;

			case 'SLIDER_STREAM':
				if (this.callbacks.onSliderStream && typeof msg.payload?.posicao === 'number') {
					this.callbacks.onSliderStream(msg.payload.posicao);
				}
				break;

			case 'KICKADO':
				this.desconexaoIntencional = true;
				if (this.reconectarTimer) clearTimeout(this.reconectarTimer);
				this.desconectar();
				if (this.callbacks.onKicked) {
					this.callbacks.onKicked(
						msg.payload?.motivo || 'Você foi expulso da sala pelo anfitrião.'
					);
				}
				break;

			case 'BANIDO':
				this.desconexaoIntencional = true;
				if (this.reconectarTimer) clearTimeout(this.reconectarTimer);
				this.desconectar();
				if (this.callbacks.onBanned) {
					this.callbacks.onBanned(
						msg.payload?.motivo ||
							'Você foi banido desta sala pelo anfitrião e não poderá retornar deste dispositivo.'
					);
				}
				break;

			case 'NOTIFICACAO':
				if (this.callbacks.onNotification) {
					this.callbacks.onNotification(msg.payload?.mensagem, msg.payload?.tipo || 'info');
				}
				break;

			case 'ERRO':
				if (this.callbacks.onError) {
					this.callbacks.onError(msg.payload?.mensagem || 'Erro desconhecido');
				}
				break;
		}
	}

	private agendarReconexao() {
		if (this.reconectarTimer) clearTimeout(this.reconectarTimer);

		// Backoff exponencial com teto de 5 segundos
		const delay = Math.min(1000 * Math.pow(1.5, this.tentativasReconexao), 5000);
		this.tentativasReconexao++;

		this.reconectarTimer = setTimeout(() => {
			if (!this.desconexaoIntencional) {
				this.estabelecerConexao();
			}
		}, delay);
	}

	public desconectar() {
		this.desconexaoIntencional = true;
		if (this.reconectarTimer) clearTimeout(this.reconectarTimer);
		if (this.ws) {
			try {
				this.ws.close();
			} catch {
				// Ignora
			}
			this.ws = null;
		}
		this.atualizarStatus('DESCONECTADO');
	}

	public enviar(tipo: string, payload: Record<string, any> = {}) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			return false;
		}
		try {
			this.ws.send(JSON.stringify({ tipo, payload }));
			return true;
		} catch {
			return false;
		}
	}

	// ==========================================
	// Comandos Tipados de Ação do Jogo
	// ==========================================

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

	/**
	 * Transmissão contínua do arrasto do slider analógico throttled por requestAnimationFrame
	 */
	public moverSlider(posicao: number) {
		this.lastSliderPos = posicao;
		if (this.pendingSliderRaf !== null) return;

		this.pendingSliderRaf = requestAnimationFrame(() => {
			this.pendingSliderRaf = null;
			if (this.lastSliderPos !== null) {
				this.enviar('SLIDER_MOVER', { posicao: this.lastSliderPos });
			}
		});
	}

	public confirmarPalpite() {
		return this.enviar('CONFIRMAR_PALPITE', {});
	}

	public revanche() {
		return this.enviar('REVANCHE', {});
	}

	private atualizarStatus(novoStatus: SocketStatus) {
		this.status = novoStatus;
		if (this.callbacks.onStatusChange) {
			this.callbacks.onStatusChange(novoStatus);
		}
	}

	public getStatus(): SocketStatus {
		return this.status;
	}
}
