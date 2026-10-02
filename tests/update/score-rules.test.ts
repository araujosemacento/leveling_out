import { describe, expect, it } from 'bun:test';
import {
	calculateScore,
	isWinningScore,
	SCORE_TIERS
} from '../../src/lib/engine/update/score-rules';

describe('Algoritmo de Acerto Aproximado (update/score-rules.ts)', () => {
	it('deve conceder 4 pontos (Na Mosca) para margem de erro <= 2%', () => {
		expect(calculateScore(70, 70)).toEqual({
			points: 4,
			diff: 0,
			tier: 'NA_MOSCA',
			label: SCORE_TIERS.NA_MOSCA.label
		});

		expect(calculateScore(50, 52)).toEqual({
			points: 4,
			diff: 2,
			tier: 'NA_MOSCA',
			label: SCORE_TIERS.NA_MOSCA.label
		});

		expect(calculateScore(50, 48)).toEqual({
			points: 4,
			diff: 2,
			tier: 'NA_MOSCA',
			label: SCORE_TIERS.NA_MOSCA.label
		});
	});

	it('deve conceder 3 pontos (Muito Perto) para margem de erro entre 3% e 6%', () => {
		expect(calculateScore(50, 53).points).toBe(3);
		expect(calculateScore(50, 53).tier).toBe('MUITO_PERTO');

		expect(calculateScore(50, 56).points).toBe(3);
		expect(calculateScore(50, 56).tier).toBe('MUITO_PERTO');

		expect(calculateScore(50, 44).points).toBe(3);
		expect(calculateScore(50, 44).tier).toBe('MUITO_PERTO');
	});

	it('deve conceder 2 pontos (Perto) para margem de erro entre 7% e 12%', () => {
		expect(calculateScore(50, 57).points).toBe(2);
		expect(calculateScore(50, 57).tier).toBe('PERTO');

		expect(calculateScore(50, 62).points).toBe(2);
		expect(calculateScore(50, 62).tier).toBe('PERTO');

		expect(calculateScore(50, 38).points).toBe(2);
		expect(calculateScore(50, 38).tier).toBe('PERTO');
	});

	it('deve conceder 0 pontos (Fora da Margem) para margem de erro superior a 12%', () => {
		expect(calculateScore(50, 63).points).toBe(0);
		expect(calculateScore(50, 63).tier).toBe('ERRO');

		expect(calculateScore(10, 90).points).toBe(0);
		expect(calculateScore(10, 90).tier).toBe('ERRO');
	});

	it('deve processar limites extremos [0, 100]', () => {
		expect(calculateScore(0, 0).points).toBe(4);
		expect(calculateScore(100, 100).points).toBe(4);
		expect(calculateScore(0, 100).points).toBe(0);
		expect(calculateScore(100, 0).points).toBe(0);
	});

	it('deve avaliar a condição de vitória corretamente', () => {
		expect(isWinningScore(9, 10)).toBe(false);
		expect(isWinningScore(10, 10)).toBe(true);
		expect(isWinningScore(14, 10)).toBe(true);
	});
});
