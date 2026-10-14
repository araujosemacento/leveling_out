# Entidades e Componentes: Leveling Out

Este documento detalha formalmente a relação entre as **Entidades** e seus **Componentes** no jogo **Leveling Out**, estruturado conforme os padrões de engenharia de jogos e a exigência de entrega da disciplina de Programação para Jogos.

---

## 1. Princípio Arquitetural de Componentes Atômicos

Em consonância com as diretrizes do projeto:

> **Diretriz de Componentes:** Componentes são necessária e imperativamente **atômicos e de uso específico**. Eles não acumulam múltiplas responsabilidades. Cada componente encapsula exclusivamente um conjunto coeso de dados ou uma rotina pontual de comportamento. A capacidade, comportamento e identidade funcional de uma entidade decorrem unicamente da combinação dos componentes atômicos que a compõem.

### Aplicação no nosso Sistema Distribuído

No modelo cliente-servidor de Leveling Out:

1. **Componentes de Input (Cliente):** Capturam eventos brutos do usuário, realizam sanitização defensiva local e emitem intenções tipadas.
2. **Componentes de Update (Servidor Autoritário - PocketBase):** Processam a lógica de negócio verdadeira, sorteiam segredos, resolvem confrontos e calculam pontuações oficiais. Implementados nativamente em Go estendendo o PocketBase como framework (`backend/cmd/server/` e `backend/internal/components/`), garantindo concorrência thread-safe com primitivas nativas (`sync.RWMutex`), tipagem estática e máxima eficiência de execução.
3. **Componentes de Sincronização (Cliente):** Reconciliam a máquina de estados local via Server-Sent Events (SSE), sem jamais decidir o estado por conta própria.
4. **Componentes de Render (Cliente):** Projeções puras de interface ($UI = f(State)$), computando ViewModels, animações de fluidos e blindagem visual da meta oculta.

---

## 2. Visão Geral da Composição

A agregação de componentes nas entidades atende à separação estrita de responsabilidades entre cliente e servidor (Input defensivo no cliente, Update autoritário no PocketBase, Sincronização reativa no cliente e Renderização pura da interface).

> Para a visualização gráfica destas entidades, suas instanciações e seu acoplamento com componentes, consulte [Diagramas de Arquitetura, Entidades e Componentes](../diagramas/diagramas.md).

---

## 3. Matriz de Composição: Entidade $\times$ Componentes

A tabela a seguir consolida quais componentes atômicos equipam cada instância das entidades do jogo, indicando suas respectivas camadas e arquivos de implementação no código:

| Entidade Conceitual        | Instância Específica       | Componentes Atômicos Associados                                                    | Camada Principal                | Arquivos no Código (Backend / Frontend)                                                                                                                                                                                                                                                                                                                                                                                        |
| :------------------------- | :------------------------- | :--------------------------------------------------------------------------------- | :------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`EntidadeParticipante`** | **Jogador Individual**     | `IdentidadeComponent`<br>`PresencaRedeComponent`<br>`PapelTurnoComponent`          | Frontend / Backend              | [`backend/internal/entities/participant.go`](../../backend/internal/entities/participant.go)<br>[`src/lib/engine/input/sanitize.ts`](../../src/lib/engine/input/sanitize.ts)<br>[`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts)                                                                                                                                                           |
| **`EntidadeParticipante`** | **Equipe Coletiva**        | `IdentidadeComponent`<br>`AcumuladorPontosComponent`                               | Backend autoritário             | [`backend/internal/entities/participant.go`](../../backend/internal/entities/participant.go)<br>[`backend/internal/entities/session.go`](../../backend/internal/entities/session.go)<br>[`src/lib/engine/types.ts`](../../src/lib/engine/types.ts)                                                                                                                                                                             |
| **`EntidadeSessao`**       | **SalaMatch (Lobby/Jogo)** | `CicloFasesComponent`<br>`ReconciliacaoRedeComponent`<br>`ModeracaoLobbyComponent` | Backend autoritário / Frontend  | [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go)<br>[`backend/internal/hooks/routes_lobby.go`](../../backend/internal/hooks/routes_lobby.go)<br>[`src/lib/engine/game-engine.ts`](../../src/lib/engine/game-engine.ts)<br>[`src/lib/components/LobbyArena.svelte`](../../src/lib/components/LobbyArena.svelte)<br>[`src/routes/[sala]/+page.svelte`](../../src/routes/[sala]/+page.svelte) |
| **`EntidadeSessao`**       | **RodadaAtiva**            | `ProgressaoRodadaComponent`<br>`CicloFasesComponent`                               | Backend autoritário             | [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go)<br>[`src/lib/engine/update/state-machine.ts`](../../src/lib/engine/update/state-machine.ts)                                                                                                                                                                                                                                               |
| **`EntidadeArtefato`**     | **Tubo de Ensaio**         | `NivelLiquidoComponent`<br>`SigiloMetaComponent`                                   | Render (Front) / Segredo (Back) | [`backend/internal/components/secret_target.go`](../../backend/internal/components/secret_target.go)<br>[`src/lib/components/TestTube.svelte`](../../src/lib/components/TestTube.svelte)<br>[`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts)                                                                                                                                               |
| **`EntidadeArtefato`**     | **Marcador Analógico**     | `ArrastoAnalogicoComponent`                                                        | Input (Front)                   | [`src/lib/engine/input/slider-controller.ts`](../../src/lib/engine/input/slider-controller.ts)<br>[`src/lib/components/AnalogSlider.svelte`](../../src/lib/components/AnalogSlider.svelte)                                                                                                                                                                                                                                     |
| **`EntidadeArtefato`**     | **Carta de Espectro**      | `PolosSemanticosComponent`<br>`DicaTextualComponent`                               | Catálogo / Sanitização          | [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts)<br>[`src/lib/engine/input/sanitize.ts`](../../src/lib/engine/input/sanitize.ts)<br>[`src/lib/engine/input/intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts)                                                                                                                                                                                         |
| **`EntidadeDisputa`**      | **Disputa PPT**            | `LancePptComponent`<br>`ArbitroPptComponent`                                       | Input (Front) / Árbitro (Back)  | [`backend/internal/entities/contest.go`](../../backend/internal/entities/contest.go)<br>[`backend/internal/components/ppt_arbiter.go`](../../backend/internal/components/ppt_arbiter.go)<br>[`src/lib/engine/input/intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts)                                                                                                                                           |
| **`EntidadeDisputa`**      | **Aferição Proximidade**   | `RegraProximidadeComponent`                                                        | Update autoritário (Back)       | [`backend/internal/components/proximity.go`](../../backend/internal/components/proximity.go)<br>[`src/lib/engine/update/score-rules.ts`](../../src/lib/engine/update/score-rules.ts)                                                                                                                                                                                                                                           |
| **`EntidadePlacar`**       | **Corrida de Pontos**      | `BarraProgressoComponent`<br>`ModuladorTensaoComponent`                            | Render (Front)                  | [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go)<br>[`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts)                                                                                                                                                                                                                                                   |
| **`EntidadePlacar`**       | **Painel de Celebração**   | `DisparadorRevancheComponent`                                                      | Input / Update                  | [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go)<br>[`src/lib/engine/input/intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts)                                                                                                                                                                                                                                               |

---

## 4. Catálogo Detalhado dos Componentes Atômicos

Para cada componente escolhido, são definidos seus dados atômicos, comportamentos, camadas de execução, arquivos de implementação no código e a justificativa técnica de sua existência.

---

### Grupo A: Componentes de Participação e Agência

#### 1. `IdentidadeComponent`

- **Atributos:** `id: string`, `nome: string`, `equipeId: 'A' | 'B' | 'ALEATORIO'`, `isHost: boolean`.
- **Comportamento:** Valida e sanitiza o apelido do jogador (limite de 20 caracteres alfanuméricos), registra sua atribuição de equipe no lobby e identifica a prerrogativa de anfitrião (`isHost`) concedida ao criador/primeiro jogador da sala.
- **Camada:** Compartilhada (Frontend para sessão local; Backend para integridade de banco e trava de quórum).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/entities/participant.go`](../../backend/internal/entities/participant.go) (`ParticipantEntity`, `Jogador`, campos `ID`, `Name`, `TeamID` e `IsHost`).
  - _Frontend (TypeScript):_ [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (`Player`, `LobbyTeamChoice`) e [`src/lib/engine/input/sanitize.ts`](../../src/lib/engine/input/sanitize.ts) (`sanitizeNickname`).
- **Justificativa da Atomicidade:** Responsabilidade única de registrar _quem_ é a entidade participante e seu status de autoridade de início no lobby.

#### 2. `PresencaRedeComponent`

- **Atributos:** `isOnline: boolean`, `ultimoPing: number`.
- **Comportamento:** Emite heartbeats e detecta desconexões. O backend engatilha a purga por inatividade após 15 minutos sem ping.
- **Camada:** Sistema Distribuído (Input periódico no front; verificação de integridade no PocketBase).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/components/cleanup.go`](../../backend/internal/components/cleanup.go) (`SessionCleaner`, rotina de limpeza de inatividade) e [`backend/pb_hooks/cleanup.pb.js`](../../backend/pb_hooks/cleanup.pb.js).
  - _Frontend (TypeScript/Svelte):_ [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (`Player.isOnline`) e [`src/routes/[sala]/+page.svelte`](../../src/routes/[sala]/+page.svelte) (heartbeats e inscrições SSE).
- **Justificativa da Atomicidade:** Focado estritamente no estado de conectividade do jogador, sem poluir dados conceituais de gameplay.

#### 3. `PapelTurnoComponent`

- **Atributos:** `papelAtual: 'CODIFICADOR' | 'PALPITEIRO' | 'ESPECTADOR'`.
- **Comportamento:** Avalia dinamicamente se o jogador tem permissão para interagir na tela no momento corrente (ex.: digitar dica ou arrastar o slider).
- **Camada:** Frontend (Projeções reativas de permissão via `getPlayerRoleProjection`).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go) (controle de equipe ativa e papéis de turno).
  - _Frontend (TypeScript):_ [`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts) (`getPlayerRoleProjection`) e [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (`PlayerRole`).
- **Justificativa da Atomicidade:** O papel de um jogador varia a cada rodada, enquanto sua identidade permanece fixa. Desacoplar este componente permite alternar quem codifica e quem palpita sem alterar a instância do jogador.

#### 4. `AcumuladorPontosComponent`

- **Atributos:** `pontos: number`.
- **Comportamento:** Incrementa valores inteiros positivos quando a equipe pontua.
- **Camada:** Backend autoritativo (`game_rules.pb.js` / Go). O cliente apenas espelha o valor recebido.
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go) (mapa `Scores` com pontuação oficial das equipes Corvo e Águia) e [`backend/pb_hooks/game_rules.pb.js`](../../backend/pb_hooks/game_rules.pb.js).
  - _Frontend (TypeScript):_ [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (`GameState.scores`) e [`src/lib/engine/update/state-machine.ts`](../../src/lib/engine/update/state-machine.ts).
- **Justificativa da Atomicidade:** Gerencia única e exclusivamente o placar numérico da equipe, blindando-o contra adulterações do lado cliente.

---

### Grupo B: Componentes de Sessão e Ciclo Temporal

#### 5. `CicloFasesComponent`

- **Atributos:** `faseAtual: GamePhase` (`LOBBY`, `PPT_DISPUTA`, `RODADA_DICA`, `RODADA_PALPITE`, `RODADA_REVELACAO`, `VITORIA`).
- **Comportamento:** Valida a máquina de estados, impedindo transições ilegais (ex.: avançar para palpite sem antes haver uma dica).
- **Camada:** Backend autoritativo com espelhamento determinístico no Reducer cliente.
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go) (constantes `PhaseLobby`, `PhaseRoundClue`, etc., e validação de transição) e [`backend/pb_hooks/game_rules.pb.js`](../../backend/pb_hooks/game_rules.pb.js).
  - _Frontend (TypeScript):_ [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (`GamePhase`) e [`src/lib/engine/update/state-machine.ts`](../../src/lib/engine/update/state-machine.ts) (`gameReducer`).
- **Justificativa da Atomicidade:** Isola as regras de transição de fase da aplicação das mecânicas individuais de cada fase.

#### 6. `ProgressaoRodadaComponent`

- **Atributos:** `numeroRodada: number`, `equipeAtivaId: 'A' | 'B'`.
- **Comportamento:** Incrementa o contador de rodadas e alterna a posse de turno (_momentum_) entre as equipes Corvo e Águia.
- **Camada:** Backend autoritativo.
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go) (`CurrentRound`, `ActiveTeamID`, métodos de transição de rodada).
  - _Frontend (TypeScript):_ [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (`GameState.currentRound`, `GameState.activeTeamId`) e [`src/lib/engine/update/state-machine.ts`](../../src/lib/engine/update/state-machine.ts).
- **Justificativa da Atomicidade:** Focado unicamente na cadência sequencial das rodadas da partida.

#### 7. `ReconciliacaoRedeComponent`

- **Atributos:** `inscricaoSseAtiva: boolean`, `versaoEstadoServidor: number`.
- **Comportamento:** Escuta eventos SSE disparados pelo PocketBase e injeta ações tipadas (`FULL_SYNC`, `RODADA_REVELADA`) no `GameEngine` cliente.
- **Camada:** Frontend (Controlador de rede cliente).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ Servidor de eventos SSE em PocketBase e [`backend/cmd/server/main.go`](../../backend/cmd/server/main.go).
  - _Frontend (TypeScript):_ [`src/lib/engine/game-engine.ts`](../../src/lib/engine/game-engine.ts) (`GameEngine.subscribe` e reconciliação determinística) e [`src/routes/[sala]/+page.svelte`](../../src/routes/[sala]/+page.svelte).
- **Justificativa da Atomicidade:** Desacopla o protocolo de transporte de rede da lógica matemática interna das regras do jogo.

---

### Grupo C: Componentes de Artefatos Mecânicos e Sensoriais

#### 8. `NivelLiquidoComponent`

- **Atributos:** `percentualAtual: number` ($0 \le x \le 100$).
- **Comportamento:** Controla a altura procedural de renderização do fluido, a física visual do menisco curvo em SVG com ondas contra-propagantes em loop infinito e a graduação métrica de 1 a 10.
- **Camada:** Frontend (Camada de Render passiva).
- **Arquivo(s) no Código:**
  - _Frontend (Svelte/SVG):_ [`src/lib/components/TestTube.svelte`](../../src/lib/components/TestTube.svelte) (renderizador procedural vetorial) e [`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts) (`getTubeProjection`).
- **Justificativa da Atomicidade:** Cuida unicamente da representação gráfica vetorial do volume de fluido e de sua dinâmica orgânica.

#### 9. `SigiloMetaComponent`

- **Atributos:** `metaOculta: number` ($5 \le x \le 95$).
- **Comportamento:** No backend, sorteia o valor secreto aleatório. No frontend, impede categoricamente a transmissão da meta para participantes que não sejam o Codificador da vez até a fase oficial de revelação (Princípio Zero Trust).
- **Camada:** Backend autoritativo (Armazenamento) / Frontend (Blindagem de sigilo).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/components/secret_target.go`](../../backend/internal/components/secret_target.go) (`SecretTargetComponent.GenerateSecretTarget` com sorteio seguro) e [`backend/pb_hooks/game_rules.pb.js`](../../backend/pb_hooks/game_rules.pb.js).
  - _Frontend (TypeScript):_ [`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts) (`getSecretTargetProjection` aplicando a máscara Zero Trust).
- **Justificativa da Atomicidade:** A segurança da meta oculta é um dos pilares inegociáveis do jogo. Centralizar o sigilo em um componente atômico garante que nenhuma inspeção de DOM ou console revele o segredo precocemente.

#### 10. `ArrastoAnalogicoComponent`

- **Atributos:** `posicaoPx: number`, `percentualPalpite: number` ($0 \le x \le 100$), `isArrastando: boolean`.
- **Comportamento:** Captura eventos de toque/arrasto do ponteiro (`pointermove`, `touchmove`), computa a projeção percentual relativa, aplica limites matemáticos (_clamp_) e emite feedback tátil via `navigator.vibrate`.
- **Camada:** Frontend (Camada de Input via `SliderDragController`).
- **Arquivo(s) no Código:**
  - _Frontend (TypeScript/Svelte):_ [`src/lib/engine/input/slider-controller.ts`](../../src/lib/engine/input/slider-controller.ts) (`SliderDragController`), [`src/lib/components/AnalogSlider.svelte`](../../src/lib/components/AnalogSlider.svelte) e [`src/lib/engine/input/sanitize.ts`](../../src/lib/engine/input/sanitize.ts) (`clampGuess`).
- **Justificativa da Atomicidade:** Isola toda a complexidade de física analógica de entrada do restante da lógica do jogo.

#### 11. `PolosSemanticosComponent`

- **Atributos:** `poloEsquerdo: string`, `poloDireito: string`.
- **Comportamento:** Fornece os descritores conceituais opostos da carta de espectro sorteada (ex.: "Famoso" e "Anônimo").
- **Camada:** Compartilhada (Catálogo estático de tópicos no banco e espelhamento cliente).
- **Arquivo(s) no Código:**
  - _Backend (PocketBase):_ Migrações declarativas da coleção `cartas_espectro` em [`backend/pb_migrations/`](../../backend/pb_migrations/).
  - _Frontend (TypeScript):_ [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (`SpectrumCard`).
- **Justificativa da Atomicidade:** Fornece apenas o substrato textual da escala semântica.

#### 12. `DicaTextualComponent`

- **Atributos:** `conteudoDica: string`.
- **Comportamento:** Captura a entrada de texto do Codificador, higieniza contra injeção de tags HTML ou quebras de linha e limita o comprimento estritamente a 60 caracteres.
- **Camada:** Frontend (Sanitização defensiva de Input) e Backend (Armazenamento).
- **Arquivo(s) no Código:**
  - _Backend (PocketBase):_ Regras de integridade de campo na coleção `rodadas` e [`backend/pb_hooks/game_rules.pb.js`](../../backend/pb_hooks/game_rules.pb.js).
  - _Frontend (TypeScript):_ [`src/lib/engine/input/sanitize.ts`](../../src/lib/engine/input/sanitize.ts) (`sanitizeClue`) e [`src/lib/engine/input/intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts) (`createSubmitClueIntent`).
- **Justificativa da Atomicidade:** Trata unicamente da validação, integridade e sanitização da pista enviada.

---

### Grupo D: Componentes de Disputa, Conflito e Pontuação

#### 13. `LancePptComponent`

- **Atributos:** `lance: 'pedra' | 'papel' | 'tesoura'`.
- **Comportamento:** Captura a escolha do representante da equipe na disputa de primeiro turno e despacha a intenção tipada para o backend.
- **Camada:** Frontend (Camada de Input).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/entities/contest.go`](../../backend/internal/entities/contest.go) (`PptMove`, `PptContest`) e [`backend/pb_hooks/iniciativa.pb.js`](../../backend/pb_hooks/iniciativa.pb.js).
  - _Frontend (TypeScript):_ [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (`PptMove`) e [`src/lib/engine/input/intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts) (`createPptMoveIntent`).
- **Justificativa da Atomicidade:** Encapsula unicamente a seleção de jogada de um participante.

#### 14. `ArbitroPptComponent`

- **Atributos:** `lancesRecebidos: Record<string, string>`, `resultadoDisputa: 'A' | 'B' | 'EMPATE'`.
- **Comportamento:** Armazena lances em memória atômica thread-safe no PocketBase (`$app.store()`), avalia o confronto das regras clássicas e declara a equipe vencedora para selecionar a primeira carta.
- **Camada:** Backend autoritativo (`iniciativa.pb.js` / Go).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/components/ppt_arbiter.go`](../../backend/internal/components/ppt_arbiter.go) (`PptArbiterComponent.ResolveMoves`) e [`backend/pb_hooks/iniciativa.pb.js`](../../backend/pb_hooks/iniciativa.pb.js).
  - _Frontend (TypeScript):_ [`src/lib/engine/update/state-machine.ts`](../../src/lib/engine/update/state-machine.ts) (`gameReducer` espelhamento de resultado).
- **Justificativa da Atomicidade:** Responsabilidade exclusiva de arbitrar o minijogo de iniciativa.

#### 15. `RegraProximidadeComponent`

- **Atributos:** `tabelaFaixas: Array<{ deltaMax: number, pontos: number, rotulo: string }>`.
- **Comportamento:** Computa a diferença absoluta $\Delta = |\text{meta} - \text{palpite}|$ e retorna os pontos devidos (+4 para $\le 2\%$, +3 para $\le 6\%$, +2 para $\le 12\%$, 0 para erros maiores).
- **Camada:** Backend autoritativo (Cálculo oficial) e Frontend (Pré-visualização e feedback sonoro/visual).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/components/proximity.go`](../../backend/internal/components/proximity.go) (`ProximityComponent.Calculate`) e [`backend/pb_hooks/game_rules.pb.js`](../../backend/pb_hooks/game_rules.pb.js).
  - _Frontend (TypeScript):_ [`src/lib/engine/update/score-rules.ts`](../../src/lib/engine/update/score-rules.ts) (`calculateRoundScore`, `PROXIMITY_TIERS`).
- **Justificativa da Atomicidade:** Encapsula exclusivamente a fórmula matemática de tolerância de erro que define o pilar de _Acerto Aproximado_.

---

### Grupo E: Componentes de Placar e Canal do Fluxo

#### 16. `BarraProgressoComponent`

- **Atributos:** `progressoPercentualA: number`, `progressoPercentualB: number`, `metaVitoria: number` (10 pontos).
- **Comportamento:** Converte pontos acumulados em frações percentuais [0, 100] para movimentar suavemente a corrida vertical dos ícones das equipes.
- **Camada:** Frontend (Projeção reativa em `getScoreBoardProjection`).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go) (pontuações acumuladas `ScoreA` e `ScoreB`).
  - _Frontend (TypeScript/Svelte):_ [`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts) (`getScoreBoardProjection`) e componentes de placar em Svelte.
- **Justificativa da Atomicidade:** Trata exclusivamente do cálculo geométrico de avanço do placar.

#### 17. `ModuladorTensaoComponent`

- **Atributos:** `diferencaPontos: number`, `equipeLiderId: 'A' | 'B' | 'EMPATE'`.
- **Comportamento:** Avalia o equilíbrio competitivo da partida. Se a diferença for alta, induz dinamismo no estilo de interface; se houver empate próximo a 10 pontos, intensifica a sinalização visual de momento decisivo.
- **Camada:** Frontend (Render reativo para sustentar o Canal do Fluxo).
- **Arquivo(s) no Código:**
  - _Frontend (TypeScript):_ [`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts) (`getTensionStateProjection`) e [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts).
- **Justificativa da Atomicidade:** Responsável por traduzir métricas numéricas frias em elementos de atmosfera e engajamento emocional.

#### 18. `DisparadorRevancheComponent`

- **Atributos:** `solicitacoesRevanche: Set<string>`.
- **Comportamento:** Registra o consentimento mútuo das equipes para reiniciar a partida mantendo os mesmos participantes na sala, resetando placares e voltando à fase de PPT.
- **Camada:** Sistema Distribuído (Intenção no cliente; reinício de registros no PocketBase).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go) (`ResetForRematch`) e [`backend/pb_hooks/game_rules.pb.js`](../../backend/pb_hooks/game_rules.pb.js).
  - _Frontend (TypeScript/Svelte):_ [`src/lib/engine/input/intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts) (`createRequestRematchIntent`) e [`src/routes/[sala]/+page.svelte`](../../src/routes/[sala]/+page.svelte).
- **Justificativa da Atomicidade:** Isola o gatilho de reinício do restante da máquina de estados do jogo ativo.

#### 19. `ModeracaoLobbyComponent`

- **Atributos:** `isHost: boolean`, `alvoPlayerId: string | null`.
- **Comportamento:** Media a autoridade de governança da sala concedida ao anfitrião. No cliente, projeta botões de expulsão de participantes exclusivos para o anfitrião ao lado dos integrantes das equipes e despacha a intenção tipada de remoção; no servidor PocketBase/Go, processa a rota autoritativa `POST /api/leveling/salas/{codigo}/expulsar`, valida soberanamente a titularidade do anfitrião (`host_id`), exclui o registro do jogador no SQLite, libera a vaga na equipe e emite broadcast SSE de exclusão para toda a rede.
- **Camada:** Sistema Distribuído (Input defensivo e Render no cliente; validação soberana e Update autoritativo no PocketBase).
- **Arquivo(s) no Código:**
  - _Backend (Go):_ [`backend/CONTRACT.md`](../../backend/CONTRACT.md) (endpoint `POST /api/leveling/salas/{codigo}/expulsar`) e [`backend/internal/hooks/register.go`](../../backend/internal/hooks/register.go).
  - _Frontend (TypeScript/Svelte):_ [`src/lib/engine/input/intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts), [`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts) (`getLobbyProjection`) e [`src/routes/[sala]/+page.svelte`](../../src/routes/[sala]/+page.svelte).
- **Justificativa da Atomicidade:** Isola as regras de governança e expurgação ativa de participantes da mecânica de presença ordinária (heartbeat) e da identidade fixa do jogador.
