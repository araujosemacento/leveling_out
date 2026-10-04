<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import TitleCard from '$lib/components/TitleCard.svelte';
	import { sanitizeNickname, sanitizeRoomCode } from '$lib/engine/input/sanitize';
	import IconArrowLeft from '~icons/lucide/arrow-left';
	import IconArrowRight from '~icons/lucide/arrow-right';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	/** @type {1 | 2} */
	let currentStep = $state(1);
	let rawNickname = $state('');
	let rawRoomCode = $state('');
	let errorMessage = $state('');

	let cleanNickname = $derived(sanitizeNickname(rawNickname));
	let cleanRoomCode = $derived(sanitizeRoomCode(rawRoomCode));

	onMount(() => {
		if (typeof window !== 'undefined') {
			const saved = window.sessionStorage.getItem('playerName');
			if (saved) {
				rawNickname = saved;
			}
		}
	});

	function generateRoomCode() {
		const randomNum = Math.floor(1000 + Math.random() * 9000);
		return `sala-${randomNum}`;
	}

	/** @param {SubmitEvent} [e] */
	function handleAdvanceToStep2(e) {
		if (e) e.preventDefault();
		const trimmed = rawNickname.trim();
		if (!trimmed) {
			errorMessage = 'Digite seu apelido para continuar.';
			return;
		}

		errorMessage = '';
		currentStep = 2;
	}

	function handleBackToStep1() {
		errorMessage = '';
		currentStep = 1;
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

		if (typeof window !== 'undefined') {
			window.sessionStorage.setItem('playerName', cleanNickname);
		}

		goto(resolve(`/${encodeURIComponent(targetRoom)}`));
	}
</script>

<svelte:head>
	<title>Lobby : Leveling Out</title>
</svelte:head>

<div
	class="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
>
	<!-- Topo: Identidade Visual com Ícone Proeminente e Título -->
	<TitleCard />

	<!-- Espaçamento Contextual e Formulário Progressivo Interativo -->
	<div class="mt-8 flex w-full flex-col items-center sm:mt-10">
		<!-- Indicador Linear de Progresso (Sem bullets circulares) -->
		<div class="mb-6 flex flex-col items-center gap-2">
			<span class="font-code text-xs font-semibold tracking-wider text-text-muted uppercase">
				Etapa {currentStep === 1 ? '01' : '02'} / 02
			</span>
			<div class="flex h-1 w-28 gap-2 bg-transparent">
				<div
					class="flex-1 transition-colors duration-300 {currentStep >= 1
						? 'bg-accent'
						: 'bg-border-subtle'}"
				></div>
				<div
					class="flex-1 transition-colors duration-300 {currentStep === 2
						? 'bg-accent'
						: 'bg-border-subtle'}"
				></div>
			</div>
		</div>

		<!-- Área de Foco Dinâmico Estabilizada (CSS Grid Stacking previne Layout Shift) -->
		<div class="grid min-h-60 w-full max-w-md grid-cols-1 grid-rows-1 items-start">
			{#if currentStep === 1}
				<div
					in:fly={{ y: 16, duration: 250, delay: 50 }}
					out:fly={{ y: -16, duration: 200 }}
					class="col-start-1 row-start-1 flex w-full flex-col items-center"
				>
					<div class="mb-4 text-center">
						<label
							for="step-nickname"
							class="block font-subheading text-xl text-text-primary sm:text-2xl"
						>
							Como você se chama?
						</label>
						<p class="mt-1 font-util-body text-sm text-text-muted">
							Identificação visível para sua equipe na partida
						</p>
					</div>

					<form onsubmit={handleAdvanceToStep2} class="flex w-full flex-col items-center">
						<div class="relative w-full">
							<input
								id="step-nickname"
								type="text"
								bind:value={rawNickname}
								placeholder="Seu apelido..."
								maxlength="20"
								required
								class="w-full border-b-2 border-border-medium bg-transparent px-2 py-3 pr-10 text-center font-subheading text-2xl text-text-primary placeholder:text-text-subtle/50 focus:border-accent focus:outline-none sm:text-3xl"
							/>
							{#if rawNickname.trim().length > 0}
								<button
									type="submit"
									class="absolute top-1/2 right-0 -translate-y-1/2 p-2 text-accent transition-transform hover:scale-110"
									title="Continuar para a próxima etapa"
								>
									<span class="sr-only">Continuar</span>
									<IconArrowRight class="h-6 w-6" />
								</button>
							{/if}
						</div>

						<p class="mt-4 font-util-heading text-xs tracking-wider text-text-muted uppercase">
							Pressione Enter para continuar
						</p>
					</form>
				</div>
			{:else}
				<div
					in:fly={{ y: 16, duration: 250, delay: 50 }}
					out:fly={{ y: -16, duration: 200 }}
					class="col-start-1 row-start-1 flex w-full flex-col items-center"
				>
					<div class="mb-4 text-center">
						<h2 class="font-subheading text-xl text-text-primary sm:text-2xl">
							Tudo pronto, <span class="font-semibold text-accent">{cleanNickname}</span>:
						</h2>
						<p class="mt-1 font-util-body text-sm text-text-muted">
							Em qual sala você deseja entrar?
						</p>
					</div>

					<form onsubmit={handleRoomSubmit} class="flex w-full flex-col items-center">
						<div class="relative w-full">
							<input
								id="step-room-code"
								type="text"
								bind:value={rawRoomCode}
								placeholder="Deixe em branco para sala aleatória"
								maxlength="16"
								class="w-full border-b-2 border-border-medium bg-transparent px-2 py-3 pr-10 text-center font-code text-xl tracking-wider text-accent uppercase placeholder:font-subheading placeholder:text-base placeholder:tracking-normal placeholder:text-text-subtle/50 focus:border-accent focus:outline-none sm:text-2xl sm:placeholder:text-lg"
							/>
							<button
								type="submit"
								class="absolute top-1/2 right-0 -translate-y-1/2 p-2 text-accent transition-transform hover:scale-110"
								title={rawRoomCode.trim() ? 'Entrar na Sala' : 'Criar Nova Sala Aleatória'}
							>
								<span class="sr-only">
									{rawRoomCode.trim() ? 'Entrar na Sala' : 'Criar Nova Sala Aleatória'}
								</span>
								<IconArrowRight class="h-6 w-6" />
							</button>
						</div>

						<p class="mt-4 font-util-heading text-xs tracking-wider text-text-muted uppercase">
							{rawRoomCode.trim()
								? `Pressione Enter para entrar na sala ${cleanRoomCode}`
								: 'Pressione Enter para criar uma sala aleatória'}
						</p>

						<!-- Retorno de Etapa (Botão Elevado Tátil Soft UI) -->
						<button
							type="button"
							onclick={handleBackToStep1}
							class="btn-soft-elevated group mt-7 flex items-center gap-2.5 rounded-full px-5 py-2.5 font-util-heading text-xs font-semibold tracking-wide"
						>
							<IconArrowLeft
								class="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
							/>
							<span>Voltar para alterar apelido</span>
						</button>
					</form>
				</div>
			{/if}

			{#if errorMessage}
				<div
					transition:fade={{ duration: 150 }}
					class="col-start-1 row-start-1 mt-auto rounded-lg border border-secondary bg-secondary-soft p-2.5 text-center text-xs text-secondary"
				>
					<span class="font-util-body">{errorMessage}</span>
				</div>
			{/if}
		</div>
	</div>
</div>
