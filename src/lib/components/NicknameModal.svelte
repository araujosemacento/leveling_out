<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import IconVial from '~icons/game-icons/vial';
	import IconArrowRight from '~icons/lucide/arrow-right';

	type StatusConexao = 'VERIFICANDO' | 'AGUARDANDO_APELIDO' | 'CONECTANDO' | 'CONECTADO' | 'ERRO';

	let {
		isOpen,
		roomCode,
		statusConexao,
		erroIngresso,
		rawNickname = $bindable(''),
		cleanNickname,
		onSubmit
	} = $props<{
		isOpen: boolean;
		roomCode: string;
		statusConexao: StatusConexao;
		erroIngresso: string;
		rawNickname: string;
		cleanNickname: string;
		onSubmit: (e: SubmitEvent) => void;
	}>();
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
		transition:fade={{ duration: 200 }}
	>
		<div
			class="flex w-full max-w-md flex-col items-center rounded-3xl border border-border-subtle bg-bg-base p-6 shadow-2xl sm:p-8"
			in:fly={{ y: 20, duration: 300 }}
		>
			<div
				class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
			>
				<IconVial class="h-8 w-8" />
			</div>

			<h2 class="text-center font-subheading text-xl text-text-primary sm:text-2xl">
				Identifique-se para entrar
			</h2>

			<p class="mt-1.5 text-center font-util-body text-xs text-text-muted sm:text-sm">
				Você está prestes a ingressar na sala <strong class="font-code text-accent"
					>{roomCode}</strong
				>
			</p>

			<form onsubmit={onSubmit} class="mt-6 flex w-full flex-col items-center">
				<div class="relative w-full">
					<input
						type="text"
						bind:value={rawNickname}
						placeholder="Seu apelido..."
						maxlength="20"
						required
						autocomplete="off"
						spellcheck="false"
						disabled={statusConexao === 'CONECTANDO'}
						class="w-full border-b-2 border-border-medium bg-transparent px-3 py-3 text-center font-subheading text-2xl text-text-primary placeholder:text-text-subtle/50 focus:border-accent focus:outline-none sm:text-3xl"
					/>
				</div>

				{#if erroIngresso}
					<div
						class="mt-4 rounded-xl border border-secondary/30 bg-secondary-soft px-4 py-2.5 text-center text-xs text-secondary"
					>
						<span class="font-util-body font-semibold">{erroIngresso}</span>
					</div>
				{/if}

				<button
					type="submit"
					disabled={statusConexao === 'CONECTANDO' || !cleanNickname.trim()}
					class="btn-soft-elevated group mt-7 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-util-heading text-sm font-semibold tracking-wide disabled:pointer-events-none disabled:opacity-50"
				>
					<span>
						{statusConexao === 'CONECTANDO' ? 'Validando no servidor...' : 'Entrar na Sala'}
					</span>
					<IconArrowRight
						class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
					/>
				</button>
			</form>
		</div>
	</div>
{/if}
