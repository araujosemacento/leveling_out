<script>
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import { theme } from '$lib/stores/theme';

	let { children } = $props();

	onMount(() => {
		theme.init();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Leveling Out</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-bg-base text-text-primary">
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
</div>
