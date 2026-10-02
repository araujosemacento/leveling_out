/**
 * Sanitização e Validação Defensiva (Camada de Input)
 * Princípio Zero Trust: O front-end higieniza todos os dados antes de normalizar
 * em GameActions ou emitir intenções para o PocketBase.
 */

/**
 * Sanitiza dicas conceituais enviadas pelo Codificador.
 * - Limite estrito de 60 caracteres.
 * - Remove tags HTML maliciosas e caracteres angulares avulsos.
 * - Remove caracteres de controle e normaliza espaços em branco consecutivos.
 */
export function sanitizeClue(rawClue: unknown): string {
	if (typeof rawClue !== 'string') {
		return '';
	}

	// 1. Remove tags HTML conhecidas
	let clean = rawClue.replace(
		/<\/?\b(script|style|iframe|object|embed|svg|applet|meta|link|b|i|u|strong|em|p|div|span|h[1-6]|a|img)\b[^>]*>/gi,
		''
	);

	// 2. Remove quaisquer outros caracteres angulares avulsos
	clean = clean.replace(/[<>]/g, '');

	// 3. Remove quebras de linha e caracteres de controle
	clean = clean.replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ');

	// 4. Normaliza múltiplos espaços consecutivos
	clean = clean.replace(/\s+/g, ' ').trim();

	// 5. Limita rigorosamente ao comprimento máximo de 60 caracteres
	if (clean.length > 60) {
		clean = clean.slice(0, 60).trim();
	}

	return clean;
}

/**
 * Sanitiza apelidos de jogadores.
 * - Limite de 20 caracteres.
 * - Remove tags HTML e caracteres angulares.
 * - Fallback automático para "Jogador" caso vazio ou inválido.
 */
export function sanitizeNickname(rawNickname: unknown): string {
	if (typeof rawNickname !== 'string') {
		return 'Jogador';
	}

	let clean = rawNickname.replace(/<[^>]*>/g, '');
	clean = clean.replace(/[<>]/g, '');
	clean = clean.replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ');
	clean = clean.replace(/\s+/g, ' ').trim();

	if (clean.length === 0) {
		return 'Jogador';
	}

	if (clean.length > 20) {
		clean = clean.slice(0, 20).trim();
	}

	return clean;
}

/**
 * Valida e restringe o palpite do slider estritamente ao intervalo [0, 100].
 * Garante número inteiro sem NaN ou Infinity.
 */
export function clampGuess(rawGuess: unknown): number {
	const parsed = typeof rawGuess === 'number' ? rawGuess : Number(rawGuess);

	if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
		return 50;
	}

	const rounded = Math.round(parsed);
	return Math.max(0, Math.min(100, rounded));
}

/**
 * Sanitiza códigos de sala gerados ou digitados manualmente.
 * - Apenas caracteres alfanuméricos em caixa alta.
 * - Limite máximo de 16 caracteres.
 */
export function sanitizeRoomCode(rawCode: unknown): string {
	if (typeof rawCode !== 'string') {
		return '';
	}

	return rawCode
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 16);
}
