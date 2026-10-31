import { describe, expect, test } from 'bun:test';
import { getSpectrumPickerProjection } from '../../src/lib/engine/render/projections';
import { createInitialGameState } from '../../src/lib/engine/update/state-machine';
import type { GameState, SpectrumCard } from '../../src/lib/engine/types';

describe('Projeções de Escolha de Espectro (getSpectrumPickerProjection)', () => {
	const cartasMock: SpectrumCard[] = [
		{
			id: 'c1',
			left: 'Insosso',
			right: 'Salgado',
			categoria: 'Sensoriais'
		},
		{
			id: 'c2',
			left: 'Sidequest',
			right: 'Boss Battle',
			categoria: 'Cultura Pop'
		}
	];

	function criarEstadoBase(): GameState {
		const base = createInitialGameState('test-room');
		return {
			...base,
			fase: 'ESCOLHA_CARTA',
			equipeAtiva: 'A',
			equipes: {
				A: {
					id: 'A',
					nome: 'Pato',
					pontos: 0,
					membros: [
						{ id: 'p1', nome: 'Alice', equipe: 'A', isOnline: true },
						{ id: 'p2', nome: 'Bob', equipe: 'A', isOnline: true }
					]
				},
				B: {
					id: 'B',
					nome: 'Ganso',
					pontos: 0,
					membros: [
						{ id: 'p3', nome: 'Carol', equipe: 'B', isOnline: true },
						{ id: 'p4', nome: 'Dave', equipe: 'B', isOnline: true }
					]
				}
			},
			cartasEspectroOpcoes: cartasMock,
			rodadaAtual: {
				...base.rodadaAtual,
				numero: 1,
				equipeAtiva: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				liderRodadaId: 'p1',
				cartaSelecionadaId: null,
				votoParceiroCartaId: null,
				prazoEspectro: new Date(Date.now() + 30000).toISOString()
			}
		};
	}

	test('deve projetar o Líder da Equipe Pato com permissão para confirmar', () => {
		const state = criarEstadoBase();
		const proj = getSpectrumPickerProjection(state, 'p1');

		expect(proj.souLider).toBe(true);
		expect(proj.souParceiroVotante).toBe(false);
		expect(proj.souEspectador).toBe(false);
		expect(proj.equipeAtivaNome).toBe('Pato');
		expect(proj.cartas.length).toBe(2);
		expect(proj.podeConfirmar).toBe(true);
		expect(proj.statusMensagem).toContain('Você é o Líder da rodada');
	});

	test('deve projetar o Parceiro da Equipe Ativa como votante', () => {
		const state = criarEstadoBase();
		const proj = getSpectrumPickerProjection(state, 'p2');

		expect(proj.souLider).toBe(false);
		expect(proj.souParceiroVotante).toBe(true);
		expect(proj.souEspectador).toBe(false);
		expect(proj.podeConfirmar).toBe(false);
		expect(proj.statusMensagem).toContain('Alice está escolhendo a carta');
	});

	test('deve projetar os adversários da Equipe B e espectadores como observadores em tempo real', () => {
		const state = criarEstadoBase();
		const projP3 = getSpectrumPickerProjection(state, 'p3');

		expect(projP3.souLider).toBe(false);
		expect(projP3.souParceiroVotante).toBe(false);
		expect(projP3.souEspectador).toBe(true);
		expect(projP3.cartas.length).toBe(2);
		expect(projP3.statusMensagem).toContain(
			'Alice (Equipe Pato) está escolhendo a carta da rodada'
		);
	});

	test('deve posicionar o ícone de mão levantada na carta votada pelo parceiro', () => {
		const state = criarEstadoBase();
		state.rodadaAtual.votoParceiroCartaId = 'c1';

		const proj = getSpectrumPickerProjection(state, 'p1');
		expect(proj.maoCartaEsquerdaAtiva).toBe(true);
		expect(proj.maoCartaDireitaAtiva).toBe(false);

		state.rodadaAtual.votoParceiroCartaId = 'c2';
		const proj2 = getSpectrumPickerProjection(state, 'p1');
		expect(proj2.maoCartaEsquerdaAtiva).toBe(false);
		expect(proj2.maoCartaDireitaAtiva).toBe(true);
	});

	test('deve calcular os segundos restantes do prazo de 30s', () => {
		const state = criarEstadoBase();
		const proj = getSpectrumPickerProjection(state, 'p1');
		expect(proj.prazoSegundosRestantes).toBeGreaterThan(0);
		expect(proj.prazoSegundosRestantes).toBeLessThanOrEqual(30);
	});
});
