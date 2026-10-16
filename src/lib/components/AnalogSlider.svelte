<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import IconLock from '~icons/lucide/lock';
	import { SliderDragController } from '$lib/engine/input/slider-controller';

	interface Props {
		value?: number;
		disabled?: boolean;
		label?: string;
		leftLabel?: string;
		rightLabel?: string;
		showValue?: boolean;
		onChange?: (val: number) => void;
		onDragStart?: (val: number) => void;
		onDragEnd?: (val: number) => void;
	}

	let {
		value = $bindable(50),
		disabled = false,
		label = 'Ajuste do Marcador Analógico',
		leftLabel = '',
		rightLabel = '',
		showValue = true,
		onChange,
		onDragStart,
		onDragEnd
	}: Props = $props();

	let trackElement: HTMLElement | null = $state(null);
	let isDragging = $state(false);
	let controller: SliderDragController | null = null;

	onMount(() => {
		controller = new SliderDragController({
			initialPercent: value,
			disabled,
			onDragStart: (val) => {
				isDragging = true;
				value = val;
				onDragStart?.(val);
			},
			onDragMove: (val) => {
				value = val;
				onChange?.(val);
			},
			onDragEnd: (val) => {
				isDragging = false;
				value = val;
				onDragEnd?.(val);
			},
			onChange: (val) => {
				value = val;
				onChange?.(val);
			}
		});

		if (trackElement) {
			controller.attach(trackElement);
		}
	});

	onDestroy(() => {
		controller?.detach();
		controller = null;
	});

	$effect(() => {
		if (controller) {
			controller.setDisabled(disabled);
		}
	});

	$effect(() => {
		if (controller && !isDragging && controller.getPercent() !== value) {
			controller.setPercent(value);
		}
	});

	function handlePointerDown(e: PointerEvent) {
		if (disabled || !controller) return;
		controller.handlePointerDown(e);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (disabled || !controller) return;
		controller.handleKeyDown(e);
	}
</script>

<div class="flex w-full flex-col gap-3 select-none">
	<!-- Rótulos dos Polos Semânticos do Espectro (se fornecidos) -->
	{#if leftLabel || rightLabel}
		<div
			class="flex items-center justify-between px-1 font-util-heading text-xs font-bold tracking-wide uppercase"
		>
			<span class="max-w-[45%] truncate text-text-muted" title={leftLabel}>
				{leftLabel}
			</span>
			{#if showValue}
				<span
					class="rounded-md border border-border-subtle bg-bg-surface-elevated px-2 py-0.5 font-code text-[11px] font-semibold text-accent shadow-2xs"
				>
					{value}%
				</span>
			{/if}
			<span class="max-w-[45%] truncate text-right text-text-muted" title={rightLabel}>
				{rightLabel}
			</span>
		</div>
	{/if}

	<!-- Trilho Analógico Principal -->
	<div class="relative flex w-full flex-col justify-center py-4">
		<!-- Trilho Graduado com Entalhes -->
		<div
			bind:this={trackElement}
			role="slider"
			tabindex={disabled ? -1 : 0}
			aria-label={label}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={value}
			aria-disabled={disabled}
			onpointerdown={handlePointerDown}
			onkeydown={handleKeyDown}
			class="relative flex h-8 w-full cursor-pointer touch-none items-center rounded-full border border-border-medium/70 bg-bg-surface-soft px-3 shadow-inner transition-colors focus:ring-2 focus:ring-accent/40 focus:outline-hidden sm:h-9 {disabled
				? 'cursor-not-allowed opacity-65'
				: 'hover:border-primary/60'}"
		>
			<!-- Barra de Preenchimento Dinâmico Suave -->
			<div
				class="pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 rounded-full bg-linear-to-r from-primary/30 to-accent/40 transition-[width] duration-75"
				style:width="calc({value}% - {value * 0.03}px)"
			></div>

			<!-- Entalhes / Ticks Graduados do Espectro -->
			<div
				class="pointer-events-none absolute inset-x-4 flex items-center justify-between opacity-35"
			>
				{#each Array.from({ length: 11 }, (_, idx) => idx) as tick (tick)}
					<span
						class="w-0.5 rounded-full bg-text-subtle transition-all {tick === 5
							? 'h-3.5 bg-accent opacity-90'
							: tick === 0 || tick === 10
								? 'h-3'
								: 'h-2'}"
					></span>
				{/each}
			</div>

			<!-- Marcador / Agulha Analógica Deslizante -->
			<div
				class="pointer-events-none absolute top-1/2 -translate-y-1/2 transition-[left] duration-75"
				style:left="calc({value}% - {value * 0.28}px)"
			>
				<div
					class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent text-white shadow-md transition-transform duration-150 {isDragging
						? 'scale-115 ring-4 ring-accent/30'
						: 'group-hover:scale-105'}"
				>
					{#if disabled}
						<IconLock class="h-3.5 w-3.5 text-white/80" />
					{:else}
						<div class="h-2 w-2 rounded-full bg-white shadow-2xs"></div>
					{/if}

					<!-- Balão Flutuante de Valor com Destaque no Arrasto -->
					{#if isDragging}
						<div
							class="absolute -top-8 flex -translate-x-1/2 items-center rounded-md border border-accent/40 bg-accent px-1.5 py-0.5 font-code text-[10px] font-bold text-white shadow-lg"
						>
							{value}%
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Marcadores Extremos de Escala (0% e 100%) -->
		<div
			class="pointer-events-none mt-1.5 flex justify-between px-2 font-code text-[10px] font-medium text-text-subtle"
		>
			<span>0%</span>
			<span>50%</span>
			<span>100%</span>
		</div>
	</div>
</div>
