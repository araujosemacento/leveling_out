import { describe, expect, it } from 'bun:test';
import { SliderDragController } from '../../src/lib/engine/input/slider-controller';

describe('SliderDragController (engine/input/slider-controller.ts)', () => {
	it('deve inicializar com valor percentual clamped entre 0 e 100', () => {
		const controllerDefault = new SliderDragController();
		expect(controllerDefault.getPercent()).toBe(50);

		const controllerClampedHigh = new SliderDragController({ initialPercent: 150 });
		expect(controllerClampedHigh.getPercent()).toBe(100);

		const controllerClampedLow = new SliderDragController({ initialPercent: -20 });
		expect(controllerClampedLow.getPercent()).toBe(0);
	});

	it('deve computar percentual relativo à caixa delimitadora', () => {
		const controller = new SliderDragController();
		const rect = { left: 100, width: 400 };

		// Meio exato: clientX = 300 => (300 - 100) / 400 = 0.5 (50%)
		expect(controller.computePercentFromClientX(300, rect)).toBe(50);

		// Início: clientX = 100 => 0%
		expect(controller.computePercentFromClientX(100, rect)).toBe(0);

		// Fim: clientX = 500 => 100%
		expect(controller.computePercentFromClientX(500, rect)).toBe(100);

		// Além do início (clamp em 0)
		expect(controller.computePercentFromClientX(50, rect)).toBe(0);

		// Além do fim (clamp em 100)
		expect(controller.computePercentFromClientX(600, rect)).toBe(100);
	});

	it('deve disparar onChange quando setPercent for chamado com novo valor', () => {
		let lastChanged: number | null = null;
		const controller = new SliderDragController({
			onChange: (val) => {
				lastChanged = val;
			}
		});

		controller.setPercent(75);
		expect(controller.getPercent()).toBe(75);
		expect(lastChanged as number | null).toBe(75);

		// Chamar com mesmo valor não deve redespachar
		lastChanged = null;
		controller.setPercent(75);
		expect(lastChanged).toBeNull();
	});

	it('deve responder a navegação por teclado (ArrowLeft, ArrowRight, Home, End)', () => {
		const controller = new SliderDragController({ initialPercent: 50 });

		// Seta direita (+1)
		const eventRight = {
			key: 'ArrowRight',
			shiftKey: false,
			preventDefault: () => {}
		} as KeyboardEvent;
		expect(controller.handleKeyDown(eventRight)).toBe(true);
		expect(controller.getPercent()).toBe(51);

		// Seta esquerda com Shift (-5)
		const eventShiftLeft = {
			key: 'ArrowLeft',
			shiftKey: true,
			preventDefault: () => {}
		} as KeyboardEvent;
		expect(controller.handleKeyDown(eventShiftLeft)).toBe(true);
		expect(controller.getPercent()).toBe(46);

		// Home (0)
		const eventHome = { key: 'Home', shiftKey: false, preventDefault: () => {} } as KeyboardEvent;
		expect(controller.handleKeyDown(eventHome)).toBe(true);
		expect(controller.getPercent()).toBe(0);

		// End (100)
		const eventEnd = { key: 'End', shiftKey: false, preventDefault: () => {} } as KeyboardEvent;
		expect(controller.handleKeyDown(eventEnd)).toBe(true);
		expect(controller.getPercent()).toBe(100);
	});

	it('deve ignorar eventos de teclado e ponteiro quando desabilitado', () => {
		const controller = new SliderDragController({ initialPercent: 50, disabled: true });

		const eventRight = {
			key: 'ArrowRight',
			shiftKey: false,
			preventDefault: () => {}
		} as KeyboardEvent;
		expect(controller.handleKeyDown(eventRight)).toBe(false);
		expect(controller.getPercent()).toBe(50);
	});
});
