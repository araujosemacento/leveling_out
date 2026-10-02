<script>
	import IconArrowRight from '~icons/lucide/arrow-right';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let nickname = $state('');
	let roomCode = $state('');
	let errorMessage = $state('');

	let isCreatingNewRoom = $derived(!roomCode.trim());

	function generateRoomCode() {
		const randomNum = Math.floor(1000 + Math.random() * 9000);
		return `sala-${randomNum}`;
	}

	/** @param {SubmitEvent} e */
	function handleEnterRoom(e) {
		e.preventDefault();
		const cleanNick = nickname.trim();
		const cleanRoom = roomCode.trim() || generateRoomCode();

		if (!cleanNick) {
			errorMessage = 'Digite seu apelido para entrar na partida.';
			return;
		}

		errorMessage = '';

		// Memoriza o apelido localmente para a sessão
		if (typeof window !== 'undefined') {
			window.sessionStorage.setItem('playerName', cleanNick);
		}

		goto(resolve(`/${encodeURIComponent(cleanRoom)}`));
	}
</script>

<svelte:head>
	<title>Lobby : Leveling Out</title>
</svelte:head>

<div class="mx-auto flex max-w-xl flex-col items-center px-4 py-12 sm:px-6 sm:py-16">
	<!-- Apresentação do Jogo -->
	<div class="mb-10 text-center">
		<h1 class="font-display text-4xl text-accent sm:text-5xl">Leveling Out</h1>

		<p class="mt-3 font-subheading text-base text-text-muted sm:text-lg">
			Sintonia, dedução e calibração social em equipe.
		</p>
	</div>

	<!-- Formulário de Entrada no Lobby -->
	<div
		class="w-full rounded-2xl border border-border-subtle bg-bg-surface-soft p-6 shadow-sm sm:p-8"
	>
		<form onsubmit={handleEnterRoom} class="flex flex-col gap-5">
			<!-- Campo de Apelido -->
			<div class="flex flex-col gap-1.5">
				<label
					for="nickname"
					class="font-util-heading text-xs font-bold tracking-wider text-text-primary uppercase"
				>
					Seu Apelido
				</label>
				<input
					id="nickname"
					type="text"
					bind:value={nickname}
					placeholder="Ex: Keanu"
					maxlength="20"
					required
					class="w-full rounded-xl border border-border-subtle bg-bg-base px-4 py-3 font-util-body text-sm text-text-primary placeholder:text-text-subtle focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
				/>
			</div>

			<!-- Campo de Código da Sala -->
			<div class="flex flex-col gap-1.5">
				<label
					for="roomCode"
					class="font-util-heading text-xs font-bold tracking-wider text-text-primary uppercase"
				>
					Código da Sala (Opcional)
				</label>
				<div class="relative">
					<input
						id="roomCode"
						type="text"
						bind:value={roomCode}
						placeholder="Deixe em branco para sala aleatória"
						class="w-full rounded-xl border border-border-subtle bg-bg-base px-4 py-3 font-code text-sm text-text-primary placeholder:text-text-subtle focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
					/>
				</div>
				<span class="font-util-body text-[11px] text-text-muted">
					Compartilhe o código da sala com seus amigos para jogarem juntos.
				</span>
			</div>

			{#if errorMessage}
				<div
					class="rounded-lg border border-secondary bg-secondary-soft p-2.5 text-xs text-secondary"
				>
					<span class="font-util-body">{errorMessage}</span>
				</div>
			{/if}

			<!-- Ação Unificada -->
			<div class="mt-2 flex flex-col gap-3">
				<button
					type="submit"
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 font-util-heading text-sm leading-none font-bold text-text-on-accent transition hover:bg-accent-hover"
				>
					<span>{isCreatingNewRoom ? 'Criar Nova Sala' : 'Entrar na Sala'}</span>
					<IconArrowRight class="h-4 w-4" />
				</button>
			</div>
		</form>
	</div>

	<!-- Resumo de Como Funciona -->
	<div
		class="mt-8 flex w-full flex-col gap-2 rounded-xl border border-border-subtle bg-bg-surface-soft/60 p-4 text-center"
	>
		<span class="font-util-heading text-xs font-bold text-accent">Regra Rápida</span>
		<p class="font-util-body text-xs text-text-muted">
			Duas equipes disputam calibrando pistas associativas em uma escala de 0% a 100%. O Codificador
			envia a dica e o Palpiteiro posiciona o slider analógico no nível exato do tubo.
		</p>
	</div>
</div>
