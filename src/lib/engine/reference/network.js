// @ts-nocheck
/* eslint-disable */

/**
 * Módulo Central de Rede e Sincronização Autoritativa
 * Coordena conexão com PocketBase, reconciliação de estado, assinaturas SSE
 * e delega responsabilidades de sessão (NetworkSession) e ações de jogo (NetworkActions).
 */

class NetworkManager {
	constructor(roomCode, onMessage, onStatusChange, getRoundId) {
		this.roomCode = roomCode;
		this.onMessage = onMessage;
		this.onStatusChange = onStatusChange;
		this.getRoundId = typeof getRoundId === 'function' ? getRoundId : () => 1;
		this.backendUrl = window.__BACKEND_URL__ || 'http://localhost:8090';

		this.pb = null;
		this.isConnected = false;
		this.isSynchronizing = false;
		this.syncError = null;

		this.opponentId = null;
		this.opponentLastSeen = 0;
		this.myEquipe = null; // 'A' ou 'B'
		this.salaRecord = null;
		this.jogadorRecord = null;

		// 1. Módulo de Sessão e Identidade Local
		this.session = new NetworkSession(this.roomCode, () => {
			if (this.isConnected) {
				this.reconcileState();
			}
		});
		this.myId = this.session.playerId;

		// 2. Módulo de Ações de Jogo e Presença
		this.actions = new NetworkActions(
			() => this.pb,
			this.roomCode,
			this.myId,
			this.onMessage,
			() => this.reconcileState()
		);
	}

	async connect() {
		this.onStatusChange(`Conectando ao PocketBase (${this.backendUrl})...`);

		if (typeof PocketBase === 'undefined') {
			this.onStatusChange('Aguardando cliente PocketBase carregar...');
			setTimeout(() => this.connect(), 300);
			return;
		}

		try {
			this.pb = new PocketBase(this.backendUrl);
			await this.reconcileState(true);
			this.setupRealtimeSubscriptions();
		} catch (err) {
			console.error('[PocketBase Connect Error]', err);
			this.isConnected = false;
			this.syncError = 'Falha de conexão com o servidor. Verifique a URL do backend.';
			this.onStatusChange('Falha de conexão com o PocketBase. Tentando novamente...');
			setTimeout(() => this.connect(), 3000);
		}
	}

	/**
	 * Re-hidratação de Estado (Full State Resync)
	 * Busca o estado autoritativo no banco de dados e sobrescreve o cache local.
	 * Protegido por timeout e retry com exponential backoff.
	 */
	async reconcileState(isInitial = false) {
		if (!this.pb) return;

		this.isSynchronizing = true;
		this.syncError = null;

		let retries = 3;
		let delay = 1000;

		while (retries > 0) {
			try {
				await this._performReconcile();
				this.isSynchronizing = false;
				this.syncError = null;
				this.isConnected = true;
				return;
			} catch (err) {
				retries--;
				console.warn(`[Network Reconcile] Tentativa falhou (${3 - retries}/3):`, err);
				if (retries === 0) {
					this.isSynchronizing = false;
					this.syncError = 'Não foi possível sincronizar com o servidor. Verifique sua conexão.';
					this.onStatusChange('Servidor indisponível.');
					return;
				}
				await new Promise((res) => setTimeout(res, delay));
				delay *= 2;
			}
		}
	}

	async _performReconcile() {
		// Timeout de segurança de 5 segundos para a requisição
		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(() => reject(new Error('Timeout de sincronização excedido')), 5000)
		);

		const syncWork = async () => {
			// 1. Obter ou Criar a Sala no PocketBase
			const salas = await this.pb.collection('salas').getList(1, 1, {
				filter: `codigo = "${this.roomCode}"`
			});

			if (salas.items.length > 0) {
				this.salaRecord = salas.items[0];
			} else {
				this.salaRecord = await this.pb.collection('salas').create({
					codigo: this.roomCode,
					fase: 'INICIATIVA',
					rodada_atual: 1,
					equipe_ativa: 'A',
					placar_a: 0,
					placar_b: 0
				});
			}

			// 2. Obter jogadores na sala
			const jogadores = await this.pb.collection('jogadores').getList(1, 20, {
				filter: `sala_codigo = "${this.roomCode}"`
			});

			// Limiar de 45 segundos para considerar um jogador ativo
			const ACTIVE_THRESHOLD_MS = 45000;
			const isPlayerActive = (j) => {
				if (!j || !j.last_seen) return false;
				const parsed = new Date(String(j.last_seen).replace(' ', 'T')).getTime();
				return !isNaN(parsed) && Date.now() - parsed < ACTIVE_THRESHOLD_MS;
			};

			// Verifica se este jogador já possui cadastro ativo na sala
			let myRecord = jogadores.items.find((j) => j.player_id === this.myId);

			// Filtra oponentes comprovadamente ativos na sala
			const activeOpponents = jogadores.items.filter(
				(j) => j.player_id !== this.myId && isPlayerActive(j)
			);

			if (!myRecord) {
				// Atribui equipe de forma balanceada considerando apenas jogadores ativos
				const activeTeamA = activeOpponents.filter((j) => j.equipe === 'A').length;
				const activeTeamB = activeOpponents.filter((j) => j.equipe === 'B').length;

				if (activeTeamA === 0) {
					this.myEquipe = 'A';
				} else if (activeTeamB === 0) {
					this.myEquipe = 'B';
				} else {
					// Se ambas tiverem jogadores ativos, entra na que possui menor contingente
					this.myEquipe = activeTeamA <= activeTeamB ? 'A' : 'B';
				}

				myRecord = await this.pb.collection('jogadores').create({
					sala_codigo: this.roomCode,
					player_id: this.myId,
					nome: this.myId.replace('player_', 'Jogador '),
					equipe: this.myEquipe,
					papel: 'CODIFICADOR',
					last_seen: new Date().toISOString()
				});
			} else {
				this.myEquipe = myRecord.equipe;
				try {
					myRecord = await this.pb.collection('jogadores').update(myRecord.id, {
						last_seen: new Date().toISOString()
					});
				} catch (_) {}
			}
			this.jogadorRecord = myRecord;

			// 3. Atualizar oponente ativo (prioriza o mais recente)
			const latestOpponent = activeOpponents.sort((a, b) => {
				const timeA = new Date(String(a.last_seen).replace(' ', 'T')).getTime() || 0;
				const timeB = new Date(String(b.last_seen).replace(' ', 'T')).getTime() || 0;
				return timeB - timeA;
			})[0];

			if (latestOpponent) {
				this.opponentId = latestOpponent.player_id;
				this.opponentLastSeen = millis();
			} else {
				this.opponentId = null;
				this.opponentLastSeen = 0;
			}

			// 4. Verificar status de lances da rodada atual
			let pptStatus = null;
			try {
				const currentRound = this.salaRecord.rodada_atual || 1;
				pptStatus = await this.pb.send(
					`/api/ppt/status?sala_codigo=${encodeURIComponent(this.roomCode)}&rodada=${currentRound}`,
					{ method: 'GET' }
				);
			} catch (_) {}

			// 5. Notificar motor de jogo para hidratação autoritativa completa
			this.onMessage({
				type: 'FULL_SYNC',
				sala: this.salaRecord,
				myEquipe: this.myEquipe,
				opponent: latestOpponent || null,
				pptStatus: pptStatus
			});

			const statusEquipe = this.opponentId ? '2 jogadores na sala' : 'Aguardando oponente entrar';
			this.onStatusChange(`Conectado como Equipe ${this.myEquipe}. ${statusEquipe}.`);
		};

		return Promise.race([syncWork(), timeoutPromise]);
	}

	async setupRealtimeSubscriptions() {
		try {
			try {
				this.pb.collection('salas').unsubscribe();
				this.pb.collection('jogadores').unsubscribe();
			} catch (_) {}

			// 1. Assinar atualizações da sala via SSE
			await this.pb.collection('salas').subscribe(this.salaRecord.id, async (e) => {
				if (e.action === 'update') {
					this.salaRecord = e.record;
					this.onMessage({
						type: 'SALA_UPDATE',
						sala: e.record
					});

					// Consulta status de lances para a rodada em que o jogador atualmente se encontra
					const activeRound = this.getRoundId();
					this.actions.verificarStatusOponente(activeRound, this.myEquipe);
				}
			});

			// 2. Assinar presença de jogadores via SSE com validação ativa
			await this.pb.collection('jogadores').subscribe('*', (e) => {
				if (e.record.sala_codigo !== this.roomCode) return;

				if (e.action === 'delete') {
					if (e.record.player_id !== this.myId) {
						if (this.opponentId === e.record.player_id) {
							console.log('[Presence SSE] Oponente desconectou ou foi purgado pelo servidor.');
							this.opponentId = null;
							this.opponentLastSeen = 0;
							this.onMessage({
								type: 'OPPONENT_OFFLINE',
								opponentId: e.record.player_id
							});
						}
					} else {
						// O próprio jogador foi expurgado por inatividade pelo cleanup
						console.log('[Presence SSE] Registro próprio foi purgado. Re-cadastrando...');
						this.jogadorRecord = null;
						this.reconcileState();
					}
				} else if (e.action === 'create' || e.action === 'update') {
					if (e.record.player_id !== this.myId) {
						const isFirstOpponent = !this.opponentId || this.opponentId === e.record.player_id;
						this.opponentId = e.record.player_id;
						this.opponentLastSeen = millis();
						if (isFirstOpponent) {
							this.onMessage({
								type: 'OPPONENT_ONLINE',
								opponent: e.record
							});
						}
					}
				}
			});
		} catch (err) {
			console.warn('[SSE Subscription Warning]', err);
		}
	}

	async enviarLance(lance, rodada) {
		if (!this.isConnected) return;
		await this.actions.enviarLance(this.myEquipe, lance, rodada);
	}

	stopStatusPolling() {
		this.actions.stopStatusPolling();
	}

	updateHeartbeat() {
		if (!this.isConnected) return;
		this.actions.updateHeartbeat(this.jogadorRecord);
	}

	isOpponentOnline() {
		if (!this.opponentId) return false;
		return millis() - this.opponentLastSeen < 30000;
	}
}
