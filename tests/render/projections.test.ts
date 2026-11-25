import { describe, expect, it } from 'bun:test';
import {
	computeMeniscusPeriodSeconds,
	getPlayerRoleProjection,
	getRevealProjection,
	getRoundSpectrumProjection,
	getScoreBoardProjection,
	getTubeProjection,
	getVictoryProjection
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

	describe('computeMeniscusPeriodSeconds (Modulador de Tensão)', () => {
		it('deve acelerar de 5s em 0x0 até 0.25s em 10x8 com valor intermediário em 5x3', () => {
			expect(computeMeniscusPeriodSeconds(0, 0, 10)).toBe(5);
			const mid = computeMeniscusPeriodSeconds(5, 3, 10);
			expect(mid).toBeGreaterThan(0.25);
			expect(mid).toBeLessThan(5);
			expect(computeMeniscusPeriodSeconds(10, 8, 10)).toBe(0.25);

			const state = createInitialGameState('SALA1');
			state.equipes.A.pontos = 10;
			state.equipes.B.pontos = 8;
			expect(getTubeProjection(state, null).periodoMeniscoSegundos).toBe(0.25);
		});
	});

	describe('getRevealProjection', () => {
		it('deve projetar dados da revelação com rótulos limpos sem exclamações ou travessões', () => {
			const state = createInitialGameState('SALA1');
			state.fase = 'RODADA_REVELACAO';
			state.equipes.A.pontos = 4;
			state.equipes.B.pontos = 2;
			state.equipes.A.membros = [
				{ id: 'p1', nome: 'Alice', equipe: 'A', isOnline: true },
				{ id: 'p2', nome: 'Bruno', equipe: 'A', isOnline: true }
			];
			state.rodadaAtual = {
				numero: 2,
				equipeAtiva: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				carta: { id: 'c2', left: 'Antigo', right: 'Moderno' },
				metaOculta: 74,
				dica: 'Relógio de Sol',
				palpite: 72,
				transicaoEm: '2026-11-25T05:10:00Z',
				resultado: { points: 4, diff: 2, tier: 'NA_MOSCA', label: 'Na Mosca!' },
				revelada: true
			};

			const rev = getRevealProjection(state, 'p2');
			expect(rev.numeroRodada).toBe(2);
			expect(rev.equipeAtivaNome).toBe('Pato');
			expect(rev.codificadorNome).toBe('Alice');
			expect(rev.palpiteiroNome).toBe('Bruno');
			expect(rev.poloEsquerdo).toBe('Antigo');
			expect(rev.poloDireito).toBe('Moderno');
			expect(rev.dica).toBe('Relógio de Sol');
			expect(rev.metaReal).toBe(74);
			expect(rev.palpite).toBe(72);
			expect(rev.diff).toBe(2);
			expect(rev.pontosGanhos).toBe(4);
			expect(rev.tier).toBe('NA_MOSCA');
			expect(rev.rotuloSintonia).toBe('Na Mosca');
			expect(rev.rotuloSintonia).not.toContain('!');
			expect(rev.placarA).toBe(4);
			expect(rev.placarB).toBe(2);
			expect(rev.transicaoEmIso).toBe('2026-11-25T05:10:00Z');
		});
	});

	describe('getVictoryProjection', () => {
		it('deve calcular métricas de sintonia a partir de resumoPartida', () => {
			const state = createInitialGameState('SALA1');
			state.fase = 'VITORIA';
			state.hostId = 'p1';
			state.vencedor = 'A';
			state.motivoFim = 'VITORIA';
			state.equipes.A.pontos = 10;
			state.equipes.B.pontos = 5;
			state.equipes.A.membros = [
				{ id: 'p1', nome: 'Alice', equipe: 'A', isOnline: true, isHost: true }
			];
			state.equipes.B.membros = [{ id: 'p3', nome: 'Carla', equipe: 'B', isOnline: true }];
			state.resumoPartida = [
				{
					numero: 1,
					equipe: 'A',
					codificadorId: 'p1',
					palpiteiroId: 'p2',
					espectroEsquerda: 'Frio',
					espectroDireita: 'Quente',
					metaOculta: 80,
					palpite: 78,
					dica: 'Café',
					pontos: 4,
					tier: 'NA_MOSCA',
					diff: 2,
					duracaoSegundos: 20
				},
				{
					numero: 2,
					equipe: 'B',
					codificadorId: 'p3',
					palpiteiroId: 'p4',
					espectroEsquerda: 'Lento',
					espectroDireita: 'Rápido',
					metaOculta: 50,
					palpite: 60,
					dica: 'Guepardo',
					pontos: 2,
					tier: 'PERTO',
					diff: 10,
					duracaoSegundos: 30
				}
			];

			const vicHost = getVictoryProjection(state, 'p1');
			expect(vicHost.vencedorEquipe).toBe('A');
			expect(vicHost.vencedorNome).toBe('Equipe Pato');
			expect(vicHost.minhaEquipeVenceu).toBe(true);
			expect(vicHost.motivoFim).toBe('VITORIA');
			expect(vicHost.totalRodadas).toBe(2);
			expect(vicHost.precisaoMedia).toBe(94); // média de (98, 90)
			expect(vicHost.melhorRodada?.numero).toBe(1);
			expect(vicHost.contagemNaMosca).toBe(1);
			expect(vicHost.isHost).toBe(true);
			expect(vicHost.podePedirRevanche).toBe(true);

			const vicOponente = getVictoryProjection(state, 'p3');
			expect(vicOponente.minhaEquipeVenceu).toBe(false);
			expect(vicOponente.isHost).toBe(false);
			expect(vicOponente.podePedirRevanche).toBe(true);
		});

		it('deve usar fallback de historicoRodadas quando resumoPartida estiver vazio', () => {
			const state = createInitialGameState('SALA1');
			state.fase = 'VITORIA';
			state.vencedor = 'B';
			state.equipes.A.pontos = 4;
			state.equipes.B.pontos = 10;
			state.resumoPartida = [];
			state.historicoRodadas = [
				{
					numero: 1,
					equipeAtiva: 'B',
					codificadorId: 'p3',
					palpiteiroId: 'p4',
					carta: { id: 'c1', left: 'Seco', right: 'Molhado' },
					metaOculta: 60,
					dica: 'Chuva',
					palpite: 60,
					resultado: { points: 4, diff: 0, tier: 'NA_MOSCA', label: 'Na Mosca!' },
					revelada: true
				}
			];

			const vic = getVictoryProjection(state, null);
			expect(vic.vencedorEquipe).toBe('B');
			expect(vic.totalRodadas).toBe(1);
			expect(vic.precisaoMedia).toBe(100);
			expect(vic.melhorRodada?.diff).toBe(0);
			expect(vic.contagemNaMosca).toBe(1);
			expect(vic.podePedirRevanche).toBe(false);
		});
	});
});
