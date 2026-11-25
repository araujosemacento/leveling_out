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
	| 'rodada_match_point_tensao'
	| 'rodada_revelacao'
	| 'rodada_revelacao_muito_perto'
	| 'rodada_revelacao_perto'
	| 'rodada_revelacao_fora_margem'
	| 'fim_de_jogo_vitoria'
	| 'fim_de_jogo_ganso'
	| 'fim_de_jogo_wo';

export interface SandboxPresetDefinition {
	id: SandboxPresetId;
	titulo: string;
	categoria: 'Lobby' | 'Iniciativa PPT' | 'Escolha de Espectro' | 'Rodada' | 'Vitória';
	fase: GamePhase;
	defaultPovId: string;
	snapshot: SnapshotSalaProjetado;
}

export const SANDBOX_SPECTRUM_DECK: SpectrumCard[] = [
	{
		id: 'c1',
		left: 'Insosso',
		right: 'Salgado',
		esquerda: 'Insosso',
		direita: 'Salgado',
		categoria: 'Sensoriais e Físicos'
	},
	{
		id: 'c2',
		left: 'Sidequest',
		right: 'Boss Battle',
		esquerda: 'Sidequest',
		direita: 'Boss Battle',
		categoria: 'Cultura Pop e Ficcional'
	},
	{
		id: 'c3',
		left: 'Gelado',
		right: 'Fervendo',
		esquerda: 'Gelado',
		direita: 'Fervendo',
		categoria: 'Sensoriais e Físicos'
	},
	{
		id: 'c4',
		left: 'Entediante',
		right: 'Empolgante',
		esquerda: 'Entediante',
		direita: 'Empolgante',
		categoria: 'Juízos de Valor e Opinião'
	},
	{
		id: 'c5',
		left: 'Barato',
		right: 'Luxuoso',
		esquerda: 'Barato',
		direita: 'Luxuoso',
		categoria: 'Juízos de Valor e Opinião'
	},
	{
		id: 'c6',
		left: 'Subestimado',
		right: 'Superestimado',
		esquerda: 'Subestimado',
		direita: 'Superestimado',
		categoria: 'Juízos de Valor e Opinião'
	},
	{
		id: 'c7',
		left: 'Frágil',
		right: 'Indestrutível',
		esquerda: 'Frágil',
		direita: 'Indestrutível',
		categoria: 'Sensoriais e Físicos'
	},
	{
		id: 'c8',
		left: 'Modinha passageira',
		right: 'Clássico atemporal',
		esquerda: 'Modinha passageira',
		direita: 'Clássico atemporal',
		categoria: 'Juízos de Valor e Opinião'
	},
	{
		id: 'c9',
		left: 'Silencioso',
		right: 'Barulhento',
		esquerda: 'Silencioso',
		direita: 'Barulhento',
		categoria: 'Sensoriais e Físicos'
	},
	{
		id: 'c10',
		left: 'Inútil',
		right: 'Indispensável',
		esquerda: 'Inútil',
		direita: 'Indispensável',
		categoria: 'Juízos de Valor e Opinião'
	}
];

const CARTAS_EXEMPLO: SpectrumCard[] = SANDBOX_SPECTRUM_DECK.slice(0, 2);

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
	rodada_match_point_tensao: {
		id: 'rodada_match_point_tensao',
		titulo: 'Rodada Match Point : Placar 9 x 9 e Menisco Acelerado',
		categoria: 'Rodada',
		fase: 'RODADA_DICA',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'RODADA_DICA',
			rodada: 6,
			equipeAtiva: 'A',
			placarA: 9,
			placarB: 9,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 6,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				espectroEsquerda: 'Entediante',
				espectroDireita: 'Empolgante',
				metaOculta: 86,
				dica: '',
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
				label: 'Na Mosca!',
				diff: 1,
				transicaoEm: new Date(Date.now() + 6500).toISOString()
			}
		}
	},
	rodada_revelacao_muito_perto: {
		id: 'rodada_revelacao_muito_perto',
		titulo: 'Revelação : Muito Perto (+3 Pontos, Erro 4%)',
		categoria: 'Rodada',
		fase: 'RODADA_REVELACAO',
		defaultPovId: 'p2',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'REVELACAO',
			rodada: 3,
			equipeAtiva: 'A',
			placarA: 7,
			placarB: 4,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 3,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				espectroEsquerda: 'Barato',
				espectroDireita: 'Luxuoso',
				metaOculta: 64,
				dica: 'Jantar em bistrô no centro',
				palpite: 60,
				pontos: 3,
				tier: 'MUITO_PERTO',
				label: 'Muito Perto!',
				diff: 4,
				transicaoEm: new Date(Date.now() + 6500).toISOString()
			}
		}
	},
	rodada_revelacao_perto: {
		id: 'rodada_revelacao_perto',
		titulo: 'Revelação : Perto (+2 Pontos, Erro 10%, Equipe Ganso)',
		categoria: 'Rodada',
		fase: 'RODADA_REVELACAO',
		defaultPovId: 'p3',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'REVELACAO',
			rodada: 4,
			equipeAtiva: 'B',
			placarA: 4,
			placarB: 6,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'ESPECTADOR' },
				{ id: 'p2', equipe: 'A', papel: 'ESPECTADOR' },
				{ id: 'p3', equipe: 'B', papel: 'CODIFICADOR' },
				{ id: 'p4', equipe: 'B', papel: 'PALPITEIRO' }
			]),
			rodadaAtiva: {
				numero: 4,
				equipe: 'B',
				codificadorId: 'p3',
				palpiteiroId: 'p4',
				espectroEsquerda: 'Gelado',
				espectroDireita: 'Fervendo',
				metaOculta: 30,
				dica: 'Chuva de outono no fim da tarde',
				palpite: 40,
				pontos: 2,
				tier: 'PERTO',
				label: 'Perto!',
				diff: 10,
				transicaoEm: new Date(Date.now() + 6500).toISOString()
			}
		}
	},
	rodada_revelacao_fora_margem: {
		id: 'rodada_revelacao_fora_margem',
		titulo: 'Revelação : Fora da Margem (0 Pontos, Erro 37%)',
		categoria: 'Rodada',
		fase: 'RODADA_REVELACAO',
		defaultPovId: 'p2',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'REVELACAO',
			rodada: 2,
			equipeAtiva: 'A',
			placarA: 4,
			placarB: 3,
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'CODIFICADOR' },
				{ id: 'p2', equipe: 'A', papel: 'PALPITEIRO' },
				{ id: 'p3', equipe: 'B', papel: 'ESPECTADOR' },
				{ id: 'p4', equipe: 'B', papel: 'ESPECTADOR' }
			]),
			rodadaAtiva: {
				numero: 2,
				equipe: 'A',
				codificadorId: 'p1',
				palpiteiroId: 'p2',
				espectroEsquerda: 'Sidequest',
				espectroDireita: 'Boss Battle',
				metaOculta: 82,
				dica: 'Enfrentar um dragão opcional antes do chefe final',
				palpite: 45,
				pontos: 0,
				tier: 'FORA_DA_MARGEM',
				label: 'Fora da Margem',
				diff: 37,
				transicaoEm: new Date(Date.now() + 6500).toISOString()
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
			fase: 'FIM_JOGO',
			rodada: 5,
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
				numero: 5,
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
				label: 'Na Mosca!',
				diff: 1
			},
			historico: [
				{
					numero: 1,
					equipe: 'A',
					codificadorId: 'p1',
					palpiteiroId: 'p2',
					espectroEsquerda: 'Gelado',
					espectroDireita: 'Fervendo',
					metaOculta: 24,
					palpite: 23,
					dica: 'Sorvete derretendo no freezer',
					pontos: 4,
					tier: 'NA_MOSCA',
					diff: 1,
					duracaoSegundos: 16
				},
				{
					numero: 2,
					equipe: 'B',
					codificadorId: 'p3',
					palpiteiroId: 'p4',
					espectroEsquerda: 'Barato',
					espectroDireita: 'Luxuoso',
					metaOculta: 78,
					palpite: 73,
					dica: 'Relógio suíço de vitrine',
					pontos: 3,
					tier: 'MUITO_PERTO',
					diff: 5,
					duracaoSegundos: 21
				},
				{
					numero: 3,
					equipe: 'A',
					codificadorId: 'p2',
					palpiteiroId: 'p1',
					espectroEsquerda: 'Sidequest',
					espectroDireita: 'Boss Battle',
					metaOculta: 62,
					palpite: 52,
					dica: 'Torneio secreto de arena',
					pontos: 2,
					tier: 'PERTO',
					diff: 10,
					duracaoSegundos: 19
				},
				{
					numero: 4,
					equipe: 'B',
					codificadorId: 'p4',
					palpiteiroId: 'p3',
					espectroEsquerda: 'Silencioso',
					espectroDireita: 'Barulhento',
					metaOculta: 41,
					palpite: 45,
					dica: 'Cafeteria cheia pela manhã',
					pontos: 3,
					tier: 'MUITO_PERTO',
					diff: 4,
					duracaoSegundos: 14
				},
				{
					numero: 5,
					equipe: 'A',
					codificadorId: 'p1',
					palpiteiroId: 'p2',
					espectroEsquerda: 'Insosso',
					espectroDireita: 'Salgado',
					metaOculta: 72,
					palpite: 71,
					dica: 'Pipoca de cinema com manteiga extra',
					pontos: 4,
					tier: 'NA_MOSCA',
					diff: 1,
					duracaoSegundos: 15
				}
			]
		}
	},
	fim_de_jogo_ganso: {
		id: 'fim_de_jogo_ganso',
		titulo: 'Vitória Final : Equipe Ganso Vence por 11 x 8',
		categoria: 'Vitória',
		fase: 'VITORIA',
		defaultPovId: 'p3',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'FIM_JOGO',
			rodada: 6,
			equipeAtiva: 'B',
			placarA: 8,
			placarB: 11,
			vencedor: 'B',
			motivoFim: 'VITORIA',
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'ESPECTADOR' },
				{ id: 'p2', equipe: 'A', papel: 'ESPECTADOR' },
				{ id: 'p3', equipe: 'B', papel: 'CODIFICADOR' },
				{ id: 'p4', equipe: 'B', papel: 'PALPITEIRO' }
			]),
			rodadaAtiva: {
				numero: 6,
				equipe: 'B',
				codificadorId: 'p3',
				palpiteiroId: 'p4',
				espectroEsquerda: 'Modinha passageira',
				espectroDireita: 'Clássico atemporal',
				metaOculta: 88,
				dica: 'Trilogia original de ficção científica no cinema',
				palpite: 89,
				pontos: 4,
				tier: 'NA_MOSCA',
				label: 'Na Mosca!',
				diff: 1
			},
			historico: [
				{
					numero: 1,
					equipe: 'A',
					codificadorId: 'p1',
					palpiteiroId: 'p2',
					espectroEsquerda: 'Frágil',
					espectroDireita: 'Indestrutível',
					metaOculta: 45,
					palpite: 54,
					dica: 'Caneca de cerâmica grossa',
					pontos: 2,
					tier: 'PERTO',
					diff: 9,
					duracaoSegundos: 18
				},
				{
					numero: 2,
					equipe: 'B',
					codificadorId: 'p3',
					palpiteiroId: 'p4',
					espectroEsquerda: 'Entediante',
					espectroDireita: 'Empolgante',
					metaOculta: 91,
					palpite: 90,
					dica: 'Final de campeonato decidida nos acréscimos',
					pontos: 4,
					tier: 'NA_MOSCA',
					diff: 1,
					duracaoSegundos: 13
				},
				{
					numero: 3,
					equipe: 'A',
					codificadorId: 'p2',
					palpiteiroId: 'p1',
					espectroEsquerda: 'Subestimado',
					espectroDireita: 'Superestimado',
					metaOculta: 28,
					palpite: 32,
					dica: 'Pão de queijo de padaria simples',
					pontos: 3,
					tier: 'MUITO_PERTO',
					diff: 4,
					duracaoSegundos: 20
				},
				{
					numero: 4,
					equipe: 'B',
					codificadorId: 'p4',
					palpiteiroId: 'p3',
					espectroEsquerda: 'Inútil',
					espectroDireita: 'Indispensável',
					metaOculta: 68,
					palpite: 63,
					dica: 'Lanterna no porta-luvas do carro',
					pontos: 3,
					tier: 'MUITO_PERTO',
					diff: 5,
					duracaoSegundos: 17
				},
				{
					numero: 5,
					equipe: 'A',
					codificadorId: 'p1',
					palpiteiroId: 'p2',
					espectroEsquerda: 'Insosso',
					espectroDireita: 'Salgado',
					metaOculta: 76,
					palpite: 72,
					dica: 'Batata frita com queijo parmesão',
					pontos: 3,
					tier: 'MUITO_PERTO',
					diff: 4,
					duracaoSegundos: 15
				},
				{
					numero: 6,
					equipe: 'B',
					codificadorId: 'p3',
					palpiteiroId: 'p4',
					espectroEsquerda: 'Modinha passageira',
					espectroDireita: 'Clássico atemporal',
					metaOculta: 88,
					palpite: 89,
					dica: 'Trilogia original de ficção científica no cinema',
					pontos: 4,
					tier: 'NA_MOSCA',
					diff: 1,
					duracaoSegundos: 14
				}
			]
		}
	},
	fim_de_jogo_wo: {
		id: 'fim_de_jogo_wo',
		titulo: 'Vitória por W.O. : Encerramento Antecipado',
		categoria: 'Vitória',
		fase: 'VITORIA',
		defaultPovId: 'p1',
		snapshot: {
			codigo: 'SALA-DEV',
			fase: 'FIM_JOGO',
			rodada: 1,
			equipeAtiva: 'A',
			placarA: 0,
			placarB: 0,
			vencedor: 'A',
			motivoFim: 'WO',
			hostId: 'p1',
			jogadores: montarJogadoresSnapshot([
				{ id: 'p1', equipe: 'A', papel: 'ESPECTADOR' },
				{ id: 'p2', equipe: 'A', papel: 'ESPECTADOR' },
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
				metaOculta: 50,
				dica: '',
				palpite: 50,
				pontos: 0,
				tier: 'FORA_DA_MARGEM',
				label: 'W.O.',
				diff: 0
			},
			historico: []
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
	'rodada_match_point_tensao',
	'rodada_revelacao',
	'rodada_revelacao_muito_perto',
	'rodada_revelacao_perto',
	'rodada_revelacao_fora_margem',
	'fim_de_jogo_vitoria',
	'fim_de_jogo_ganso',
	'fim_de_jogo_wo'
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

	// 2. Blindagem de Meta Oculta e Diff da Rodada
	if (cloned.rodadaAtiva) {
		const fase = cloned.fase;
		const isRevelada =
			fase === 'RODADA_REVELACAO' ||
			fase === 'REVELACAO' ||
			fase === 'FIM_DE_JOGO' ||
			fase === 'FIM_JOGO' ||
			fase === 'VITORIA';
		const isCodificador = viewerPlayerId === cloned.rodadaAtiva.codificadorId;

		if (!isRevelada) {
			cloned.rodadaAtiva.diff = null;
			if (!isCodificador) {
				cloned.rodadaAtiva.metaOculta = null;
			}
		}
	}

	return cloned;
}
