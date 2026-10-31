<script lang="ts">
	import type { SpectrumCard, TeamId } from '$lib/engine/types';

	interface Props {
		carta: SpectrumCard;
		equipe?: TeamId;
		selecionada?: boolean;
		interativo?: boolean;
		onclick?: () => void;
	}

	let { carta, equipe = 'A', selecionada = false, interativo = false, onclick }: Props = $props();

	let poloEsquerdo = $derived(carta.esquerda || carta.left || '');
	let poloDireito = $derived(carta.direita || carta.right || '');

	let isEquipePato = $derived(equipe === 'A');
</script>

<button
	type="button"
	disabled={!interativo}
	aria-label="Carta de espectro: {poloEsquerdo} versus {poloDireito}"
	aria-pressed={interativo ? selecionada : undefined}
	onclick={() => {
		if (interativo) {
			onclick?.();
		}
	}}
	class="relative h-52.5 w-full max-w-97.5 overflow-hidden rounded-none border-2 text-left transition-all duration-200 select-none sm:h-57.5 {interativo
		? 'cursor-pointer hover:-translate-y-0.5'
		: 'cursor-default'} {selecionada
		? '-translate-y-1.5 shadow-2xl ring-4 ring-primary ring-offset-2'
		: 'shadow-md'} {isEquipePato
		? 'border-[#271602] bg-[#df8b19] text-[#221101]'
		: 'border-[#251268] bg-[#4325a7] text-[#f7f2ff]'}"
>
	<!-- Moldura Interna Geométrica Afiada (Inset Frame) -->
	<div class="pointer-events-none absolute inset-3 border border-current opacity-30"></div>

	<!-- Cantoneira Decorativa Afiada: Canto Superior Direito -->
	<div class="pointer-events-none absolute top-4 right-4 z-0">
		<svg
			width="40"
			height="40"
			viewBox="0 0 40 40"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="opacity-75"
			aria-hidden="true"
		>
			<polyline points="4,4 36,4 36,36"></polyline>
			<polyline points="14,14 28,14 28,28"></polyline>
			<line x1="36" y1="4" x2="28" y2="14"></line>
			<rect x="20" y="20" width="3.5" height="3.5" fill="currentColor"></rect>
		</svg>
	</div>

	<!-- Cantoneira Decorativa Afiada: Canto Inferior Esquerdo -->
	<div class="pointer-events-none absolute bottom-4 left-4 z-0">
		<svg
			width="40"
			height="40"
			viewBox="0 0 40 40"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="opacity-75"
			aria-hidden="true"
		>
			<polyline points="36,36 4,36 4,4"></polyline>
			<polyline points="26,26 12,26 12,12"></polyline>
			<line x1="4" y1="36" x2="12" y2="26"></line>
			<rect x="16.5" y="16.5" width="3.5" height="3.5" fill="currentColor"></rect>
		</svg>
	</div>

	<!-- Polo Esquerdo: Canto Superior Esquerdo -->
	<div class="absolute top-5 left-5 z-10 max-w-[62%]">
		<span
			class="font-sn block text-2xl leading-tight font-black tracking-tight wrap-break-word sm:text-3xl"
		>
			{poloEsquerdo}
		</span>
	</div>

	<!-- Centro da Carta: Marca d'água Geométrica Cruzada (Sem caractere 'X') -->
	<div class="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
		<svg
			class="h-10 w-10 opacity-30 sm:h-12 sm:w-12"
			viewBox="0 0 32 32"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="square"
			aria-hidden="true"
		>
			<line x1="6" y1="6" x2="26" y2="26"></line>
			<line x1="26" y1="6" x2="6" y2="26"></line>
		</svg>
	</div>

	<!-- Polo Direito: Canto Inferior Direito -->
	<div class="absolute right-5 bottom-5 z-10 max-w-[62%] text-right">
		<span
			class="font-sn block text-2xl leading-tight font-black tracking-tight wrap-break-word sm:text-3xl"
		>
			{poloDireito}
		</span>
	</div>
</button>
