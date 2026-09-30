// @ts-nocheck
/* eslint-disable */

/**
 * Módulo de Ações e Presença em Tempo Real
 * Gerencia envio de lances de Pedra, Papel e Tesoura, polling de contingência e heartbeat de presença.
 */

class NetworkActions {
	/**
	 * @param {() => any} pbProvider Função que retorna a instância ativa do PocketBase
	 * @param {string} roomCode Código da sala
	 * @param {string} playerId ID do jogador local
	 * @param {(msg: any) => void} onMessage Callback para entrega de mensagens à máquina de estados
	 * @param {() => void} onReconcileRequest Solicitação de re-sincronização do estado
	 */
	constructor(pbProvider, roomCode, playerId, onMessage, onReconcileRequest) {
		this.pbProvider = pbProvider;
		this.roomCode = roomCode;
		this.playerId = playerId;
		this.onMessage = onMessage;
		this.onReconcileRequest = onReconcileRequest;
		this.statusPollingTimer = null;
		this._lastHeartbeat = 0;
	}

	get pb() {
		return this.pbProvider();
	}

	async enviarLance(equipe, lance, rodada) {
		if (!this.pb) return;
		try {
			const response = await this.pb.send('/api/ppt/lance', {
				method: 'POST',
				body: {
					sala_codigo: this.roomCode,
					player_id: this.playerId,
					equipe: equipe,
					lance: lance,
					rodada: rodada
				}
			});

			if (response.status === 'RESOLVIDO') {
				this.stopStatusPolling();
				this.onMessage({
					type: 'PPT_RESOLVIDO',
					data: response
				});
			} else if (response.status === 'AGUARDANDO_OPONENTE') {
				this.startStatusPolling(rodada);
			}
		} catch (err) {
			console.error('[NetworkActions Lance Error]', err);
		}
	}

	async verificarStatusOponente(rodada, myEquipe) {
		if (!this.pb) return;
		try {
			const res = await this.pb.send(
				`/api/ppt/status?sala_codigo=${encodeURIComponent(this.roomCode)}&rodada=${rodada}`,
				{ method: 'GET' }
			);

			if (res.status === 'RESOLVIDO') {
				this.stopStatusPolling();
				this.onMessage({
					type: 'PPT_RESOLVIDO',
					data: res
				});
			} else if (res.ultimo_resultado && res.ultimo_resultado.status === 'RESOLVIDO') {
				this.stopStatusPolling();
				this.onMessage({
					type: 'PPT_RESOLVIDO',
					data: res.ultimo_resultado
				});
			} else if (res.equipes_enviadas && Array.isArray(res.equipes_enviadas)) {
				const opponentTeam = myEquipe === 'A' ? 'B' : 'A';
				if (res.equipes_enviadas.includes(opponentTeam)) {
					this.onMessage({
						type: 'OPPONENT_MOVED',
						rodada: rodada
					});
				}
			}
		} catch (_) {}
	}

	startStatusPolling(rodada) {
		this.stopStatusPolling();
		this.statusPollingTimer = setInterval(async () => {
			if (!this.pb) return;
			try {
				const response = await this.pb.send(
					`/api/ppt/status?sala_codigo=${encodeURIComponent(this.roomCode)}&rodada=${rodada}`,
					{ method: 'GET' }
				);
				if (response.status === 'RESOLVIDO') {
					this.stopStatusPolling();
					this.onMessage({
						type: 'PPT_RESOLVIDO',
						data: response
					});
				}
			} catch (err) {
				console.warn('[NetworkActions Polling Error]', err);
			}
		}, 800);
	}

	stopStatusPolling() {
		if (this.statusPollingTimer) {
			clearInterval(this.statusPollingTimer);
			this.statusPollingTimer = null;
		}
	}

	updateHeartbeat(jogadorRecord) {
		if (!this.pb) return;
		const now = millis();
		if (!this._lastHeartbeat || now - this._lastHeartbeat > 8000) {
			this._lastHeartbeat = now;
			if (!jogadorRecord) {
				this.onReconcileRequest();
				return;
			}

			this.pb
				.collection('jogadores')
				.update(jogadorRecord.id, {
					last_seen: new Date().toISOString()
				})
				.catch((err) => {
					// Se o registro não existe mais (404), fomos purgados pelo cleanup
					if (err && err.status === 404) {
						console.log('[Heartbeat] Registro de jogador não encontrado (404). Reconciliando...');
						this.onReconcileRequest();
					}
				});
		}
	}
}
