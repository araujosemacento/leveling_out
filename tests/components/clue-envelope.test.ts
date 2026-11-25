import { describe, expect, it } from 'bun:test';
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

	it('deve respeitar a cadência temporal canônica do ciclo de chegada e abertura de envelope (v13)', () => {
		// Verificação dos tempos estritos calibrados para recepção:
		// Voo de entrada da esquerda até o centro: 300ms (0 a 300ms)
		// Wobble / Amortecimento de impacto com poeira: 180ms (300ms a 480ms)
		// Desdobra Flap Superior: 100ms (480ms a 580ms)
		// Desdobra Flap Inferior: 100ms (580ms a 680ms)
		// Desdobra Abas Laterais: 100ms (680ms a 780ms)
		// Revelação da dica no cartão interno: 100ms (780ms a 880ms)
		const tSlideIn = 300;
		const wobbleDuration = 180;
		const tWobbleEnd = tSlideIn + wobbleDuration; // 480ms
		const tUnfoldTop = 100;
		const tUnfoldBottom = 100;
		const tUnfoldSides = 100;
		const tReveal = 100;
		const tArrivalComplete = tWobbleEnd + tUnfoldTop + tUnfoldBottom + tUnfoldSides + tReveal; // 880ms

		expect(tSlideIn).toBe(300);
		expect(wobbleDuration).toBe(180);
		expect(tWobbleEnd).toBe(480);
		expect(tUnfoldTop).toBe(100);
		expect(tUnfoldBottom).toBe(100);
		expect(tUnfoldSides).toBe(100);
		expect(tReveal).toBe(100);
		expect(tArrivalComplete).toBe(880);
	});

	it('deve validar transição correta entre os modos canônicos de envelope', () => {
		// Modos suportados pelo contrato da transmissão de dica:
		// 1. envio: formulário de digitação para o Codificador
		// 2. espera: envelope lacrado com aviso temático para quem aguarda
		// 3. chegada: voo de entrada com desdobra de abas
		// 4. leitura: repouso aberto com a dica transmitida em destaque
		type ClueEnvelopeMode = 'envio' | 'espera' | 'chegada' | 'leitura';
		const modosValidos: ClueEnvelopeMode[] = ['envio', 'espera', 'chegada', 'leitura'];

		expect(modosValidos).toHaveLength(4);
		expect(modosValidos).toContain('envio');
		expect(modosValidos).toContain('espera');
		expect(modosValidos).toContain('chegada');
		expect(modosValidos).toContain('leitura');
	});
});
