// @ts-nocheck
/* eslint-disable */

/**
 * Fachada Central de Renderização de Interface em p5.js
 * Orquestra os submódulos desacoplados: UIComponents, UIScreens e UIOverlays.
 * Mantém os métodos de detecção de clique e hit-testing.
 */

class UIRenderer {
	constructor() {
		this.components = new UIComponents();
		this.screens = new UIScreens();
		this.overlays = new UIOverlays();
	}

	get buttons() {
		return this.screens.buttons;
	}

	get nextRoundBtn() {
		return this.screens.nextRoundBtn;
	}

	get retryBtn() {
		return this.overlays.retryBtn;
	}

	render(game, network) {
		background(13, 13, 16);

		const opponentOnline = network.isOpponentOnline();

		// Se o oponente desconectar durante o jogo
		if (!opponentOnline && network.isConnected && game.state !== 'CONECTANDO') {
			if (game.state !== 'AGUARDANDO_OPONENTE') {
				game.state = 'AGUARDANDO_OPONENTE';
				game.statusMessage = 'Oponente desconectou. Aguardando retorno...';
			}
		}

		// 1. Cabeçalho com indicador de rede e sala
		this.components.drawHeader(network, opponentOnline);

		// 2. Placar da partida
		this.components.drawScoreboard(game, network);

		// 3. Telas de estado
		if (game.state === 'CONECTANDO' || game.state === 'AGUARDANDO_OPONENTE') {
			this.screens.drawWaitingScreen(network);
		} else if (game.state === 'ESCOLHENDO' || game.state === 'AGUARDANDO_OPONENTE_JOGADA') {
			this.screens.drawActionScreen(game);
		} else if (game.state === 'REVELANDO') {
			this.screens.drawRevealingScreen(game);
		} else if (game.state === 'RESULTADO') {
			this.screens.drawResultScreen(game, network);
		}

		// 4. Overlays de Sincronização e Erro Crítico
		if (network.isSynchronizing) {
			this.overlays.drawSynchronizingOverlay();
		} else if (network.syncError) {
			this.overlays.drawErrorOverlay(network.syncError);
		}
	}

	getMoveAt(x, y) {
		for (const b of this.screens.buttons) {
			if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && y >= b.y - b.h / 2 && y <= b.y + b.h / 2) {
				return b.id;
			}
		}
		return null;
	}

	isNextRoundClicked(x, y) {
		const b = this.screens.nextRoundBtn;
		if (!b) return false;
		return x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && y >= b.y - b.h / 2 && y <= b.y + b.h / 2;
	}

	isRetryClicked(x, y) {
		const b = this.overlays.retryBtn;
		if (!b) return false;
		return x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && y >= b.y - b.h / 2 && y <= b.y + b.h / 2;
	}
}
