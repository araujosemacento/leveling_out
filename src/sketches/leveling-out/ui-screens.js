// @ts-nocheck
/* eslint-disable */

/**
 * Submódulo de Telas e Fases da Partida
 * Renderiza os estados: Espera (Lobby), Ação (Escolha de Jogada), Revelação e Resultado.
 * Integra ícones vetoriais de alta fidelidade com Path2D.
 */

class UIScreens {
	constructor() {
		this.buttons = [];
		this.nextRoundBtn = null;
	}

	/**
	 * Tela de espera por oponente (Lobby)
	 * @param {NetworkManager} network
	 */
	drawWaitingScreen(network) {
		push();
		const cy = height * 0.52;

		textAlign(CENTER, CENTER);
		fill(244, 244, 245);
		textSize(20);
		textStyle(BOLD);
		text('Aguardando Entrada do Oponente', width / 2, cy - 20);

		fill(161, 161, 170);
		textSize(13);
		textStyle(NORMAL);
		text('Compartilhe o link desta sala para iniciar o minijogo.', width / 2, cy + 12);

		fill(244, 63, 94);
		textSize(14);
		textStyle(BOLD);
		text(`Código da Sala: ${network.roomCode}`, width / 2, cy + 45);
		pop();
	}

	/**
	 * Tela de escolha de jogada (Pedra, Papel ou Tesoura)
	 * @param {GameManager} game
	 */
	drawActionScreen(game) {
		push();
		const cy = height * 0.32;

		textAlign(CENTER, CENTER);
		fill(255);
		textSize(22);
		textStyle(BOLD);
		text(game.statusMessage, width / 2, cy);

		const moves = [
			{ id: 'pedra', label: 'Pedra' },
			{ id: 'papel', label: 'Papel' },
			{ id: 'tesoura', label: 'Tesoura' }
		];

		const btnW = min(130, width * 0.26);
		const btnH = 100;
		const spacing = min(24, width * 0.04);
		const totalW = moves.length * btnW + (moves.length - 1) * spacing;
		const startX = width / 2 - totalW / 2 + btnW / 2;
		const btnY = height * 0.58;

		this.buttons = [];

		for (let i = 0; i < moves.length; i++) {
			const m = moves[i];
			const bx = startX + i * (btnW + spacing);
			const by = btnY;

			const isHover =
				mouseX >= bx - btnW / 2 &&
				mouseX <= bx + btnW / 2 &&
				mouseY >= by - btnH / 2 &&
				mouseY <= by + btnH / 2;

			const isSelected = game.myMove === m.id;

			this.buttons.push({ id: m.id, x: bx, y: by, w: btnW, h: btnH });

			push();
			rectMode(CENTER);

			if (isSelected) {
				fill(244, 63, 94, 220);
				stroke(255);
				strokeWeight(3);
			} else if (isHover && game.state === 'ESCOLHENDO') {
				fill(39, 39, 42);
				stroke(244, 63, 94);
				strokeWeight(2);
			} else {
				fill(24, 24, 27);
				stroke(63, 63, 70);
				strokeWeight(1);
			}

			rect(bx, by, btnW, btnH, 16);

			// Renderização do Ícone Vetorial Path2D do Game Icons
			const iconPath = ICON_DATA[m.id];
			const iconColor = isSelected ? '#ffffff' : isHover ? '#ffffff' : '#d4d4d8';
			if (typeof drawVectorIcon === 'function' && iconPath) {
				drawVectorIcon(iconPath, bx, by - 14, 38, iconColor);
			}

			// Rótulo da Jogada
			textSize(15);
			textStyle(BOLD);
			fill(isSelected ? 255 : 228);
			noStroke();
			textAlign(CENTER, CENTER);
			text(m.label, bx, isSelected ? by + 18 : by + 22);

			if (isSelected) {
				textSize(9);
				fill(255, 255, 255, 200);
				text('Sua Escolha', bx, by + 34);
			}
			pop();
		}

		// Indicador autoritativo se o oponente já efetuou o lance
		if (game.opponentMove && !game.myMove) {
			fill(52, 211, 153);
			textSize(13);
			textStyle(BOLD);
			text(
				'Oponente já fez a jogada! Faça sua escolha para resolver a rodada.',
				width / 2,
				height * 0.82
			);
		} else if (game.myMove && !game.roundResult) {
			fill(251, 191, 36);
			textSize(13);
			textStyle(BOLD);
			text('Aguardando lance do oponente...', width / 2, height * 0.82);
		}
		pop();
	}

	/**
	 * Tela de contagem regressiva e suspense pré-revelação
	 * @param {GameEngine} game
	 */
	drawRevealingScreen(game) {
		push();
		textAlign(CENTER, CENTER);

		fill(244, 244, 245);
		textSize(20);
		textStyle(BOLD);
		text('Ambos os jogadores submeteram suas jogadas!', width / 2, height * 0.32);

		fill(161, 161, 170);
		textSize(14);
		textStyle(NORMAL);
		text('Revelando em sincronia...', width / 2, height * 0.38);

		// Animação dramática da contagem regressiva
		const startTime = game.revealStartTime || game.revealStartMs || millis();
		const elapsed = (millis() - startTime) / 1000;
		const remaining = max(0, ceil(1.4 - elapsed));

		fill(244, 63, 94);
		textSize(56);
		textStyle(BOLD);
		text(remaining > 0 ? remaining : '!', width / 2, height * 0.54);

		// Exibe o lance local pronto para colisão
		if (game.myMove && typeof drawVectorIcon === 'function' && ICON_DATA[game.myMove]) {
			drawVectorIcon(ICON_DATA[game.myMove], width / 2, height * 0.72, 48, '#ffffff');
		}
		pop();
	}

	/**
	 * Tela de resultado final da rodada de Pedra, Papel e Tesoura
	 * @param {GameEngine} game
	 */
	drawResultScreen(game) {
		push();
		textAlign(CENTER, CENTER);
		const cy = height * 0.44;

		let resultColor = color(255);
		let resultTitle = 'Empate!';

		if (game.roundResult === 'VITÓRIA' || game.winner === game.myEquipe) {
			resultColor = color(52, 211, 153);
			resultTitle = 'Você Venceu a Rodada!';
		} else if (game.roundResult === 'DERROTA' || (game.winner && game.winner !== 'EMPATE')) {
			resultColor = color(239, 68, 68);
			resultTitle = 'Oponente Venceu a Rodada!';
		}

		fill(resultColor);
		textSize(26);
		textStyle(BOLD);
		text(resultTitle, width / 2, cy - 40);

		// Exibição dos confrontos com os ícones vetoriais
		const myMoveId = game.myMove;
		const oppMoveId = game.opponentMove;

		if (myMoveId && oppMoveId) {
			// Ícone Jogador
			if (typeof drawVectorIcon === 'function' && ICON_DATA[myMoveId]) {
				drawVectorIcon(ICON_DATA[myMoveId], width / 2 - 60, cy + 25, 44, '#f43f5e');
			}
			fill(255);
			textSize(13);
			textStyle(BOLD);
			text('Você', width / 2 - 60, cy + 60);

			fill(113, 113, 122);
			textSize(16);
			text('VS', width / 2, cy + 25);

			// Ícone Oponente
			if (typeof drawVectorIcon === 'function' && ICON_DATA[oppMoveId]) {
				drawVectorIcon(ICON_DATA[oppMoveId], width / 2 + 60, cy + 25, 44, '#60a5fa');
			}
			fill(255);
			textSize(13);
			textStyle(BOLD);
			text('Oponente', width / 2 + 60, cy + 60);
		}

		// Botão para avançar para a próxima rodada
		const btnW = 160;
		const btnH = 44;
		const btnY = height * 0.78;
		this.nextRoundBtn = { x: width / 2, y: btnY, w: btnW, h: btnH };

		// Indicador se o oponente já avançou para a próxima rodada
		if (
			network &&
			network.salaRecord &&
			Number(network.salaRecord.rodada_atual) > Number(game.roundId)
		) {
			fill(52, 211, 153);
			textSize(12);
			textStyle(BOLD);
			text('Oponente pronto para a próxima rodada', width / 2, btnY - 32);
		}

		const isHover =
			mouseX >= width / 2 - btnW / 2 &&
			mouseX <= width / 2 + btnW / 2 &&
			mouseY >= btnY - btnH / 2 &&
			mouseY <= btnY + btnH / 2;

		rectMode(CENTER);
		fill(isHover ? color(225, 29, 72) : color(244, 63, 94));
		noStroke();
		rect(width / 2, btnY, btnW, btnH, 8);

		fill(255);
		textSize(14);
		textStyle(BOLD);
		text('Próxima Rodada', width / 2, btnY);
		pop();
	}
}
