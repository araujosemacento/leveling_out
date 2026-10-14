<script lang="ts">
	import type { LobbyProjection } from '$lib/engine/render/projections';
	import type { LobbyTeamChoice } from '$lib/engine/types';

	import IconCrowDive from '~icons/game-icons/crow-dive';
	import IconRollingDices from '~icons/game-icons/rolling-dices';
	import IconEagleEmblem from '~icons/game-icons/eagle-emblem';
	import IconUser from '~icons/lucide/user';
	import IconCrown from '~icons/lucide/crown';
	import IconPlay from '~icons/lucide/play';

	let { lobby, localPlayerId, isStartingMatch, onSelectTeam, onStartMatch } = $props<{
		lobby: LobbyProjection | null;
		localPlayerId: string;
		isStartingMatch: boolean;
		onSelectTeam: (team: LobbyTeamChoice) => void;
		onStartMatch: () => void;
	}>();
</script>

<main class="flex flex-col gap-6">
	<!-- Título e Diretiva de Ação -->
	<div class="flex flex-col items-center text-center">
		<h1 class="font-display text-2xl text-text-primary sm:text-3xl">Distribuição de Equipes</h1>
		<p class="mt-1 font-subheading text-xs text-text-muted sm:text-sm">
			Clique em uma caixa para escolher sua equipe
		</p>
	</div>

	<!-- Grade Tripartite de 3 Caixas: Corvo, Aleatório e Águia -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<!-- 1. Caixa Equipe Corvo (Índigo / Accent) -->
		<button
			type="button"
			onclick={() => onSelectTeam('A')}
			class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
			'A'
				? 'border-accent bg-accent-soft/40 shadow-md ring-2 ring-accent ring-offset-2 ring-offset-bg-base'
				: 'border-border-subtle bg-bg-surface hover:border-accent/40 hover:bg-accent-soft/10'} p-5"
		>
			<!-- Watermark Sutil Centralizada -->
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
			>
				<IconCrowDive class="h-56 w-56 -rotate-12 text-accent" />
			</div>

			<!-- Cabeçalho da Equipe Corvo -->
			<div
				class="relative z-10 flex items-center justify-between border-b border-border-subtle/50 pb-3"
			>
				<h2 class="font-display text-lg font-bold tracking-tight text-accent sm:text-xl">
					Equipe Corvo
				</h2>
				<span class="rounded-lg bg-accent-soft px-2.5 py-1 font-code text-xs font-bold text-accent">
					{lobby?.membrosCorvo.length || 0}/2
				</span>
			</div>

			<!-- Lista de Membros da Equipe Corvo -->
			<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
				{#each lobby?.membrosCorvo || [] as membro (membro.id)}
					<div
						class="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 shadow-xs"
					>
						<div class="flex items-center gap-2">
							<IconUser class="h-4 w-4 text-accent" />
							<span class="font-util-body text-xs font-semibold text-text-primary">
								{membro.nome}
							</span>
							{#if membro.id === localPlayerId}
								<span
									class="rounded-md bg-accent/15 px-1.5 py-0.5 font-util-heading text-[10px] font-bold text-accent"
								>
									Você
								</span>
							{/if}
						</div>
						{#if membro.isHost}
							<span title="Anfitrião da Sala" class="flex items-center">
								<IconCrown class="h-4 w-4 text-amber-500" />
							</span>
						{/if}
					</div>
				{/each}

				<!-- Slots de Vagas Disponíveis -->
				{#if (lobby?.membrosCorvo.length || 0) < 2}
					{#each Array.from({ length: 2 - (lobby?.membrosCorvo.length || 0) }, (_, i) => i) as slotIdx (slotIdx)}
						<div
							class="flex items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/60 py-3 text-center"
						>
							<span class="font-util-heading text-xs font-medium text-text-muted">
								+ Vaga livre
							</span>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Rodapé Informativo da Caixa Corvo -->
			<div class="relative z-10 mt-4 pt-2 text-center">
				{#if lobby?.minhaEquipe === 'A'}
					<span class="font-util-heading text-xs font-bold text-accent"> Sua equipe atual </span>
				{:else if !lobby?.podeEscolherCorvo}
					<span class="font-util-heading text-xs font-medium text-text-muted"> Equipe lotada </span>
				{:else}
					<span
						class="font-util-heading text-xs font-medium text-text-muted group-hover:text-accent"
					>
						Clique para entrar
					</span>
				{/if}
			</div>
		</button>

		<!-- 2. Caixa Neutra de Sorteio Aleatório (Tons de Cinza / Indecisos) -->
		<button
			type="button"
			onclick={() => onSelectTeam('ALEATORIO')}
			class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
			'ALEATORIO'
				? 'border-text-muted/60 bg-bg-surface-elevated shadow-md ring-2 ring-text-muted ring-offset-2 ring-offset-bg-base'
				: 'border-border-subtle bg-bg-surface-soft/40 hover:border-text-muted/40 hover:bg-bg-surface-soft'} p-5"
		>
			<!-- Watermark Sutil de Dados -->
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
			>
				<IconRollingDices class="h-52 w-52 text-text-muted" />
			</div>

			<!-- Cabeçalho da Caixa Aleatória -->
			<div
				class="relative z-10 flex items-center justify-between border-b border-border-subtle/50 pb-3"
			>
				<h2 class="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl">
					Aleatório
				</h2>
				<span
					class="rounded-lg bg-bg-surface-elevated px-2.5 py-1 font-code text-xs font-bold text-text-muted"
				>
					{lobby?.membrosAleatorio.length || 0}
				</span>
			</div>

			<!-- Lista de Participantes em Aleatório -->
			<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
				{#each lobby?.membrosAleatorio || [] as membro (membro.id)}
					<div
						class="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 shadow-xs"
					>
						<div class="flex items-center gap-2">
							<IconUser class="h-4 w-4 text-text-muted" />
							<span class="font-util-body text-xs font-semibold text-text-primary">
								{membro.nome}
							</span>
							{#if membro.id === localPlayerId}
								<span
									class="text-text-secondary rounded-md bg-text-muted/15 px-1.5 py-0.5 font-util-heading text-[10px] font-bold"
								>
									Você
								</span>
							{/if}
						</div>
						{#if membro.isHost}
							<span title="Anfitrião da Sala" class="flex items-center">
								<IconCrown class="h-4 w-4 text-amber-500" />
							</span>
						{/if}
					</div>
				{/each}

				{#if (lobby?.membrosAleatorio.length || 0) === 0}
					<div
						class="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/40 p-4 text-center"
					>
						<span class="font-util-body text-xs text-text-muted">
							Nenhum jogador indeciso no momento.
						</span>
						<span class="mt-1 font-util-body text-[11px] text-text-muted/70">
							Quem estiver aqui será balanceado pelo servidor no início.
						</span>
					</div>
				{/if}
			</div>

			<!-- Rodapé Informativo da Caixa Aleatória -->
			<div class="relative z-10 mt-4 pt-2 text-center">
				{#if lobby?.minhaEquipe === 'ALEATORIO'}
					<span class="text-text-secondary font-util-heading text-xs font-bold">
						Você será sorteado
					</span>
				{:else}
					<span class="font-util-heading text-xs font-medium text-text-muted">
						Clique para ser sorteado
					</span>
				{/if}
			</div>
		</button>

		<!-- 3. Caixa Equipe Águia (Âmbar / Secondary) -->
		<button
			type="button"
			onclick={() => onSelectTeam('B')}
			class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
			'B'
				? 'border-secondary bg-secondary-soft/40 shadow-md ring-2 ring-secondary ring-offset-2 ring-offset-bg-base'
				: 'border-border-subtle bg-bg-surface hover:border-secondary/40 hover:bg-secondary-soft/10'} p-5"
		>
			<!-- Watermark Sutil Centralizada -->
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
			>
				<IconEagleEmblem class="h-56 w-56 rotate-12 text-secondary" />
			</div>

			<!-- Cabeçalho da Equipe Águia -->
			<div
				class="relative z-10 flex items-center justify-between border-b border-border-subtle/50 pb-3"
			>
				<h2 class="font-display text-lg font-bold tracking-tight text-secondary sm:text-xl">
					Equipe Águia
				</h2>
				<span
					class="rounded-lg bg-secondary-soft px-2.5 py-1 font-code text-xs font-bold text-secondary"
				>
					{lobby?.membrosAguia.length || 0}/2
				</span>
			</div>

			<!-- Lista de Membros da Equipe Águia -->
			<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
				{#each lobby?.membrosAguia || [] as membro (membro.id)}
					<div
						class="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 shadow-xs"
					>
						<div class="flex items-center gap-2">
							<IconUser class="h-4 w-4 text-secondary" />
							<span class="font-util-body text-xs font-semibold text-text-primary">
								{membro.nome}
							</span>
							{#if membro.id === localPlayerId}
								<span
									class="rounded-md bg-secondary/15 px-1.5 py-0.5 font-util-heading text-[10px] font-bold text-secondary"
								>
									Você
								</span>
							{/if}
						</div>
						{#if membro.isHost}
							<span title="Anfitrião da Sala" class="flex items-center">
								<IconCrown class="h-4 w-4 text-amber-500" />
							</span>
						{/if}
					</div>
				{/each}

				<!-- Slots de Vagas Disponíveis -->
				{#if (lobby?.membrosAguia.length || 0) < 2}
					{#each Array.from({ length: 2 - (lobby?.membrosAguia.length || 0) }, (_, i) => i) as slotIdx (slotIdx)}
						<div
							class="flex items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/60 py-3 text-center"
						>
							<span class="font-util-heading text-xs font-medium text-text-muted">
								+ Vaga livre
							</span>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Rodapé Informativo da Caixa Águia -->
			<div class="relative z-10 mt-4 pt-2 text-center">
				{#if lobby?.minhaEquipe === 'B'}
					<span class="font-util-heading text-xs font-bold text-secondary"> Sua equipe atual </span>
				{:else if !lobby?.podeEscolherAguia}
					<span class="font-util-heading text-xs font-medium text-text-muted"> Equipe lotada </span>
				{:else}
					<span
						class="font-util-heading text-xs font-medium text-text-muted group-hover:text-secondary"
					>
						Clique para entrar
					</span>
				{/if}
			</div>
		</button>
	</div>

	<!-- Painel Inferior: Ações e Botão Exclusivo do Anfitrião -->
	<div class="mt-4 flex flex-col items-center justify-center gap-4 text-center">
		{#if lobby?.isHost}
			<!-- Botão Verde de Iniciar Partida (Exclusivo do Dono da Sala) -->
			<button
				type="button"
				onclick={onStartMatch}
				disabled={!lobby?.podeIniciarPartida || isStartingMatch}
				class="flex items-center gap-2 rounded-xl px-8 py-3.5 font-util-heading text-sm font-bold tracking-wide transition-all duration-200 {lobby?.podeIniciarPartida
					? 'animate-pulse cursor-pointer bg-emerald-600 text-white shadow-lg hover:bg-emerald-500 hover:shadow-xl active:scale-98'
					: 'cursor-not-allowed border border-border-subtle bg-bg-surface-elevated text-text-muted opacity-60'}"
			>
				<span>
					{#if isStartingMatch}
						Iniciando Partida<span class="animated-ellipsis"
							><span>.</span><span>.</span><span>.</span></span
						>
					{:else if lobby?.quorumCompleto}
						Iniciar Partida
					{:else}
						Aguardando 4 Jogadores ({lobby?.totalJogadores || 0}/4)<span class="animated-ellipsis"
							><span>.</span><span>.</span><span>.</span></span
						>
					{/if}
				</span>
				<IconPlay class="h-4 w-4" />
			</button>

			{#if !lobby?.quorumCompleto}
				<span class="font-util-body text-xs text-text-muted">
					A partida só poderá ser iniciada quando houver exatamente 4 jogadores conectados na sala.
				</span>
			{/if}
		{:else}
			<!-- Mensagem Receptiva para Convidados -->
			<div
				class="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-5 py-3 text-xs text-text-muted"
			>
				<IconUser class="h-4 w-4 text-text-muted" />
				{#if lobby?.quorumCompleto}
					<span class="font-semibold text-emerald-600 dark:text-emerald-400">
						Quórum de 4 jogadores completo! Aguardando o anfitrião iniciar a partida<span
							class="animated-ellipsis"><span>.</span><span>.</span><span>.</span></span
						>
					</span>
				{:else}
					<span>
						Aguardando o anfitrião e mais jogadores entrarem ({lobby?.totalJogadores || 0}/4)<span
							class="animated-ellipsis"><span>.</span><span>.</span><span>.</span></span
						>
					</span>
				{/if}
			</div>
		{/if}
	</div>
</main>
