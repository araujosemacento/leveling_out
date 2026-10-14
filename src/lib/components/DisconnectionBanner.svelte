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
	class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-amber-800 dark:text-amber-200"
>
	<div class="flex items-center gap-2.5">
		<IconShieldAlert class="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
		<div class="flex flex-col">
			<span class="font-util-heading text-xs font-bold tracking-wider uppercase">
				Aviso de Desconexão
			</span>
			<span class="font-util-body text-xs">
				O jogador <strong class="font-semibold">{playerName}</strong> perdeu a conexão com o servidor.
			</span>
		</div>
	</div>

	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={onWait}
			class="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 font-util-heading text-xs font-semibold text-amber-800 transition hover:bg-amber-500/30 dark:text-amber-200"
		>
			<span>Aguardar</span>
			<IconClock class="h-3.5 w-3.5" />
		</button>

		<button
			type="button"
			onclick={onDissolveRoom}
			class="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 font-util-heading text-xs font-semibold text-red-700 transition hover:bg-red-500/30 dark:text-red-300"
		>
			<span>Desfazer Sala</span>
			<IconTrash2 class="h-3.5 w-3.5" />
		</button>
	</div>
</div>
