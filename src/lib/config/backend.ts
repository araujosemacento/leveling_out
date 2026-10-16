import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';

/**
 * Retorna a URL base do servidor Go nativo de acordo com as variáveis de ambiente ou build.
 *
 * Ordem de precedência:
 * 1. env.PUBLIC_ENVIRONMENT === 'production'  -> env.PUBLIC_PROD_URL
 * 2. env.PUBLIC_ENVIRONMENT === 'development' -> env.PUBLIC_DEV_URL
 * 3. Fallback nativo:
 *    - Se dev (Vite local): http://localhost:8080
 *    - Se build de produção: env.PUBLIC_BACKEND_URL ou fallback local
 */
export function getBackendUrl(): string {
	const forcedEnv = env.PUBLIC_ENVIRONMENT ? env.PUBLIC_ENVIRONMENT.toLowerCase() : null;

	if (forcedEnv === 'production') {
		const prodUrl = env.PUBLIC_PROD_URL || env.PUBLIC_BACKEND_URL || 'http://localhost:8090';
		return prodUrl.replace(/\/+$/, '');
	}

	if (forcedEnv === 'development') {
		const devUrl = env.PUBLIC_DEV_URL || 'http://localhost:8090';
		return devUrl.replace(/\/+$/, '');
	}

	if (dev) {
		return (env.PUBLIC_DEV_URL || 'http://localhost:8090').replace(/\/+$/, '');
	}

	const fallback = env.PUBLIC_PROD_URL || env.PUBLIC_BACKEND_URL || 'http://localhost:8090';
	return fallback.replace(/\/+$/, '');
}

/**
 * Retorna a chave pública de serviço do proxy reverso se definida no ambiente.
 * Suporta a chave canônica PUBLIC_PROXY_SECRET com fallback retrocompatível para PUBLIC_PB_PROXY_SECRET.
 */
export function getProxySecret(): string {
	return env.PUBLIC_PROXY_SECRET || env.PUBLIC_PB_PROXY_SECRET || '';
}
