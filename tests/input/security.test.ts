import { describe, expect, it } from 'bun:test';
import {
	clampGuess,
	sanitizeClue,
	sanitizeNickname,
	sanitizeRoomCode
} from '../../src/lib/engine/input/sanitize';

describe('Sanitização Defensiva do Front-end (input/sanitize.ts)', () => {
	describe('sanitizeClue', () => {
		it('deve remover tags HTML maliciosas', () => {
			const dirty = '<script>alert("xss")</script>Keanu Reeves';
			expect(sanitizeClue(dirty)).toBe('alert("xss")Keanu Reeves');
		});

		it('deve remover caracteres angulares avulsos', () => {
			const dirty = '<<<Pista Segura>>>';
			expect(sanitizeClue(dirty)).toBe('Pista Segura');
		});

		it('deve truncar dicas com mais de 60 caracteres', () => {
			const longText =
				'Esta é uma dica deliberadamente muito longa que ultrapassa o limite permitido de sessenta caracteres';
			const sanitized = sanitizeClue(longText);
			expect(sanitized.length).toBeLessThanOrEqual(60);
			expect(sanitized).toBe(longText.slice(0, 60));
		});

		it('deve normalizar quebras de linha e espaços excessivos', () => {
			const text = 'Pista   com\nmuitos \t espaços';
			expect(sanitizeClue(text)).toBe('Pista com muitos espaços');
		});

		it('deve retornar string vazia para tipos inválidos', () => {
			expect(sanitizeClue(null)).toBe('');
			expect(sanitizeClue(undefined)).toBe('');
			expect(sanitizeClue(123)).toBe('');
		});
	});

	describe('sanitizeNickname', () => {
		it('deve truncar apelidos com mais de 20 caracteres', () => {
			const longNick = 'JogadorSuperUltraMegaLongoDemais';
			const sanitized = sanitizeNickname(longNick);
			expect(sanitized.length).toBeLessThanOrEqual(20);
			expect(sanitized).toBe('JogadorSuperUltraMeg');
		});

		it('deve remover tags HTML do apelido', () => {
			const dirty = '<b>Hacker</b>';
			expect(sanitizeNickname(dirty)).toBe('Hacker');
		});

		it('deve adotar "Jogador" como fallback se vazio ou inválido', () => {
			expect(sanitizeNickname('')).toBe('Jogador');
			expect(sanitizeNickname('    ')).toBe('Jogador');
			expect(sanitizeNickname(null)).toBe('Jogador');
		});
	});

	describe('clampGuess', () => {
		it('deve limitar valores abaixo de zero para 0', () => {
			expect(clampGuess(-15)).toBe(0);
		});

		it('deve limitar valores acima de 100 para 100', () => {
			expect(clampGuess(150)).toBe(100);
		});

		it('deve arredondar valores de ponto flutuante', () => {
			expect(clampGuess(45.7)).toBe(46);
			expect(clampGuess(45.2)).toBe(45);
		});

		it('deve converter strings numéricas', () => {
			expect(clampGuess('72')).toBe(72);
		});

		it('deve retornar 50 para valores não numéricos', () => {
			expect(clampGuess('invalido')).toBe(50);
			expect(clampGuess(undefined)).toBe(50);
		});
	});

	describe('sanitizeRoomCode', () => {
		it('deve converter para caixa alta e remover caracteres especiais', () => {
			expect(sanitizeRoomCode('sala-1234!')).toBe('SALA1234');
			expect(sanitizeRoomCode('jogo@#$')).toBe('JOGO');
		});

		it('deve limitar a 16 caracteres', () => {
			expect(sanitizeRoomCode('codigo-extremamente-longo-para-sala')).toBe('CODIGOEXTREMAMEN');
		});
	});
});
