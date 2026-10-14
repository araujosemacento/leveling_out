# Entidades do Jogo: Leveling Out

Este documento apresenta a especificação revisada das **Entidades do Jogo** para a disciplina de Programação para Jogos, em conformidade com a diretriz arquitetural do projeto:

> **Diretriz de Entidades:** No modelo arquitetural de Leveling Out, quanto mais papéis uma entidade puder conceitualmente abranger, melhor. A entidade atua como um agregador conceitual amplo e genérico, sendo especializada na sua instanciação e modelada em suas reais capacidades através da agregação exclusiva de **componentes atômicos**.

---

## 1. O Conceito de Entidade em Leveling Out

Em jogos estruturados sob o paradigma de composição (inspirado em game engines como Unity, Godot e modelos ECS), uma entidade não deve ser uma classe rígida com lógica monolítica e dezenas de subclasses herdeiras. Em vez disso:

- **Identidade e Agregação:** A entidade possui um identificador unívoco (`id`), uma etiqueta semântica de instanciação e um conjunto de componentes acoplados.
- **Polimorfismo Conceitual:** Uma única definição de entidade abrange papéis variados. O que diferencia uma entidade da outra não é uma hierarquia de herança, mas sim o **conjunto atômico de componentes que ela abriga** e o contexto em que foi instanciada.
- **Desacoplamento Distribuído:** A entidade existe no cliente como uma casca de interação/renderização e no servidor como um registro de estado autoritativo.

---

## 2. As Grandes Entidades Conceituais do Jogo

O domínio de Leveling Out é coberto integralmente por **5 Entidades Conceituais Abrangentes**:

1. **`EntidadeParticipante` (`ParticipantEntity`):** Modela os agentes ativos do jogo, abrangendo tanto o jogador individual conectado via navegador quanto a equipe coletiva à qual pertence.
2. **`EntidadeSessao` (`SessionEntity`):** Modela o contexto espaço-temporal da partida, abrangendo a sala persistente global (`roomCode`) e o estado volátil da rodada ativa.
3. **`EntidadeArtefato` (`ArtifactEntity`):** Modela os objetos de jogo tangíveis manipulados pelos jogadores: o tubo de ensaio com nível de líquido, o marcador analógico e as cartas bipolares de espectro.
4. **`EntidadeDisputa` (`ContestEntity`):** Modela os momentos de atrito, tensão e tomada de decisão: o minijogo de Pedra, Papel e Tesoura (iniciativa) e a revelação dramática de proximidade.
5. **`EntidadePlacar` (`ScoreboardEntity`):** Modela a avaliação de desempenho e a evolução do jogo: a corrida rumo aos 10 pontos e as métricas de sintonia da rodada.

> Para a visualização completa destas entidades, suas instanciações e seu acoplamento com componentes, consulte [Diagramas de Arquitetura, Entidades e Componentes](../diagramas/diagramas.md).

---

## 3. Detalhamento das Entidades e seus Papéis Abrangentes

### 3.1. `EntidadeParticipante` (`ParticipantEntity`)

Representa qualquer participante ou grupo de participantes com agência social e competitiva dentro do jogo. Abrange conceitualmente tanto os indivíduos conectados quanto as equipes às quais pertencem.

- **Papéis Abrangidos:**
  - _Ator Individual:_ O jogador humano utilizando seu navegador.
  - _Codificador da Rodada:_ O participante ativo encarregado de observar o nível secreto e redigir a pista.
  - _Palpiteiro da Rodada:_ O participante ativo encarregado de ler a pista e deslizar o marcador analógico.
  - _Espectador Conectado:_ Jogadores da equipe inativa ou participantes observando a resolução da rodada.
  - _Coletivo Competitivo (Equipe):_ A congregação de membros sob os ícones Corvo (Equipe A) ou Águia (Equipe B), detentora da pontuação coletiva e do _momentum_.
- **Especialização na Instanciação:**
  - Instância `Jogador`: recebe componentes de identidade individual, presença de rede e papéis dinâmicos de turno.
  - Instância `Equipe`: recebe componentes de agrupamento, acumulação de placar e controle de posse de turno.
- **Mapeamento de Arquivos no Código:**
  - _Backend (Go):_ [`backend/internal/entities/participant.go`](../../backend/internal/entities/participant.go) (estruturas `ParticipantEntity`, `PlayerState` e métodos de agregação de equipe).
  - _Frontend (TypeScript):_ [`src/lib/engine/types.ts`](../../src/lib/engine/types.ts) (tipos discriminados `Player`, `TeamId`, `TeamSummary`) e [`src/lib/engine/input/sanitize.ts`](../../src/lib/engine/input/sanitize.ts) (`sanitizeNickname`).

---

### 3.2. `EntidadeSessao` (`SessionEntity`)

Representa o contêiner espacial e temporal da experiência multijogador, orquestrando desde a criação do ambiente compartilhado até as iterações cíclicas de jogo.

- **Papéis Abrangidos:**
  - _Sala de Conexão (Lobby):_ Ponto de encontro distribuído associado a um código de slug (`/[sala]`), permitindo entrada via URL.
  - _Partida Global:_ Orquestrador do macro-estado do jogo (da disputa inicial de iniciativa até a celebração da vitória).
  - _Rodada Operacional:_ Ciclo micro-temporal da jogada atual (início, dica, palpite, revelação e cálculo de pontuação).
- **Especialização na Instanciação:**
  - Instância `SalaMatch`: orquestra a máquina de estados global, a reconciliação de conexões e a persistência no PocketBase.
  - Instância `RodadaCiclo`: orquestra o índice numérico da rodada, os ponteiros para a equipe da vez e o histórico de rodadas passadas.
- **Mapeamento de Arquivos no Código:**
  - _Backend (Go):_ [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go) (estrutura `SessionEntity`, controle de fases `GamePhase` e métodos de avanço de turno).
  - _Frontend (TypeScript):_ [`src/lib/engine/update/state-machine.ts`](../../src/lib/engine/update/state-machine.ts) (`gameReducer`) e [`src/lib/engine/game-engine.ts`](../../src/lib/engine/game-engine.ts) (`GameEngine`).

---

### 3.3. `EntidadeArtefato` (`ArtifactEntity`)

Representa qualquer instrumento mecânico, visual ou sensorial com o qual os participantes interagem ou a partir do qual extraem informações conceituais durante a partida.

- **Papéis Abrangidos:**
  - _Recipiente de Líquido (Tubo de Ensaio):_ Recipiente graduado que exibe graficamente o nível de fluido em porcentagem [0%, 100%], o menisco curvo e borbulhas procedurais em SVG.
  - _Controlador de Calibração (Marcador Analógico):_ Dispositivo de entrada contínua (_slider_) que o palpiteiro desliza para expressar seu grau de certeza.
  - _Suporte Semântico (Carta de Espectro):_ Objeto portador dos polos opostos conceituais (ex.: "Famoso / Anônimo"), servindo como régua semântica de referência.
- **Especialização na Instanciação:**
  - Instância `TuboDeEnsaio`: dotada de componentes de nível de líquido e blindagem de sigilo Zero Trust da meta.
  - Instância `MarcadorAnalogico`: dotada de componentes de cálculo de arrasto analógico, clamp matemático e feedback háptico.
  - Instância `CartaEspectro`: dotada de componentes de polaridade semântica e armazenamento da dica textual sanitizada.
- **Mapeamento de Arquivos no Código:**
  - _Tubo de Ensaio (Svelte/SVG):_ [`src/lib/components/TestTube.svelte`](../../src/lib/components/TestTube.svelte) (renderização procedural de menisco em contra-propagação).
  - _Sigilo da Meta (Go/TS):_ [`backend/internal/components/secret_target.go`](../../backend/internal/components/secret_target.go) (sorteio criptográfico) e [`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts) (`getTubeProjection`).
  - _Entrada e Sanitização (TS):_ [`src/lib/engine/input/sanitize.ts`](../../src/lib/engine/input/sanitize.ts) (`sanitizeClue`, `clampGuess`).

---

### 3.4. `EntidadeDisputa` (`ContestEntity`)

Representa qualquer mecanismo formal do jogo projetado para resolver conflitos de assimetria, confrontar decisões ou julgar o alinhamento subjetivo entre as equipes.

- **Papéis Abrangidos:**
  - _Árbitro de Primeiro Turno (Minijogo PPT):_ Conflito instantâneo de Pedra, Papel e Tesoura para definir democraticamente qual time inicia pontuando e escolhendo a primeira carta.
  - _Aferidor de Proximidade (Revelação de Pontuação):_ Mecanismo determinístico de avaliação que compara o palpite com a meta real, calculando a distância absoluta e transformando-a em pontos de sintonia (+4, +3, +2 ou 0).
- **Especialização na Instanciação:**
  - Instância `DisputaPpt`: recebe componentes de submissão de lances e tabela de resolução de confrontos em memória thread-safe.
  - Instância `JulgamentoProximidade`: recebe componentes com a regra matemática de tolerância de erro por faixas percentuais.
- **Mapeamento de Arquivos no Código:**
  - _Backend (Go):_ [`backend/internal/entities/contest.go`](../../backend/internal/entities/contest.go), [`backend/internal/components/ppt_arbiter.go`](../../backend/internal/components/ppt_arbiter.go) e [`backend/internal/components/proximity.go`](../../backend/internal/components/proximity.go).
  - _Frontend (TypeScript):_ [`src/lib/engine/update/score-rules.ts`](../../src/lib/engine/update/score-rules.ts) (`calculateScore`) e [`src/lib/engine/input/intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts) (`createSubmitPptAction`).

---

### 3.5. `EntidadePlacar` (`ScoreboardEntity`)

Representa o monitor contínuo do progresso competitivo, responsável por retroalimentar os participantes sobre seu desempenho e sustentar a tensão psicológica no Canal do Fluxo.

- **Papéis Abrangidos:**
  - _Corrida de Pontuação:_ Placar comparativo vertical que mede a distância de cada equipe em relação à meta de vitória (10 pontos).
  - _Regulador de Tensão (Curva de Dificuldade):_ Indicador dinâmico de diferença de pontos que induz ansiedade quando o rival avança e alívio quando o rival comete um erro.
  - _Painel de Celebração e Sintonia:_ Interface final de encerramento da partida que exibe destaques da partida e viabiliza a revanche imediata.
- **Especialização na Instanciação:**
  - Instância `CorridaPlacar`: recebe componentes de acumulação de pontos, cálculo de barras de progresso e verificação de condição de vitória.
  - Instância `MetricasSintonia`: recebe componentes de agregação de acertos na mosca, maiores gafes e estatísticas de empatia.
- **Mapeamento de Arquivos no Código:**
  - _Backend (Go):_ [`backend/internal/entities/session.go`](../../backend/internal/entities/session.go) (rastreamento oficial de `ScoreTeamA` e `ScoreTeamB`).
  - _Frontend (TS/Svelte):_ [`src/lib/engine/render/projections.ts`](../../src/lib/engine/render/projections.ts) (`getScoreBoardProjection`) e [`src/routes/[sala]/+page.svelte`](../../src/routes/[sala]/+page.svelte) (renderização dos marcadores).

---

## 4. Síntese Comparativa das Entidades

| Entidade Conceitual        | Instanciações Típicas                          | Papéis Aglutinados                                                   | O que a Modela (Componentes Chave)                                    | Arquivo no Backend (Go)                                                                                                                                                                            | Arquivo no Frontend (TS/Svelte)                                                                                                     |
| :------------------------- | :--------------------------------------------- | :------------------------------------------------------------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **`EntidadeParticipante`** | Jogador, Equipe                                | Agente humano, Codificador, Palpiteiro, Espectador, Time Competitivo | Identidade, Presença de Rede, Papel de Turno, Acumulador de Pontos    | [`participant.go`](../../backend/internal/entities/participant.go)                                                                                                                                 | [`types.ts`](../../src/lib/engine/types.ts), [`sanitize.ts`](../../src/lib/engine/input/sanitize.ts)                                |
| **`EntidadeSessao`**       | SalaMatch, RodadaAtiva                         | Lobby de sala, Partida global, Ciclo temporal de rodada              | Ciclo de Fases, Progressão de Rodada, Reconciliação SSE               | [`session.go`](../../backend/internal/entities/session.go)                                                                                                                                         | [`state-machine.ts`](../../src/lib/engine/update/state-machine.ts), [`game-engine.ts`](../../src/lib/engine/game-engine.ts)         |
| **`EntidadeArtefato`**     | TuboDeEnsaio, MarcadorAnalogico, CartaEspectro | Recipiente visual, Slider de calibração, Carta temática bipolar      | Nível de Líquido, Sigilo de Meta, Arrasto Analógico, Polos Semânticos | [`secret_target.go`](../../backend/internal/components/secret_target.go)                                                                                                                           | [`TestTube.svelte`](../../src/lib/components/TestTube.svelte), [`sanitize.ts`](../../src/lib/engine/input/sanitize.ts)              |
| **`EntidadeDisputa`**      | DisputaPpt, JulgamentoProximidade              | Decisor de primeiro turno, Avaliador de proximidade                  | Lance de PPT, Árbitro de Regras, Tolerância por Faixas                | [`contest.go`](../../backend/internal/entities/contest.go), [`ppt_arbiter.go`](../../backend/internal/components/ppt_arbiter.go), [`proximity.go`](../../backend/internal/components/proximity.go) | [`score-rules.ts`](../../src/lib/engine/update/score-rules.ts), [`intent-factory.ts`](../../src/lib/engine/input/intent-factory.ts) |
| **`EntidadePlacar`**       | CorridaPlacar, MetricasSintonia                | Rastreador de corrida, Regulador do Canal do Fluxo, Tela de vitória  | Progresso de Pontos, Modulador de Tensão, Disparador de Revanche      | [`session.go`](../../backend/internal/entities/session.go)                                                                                                                                         | [`projections.ts`](../../src/lib/engine/render/projections.ts), [`+page.svelte`](../../src/routes/[sala]/+page.svelte)              |
