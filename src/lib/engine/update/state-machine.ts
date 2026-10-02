/**
 * Máquina de Estados Pura do Leveling Out (Camada de Update)
 * Função redutora pura e determinística (state, action) => nextState.
 * Desacoplada do DOM e de APIs do navegador para execução headless e testes unitários.
 */

import { calculateScore } from './score-rules';
import { clampGuess, sanitizeClue, sanitizeNickname } from '../input/sanitize';
import type { GameAction, GameState, TeamId } from '../types';

export function createInitialGameState(salaCodigo: string): GameState {
	return {
		salaCodigo,
		fase: 'LOBBY',
		equipes: {
			A: {
				id: 'A',
				nome: 'Equipe A (Índigo)',
				pontos: 0,
				membros: []
			},
			B: {
				id: 'B',
				nome: 'Equipe B (Pêssego)',
				pontos: 0,
				membros: []
			}
		},
		equipeAtiva: 'A',
		rodadaAtual: {
			numero: 1,
			equipeAtiva: 'A',
			codificadorId: null,
			palpiteiroId: null,
			carta: null,
			metaOculta: null,
			dica: null,
			palpite: 50,
			resultado: null,
			revelada: false
		},
		historicoRodadas: [],
		metaPontuacao: 10,
		vencedor: null,
		meuJogadorId: null,
		minhaEquipe: null
	};
}

/**
 * Transição de estado pura do jogo.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
	switch (action.type) {
		case 'SET_PLAYER': {
			const { id, nome, equipe } = action.payload;
			const cleanNome = sanitizeNickname(nome);

			const updatedMembersA = state.equipes.A.membros.filter((m) => m.id !== id);
			const updatedMembersB = state.equipes.B.membros.filter((m) => m.id !== id);

			const newPlayer = { id, nome: cleanNome, equipe, isOnline: true };

			if (equipe === 'A') {
				updatedMembersA.push(newPlayer);
			} else {
				updatedMembersB.push(newPlayer);
			}

			return {
				...state,
				meuJogadorId: id,
				minhaEquipe: equipe,
				equipes: {
					A: { ...state.equipes.A, membros: updatedMembersA },
					B: { ...state.equipes.B, membros: updatedMembersB }
				}
			};
		}

		case 'SELECT_TEAM': {
			const { playerId, equipe } = action.payload;
			const existingPlayer =
				state.equipes.A.membros.find((m) => m.id === playerId) ||
				state.equipes.B.membros.find((m) => m.id === playerId);

			if (!existingPlayer) return state;

			const updatedPlayer = { ...existingPlayer, equipe };
			const updatedMembersA = state.equipes.A.membros.filter((m) => m.id !== playerId);
			const updatedMembersB = state.equipes.B.membros.filter((m) => m.id !== playerId);

			if (equipe === 'A') {
				updatedMembersA.push(updatedPlayer);
			} else {
				updatedMembersB.push(updatedPlayer);
			}

			return {
				...state,
				minhaEquipe: state.meuJogadorId === playerId ? equipe : state.minhaEquipe,
				equipes: {
					A: { ...state.equipes.A, membros: updatedMembersA },
					B: { ...state.equipes.B, membros: updatedMembersB }
				}
			};
		}

		case 'SUBMIT_PPT_INTENT': {
			return {
				...state,
				fase: 'PPT_DISPUTA'
			};
		}

		case 'PPT_RESOLVIDO': {
			const { vencedor } = action.payload;
			const activeTeam: TeamId = vencedor === 'EMPATE' ? 'A' : vencedor;

			return {
				...state,
				fase: vencedor === 'EMPATE' ? 'PPT_DISPUTA' : 'PPT_RESULTADO',
				equipeAtiva: activeTeam,
				rodadaAtual: {
					...state.rodadaAtual,
					equipeAtiva: activeTeam
				}
			};
		}

		case 'SELECT_SPECTRUM_INTENT': {
			return {
				...state,
				fase: 'RODADA_DICA',
				rodadaAtual: {
					...state.rodadaAtual,
					carta: action.payload.carta,
					dica: null,
					palpite: 50,
					resultado: null,
					revelada: false
				}
			};
		}

		case 'SUBMIT_CLUE_INTENT': {
			const sanitized = sanitizeClue(action.payload.dica);
			if (!sanitized) return state;

			return {
				...state,
				fase: 'RODADA_PALPITE',
				rodadaAtual: {
					...state.rodadaAtual,
					dica: sanitized
				}
			};
		}

		case 'UPDATE_SLIDER_PREVIEW': {
			const clamped = clampGuess(action.payload.palpite);
			return {
				...state,
				rodadaAtual: {
					...state.rodadaAtual,
					palpite: clamped
				}
			};
		}

		case 'SUBMIT_GUESS_INTENT': {
			const clamped = clampGuess(action.payload.palpite);
			return {
				...state,
				rodadaAtual: {
					...state.rodadaAtual,
					palpite: clamped
				}
			};
		}

		case 'RODADA_REVELADA': {
			const { metaReal, palpite, pontosGanhos, placarA, placarB, vencedorPartida } = action.payload;
			const scoreResult = calculateScore(metaReal, palpite);

			const finalRound = {
				...state.rodadaAtual,
				metaOculta: metaReal,
				palpite,
				resultado: { ...scoreResult, points: pontosGanhos },
				revelada: true
			};

			const nextWinner =
				vencedorPartida ||
				(placarA >= state.metaPontuacao ? 'A' : placarB >= state.metaPontuacao ? 'B' : null);

			return {
				...state,
				fase: nextWinner ? 'VITORIA' : 'RODADA_REVELACAO',
				vencedor: nextWinner,
				equipes: {
					A: { ...state.equipes.A, pontos: placarA },
					B: { ...state.equipes.B, pontos: placarB }
				},
				rodadaAtual: finalRound,
				historicoRodadas: [...state.historicoRodadas, finalRound]
			};
		}

		case 'SALA_UPDATE': {
			const { placarA, placarB, rodadaAtual, vencedor, equipeAtiva } = action.payload;

			return {
				...state,
				vencedor: vencedor || state.vencedor,
				fase: vencedor ? 'VITORIA' : state.fase,
				equipeAtiva: equipeAtiva || state.equipeAtiva,
				equipes: {
					A: { ...state.equipes.A, pontos: placarA },
					B: { ...state.equipes.B, pontos: placarB }
				},
				rodadaAtual: {
					...state.rodadaAtual,
					numero: rodadaAtual
				}
			};
		}

		case 'FULL_SYNC': {
			const { sala, jogadores } = action.payload;
			const fase = sala.fase || 'LOBBY';
			const placarA = Number(sala.placar_a) || 0;
			const placarB = Number(sala.placar_b) || 0;
			const vencedor = (sala.vencedor as TeamId) || null;

			const membrosA = (jogadores || []).filter((j) => j.equipe === 'A');
			const membrosB = (jogadores || []).filter((j) => j.equipe === 'B');

			return {
				...state,
				fase,
				vencedor,
				equipeAtiva: sala.equipe_da_vez || state.equipeAtiva,
				equipes: {
					A: { ...state.equipes.A, pontos: placarA, membros: membrosA },
					B: { ...state.equipes.B, pontos: placarB, membros: membrosB }
				},
				rodadaAtual: {
					...state.rodadaAtual,
					numero: Number(sala.rodada_atual) || 1
				}
			};
		}

		case 'PLAYER_PRESENCE_UPDATE': {
			const { jogadores } = action.payload;
			const membrosA = jogadores.filter((j) => j.equipe === 'A');
			const membrosB = jogadores.filter((j) => j.equipe === 'B');

			return {
				...state,
				equipes: {
					A: { ...state.equipes.A, membros: membrosA },
					B: { ...state.equipes.B, membros: membrosB }
				}
			};
		}

		case 'REMATCH_INTENT': {
			return {
				...state,
				fase: 'PPT_DISPUTA',
				vencedor: null,
				equipes: {
					A: { ...state.equipes.A, pontos: 0 },
					B: { ...state.equipes.B, pontos: 0 }
				},
				rodadaAtual: {
					numero: 1,
					equipeAtiva: 'A',
					codificadorId: null,
					palpiteiroId: null,
					carta: null,
					metaOculta: null,
					dica: null,
					palpite: 50,
					resultado: null,
					revelada: false
				},
				historicoRodadas: []
			};
		}

		default:
			return state;
	}
}
