import type {
	GamePhase,
	LobbyTeamChoice,
	PlayerRole,
	PptMove,
	SnapshotSalaProjetado,
	SpectrumCard
} from '$lib/engine/types';

export interface SandboxPlayerInfo {
	id: string;
	nome: string;
	equipe: LobbyTeamChoice;
	papelPadrao: PlayerRole;
	isHost: boolean;
	descricao: string;
}

export const SANDBOX_PLAYERS: Record<string, SandboxPlayerInfo> = {
	p1: {
		id: 'p1',
		nome: 'Alfa',
		equipe: 'A',
		papelPadrao: 'CODIFICADOR',
		isHost: true,
		descricao: 'Anfitrião / Equipe Pato'
	},
	p2: {
		id: 'p2',
		nome: 'Beta',
		equipe: 'A',
		papelPadrao: 'PALPITEIRO',
		isHost: false,
		descricao: 'Parceiro / Equipe Pato'
	},
	p3: {
		id: 'p3',
		nome: 'Gama',
		equipe: 'B',
		papelPadrao: 'ESPECTADOR',
		isHost: false,
		descricao: 'Líder Oponente / Equipe Ganso'
	},
	p4: {
		id: 'p4',
		nome: 'Delta',
		equipe: 'B',
		papelPadrao: 'ESPECTADOR',
		isHost: false,
		descricao: 'Parceiro Oponente / Equipe Ganso'
	},
	p_spec: {
		id: 'p_spec',
		nome: 'Ômega',
		equipe: 'ALEATORIO',
		papelPadrao: 'ESPECTADOR',
		isHost: false,
		descricao: 'Espectador Conectado'
	}
};

export type SandboxPresetId =
	| 'modal_apelido'
	| 'lobby_host_sozinho'
	| 'lobby_parcial'
	| 'lobby_quorum_completo'
	| 'ppt_escolha'
	| 'ppt_pato_enviou'
	| 'ppt_contagem'
	| 'ppt_resultado_vitoria'
	| 'ppt_resultado_empate'
	| 'espectro_lider_escolhendo'
	| 'espectro_voto_parceiro'
	| 'rodada_dica'
	| 'rodada_palpite'
	| 'rodada_revelacao'
	| 'fim_de_jogo_vitoria';

export interface SandboxPresetDefinition {
	id: SandboxPresetId;
	titulo: string;
	categoria: 'Lobby' | 'Iniciativa PPT' | 'Escolha de Espectro' | 'Rodada' | 'Vitória';
	fase: GamePhase;
	defaultPovId: string;
	snapshot: SnapshotSalaProjetado;
}

const CARTAS_EXEMPLO: SpectrumCard[] = [
	{
		id: 'c1',
		left: 'Insosso',
		right: 'Salgado',
		esquerda: 'Insosso',
		direita: 'Salgado',
		categoria: 'Sensoriais'
	},
	{
		id: 'c2',
		left: 'Sidequest',
		right: 'Boss Battle',
		esquerda: 'Sidequest',
		direita: 'Boss Battle',
		categoria: 'Cultura Pop'
	}
];

function montarJogadoresSnapshot(
	config: Array<{ id: string; equipe: LobbyTeamChoice; papel?: PlayerRole }>
) {
	return config.map((c) => {
		const base = SANDBOX_PLAYERS[c.id] || {
			id: c.id,
			nome: c.id,
			equipe: c.equipe,
			isHost: false
		};
		return {
			id: base.id,
			playerId: base.id,
			nome: base.nome,
			equipe: c.equipe,
			papel: c.papel || base.papelPadrao,
			isHost: base.isHost,
			isOnline: true,
			equipeDesde: '2026-01-01T00:00:00Z'
		};
	});
}

export const SANDBOX_PRESETS: Record<SandboxPresetId, SandboxPresetDefinition> = {
	modal_apelido: {
		id: 'modal_apelido',
		titulo: 'Modal de Apelido (Entrada Inicial)',
		categoria: 'Lobby',
		fase: 'LOBBY',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'LOBBY',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: []
		}
	},
	lobby_host_sozinho: {
		id: 'lobby_host_sozinho',
		titulo: 'Lobby : Apenas Host Conectado (1/4)',
		categoria: 'Lobby',
		fase: 'LOBBY',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'LOBBY',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: []
		}
	},
	lobby_parcial: {
		id: 'lobby_parcial',
		titulo: 'Lobby : Quórum Parcial (3/4)',
		categoria: 'Lobby',
		fase: 'LOBBY',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'LOBBY',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A' },
				{ id: 'p2', equipe: 'ALEATORIO' },
				{ id: 'p3', equipe: 'B' }
			])
		}
	},
	lobby_quorum_completo: {
		id: 'lobby_quorum_completo',
		titulo: 'Lobby : Quórum Completo Pronto para Iniciar (4/4)',
		categoria: 'Lobby',
		fase: 'LOBBY',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'LOBBY',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A' },
				{ id: 'p2', equipe: 'A' },
				{ id: 'p3', equipe: 'B' },
				{ id: 'p4', equipe: 'B' }
			])
		}
	},
	ppt_escolha: {
		id: 'ppt_escolha',
		titulo: 'Iniciativa PPT : Escolha Aberta dos Representantes (20s)',
		categoria: 'Iniciativa PPT',
		fase: 'PPT_DISPUTA',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'INICIATIVA',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A' },
				{ id: 'p2', equipe: 'A' },
				{ id: 'p3', equipe: 'B' },
				{ id: 'p4', equipe: 'B' }
			]),
			ppt: {
				estado: 'ESCOLHA',
				prazo: new Date(Date.now() + 20000).toISOString(),
				enviouA: false,
				enviouB: false,
				representanteA: 'p1',
				representanteB: 'p3'
			}
		}
	},
	ppt_pato_enviou: {
		id: 'ppt_pato_enviou',
		titulo: 'Iniciativa PPT : Pato Escolheu em Sigilo (Aguardando Ganso)',
		categoria: 'Iniciativa PPT',
		fase: 'PPT_DISPUTA',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'INICIATIVA',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A' },
				{ id: 'p2', equipe: 'A' },
				{ id: 'p3', equipe: 'B' },
				{ id: 'p4', equipe: 'B' }
			]),
			ppt: {
				estado: 'ESCOLHA',
				prazo: new Date(Date.now() + 15000).toISOString(),
				enviouA: true,
				enviouB: false,
				representanteA: 'p1',
				representanteB: 'p3',
				lanceA: 'pedra',
				meuLance: 'pedra'
			}
		}
	},
	ppt_contagem: {
		id: 'ppt_contagem',
		titulo: 'Iniciativa PPT : Contagem Regressiva (3.. 2.. 1..)',
		categoria: 'Iniciativa PPT',
		fase: 'PPT_DISPUTA',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'INICIATIVA',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A' },
				{ id: 'p2', equipe: 'A' },
				{ id: 'p3', equipe: 'B' },
				{ id: 'p4', equipe: 'B' }
			]),
			ppt: {
				estado: 'CONTAGEM',
				revelacaoEm: new Date(Date.now() + 3000).toISOString(),
				enviouA: true,
				enviouB: true,
				representanteA: 'p1',
				representanteB: 'p3'
			}
		}
	},
	ppt_resultado_vitoria: {
		id: 'ppt_resultado_vitoria',
		titulo: 'Iniciativa PPT : Resultado com Vitória da Equipe Pato',
		categoria: 'Iniciativa PPT',
		fase: 'PPT_RESULTADO',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'INICIATIVA',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A' },
				{ id: 'p2', equipe: 'A' },
				{ id: 'p3', equipe: 'B' },
				{ id: 'p4', equipe: 'B' }
			]),
			ppt: {
				estado: 'RESULTADO',
				resultado: 'VITORIA_A',
				lanceA: 'pedra',
				lanceB: 'tesoura',
				representanteA: 'p1',
				representanteB: 'p3'
			}
		}
	},
	ppt_resultado_empate: {
		id: 'ppt_resultado_empate',
		titulo: 'Iniciativa PPT : Empate e Nova Disputa Instantânea',
		categoria: 'Iniciativa PPT',
		fase: 'PPT_RESULTADO',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'INICIATIVA',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A' },
				{ id: 'p2', equipe: 'A' },
				{ id: 'p3', equipe: 'B' },
				{ id: 'p4', equipe: 'B' }
			]),
			ppt: {
				estado: 'RESULTADO',
				resultado: 'EMPATE',
				lanceA: 'papel',
				lanceB: 'papel',
				representanteA: 'p1',
				representanteB: 'p3'
			}
		}
	},
	espectro_lider_escolhendo: {
		id: 'espectro_lider_escolhendo',
		titulo: 'Escolha de Espectro : Líder Decidindo (30s Ativo)',
		categoria: 'Escolha de Espectro',
		fase: 'ESCOLHA_CARTA',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'ESCOLHA_ESPECTRO',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 1,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				liderRodadaId: 'p1',
				cartaSelecionadaId: 'c1',
				prazoEspectro: new Date(Date.now() + 30000).toISOString()
			},
			cartasEspectroOpcoes: CARTAS_EXEMPLO,
			cartasOpcoes: CARTAS_EXEMPLO
		}
	},
	espectro_voto_parceiro: {
		id: 'espectro_voto_parceiro',
		titulo: 'Escolha de Espectro : Parceiro Votou na Carta 2 (Mãozinha Ativa)',
		categoria: 'Escolha de Espectro',
		fase: 'ESCOLHA_CARTA',
		defaultPovId: 'p2',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'ESCOLHA_ESPECTRO',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 1,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				liderRodadaId: 'p1',
				cartaSelecionadaId: 'c1',
				votoParceiroCartaId: 'c2',
				prazoEspectro: new Date(Date.now() + 22000).toISOString()
			},
			cartasEspectroOpcoes: CARTAS_EXEMPLO,
			cartasOpcoes: CARTAS_EXEMPLO
		}
	},
	rodada_dica: {
		id: 'rodada_dica',
		titulo: 'Rodada Ativa : Codificador Digitando Dica (Meta Secreta 72%)',
		categoria: 'Rodada',
		fase: 'RODADA_DICA',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'RODADA_DICA',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 1,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				espectroEsquerda: 'Insosso',
				espectroDireita: 'Salgado',
				metaOculta: 72,
				dica: '',
				palpite: 50
			}
		}
	},
	rodada_palpite: {
		id: 'rodada_palpite',
		titulo: 'Rodada Ativa : Palpiteiro Arrastando Slider Analógico',
		categoria: 'Rodada',
		fase: 'RODADA_PALPITE',
		defaultPovId: 'p2',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'RODADA_PALPITE',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 1,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				espectroEsquerda: 'Insosso',
				espectroDireita: 'Salgado',
				metaOculta: 72,
				dica: 'Pipoca de cinema com manteiga extra',
				palpite: 50
			}
		}
	},
	rodada_revelacao: {
		id: 'rodada_revelacao',
		titulo: 'Revelação Dramática : Líquido Sobe e Revela +4 Pontos',
		categoria: 'Rodada',
		fase: 'RODADA_REVELACAO',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'RODADA_REVELACAO',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 4,
			placarB: 0,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 1,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				espectroEsquerda: 'Insosso',
				espectroDireita: 'Salgado',
				metaOculta: 72,
				dica: 'Pipoca de cinema com manteiga extra',
				palpite: 71,
				pontos: 4,
				tier: 'NA_MOSCA',
				label: 'Na Mosca!'
			}
		}
	},
	fim_de_jogo_vitoria: {
		id: 'fim_de_jogo_vitoria',
		titulo: 'Vitória Final : Equipe Pato Atinge 10 Pontos',
		categoria: 'Vitória',
		fase: 'VITORIA',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'FIM_DE_JOGO',
			rodada: 4,
			equipeAtiva: 'A',
			placarA: 10,
			placarB: 6,
			vencedor: 'A',
			motivoFim: 'VITORIA',
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 4,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				espectroEsquerda: 'Insosso',
				espectroDireita: 'Salgado',
				metaOculta: 72,
				dica: 'Pipoca de cinema com manteiga extra',
				palpite: 71,
				pontos: 4,
				tier: 'NA_MOSCA',
				label: 'Na Mosca!'
			}
		}
	}
};

export const PRESET_SEQUENCE: SandboxPresetId[] = [
	'modal_apelido',
	'lobby_host_sozinho',
	'lobby_parcial',
	'lobby_quorum_completo',
	'ppt_escolha',
	'ppt_pato_enviou',
	'ppt_contagem',
	'ppt_resultado_vitoria',
	'ppt_resultado_empate',
	'espectro_lider_escolhendo',
	'espectro_voto_parceiro',
	'rodada_dica',
	'rodada_palpite',
	'rodada_revelacao',
	'fim_de_jogo_vitoria'
];

/**
 * Aplica a blindagem Zero Trust autoritativa no snapshot de acordo com o jogador visualizador (POV).
 */
export function projectSnapshotForPlayer(
	rawSnapshot: SnapshotSalaProjetado,
	viewerPlayerId: string
): SnapshotSalaProjetado {
	const cloned: SnapshotSalaProjetado = JSON.parse(JSON.stringify(rawSnapshot));
	const viewer = SANDBOX_PLAYERS[viewerPlayerId];
	const minhaEquipe = viewer?.equipe || null;

	// 1. Blindagem de Lance Privado de PPT
	if (cloned.ppt) {
		const isResultado = cloned.ppt.estado === 'RESULTADO';
		if (!isResultado) {
			if (minhaEquipe === 'A' && cloned.ppt.enviouA) {
				cloned.ppt.meuLance = (cloned.ppt.lanceA as PptMove) || 'pedra';
			} else if (minhaEquipe === 'B' && cloned.ppt.enviouB) {
				cloned.ppt.meuLance = (cloned.ppt.lanceB as PptMove) || 'papel';
			} else {
				cloned.ppt.meuLance = null;
			}
			cloned.ppt.lanceA = null;
			cloned.ppt.lanceB = null;
		}
	}

	// 2. Blindagem de Meta Oculta da Rodada
	if (cloned.rodadaAtiva) {
		const fase = cloned.fase;
		const isRevelada = fase === 'RODADA_REVELACAO' || fase === 'FIM_DE_JOGO' || fase === 'VITORIA';
		const isCodificador = viewerPlayerId === cloned.rodadaAtiva.codificadorId;

		if (!isRevelada && !isCodificador) {
			cloned.rodadaAtiva.metaOculta = null;
		}
	}

	return cloned;
}
