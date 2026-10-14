<script lang="ts">
	import IconVial from '~icons/game-icons/vial';
	import IconUser from '~icons/lucide/user';
	import IconCrown from '~icons/lucide/crown';
	import IconCopy from '~icons/lucide/copy';
	import IconCheck from '~icons/lucide/check';

	let { roomCode, playerName, isHost, copied, onCopyLink } = $props<{
		roomCode: string;
		playerName: string;
		isHost: boolean;
		copied: boolean;
		onCopyLink: () => void;
	}>();
</script>

<header
	class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-surface px-5 py-4 shadow-sm"
>
	<div class="flex items-center gap-3">
		<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
			<IconVial class="h-5 w-5" />
		</div>
		<div class="flex flex-col">
			<span class="font-util-heading text-xs leading-none text-text-muted">
				Partida Multiplayer : Lobby
			</span>
			<span
				class="mt-1 flex items-baseline gap-1.5 font-util-heading text-base font-bold text-text-primary"
			>
				<span>Sala:</span>
				<strong class="font-code text-accent">{roomCode}</strong>
			</span>
		</div>
	</div>

	<div class="flex items-center gap-3">
		<!-- Identificação do Jogador -->
		<div
			class="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-base px-3.5 py-1.5 text-xs text-text-primary"
		>
			{#if isHost}
				<span title="Você é o Anfitrião da Sala" class="flex items-center">
					<IconCrown class="h-3.5 w-3.5 text-amber-500" />
				</span>
			{:else}
				<IconUser class="h-3.5 w-3.5 text-text-muted" />
			{/if}
			<span class="font-util-body leading-none font-semibold">{playerName}</span>
			{#if isHost}
				<span
					class="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400"
				>
					Host
				</span>
			{/if}
		</div>

		<!-- Botão de Copiar Link -->
		<button
			onclick={onCopyLink}
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
</header>
