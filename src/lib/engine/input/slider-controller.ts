import { clampGuess } from './sanitize';

export interface SliderDragControllerOptions {
	initialPercent?: number;
	disabled?: boolean;
	step?: number;
	enableHaptics?: boolean;
	onDragStart?: (percent: number) => void;
	onDragMove?: (percent: number) => void;
	onDragEnd?: (percent: number) => void;
	onChange?: (percent: number) => void;
}

export interface BoundingBox {
	left: number;
	width: number;
}

/**
 * Controlador composível desacoplado para física, arrasto e cálculo
 * de valor analógico percentual em escala contínua [0, 100].
 */
export class SliderDragController {
	private element: HTMLElement | null = null;
	private isDragging: boolean = false;
	private currentPercent: number = 50;
	private options: SliderDragControllerOptions;
	private boundOnPointerMove: (e: PointerEvent) => void;
	private boundOnPointerUp: (e: PointerEvent) => void;
	private boundOnPointerCancel: (e: PointerEvent) => void;

	constructor(options: SliderDragControllerOptions = {}) {
		this.options = options;
		this.currentPercent = clampGuess(options.initialPercent ?? 50);

		this.boundOnPointerMove = this.handlePointerMove.bind(this);
		this.boundOnPointerUp = this.handlePointerUp.bind(this);
		this.boundOnPointerCancel = this.handlePointerCancel.bind(this);
	}

	public attach(element: HTMLElement): void {
		this.element = element;
	}

	public detach(): void {
		this.cleanupPointerCapture();
		this.element = null;
	}

	public setPercent(percent: number): void {
		const clamped = clampGuess(percent);
		if (this.currentPercent !== clamped) {
			this.currentPercent = clamped;
			this.options.onChange?.(this.currentPercent);
		}
	}

	public getPercent(): number {
		return this.currentPercent;
	}

	public getIsDragging(): boolean {
		return this.isDragging;
	}

	public setDisabled(disabled: boolean): void {
		this.options.disabled = disabled;
		if (disabled && this.isDragging) {
			this.handlePointerCancel();
		}
	}

	public handlePointerDown(e: PointerEvent): void {
		if (this.options.disabled) return;
		if (e.button !== 0 && e.pointerType === 'mouse') return;

		this.isDragging = true;
		if (this.element && 'setPointerCapture' in this.element) {
			try {
				this.element.setPointerCapture(e.pointerId);
			} catch {
				// Silencia restrições de ponteiro
			}
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('pointermove', this.boundOnPointerMove);
			window.addEventListener('pointerup', this.boundOnPointerUp);
			window.addEventListener('pointercancel', this.boundOnPointerCancel);
		}

		this.updatePositionFromPointer(e.clientX);
		this.triggerHaptic();
		this.options.onDragStart?.(this.currentPercent);
	}

	public computePercentFromClientX(clientX: number, rect: BoundingBox): number {
		if (rect.width <= 0) return this.currentPercent;
		const relativeX = clientX - rect.left;
		const rawPercent = (relativeX / rect.width) * 100;
		return clampGuess(rawPercent);
	}

	public handleKeyDown(e: KeyboardEvent): boolean {
		if (this.options.disabled) return false;

		let delta = 0;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			delta = e.shiftKey ? -5 : -1;
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			delta = e.shiftKey ? 5 : 1;
		} else if (e.key === 'Home') {
			this.setPercent(0);
			this.triggerHaptic();
			this.options.onDragMove?.(this.currentPercent);
			this.options.onDragEnd?.(this.currentPercent);
			return true;
		} else if (e.key === 'End') {
			this.setPercent(100);
			this.triggerHaptic();
			this.options.onDragMove?.(this.currentPercent);
			this.options.onDragEnd?.(this.currentPercent);
			return true;
		}

		if (delta !== 0) {
			e.preventDefault();
			this.setPercent(this.currentPercent + delta);
			this.triggerHaptic();
			this.options.onDragMove?.(this.currentPercent);
			this.options.onDragEnd?.(this.currentPercent);
			return true;
		}

		return false;
	}

	private handlePointerMove(e: PointerEvent): void {
		if (!this.isDragging || this.options.disabled) return;
		const prev = this.currentPercent;
		this.updatePositionFromPointer(e.clientX);
		if (this.currentPercent !== prev) {
			this.options.onDragMove?.(this.currentPercent);
		}
	}

	private handlePointerUp(): void {
		if (!this.isDragging) return;
		this.isDragging = false;
		this.cleanupPointerCapture();
		this.triggerHaptic();
		this.options.onDragEnd?.(this.currentPercent);
	}

	private handlePointerCancel(): void {
		if (!this.isDragging) return;
		this.isDragging = false;
		this.cleanupPointerCapture();
		this.options.onDragEnd?.(this.currentPercent);
	}

	private updatePositionFromPointer(clientX: number): void {
		if (!this.element) return;
		const rect = this.element.getBoundingClientRect();
		const newPercent = this.computePercentFromClientX(clientX, rect);
		this.setPercent(newPercent);
	}

	private cleanupPointerCapture(): void {
		if (typeof window !== 'undefined') {
			window.removeEventListener('pointermove', this.boundOnPointerMove);
			window.removeEventListener('pointerup', this.boundOnPointerUp);
			window.removeEventListener('pointercancel', this.boundOnPointerCancel);
		}
	}

	private triggerHaptic(): void {
		if (
			this.options.enableHaptics !== false &&
			typeof navigator !== 'undefined' &&
			'vibrate' in navigator
		) {
			try {
				navigator.vibrate(6);
			} catch {
				// Silencia falha em contextos sem permissão de vibração
			}
		}
	}
}
