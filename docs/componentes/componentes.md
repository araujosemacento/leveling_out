# Entidades e Componentes: Leveling Out

Este documento detalha formalmente a relação entre as **Entidades** e seus **Componentes** no jogo **Leveling Out**, estruturado conforme os padrões de engenharia de jogos e a exigência de entrega da disciplina de Programação para Jogos.

---

## 1. Princípio Arquitetural de Componentes Atômicos

Em consonância com as diretrizes do projeto:

> **Diretriz de Componentes:** Componentes são necessária e imperativamente **atômicos e de uso específico**. Eles não acumulam múltiplas responsabilidades. Cada componente encapsula exclusivamente um conjunto coeso de dados ou uma rotina pontual de comportamento. A capacidade, comportamento e identidade funcional de uma entidade decorrem unicamente da combinação dos componentes atômicos que a compõem.

### Aplicação no nosso Sistema Distribuído

No modelo cliente-servidor de Leveling Out:

1. **Componentes de Input (Cliente):** Capturam eventos brutos do usuário, realizam sanitização defensiva local e emitem intenções tipadas.
2. **Componentes de Update (Servidor Autoritário - PocketBase):** Processam a lógica de negócio verdadeira, sorteiam segredos, resolvem confrontos e calculam pontuações oficiais. Atualmente implementados via hooks JavaScript (`pb_hooks/`), com migração planejada para Go nativo como framework para garantir concorrência thread-safe, tipagem estática e máxima eficiência de execução.
3. **Componentes de Sincronização (Cliente):** Reconciliam a máquina de estados local via Server-Sent Events (SSE), sem jamais decidir o estado por conta própria.
4. **Componentes de Render (Cliente):** Projeções puras de interface ($UI = f(State)$), computando ViewModels, animações de fluidos e blindagem visual da meta oculta.

---

## 2. Visão Geral da Composição

A agregação de componentes nas entidades atende à separação estrita de responsabilidades entre cliente e servidor (Input defensivo no cliente, Update autoritário no PocketBase, Sincronização reativa no cliente e Renderização pura da interface).

> Para a visualização gráfica destas entidades, suas instanciações e seu acoplamento com componentes, consulte [Diagramas de Arquitetura, Entidades e Componentes](../diagramas/diagramas.md).

---

## 3. Matriz de Composição: Entidade $\times$ Componentes

A tabela a seguir consolida quais componentes atômicos equipam cada instância das entidades do jogo:

| Entidade Conceitual        | Instância Específica       | Componentes Atômicos Associados                                           | Camada Principal                |
| :------------------------- | :------------------------- | :------------------------------------------------------------------------ | :------------------------------ |
| **`EntidadeParticipante`** | **Jogador Individual**     | `IdentidadeComponent`<br>`PresencaRedeComponent`<br>`PapelTurnoComponent` | Frontend / Backend              |
| **`EntidadeParticipante`** | **Equipe Coletiva**        | `IdentidadeComponent`<br>`AcumuladorPontosComponent`                      | Backend autoritário             |
| **`EntidadeSessao`**       | **SalaMatch (Lobby/Jogo)** | `CicloFasesComponent`<br>`ReconciliacaoRedeComponent`                     | Backend autoritário / Frontend  |
| **`EntidadeSessao`**       | **RodadaAtiva**            | `ProgressaoRodadaComponent`<br>`CicloFasesComponent`                      | Backend autoritário             |
| **`EntidadeArtefato`**     | **Tubo de Ensaio**         | `NivelLiquidoComponent`<br>`SigiloMetaComponent`                          | Render (Front) / Segredo (Back) |
| **`EntidadeArtefato`**     | **Marcador Analógico**     | `ArrastoAnalogicoComponent`                                               | Input (Front)                   |
| **`EntidadeArtefato`**     | **Carta de Espectro**      | `PolosSemanticosComponent`<br>`DicaTextualComponent`                      | Catálogo / Sanitização          |
| **`EntidadeDisputa`**      | **Disputa PPT**            | `LancePptComponent`<br>`ArbitroPptComponent`                              | Input (Front) / Árbitro (Back)  |
| **`EntidadeDisputa`**      | **Aferição Proximidade**   | `RegraProximidadeComponent`                                               | Update autoritário (Back)       |
| **`EntidadePlacar`**       | **Corrida de Pontos**      | `BarraProgressoComponent`<br>`ModuladorTensaoComponent`                   | Render (Front)                  |
| **`EntidadePlacar`**       | **Painel de Celebração**   | `DisparadorRevancheComponent`                                             | Input / Update                  |

---

## 4. Catálogo Detalhado dos Componentes Atômicos

Para cada componente escolhido, são definidos seus dados atômicos, comportamentos e a justificativa técnica de sua existência.

---

### Grupo A: Componentes de Participação e Agência

#### 1. `IdentidadeComponent`

- **Atributos:** `id: string`, `nome: string`, `equipeId: 'A' | 'B'`.
- **Comportamento:** Valida e sanitiza o apelido do jogador (limite de 20 caracteres alfanuméricos) e sua vinculação de equipe.
- **Camada:** Compartilhada (Frontend para sessão local; Backend para integridade de banco).
- **Justificativa da Atomicidade:** Responsabilidade única de registrar _quem_ é a entidade.

#### 2. `PresencaRedeComponent`

- **Atributos:** `isOnline: boolean`, `ultimoPing: number`.
- **Comportamento:** Emite heartbeats e detecta desconexões. O backend engatilha a purga por inatividade após 15 minutos sem ping.
- **Camada:** Sistema Distribuído (Input periódico no front; verificação de integridade no PocketBase).
- **Justificativa da Atomicidade:** Focado estritamente no estado de conectividade do jogador, sem poluir dados conceituais de gameplay.

#### 3. `PapelTurnoComponent`

- **Atributos:** `papelAtual: 'CODIFICADOR' | 'PALPITEIRO' | 'ESPECTADOR'`.
- **Comportamento:** Avalia dinamicamente se o jogador tem permissão para interagir na tela no momento corrente (ex.: digitar dica ou arrastar o slider).
- **Camada:** Frontend (Projeções reativas de permissão via `getPlayerRoleProjection`).
- **Justificativa da Atomicidade:** O papel de um jogador varia a cada rodada, enquanto sua identidade permanece fixa. Desacoplar este componente permite alternar quem codifica e quem palpita sem alterar a instância do jogador.

#### 4. `AcumuladorPontosComponent`

- **Atributos:** `pontos: number`.
- **Comportamento:** Incrementa valores inteiros positivos quando a equipe pontua.
- **Camada:** Backend autoritativo (`game_rules.pb.js`). O cliente apenas espelha o valor recebido.
- **Justificativa da Atomicidade:** Gerencia única e exclusivamente o placar numérico da equipe, blindando-o contra adulterações do lado cliente.

---

### Grupo B: Componentes de Sessão e Ciclo Temporal

#### 5. `CicloFasesComponent`

- **Atributos:** `faseAtual: GamePhase` (`LOBBY`, `PPT_DISPUTA`, `RODADA_DICA`, `RODADA_PALPITE`, `RODADA_REVELACAO`, `VITORIA`).
- **Comportamento:** Valida a máquina de estados, impedindo transições ilegais (ex.: avançar para palpite sem antes haver uma dica).
- **Camada:** Backend autoritativo com espelhamento determinístico no Reducer cliente.
- **Justificativa da Atomicidade:** Isola as regras de transição de fase da aplicação das mecânicas individuais de cada fase.

#### 6. `ProgressaoRodadaComponent`

- **Atributos:** `numeroRodada: number`, `equipeAtivaId: 'A' | 'B'`.
- **Comportamento:** Incrementa o contador de rodadas e alterna a posse de turno (_momentum_) entre as equipes Corvo e Águia.
- **Camada:** Backend autoritativo.
- **Justificativa da Atomicidade:** Focado unicamente na cadência sequencial das rodadas da partida.

#### 7. `ReconciliacaoRedeComponent`

- **Atributos:** `inscricaoSseAtiva: boolean`, `versaoEstadoServidor: number`.
- **Comportamento:** Escuta eventos SSE disparados pelo PocketBase e injeta ações tipadas (`FULL_SYNC`, `RODADA_REVELADA`) no `GameEngine` cliente.
- **Camada:** Frontend (Controlador de rede cliente).
- **Justificativa da Atomicidade:** Desacopla o protocolo de transporte de rede da lógica matemática interna das regras do jogo.

---

### Grupo C: Componentes de Artefatos Mecânicos e Sensoriais

#### 8. `NivelLiquidoComponent`

- **Atributos:** `percentualAtual: number` ($0 \le x \le 100$).
- **Comportamento:** Controla a altura procedural de renderização do fluido e a física visual do menisco curvo em SVG.
- **Camada:** Frontend (Camada de Render passiva).
- **Justificativa da Atomicidade:** Cuida unicamente da representação gráfica vetorial do volume de fluido.

#### 9. `SigiloMetaComponent`

- **Atributos:** `metaOculta: number` ($5 \le x \le 95$).
- **Comportamento:** No backend, sorteia o valor secreto aleatório. No frontend, impede categoricamente a transmissão da meta para participantes que não sejam o Codificador da vez até a fase oficial de revelação (Princípio Zero Trust).
- **Camada:** Backend autoritativo (Armazenamento) / Frontend (Blindagem de sigilo).
- **Justificativa da Atomicidade:** A segurança da meta oculta é um dos pilares inegociáveis do jogo. Centralizar o sigilo em um componente atômico garante que nenhuma inspeção de DOM ou console revele o segredo precocemente.

#### 10. `ArrastoAnalogicoComponent`

- **Atributos:** `posicaoPx: number`, `percentualPalpite: number` ($0 \le x \le 100$), `isArrastando: boolean`.
- **Comportamento:** Captura eventos de toque/arrasto do ponteiro (`pointermove`, `touchmove`), computa a projeção percentual relativa, aplica limites matemáticos (_clamp_) e emite feedback tátil via `navigator.vibrate`.
- **Camada:** Frontend (Camada de Input via `SliderDragController`).
- **Justificativa da Atomicidade:** Isola toda a complexidade de física analógica de entrada do restante da lógica do jogo.

#### 11. `PolosSemanticosComponent`

- **Atributos:** `poloEsquerdo: string`, `poloDireito: string`.
- **Comportamento:** Fornece os descritores conceituais opostos da carta de espectro sorteada (ex.: "Famoso" e "Anônimo").
- **Camada:** Compartilhada (Catálogo estático de tópicos).
- **Justificativa da Atomicidade:** Fornece apenas o substrato textual da escala semântica.

#### 12. `DicaTextualComponent`

- **Atributos:** `conteudoDica: string`.
- **Comportamento:** Captura a entrada de texto do Codificador, higieniza contra injeção de tags HTML ou quebras de linha e limita o comprimento estritamente a 60 caracteres.
- **Camada:** Frontend (Sanitização defensiva de Input) e Backend (Armazenamento).
- **Justificativa da Atomicidade:** Trata unicamente da validação, integridade e sanitização da pista enviada.

---

### Grupo D: Componentes de Disputa, Conflito e Pontuação

#### 13. `LancePptComponent`

- **Atributos:** `lance: 'pedra' | 'papel' | 'tesoura'`.
- **Comportamento:** Captura a escolha do representante da equipe na disputa de primeiro turno e despacha a intenção tipada para o backend.
- **Camada:** Frontend (Camada de Input).
- **Justificativa da Atomicidade:** Encapsula unicamente a seleção de jogada de um participante.

#### 14. `ArbitroPptComponent`

- **Atributos:** `lancesRecebidos: Record<string, string>`, `resultadoDisputa: 'A' | 'B' | 'EMPATE'`.
- **Comportamento:** Armazena lances em memória atômica thread-safe no PocketBase (`$app.store()`), avalia o confronto das regras clássicas e declara a equipe vencedora para selecionar a primeira carta.
- **Camada:** Backend autoritativo (`iniciativa.pb.js`).
- **Justificativa da Atomicidade:** Responsabilidade exclusiva de arbitrar o minijogo de iniciativa.

#### 15. `RegraProximidadeComponent`

- **Atributos:** `tabelaFaixas: Array<{ deltaMax: number, pontos: number, rotulo: string }>`.
- **Comportamento:** Computa a diferença absoluta $\Delta = |\text{meta} - \text{palpite}|$ e retorna os pontos devidos (+4 para $\le 2\%$, +3 para $\le 6\%$, +2 para $\le 12\%$, 0 para erros maiores).
- **Camada:** Backend autoritativo (Cálculo oficial) e Frontend (Pré-visualização e feedback sonoro/visual).
- **Justificativa da Atomicidade:** Encapsula exclusivamente a fórmula matemática de tolerância de erro que define o pilar de _Acerto Aproximado_.

---

### Grupo E: Componentes de Placar e Canal do Fluxo

#### 16. `BarraProgressoComponent`

- **Atributos:** `progressoPercentualA: number`, `progressoPercentualB: number`, `metaVitoria: number` (10 pontos).
- **Comportamento:** Converte pontos acumulados em frações percentuais [0, 100] para movimentar suavemente a corrida vertical dos ícones das equipes.
- **Camada:** Frontend (Projeção reativa em `getScoreBoardProjection`).
- **Justificativa da Atomicidade:** Trata exclusivamente do cálculo geométrico de avanço do placar.

#### 17. `ModuladorTensaoComponent`

- **Atributos:** `diferencaPontos: number`, `equipeLiderId: 'A' | 'B' | 'EMPATE'`.
- **Comportamento:** Avalia o equilíbrio competitivo da partida. Se a diferença for alta, induz dinamismo no estilo de interface; se houver empate próximo a 10 pontos, intensifica a sinalização visual de momento decisivo.
- **Camada:** Frontend (Render reativo para sustentar o Canal do Fluxo).
- **Justificativa da Atomicidade:** Responsável por traduzir métricas numéricas frias em elementos de atmosfera e engajamento emocional.

#### 18. `DisparadorRevancheComponent`

- **Atributos:** `solicitacoesRevanche: Set<string>`.
- **Comportamento:** Registra o consentimento mútuo das equipes para reiniciar a partida mantendo os mesmos participantes na sala, resetando placares e voltando à fase de PPT.
- **Camada:** Sistema Distribuído (Intenção no cliente; reinício de registros no PocketBase).
- **Justificativa da Atomicidade:** Isola o gatilho de reinício do restante da máquina de estados do jogo ativo.
