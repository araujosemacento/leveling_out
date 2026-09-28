// tests/visual_stepper.js
import { chromium } from 'playwright';

async function main() {
	console.log('[Playwright Visual Stepper] Iniciando navegador Chromium...');

	const executablePath = process.env.BROWSER_PATH || '/usr/bin/helium';
	console.log(`[Playwright Visual Stepper] Utilizando executável: ${executablePath}`);

	const devEmail = process.env.DEV_EMAIL;
	const devPassword = process.env.DEV_PASSWORD;

	const browser = await chromium.launch({
		executablePath,
		headless: false,
		args: ['--start-maximized']
	});

	const context = await browser.newContext({
		viewport: null
	});

	const page = await context.newPage();

	const targetUrl = process.env.TEST_URL || 'http://localhost:5173/teste/leveling-out';
	console.log(`[Playwright Visual Stepper] Navegando para ${targetUrl}...`);

	try {
		await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
		console.log('[Playwright Visual Stepper] Página acessada.');

		// Verifica se o Auth Gate de desenvolvedor está ativo
		const loginForm = page.locator('#dev-login-form');
		const isLoginFormPresent = await loginForm.isVisible({ timeout: 2500 }).catch(() => false);

		if (isLoginFormPresent) {
			if (devEmail && devPassword) {
				console.log(
					`[Playwright Visual Stepper] Auth Gate detectado. Autenticando com ${devEmail}...`
				);
				await page.fill('#dev-email', devEmail);
				await page.fill('#dev-password', devPassword);
				await page.click('#btn-login-dev');

				// Aguarda exibição do HUD da bancada após autenticação
				await page.waitForSelector('#debugger-hud', { timeout: 10000 });
				console.log('[Playwright Visual Stepper] Sessão autorizada com sucesso pelo PocketBase.');
			} else {
				console.log('[Playwright Visual Stepper] Auth Gate ativo no navegador.');
				console.log(
					'[Playwright Visual Stepper] Nenhuma credencial informada em DEV_EMAIL e DEV_PASSWORD.'
				);
				console.log(
					'[Playwright Visual Stepper] Insira suas credenciais verificadas na janela aberta do navegador.'
				);
				await page.waitForSelector('#debugger-hud', { timeout: 120000 });
				console.log('[Playwright Visual Stepper] Login efetuado com sucesso pelo desenvolvedor.');
			}
		} else {
			await page.waitForSelector('#debugger-hud', { timeout: 10000 });
			console.log('[Playwright Visual Stepper] Sessão previamente ativa identificada.');
		}

		// Verifica estado do Overlay Shroud de bloqueio físico do canvas
		const isLocked = await page
			.locator('[data-testid="canvas-overlay-a"]')
			.isVisible({ timeout: 2000 })
			.catch(() => false);
		console.log(
			`[Playwright Visual Stepper] Proteção do Canvas: ${isLocked ? 'ATIVADA (Overlay Shroud interceptando cliques)' : 'DESATIVADA'}`
		);

		console.log('[Playwright Visual Stepper] Bancada pronta para uso.');
		console.log(
			'[Playwright Visual Stepper] Utilize a barra de ferramentas no topo para conduzir os passos.'
		);

		// Mantém o navegador aberto para o desenvolvedor interagir
		await new Promise((resolve) => {
			browser.on('disconnected', resolve);
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[Playwright Visual Stepper] Erro durante execução:', msg);
		console.log('Certifique-se de que o PocketBase e o Vite dev server estão ativos.');
		await browser.close();
	}
}

main().catch(console.error);
