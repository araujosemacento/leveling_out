# Arquitetura Técnica, Sistema Distribuído e Composição por Componentes

Este documento detalha os princípios de engenharia, o Game Loop distribuído, o paradigma de Entidades e Componentes, a máquina de estados desacoplada e as convenções de infraestrutura do projeto **Leveling Out**.

---

## 1. O Game Loop como Sistema Distribuído: Input $\rightarrow$ Update $\rightarrow$ Render

A arquitetura de _Leveling Out_ traduz o Game Loop clássico de motores de jogo para um **sistema distribuído autoritativo em tempo real**, onde a responsabilidade pelo ciclo de vida é estritamente dividida:

- O **Front-end (Cliente)** é responsável exclusivamente pelas fases de **Input** e **Render** (além de reconciliação reativa de estado).
- O **Back-end (Servidor PocketBase)** detém a soberania autoritativa exclusiva sobre a fase de **Update** (regras de integridade, cálculo oficial de pontuação e sigilo da meta oculta).

> Para a visualização cronológica completa passo a passo deste ciclo e a topologia de rede entre cliente e servidor, consulte o [Diagrama de Sequência e Topologia do Game Loop Distribuído](../diagramas/diagramas.md#4-diagrama-de-sequência-do-game-loop-distribuído).

### 1.1. Fase de Input (Cliente / Front-end)

- **Captura de Intenção:** Captura eventos brutos de toque, pointer e teclado na interface, além de lances no minijogo de iniciativa.
- **Sanitização Defensiva (Defense in Depth):** Higienização imediata antes do envio (`src/lib/engine/input/sanitize.ts`). Textos são desprovidos de tags HTML, apelidos são limitados a 20 caracteres e valores do slider sofrem _clamping_ matemático para o intervalo $[0, 100]$.
- **Emissão Tipada:** O cliente despacha unicamente objetos de intenção tipados (`GameAction` gerados por `src/lib/engine/input/intent-factory.ts`, como seleção de equipe, disparos de moderação do anfitrião ou lances de PPT), jamais mutando o estado definitivo de pontuação ou rodadas.

### 1.2. Fase de Update (Servidor Autoritário / PocketBase)

- **Autoritarismo de Estado:** A verdade do jogo reside exclusivamente no servidor PocketBase (hooks e framework Go nativo).
- **Gestão Autoritativa do Lobby e Quórum:** O servidor monitora a criação e atualização de registros na coleção `jogadores`. O primeiro participante a entrar é registrado como anfitrião (`is_host: true` e `host_id` na sala). O quórum é limitado estritamente a 4 integrantes por sala, e as equipes Pato (`A`) e Ganso (`B`) possuem limite rígido de 2 integrantes cada. A opção neutra `ALEATORIO` acolhe jogadores indecisos.
- **Moderação Soberana pelo Anfitrião (`POST /api/leveling/salas/{codigo}/expulsar`):** Endpoint exclusivo pelo qual o anfitrião pode revogar autoritativamente o assento de qualquer outro participante no Lobby. O servidor valida a titularidade do host (`host_id`), impede auto-expulsão, exclui o registro do jogador no SQLite, libera imediatamente a vaga da equipe e emite evento SSE de exclusão para toda a rede.
- **Sorteio Estocástico e Inicialização (`POST /api/leveling/salas/{codigo}/iniciar`):** Endpoint exclusivo acionado pelo anfitrião quando o quórum atinge exatamente 4 jogadores. O backend valida a identidade do requisitante (`X-Player-Id`), embaralha criptograficamente (`crypto/rand`) os participantes em `ALEATORIO`, completa as vagas remanescentes de cada equipe para totalizar 2 em cada lado e transiciona a sala para a fase `INICIATIVA`.
- **Geração de Segredos:** Sorteio seguro de metas ocultas no tubo de ensaio ($5\%$ a $95\%$).
- **Cálculo Oficial:** Comparação matemática $|\text{meta} - \text{palpite}|$ e distribuição de pontos (+4, +3, +2, 0) na coleção de rodadas e salas.
- **Resolução de Conflitos:** Arbitragem em memória thread-safe (`$app.store()`) de lances simultâneos de Pedra, Papel e Tesoura.

### 1.3. Fase de Sincronização e Reconciliação (Cliente)

- **Papel da Máquina de Estados Cliente:** A máquina de estados local em `src/lib/engine/update/state-machine.ts` **não toma decisões autônomas de jogo**. Seu papel no cliente é unicamente **sincronizar as mudanças ocorridas no servidor entre todos os jogadores**.
- **Reconciliação Determinística:** Ao receber um evento de rede (SSE), o motor cliente despacha a reconciliação (`FULL_SYNC`, `RODADA_REVELADA`), garantindo que todas as telas conectadas convirjam exatamente para o mesmo estado autoritativo. Caso o participante local identifique que seu assento foi revogado pelo anfitrião (evento de exclusão em `jogadores`), o motor transiciona imediatamente para o estado de sessão revogada, abortando o heartbeat e exibindo aviso informativo de retorno à tela inicial.

### 1.4. Fase de Render (Cliente / Projeção Visual)

- **Função Pura:** A interface é uma função declarativa pura do estado sincronizado ($UI = f(State)$ via `src/lib/engine/render/projections.ts`).
- **Svelte 5 Runes:** Reatividade através de `$state`, `$derived` e `$props`.
- **Blindagem Zero Trust:** A projeção garante que a `meta_oculta` nunca seja exposta no DOM ou nas propriedades reativas para jogadores não autorizados antes da fase de revelação oficial.

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
  - `RoundTimer`: contagem regressiva determinística de tempo.
  - `SessionSyncController`: gerenciamento de ciclo de vida da conexão SSE e emissão de intenções para o PocketBase.
- **Componentes Visuais Finos e Decomposição de Páginas:** Para prevenir arquivos monolíticos (_God Files_), as páginas delegam suas fases e diálogos a componentes atômicos/compostos em `src/lib/components/`:
  - `NicknameModal.svelte`: diálogo bloqueante de identificação de apelido com validação defensiva Zero Trust.
  - `RoomHeader.svelte`: cabeçalho de status da sala, identificação do jogador e botão de cópia com feedback.
  - `DisconnectionBanner.svelte`: banner de aviso com opções exclusivas do anfitrião para desconexões.
  - `LobbyArena.svelte`: grade tripartite de divisão de equipes (Pato, Aleatório, Ganso) e controle de quórum.
  - `GamePlaceholder.svelte`: transição visual para a fase de partida em andamento.
  - `TestTube.svelte`: tubo SVG procedural reativo com menisco duplo e dinâmica de fluidos.

---

## 4. Estratégias de Animação e Renderização Vetorial

Com a eliminação total de runners antigos em p5.js, a camada visual apoia-se em tecnologias nativas de alto desempenho:

1. **SVG Procedural Reativo:** O tubo de ensaio, graduação e menisco são desenhados diretamente em vetores SVG controlados por CSS e Svelte, garantindo resolução infinita e animação de fluidos sem perda de nitidez em telas Retina e móveis.
2. **Svelte Motion e Transitions:** Física de molas (`spring`) para o indicador do slider analógico, interpolação de números (`tweened`) para o placar e transições de tela (`fade`, `fly`).
3. **Web Animations API (WAAPI):** Execução de animações contínuas (como borbulhas e oscilação de menisco) diretamente na GPU, prevenindo engasgos na thread principal do JavaScript.

---

## 5. Backend em Tempo Real: PocketBase e Evolução para Go Nativo

O backend atua como autoridade soberana e exclusiva da fase de Update do sistema distribuído.

### 5.1. Arquitetura do Backend: Go Nativo com PocketBase Estendido

O backend opera como um executável nativo em Go estendendo o PocketBase como framework (`github.com/pocketbase/pocketbase`), estruturado rigorosamente de acordo com a arquitetura de **Entidades e Componentes Atômicos**:

- **Arquitetura do Servidor:** Binário autossuficiente compilado estaticamente em Go (`CGO_ENABLED=0`) com SQLite embutido via `modernc.org/sqlite`, sem dependência de interpretadores externos ou runtime Node/Goja.
- **Transmissão em Tempo Real:** Server-Sent Events (SSE) nativos sobre HTTP através de inscrições por coleção e sala (`pb.collection('salas').subscribe(roomCode, ...)`).
- **Adequação do Backend à Composição por Entidades e Componentes:**
  - **Entidades de Domínio no Servidor (`internal/entities/`):**
    - `EntidadeSessao`: Gerencia o macro-estado da sala compartilhada (`SalaMatch`) e o ciclo micro-temporal da rodada (`RodadaAtiva`).
    - `EntidadeParticipante`: Gerencia tanto os jogadores individuais conectados (`Jogador`) quanto a pontuação cumulativa das equipes (`EquipePato` e `EquipeGanso`).
    - `EntidadeDisputa`: Gerencia confrontos e momentos de tensão competitiva (`DisputaPpt` e `AfericaoProximidade`).
  - **Componentes Atômicos de Backend (`internal/components/`):**
    - `ArbitroPptComponent`: Arbitragem thread-safe de lances de PPT com resolução determinística de confrontos e empates protegida por primitivas nativas (`sync.RWMutex`).
    - `RegraProximidadeComponent`: Algoritmo matemático autoritativo de proximidade e atribuição de faixas de pontuação (+4, +3, +2 ou 0).
    - `SigiloMetaComponent`: Geração criptograficamente segura de `meta_oculta` (números pseudo-aleatórios com `crypto/rand` no intervalo [5, 95]) e blindagem de dados sensíveis.
    - `CleanupComponent`: Rotina periódica em segundo plano para expurgação automática de conexões e salas ociosas.
  - **Decomposição Modular dos Hooks e Rotas (`internal/hooks/`):** Para manter cada arquivo coeso e estritamente abaixo do limite de complexidade, o pacote `hooks` foi particionado em submódulos especializados:
    - `register.go`: Orquestrador principal enxuto que instancia os componentes atômicos e despacha o registro para os módulos filhos.
    - `lifecycle.go`: Regras de negócio acopladas aos gatilhos de criação e atualização das coleções `salas`, `rodadas` e `jogadores`.
    - `routes_lobby.go`: Rotas HTTP autoritativas para o handshake de ingresso (`/entrar`), heartbeats (`/ping`), seleção de equipes (`/equipe`) e dissolução (`/desfazer`).
    - `routes_ppt.go`: Rotas de envio de lances (`/lance`) e consulta de estado da disputa de iniciativa (`/status`).
    - `routes_match.go`: Rotas de início de partida com balanceamento estocástico de participantes indecisos (`/iniciar`) e consulta otimizada (`/snapshot`).
    - `cron.go`: Agendamentos periódicos de tarefas em background para expurgação de inativos.
    - `utils.go`: Utilitários compartilhados de geração de tokens criptográficos, sanitização de apelidos e consultas SQL-Generated JSON.
- **Workflow Automatizado de Releases (`backend/.github/workflows/release.yml`):**
  - Hospedado no repositório dedicado `araujosemacento/backend_leveling_out`, mantendo o ciclo de compilação dos binários desacoplado do cliente web.
  - Matriz de compilação cruzada nativa para Linux (`amd64`, `arm64`), macOS (`amd64`, `arm64`) e Windows (`amd64`).
  - Extração procedural das notas de versão a partir do `CHANGELOG.md` do backend com fallback automático pelo histórico do Git.
  - Geração automática de somas de verificação SHA256 (`SHA256SUMS.txt`) e publicação automática de assets nas Releases do GitHub ao criar tags de versão.

### 5.2. Histórico de Evolução: Transição de Hooks JS para Go Puro

1. **Adequação do Backend à Composição por Entidades e Componentes:**
   - **Entidades de Domínio no Servidor:** Agregadores conceituais amplos instanciados como structs Go em memória ou registros de banco:
     - `EntidadeSessao`: Gerencia o macro-estado da sala compartilhada (`SalaMatch`) e o ciclo micro-temporal da rodada (`RodadaAtiva`).
     - `EntidadeParticipante`: Gerencia tanto os jogadores individuais conectados (`Jogador`) quanto a pontuação cumulativa das equipes (`Equipe`).
     - `EntidadeDisputa`: Gerencia confrontos e momentos de tensão competitiva (`DisputaPpt` e `AfericaoProximidade`).
   - **Componentes Atômicos de Backend:** Cada componente encapsula estritamente uma regra de integridade ou processamento autoritativo:
     - `ArbitroPptComponent`: Arbitragem thread-safe de lances de PPT com resolução determinística de confrontos e empates.
     - `RegraProximidadeComponent`: Algoritmo matemático autoritativo de proximidade e atribuição de faixas de pontuação (+4, +3, +2 ou 0).
     - `SigiloMetaComponent`: Geração criptograficamente segura de `meta_oculta` e mascaramento estrito de dados sensíveis antes do despacho para o cliente.
     - `CicloFasesComponent`: Máquina de transição autoritativa entre fases de jogo (Lobby $\rightarrow$ PPT $\rightarrow$ Rodada $\rightarrow$ Vitória).
     - `ReconciliacaoRedeComponent`: Emissão de eventos SSE ou WebSockets com deltas de estado reconciliados para todos os clientes.

2. **Ganhos Críticos de Segurança e Eficiência em Go Puro:**
   - **Tipagem Estática em Compilação:** Eliminação de erros de digitação em nomes de colunas ou coerção de tipos em tempo de execução; contratos validados pelo compilador `go build`.
   - **Concorrência Segura (Zero Race Conditions):** Arbitragem de lances de PPT e palpites simultâneos protegidos por primitivas nativas de sincronização (`sync.RWMutex`, `sync.Map` e `channels`), substituindo o mapa genérico `$app.store()`.
   - **Eficiência Extrema:** Execução direta em código de máquina sem o custo de conversão de tipos Go/JavaScript, com consumo de memória inferior e escalabilidade nativa de _goroutines_.
   - **Suporte Futuro a WebSockets Duplex:** Capacidade de acoplar rotas nativas de WebSockets para transmissão bidirecional em tempo real de baixa latência.

### 5.3. Eficiência de Serialização e Desserialização JSON

Na implementação atual com hooks em JavaScript (`pb_hooks`), o fluxo de dados JSON não é direto:

1. **O Funil de Tradução de Três Camadas:**
   - **HTTP $\rightarrow$ Go:** O payload JSON recebido via HTTP POST é decodificado via `encoding/json` do Go em structs ou mapas genéricos.
   - **Go $\rightarrow$ Goja VM:** Para alimentar o hook em JavaScript (`game_rules.pb.js`), o runtime Goja utiliza reflexão dinâmica (`reflect`) para mapear tipos Go em objetos da heap JavaScript (`goja.Value`).
   - **Goja VM $\rightarrow$ Go $\rightarrow$ SQLite:** Ao salvar alterações (`$app.save()`), os objetos JS são reconvertidos para a representação interna de Go e então gravados como texto UTF-8 no SQLite.
   - **Go $\rightarrow$ SSE:** Para despachar eventos em tempo real aos clientes inscritos, o PocketBase serializa os registros atualizados novamente em strings JSON transmitidas sobre o canal de Server-Sent Events.

2. **Avaliação Prática de Gargalo:**
   - **No Core Loop Atual (Cadência por Turnos):** Como as ações dos jogadores ocorrem em intervalos humanos espaçados (~30 a 60 segundos por rodada), a latência do ciclo JSON permanece na casa de 0,5 ms a 2 ms, tornando a sobrecarga do Goja imperceptível para o gameplay.
   - **Cenário Crítico (Streaming Analógico Contínuo):** Caso o arrasto do slider venha a ser espelhado em tempo real para os parceiros de equipe (60 atualizações por segundo por jogador), a sobrecarga de reflexão e alocações repetidas de heap no Goja gerará gargalos severos de CPU e latência. A arquitetura mitiga essa hipótese através da migração para Go nativo, onde deltas voláteis de arrasto podem trafegar via WebSockets binários ou buffers pré-alocados sem passar pelo banco ou pela VM JS.

### 5.4. Otimização de Leitura: SQL-Generated JSON (Zero-Copy Pass-Through)

Para mitigar a sobrecarga de serialização em consultas agregadas ou volumosas, a arquitetura contempla o uso de **SQL-Generated JSON**:

1. **Mecânica Direta no SQLite:**
   - O SQLite provê funções nativas em C (`json_object` e `json_group_array`), permitindo estruturar e formatar árvores relacionais complexas (salas, jogadores e histórico de rodadas) em um único comando SQL.
   - O servidor em Go lê o payload resultante diretamente como fatia de bytes bruta (`[]byte`) e o envia ao socket HTTP sem instanciar structs intermediárias na heap nem invocar `encoding/json` por reflexão.

2. **Equilíbrio e Matriz de Aplicação no Jogo:**
   - **Core Loop Volátil (Dicas, Palpites e PPT):** Mantém o pipeline tradicional em Go tipado, onde a legibilidade, validações defensivas e contratos estáticos são prioritários e o volume de dados por requisição é diminuto.
   - **Snapshots Grandes e Métricas Finais:** Recomendado para o carregamento inicial de reconciliação de sala (`FULL_SYNC`) e para a tela de vitória, agregando todo o histórico de rodadas e dados de sintonia em um único roundtrip atômico no SQLite.
   - **Cuidados Arquiteturais:** Exige aplicar filtros de permissão e sigilo diretamente nas cláusulas `WHERE` da query (já que bypassa o resolvedor automático de regras de coleção do PocketBase) e acopla a projeção do payload ao comando SQL.
