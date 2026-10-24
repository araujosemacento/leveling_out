# Arquitetura Técnica, Sistema Distribuído e Composição por Componentes

Este documento detalha os princípios de engenharia, o Game Loop distribuído, o paradigma de Entidades e Componentes, a máquina de estados desacoplada e as convenções de infraestrutura do projeto **Leveling Out**.

---

## 1. O Game Loop como Sistema Distribuído: Input $\rightarrow$ Update $\rightarrow$ Render

A arquitetura de _Leveling Out_ traduz o Game Loop clássico de motores de jogo para um **sistema distribuído autoritativo em tempo real**, onde a responsabilidade pelo ciclo de vida é estritamente dividida:

- O **Front-end (Cliente)** é responsável exclusivamente pelas fases de **Input** e **Render** (além de reconciliação reativa de estado).
- O **Back-end (Servidor Go Nativo em Memória)** detém a soberania autoritativa exclusiva sobre a fase de **Update** (regras de integridade, cálculo oficial de pontuação e sigilo da meta oculta).

> Para a visualização cronológica completa passo a passo deste ciclo e a topologia de rede entre cliente e servidor, consulte o [Diagrama de Sequência e Topologia do Game Loop Distribuído](../diagramas/diagramas.md#4-diagrama-de-sequência-do-game-loop-distribuído).

### 1.1. Fase de Input (Cliente / Front-end)

- **Captura de Intenção:** Captura eventos brutos de toque, pointer e teclado na interface, além de lances no minijogo de iniciativa e arrastos contínuos no slider.
- **Sanitização Defensiva (Defense in Depth):** Higienização imediata antes do envio (`src/lib/engine/input/sanitize.ts`). Textos são desprovidos de tags HTML, apelidos são limitados a 20 caracteres e valores do slider sofrem _clamping_ matemático para o intervalo $[0, 100]$.
- **Emissão Tipada:** O cliente despacha unicamente comandos JSON tipados através de conexão persistente WebSocket (`GameSocket`), jamais mutando o estado definitivo de pontuação ou rodadas.

### 1.2. Fase de Update (Servidor Autoritário Go / Actor Pattern)

- **Autoritarismo de Estado em Memória:** A verdade do jogo reside exclusivamente no servidor Go autônomo em memória RAM. Cada sala opera como um `RoomActor` executando em goroutine exclusiva com canal de mensagens (`inbox chan`), eliminando condições de corrida sem travas de banco ou overhead de disco.
- **Gestão Autoritativa do Lobby e Quórum:** O ator monitora as conexões ativas na sala. O primeiro participante a ingressar é registrado como anfitrião (`is_host: true` e `host_id`). O quórum é limitado estritamente a 4 integrantes por sala, e as equipes Pato (`A`) e Ganso (`B`) possuem limite rígido de 2 integrantes cada. A opção neutra `ALEATORIO` acolhe jogadores indecisos.
- **Moderação Soberana pelo Anfitrião (`EXPULSAR_JOGADOR` e `BANIR_JOGADOR`):** Comandos exclusivos pelos quais o anfitrião pode revogar autoritativamente o assento de qualquer outro participante no Lobby:
  - _Expulsão (`EXPULSAR_JOGADOR` / `KICKADO`):_ Desconecta o participante e libera a vaga da equipe na hora, permitindo que o participante tente se reconectar se for convidado ou se houver vaga.
  - _Banimento (`BANIR_JOGADOR` / `BANIDO`):_ Registra o `player_id` e o `device_id` na lista de banimento em memória da sala e encerra o WebSocket com status `1008` (Policy Violation). Qualquer tentativa de reingresso do mesmo dispositivo é rejeitada sumariamente pelo servidor enquanto a sala estiver aberta.
- **Sorteio Estocástico e Inicialização (`INICIAR_PARTIDA`):** Comando exclusivo acionado pelo anfitrião quando o quórum atinge exatamente 4 jogadores. O ator valida a identidade do solicitante, embaralha criptograficamente (`crypto/rand`) os participantes em `ALEATORIO`, completa as vagas remanescentes das equipes para totalizar 2 em cada lado e transiciona a sala para a disputa de `INICIATIVA` (Pedra, Papel e Tesoura).
- **Geração de Segredos:** Sorteio seguro de metas ocultas no tubo de ensaio ($5\%$ a $95\%$) via `crypto/rand` pelo `SecretTargetComponent`.
- **Cálculo Oficial:** Comparação matemática $|\text{meta} - \text{palpite}|$ e distribuição de pontos (+4, +3, +2, 0) pelo `ProximityComponent`.
- **Resolução de Conflitos e Timers Determinísticos:** Arbitragem de lances de PPT pelo `PptArbiterComponent` e loop interno de 100ms para timeouts (10s de escolha de PPT, 3s de contagem regressiva e avanço automático após revelação).

### 1.3. Fase de Sincronização e Reconciliação (Cliente)

- **Papel da Máquina de Estados Cliente:** A máquina de estados local em `src/lib/engine/update/state-machine.ts` **não toma decisões autônomas de jogo**. Seu papel no cliente é unicamente **sincronizar as mudanças ocorridas no servidor entre todos os jogadores**.
- **Reconciliação Determinística via WebSocket:** Ao receber um frame `SYNC`, o motor cliente despacha a reconciliação determinística (`FULL_SYNC`, `RODADA_REVELADA`), garantindo que todas as telas convirjam exatamente para o mesmo estado autoritativo. Caso o participante receba o envelope `KICKADO` ou `BANIDO`, o motor interrompe os ciclos de rede, limpa credenciais locais e exibe o modal correspondente (com registro de banimento por dispositivo em `localStorage` para a sala).
- **Streaming em Tempo Real (30-60 Hz):** Durante a fase de palpite, as mensagens `SLIDER_MOVER` enviadas pelo palpiteiro são retransmitidas instantaneamente pelo ator via envelope `SLIDER_STREAM` para os demais membros da sala, permitindo visualização fluida do movimento sem overhead de banco.

### 1.4. Fase de Render (Cliente / Projeção Visual)

- **Função Pura:** A interface é uma função declarativa pura do estado sincronizado ($UI = f(State)$ via `src/lib/engine/render/projections.ts`).
- **Svelte 5 Runes:** Reatividade através de `$state`, `$derived` e `$props`.
- **Blindagem Zero Trust:** A projeção garante que a `meta_oculta` nunca seja exposta no DOM ou nas propriedades reativas para jogadores não autorizados antes da fase de revelação oficial. O servidor Go também aplica essa blindagem sob medida no momento de despachar o frame `SYNC` para cada conexão.

---

## 2. Paradigma de Entidades e Componentes

Para garantir desacoplamento, testabilidade e expressividade típicos de uma game engine:

### 2.1. Entidades com Papéis Abrangentes

As entidades são modeladas como agregadores conceituais amplos. Quanto mais papéis uma entidade puder abranger conceitualmente, mais coesa se torna a arquitetura:

- `EntidadeParticipante`: atua tanto como `JogadorIndividual` (com seus papéis voláteis de Codificador, Palpiteiro e Espectador) quanto como `EquipeColetiva` (Pato vs Ganso).
- `EntidadeSessao`: atua como `SalaMatch` e como `RodadaAtiva`.
- `EntidadeArtefato`: atua como `TuboDeEnsaio`, `MarcadorAnalogico` e `CartaEspectro`.
- `EntidadeDisputa`: atua como `DisputaPpt` e como `JulgamentoProximidade`.
- `EntidadePlacar`: atua como `CorridaPlacar` e como `MetricasSintonia`.

### 2.2. Componentes Imperativamente Atômicos

Os componentes são peças atômicas, reutilizáveis e de uso específico. São eles que verdadeiramente modelam a capacidade de uma entidade:

- Cada componente possui responsabilidade estrita (ex.: `ArrastoAnalogicoComponent` trata apenas de física de slider; `SigiloMetaComponent` trata apenas de proteção de segredo; `RegraProximidadeComponent` trata apenas da tabela de pontuação).
- Uma entidade ganha comportamento ao anexar componentes; remover um componente desativa aquela capacidade sem quebrar o restante da entidade.

> Para a modelagem completa e visualização gráfica em grid, consulte o [Catálogo de Componentes](../componentes/componentes.md), a [Especificação de Entidades](../entidades/entidades.md) e os [Diagramas de Arquitetura, Entidades e Componentes](../diagramas/diagramas.md).

---

## 3. Padrão de Composição em Controladores (POO)

Na camada de interface e cliente, o front-end adota Composição sobre Herança:

- **Controladores Especializados:** Classes dedicadas em TypeScript isolam rotinas complexas da interface:
  - `SliderDragController`: captura de toques, cálculo de offset percentual e sensibilidade tátil.
  - `GameSocket`: cliente WebSocket full-duplex com reconexão exponencial resiliente e streaming contínuo.
- **Componentes Visuais Finos e Decomposição de Páginas:** Para prevenir arquivos monolíticos (_God Files_), as páginas delegam suas fases e diálogos a componentes atômicos/compostos em `src/lib/components/`:
  - `NicknameModal.svelte`: diálogo bloqueante de identificação de apelido com validação defensiva Zero Trust.
  - `RoomHeader.svelte`: cabeçalho de status da sala, identificação do jogador e botão de cópia com feedback.
  - `LobbyArena.svelte`: grade tripartite de divisão de equipes (Pato, Aleatório, Ganso) e controle de quórum.
  - `PptArena.svelte`: arena sincronizada de disputa de iniciativa via Pedra, Papel e Tesoura.
  - `AnalogSlider.svelte`: marcador analógico procedural com suporte a arraste e teclas direcionais.
  - `TestTube.svelte`: tubo SVG procedural reativo com menisco duplo e dinâmica de fluidos.
  - `GamePlaceholder.svelte`: transição visual para a fase de partida em andamento.

---

## 4. Estratégias de Animação e Renderização Vetorial

Com a eliminação total de runners antigos em p5.js, a camada visual apoia-se em tecnologias nativas de alto desempenho:

1. **SVG Procedural Reativo:** O tubo de ensaio, graduação e menisco são desenhados diretamente em vetores SVG controlados por CSS e Svelte, garantindo resolução infinita e animação de fluidos sem perda de nitidez em telas Retina e móveis.
2. **Svelte Motion e Transitions:** Física de molas (`spring`) para o indicador do slider analógico, interpolação de números (`tweened`) para o placar e transições de tela (`fade`, `fly`).
3. **Web Animations API (WAAPI):** Execução de animações contínuas (como borbulhas e oscilação de menisco) diretamente na GPU, prevenindo engasgos na thread principal do JavaScript.

---

## 5. Backend em Tempo Real: Servidor Go Nativo em Memória (Actor Pattern) e WebSockets

O backend atua como autoridade soberana e exclusiva da fase de Update do sistema distribuído. Para atender às exigências de latência imperceptível e streaming analógico contínuo, a arquitetura opera inteiramente em memória RAM nativa via Go, dispensando bancos de dados relacionais e sistemas de arquivos intermediários.

### 5.1. Arquitetura do Servidor: Actor Pattern com Goroutine por Sala

O servidor opera como um executável nativo em Go (`CGO_ENABLED=0`), estruturado rigorosamente sob o paradigma de **Entidades e Componentes Atômicos**:

- **Isolamento de Concorrência via Actor Pattern (`RoomActor`):**
  - Cada sala é uma goroutine independente gerenciada por `RoomActor` (`internal/actor/room_actor.go`).
  - Todas as mutações e requisições transitam por um canal serializador de mensagens (`inbox chan RoomMessage`), garantindo zero condições de corrida sem necessidade de mutexes complexos em nível de jogo ou transações de banco.
  - O hub central (`LobbyHub` em `internal/hub/lobby_hub.go`) mantém as salas ativas protegidas por `sync.RWMutex` apenas para orquestrar instanciações e conexões de novos sockets.
- **Transmissão Bidirecional Full-Duplex (WebSockets):**
  - Endpoint unificado `GET /ws/salas/{codigo}` implementado com a biblioteca de alto desempenho `github.com/coder/websocket`.
  - A autenticação ocorre no handshake HTTP de upgrade via query parameters (`playerId`, `sessionToken`, `nome` e `secret` opcional de proxy reverso).
  - Cada cliente conectado possui um buffer dedicado e seguro com loop assíncrono de escrita (`ClientConn` em `internal/actor/client_conn.go`), prevenindo que clientes lentos travem a goroutine do ator da sala.
- **Ciclo Temporal Determinístico (Ticker de 100ms):**
  - O ator roda um loop com `time.NewTicker(100 * time.Millisecond)`, responsável por contagens regressivas e transições autônomas:
    - Prazo de 10 segundos para lances na disputa de iniciativa (PPT).
    - Contagem regressiva dramática de 3 segundos antes da revelação dos lances de PPT.
    - Avanço automático de 3 segundos após empate no PPT para nova disputa.
    - Avanço automático de 5 segundos após a revelação da pontuação da rodada para iniciar o próximo turno.

### 5.2. Adequação do Backend à Composição por Entidades e Componentes

- **Entidades de Domínio no Servidor (`internal/entities/`):**
  - `EntidadeSessao` (`session.go`): Gerencia o estado completo da sala (`SalaEstado`), o ciclo micro-temporal da rodada (`RodadaAtiva`), histórico de sintonia (`RodadaResumo`) e placares oficiais.
  - `EntidadeParticipante` (`participant.go`): Gerencia os jogadores individuais (`Jogador`), estado de conectividade (`IsOnline`, `LastSeen`), papéis dinâmicos de turno (`PapelTurno`) e métodos de projeção.
  - `EntidadeDisputa` (`contest.go`): Gerencia o estado da disputa de iniciativa (`PptContestState`), confrontos e resoluções.
- **Componentes Atômicos de Backend (`internal/components/`):**
  - `ArbitroPptComponent` (`ppt_arbiter.go`): Arbitragem determinística de lances de Pedra, Papel e Tesoura, resolução de empates e preenchimento por timeout.
  - `RegraProximidadeComponent` (`proximity.go`): Algoritmo matemático autoritativo de proximidade e atribuição de faixas de pontuação (+4, +3, +2 ou 0).
  - `SecretTargetComponent` (`secret_target.go`): Sorteio criptograficamente seguro de metas ocultas no intervalo [5, 95] via `crypto/rand`.
  - `SpectrumsComponent` (`spectrums.go`): Catálogo com 15 pares conceituais de espectro e sorteio estocástico de opções para o início de turno.

### 5.3. Blindagem de Sigilo Zero Trust e Projeções Sob Medida

Diferente de sistemas tradicionais que expõem coleções inteiras e dependem de filtros frágeis no cliente:

1. **Blindagem no Despacho (Servidor):**
   - Ao emitir o frame de sincronização `SYNC`, o `RoomActor` invoca a projeção de cada participante (`CloneProjetado`), omitindo a `meta_oculta` para qualquer jogador que não seja o Codificador ativo na fase de Dica.
   - O segredo só é incluído no payload broadcast para todos quando a fase transita oficialmente para `RODADA_REVELACAO` ou `VITORIA`.
2. **Streaming em Tempo Real do Slider Analógico (30-60 Hz):**
   - Durante a fase de Palpite, o Palpiteiro move o slider e emite mensagens `SLIDER_MOVER`.
   - O `RoomActor` recebe o valor, atualiza a posição corrente em memória e faz o repasse imediato via envelope `SLIDER_STREAM` para os demais integrantes da sala.
   - O cliente utiliza `requestAnimationFrame` para limitar o envio a 30-60 Hz, garantindo suavidade visual sem saturar a rede.

### 5.4. Eliminação de Gargalos e Eficiência de Recursos

- **Zero I/O de Disco:** O estado é 100% volátil em memória RAM. Ao encerrar a sala ou expirar por inatividade, o coletor de lixo (GC) do Go libera os recursos sem fragmentação de banco de dados.
- **Consumo Mínimo de Heap:** O servidor completo em Go puro consome entre 12 MB e 25 MB de RAM, mesmo com dezenas de salas simultâneas ativas.
- **Zero Reflexão no Gameplay:** As estruturas e comandos são fortemente tipados em Go nativo (`internal/protocol/messages.go`), eliminando VMs intermediárias de JavaScript (Goja) e proporcionando processamento de mensagens com latência sub-milisegundo.

---

## 6. Catálogo Exaustivo de Localização do Código e Recursos

A tabela abaixo mapeia cada subsistema, arquivo e sua respectiva responsabilidade principal no projeto:

| O que você precisa alterar / inspecionar | Onde encontrar (Arquivo / Pasta) | Responsabilidade Principal |
| :--- | :--- | :--- |
| **Página inicial do projeto e índice** | `README.md` | Apresentação do jogo, integrantes e sumário de navegação com links diretos. |
| **SGDD consolidado da versão atual** | `docs/sgdd/sgdd.md` | Short Game Design Document (Motta & Trigueiro, SBGames 2013) com texto corrido e listas de produção. |
| **Modelagem de Entidades abrangentes** | `docs/entidades/entidades.md` | As 5 grandes entidades conceituais (`Participante`, `Sessao`, `Artefato`, `Disputa`, etc.). |
| **Catálogo de Componentes atômicos** | `docs/componentes/componentes.md` | Os 19 componentes atômicos, matriz de associação com entidades e justificativas técnicas. |
| **Diagramas de Entidades e Componentes** | `docs/diagramas/diagramas.md` | Diagramas visuais em grid de entidades, instanciações e composição com componentes. |
| **Histórico e Roadmap do Projeto** | `docs/agents/roadmap.md` | Histórico consolidado das Fases 1, 2 e backlog ativo da Fase 3. |
| **Paleta, tokens CSS, dark mode e temas** | `src/routes/layout.css` | Variáveis `:root` e `[data-theme='dark']` (superfícies, textos, cores de equipes e acentos). |
| **Importação de fontes e head global** | `src/app.html` | Links para Google Fonts e CDN (Bagel Fat One, Capriola, SN Pro, Mona Sans, Fira Code). |
| **Casca da aplicação e navegação** | `src/routes/+layout.svelte` | Estrutura comum que envolve todas as páginas e carrega os estilos globais. |
| **Lobby de entrada e criação de sala** | `src/routes/+page.svelte` | Tela inicial com Title Card, criação rápida de sala e entrada de apelido. |
| **Arena principal do jogo (Partida)** | `src/routes/[sala]/+page.svelte` | Orquestrador reativo da sala, ciclo de rede, reconciliação e despacho. |
| **Modal de Identificação (Zero Trust)** | `src/lib/components/NicknameModal.svelte` | Diálogo bloqueante para digitação e validação autoritativa do apelido. |
| **Barra Superior da Sala** | `src/lib/components/RoomHeader.svelte` | Identificação do jogador, badge de host, código da sala e cópia de link. |
| **Identidade Resiliente do Dispositivo** | `src/lib/config/device.ts` | Tripla persistência resiliente com auto-cura de device_id para moderação Zero Trust. |
| **Arena do Lobby (Painel Tripartite)** | `src/lib/components/LobbyArena.svelte` | Distribuição tripartite de equipes (Pato, Aleatório, Ganso) e início pelo anfitrião. |
| **Componente do Tubo de Ensaio (SVG)** | `src/lib/components/TestTube.svelte` | Tubo procedural SVG, dupla camada de menisco contínuo e física de agitação tátil. |
| **Camada de Input (Intenção & Sanitização)** | `src/lib/engine/input/` | Higienização defensiva (sanitize.ts) e normalização de intenções (intent-factory.ts). |
| **Camada de Update (Máquina de Estados)** | `src/lib/engine/update/` | Reducer determinístico (state-machine.ts) e algoritmo de proximidade (score-rules.ts). |
| **Camada de Render (Projeções UI)** | `src/lib/engine/render/` | Seletores puros UI = f(State) e blindagem de sigilo da meta oculta (projections.ts). |
| **Orquestrador do Motor Canônico** | `src/lib/engine/game-engine.ts` | Orquestrador reativo coordenando a cadência Input -> Update -> Render e inscrições. |
| **Conexão e Rede Cliente (WebSocket)** | `src/lib/network/game-socket.ts` | Gerenciador da conexão WebSocket full-duplex, reconexão com teto de 5s e streaming do slider. |
| **Servidor Autoritário Go (Ponto de Entrada)** | `backend/cmd/server/main.go` | Inicialização do servidor nativo HTTP/WebSocket, CORS e encerramento gracioso. |
| **Ator de Sala em Memória (Actor Pattern)** | `backend/internal/actor/room_actor.go` | Goroutine isolada por sala, canal inbox, timers (100ms) e projeção Zero Trust sob medida. |
| **Conexão de Cliente no Servidor** | `backend/internal/actor/client_conn.go` | Wrapper thread-safe de escrita/leitura sobre WebSocket para cada participante. |
| **Hub Central de Salas em Memória** | `backend/internal/hub/lobby_hub.go` | Gerenciador thread-safe de salas ativas na memória RAM. |
| **Protocolo de Mensagens WebSocket** | `backend/internal/protocol/messages.go` | Definição e deserialização tipada de comandos do cliente e envelopes de saída. |
| **Entidades de Domínio no Servidor** | `backend/internal/entities/` | Modelagem em memória: session.go (sala e rodada), participant.go (jogador) e contest.go (disputa). |
| **Componentes Atômicos no Servidor** | `backend/internal/components/` | proximity.go (pontuação), secret_target.go (segredo), ppt_arbiter.go (PPT), spectrums.go (espectros). |
| **Regras e Restrições para Agentes** | `AGENTS.md`, `docs/agents/` e `.agents/` | Proibições estritas, guias aprofundados e convenções do repositório. |
| **Harness e Diretrizes Ponytail (Lean Dev)** | `.agents/rules/ponytail.md` e `.agents/skills/ponytail*` | Escada da menor mudança completa, revisão com `/ponytail-review`, auditoria `/ponytail-audit` e gestão de débito. |
