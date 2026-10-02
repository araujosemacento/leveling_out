import { describe, expect, it } from 'bun:test';
import { createInitialGameState, gameReducer } from '../../src/lib/engine/update/state-machine';

describe('Máquina de Estados Pura (update/state-machine.ts)', () => {
	it('deve inicializar com o estado padrão do Lobby', () => {
		const state = createInitialGameState('TEST1234');
		expect(state.salaCodigo).toBe('TEST1234');
		expect(state.fase).toBe('LOBBY');
		expect(state.equipes.A.pontos).toBe(0);
		expect(state.equipes.B.pontos).toBe(0);
		expect(state.equipes.A.membros).toHaveLength(0);
		expect(state.equipes.B.membros).toHaveLength(0);
		expect(state.vencedor).toBeNull();
	});

	it('deve cadastrar e alocar jogador na equipe correta', () => {
		let state = createInitialGameState('SALA1');
		state = gameReducer(state, {
			type: 'SET_PLAYER',
			payload: { id: 'p1', nome: 'Melo', equipe: 'A' }
		});

		expect(state.meuJogadorId).toBe('p1');
		expect(state.minhaEquipe).toBe('A');
		expect(state.equipes.A.membros).toHaveLength(1);
		expect(state.equipes.A.membros[0].nome).toBe('Melo');
	});

	it('deve permitir trocar de equipe preservando integridade', () => {
		let state = createInitialGameState('SALA1');
		state = gameReducer(state, {
			type: 'SET_PLAYER',
			payload: { id: 'p1', nome: 'Melo', equipe: 'A' }
		});
		state = gameReducer(state, {
			type: 'SELECT_TEAM',
			payload: { playerId: 'p1', equipe: 'B' }
		});

		expect(state.minhaEquipe).toBe('B');
		expect(state.equipes.A.membros).toHaveLength(0);
		expect(state.equipes.B.membros).toHaveLength(1);
	});

	it('deve transicionar para disputa de PPT e aplicar resolução autoritativa', () => {
		let state = createInitialGameState('SALA1');
		state = gameReducer(state, {
			type: 'SUBMIT_PPT_INTENT',
			payload: { move: 'pedra' }
		});
		expect(state.fase).toBe('PPT_DISPUTA');

		state = gameReducer(state, {
			type: 'PPT_RESOLVIDO',
			payload: {
				vencedor: 'B',
				lances: { A: 'pedra', B: 'papel' }
			}
		});

		expect(state.fase).toBe('PPT_RESULTADO');
		expect(state.equipeAtiva).toBe('B');
		expect(state.rodadaAtual.equipeAtiva).toBe('B');
	});

	it('deve seguir o ciclo de rodada: Escolha de Espectro -> Dica -> Palpite', () => {
		let state = createInitialGameState('SALA1');

		// 1. Escolha de espectro
		state = gameReducer(state, {
			type: 'SELECT_SPECTRUM_INTENT',
			payload: {
				carta: { id: 'c1', left: 'Famoso', right: 'Anônimo' }
			}
		});
		expect(state.fase).toBe('RODADA_DICA');
		expect(state.rodadaAtual.carta?.left).toBe('Famoso');

		// 2. Envio de dica pelo codificador
		state = gameReducer(state, {
			type: 'SUBMIT_CLUE_INTENT',
			payload: { dica: 'Keanu Reeves' }
		});
		expect(state.fase).toBe('RODADA_PALPITE');
		expect(state.rodadaAtual.dica).toBe('Keanu Reeves');

		// 3. Atualização de palpite pelo palpiteiro
		state = gameReducer(state, {
			type: 'UPDATE_SLIDER_PREVIEW',
			payload: { palpite: 72 }
		});
		expect(state.rodadaAtual.palpite).toBe(72);
	});

	it('deve aplicar revelação autoritativa, atualizar placar e histórico', () => {
		let state = createInitialGameState('SALA1');
		state.rodadaAtual.palpite = 70;

		state = gameReducer(state, {
			type: 'RODADA_REVELADA',
			payload: {
				metaReal: 70,
				palpite: 70,
				pontosGanhos: 4,
				placarA: 4,
				placarB: 0
			}
		});

		expect(state.fase).toBe('RODADA_REVELACAO');
		expect(state.equipes.A.pontos).toBe(4);
		expect(state.rodadaAtual.revelada).toBe(true);
		expect(state.rodadaAtual.metaOculta).toBe(70);
		expect(state.rodadaAtual.resultado?.points).toBe(4);
		expect(state.historicoRodadas).toHaveLength(1);
	});

	it('deve detectar vitória quando uma equipe atingir a pontuação alvo', () => {
		let state = createInitialGameState('SALA1');
		state.metaPontuacao = 10;

		state = gameReducer(state, {
			type: 'RODADA_REVELADA',
			payload: {
				metaReal: 80,
				palpite: 81,
				pontosGanhos: 4,
				placarA: 11,
				placarB: 6,
				vencedorPartida: 'A'
			}
		});

		expect(state.fase).toBe('VITORIA');
		expect(state.vencedor).toBe('A');
	});

	it('deve reiniciar o placar ao executar Revanche', () => {
		let state = createInitialGameState('SALA1');
		state.equipes.A.pontos = 10;
		state.vencedor = 'A';
		state.fase = 'VITORIA';

		state = gameReducer(state, {
			type: 'REMATCH_INTENT'
		});

		expect(state.fase).toBe('PPT_DISPUTA');
		expect(state.vencedor).toBeNull();
		expect(state.equipes.A.pontos).toBe(0);
		expect(state.equipes.B.pontos).toBe(0);
		expect(state.historicoRodadas).toHaveLength(0);
	});
});
