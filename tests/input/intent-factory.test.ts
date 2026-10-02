import { describe, expect, it } from 'bun:test';
import {
	createRematchAction,
	createSelectSpectrumAction,
	createSetPlayerAction,
	createSubmitClueAction,
	createSubmitGuessAction,
	createSubmitPptAction,
	createSwitchTeamAction,
	createUpdateSliderAction
} from '../../src/lib/engine/input/intent-factory';

describe('Fábrica de Intenções (input/intent-factory.ts)', () => {
	it('createSetPlayerAction deve sanitizar apelido antes de criar ação', () => {
		const action = createSetPlayerAction('p1', '<script>alert(1)</script>Ana', 'A');
		expect(action.type).toBe('SET_PLAYER');
		if (action.type === 'SET_PLAYER') {
			expect(action.payload.nome).toBe('alert(1)Ana');
			expect(action.payload.id).toBe('p1');
			expect(action.payload.equipe).toBe('A');
		}
	});

	it('createSwitchTeamAction deve criar ação de troca de equipe', () => {
		const action = createSwitchTeamAction('p1', 'B');
		expect(action.type).toBe('SELECT_TEAM');
		if (action.type === 'SELECT_TEAM') {
			expect(action.payload.playerId).toBe('p1');
			expect(action.payload.equipe).toBe('B');
		}
	});

	it('createSubmitPptAction deve criar ação de lance de PPT', () => {
		const action = createSubmitPptAction('tesoura');
		expect(action.type).toBe('SUBMIT_PPT_INTENT');
		if (action.type === 'SUBMIT_PPT_INTENT') {
			expect(action.payload.move).toBe('tesoura');
		}
	});

	it('createSubmitClueAction deve sanitizar a dica enviada', () => {
		const action = createSubmitClueAction('   <b>Dica Importante</b>   ');
		expect(action.type).toBe('SUBMIT_CLUE_INTENT');
		if (action.type === 'SUBMIT_CLUE_INTENT') {
			expect(action.payload.dica).toBe('Dica Importante');
		}
	});

	it('createUpdateSliderAction deve aplicar clamp no preview do slider', () => {
		const action = createUpdateSliderAction(85.6);
		expect(action.type).toBe('UPDATE_SLIDER_PREVIEW');
		if (action.type === 'UPDATE_SLIDER_PREVIEW') {
			expect(action.payload.palpite).toBe(86);
		}
	});

	it('createSubmitGuessAction deve aplicar clamp no palpite numérico', () => {
		const actionLow = createSubmitGuessAction(-20);
		const actionHigh = createSubmitGuessAction(150);
		const actionValid = createSubmitGuessAction('75');

		if (actionLow.type === 'SUBMIT_GUESS_INTENT') {
			expect(actionLow.payload.palpite).toBe(0);
		}
		if (actionHigh.type === 'SUBMIT_GUESS_INTENT') {
			expect(actionHigh.payload.palpite).toBe(100);
		}
		if (actionValid.type === 'SUBMIT_GUESS_INTENT') {
			expect(actionValid.payload.palpite).toBe(75);
		}
	});

	it('createSelectSpectrumAction deve associar a carta bipolar', () => {
		const action = createSelectSpectrumAction({
			id: 'c1',
			left: 'Quente',
			right: 'Frio'
		});
		expect(action.type).toBe('SELECT_SPECTRUM_INTENT');
		if (action.type === 'SELECT_SPECTRUM_INTENT') {
			expect(action.payload.carta.left).toBe('Quente');
			expect(action.payload.carta.right).toBe('Frio');
		}
	});

	it('createRematchAction deve gerar ação de revanche', () => {
		const action = createRematchAction();
		expect(action.type).toBe('REMATCH_INTENT');
	});
});
