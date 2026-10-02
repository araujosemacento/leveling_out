import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';

/**
 * Retorna a URL base do PocketBase de acordo com as variáveis de ambiente ou build.
 *
 * Ordem de precedência:
 * 1. env.PUBLIC_ENVIRONMENT === 'production'  -> env.PUBLIC_PROD_URL
 * 2. env.PUBLIC_ENVIRONMENT === 'development' -> env.PUBLIC_DEV_URL
 * 3. Fallback nativo:
 *    - Se dev (Vite local): http://localhost:8090
 *    - Se build de produção: env.PUBLIC_BACKEND_URL ou fallback local
 */
export function getBackendUrl(): string {
	const forcedEnv = env.PUBLIC_ENVIRONMENT ? env.PUBLIC_ENVIRONMENT.toLowerCase() : null;

	if (forcedEnv === 'production') {
		return env.PUBLIC_PROD_URL || 'http://localhost:8090';
	}

	if (forcedEnv === 'development') {
		return env.PUBLIC_DEV_URL || 'http://localhost:8090';
	}

	if (dev) {
		return 'http://localhost:8090';
	}

	return env.PUBLIC_BACKEND_URL || 'http://localhost:8090';
}
