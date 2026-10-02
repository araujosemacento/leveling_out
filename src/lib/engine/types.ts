/**
 * Tipos e Contratos Canônicos do Jogo Leveling Out
 * Define fases, modelos de estado e ações de jogo tipadas via discriminated unions.
 */

export type GamePhase =
	| 'LOBBY'
	| 'PPT_DISPUTA'
	| 'PPT_RESULTADO'
	| 'ESCOLHA_CARTA'
	| 'RODADA_DICA'
	| 'RODADA_PALPITE'
	| 'RODADA_REVELACAO'
	| 'VITORIA';

export type TeamId = 'A' | 'B';

export type PlayerRole = 'CODIFICADOR' | 'PALPITEIRO' | 'ESPECTADOR';

export type PptMove = 'pedra' | 'papel' | 'tesoura';

export type PptResult = 'VITÓRIA' | 'DERROTA' | 'EMPATE';

export interface SpectrumCard {
	id: string;
	left: string;
	right: string;
}

export type ScoreTier = 'NA_MOSCA' | 'MUITO_PERTO' | 'PERTO' | 'ERRO';

export interface ScoreResult {
	points: number;
	diff: number;
	tier: ScoreTier;
	label: string;
}

export interface Player {
	id: string;
	nome: string;
	equipe: TeamId;
	isOnline: boolean;
	lastSeen?: string;
}

export interface TeamState {
	id: TeamId;
	nome: string;
	pontos: number;
	membros: Player[];
}

export interface RoundState {
	numero: number;
	equipeAtiva: TeamId;
	codificadorId: string | null;
	palpiteiroId: string | null;
	carta: SpectrumCard | null;
	/**
	 * Meta secreta em porcentagem [0, 100].
	 * Princípio Zero Trust: permanece estritamente null para não-codificadores
	 * até o evento autoritativo de revelação do servidor.
	 */
	metaOculta: number | null;
	dica: string | null;
	palpite: number | null;
	resultado: ScoreResult | null;
	revelada: boolean;
}

export interface GameState {
	salaCodigo: string;
	fase: GamePhase;
	equipes: Record<TeamId, TeamState>;
	equipeAtiva: TeamId;
	rodadaAtual: RoundState;
	historicoRodadas: RoundState[];
	metaPontuacao: number;
	vencedor: TeamId | null;
	meuJogadorId: string | null;
	minhaEquipe: TeamId | null;
}

/**
 * Ações de Jogo estruturadas por União Discriminada.
 * Desacopla intenções locais de usuário de reconciliações de rede autoritativas do PocketBase.
 */
export type GameAction =
	// Intenções de entrada local do usuário
	| { type: 'SET_PLAYER'; payload: { id: string; nome: string; equipe: TeamId } }
	| { type: 'SELECT_TEAM'; payload: { playerId: string; equipe: TeamId } }
	| { type: 'SUBMIT_PPT_INTENT'; payload: { move: PptMove } }
	| { type: 'SELECT_SPECTRUM_INTENT'; payload: { carta: SpectrumCard } }
	| { type: 'SUBMIT_CLUE_INTENT'; payload: { dica: string } }
	| { type: 'UPDATE_SLIDER_PREVIEW'; payload: { palpite: number } }
	| { type: 'SUBMIT_GUESS_INTENT'; payload: { palpite: number } }
	| { type: 'REMATCH_INTENT' }
	// Reconciliações autoritativas de rede (SSE / Backend PocketBase)
	| {
			type: 'FULL_SYNC';
			payload: {
				sala: {
					codigo: string;
					fase: GamePhase;
					placar_a: number;
					placar_b: number;
					equipe_da_vez?: TeamId;
					rodada_atual: number;
					vencedor?: string | null;
				};
				jogadores?: Player[];
				rodada?: {
					numero: number;
					fase: string;
					dica?: string | null;
					palpite?: number | null;
					meta_oculta?: number | null;
					carta_espectro?: SpectrumCard | null;
					codificador_id?: string | null;
					palpiteiro_id?: string | null;
				};
				pptStatus?: {
					status: string;
					vencedor?: TeamId | 'EMPATE';
					lances?: Record<TeamId, PptMove>;
					equipes_enviadas?: TeamId[];
				};
			};
	  }
	| {
			type: 'SALA_UPDATE';
			payload: {
				placarA: number;
				placarB: number;
				rodadaAtual: number;
				vencedor?: TeamId | null;
				equipeAtiva?: TeamId;
			};
	  }
	| {
			type: 'PPT_RESOLVIDO';
			payload: {
				vencedor: TeamId | 'EMPATE';
				lances: Record<TeamId, PptMove>;
			};
	  }
	| {
			type: 'RODADA_UPDATE';
			payload: {
				numero: number;
				fase: GamePhase;
				carta?: SpectrumCard | null;
				dica?: string | null;
				palpite?: number | null;
				metaOcultaSecreta?: number | null; // Visível exclusivamente para o codificador
			};
	  }
	| {
			type: 'RODADA_REVELADA';
			payload: {
				metaReal: number;
				palpite: number;
				pontosGanhos: number;
				placarA: number;
				placarB: number;
				vencedorPartida?: TeamId | null;
			};
	  }
	| {
			type: 'PLAYER_PRESENCE_UPDATE';
			payload: {
				jogadores: Player[];
			};
	  };
