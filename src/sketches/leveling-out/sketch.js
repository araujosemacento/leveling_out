// @ts-nocheck
/* eslint-disable */

/**
 * Leveling Out - Ponto de Entrada Principal (Sketch p5.js)
 * Orquestra os módulos: NetworkManager, GameEngine e UIRenderer.
 */

let roomCode = 'sala-padrao';
let network = null;
let game = null;
let ui = null;

function setup() {
	createCanvas(windowWidth, windowHeight);
	textAlign(CENTER, CENTER);
	rectMode(CENTER);

	// Resgata o código da sala injetado pelo SvelteKit
	roomCode = window.__ROOM_CODE__ || 'sala-demo';

	// Inicializa os módulos desacoplados
	game = new GameEngine(roomCode);
	ui = new UIRenderer();

	network = new NetworkManager(
		roomCode,
		(message) => game.handleMessage(message, network),
		(status) => game.setStatus(status),
		() => (game ? game.roundId : 1)
	);

	// Inicia a conexão com o PocketBase
	network.connect();
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}

function draw() {
	// Atualiza heartbeat de presença
	network.updateHeartbeat();

	// Atualiza transições e timers de jogo
	game.update();

	// Renderiza a interface
	ui.render(game, network);
}

function mousePressed() {
	handleInput(mouseX, mouseY);
}

function touchStarted() {
	const x = touches.length > 0 ? touches[0].x : mouseX;
	const y = touches.length > 0 ? touches[0].y : mouseY;
	handleInput(x, y);
	return false;
}

function handleInput(x, y) {
	if (network && network.syncError) {
		if (ui.isRetryClicked(x, y)) {
			network.reconcileState(true);
		}
		return;
	}

	if (network && network.isSynchronizing) {
		return;
	}

	if (game.state === 'ESCOLHENDO') {
		const chosenMove = ui.getMoveAt(x, y);
		if (chosenMove) {
			game.chooseMove(chosenMove, network);
		}
	} else if (game.state === 'RESULTADO') {
		if (ui.isNextRoundClicked(x, y)) {
			game.startNewRound(network);
		}
	}
}

function keyPressed() {
	if (game.state === 'ESCOLHENDO') {
		if (key === '1') game.chooseMove('pedra', network);
		if (key === '2') game.chooseMove('papel', network);
		if (key === '3') game.chooseMove('tesoura', network);
	} else if (game.state === 'RESULTADO' && key === ' ') {
		game.startNewRound(network);
	}
}
