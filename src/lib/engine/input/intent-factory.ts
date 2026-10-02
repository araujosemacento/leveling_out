/**
 * Fábrica de Intenções de Entrada (Camada de Input)
 * Converte eventos brutos de interface e interações de usuário em GameActions tipadas
 * e previamente higienizadas antes de entrarem na máquina de estados (Update).
 */

import { clampGuess, sanitizeClue, sanitizeNickname } from './sanitize';
import type { GameAction, PptMove, SpectrumCard, TeamId } from '../types';

export function createSetPlayerAction(id: string, rawNome: string, equipe: TeamId): GameAction {
	return {
		type: 'SET_PLAYER',
		payload: {
			id,
			nome: sanitizeNickname(rawNome),
			equipe
		}
	};
}

export function createSwitchTeamAction(playerId: string, targetEquipe: TeamId): GameAction {
	return {
		type: 'SELECT_TEAM',
		payload: {
			playerId,
			equipe: targetEquipe
		}
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
