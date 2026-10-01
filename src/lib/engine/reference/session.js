// @ts-nocheck
/* eslint-disable */

/**
 * Módulo de Gerenciamento de Sessão e Identidade Local
 * Controla a persistência do ID do jogador via sessionStorage e
 * monitora eventos de visibilidade da aba para reconciliação automática.
 */

class NetworkSession {
	/**
	 * @param {string} roomCode Código da sala
	 * @param {() => void} onTabVisible Callback disparado quando a aba recupera o foco
	 */
	constructor(roomCode, onTabVisible) {
		this.roomCode = roomCode;
		this.onTabVisible = onTabVisible;
		this.playerId = this.loadOrGeneratePlayerId();
		this.setupVisibilityListener();
	}

	loadOrGeneratePlayerId() {
		try {
			if (typeof window !== 'undefined' && window.__PLAYER_ID__) {
				return window.__PLAYER_ID__;
			}
			const storageKey = `leveling_player_${this.roomCode}`;
			const saved = sessionStorage.getItem(storageKey);
			if (saved) {
				return saved;
			}
			const newId = 'player_' + Math.random().toString(36).substring(2, 8);
			sessionStorage.setItem(storageKey, newId);
			return newId;
		} catch (e) {
			return 'player_' + Math.random().toString(36).substring(2, 8);
		}
	}

	setupVisibilityListener() {
		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible' && typeof this.onTabVisible === 'function') {
					console.log('[Session] Aba visível novamente. Engatilhando reconciliação...');
					this.onTabVisible();
				}
			});
		}
	}
}
