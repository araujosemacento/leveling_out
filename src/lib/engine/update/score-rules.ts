/**
 * Regras de Pontuação por Proximidade (Camada de Update)
 * Algoritmo puro de referência e pré-visualização no front-end.
 *
 * NOTA DE SEGURANÇA (Zero Trust):
 * O cálculo oficial e autoritativo do placar reside estritamente
 * em backend/pb_hooks/game_rules.pb.js.
 * Esta função no front-end é utilizada exclusivamente para projeção visual,
 * feedback de graduação no slider analógico e testes de simulação.
 */

import type { ScoreResult, ScoreTier } from '../types';

export const SCORE_TIERS = {
	NA_MOSCA: { maxDiff: 2, points: 4, label: 'Na Mosca!' },
	MUITO_PERTO: { maxDiff: 6, points: 3, label: 'Muito Perto!' },
	PERTO: { maxDiff: 12, points: 2, label: 'Perto!' },
	ERRO: { maxDiff: Infinity, points: 0, label: 'Fora da Margem' }
} as const;

/**
 * Calcula a graduação de pontos por proximidade a partir da distância entre a meta e o palpite.
 *
 * @param target Nível real do tubo de ensaio [0, 100]
 * @param guess Posição estimada pelo palpiteiro [0, 100]
 * @returns Resultado contendo pontos, distância, tier semântico e rótulo descritivo.
 */
export function calculateScore(target: number, guess: number): ScoreResult {
	const diff = Math.abs(target - guess);

	let tier: ScoreTier = 'ERRO';
	let points = 0;
	let label: string = SCORE_TIERS.ERRO.label;

	if (diff <= SCORE_TIERS.NA_MOSCA.maxDiff) {
		tier = 'NA_MOSCA';
		points = SCORE_TIERS.NA_MOSCA.points;
		label = SCORE_TIERS.NA_MOSCA.label;
	} else if (diff <= SCORE_TIERS.MUITO_PERTO.maxDiff) {
		tier = 'MUITO_PERTO';
		points = SCORE_TIERS.MUITO_PERTO.points;
		label = SCORE_TIERS.MUITO_PERTO.label;
	} else if (diff <= SCORE_TIERS.PERTO.maxDiff) {
		tier = 'PERTO';
		points = SCORE_TIERS.PERTO.points;
		label = SCORE_TIERS.PERTO.label;
	}

	return {
		points,
		diff,
		tier,
		label
	};
}

/**
 * Avalia se uma equipe alcançou a pontuação necessária para a vitória.
 */
export function isWinningScore(score: number, targetScore: number = 10): boolean {
	return score >= targetScore;
}
