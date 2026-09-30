// @ts-nocheck
/* eslint-disable */

/**
 * Submódulo de Componentes Estruturais de UI
 * Renderiza o cabeçalho (HUD), o placar de pontuação e o tubo de ensaio estilizado.
 * Estritamente sem emojis, sem cards genéricos, sem travessões e sem marcadores circulares.
 */

class UIComponents {
	/**
	 * Desenha a barra superior de cabeçalho
	 * @param {NetworkManager} network
	 * @param {boolean} opponentOnline
	 */
	drawHeader(network, opponentOnline) {
		push();
		noStroke();
		fill(24, 24, 28);
		rect(width / 2, 28, width, 56);

		stroke(39, 39, 42);
		strokeWeight(1);
		line(0, 56, width, 56);

		// 1. Ícone Vetorial dos Tubos de Ensaio (Game Icons)
		if (typeof drawVectorIcon === 'function' && ICON_DATA.testTubes) {
			drawVectorIcon(ICON_DATA.testTubes, 40, 28, 28, '#f43f5e');
		}

		// 2. Título e Fase
		noStroke();
		fill(244, 244, 245);
		textSize(16);
		textStyle(BOLD);
		textAlign(LEFT, CENTER);
		text('Leveling Out', 64, 22);

		fill(161, 161, 170);
		textSize(11);
		textStyle(NORMAL);
		text('Minijogo: Disputa de Iniciativa', 64, 38);

		// 3. Status de Conexão e Sala (lado direito)
		textAlign(RIGHT, CENTER);
		fill(212, 212, 216);
		textSize(12);
		textStyle(BOLD);
		const equipeLabel = network.myEquipe ? `Equipe ${network.myEquipe}` : 'Conectando';
		text(equipeLabel, width - 24, 22);

		textSize(10);
		textStyle(NORMAL);
		if (!network.isConnected) {
			fill(239, 68, 68);
			text('Offline: Reconectando', width - 24, 38);
		} else if (opponentOnline) {
			fill(52, 211, 153);
			text('2 Conectados: Em sincronia', width - 24, 38);
		} else {
			fill(251, 191, 36);
			text('Aguardando Oponente', width - 24, 38);
		}
		pop();
	}

	/**
	 * Desenha o placar da disputa
	 * @param {GameEngine} game
	 * @param {NetworkManager} [network]
	 */
	drawScoreboard(game, network) {
		push();
		const py = height * 0.16;

		// Painel contínuo do placar
		fill(18, 18, 22);
		stroke(39, 39, 42);
		strokeWeight(1);
		rect(width / 2, py, width * 0.88, 54, 12);

		// Informações de Equipe A vs Equipe B
		textAlign(CENTER, CENTER);

		const isTeamA = !network || network.myEquipe === 'A';
		const scoreA = isTeamA ? game.myScore || 0 : game.opponentScore || 0;
		const scoreB = isTeamA ? game.opponentScore || 0 : game.myScore || 0;
		const roundNumber = game.roundId || game.round || 1;

		// Equipe A (Rosa)
		fill(244, 63, 94);
		textSize(12);
		textStyle(BOLD);
		text('Equipe A', width / 2 - 90, py - 10);
		textSize(20);
		fill(255);
		text(scoreA, width / 2 - 90, py + 12);

		// Separador central
		fill(113, 113, 122);
		textSize(12);
		textStyle(NORMAL);
		text(`Rodada ${roundNumber}`, width / 2, py);

		// Equipe B (Azul)
		fill(96, 165, 250);
		textSize(12);
		textStyle(BOLD);
		text('Equipe B', width / 2 + 90, py - 10);
		textSize(20);
		fill(255);
		text(scoreB, width / 2 + 90, py + 12);
		pop();
	}

	/**
	 * Desenha a estrutura e fluido do tubo de ensaio
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scaleFactor
	 * @param {number} fillPct Porcentagem de líquido (0 a 100)
	 * @param {string} liquidColor Cor do líquido
	 */
	drawTestTubeGraphic(x, y, scaleFactor = 1.0, fillPct = 50, liquidColor = '#f43f5e') {
		push();
		translate(x, y);
		scale(scaleFactor);
		rectMode(CENTER);

		// Bocal
		noStroke();
		fill(63, 63, 70);
		rect(0, -28, 20, 4, 2);

		// Vidro do Tubo de Ensaio
		stroke(113, 113, 122);
		strokeWeight(2);
		fill(24, 24, 27, 200);
		beginShape();
		vertex(-7, -26);
		vertex(-7, 18);
		bezierVertex(-7, 28, 7, 28, 7, 18);
		vertex(7, -26);
		endShape();

		// Líquido com menisco
		if (fillPct > 0) {
			const maxH = 44;
			const currentH = (fillPct / 100) * maxH;
			const liquidTopY = 18 - currentH;

			noStroke();
			fill(liquidColor);
			beginShape();
			vertex(-5, liquidTopY);
			vertex(-5, 18);
			bezierVertex(-5, 26, 5, 26, 5, 18);
			vertex(5, liquidTopY);
			bezierVertex(2.5, liquidTopY + 2, -2.5, liquidTopY + 2, -5, liquidTopY);
			endShape();
		}

		// Graduações do vidro
		stroke(255, 255, 255, 90);
		strokeWeight(1);
		line(-5, -16, -1, -16);
		line(-5, -8, -2, -8);
		line(-5, 0, -1, 0);
		line(-5, 8, -2, 8);
		line(-5, 16, -1, 16);
		pop();
	}
}
