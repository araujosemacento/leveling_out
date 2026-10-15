<script lang="ts">
	import type { LobbyProjection } from '$lib/engine/render/projections';
	import type { LobbyTeamChoice } from '$lib/engine/types';

	import IconDove from '~icons/game-icons/dove';
	import IconRollingDices from '~icons/game-icons/rolling-dices';
	import IconGooseCodename from '~icons/thesvg/goose-codename';
	import IconDuck from '~icons/game-icons/duck';
	import IconGoose from '~icons/game-icons/goose';
	import IconUserQuestion from '~icons/mingcute/user-question-fill';
	import IconUser from '~icons/lucide/user';
	import IconCrown from '~icons/lucide/crown';
	import IconPlay from '~icons/lucide/play';
	import IconUserX from '~icons/lucide/user-x';

	let { lobby, localPlayerId, isStartingMatch, onSelectTeam, onStartMatch, onKickPlayer } = $props<{
		lobby: LobbyProjection | null;
		localPlayerId: string;
		isStartingMatch: boolean;
		onSelectTeam: (team: LobbyTeamChoice) => void;
		onStartMatch: () => void;
		onKickPlayer?: (playerId: string, playerName: string) => void;
	}>();
</script>

<main class="flex flex-col gap-6">
	<!-- Título e Diretiva de Ação -->
	<div class="flex flex-col items-center text-center">
		<h1 class="font-display text-2xl text-text-primary sm:text-3xl">Distribuição de Equipes</h1>
		<p class="mt-1 font-subheading text-xs text-text-muted sm:text-sm">
			Escolha sua equipe ou aguarde sorteio aleatório
		</p>
	</div>

	<!-- Grade Tripartite de 3 Caixas: Pato, Aleatório e Ganso -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<!-- 1. Caixa Equipe Pato (Índigo / Accent) -->
		<div
			class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
			'A'
				? 'border-accent bg-accent-soft/40 shadow-md ring-2 ring-accent ring-offset-2 ring-offset-bg-base'
				: 'border-border-subtle bg-bg-surface'} p-5"
		>
			<!-- Watermark Sutil Centralizada -->
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
			>
				<IconDove class="h-56 w-56 text-accent" />
			</div>

			<!-- Cabeçalho da Equipe Pato -->
			<div
				class="relative z-10 flex items-center justify-between border-b border-border-subtle/50 pb-3"
			>
				<h2 class="font-display text-lg font-bold tracking-tight text-accent sm:text-xl">
					Equipe Pato
				</h2>
				<span class="rounded-lg bg-accent-soft px-2.5 py-1 font-code text-xs font-bold text-accent">
					{(lobby?.membrosPato || []).length}/2
				</span>
			</div>

			<!-- Lista de Membros da Equipe Pato -->
			<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
				{#each lobby?.membrosPato || [] as membro (membro.id)}
					<div
						class="flex h-11 items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 shadow-xs"
					>
						<div class="flex items-center gap-2">
							<IconDuck class="h-4 w-4 text-accent" />
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
						<div class="flex h-7 w-7 items-center justify-center">
							{#if membro.isHost}
								<div
									class="flex h-7 w-7 items-center justify-center text-amber-500"
									title="Anfitrião da Sala"
								>
									<IconCrown class="h-4 w-4" />
								</div>
							{:else if lobby?.isHost && membro.id !== localPlayerId}
								<button
									type="button"
									onclick={() => onKickPlayer?.(membro.id, membro.nome)}
									title="Expulsar {membro.nome} da sala"
									aria-label="Expulsar {membro.nome} da sala"
									class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-secondary-soft hover:text-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
								>
									<IconUserX class="h-4 w-4" />
								</button>
							{/if}
						</div>
					</div>
				{/each}

				<!-- Slots de Vagas Disponíveis -->
				{#if (lobby?.membrosPato?.length ?? 0) < 2}
					{#each Array.from({ length: 2 - (lobby?.membrosPato?.length ?? 0) }, (_, i) => i) as slotIdx (slotIdx)}
						<button
							type="button"
							onclick={() => onSelectTeam('A')}
							disabled={lobby?.minhaEquipe === 'A' || !lobby?.podeEscolherPato}
							class="flex h-11 items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/60 text-center transition-colors {lobby?.minhaEquipe !==
								'A' && lobby?.podeEscolherPato
								? 'cursor-pointer text-accent hover:border-accent hover:bg-accent-soft/20'
								: 'cursor-default text-text-muted'}"
						>
							<span class="font-util-heading text-xs font-medium"> + Vaga livre </span>
						</button>
					{/each}
				{/if}
			</div>

			<!-- Rodapé Informativo / Botão de Ação da Caixa Pato -->
			<div class="relative z-10 mt-4 pt-2 text-center">
				{#if lobby?.minhaEquipe === 'A'}
					<span class="font-util-heading text-xs font-bold text-accent"> Sua equipe atual </span>
				{:else if !lobby?.podeEscolherPato}
					<span class="font-util-heading text-xs font-medium text-text-muted"> Equipe lotada </span>
				{:else}
					<button
						type="button"
						onclick={() => onSelectTeam('A')}
						class="w-full cursor-pointer rounded-lg py-1.5 font-util-heading text-xs font-medium text-text-muted underline transition-colors hover:bg-accent-soft hover:text-accent"
					>
						Clique para entrar
					</button>
				{/if}
			</div>
		</div>

		<!-- 2. Caixa Neutra de Sorteio Aleatório (Tons de Cinza / Indecisos) -->
		<div
			class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
			'ALEATORIO'
				? 'border-text-muted/60 bg-bg-surface-elevated shadow-md ring-2 ring-text-muted ring-offset-2 ring-offset-bg-base'
				: 'border-border-subtle bg-bg-surface-soft/40'} p-5"
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
						class="flex h-11 items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 shadow-xs"
					>
						<div class="flex items-center gap-2">
							<IconUserQuestion class="h-4 w-4 text-text-muted" />
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
						<div class="flex h-7 w-7 items-center justify-center">
							{#if membro.isHost}
								<div
									class="flex h-7 w-7 items-center justify-center text-amber-500"
									title="Anfitrião da Sala"
								>
									<IconCrown class="h-4 w-4" />
								</div>
							{:else if lobby?.isHost && membro.id !== localPlayerId}
								<button
									type="button"
									onclick={() => onKickPlayer?.(membro.id, membro.nome)}
									title="Expulsar {membro.nome} da sala"
									aria-label="Expulsar {membro.nome} da sala"
									class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-secondary-soft hover:text-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
								>
									<IconUserX class="h-4 w-4" />
								</button>
							{/if}
						</div>
					</div>
				{/each}

				{#if (lobby?.membrosAleatorio.length || 0) === 0}
					<button
						type="button"
						onclick={() => onSelectTeam('ALEATORIO')}
						disabled={lobby?.minhaEquipe === 'ALEATORIO'}
						class="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/40 p-4 text-center transition-colors {lobby?.minhaEquipe !==
						'ALEATORIO'
							? 'cursor-pointer hover:border-text-muted hover:bg-bg-surface-elevated/40'
							: 'cursor-default'}"
					>
						<span class="font-util-body text-xs text-text-muted">
							Nenhum jogador indeciso no momento.
						</span>
						<span class="mt-1 font-util-body text-[11px] text-text-muted/70">
							Quem estiver aqui será balanceado pelo servidor no início.
						</span>
					</button>
				{/if}
			</div>

			<!-- Rodapé Informativo / Botão de Ação da Caixa Aleatória -->
			<div class="relative z-10 mt-4 pt-2 text-center">
				{#if lobby?.minhaEquipe === 'ALEATORIO'}
					<span class="text-text-secondary font-util-heading text-xs font-bold">
						Você será sorteado
					</span>
				{:else}
					<button
						type="button"
						onclick={() => onSelectTeam('ALEATORIO')}
						class="w-full cursor-pointer rounded-lg py-1.5 font-util-heading text-xs font-medium text-text-muted underline transition-colors hover:bg-bg-surface-elevated hover:text-text-primary"
					>
						Clique para ser sorteado
					</button>
				{/if}
			</div>
		</div>

		<!-- 3. Caixa Equipe Ganso (Coral / Secondary) -->
		<div
			class="relative flex min-h-75 flex-col overflow-hidden rounded-2xl border text-left transition-all {lobby?.minhaEquipe ===
			'B'
				? 'border-secondary bg-secondary-soft/40 shadow-md ring-2 ring-secondary ring-offset-2 ring-offset-bg-base'
				: 'border-border-subtle bg-bg-surface'} p-5"
		>
			<!-- Watermark Sutil Centralizada -->
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
			>
				<IconGooseCodename class="h-56 w-56 -scale-x-100 text-secondary" />
			</div>

			<!-- Cabeçalho da Equipe Ganso -->
			<div
				class="relative z-10 flex items-center justify-between border-b border-border-subtle/50 pb-3"
			>
				<h2 class="font-display text-lg font-bold tracking-tight text-secondary sm:text-xl">
					Equipe Ganso
				</h2>
				<span
					class="rounded-lg bg-secondary-soft px-2.5 py-1 font-code text-xs font-bold text-secondary"
				>
					{(lobby?.membrosGanso || []).length}/2
				</span>
			</div>

			<!-- Lista de Membros da Equipe Ganso -->
			<div class="relative z-10 mt-4 flex flex-1 flex-col gap-2.5">
				{#each lobby?.membrosGanso || [] as membro (membro.id)}
					<div
						class="flex h-11 items-center justify-between rounded-xl border border-border-subtle bg-bg-surface px-3 shadow-xs"
					>
						<div class="flex items-center gap-2">
							<IconGoose class="h-4 w-4 -scale-x-100 text-secondary" />
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
						<div class="flex h-7 w-7 items-center justify-center">
							{#if membro.isHost}
								<div
									class="flex h-7 w-7 items-center justify-center text-amber-500"
									title="Anfitrião da Sala"
								>
									<IconCrown class="h-4 w-4" />
								</div>
							{:else if lobby?.isHost && membro.id !== localPlayerId}
								<button
									type="button"
									onclick={() => onKickPlayer?.(membro.id, membro.nome)}
									title="Expulsar {membro.nome} da sala"
									aria-label="Expulsar {membro.nome} da sala"
									class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-secondary-soft hover:text-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
								>
									<IconUserX class="h-4 w-4" />
								</button>
							{/if}
						</div>
					</div>
				{/each}

				<!-- Slots de Vagas Disponíveis -->
				{#if (lobby?.membrosGanso?.length ?? 0) < 2}
					{#each Array.from({ length: 2 - (lobby?.membrosGanso?.length ?? 0) }, (_, i) => i) as slotIdx (slotIdx)}
						<button
							type="button"
							onclick={() => onSelectTeam('B')}
							disabled={lobby?.minhaEquipe === 'B' || !lobby?.podeEscolherGanso}
							class="flex h-11 items-center justify-center rounded-xl border-2 border-dashed border-border-subtle/60 text-center transition-colors {lobby?.minhaEquipe !==
								'B' && lobby?.podeEscolherGanso
								? 'cursor-pointer text-secondary hover:border-secondary hover:bg-secondary-soft/20'
								: 'cursor-default text-text-muted'}"
						>
							<span class="font-util-heading text-xs font-medium"> + Vaga livre </span>
						</button>
					{/each}
				{/if}
			</div>

			<!-- Rodapé Informativo / Botão de Ação da Caixa Ganso -->
			<div class="relative z-10 mt-4 pt-2 text-center">
				{#if lobby?.minhaEquipe === 'B'}
					<span class="font-util-heading text-xs font-bold text-secondary"> Sua equipe atual </span>
				{:else if !lobby?.podeEscolherGanso}
					<span class="font-util-heading text-xs font-medium text-text-muted"> Equipe lotada </span>
				{:else}
					<button
						type="button"
						onclick={() => onSelectTeam('B')}
						class="w-full cursor-pointer rounded-lg py-1.5 font-util-heading text-xs font-medium text-text-muted underline transition-colors hover:bg-secondary-soft hover:text-secondary"
					>
						Clique para entrar
					</button>
				{/if}
			</div>
		</div>
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
