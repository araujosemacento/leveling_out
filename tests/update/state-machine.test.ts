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

	it('deve mapear FULL_SYNC com fase REVELACAO e tier FORA_DA_MARGEM reconstruindo resultado', () => {
		let state = createInitialGameState('SALA1');
		state = gameReducer(state, {
			type: 'FULL_SYNC',
			payload: {
				codigo: 'SALA1',
				fase: 'REVELACAO',
				rodada: 1,
				equipeAtiva: 'A',
				placarA: 0,
				placarB: 0,
				rodadaAtiva: {
					numero: 1,
					equipe: 'A',
					codificadorId: 'p1',
					palpiteiroId: 'p2',
					espectroEsquerda: 'Quente',
					espectroDireita: 'Frio',
					dica: 'Vulcão',
					metaOculta: 15,
					palpite: 80,
					pontos: 0,
					tier: 'FORA_DA_MARGEM',
					diff: 65,
					transicaoEm: '2026-11-25T05:00:00Z'
				}
			}
		});

		expect(state.fase).toBe('RODADA_REVELACAO');
		expect(state.rodadaAtual.revelada).toBe(true);
		expect(state.rodadaAtual.transicaoEm).toBe('2026-11-25T05:00:00Z');
		expect(state.rodadaAtual.resultado).toEqual({
			points: 0,
			diff: 65,
			tier: 'ERRO',
			label: 'Fora da Margem'
		});
	});

	it('deve mapear FULL_SYNC com fase FIM_JOGO e hidratar resumoPartida normalizando tiers', () => {
		let state = createInitialGameState('SALA1');
		state = gameReducer(state, {
			type: 'FULL_SYNC',
			payload: {
				codigo: 'SALA1',
				fase: 'FIM_JOGO',
				rodada: 2,
				equipeAtiva: 'A',
				placarA: 10,
				placarB: 3,
				vencedor: 'A',
				motivoFim: 'VITORIA',
				historico: [
					{
						numero: 1,
						equipe: 'A',
						codificadorId: 'p1',
						palpiteiroId: 'p2',
						espectroEsquerda: 'Leve',
						espectroDireita: 'Pesado',
						metaOculta: 80,
						palpite: 81,
						dica: 'Chumbo',
						pontos: 4,
						tier: 'NA_MOSCA',
						diff: 1,
						duracaoSegundos: 18
					},
					{
						numero: 2,
						equipe: 'B',
						codificadorId: 'p3',
						palpiteiroId: 'p4',
						espectroEsquerda: 'Silencioso',
						espectroDireita: 'Barulhento',
						metaOculta: 20,
						palpite: 70,
						dica: 'Sussurro',
						pontos: 0,
						tier: 'FORA_DA_MARGEM' as any,
						diff: 50,
						duracaoSegundos: 25
					}
				]
			}
		});

		expect(state.fase).toBe('VITORIA');
		expect(state.vencedor).toBe('A');
		expect(state.motivoFim).toBe('VITORIA');
		expect(state.resumoPartida).toHaveLength(2);
		expect(state.resumoPartida?.[0].tier).toBe('NA_MOSCA');
		expect(state.resumoPartida?.[1].tier).toBe('ERRO');
	});

	it('deve limpar metaOculta, dica, resultado e metadados de escolha ao transicionar da Rodada 1 para Rodada 2', () => {
		let state = createInitialGameState('SALA1');
		state = gameReducer(state, {
			type: 'FULL_SYNC',
			payload: {
				codigo: 'SALA1',
				fase: 'REVELACAO',
				rodada: 1,
				equipeAtiva: 'A',
				placarA: 4,
				placarB: 0,
				rodadaAtiva: {
					numero: 1,
					equipe: 'A',
					codificadorId: 'p1',
					palpiteiroId: 'p2',
					cartaSelecionadaId: 'c1',
					votoParceiroCartaId: 'c1',
					prazoEspectro: '2026-11-25T05:00:00Z',
					espectroEsquerda: 'Fácil',
					espectroDireita: 'Difícil',
					dica: 'Somar 1+1',
					metaOculta: 12,
					palpite: 12,
					pontos: 4,
					tier: 'NA_MOSCA',
					diff: 0
				}
			}
		});

		expect(state.rodadaAtual.metaOculta).toBe(12);
		expect(state.rodadaAtual.dica).toBe('Somar 1+1');
		expect(state.rodadaAtual.resultado).not.toBeNull();

		// Rodada 2 começa para um jogador sem permissão de ver metaOculta (campos omitidos pelo Zero Trust)
		state = gameReducer(state, {
			type: 'FULL_SYNC',
			payload: {
				codigo: 'SALA1',
				fase: 'ESCOLHA_ESPECTRO',
				rodada: 2,
				equipeAtiva: 'B',
				placarA: 4,
				placarB: 0,
				rodadaAtiva: {
					numero: 2,
					equipe: 'B',
					codificadorId: 'p3',
					palpiteiroId: 'p4'
				}
			}
		});

		expect(state.fase).toBe('ESCOLHA_CARTA');
		expect(state.rodadaAtual.numero).toBe(2);
		expect(state.rodadaAtual.metaOculta).toBeNull();
		expect(state.rodadaAtual.dica).toBeNull();
		expect(state.rodadaAtual.resultado).toBeNull();
		expect(state.rodadaAtual.cartaSelecionadaId).toBeNull();
		expect(state.rodadaAtual.votoParceiroCartaId).toBeNull();
		expect(state.rodadaAtual.prazoEspectro).toBeNull();
		expect(state.rodadaAtual.revelada).toBe(false);
	});
});
