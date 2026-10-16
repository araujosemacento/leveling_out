<script lang="ts">
	import IconSun from '~icons/lucide/sun';
	import IconMoon from '~icons/lucide/moon';
	import { theme } from '$lib/stores/theme';

	let isDark = $derived($theme === 'dark');
	let label = $derived(isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro');
</script>

<button
	type="button"
	onclick={() => theme.toggle()}
	aria-label={label}
	title={label}
	class="group relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-text-muted shadow-xs transition-all duration-200 hover:border-primary/40 hover:bg-bg-surface-elevated hover:text-text-primary active:scale-95"
>
	{#if isDark}
		<IconSun class="h-4 w-4 text-primary transition-transform duration-300 group-hover:rotate-45" />
	{:else}
		<IconMoon
			class="h-4 w-4 text-accent transition-transform duration-300 group-hover:-rotate-12"
		/>
	{/if}
</button>
