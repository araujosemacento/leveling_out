function canVibrate(): boolean {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
	if (typeof navigator.vibrate !== 'function') return false;
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
	return true;
}

export const haptics = {
	/** Pulso seco ao cruzar marcações de 10% ou o centro (50%) no slider */
	tick(): void {
		if (canVibrate()) navigator.vibrate(8);
	},
	/** Confirmação tátil curta em cliques de confirmação (carta, dica, palpite) */
	tap(): void {
		if (canVibrate()) navigator.vibrate(16);
	},
	/** Celebração graduada na Revelação Dramática conforme o tier de sintonia */
	reveal(tier: 'NA_MOSCA' | 'MUITO_PERTO' | 'PERTO' | 'ERRO'): void {
		if (!canVibrate()) return;
		if (tier === 'NA_MOSCA') navigator.vibrate([25, 45, 65]);
		else if (tier === 'MUITO_PERTO') navigator.vibrate([20, 35, 30]);
		else if (tier === 'PERTO') navigator.vibrate(22);
		else navigator.vibrate([40, 60, 40]);
	}
};
