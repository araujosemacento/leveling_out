# Diretrizes de Arquitetura: Leveling Out (Sistema Distribuído & Composição por Componentes)

## 1. Foco Exclusivo no Jogo Leveling Out (Zero Portfólio)

- O projeto não é um portfólio nem hospeda múltiplos sketches. É única e exclusivamente a aplicação do jogo multiplayer **Leveling Out**.
- Toda a estrutura de rotas, componentes e módulos atende unicamente ao ciclo de jogo de Leveling Out (lobby, sala, disputa PPT, core loop com tubo e slider, revelação e vitória).
- O p5.js e os runners isolados em iframe foram expressamente descontinuados e removidos.

## 2. A Diretriz Quintessencial: O Game Loop como Sistema Distribuído

A aplicação opera sob o desacoplamento de um sistema distribuído em tempo real:

1. **Input (Cliente / Front-end):** Captura interações de toque, gestos de arrasto e digitação. Aplica sanitização defensiva local (`sanitize.ts`) e despacha intenções tipadas (`intent-factory.ts`) para o servidor. Nenhum input altera o estado de pontuação diretamente.
2. **Update (Servidor Autoritário / PocketBase):** O servidor detém a soberania absoluta das mutações de estado. Valida regras de integridade (`pb_hooks/game_rules.pb.js`), gera a `meta_oculta` secreta, resolve o minijogo de iniciativa (`pb_hooks/iniciativa.pb.js`) e computa o placar por tolerância de proximidade.
3. **Sincronização & Reconciliação (Cliente / Front-end):** A máquina de estados cliente (`GameEngine` / `state-machine.ts`) **não toma decisões autônomas de regras**. As atualizações locais ocorrem única e exclusivamente para sincronizar e reconciliar as mudanças ocorridas no servidor entre todos os jogadores através de assinaturas SSE.
4. **Render (Cliente / Front-end):** A casca em Svelte 5 (`$state`, `$derived`, `$props`) e CSS projeta passivamente o estado atual ($UI = f(State)$ via `projections.ts`). As animações e transições reagem a deltas de estado sem interferir na lógica da partida.

## 3. Diretriz de Entidades e Componentes (Composição e Atomicidade)

Para aproximar a arquitetura das convenções de engines profissionais (como Godot e Unity):

1. **Entidades com Papéis Abrangentes:** Quanto mais papéis uma entidade puder conceitualmente abranger, melhor. A entidade atua como um agregador conceitual amplo (`Participante`, `Sessao`, `Artefato`, `Disputa`, `Placar`), especificando-se no momento da nomeação/instanciação (ex.: a entidade Participante é instanciada ora como Jogador, ora como Equipe).
2. **Componentes Imperativamente Atômicos:** Os componentes são estrita e obrigatoriamente atômicos e de uso específico. Cada componente encapsula um conjunto coeso de dados ou uma rotina pontual de comportamento (ex.: `ArrastoAnalogicoComponent`, `SigiloMetaComponent`, `RegraProximidadeComponent`). São os componentes que verdadeiramente modelam e conferem capacidades a uma entidade.

## 4. Pilares de Segurança do Front-end (Zero Trust & Autoritarismo de Estado)

Alinhado ao documento `backend/SECURITY.md`:

- **Autoritarismo do Servidor:** O front-end nunca arbitra pontuações, vencedores de turnos ou do jogo. O cliente transmite apenas _intenções_ (`SUBMIT_GUESS`, `SUBMIT_CLUE`, `SUBMIT_PPT_MOVE`). A verdade autoritativa reside nos hooks do PocketBase (`pb_hooks/game_rules.pb.js`).
- **Sanitização Defensiva (Defense in Depth):** Sanitização prévia no cliente: limite de 60 caracteres em dicas sem HTML, 20 caracteres em apelidos e palpites restritos a inteiros em $[0, 100]$.
- **Sigilo Absoluto da Meta Oculta:** O front-end nunca guarda ou infere a `meta_oculta` antes da fase `RODADA_REVELACAO` emitida pelo servidor.
- **TypeScript como Padrão de Engenharia:** Todo o motor, controladores, modelos e testes devem ser estritamente tipados em TypeScript (`.ts`), com ações modeladas por uniões discriminadas.

## 5. Padrão de Composição (POO) em Controladores de Interface

- **Componentes Pontuais:** Cada componente Svelte deve focar em uma tarefa visual específica (ex.: renderizar a escala do tubo de ensaio, exibir o placar, capturar o texto da dica).
- **Composição sobre Herança:** Rotinas operacionais complexas (cálculo de arrasto tátil no slider, cronômetro de rodada, sincronização SSE) devem ser desacopladas em classes composíveis (POO) em TypeScript (`SliderDragController`, `RoundTimer`, `SessionSyncController`).
- Os componentes Svelte instanciam esses controladores por composição, mantendo as tags `<script>` limpas e declarativas.

## 6. Estilo, Identidade Visual e Animações

- **Paleta Oficial:** Light e Dark extrapoladas a partir das matrizes base em `src/routes/layout.css` mapeadas pelo `@theme`.
- **Tipografia:** Bagel Fat One e Capriola (Estilizadas), SN Pro e Mona Sans (Utilitárias), Fira Code (Monospace).
- **Animações:** Utilizar primariamente Svelte Motion/Transitions (`spring`, `tweened`, `fade`), Web Animations API (Motion) e SVG procedural reativo com CSS para fluídos e menisco. GSAP pode ser empregado para timelines coreografadas de revelação.

## 7. Backend em Tempo Real: PocketBase e Migração para Go Nativo

- **Motor de Backend:** **PocketBase** (binário único em Go + SQLite embarcado), selecionado por seu consumo mínimo de memória (~15-30 MB de RAM).
- **Túnel e Exposição:** Conexão externa via **Tailscale Funnel** ou **Cloudflare Tunnel**, permitindo conexões SSE e REST seguras.
- **Efemeridade e Privacidade:** Participantes anônimos via `sessionStorage` e higienização automática (`pb_hooks/cleanup.pb.js`) purgando registros inativos a cada 15 minutos.
- **Evolução para Go Nativo com Entidades e Componentes:** Transição planejada das regras de `pb_hooks/` (Goja) para Go nativo como framework (`pocketbase/pocketbase`), estruturando o servidor formalmente em Entidades (`EntidadeSessao`, `EntidadeParticipante`, `EntidadeDisputa`) e Componentes Atômicos (`ArbitroPptComponent`, `RegraProximidadeComponent`, `SigiloMetaComponent`), eliminando overhead de VMs dinâmicas e garantindo segurança estática de tipos e concorrência nativa (`sync.RWMutex`).
