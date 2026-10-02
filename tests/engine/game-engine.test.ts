import { describe, expect, it } from 'bun:test';
import { GameEngine } from '../../src/lib/engine/game-engine';

describe('Motor Canônico Reativo (GameEngine & Máquina de Estados)', () => {
	it('deve inicializar com o estado padrão do Lobby', () => {
		const engine = new GameEngine('SALA-TEST');
		const state = engine.getState();

		expect(state.salaCodigo).toBe('SALA-TEST');
		expect(state.fase).toBe('LOBBY');
		expect(state.equipes.A.pontos).toBe(0);
		expect(state.equipes.B.pontos).toBe(0);
		expect(state.rodadaAtual.numero).toBe(1);
		expect(state.vencedor).toBeNull();
	});

	it('deve cadastrar e alocar jogador na equipe correta', () => {
		const engine = new GameEngine('SALA-TEST');

		engine.setPlayer('p1', 'Alice', 'A');
		let state = engine.getState();

		expect(state.meuJogadorId).toBe('p1');
		expect(state.minhaEquipe).toBe('A');
		expect(state.equipes.A.membros).toHaveLength(1);
		expect(state.equipes.A.membros[0].nome).toBe('Alice');

		// Alternar para equipe B
		engine.selectTeam('p1', 'B');
		state = engine.getState();

		expect(state.minhaEquipe).toBe('B');
		expect(state.equipes.A.membros).toHaveLength(0);
		expect(state.equipes.B.membros).toHaveLength(1);
	});

	it('deve transicionar para disputa de PPT e aplicar resolução autoritativa', () => {
		const engine = new GameEngine('SALA-TEST');

		engine.submitPptMove('pedra');
		expect(engine.getState().fase).toBe('PPT_DISPUTA');

		// Resolução autoritativa vinda do backend
		engine.reconcilePptResolution('B', { A: 'pedra', B: 'papel' });
		const state = engine.getState();

		expect(state.fase).toBe('PPT_RESULTADO');
		expect(state.equipeAtiva).toBe('B');
		expect(state.rodadaAtual.equipeAtiva).toBe('B');
	});

	it('deve seguir o ciclo de rodada: Escolha de Espectro -> Dica -> Palpite', () => {
		const engine = new GameEngine('SALA-TEST');

		// 1. Escolha da carta de espectro
		const carta = { id: 'c1', left: 'Famoso', right: 'Anônimo' };
		engine.selectSpectrumCard(carta);

		let state = engine.getState();
		expect(state.fase).toBe('RODADA_DICA');
		expect(state.rodadaAtual.carta).toEqual(carta);

		// 2. Codificador submete dica com sanitização automática
		engine.submitClue('<b>Keanu Reeves</b>');

		state = engine.getState();
		expect(state.fase).toBe('RODADA_PALPITE');
		expect(state.rodadaAtual.dica).toBe('Keanu Reeves'); // Tags removidas!

		// 3. Palpiteiro ajusta slider e submete palpite
		engine.updateSliderPreview(72);
		expect(engine.getState().rodadaAtual.palpite).toBe(72);

		engine.submitGuess(70);
		expect(engine.getState().rodadaAtual.palpite).toBe(70);
	});

	it('deve aplicar revelação autoritativa, atualizar placar e histórico', () => {
		const engine = new GameEngine('SALA-TEST');

		engine.reconcileRoundReveal({
			metaReal: 70,
			palpite: 69,
			pontosGanhos: 4,
			placarA: 4,
			placarB: 0
		});

		const state = engine.getState();
		expect(state.fase).toBe('RODADA_REVELACAO');
		expect(state.equipes.A.pontos).toBe(4);
		expect(state.rodadaAtual.metaOculta).toBe(70);
		expect(state.rodadaAtual.revelada).toBe(true);
		expect(state.rodadaAtual.resultado?.points).toBe(4);
		expect(state.historicoRodadas).toHaveLength(1);
	});

	it('deve detectar vitória quando uma equipe atingir a pontuação alvo', () => {
		const engine = new GameEngine('SALA-TEST');

		engine.reconcileRoundReveal({
			metaReal: 50,
			palpite: 50,
			pontosGanhos: 4,
			placarA: 10,
			placarB: 6,
			vencedorPartida: 'A'
		});

		const state = engine.getState();
		expect(state.fase).toBe('VITORIA');
		expect(state.vencedor).toBe('A');
	});

	it('deve reiniciar o placar ao executar Revanche', () => {
		const engine = new GameEngine('SALA-TEST');

		// Simula fim de jogo
		engine.reconcileRoundReveal({
			metaReal: 50,
			palpite: 50,
			pontosGanhos: 4,
			placarA: 10,
			placarB: 6,
			vencedorPartida: 'A'
		});

		expect(engine.getState().fase).toBe('VITORIA');

		// Aciona revanche
		engine.rematch();
		const state = engine.getState();

		expect(state.fase).toBe('PPT_DISPUTA');
		expect(state.equipes.A.pontos).toBe(0);
		expect(state.equipes.B.pontos).toBe(0);
		expect(state.vencedor).toBeNull();
		expect(state.historicoRodadas).toHaveLength(0);
	});

	it('deve notificar observadores inscritos na cadência Input -> Update -> Render', () => {
		const engine = new GameEngine('SALA-TEST');
		const events: string[] = [];

		const unsubscribe = engine.subscribe((_state, action) => {
			events.push(action.type);
		});

		engine.setPlayer('p1', 'Bob', 'A');
		engine.submitPptMove('tesoura');

		expect(events).toEqual(['SET_PLAYER', 'SUBMIT_PPT_INTENT']);

		// Cancelar inscrição
		unsubscribe();
		engine.submitGuess(50);

		// Não deve registrar o novo evento após unsubscribe
		expect(events).toHaveLength(2);
	});
});
