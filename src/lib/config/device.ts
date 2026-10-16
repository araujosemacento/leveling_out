/**
 * Módulo de Gerenciamento de Identidade Resiliente do Dispositivo
 * Persiste o identificador de dispositivo (deviceId) através de tripla camada
 * (localStorage + Cookie de longa duração + sessionStorage com auto-cura),
 * impedindo que uma limpeza superficial de localStorage burle a autoridade de moderação.
 */

const DEVICE_ID_KEY = 'leveling_device_id';

function lerCookie(nome: string): string | null {
	if (typeof document === 'undefined') return null;
	try {
		const match = document.cookie.match(new RegExp('(?:^|; )' + nome + '=([^;]*)'));
		return match ? decodeURIComponent(match[1]) : null;
	} catch {
		return null;
	}
}

function gravarCookie(nome: string, valor: string): void {
	if (typeof document === 'undefined') return;
	try {
		document.cookie = `${nome}=${encodeURIComponent(valor)}; path=/; max-age=31536000; SameSite=Lax`;
	} catch {
		/* empty */
	}
}

/**
 * Obtém ou gera um identificador único, persistente e auto-curável do dispositivo.
 */
export function getOrCreateDeviceId(): string {
	if (typeof window === 'undefined') {
		return '';
	}

	try {
		let deviceId: string | null = null;

		// 1. Tenta recuperar do localStorage
		if (window.localStorage) {
			deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
		}

		// 2. Se não encontrou, tenta recuperar do Cookie persistente
		if (!deviceId) {
			deviceId = lerCookie(DEVICE_ID_KEY);
		}

		// 3. Se não encontrou, tenta recuperar da sessionStorage da aba
		if (!deviceId && window.sessionStorage) {
			deviceId = window.sessionStorage.getItem(DEVICE_ID_KEY);
		}

		// 4. Se não existe em nenhuma camada, gera um novo UUID único
		if (!deviceId) {
			deviceId = 'dev_' + crypto.randomUUID().slice(0, 16);
		}

		// 5. Auto-cura: sincroniza o identificador em todas as camadas disponíveis
		if (window.localStorage) {
			window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
		}
		gravarCookie(DEVICE_ID_KEY, deviceId);
		if (window.sessionStorage) {
			window.sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
		}

		return deviceId;
	} catch {
		return 'dev_fallback';
	}
}
