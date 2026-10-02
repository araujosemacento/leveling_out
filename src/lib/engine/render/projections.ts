/**
 * Projeções Puras de Renderização (Camada de Render)
 * Implementa UI = f(State) de forma desacoplada e 100% testável headless.
 *
 * Transforma o GameState bruto em ViewModels otimizados para os componentes Svelte,
 * garantindo conformidade com o princípio Zero Trust (ex.: ocultação inviolável da
 * meta secreta para o palpiteiro durante a fase de adivinhação).
 */

import type { GameState, Player, PlayerRole, TeamId } from '../types';

export interface TubeProjection {
	nivelLiquido: number;
	metaVisivel: number | null;
	isMetaOculta: boolean;
	marcadorPalpite: number;
	mostrarMenisco: boolean;
	mostrarBorbulhas: boolean;
	statusTexto: string;
	podeInteragir: boolean;
}

export interface PlayerRoleProjection {
	meuJogador: Player | null;
	minhaEquipe: TeamId | null;
	isMinhaEquipeAtiva: boolean;
	meuPapel: PlayerRole;
	podeDigitarDica: boolean;
	podeArrastarSlider: boolean;
	podeJogarPpt: boolean;
	podePedirRevanche: boolean;
	isEspectador: boolean;
	descricaoPapel: string;
}

export interface ScoreBoardProjection {
	placarA: number;
	placarB: number;
	metaPontuacao: number;
	progressoA: number;
	progressoB: number;
	equipeLider: 'A' | 'B' | 'EMPATE';
	diferencaPontos: number;
	vencedor: TeamId | null;
	statusPlacar: string;
}

export interface SpectrumProjection {
	hasCarta: boolean;
	poloEsquerdo: string;
	poloDireito: string;
	dica: string | null;
	numeroRodada: number;
	equipeAtiva: TeamId;
	equipeAtivaNome: string;
}

/**
 * Projeta o estado visual e regras de sigilo do tubo de ensaio.
 */
export function getTubeProjection(state: GameState, meuJogadorId: string | null): TubeProjection {
	const { rodadaAtual, fase } = state;
	const isCodificador = Boolean(meuJogadorId && rodadaAtual.codificadorId === meuJogadorId);
	const isPalpiteiro = Boolean(meuJogadorId && rodadaAtual.palpiteiroId === meuJogadorId);

	// 1. Fase de Revelação ou Vitória: exibe a meta real e o palpite para todos
	if (rodadaAtual.revelada || fase === 'RODADA_REVELACAO' || fase === 'VITORIA') {
		const metaReal = rodadaAtual.metaOculta ?? 50;
		return {
			nivelLiquido: metaReal,
			metaVisivel: metaReal,
			isMetaOculta: false,
			marcadorPalpite: rodadaAtual.palpite ?? 50,
			mostrarMenisco: true,
			mostrarBorbulhas: true,
			statusTexto: rodadaAtual.resultado
				? `${rodadaAtual.resultado.label}: +${rodadaAtual.resultado.points} pontos`
				: 'Revelação da Rodada',
			podeInteragir: false
		};
	}

	// 2. Fase de Dica: somente o Codificador vê a meta secreta
	if (fase === 'RODADA_DICA') {
		if (isCodificador) {
			const metaSecreta = rodadaAtual.metaOculta ?? 50;
			return {
				nivelLiquido: metaSecreta,
				metaVisivel: metaSecreta,
				isMetaOculta: false,
				marcadorPalpite: 50,
				mostrarMenisco: true,
				mostrarBorbulhas: true,
				statusTexto: 'Sua vez de codificar: analise o nível e digite uma pista contextualizada!',
				podeInteragir: false
			};
		}

		// Palpiteiro ou outros jogadores: sigilo absoluto
		return {
			nivelLiquido: 0,
			metaVisivel: null,
			isMetaOculta: true,
			marcadorPalpite: 50,
			mostrarMenisco: false,
			mostrarBorbulhas: false,
			statusTexto: 'Aguardando o Codificador analisar a carta e enviar a dica...',
			podeInteragir: false
		};
	}

	// 3. Fase de Palpite: palpiteiro interage com o slider, meta permanece estritamente oculta
	if (fase === 'RODADA_PALPITE') {
		const palpite = rodadaAtual.palpite ?? 50;
		if (isPalpiteiro) {
			return {
				nivelLiquido: palpite,
				metaVisivel: null,
				isMetaOculta: true,
				marcadorPalpite: palpite,
				mostrarMenisco: true,
				mostrarBorbulhas: false,
				statusTexto:
					'Sua vez de decodificar: deslize o marcador analógico até onde acredita estar o nível!',
				podeInteragir: true
			};
		}

		return {
			nivelLiquido: palpite,
			metaVisivel: null,
			isMetaOculta: true,
			marcadorPalpite: palpite,
			mostrarMenisco: true,
			mostrarBorbulhas: false,
			statusTexto: 'Palpiteiro ajustando a calibração do nível...',
			podeInteragir: false
		};
	}

	// 4. Demais fases (LOBBY, PPT, etc.)
	return {
		nivelLiquido: 50,
		metaVisivel: null,
		isMetaOculta: true,
		marcadorPalpite: 50,
		mostrarMenisco: true,
		mostrarBorbulhas: false,
		statusTexto: 'Aguardando início da rodada...',
		podeInteragir: false
	};
}

/**
 * Projeta o papel e permissões de ação do jogador na interface.
 */
export function getPlayerRoleProjection(
	state: GameState,
	meuJogadorId: string | null
): PlayerRoleProjection {
	if (!meuJogadorId) {
		return {
			meuJogador: null,
			minhaEquipe: null,
			isMinhaEquipeAtiva: false,
			meuPapel: 'ESPECTADOR',
			podeDigitarDica: false,
			podeArrastarSlider: false,
			podeJogarPpt: false,
			podePedirRevanche: false,
			isEspectador: true,
			descricaoPapel: 'Espectador Conectado'
		};
	}

	const playerA = state.equipes.A.membros.find((m) => m.id === meuJogadorId);
	const playerB = state.equipes.B.membros.find((m) => m.id === meuJogadorId);
	const meuJogador = playerA || playerB || null;
	const minhaEquipe: TeamId | null = playerA ? 'A' : playerB ? 'B' : null;
	const isMinhaEquipeAtiva = minhaEquipe !== null && state.equipeAtiva === minhaEquipe;

	let meuPapel: PlayerRole = 'ESPECTADOR';
	let descricaoPapel = 'Espectador';

	if (state.rodadaAtual.codificadorId === meuJogadorId) {
		meuPapel = 'CODIFICADOR';
		descricaoPapel = 'Codificador (Dica)';
	} else if (state.rodadaAtual.palpiteiroId === meuJogadorId) {
		meuPapel = 'PALPITEIRO';
		descricaoPapel = 'Palpiteiro (Slider)';
	} else if (minhaEquipe) {
		descricaoPapel = `Membro da Equipe ${minhaEquipe}`;
	}

	const podeDigitarDica =
		state.fase === 'RODADA_DICA' && meuPapel === 'CODIFICADOR' && isMinhaEquipeAtiva;
	const podeArrastarSlider =
		state.fase === 'RODADA_PALPITE' && meuPapel === 'PALPITEIRO' && isMinhaEquipeAtiva;
	const podeJogarPpt = state.fase === 'PPT_DISPUTA' && minhaEquipe !== null;
	const podePedirRevanche = state.fase === 'VITORIA';

	return {
		meuJogador,
		minhaEquipe,
		isMinhaEquipeAtiva,
		meuPapel,
		podeDigitarDica,
		podeArrastarSlider,
		podeJogarPpt,
		podePedirRevanche,
		isEspectador: meuPapel === 'ESPECTADOR',
		descricaoPapel
	};
}

/**
 * Projeta o estado do placar geral e progresso das equipes.
 */
export function getScoreBoardProjection(state: GameState): ScoreBoardProjection {
	const placarA = state.equipes.A.pontos;
	const placarB = state.equipes.B.pontos;
	const meta = Math.max(1, state.metaPontuacao);

	const progressoA = Math.min(100, Math.round((placarA / meta) * 100));
	const progressoB = Math.min(100, Math.round((placarB / meta) * 100));

	let equipeLider: 'A' | 'B' | 'EMPATE' = 'EMPATE';
	if (placarA > placarB) equipeLider = 'A';
	else if (placarB > placarA) equipeLider = 'B';

	const diferencaPontos = Math.abs(placarA - placarB);

	let statusPlacar = 'Partida empatada';
	if (state.vencedor) {
		statusPlacar = `Vitória da Equipe ${state.vencedor}!`;
	} else if (equipeLider !== 'EMPATE') {
		statusPlacar = `Equipe ${equipeLider} lidera por ${diferencaPontos} ${diferencaPontos === 1 ? 'ponto' : 'pontos'}`;
	}

	return {
		placarA,
		placarB,
		metaPontuacao: meta,
		progressoA,
		progressoB,
		equipeLider,
		diferencaPontos,
		vencedor: state.vencedor,
		statusPlacar
	};
}

/**
 * Projeta a carta bipolar e a pista da rodada ativa.
 */
export function getRoundSpectrumProjection(state: GameState): SpectrumProjection {
	const { carta, dica, numero, equipeAtiva } = state.rodadaAtual;
	const equipeAtivaNome = state.equipes[equipeAtiva]?.nome || `Equipe ${equipeAtiva}`;

	return {
		hasCarta: carta !== null,
		poloEsquerdo: carta ? carta.left : 'Esquerda',
		poloDireito: carta ? carta.right : 'Direita',
		dica,
		numeroRodada: numero,
		equipeAtiva,
		equipeAtivaNome
	};
}
