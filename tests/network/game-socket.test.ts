import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { GameSocket } from '../../src/lib/network/game-socket';

describe('GameSocket', () => {
	let socket: GameSocket;
	let mockWs: any;

	beforeEach(() => {
		mockWs = {
			send: mock(() => {}),
			close: mock(() => {}),
			readyState: 1, // OPEN
			onopen: null,
			onmessage: null,
			onclose: null,
			onerror: null
		};

		const wsConstructor = mock(function () {
			return mockWs;
		});
		(wsConstructor as any).OPEN = 1;
		(wsConstructor as any).CLOSED = 3;

		// Mock do ambiente do browser
		(globalThis as any).window = globalThis;
		(globalThis as any).WebSocket = wsConstructor;
	});

	it('deve inicializar com status DESCONECTADO', () => {
		socket = new GameSocket({}, { backendUrl: 'http://localhost:8090' });
		expect(socket.getStatus()).toBe('DESCONECTADO');
	});

	it('deve formatar query parameters e atualizar status ao conectar', () => {
		let currentStatus = '';
		socket = new GameSocket(
			{
				onStatusChange: (s) => (currentStatus = s)
			},
			{ backendUrl: 'http://localhost:8090' }
		);

		socket.conectar('sala-teste', 'p_123', 'tok_abc', 'Melo');

		expect((globalThis as any).WebSocket).toHaveBeenCalledTimes(1);
		const calledUrl = ((globalThis as any).WebSocket as any).mock.calls[0][0];
		expect(calledUrl).toContain('sala-teste');
		expect(calledUrl).toContain('player_id=p_123');
		expect(calledUrl).toContain('token=tok_abc');
		expect(calledUrl).toContain('nome=Melo');
		expect(currentStatus).toBe('CONECTANDO');
	});

	it('deve despachar comandos JSON quando aberto', () => {
		socket = new GameSocket({}, { backendUrl: 'http://localhost:8090' });
		socket.conectar('sala-teste', 'p_123');

		// Simula abertura do socket
		if (mockWs.onopen) mockWs.onopen();

		socket.escolherEquipe('A');
		expect(mockWs.send).toHaveBeenCalledWith(
			JSON.stringify({ tipo: 'ESCOLHER_EQUIPE', payload: { equipe: 'A' } })
		);

		socket.lancePpt('pedra');
		expect(mockWs.send).toHaveBeenCalledWith(
			JSON.stringify({ tipo: 'LANCE_PPT', payload: { lance: 'pedra' } })
		);
	});

	it('deve notificar callbacks em mensagens BEM_VINDO e SYNC', () => {
		let welcomeData: any = null;
		let syncData: any = null;

		socket = new GameSocket(
			{
				onWelcome: (d) => (welcomeData = d),
				onSync: (d) => (syncData = d)
			},
			{ backendUrl: 'http://localhost:8090' }
		);

		socket.conectar('sala-teste', 'p_123');
		if (mockWs.onopen) mockWs.onopen();

		// Simula recebimento de BEM_VINDO
		if (mockWs.onmessage) {
			mockWs.onmessage({
				data: JSON.stringify({
					tipo: 'BEM_VINDO',
					payload: { playerId: 'p_123', sessionToken: 'tok_novo', isHost: true }
				})
			});
		}
		expect(welcomeData).toEqual({ playerId: 'p_123', sessionToken: 'tok_novo', isHost: true });

		// Simula recebimento de SYNC
		if (mockWs.onmessage) {
			mockWs.onmessage({
				data: JSON.stringify({
					tipo: 'SYNC',
					payload: { fase: 'INICIATIVA', rodada: 1 }
				})
			});
		}
		expect(syncData).toEqual({ fase: 'INICIATIVA', rodada: 1 });
	});
});
