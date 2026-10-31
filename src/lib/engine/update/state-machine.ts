/**
 * Máquina de Estados Pura do Leveling Out (Camada de Update)
 * Função redutora pura e determinística (state, action) => nextState.
 * Desacoplada do DOM e de APIs do navegador para execução headless e testes unitários.
 */

import { calculateScore } from './score-rules';
import { clampGuess, sanitizeNickname } from '../input/sanitize';
import type {
	GameAction,
	GamePhase,
	GameState,
	Player,
	RoundState,
	SpectrumCard,
	TeamId
} from '../types';

export function createInitialGameState(salaCodigo: string): GameState {
	return {
		salaCodigo,
		fase: 'LOBBY',
		hostId: null,
		jogadoresAleatorios: [],
		equipes: {
			A: {
				id: 'A',
				nome: 'Equipe Pato',
				pontos: 0,
				membros: []
			},
			B: {
				id: 'B',
				nome: 'Equipe Ganso',
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
			const { id, nome, equipe, isHost } = action.payload;
			const cleanNome = sanitizeNickname(nome);

			const updatedMembersA = state.equipes.A.membros.filter((m) => m.id !== id);
			const updatedMembersB = state.equipes.B.membros.filter((m) => m.id !== id);
			const updatedAleatorios = state.jogadoresAleatorios.filter((m) => m.id !== id);

			const newPlayer: Player = { id, nome: cleanNome, equipe, isOnline: true, isHost };

			if (equipe === 'A') {
				updatedMembersA.push(newPlayer);
			} else if (equipe === 'B') {
				updatedMembersB.push(newPlayer);
			} else {
				updatedAleatorios.push(newPlayer);
			}

			return {
				...state,
				meuJogadorId: id,
				minhaEquipe: equipe,
				hostId: isHost ? id : state.hostId,
				equipes: {
					A: { ...state.equipes.A, membros: updatedMembersA },
					B: { ...state.equipes.B, membros: updatedMembersB }
				},
				jogadoresAleatorios: updatedAleatorios
			};
		}

		case 'SELECT_TEAM': {
			const { playerId, equipe } = action.payload;
			const existingPlayer =
				state.equipes.A.membros.find((m) => m.id === playerId) ||
				state.equipes.B.membros.find((m) => m.id === playerId) ||
				state.jogadoresAleatorios.find((m) => m.id === playerId);

			if (!existingPlayer) return state;

			const updatedPlayer = { ...existingPlayer, equipe };
			const updatedMembersA = state.equipes.A.membros.filter((m) => m.id !== playerId);
			const updatedMembersB = state.equipes.B.membros.filter((m) => m.id !== playerId);
			const updatedAleatorios = state.jogadoresAleatorios.filter((m) => m.id !== playerId);

			if (equipe === 'A') {
				updatedMembersA.push(updatedPlayer);
			} else if (equipe === 'B') {
				updatedMembersB.push(updatedPlayer);
			} else {
				updatedAleatorios.push(updatedPlayer);
			}

			return {
				...state,
				minhaEquipe: state.meuJogadorId === playerId ? equipe : state.minhaEquipe,
				equipes: {
					A: { ...state.equipes.A, membros: updatedMembersA },
					B: { ...state.equipes.B, membros: updatedMembersB }
				},
				jogadoresAleatorios: updatedAleatorios
			};
		}

		case 'START_MATCH_INTENT': {
			return {
				...state,
				fase: 'PPT_DISPUTA'
			};
		}

		case 'SUBMIT_PPT_INTENT': {
			return {
				...state,
				fase: 'PPT_DISPUTA',
				ppt: {
					...state.ppt,
					meuLance: action.payload.move
				}
			};
		}

		case 'SET_MEU_LANCE_PPT': {
			return {
				...state,
				ppt: {
					...state.ppt,
					meuLance: action.payload.move
				}
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
					carta: action.payload.carta
				}
			};
		}

		case 'PRE_SELECT_SPECTRUM_INTENT': {
			return {
				...state,
				rodadaAtual: {
					...state.rodadaAtual,
					cartaSelecionadaId: action.payload.cartaId
				}
			};
		}

		case 'VOTE_SPECTRUM_INTENT': {
			const atual = state.rodadaAtual.votoParceiroCartaId;
			return {
				...state,
				rodadaAtual: {
					...state.rodadaAtual,
					votoParceiroCartaId: atual === action.payload.cartaId ? null : action.payload.cartaId
				}
			};
		}

		case 'CONFIRM_SPECTRUM_INTENT': {
			const cartaEncontrada = state.cartasEspectroOpcoes?.find(
				(c) => c.id === action.payload.cartaId
			);
			return {
				...state,
				rodadaAtual: {
					...state.rodadaAtual,
					cartaSelecionadaId: action.payload.cartaId,
					carta: cartaEncontrada || state.rodadaAtual.carta
				}
			};
		}

		case 'SUBMIT_CLUE_INTENT': {
			return {
				...state,
				fase: 'RODADA_PALPITE',
				rodadaAtual: {
					...state.rodadaAtual,
					dica: action.payload.dica
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

		case 'FULL_SYNC': {
			const payload = action.payload;

			// 1. Fase da partida
			let faseRaw = (payload.fase ?? payload.sala?.fase ?? 'LOBBY') as GamePhase | string;
			if (faseRaw === 'INICIATIVA') {
				faseRaw = 'PPT_DISPUTA';
			} else if (faseRaw === 'ESCOLHA_ESPECTRO') {
				faseRaw = 'ESCOLHA_CARTA';
			} else if (faseRaw === 'FIM_DE_JOGO') {
				faseRaw = 'VITORIA';
			}
			const fase = faseRaw as GamePhase;

			// 2. Pontuações e Vencedor
			const placarA = Number(payload.placarA ?? payload.sala?.placar_a ?? state.equipes.A.pontos);
			const placarB = Number(payload.placarB ?? payload.sala?.placar_b ?? state.equipes.B.pontos);
			const vencedor = (payload.vencedor ?? payload.sala?.vencedor ?? null) as TeamId | null;
			const hostId = payload.hostId ?? payload.sala?.host_id ?? state.hostId;
			const equipeAtiva = (payload.equipeAtiva ??
				payload.sala?.equipe_da_vez ??
				state.equipeAtiva) as TeamId;

			// 3. Distribuição de Jogadores
			const jogadoresRaw = payload.jogadores ?? [];
			const jogadoresFormatados: Player[] = jogadoresRaw.map((j: any) => ({
				id: j.playerId || j.id,
				nome: j.nome,
				equipe: j.equipe || 'ALEATORIO',
				isOnline: j.isOnline ?? true,
				isHost: j.isHost ?? false,
				lastSeen: j.equipeDesde || j.lastSeen
			}));

			const membrosA = jogadoresFormatados.filter((j) => j.equipe === 'A');
			const membrosB = jogadoresFormatados.filter((j) => j.equipe === 'B');
			const aleatorios = jogadoresFormatados.filter((j) => j.equipe !== 'A' && j.equipe !== 'B');

			let minhaEquipe = state.minhaEquipe;
			if (state.meuJogadorId) {
				const me = jogadoresFormatados.find((j) => j.id === state.meuJogadorId);
				if (me) {
					minhaEquipe = me.equipe;
				}
			}

			// 4. Estado de PPT (Iniciativa)
			const pptRaw = payload.ppt ?? payload.sala;
			const ppt = {
				estado: pptRaw?.estado ?? pptRaw?.ppt_estado ?? state.ppt?.estado,
				prazo: pptRaw?.prazo ?? pptRaw?.ppt_prazo ?? state.ppt?.prazo,
				revelacaoEm: pptRaw?.revelacaoEm ?? pptRaw?.ppt_revelacao_em ?? state.ppt?.revelacaoEm,
				enviouA: Boolean(pptRaw?.enviouA ?? pptRaw?.ppt_enviou_a),
				enviouB: Boolean(pptRaw?.enviouB ?? pptRaw?.ppt_enviou_b),
				representanteA:
					pptRaw?.representanteA ?? pptRaw?.ppt_representante_a ?? state.ppt?.representanteA,
				representanteB:
					pptRaw?.representanteB ?? pptRaw?.ppt_representante_b ?? state.ppt?.representanteB,
				resultado: pptRaw?.resultado ?? pptRaw?.ppt_resultado ?? state.ppt?.resultado,
				lanceA: pptRaw?.lanceA ?? pptRaw?.ppt_lance_a ?? state.ppt?.lanceA,
				lanceB: pptRaw?.lanceB ?? pptRaw?.ppt_lance_b ?? state.ppt?.lanceB,
				meuLance: pptRaw?.meuLance ?? state.ppt?.meuLance
			};

			// 5. Estado da Rodada Ativa
			const rodadaObj =
				payload.rodadaAtiva ??
				(typeof payload.rodada === 'object' && payload.rodada !== null
					? payload.rodada
					: undefined);
			const numeroRodada =
				Number(
					(typeof payload.rodada === 'number' ? payload.rodada : undefined) ??
						payload.sala?.rodada_atual ??
						rodadaObj?.numero ??
						state.rodadaAtual.numero
				) || 1;

			let cartaAtual = state.rodadaAtual.carta;
			if (rodadaObj?.espectroEsquerda && rodadaObj?.espectroDireita) {
				cartaAtual = {
					id: 'carta_' + numeroRodada,
					left: rodadaObj.espectroEsquerda,
					right: rodadaObj.espectroDireita
				};
			} else if (rodadaObj && 'carta_espectro' in rodadaObj && (rodadaObj as any).carta_espectro) {
				cartaAtual = (rodadaObj as any).carta_espectro;
			}

			const cartasOpcoesRaw = payload.cartasOpcoes ?? payload.cartasEspectroOpcoes ?? [];
			const cartasEspectroOpcoes: SpectrumCard[] = (cartasOpcoesRaw as any[]).map((c) => ({
				id: c.id ?? c.ID ?? '',
				left: c.left ?? c.esquerda ?? c.Esquerda ?? '',
				right: c.right ?? c.direita ?? c.Direita ?? '',
				esquerda: c.esquerda ?? c.Esquerda ?? c.left ?? '',
				direita: c.direita ?? c.Direita ?? c.right ?? '',
				categoria: c.categoria ?? c.Categoria ?? ''
			}));

			const rodadaAtual: RoundState = {
				...state.rodadaAtual,
				numero: numeroRodada,
				equipeAtiva,
				codificadorId:
					rodadaObj?.codificadorId ??
					(rodadaObj as any)?.codificador_id ??
					state.rodadaAtual.codificadorId,
				palpiteiroId:
					rodadaObj?.palpiteiroId ??
					(rodadaObj as any)?.palpiteiro_id ??
					state.rodadaAtual.palpiteiroId,
				liderRodadaId:
					rodadaObj?.liderRodadaId ??
					(rodadaObj as any)?.lider_rodada_id ??
					state.rodadaAtual.liderRodadaId,
				cartaSelecionadaId:
					rodadaObj?.cartaSelecionadaId ??
					(rodadaObj as any)?.carta_selecionada_id ??
					state.rodadaAtual.cartaSelecionadaId,
				votoParceiroCartaId:
					rodadaObj?.votoParceiroCartaId ??
					(rodadaObj as any)?.voto_parceiro_carta_id ??
					state.rodadaAtual.votoParceiroCartaId,
				prazoEspectro:
					rodadaObj?.prazoEspectro ??
					(rodadaObj as any)?.prazo_espectro ??
					state.rodadaAtual.prazoEspectro,
				carta: cartaAtual,
				metaOculta:
					rodadaObj?.metaOculta ?? (rodadaObj as any)?.meta_oculta ?? state.rodadaAtual.metaOculta,
				dica: rodadaObj?.dica ?? state.rodadaAtual.dica,
				palpite: rodadaObj?.palpite ?? state.rodadaAtual.palpite,
				revelada: Boolean(
					rodadaObj?.metaOculta !== undefined &&
					rodadaObj?.metaOculta !== null &&
					(fase === 'RODADA_REVELACAO' || fase === 'VITORIA')
				)
			};

			return {
				...state,
				fase,
				hostId,
				vencedor,
				equipeAtiva,
				equipes: {
					A: { ...state.equipes.A, pontos: placarA, membros: membrosA },
					B: { ...state.equipes.B, pontos: placarB, membros: membrosB }
				},
				jogadoresAleatorios: aleatorios,
				minhaEquipe,
				ppt,
				rodadaAtual,
				cartasEspectroOpcoes:
					cartasEspectroOpcoes.length > 0 ? cartasEspectroOpcoes : state.cartasEspectroOpcoes
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
