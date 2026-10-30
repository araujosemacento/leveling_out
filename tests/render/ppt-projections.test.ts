import { describe, expect, it } from 'bun:test';
import { getPptProjection } from '../../src/lib/engine/render/projections';
import { createInitialGameState } from '../../src/lib/engine/update/state-machine';
import type { GameState } from '../../src/lib/engine/types';

describe('Projeções de Pedra, Papel e Tesoura (getPptProjection)', () => {
	function criarEstadoBase(): GameState {
		const state = createInitialGameState('SALA_TESTE');
		state.fase = 'PPT_DISPUTA';
		state.equipes.A.membros = [
			{ id: 'p1', nome: 'Ana', equipe: 'A', isOnline: true },
			{ id: 'p2', nome: 'Beto', equipe: 'A', isOnline: true }
		];
		state.equipes.B.membros = [
			{ id: 'p3', nome: 'Carla', equipe: 'B', isOnline: true },
			{ id: 'p4', nome: 'Davi', equipe: 'B', isOnline: true }
		];
		state.ppt = {
			estado: 'ESCOLHA',
			representanteA: 'p1',
			representanteB: 'p3',
			enviouA: false,
			enviouB: false
		};
		return state;
	}

	it('deve identificar o representante da equipe Pato com rótulos corretos', () => {
		const state = criarEstadoBase();
		const proj = getPptProjection(state, 'p1');

		expect(proj.papelPpt).toBe('REPRESENTANTE');
		expect(proj.souRepresentante).toBe(true);
		expect(proj.minhaEquipe).toBe('A');
		expect(proj.equipeAdversaria).toBe('B');
		expect(proj.rotuloLocal).toBe('Você');
		expect(proj.rotuloAdversario).toBe('Oponente');
		expect(proj.nomeRepresentanteLocal).toBe('Ana');
		expect(proj.nomeRepresentanteAdversario).toBe('Carla');
		expect(proj.podeEscolherLance).toBe(true);
		expect(proj.mensagemStatus).toBe('Faça sua escolha para disputar a iniciativa');
	});

	it('deve identificar o espectador da equipe Pato aguardando representante da própria equipe', () => {
		const state = criarEstadoBase();
		const proj = getPptProjection(state, 'p2');

		expect(proj.papelPpt).toBe('ESPECTADOR');
		expect(proj.souRepresentante).toBe(false);
		expect(proj.rotuloLocal).toBe('Sua equipe');
		expect(proj.rotuloAdversario).toBe('Equipe adversária');
		expect(proj.podeEscolherLance).toBe(false);
		expect(proj.mensagemStatus).toBe('Aguardando jogada do representante da sua equipe...');
	});

	it('deve exibir o lance escolhido da própria equipe para o espectador sem redundância', () => {
		const state = criarEstadoBase();
		state.ppt = {
			...state.ppt,
			enviouA: true,
			meuLance: 'pedra'
		};

		const proj = getPptProjection(state, 'p2');
		expect(proj.minhaEquipeEnviou).toBe(true);
		expect(proj.mensagemStatus).toBe('Sua equipe escolheu pedra');
	});

	it('deve informar ao representante que o oponente realizou o lance', () => {
		const state = criarEstadoBase();
		state.ppt = {
			...state.ppt,
			enviouA: true,
			enviouB: true,
			meuLance: 'tesoura'
		};

		const proj = getPptProjection(state, 'p1');
		expect(proj.podeEscolherLance).toBe(false);
		expect(proj.mensagemStatus).toBe('O oponente realizou um lance...');
	});

	it('deve informar ao representante indeciso quando o oponente ja realizou o lance', () => {
		const state = criarEstadoBase();
		state.ppt = {
			...state.ppt,
			enviouA: false,
			enviouB: true
		};

		const proj = getPptProjection(state, 'p1');
		expect(proj.podeEscolherLance).toBe(true);
		expect(proj.adversarioEnviou).toBe(true);
		expect(proj.mensagemStatus).toBe('O oponente realizou um lance...');
	});

	it('deve projetar mensagem e lances da vitória na fase de resultado', () => {
		const state = criarEstadoBase();
		state.ppt = {
			estado: 'RESULTADO',
			representanteA: 'p1',
			representanteB: 'p3',
			enviouA: true,
			enviouB: true,
			resultado: 'VITORIA_A',
			lanceA: 'pedra',
			lanceB: 'tesoura'
		};

		const projA = getPptProjection(state, 'p1');
		expect(projA.subfase).toBe('RESULTADO');
		expect(projA.vitoriaLocal).toBe(true);
		expect(projA.lanceLocalRevelado).toBe('pedra');
		expect(projA.lanceAdversarioRevelado).toBe('tesoura');
		expect(projA.mensagemStatus).toBe('Sua equipe começa!');

		const projB = getPptProjection(state, 'p3');
		expect(projB.vitoriaLocal).toBe(false);
		expect(projB.lanceLocalRevelado).toBe('tesoura');
		expect(projB.lanceAdversarioRevelado).toBe('pedra');
		expect(projB.mensagemStatus).toBe('Equipe Pato começa a primeira rodada.');
	});

	it('deve projetar empate na fase de resultado', () => {
		const state = criarEstadoBase();
		state.ppt = {
			estado: 'RESULTADO',
			representanteA: 'p1',
			representanteB: 'p3',
			enviouA: true,
			enviouB: true,
			resultado: 'EMPATE',
			lanceA: 'pedra',
			lanceB: 'pedra'
		};

		const proj = getPptProjection(state, 'p1');
		expect(proj.vitoriaLocal).toBe(null);
		expect(proj.mensagemStatus).toBe('Empate! Nova disputa...');
	});
});
