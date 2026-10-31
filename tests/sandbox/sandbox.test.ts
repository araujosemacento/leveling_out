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
	test('todos os 15 presets canônicos estão catalogados e consistentes', () => {
		expect(PRESET_SEQUENCE.length).toBe(15);
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
		// 1. Fase de Dica: Somente Codificador (p1) enxerga metaOculta
		const rawDica = SANDBOX_PRESETS.rodada_dica.snapshot;
		const projCodificador = projectSnapshotForPlayer(rawDica, 'p1');
		const projPalpiteiro = projectSnapshotForPlayer(rawDica, 'p2');
		const projAdversario = projectSnapshotForPlayer(rawDica, 'p3');
		const projEspectador = projectSnapshotForPlayer(rawDica, 'p_spec');

		expect(projCodificador.rodadaAtiva?.metaOculta).toBe(72);
		expect(projPalpiteiro.rodadaAtiva?.metaOculta).toBeNull();
		expect(projAdversario.rodadaAtiva?.metaOculta).toBeNull();
		expect(projEspectador.rodadaAtiva?.metaOculta).toBeNull();

		// 2. Fase de Palpite: Continua blindado para o Palpiteiro e Adversário
		const rawPalpite = SANDBOX_PRESETS.rodada_palpite.snapshot;
		const projPalp2 = projectSnapshotForPlayer(rawPalpite, 'p2');
		expect(projPalp2.rodadaAtiva?.metaOculta).toBeNull();

		// 3. Fase de Revelação: Meta real aberta para todos
		const rawRevelacao = SANDBOX_PRESETS.rodada_revelacao.snapshot;
		const projRevPalpiteiro = projectSnapshotForPlayer(rawRevelacao, 'p2');
		const projRevAdversario = projectSnapshotForPlayer(rawRevelacao, 'p3');
		expect(projRevPalpiteiro.rodadaAtiva?.metaOculta).toBe(72);
		expect(projRevAdversario.rodadaAtiva?.metaOculta).toBe(72);

		// 4. Disputa de PPT: Lances ocultos durante escolha
		const rawPpt = SANDBOX_PRESETS.ppt_escolha.snapshot;
		const projPptA = projectSnapshotForPlayer(rawPpt, 'p1');
		const projPptB = projectSnapshotForPlayer(rawPpt, 'p3');
		expect(projPptA.ppt?.lanceA).toBeNull();
		expect(projPptA.ppt?.lanceB).toBeNull();
		expect(projPptB.ppt?.lanceA).toBeNull();
		expect(projPptB.ppt?.lanceB).toBeNull();
	});

	test('todos os 15 snapshots são ingeridos com sucesso pelo GameEngine de produção', () => {
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
	});
});
