<script>
	import IconVial from '~icons/game-icons/vial';
	import IconLogOut from '~icons/lucide/log-out';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let isRoomPage = $derived(!!page.params.sala);
	let roomCode = $derived(page.params.sala || '');
</script>

<header
	class="sticky top-0 z-40 w-full border-b border-border-subtle bg-bg-base/90 backdrop-blur-md transition-colors"
>
	<div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
		<div class="flex items-center gap-3">
			<a
				href={resolve('/')}
				class="flex items-center gap-2.5 text-accent transition hover:opacity-85"
			>
				<IconVial class="h-6 w-6 text-primary" />
				<span class="font-display text-xl font-bold tracking-tight text-accent">
					Leveling Out
				</span>
			</a>
		</div>

		{#if isRoomPage}
			<div class="flex items-center gap-3">
				<div
					class="flex items-baseline gap-1.5 rounded-lg border border-border-subtle bg-bg-surface px-3 py-1.5 text-xs"
				>
					<span class="font-util-body leading-none text-text-muted">Sala:</span>
					<strong class="font-code text-sm leading-none font-semibold text-accent"
						>{roomCode}</strong
					>
				</div>

				<a
					href={resolve('/')}
					class="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-surface-soft px-3 py-1.5 font-util-body text-xs leading-none font-semibold text-accent transition hover:bg-bg-surface-elevated"
					title="Sair da sala e voltar ao lobby"
				>
					<span>Sair da Sala</span>
					<IconLogOut class="h-3.5 w-3.5" />
				</a>
			</div>
		{/if}
	</div>
</header>
