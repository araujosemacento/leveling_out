<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import TitleCard from '$lib/components/TitleCard.svelte';
	import { sanitizeRoomCode } from '$lib/engine/input/sanitize';
	import IconArrowRight from '~icons/lucide/arrow-right';
	import IconDice from '~icons/lucide/dices';
	import { fade } from 'svelte/transition';

	let rawRoomCode = $state('');
	let errorMessage = $state('');

	let cleanRoomCode = $derived(sanitizeRoomCode(rawRoomCode));

	function generateRoomCode() {
		const randomNum = Math.floor(1000 + Math.random() * 9000);
		return `sala-${randomNum}`;
	}

	/** @param {SubmitEvent} [e] */
	function handleRoomSubmit(e) {
		if (e) e.preventDefault();
		const targetRoom = cleanRoomCode ? cleanRoomCode.toLowerCase() : generateRoomCode();
		enterRoom(targetRoom);
	}

	/** @param {string} targetRoom */
	function enterRoom(targetRoom) {
		errorMessage = '';
		goto(resolve(`/${encodeURIComponent(targetRoom)}`));
	}

	/** @param {HTMLElement} node */
	function autofocus(node) {
		requestAnimationFrame(() => {
			node.focus();
		});
	}
</script>

<svelte:head>
	<title>Leveling Out : Calibragem de Sintonia Social</title>
</svelte:head>

<div
	class="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
>
	<!-- Topo: Identidade Visual com Ícone Proeminente e Título -->
	<TitleCard />

	<!-- Espaçamento Contextual e Formulário de Ingresso Direto -->
	<div class="mt-8 flex w-full flex-col items-center sm:mt-10">
		<div class="flex min-h-56 w-full max-w-md flex-col items-center">
			<div class="mb-5 text-center">
				<label
					for="room-code-input"
					class="block font-subheading text-xl text-text-primary sm:text-2xl"
				>
					Código da Sala
				</label>
				<p class="mt-1 font-util-body text-sm text-text-muted">
					Digite o identificador da sala ou deixe em branco para gerar uma nova
				</p>
			</div>

			<form onsubmit={handleRoomSubmit} class="flex w-full flex-col items-center">
				<div class="relative w-full">
					<input
						id="room-code-input"
						type="text"
						bind:value={rawRoomCode}
						placeholder="Ex: sala-alpha"
						maxlength="16"
						autocomplete="off"
						spellcheck="false"
						use:autofocus
						class="w-full border-b-2 border-border-medium bg-transparent px-3 py-3 text-center font-code text-2xl tracking-wider text-accent uppercase placeholder:font-subheading placeholder:text-base placeholder:tracking-normal placeholder:text-text-subtle/50 focus:border-accent focus:outline-none sm:text-3xl"
					/>
				</div>

				<div class="mt-8 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
					<button
						type="submit"
						class="btn-soft-elevated group flex items-center justify-center gap-2 rounded-full px-7 py-3 font-util-heading text-sm font-semibold tracking-wide"
					>
						<span>{cleanRoomCode ? 'Entrar na Sala' : 'Criar Sala Aleatória'}</span>
						{#if cleanRoomCode}
							<IconArrowRight
								class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
							/>
						{:else}
							<IconDice class="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />
						{/if}
					</button>
				</div>

				<p class="mt-4 font-util-heading text-xs tracking-wider text-text-muted uppercase">
					Pressione Enter para prosseguir
				</p>
			</form>

			{#if errorMessage}
				<div
					transition:fade={{ duration: 150 }}
					class="mt-4 rounded-lg border border-secondary bg-secondary-soft p-2.5 text-center text-xs text-secondary"
				>
					<span class="font-util-body">{errorMessage}</span>
				</div>
			{/if}
		</div>
	</div>
</div>
