/**
 * Projeções Puras de Renderização (Camada de Render)
 * Implementa UI = f(State) de forma desacoplada e 100% testável headless.
 *
 * Transforma o GameState bruto em ViewModels otimizados para os componentes Svelte,
 * garantindo conformidade com o princípio Zero Trust (ex.: ocultação inviolável da
 * meta secreta para o palpiteiro durante a fase de adivinhação).
 */

import type { GameState, LobbyTeamChoice, Player, PlayerRole, PptMove, TeamId } from '../types';

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

export interface LobbyProjection {
	membrosPato: Player[];
	membrosGanso: Player[];
	membrosAleatorio: Player[];
	totalJogadores: number;
	quorumCompleto: boolean;
	isHost: boolean;
	minhaEquipe: LobbyTeamChoice | null;
	podeIniciarPartida: boolean;
	podeEscolherPato: boolean;
	podeEscolherGanso: boolean;
	podeEscolherAleatorio: boolean;
	statusTexto: string;
}

/**
 * Projeta as equipes, membros, elegibilidade de quórum e autoridade de início do Lobby.
 */
export function getLobbyProjection(state: GameState, meuJogadorId: string | null): LobbyProjection {
	const membrosPato = state.equipes.A.membros;
	const membrosGanso = state.equipes.B.membros;
	const membrosAleatorio = state.jogadoresAleatorios || [];

	const totalJogadores = membrosPato.length + membrosGanso.length + membrosAleatorio.length;
	const quorumCompleto = totalJogadores === 4;

	const todosJogadores = [...membrosPato, ...membrosGanso, ...membrosAleatorio];
	const meuJogador = todosJogadores.find((j) => j.id === meuJogadorId);
	const minhaEquipe = meuJogador ? meuJogador.equipe : state.minhaEquipe;

	// O jogador é considerado host se tiver isHost marcado, ou se seu ID for igual a state.hostId, ou se for o primeiro
	const isHost = Boolean(
		meuJogador?.isHost ||
		(state.hostId && meuJogadorId && state.hostId === meuJogadorId) ||
		(!state.hostId && todosJogadores.length > 0 && todosJogadores[0].id === meuJogadorId)
	);

	// Regras de lotação máxima: no máximo 2 integrantes por equipe (A ou B)
	const podeEscolherPato = membrosPato.length < 2 || minhaEquipe === 'A';
	const podeEscolherGanso = membrosGanso.length < 2 || minhaEquipe === 'B';
	const podeEscolherAleatorio = true;

	const podeIniciarPartida = isHost && quorumCompleto;

	const statusTexto = quorumCompleto
		? isHost
			? 'Quórum atingido! Você pode iniciar a partida agora.'
			: 'Quórum de 4 jogadores atingido! Aguardando o anfitrião iniciar a partida...'
		: `Aguardando jogadores (${totalJogadores}/4)... Clique em uma caixa para escolher sua equipe`;

	return {
		membrosPato,
		membrosGanso,
		membrosAleatorio,
		totalJogadores,
		quorumCompleto,
		isHost,
		minhaEquipe,
		podeIniciarPartida,
		podeEscolherPato,
		podeEscolherGanso,
		podeEscolherAleatorio,
		statusTexto
	};
}

export interface PptProjection {
	papelPpt: 'REPRESENTANTE' | 'ESPECTADOR';
	souRepresentante: boolean;
	minhaEquipe: TeamId | null;
	equipeAdversaria: TeamId | null;
	minhaEquipeNome: string;
	equipeAdversariaNome: string;
	rotuloLocal: string;
	rotuloAdversario: string;
	nomeRepresentanteLocal: string;
	nomeRepresentanteAdversario: string;
	subfase: 'ESCOLHA' | 'CONTAGEM' | 'RESULTADO';
	prazoIso: string | null;
	revelacaoEmIso: string | null;
	minhaEquipeEnviou: boolean;
	adversarioEnviou: boolean;
	meuLance: PptMove | null;
	podeEscolherLance: boolean;
	lanceLocalRevelado: PptMove | null;
	lanceAdversarioRevelado: PptMove | null;
	resultado: 'EMPATE' | 'VITORIA_A' | 'VITORIA_B' | null;
	vitoriaLocal: boolean | null;
	mensagemStatus: string;
}

/**
 * Projeta o estado da arena de Pedra, Papel e Tesoura (Iniciativa).
 */
export function getPptProjection(state: GameState, meuJogadorId: string | null): PptProjection {
	const ppt = state.ppt;
	const todosJogadores = [
		...state.equipes.A.membros,
		...state.equipes.B.membros,
		...state.jogadoresAleatorios
	];
	const meuJogador = todosJogadores.find((j) => j.id === meuJogadorId);
	let minhaEquipe: TeamId | null = null;
	if (meuJogador?.equipe === 'A' || meuJogador?.equipe === 'B') {
		minhaEquipe = meuJogador.equipe;
	} else if (state.minhaEquipe === 'A' || state.minhaEquipe === 'B') {
		minhaEquipe = state.minhaEquipe;
	}

	const equipeAdversaria: TeamId | null =
		minhaEquipe === 'A' ? 'B' : minhaEquipe === 'B' ? 'A' : null;
	const minhaEquipeNome = minhaEquipe
		? state.equipes[minhaEquipe]?.nome || `Equipe ${minhaEquipe}`
		: 'Sua Equipe';
	const equipeAdversariaNome = equipeAdversaria
		? state.equipes[equipeAdversaria]?.nome || `Equipe ${equipeAdversaria}`
		: 'Equipe Adversária';

	const repAId = ppt?.representanteA || null;
	const repBId = ppt?.representanteB || null;

	const repLocalId = minhaEquipe === 'A' ? repAId : minhaEquipe === 'B' ? repBId : null;
	const repAdversarioId = minhaEquipe === 'A' ? repBId : minhaEquipe === 'B' ? repAId : null;

	const repLocal = todosJogadores.find((j) => j.id === repLocalId);
	const repAdversario = todosJogadores.find((j) => j.id === repAdversarioId);

	const souRepresentante = Boolean(meuJogadorId && repLocalId && meuJogadorId === repLocalId);
	const papelPpt: 'REPRESENTANTE' | 'ESPECTADOR' = souRepresentante
		? 'REPRESENTANTE'
		: 'ESPECTADOR';

	const rotuloLocal = souRepresentante ? 'Você' : 'Sua equipe';
	const rotuloAdversario = souRepresentante ? 'Oponente' : 'Equipe adversária';
	const nomeRepresentanteLocal = repLocal?.nome || rotuloLocal;
	const nomeRepresentanteAdversario = repAdversario?.nome || rotuloAdversario;

	const subfase: 'ESCOLHA' | 'CONTAGEM' | 'RESULTADO' = ppt?.estado || 'ESCOLHA';

	const minhaEquipeEnviou =
		minhaEquipe === 'A'
			? Boolean(ppt?.enviouA)
			: minhaEquipe === 'B'
				? Boolean(ppt?.enviouB)
				: false;
	const adversarioEnviou =
		minhaEquipe === 'A'
			? Boolean(ppt?.enviouB)
			: minhaEquipe === 'B'
				? Boolean(ppt?.enviouA)
				: false;

	const lanceLocalRevelado =
		minhaEquipe === 'A' ? ppt?.lanceA || null : minhaEquipe === 'B' ? ppt?.lanceB || null : null;
	const lanceAdversarioRevelado =
		minhaEquipe === 'A' ? ppt?.lanceB || null : minhaEquipe === 'B' ? ppt?.lanceA || null : null;

	let meuLance: PptMove | null = ppt?.meuLance || null;
	if (subfase === 'RESULTADO' && lanceLocalRevelado) {
		meuLance = meuLance || lanceLocalRevelado;
	}

	const podeEscolherLance = souRepresentante && subfase === 'ESCOLHA' && !minhaEquipeEnviou;
	const resultado = ppt?.resultado || null;

	let vitoriaLocal: boolean | null = null;
	if (resultado === 'VITORIA_A') {
		vitoriaLocal = minhaEquipe === 'A';
	} else if (resultado === 'VITORIA_B') {
		vitoriaLocal = minhaEquipe === 'B';
	}

	let mensagemStatus = '';
	if (subfase === 'ESCOLHA') {
		if (souRepresentante) {
			if (!minhaEquipeEnviou) {
				mensagemStatus = 'Faça sua escolha para disputar a iniciativa';
			} else if (adversarioEnviou) {
				mensagemStatus = 'O oponente realizou um lance...';
			} else {
				mensagemStatus = 'Aguardando lance do oponente...';
			}
		} else {
			if (!minhaEquipeEnviou) {
				mensagemStatus = 'Aguardando jogada do representante da sua equipe...';
			} else {
				mensagemStatus = `Sua equipe escolheu ${meuLance || 'uma opção'}`;
			}
		}
	} else if (subfase === 'CONTAGEM') {
		mensagemStatus = 'Atenção...';
	} else if (subfase === 'RESULTADO') {
		if (resultado === 'EMPATE') {
			mensagemStatus = 'Empate! Nova disputa...';
		} else if (vitoriaLocal === true) {
			mensagemStatus = 'Sua equipe começa!';
		} else if (vitoriaLocal === false) {
			mensagemStatus = `${equipeAdversariaNome} começa a primeira rodada.`;
		} else {
			mensagemStatus = 'Disputa concluída.';
		}
	}

	return {
		papelPpt,
		souRepresentante,
		minhaEquipe,
		equipeAdversaria,
		minhaEquipeNome,
		equipeAdversariaNome,
		rotuloLocal,
		rotuloAdversario,
		nomeRepresentanteLocal,
		nomeRepresentanteAdversario,
		subfase,
		prazoIso: ppt?.prazo || null,
		revelacaoEmIso: ppt?.revelacaoEm || null,
		minhaEquipeEnviou,
		adversarioEnviou,
		meuLance,
		podeEscolherLance,
		lanceLocalRevelado,
		lanceAdversarioRevelado,
		resultado,
		vitoriaLocal,
		mensagemStatus
	};
}
