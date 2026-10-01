// @ts-nocheck
/* eslint-disable */

/**
 * Submódulo de Overlays do Sistema
 * Renderiza camadas temporárias de bloqueio visual para sincronização e falhas de conexão.
 */

class UIOverlays {
	constructor() {
		this.retryBtn = null;
	}

	drawSynchronizingOverlay() {
		push();
		rectMode(CENTER);
		fill(13, 13, 16, 210);
		noStroke();
		rect(width / 2, height / 2, width, height);

		textAlign(CENTER, CENTER);
		fill(255);
		textSize(16);
		textStyle(BOLD);
		text('Sincronizando com o servidor...', width / 2, height / 2);
		pop();
	}

	drawErrorOverlay(errorMsg) {
		push();
		rectMode(CENTER);
		fill(13, 13, 16, 240);
		noStroke();
		rect(width / 2, height / 2, width, height);

		textAlign(CENTER, CENTER);
		fill(239, 68, 68);
		textSize(20);
		textStyle(BOLD);
		text('Conexão Interrompida', width / 2, height / 2 - 35);

		fill(212, 212, 216);
		textSize(13);
		textStyle(NORMAL);
		text(errorMsg || 'Servidor inalcançável.', width / 2, height / 2);

		const btnW = 180;
		const btnH = 44;
		const btnY = height / 2 + 45;
		this.retryBtn = { x: width / 2, y: btnY, w: btnW, h: btnH };

		const isHover =
			mouseX >= width / 2 - btnW / 2 &&
			mouseX <= width / 2 + btnW / 2 &&
			mouseY >= btnY - btnH / 2 &&
			mouseY <= btnY + btnH / 2;

		fill(isHover ? color(225, 29, 72) : color(244, 63, 94));
		rect(width / 2, btnY, btnW, btnH, 8);

		fill(255);
		textSize(14);
		textStyle(BOLD);
		text('Tentar Novamente', width / 2, btnY);
		pop();
	}
}
