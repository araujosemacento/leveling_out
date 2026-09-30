// @ts-nocheck
/* eslint-disable */

/**
 * Módulo de Lógica de Jogo e Máquina de Estados
 * Controla turnos, regras de Pedra, Papel e Tesoura e sincronização autoritativa via PocketBase.
 */

class GameEngine {
	constructor(roomCode) {
		this.roomCode = roomCode;
		this.state = 'CONECTANDO';
		this.myMove = null;
		this.opponentMove = null; // null | true (se enviou) | 'pedra'|'papel'|'tesoura' (se revelado)
		this.roundResult = null; // 'VITÓRIA' | 'DERROTA' | 'EMPATE'
		this.myScore = 0;
		this.opponentScore = 0;
		this.roundId = 1;
		this.statusMessage = 'Inicializando...';

		this.loadSavedState();
	}

	loadSavedState() {
		try {
			const saved = sessionStorage.getItem(`leveling_game_${this.roomCode}`);
			if (saved) {
				const data = JSON.parse(saved);
				this.myScore = Number(data.myScore) || 0;
				this.opponentScore = Number(data.opponentScore) || 0;
				this.roundId = Number(data.roundId) || 1;
			}
		} catch (e) {
			console.warn('[Game] Erro ao carregar estado salvo:', e);
		}
	}

	saveState() {
		try {
			sessionStorage.setItem(
				`leveling_game_${this.roomCode}`,
				JSON.stringify({
					myScore: this.myScore,
					opponentScore: this.opponentScore,
					roundId: this.roundId
				})
			);
		} catch (e) {
			console.warn('[Game] Erro ao salvar estado:', e);
		}
	}

	setStatus(msg) {
		this.statusMessage = msg;
	}

	handleMessage(data, network) {
		if (data.type === 'FULL_SYNC') {
			// Reconciliação total autoritativa a partir do PocketBase
			const sala = data.sala;
			const myEquipe = data.myEquipe || 'A';
			const oppTeam = myEquipe === 'A' ? 'B' : 'A';

			if (myEquipe === 'A') {
				this.myScore = Number(sala.placar_a) || 0;
				this.opponentScore = Number(sala.placar_b) || 0;
			} else {
				this.myScore = Number(sala.placar_b) || 0;
				this.opponentScore = Number(sala.placar_a) || 0;
			}

			this.roundId = Number(sala.rodada_atual) || 1;

			if (!data.opponent) {
				this.state = 'AGUARDANDO_OPONENTE';
				this.statusMessage = 'Aguardando oponente entrar na sala...';
				this.myMove = null;
				this.opponentMove = null;
				this.roundResult = null;
			} else {
				const ppt = data.pptStatus;
				if (ppt && ppt.status === 'RESOLVIDO') {
					this.applyRoundResolution(ppt, myEquipe);
				} else {
					if (ppt && ppt.equipes_enviadas && ppt.equipes_enviadas.includes(oppTeam)) {
						this.opponentMove = true;
					}

					if (this.state === 'CONECTANDO' || this.state === 'AGUARDANDO_OPONENTE') {
						this.state = 'ESCOLHENDO';
						this.statusMessage = 'Faça sua jogada!';
					}
				}
			}

			this.saveState();
		} else if (data.type === 'OPPONENT_ONLINE') {
			if (this.state === 'CONECTANDO' || this.state === 'AGUARDANDO_OPONENTE') {
				this.startNewRound(network);
			}
		} else if (data.type === 'OPPONENT_OFFLINE') {
			this.state = 'AGUARDANDO_OPONENTE';
			this.statusMessage = 'Oponente desconectou. Aguardando retorno...';
			this.opponentMove = null;
			this.saveState();
		} else if (data.type === 'OPPONENT_MOVED') {
			this.opponentMove = true;
		} else if (data.type === 'SALA_UPDATE') {
			const sala = data.sala;
			const myTeam = network.myEquipe || 'A';

			if (myTeam === 'A') {
				this.myScore = Number(sala.placar_a) || 0;
				this.opponentScore = Number(sala.placar_b) || 0;
			} else {
				this.myScore = Number(sala.placar_b) || 0;
				this.opponentScore = Number(sala.placar_a) || 0;
			}

			if (
				sala.rodada_atual &&
				Number(sala.rodada_atual) > this.roundId &&
				this.state !== 'ESCOLHENDO'
			) {
				this.roundId = Number(sala.rodada_atual);
			}
			this.saveState();
		} else if (data.type === 'PPT_RESOLVIDO') {
			this.triggerDramaticReveal(data.data, network);
			this.saveState();
		}
	}

	triggerDramaticReveal(res, network) {
		const myTeam = (network && network.myEquipe) || 'A';
		if (this.pendingResolution && this.pendingResolution.res.rodada === res.rodada) return;

		this.pendingResolution = { res, myTeam };
		this.state = 'REVELANDO';
		this.revealStartTime = millis();
	}

	update() {
		if (this.state === 'REVELANDO' && this.pendingResolution) {
			const elapsed = millis() - this.revealStartTime;
			if (elapsed >= 1400) {
				const { res, myTeam } = this.pendingResolution;
				this.pendingResolution = null;
				this.applyRoundResolution(res, myTeam);
				this.saveState();
			}
		}
	}

	applyRoundResolution(res, myTeam) {
		const opponentTeam = myTeam === 'A' ? 'B' : 'A';

		this.myMove = (res.lances && res.lances[myTeam]) || this.myMove;
		this.opponentMove = (res.lances && res.lances[opponentTeam]) || null;

		if (res.vencedor === 'EMPATE') {
			this.roundResult = 'EMPATE';
			this.statusMessage = 'Empate!';
		} else if (res.vencedor === myTeam) {
			this.roundResult = 'VITÓRIA';
			this.statusMessage = 'Você venceu!';
		} else {
			this.roundResult = 'DERROTA';
			this.statusMessage = 'Oponente venceu!';
		}

		this.state = 'RESULTADO';
	}

	startNewRound(network) {
		this.myMove = null;
		this.opponentMove = null;
		this.roundResult = null;
		if (network && network.salaRecord && network.salaRecord.rodada_atual) {
			this.roundId = Number(network.salaRecord.rodada_atual);
		}
		this.state = 'ESCOLHENDO';
		this.statusMessage = 'Faça sua jogada!';
		this.saveState();
	}

	chooseMove(move, network) {
		if (this.state !== 'ESCOLHENDO') return;

		// Reatividade Otimista (Optimistic UI):
		// Registra a escolha na interface instantaneamente sem esperar round-trip do HTTP
		this.myMove = move;
		this.state = 'AGUARDANDO_OPONENTE_JOGADA';
		this.statusMessage = 'Jogada enviada! Aguardando o oponente...';
		this.saveState();

		if (network) {
			network.enviarLance(this.myMove, this.roundId);
		}
	}
}
