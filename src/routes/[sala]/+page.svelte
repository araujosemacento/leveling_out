<script>
	import IconVial from '~icons/game-icons/vial';
	import IconUser from '~icons/lucide/user';
	import IconCheck from '~icons/lucide/check';
	import IconCopy from '~icons/lucide/copy';
	import IconSwords from '~icons/lucide/swords';

	let { data } = $props();
	let roomCode = $derived(data.roomCode);

	let playerName = $state('');
	let copied = $state(false);

	$effect(() => {
		if (typeof window !== 'undefined') {
			playerName = window.sessionStorage.getItem('playerName') || 'Jogador';
		}
	});

	async function copyRoomLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch (e) {
			console.error('Falha ao copiar link:', e);
		}
	}
</script>

<svelte:head>
	<title>Sala : {roomCode} | Leveling Out</title>
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
	<!-- Barra de Status da Sala Conectada -->
	<div
		class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-surface px-5 py-4 shadow-sm"
	>
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
				<IconVial class="h-5 w-5" />
			</div>
			<div class="flex flex-col">
				<span class="font-util-heading text-xs leading-none text-text-muted"
					>Partida Multiplayer</span
				>
				<span
					class="mt-1 flex items-baseline gap-1 font-util-heading text-base font-bold text-text-primary"
				>
					<span>Sala:</span>
					<strong class="font-code text-accent">{roomCode}</strong>
				</span>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<!-- Apelido do Jogador Conectado -->
			<div
				class="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-base px-3.5 py-1.5 text-xs text-text-primary"
			>
				<IconUser class="h-3.5 w-3.5 text-text-muted" />
				<span class="font-util-body leading-none font-semibold">{playerName}</span>
			</div>

			<!-- Botão de Copiar Link -->
			<button
				onclick={copyRoomLink}
				class="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-surface-soft px-3.5 py-2 font-util-heading text-xs leading-none font-semibold text-accent transition hover:bg-bg-surface-elevated"
				title="Copiar link para convidar colegas de equipe"
			>
				{#if copied}
					<span class="text-tertiary">Link Copiado!</span>
					<IconCheck class="h-3.5 w-3.5 text-tertiary" />
				{:else}
					<span>Copiar Link</span>
					<IconCopy class="h-3.5 w-3.5" />
				{/if}
			</button>
		</div>
	</div>

	<!-- Arena Principal de Jogo (Placeholder receptivo para os componentes da Fase 2) -->
	<div
		class="flex min-h-95 flex-col items-center justify-center rounded-2xl border border-border-subtle bg-bg-surface p-8 text-center shadow-sm"
	>
		<div
			class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"
		>
			<IconSwords class="h-7 w-7" />
		</div>

		<h2 class="font-display text-2xl text-accent sm:text-3xl">Aguardando Jogadores</h2>

		<p class="mt-2 max-w-md font-subheading text-sm text-text-muted">
			Envie o link desta sala para seus amigos. Quando houver participantes em ambas as equipes, a
			disputa inicial de Pedra, Papel e Tesoura começará.
		</p>

		<!-- Divisão Prévia das Equipes -->
		<div class="mt-8 grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
			<!-- Equipe A -->
			<div
				class="flex flex-col items-center rounded-xl border border-border-subtle bg-accent-soft/40 p-4"
			>
				<span class="font-util-heading text-xs font-bold text-accent">Equipe A (Índigo)</span>
				<span class="mt-2 font-util-body text-xs text-text-muted">1 participante</span>
			</div>

			<!-- Equipe B -->
			<div
				class="flex flex-col items-center rounded-xl border border-border-subtle bg-secondary-soft/40 p-4"
			>
				<span class="font-util-heading text-xs font-bold text-secondary">Equipe B (Pêssego)</span>
				<span class="mt-2 font-util-body text-xs text-text-muted">Aguardando conexão</span>
			</div>
		</div>
	</div>
</div>
