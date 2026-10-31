/**
 * Fábrica de Intenções de Entrada (Camada de Input)
 * Converte eventos brutos de interface e interações de usuário em GameActions tipadas
 * e previamente higienizadas antes de entrarem na máquina de estados (Update).
 */

import { clampGuess, sanitizeClue, sanitizeNickname } from './sanitize';
import type { GameAction, LobbyTeamChoice, PptMove, SpectrumCard } from '../types';

export function createSetPlayerAction(
	id: string,
	rawNome: string,
	equipe: LobbyTeamChoice,
	isHost?: boolean
): GameAction {
	return {
		type: 'SET_PLAYER',
		payload: {
			id,
			nome: sanitizeNickname(rawNome),
			equipe,
			isHost
		}
	};
}

export function createSwitchTeamAction(
	playerId: string,
	targetEquipe: LobbyTeamChoice
): GameAction {
	return {
		type: 'SELECT_TEAM',
		payload: {
			playerId,
			equipe: targetEquipe
		}
	};
}

export function createStartMatchAction(): GameAction {
	return {
		type: 'START_MATCH_INTENT'
	};
}

export function createSubmitPptAction(move: PptMove): GameAction {
	return {
		type: 'SUBMIT_PPT_INTENT',
		payload: {
			move
		}
	};
}

export function createSelectSpectrumAction(carta: SpectrumCard): GameAction {
	return {
		type: 'SELECT_SPECTRUM_INTENT',
		payload: {
			carta
		}
	};
}

export function createPreSelectSpectrumAction(cartaId: string): GameAction {
	return {
		type: 'PRE_SELECT_SPECTRUM_INTENT',
		payload: {
			cartaId
		}
	};
}

export function createVoteSpectrumAction(cartaId: string): GameAction {
	return {
		type: 'VOTE_SPECTRUM_INTENT',
		payload: {
			cartaId
		}
	};
}

export function createConfirmSpectrumAction(cartaId: string): GameAction {
	return {
		type: 'CONFIRM_SPECTRUM_INTENT',
		payload: {
			cartaId
		}
	};
}

export function createSubmitClueAction(rawDica: string): GameAction {
	return {
		type: 'SUBMIT_CLUE_INTENT',
		payload: {
			dica: sanitizeClue(rawDica)
		}
	};
}

export function createUpdateSliderAction(rawPalpite: unknown): GameAction {
	return {
		type: 'UPDATE_SLIDER_PREVIEW',
		payload: {
			palpite: clampGuess(rawPalpite)
		}
	};
}

export function createSubmitGuessAction(rawPalpite: unknown): GameAction {
	return {
		type: 'SUBMIT_GUESS_INTENT',
		payload: {
			palpite: clampGuess(rawPalpite)
		}
	};
}

export function createRematchAction(): GameAction {
	return {
		type: 'REMATCH_INTENT'
	};
}
