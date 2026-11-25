import { describe, expect, test } from 'bun:test';
import {
	SANDBOX_PRESETS,
	SANDBOX_PLAYERS,
	PRESET_SEQUENCE,
	projectSnapshotForPlayer
} from './presets';
import { GameSocket, sandboxController } from './mocks/mock-game-socket';
import { GameEngine } from '$lib/engine';

describe('Sandbox Test Harness', () => {
	test('todos os 21 presets canônicos estão catalogados e consistentes', () => {
		expect(PRESET_SEQUENCE.length).toBe(21);
		expect(PRESET_SEQUENCE.length).toBe(Object.keys(SANDBOX_PRESETS).length);

		for (const id of PRESET_SEQUENCE) {
			const preset = SANDBOX_PRESETS[id];
			expect(preset).toBeDefined();
			expect(preset.id).toBe(id);
			expect(preset.titulo.length).toBeGreaterThan(0);
			expect(preset.snapshot).toBeDefined();
			expect(typeof preset.snapshot.fase).toBe('string');
			expect(SANDBOX_PLAYERS[preset.defaultPovId]).toBeDefined();
		}
	});

	test('garante Zero Trust na projeção de snapshots para cada jogador', () => {
		// 1. Fase de Dica: Somente Codificador (p1) enxerga metaOculta e diff permanece oculto
		const rawDica = SANDBOX_PRESETS.rodada_dica.snapshot;
		const projCodificador = projectSnapshotForPlayer(rawDica, 'p1');
		const projPalpiteiro = projectSnapshotForPlayer(rawDica, 'p2');
		const projAdversario = projectSnapshotForPlayer(rawDica, 'p3');
		const projEspectador = projectSnapshotForPlayer(rawDica, 'p_spec');

		expect(projCodificador.rodadaAtiva?.metaOculta).toBe(72);
		expect(projCodificador.rodadaAtiva?.diff).toBeNull();
		expect(projPalpiteiro.rodadaAtiva?.metaOculta).toBeNull();
		expect(projPalpiteiro.rodadaAtiva?.diff).toBeNull();
		expect(projAdversario.rodadaAtiva?.metaOculta).toBeNull();
		expect(projEspectador.rodadaAtiva?.metaOculta).toBeNull();

		// 2. Fase de Palpite: Continua blindado para o Palpiteiro e Adversário (mesmo se diff vier preenchido no raw)
		const rawPalpite = {
			...SANDBOX_PRESETS.rodada_palpite.snapshot,
			rodadaAtiva: {
				...SANDBOX_PRESETS.rodada_palpite.snapshot.rodadaAtiva,
				diff: 22
			}
		};
		const projPalp2 = projectSnapshotForPlayer(rawPalpite, 'p2');
		const projCod2 = projectSnapshotForPlayer(rawPalpite, 'p1');
		expect(projPalp2.rodadaAtiva?.metaOculta).toBeNull();
		expect(projPalp2.rodadaAtiva?.diff).toBeNull();
		expect(projCod2.rodadaAtiva?.diff).toBeNull();

		// 3. Fase de Revelação (RODADA_REVELACAO e REVELACAO): Meta real e diff abertos para todos
		const rawRevelacao = SANDBOX_PRESETS.rodada_revelacao.snapshot;
		const projRevPalpiteiro = projectSnapshotForPlayer(rawRevelacao, 'p2');
		const projRevAdversario = projectSnapshotForPlayer(rawRevelacao, 'p3');
		expect(projRevPalpiteiro.rodadaAtiva?.metaOculta).toBe(72);
		expect(projRevAdversario.rodadaAtiva?.metaOculta).toBe(72);
		expect(projRevPalpiteiro.rodadaAtiva?.diff).toBe(1);

		const rawRevGo = SANDBOX_PRESETS.rodada_revelacao_muito_perto.snapshot;
		const projRevGo = projectSnapshotForPlayer(rawRevGo, 'p2');
		expect(projRevGo.rodadaAtiva?.metaOculta).toBe(64);
		expect(projRevGo.rodadaAtiva?.diff).toBe(4);

		// 4. Fase FIM_JOGO: Meta real e diff abertos
		const rawFimGo = SANDBOX_PRESETS.fim_de_jogo_vitoria.snapshot;
		const projFimGo = projectSnapshotForPlayer(rawFimGo, 'p3');
		expect(projFimGo.rodadaAtiva?.metaOculta).toBe(72);
		expect(projFimGo.rodadaAtiva?.diff).toBe(1);

		// 5. Disputa de PPT: Lances ocultos durante escolha
		const rawPpt = SANDBOX_PRESETS.ppt_escolha.snapshot;
		const projPptA = projectSnapshotForPlayer(rawPpt, 'p1');
		const projPptB = projectSnapshotForPlayer(rawPpt, 'p3');
		expect(projPptA.ppt?.lanceA).toBeNull();
		expect(projPptA.ppt?.lanceB).toBeNull();
		expect(projPptB.ppt?.lanceA).toBeNull();
		expect(projPptB.ppt?.lanceB).toBeNull();
	});

	test('todos os 21 snapshots são ingeridos com sucesso pelo GameEngine de produção', () => {
		for (const id of PRESET_SEQUENCE) {
			const preset = SANDBOX_PRESETS[id];
			const engine = new GameEngine('SALA-DEV');
			const projected = projectSnapshotForPlayer(preset.snapshot, preset.defaultPovId);

			expect(() => {
				engine.reconcileFullSync(projected);
				engine.getLobbyProjection(preset.defaultPovId);
				engine.getPptProjection(preset.defaultPovId);
				engine.getSpectrumPickerProjection(preset.defaultPovId);
				engine.getTubeProjection(preset.defaultPovId);
				engine.getRoleProjection(preset.defaultPovId);
				engine.getSpectrumProjection();
				engine.getScoreBoardProjection();
				engine.getRevealProjection(preset.defaultPovId);
				engine.getVictoryProjection(preset.defaultPovId);
			}).not.toThrow();
		}
	});

	test('SandboxController gerencia troca de POV, presets e histórico de ações', () => {
		sandboxController.loadPreset('lobby_quorum_completo');
		expect(sandboxController.activePresetId).toBe('lobby_quorum_completo');
		expect(sandboxController.activePovId).toBe('p1');

		sandboxController.setPov('p2');
		expect(sandboxController.activePovId).toBe('p2');

		sandboxController.stepNextPreset();
		expect(sandboxController.activePresetId).toBe('ppt_escolha');

		sandboxController.stepPrevPreset();
		expect(sandboxController.activePresetId).toBe('lobby_quorum_completo');

		sandboxController.setScores(7, 3);
		expect(sandboxController.rawSnapshot.placarA).toBe(7);
		expect(sandboxController.rawSnapshot.placarB).toBe(3);

		expect(sandboxController.actionLog.length).toBeGreaterThan(0);
	});

	test('CONFIRMAR_PALPITE calcula pontuação real, acumula placar e registra histórico', () => {
		sandboxController.autoAdvanceReveal = false;

		// Caso +4 (Na Mosca)
		sandboxController.loadPreset('rodada_palpite');
		sandboxController.setHiddenTarget(72);
		const socket = new GameSocket({});
		socket.conectar('SALA-DEV', 'p2', 'mock-token', 'Beta');

		socket.moverSlider(71);
		socket.confirmarPalpite();

		expect(sandboxController.rawSnapshot.fase).toBe('REVELACAO');
		expect(sandboxController.rawSnapshot.placarA).toBe(4);
		expect(sandboxController.rawSnapshot.rodadaAtiva?.pontos).toBe(4);
		expect(sandboxController.rawSnapshot.rodadaAtiva?.tier).toBe('NA_MOSCA');
		expect(sandboxController.rawSnapshot.rodadaAtiva?.diff).toBe(1);
		expect(sandboxController.rawSnapshot.historico?.length).toBe(1);

		// Caso 0 (Fora da Margem -> FORA_DA_MARGEM)
		sandboxController.loadPreset('rodada_palpite');
		sandboxController.setHiddenTarget(82);
		socket.moverSlider(45);
		socket.confirmarPalpite();

		expect(sandboxController.rawSnapshot.placarA).toBe(0);
		expect(sandboxController.rawSnapshot.rodadaAtiva?.pontos).toBe(0);
		expect(sandboxController.rawSnapshot.rodadaAtiva?.tier).toBe('FORA_DA_MARGEM');
		expect(sandboxController.rawSnapshot.rodadaAtiva?.diff).toBe(37);

		// Disparos rápidos por tier e replay
		sandboxController.triggerRevealWithScore('MUITO_PERTO');
		expect(sandboxController.rawSnapshot.rodadaAtiva?.pontos).toBe(3);
		expect(sandboxController.rawSnapshot.rodadaAtiva?.tier).toBe('MUITO_PERTO');

		const nonceAntes = sandboxController.animationNonce;
		sandboxController.replayCurrentAnimation();
		expect(sandboxController.animationNonce).toBe(nonceAntes + 1);

		// Revanche e Desfazer preservam jogadores e zeram placar/histórico
		socket.revanche();
		expect(sandboxController.rawSnapshot.fase).toBe('INICIATIVA');
		expect(sandboxController.rawSnapshot.placarA).toBe(0);
		expect(sandboxController.rawSnapshot.placarB).toBe(0);
		expect(sandboxController.rawSnapshot.historico?.length).toBe(0);
		expect(sandboxController.rawSnapshot.jogadores?.length).toBe(4);

		socket.desfazerPartida();
		expect(sandboxController.rawSnapshot.fase).toBe('LOBBY');
		expect(sandboxController.rawSnapshot.jogadores?.length).toBe(4);

		sandboxController.autoAdvanceReveal = true;
		sandboxController.clearTimers();
	});

	test('MockGameSocket responde aos callbacks e orquestra ações da partida', () => {
		let welcomeReceived = false;
		let syncSnapshotReceived = false;
		let sliderStreamVal = 0;

		const socket = new GameSocket({
			onWelcome: (data) => {
				welcomeReceived = true;
				expect(data.salaCodigo).toBe('SALA-DEV');
			},
			onSync: (snapshot) => {
				syncSnapshotReceived = true;
				expect(snapshot.codigo).toBe('SALA-DEV');
			},
			onSliderStream: (pos) => {
				sliderStreamVal = pos;
			}
		});

		expect(socket.getStatus()).toBe('DESCONECTADO');

		socket.conectar('SALA-DEV', 'p1', 'mock-token', 'Alfa');
		expect(socket.getStatus()).toBe('CONECTADO');
		expect(welcomeReceived).toBe(true);
		expect(syncSnapshotReceived).toBe(true);

		// Ações da partida
		socket.moverSlider(85);
		expect(sliderStreamVal).toBe(85);

		socket.escolherEquipe('B');
		const alice = sandboxController.rawSnapshot.jogadores?.find(
			(j) => (j.playerId || j.id) === 'p1'
		);
		expect(alice?.equipe).toBe('B');

		socket.iniciarPartida();
		expect(sandboxController.activePresetId).toBe('ppt_escolha');

		socket.desconectar();
		expect(socket.getStatus()).toBe('DESCONECTADO');
		sandboxController.clearTimers();
	});

	test('previne loops infinitos de notificacao ao conectar e trocar POVs/presets', () => {
		sandboxController.loadPreset('lobby_quorum_completo');

		let notifyCount = 0;
		const unsub = sandboxController.subscribe(() => {
			notifyCount += 1;
		});

		const socket = new GameSocket({});
		// conectar() em um preset normal NAO deve disparar notify() para nao causar remount recursivo
		socket.conectar('SALA-DEV', 'p1', 'mock-token', 'Alfa');
		expect(notifyCount).toBe(0);

		// Cada troca de POV dispara exatamente 1 notificacao (sem cascata)
		sandboxController.setPov('p2');
		expect(notifyCount).toBe(1);

		sandboxController.setPov('p3');
		expect(notifyCount).toBe(2);

		// Carregar um preset dispara exatamente 1 notificacao
		sandboxController.loadPreset('rodada_palpite');
		expect(notifyCount).toBe(3);

		// Mover slider para o mesmo valor atual (50 no preset rodada_palpite) nao dispara notificacao redundante
		socket.moverSlider(50);
		expect(notifyCount).toBe(3);

		// Mover para novo valor dispara exatamente 1 notificacao
		socket.moverSlider(80);
		expect(notifyCount).toBe(4);

		// Repetir o mesmo valor 80 nao dispara notificacao redundante
		socket.moverSlider(80);
		expect(notifyCount).toBe(4);

		unsub();
		sandboxController.clearTimers();
	});
});
