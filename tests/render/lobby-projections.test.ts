import { describe, expect, it } from 'bun:test';
import { GameEngine } from '../../src/lib/engine';

describe('Projeções do Lobby Tripartite e Quórum (getLobbyProjection)', () => {
	it('deve identificar o primeiro jogador como anfitrião (host)', () => {
		const engine = new GameEngine('SALA-TEST');
		engine.setPlayer('p1', 'Alice', 'ALEATORIO', true);

		const lobby = engine.getLobbyProjection('p1');
		expect(lobby.isHost).toBe(true);
		expect(lobby.totalJogadores).toBe(1);
		expect(lobby.quorumCompleto).toBe(false);
		expect(lobby.podeIniciarPartida).toBe(false);
	});

	it('não deve permitir que convidados iniciem a partida mesmo com quórum completo', () => {
		const engine = new GameEngine('SALA-TEST');
		engine.setPlayer('p1', 'Alice', 'A', true);
		engine.setPlayer('p2', 'Bob', 'A');
		engine.setPlayer('p3', 'Carlos', 'B');
		engine.setPlayer('p4', 'Diana', 'B');

		const lobbyHost = engine.getLobbyProjection('p1');
		expect(lobbyHost.isHost).toBe(true);
		expect(lobbyHost.totalJogadores).toBe(4);
		expect(lobbyHost.quorumCompleto).toBe(true);
		expect(lobbyHost.podeIniciarPartida).toBe(true);

		const lobbyGuest = engine.getLobbyProjection('p2');
		expect(lobbyGuest.isHost).toBe(false);
		expect(lobbyGuest.quorumCompleto).toBe(true);
		expect(lobbyGuest.podeIniciarPartida).toBe(false);
	});

	it('deve bloquear escolha de equipe que já atingiu o limite de 2 integrantes', () => {
		const engine = new GameEngine('SALA-TEST');
		engine.setPlayer('p1', 'Alice', 'A', true);
		engine.setPlayer('p2', 'Bob', 'A');
		engine.setPlayer('p3', 'Carlos', 'ALEATORIO');

		const lobbyP3 = engine.getLobbyProjection('p3');
		expect(lobbyP3.membrosPato.length).toBe(2);
		expect(lobbyP3.podeEscolherPato).toBe(false);
		expect(lobbyP3.podeEscolherGanso).toBe(true);
		expect(lobbyP3.podeEscolherAleatorio).toBe(true);
	});

	it('deve permitir que participante em "ALEATORIO" conte para o quórum de 4 jogadores', () => {
		const engine = new GameEngine('SALA-TEST');
		engine.setPlayer('p1', 'Alice', 'A', true);
		engine.setPlayer('p2', 'Bob', 'ALEATORIO');
		engine.setPlayer('p3', 'Carlos', 'ALEATORIO');
		engine.setPlayer('p4', 'Diana', 'B');

		const lobby = engine.getLobbyProjection('p1');
		expect(lobby.totalJogadores).toBe(4);
		expect(lobby.quorumCompleto).toBe(true);
		expect(lobby.membrosAleatorio.length).toBe(2);
		expect(lobby.podeIniciarPartida).toBe(true);
	});

	it('deve permitir ao anfitrião disparar ação de início de partida', () => {
		const engine = new GameEngine('SALA-TEST');
		engine.setPlayer('p1', 'Alice', 'A', true);
		engine.setPlayer('p2', 'Bob', 'A');
		engine.setPlayer('p3', 'Carlos', 'B');
		engine.setPlayer('p4', 'Diana', 'B');

		expect(engine.getState().fase).toBe('LOBBY');
		engine.startMatch();
		expect(engine.getState().fase).toBe('PPT_DISPUTA');
	});
});
