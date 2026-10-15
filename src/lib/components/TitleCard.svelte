<script>
	// Title Card: Identidade visual com layout estritamente vertical
	// Utiliza o componente procedural animado TestTube e Bagel Fat One no título
	import TestTube from '$lib/components/TestTube.svelte';
</script>

<div class="flex flex-col items-center justify-center text-center select-none">
	<!-- Ícone Procedural Animado do Tubo de Ensaio (Identidade Visual) -->
	<div
		class="relative flex items-center justify-center transition-transform duration-300 hover:scale-105"
	>
		<TestTube
			level={65}
			team="pato"
			showScale={true}
			animated={true}
			duration={10}
			interactiveShake={true}
			cycleHue={true}
			class="h-32 w-auto sm:h-40"
		/>
	</div>

	<!-- Título Principal com Bagel Fat One -->
	<h1
		class="mt-4 font-display text-5xl tracking-tight text-accent transition-colors sm:mt-5 sm:text-6xl md:text-7xl"
	>
		Leveling Out
	</h1>
</div>
