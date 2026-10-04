<script>
	import IconVial from '~icons/game-icons/vial';
	import IconLogOut from '~icons/lucide/log-out';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let isRoomPage = $derived(!!page.params.sala);
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
				<a
					href={resolve('/')}
					class="btn-soft-elevated group flex items-center gap-2 rounded-full px-4 py-2 font-util-heading text-xs font-semibold tracking-wide"
					title="Sair da sala e voltar ao lobby"
				>
					<span>Sair da Sala</span>
					<IconLogOut
						class="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
					/>
				</a>
			</div>
		{/if}
	</div>
</header>
