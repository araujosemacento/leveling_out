<script lang="ts">
	import IconShieldAlert from '~icons/lucide/shield-alert';
	import IconClock from '~icons/lucide/clock';
	import IconTrash2 from '~icons/lucide/trash-2';

	let { playerName, onWait, onDissolveRoom } = $props<{
		playerName: string;
		onWait: () => void;
		onDissolveRoom: () => void;
	}>();
</script>

<div
	role="alert"
	class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-primary/45 bg-primary-soft/90 px-5 py-3.5 shadow-sm shadow-primary/10 transition-all"
>
	<div class="flex items-center gap-3">
		<div
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/20 text-primary-hover shadow-xs dark:text-amber-300"
		>
			<IconShieldAlert class="h-5 w-5" />
		</div>
		<div class="flex flex-col">
			<span
				class="font-util-heading text-xs font-black tracking-wider text-amber-900 uppercase dark:text-amber-300"
			>
				Aviso de Desconexão
			</span>
			<span class="font-util-body text-xs text-amber-950/80 dark:text-amber-100/80">
				O jogador <strong class="font-bold text-amber-950 dark:text-amber-100">{playerName}</strong>
				perdeu a conexão com o servidor.
			</span>
		</div>
	</div>

	<div class="flex items-center gap-2.5">
		<button
			type="button"
			onclick={onWait}
			class="flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-primary/40 bg-primary/20 px-3.5 py-2 font-util-heading text-xs font-bold text-amber-950 transition hover:border-primary/60 hover:bg-primary/30 active:scale-95 dark:border-primary/50 dark:bg-primary/25 dark:text-amber-100 dark:hover:bg-primary/35"
		>
			<span>Aguardar</span>
			<IconClock class="h-3.5 w-3.5 text-primary-hover dark:text-amber-300" />
		</button>

		<button
			type="button"
			onclick={onDissolveRoom}
			class="flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-red-500/40 bg-red-500/15 px-3.5 py-2 font-util-heading text-xs font-bold text-red-950 transition hover:border-red-500/60 hover:bg-red-500/25 active:scale-95 dark:border-red-500/50 dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/30"
		>
			<span>Desfazer Sala</span>
			<IconTrash2 class="h-3.5 w-3.5 text-red-700 dark:text-red-300" />
		</button>
	</div>
</div>
