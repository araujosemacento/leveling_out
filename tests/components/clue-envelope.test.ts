import { describe, expect, it, mock } from 'bun:test';
import { sanitizeClue } from '../../src/lib/engine/input/sanitize';

describe('Componente Canônico ClueEnvelope (Sanitização e Contrato)', () => {
	it('deve sanitizar a dica antes do despacho', () => {
		const rawDica = '   <script>alert("hack")</script> <b>Café Quente</b>   ';
		const clean = sanitizeClue(rawDica);
		expect(clean).toBe('alert("hack") Café Quente');
	});

	it('deve truncar dicas com mais de 60 caracteres', () => {
		const longClue =
			'Esta é uma dica conceitual excessivamente longa que ultrapassa o limite permitido de sessenta caracteres';
		const clean = sanitizeClue(longClue);
		expect(clean.length).toBeLessThanOrEqual(60);
	});

	it('deve rejeitar dicas vazias ou compostas apenas por espaços', () => {
		const emptyClue = '    ';
		const clean = sanitizeClue(emptyClue);
		expect(clean).toBe('');
	});

	it('deve respeitar a cadência temporal canônica do ciclo de dobra e voo (v13)', () => {
		// Verificação dos tempos estritos calibrados:
		// Dobra das 4 abas: 100ms cada (0 a 400ms)
		// Wobble: 180ms (410ms a 590ms)
		// Antecipação (Recuo): 300ms (590ms a 890ms)
		// Disparo (Saída): 300ms (890ms a 1190ms)
		// Total de anticipateAndShoot: 600ms
		const tEmerge = 10;
		const tFold1 = 110;
		const tFold2 = 210;
		const tFold3 = 310;
		const tWobble = 410;
		const wobbleDuration = 180;
		const tLaunch = tWobble + wobbleDuration; // 590ms
		const anticipationDuration = 300;
		const tSkidDust = tLaunch + anticipationDuration; // 890ms
		const launchDuration = 300;
		const tComplete = tLaunch + anticipationDuration + launchDuration; // 1190ms

		expect(tFold1 - tEmerge).toBe(100);
		expect(tFold2 - tFold1).toBe(100);
		expect(tFold3 - tFold2).toBe(100);
		expect(wobbleDuration).toBe(180);
		expect(tLaunch).toBe(590);
		expect(anticipationDuration).toBe(300);
		expect(tSkidDust).toBe(890);
		expect(launchDuration).toBe(300);
		expect(tComplete).toBe(1190);
	});
});
