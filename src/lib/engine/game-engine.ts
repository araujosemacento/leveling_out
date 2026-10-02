/**
 * Motor Canônico Reativo: GameEngine
 * Orquestra o ciclo de vida da partida com arquitetura Input -> Update -> Render.
 * Desacoplado do DOM e do Svelte, permitindo testes headless com bun test.
 */

import {
	createRematchAction,
	createSelectSpectrumAction,
	createSetPlayerAction,
	createSubmitClueAction,
	createSubmitGuessAction,
	createSubmitPptAction,
	createSwitchTeamAction,
	createUpdateSliderAction
} from './input';
import {
	getPlayerRoleProjection,
	getRoundSpectrumProjection,
	getScoreBoardProjection,
	getTubeProjection,
	type PlayerRoleProjection,
	type ScoreBoardProjection,
	type SpectrumProjection,
	type TubeProjection
} from './render';
import { createInitialGameState, gameReducer } from './update';
import type { GameAction, GameState, Player, PptMove, SpectrumCard, TeamId } from './types';

export type StateListener = (state: GameState, action: GameAction) => void;

export class GameEngine {
	private state: GameState;
	private listeners: Set<StateListener> = new Set();

	constructor(salaCodigo: string, initialState?: Partial<GameState>) {
		this.state = {
			...createInitialGameState(salaCodigo),
			...initialState
		};
	}

	/**
	 * Obtém uma cópia imutável do estado atual.
	 */
	public getState(): Readonly<GameState> {
		return this.state;
	}

	/**
	 * Fase de Update Canônica:
	 * Processa a ação, atualiza o estado interno e notifica os observadores registrados.
	 */
	public dispatch(action: GameAction): Readonly<GameState> {
		this.state = gameReducer(this.state, action);
		this.notify(action);
		return this.state;
	}

	/**
	 * Registra um ouvinte para receber deltas de estado (Fase de Render).
	 * Retorna a função de cancelamento da inscrição.
	 */
	public subscribe(listener: StateListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify(action: GameAction): void {
		for (const listener of this.listeners) {
			try {
				listener(this.state, action);
			} catch (err) {
				console.error('[GameEngine] Erro no ouvinte de estado:', err);
			}
		}
	}

	// =========================================================================
	// Fase de Input: Normalização e Disparo de Intenções do Jogador
	// =========================================================================

	public setPlayer(id: string, nome: string, equipe: TeamId): void {
		this.dispatch(createSetPlayerAction(id, nome, equipe));
	}

	public selectTeam(playerId: string, equipe: TeamId): void {
		this.dispatch(createSwitchTeamAction(playerId, equipe));
	}

	public submitPptMove(move: PptMove): void {
		this.dispatch(createSubmitPptAction(move));
	}

	public selectSpectrumCard(carta: SpectrumCard): void {
		this.dispatch(createSelectSpectrumAction(carta));
	}

	public submitClue(dica: string): void {
		this.dispatch(createSubmitClueAction(dica));
	}

	public updateSliderPreview(palpite: number): void {
		this.dispatch(createUpdateSliderAction(palpite));
	}

	public submitGuess(palpite: number): void {
		this.dispatch(createSubmitGuessAction(palpite));
	}

	public rematch(): void {
		this.dispatch(createRematchAction());
	}

	// =========================================================================
	// Fase de Update: Reconciliação Autoritativa de Rede (PocketBase SSE)
	// =========================================================================

	public reconcileFullSync(payload: {
		sala: any;
		jogadores?: Player[];
		rodada?: any;
		pptStatus?: any;
	}): void {
		this.dispatch({
			type: 'FULL_SYNC',
			payload
		});
	}

	public reconcilePptResolution(
		vencedor: TeamId | 'EMPATE',
		lances: Record<TeamId, PptMove>
	): void {
		this.dispatch({
			type: 'PPT_RESOLVIDO',
			payload: { vencedor, lances }
		});
	}

	public reconcileRoundReveal(payload: {
		metaReal: number;
		palpite: number;
		pontosGanhos: number;
		placarA: number;
		placarB: number;
		vencedorPartida?: TeamId | null;
	}): void {
		this.dispatch({
			type: 'RODADA_REVELADA',
			payload
		});
	}

	public reconcilePresence(jogadores: Player[]): void {
		this.dispatch({
			type: 'PLAYER_PRESENCE_UPDATE',
			payload: { jogadores }
		});
	}

	// =========================================================================
	// Fase de Render: Projeções Puras UI = f(State)
	// =========================================================================

	public getTubeProjection(playerId: string | null = this.state.meuJogadorId): TubeProjection {
		return getTubeProjection(this.state, playerId);
	}

	public getRoleProjection(
		playerId: string | null = this.state.meuJogadorId
	): PlayerRoleProjection {
		return getPlayerRoleProjection(this.state, playerId);
	}

	public getScoreBoardProjection(): ScoreBoardProjection {
		return getScoreBoardProjection(this.state);
	}

	public getSpectrumProjection(): SpectrumProjection {
		return getRoundSpectrumProjection(this.state);
	}
}
