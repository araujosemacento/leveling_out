import { describe, expect, it } from 'bun:test';
import {
	getPlayerRoleProjection,
	getRoundSpectrumProjection,
	getScoreBoardProjection,
	getTubeProjection
} from '../../src/lib/engine/render/projections';
import { createInitialGameState } from '../../src/lib/engine/update/state-machine';

describe('Projeções Puras de Renderização (render/projections.ts)', () => {
	describe('getTubeProjection (Blindagem de Sigilo & Zero Trust)', () => {
		it('na fase de DICA, somente o Codificador deve ver a meta secreta', () => {
			const state = createInitialGameState('SALA1');
			state.fase = 'RODADA_DICA';
			state.rodadaAtual.codificadorId = 'cod-1';
			state.rodadaAtual.palpiteiroId = 'palp-1';
			state.rodadaAtual.metaOculta = 75;

			// Visão do Codificador
			const projCodificador = getTubeProjection(state, 'cod-1');
			expect(projCodificador.isMetaOculta).toBe(false);
			expect(projCodificador.metaVisivel).toBe(75);
			expect(projCodificador.nivelLiquido).toBe(75);
			expect(projCodificador.mostrarMenisco).toBe(true);
			expect(projCodificador.mostrarBorbulhas).toBe(true);
			expect(projCodificador.podeInteragir).toBe(false);

			// Visão do Palpiteiro (ZERO TRUST: nunca deve vazar a meta!)
			const projPalpiteiro = getTubeProjection(state, 'palp-1');
			expect(projPalpiteiro.isMetaOculta).toBe(true);
			expect(projPalpiteiro.metaVisivel).toBeNull();
			expect(projPalpiteiro.nivelLiquido).toBe(0);
			expect(projPalpiteiro.mostrarMenisco).toBe(false);
			expect(projPalpiteiro.mostrarBorbulhas).toBe(false);
			expect(projPalpiteiro.podeInteragir).toBe(false);
		});

		it('na fase de PALPITE, o Palpiteiro pode interagir e a meta permanece oculta', () => {
			const state = createInitialGameState('SALA1');
			state.fase = 'RODADA_PALPITE';
			state.rodadaAtual.codificadorId = 'cod-1';
			state.rodadaAtual.palpiteiroId = 'palp-1';
			state.rodadaAtual.metaOculta = 80;
			state.rodadaAtual.palpite = 62;

			const projPalpiteiro = getTubeProjection(state, 'palp-1');
			expect(projPalpiteiro.isMetaOculta).toBe(true);
			expect(projPalpiteiro.metaVisivel).toBeNull(); // Segredo preservado
			expect(projPalpiteiro.nivelLiquido).toBe(62);
			expect(projPalpiteiro.marcadorPalpite).toBe(62);
			expect(projPalpiteiro.podeInteragir).toBe(true); // Pode arrastar

			const projEspectador = getTubeProjection(state, 'outro-id');
			expect(projEspectador.podeInteragir).toBe(false); // Outros não arrastam
			expect(projEspectador.metaVisivel).toBeNull();
		});

		it('na fase de REVELAÇÃO, a meta real e o palpite são revelados a todos', () => {
			const state = createInitialGameState('SALA1');
			state.fase = 'RODADA_REVELACAO';
			state.rodadaAtual.revelada = true;
			state.rodadaAtual.metaOculta = 85;
			state.rodadaAtual.palpite = 83;
			state.rodadaAtual.resultado = {
				points: 4,
				diff: 2,
				tier: 'NA_MOSCA',
				label: 'Na Mosca!'
			};

			const proj = getTubeProjection(state, 'qualquer-jogador');
			expect(proj.isMetaOculta).toBe(false);
			expect(proj.metaVisivel).toBe(85);
			expect(proj.nivelLiquido).toBe(85);
			expect(proj.marcadorPalpite).toBe(83);
			expect(proj.mostrarMenisco).toBe(true);
			expect(proj.mostrarBorbulhas).toBe(true);
			expect(proj.podeInteragir).toBe(false);
			expect(proj.statusTexto).toContain('Na Mosca!');
		});
	});

	describe('getPlayerRoleProjection (Permissões de Ação)', () => {
		it('deve autorizar digitação de dica apenas para o codificador no seu turno', () => {
			const state = createInitialGameState('SALA1');
			state.fase = 'RODADA_DICA';
			state.equipeAtiva = 'A';
			state.equipes.A.membros = [{ id: 'p1', nome: 'Melo', equipe: 'A', isOnline: true }];
			state.rodadaAtual.codificadorId = 'p1';

			const proj = getPlayerRoleProjection(state, 'p1');
			expect(proj.meuPapel).toBe('CODIFICADOR');
			expect(proj.isMinhaEquipeAtiva).toBe(true);
			expect(proj.podeDigitarDica).toBe(true);
			expect(proj.podeArrastarSlider).toBe(false);
		});

		it('deve autorizar arrasto do slider apenas para o palpiteiro no seu turno', () => {
			const state = createInitialGameState('SALA1');
			state.fase = 'RODADA_PALPITE';
			state.equipeAtiva = 'A';
			state.equipes.A.membros = [{ id: 'p2', nome: 'Bia', equipe: 'A', isOnline: true }];
			state.rodadaAtual.palpiteiroId = 'p2';

			const proj = getPlayerRoleProjection(state, 'p2');
			expect(proj.meuPapel).toBe('PALPITEIRO');
			expect(proj.isMinhaEquipeAtiva).toBe(true);
			expect(proj.podeArrastarSlider).toBe(true);
			expect(proj.podeDigitarDica).toBe(false);
		});
	});

	describe('getScoreBoardProjection', () => {
		it('deve calcular porcentagens e equipe líder corretamente', () => {
			const state = createInitialGameState('SALA1');
			state.metaPontuacao = 10;
			state.equipes.A.pontos = 7;
			state.equipes.B.pontos = 4;

			const scoreProj = getScoreBoardProjection(state);
			expect(scoreProj.placarA).toBe(7);
			expect(scoreProj.placarB).toBe(4);
			expect(scoreProj.progressoA).toBe(70);
			expect(scoreProj.progressoB).toBe(40);
			expect(scoreProj.equipeLider).toBe('A');
			expect(scoreProj.diferencaPontos).toBe(3);
			expect(scoreProj.statusPlacar).toContain('Equipe A lidera por 3 pontos');
		});
	});

	describe('getRoundSpectrumProjection', () => {
		it('deve projetar polos do espectro e nome da equipe da vez', () => {
			const state = createInitialGameState('SALA1');
			state.rodadaAtual.carta = { id: 'c1', left: 'Famoso', right: 'Anônimo' };
			state.rodadaAtual.dica = 'Neymar';
			state.rodadaAtual.numero = 3;
			state.rodadaAtual.equipeAtiva = 'B';

			const spectrumProj = getRoundSpectrumProjection(state);
			expect(spectrumProj.hasCarta).toBe(true);
			expect(spectrumProj.poloEsquerdo).toBe('Famoso');
			expect(spectrumProj.poloDireito).toBe('Anônimo');
			expect(spectrumProj.dica).toBe('Neymar');
			expect(spectrumProj.numeroRodada).toBe(3);
			expect(spectrumProj.equipeAtiva).toBe('B');
		});
	});
});
