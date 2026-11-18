import { describe, expect, it } from 'bun:test';
import {
	clampGuess,
	isValidNickname,
	sanitizeClue,
	sanitizeNickname,
	sanitizeRoomCode,
	validateNickname
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

	describe('validateNickname e isValidNickname (Regras Estritas de Apelido)', () => {
		it('deve rejeitar apelidos vazios ou compostos apenas por espaços com feedback visual de nickname inválido', () => {
			const emptyRes = validateNickname('');
			expect(emptyRes.valido).toBe(false);
			expect(emptyRes.erro).toContain('Nickname inválido');
			expect(isValidNickname('')).toBe(false);

			const spacesRes = validateNickname('     ');
			expect(spacesRes.valido).toBe(false);
			expect(spacesRes.erro).toContain('Nickname inválido');
			expect(isValidNickname('     ')).toBe(false);
		});

		it('deve rejeitar apelidos com emojis conforme o Mandamento 4 do AGENTS.md', () => {
			const emojiRes1 = validateNickname('🦆 Pato');
			expect(emojiRes1.valido).toBe(false);
			expect(emojiRes1.erro).toContain('Nickname inválido: emojis não são permitidos');
			expect(isValidNickname('🦆 Pato')).toBe(false);

			const emojiRes2 = validateNickname('Ganso 😀');
			expect(emojiRes2.valido).toBe(false);
			expect(emojiRes2.erro).toContain('Nickname inválido: emojis não são permitidos');
			expect(isValidNickname('Ganso 😀')).toBe(false);
		});

		it('deve rejeitar tags HTML e caracteres angulares (< e >)', () => {
			const tagRes = validateNickname('<script>alert(1)</script>');
			expect(tagRes.valido).toBe(false);
			expect(tagRes.erro).toContain('Nickname inválido');
			expect(isValidNickname('<script>alert(1)</script>')).toBe(false);

			const angleRes = validateNickname('Keanu <3');
			expect(angleRes.valido).toBe(false);
			expect(angleRes.erro).toContain('Nickname inválido');
			expect(isValidNickname('Keanu <3')).toBe(false);
		});

		it('deve rejeitar apelidos que excedam 20 caracteres', () => {
			const longNick = 'JogadorSuperUltraMegaLongoDemais';
			const res = validateNickname(longNick);
			expect(res.valido).toBe(false);
			expect(res.erro).toContain('Nickname inválido: limite máximo de 20 caracteres');
			expect(isValidNickname(longNick)).toBe(false);
		});

		it('deve rejeitar valores não-string', () => {
			expect(validateNickname(null).valido).toBe(false);
			expect(validateNickname(undefined).valido).toBe(false);
			expect(validateNickname(12345).valido).toBe(false);
			expect(isValidNickname(null)).toBe(false);
		});

		it('deve aceitar apelidos válidos e normalizar espaços nas extremidades', () => {
			const res1 = validateNickname('  Pato Loko  ');
			expect(res1.valido).toBe(true);
			expect(res1.erro).toBeNull();
			expect(res1.sanitizado).toBe('Pato Loko');
			expect(isValidNickname('  Pato Loko  ')).toBe(true);

			const res2 = validateNickname('Ganso-01');
			expect(res2.valido).toBe(true);
			expect(res2.erro).toBeNull();
			expect(res2.sanitizado).toBe('Ganso-01');
			expect(isValidNickname('Ganso-01')).toBe(true);

			const res3 = validateNickname('Álvaro_99');
			expect(res3.valido).toBe(true);
			expect(res3.erro).toBeNull();
			expect(res3.sanitizado).toBe('Álvaro_99');
			expect(isValidNickname('Álvaro_99')).toBe(true);
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
