# Diretrizes de Arquitetura: Leveling Out (Sistema Distribuído & Composição por Componentes)

## 1. Foco Exclusivo no Jogo Leveling Out (Zero Portfólio)

- O projeto não é um portfólio nem hospeda múltiplos sketches. É única e exclusivamente a aplicação do jogo multiplayer **Leveling Out**.
- Toda a estrutura de rotas, componentes e módulos atende unicamente ao ciclo de jogo de Leveling Out (lobby, sala, disputa PPT, core loop com tubo e slider, revelação e vitória).
- O p5.js e os runners isolados em iframe foram expressamente descontinuados e removidos.

## 2. A Diretriz Quintessencial: O Game Loop como Sistema Distribuído

A aplicação opera sob o desacoplamento de um sistema distribuído em tempo real:

1. **Input (Cliente / Front-end):** Captura interações de toque, gestos de arrasto e digitação. Aplica sanitização defensiva local (`sanitize.ts`) e despacha intenções tipadas (`intent-factory.ts`) para o servidor através da camada de rede WebSocket (`GameSocket`). Nenhum input altera o estado de pontuação diretamente.
2. **Update (Servidor Autoritário / Go Nativo Actor Pattern):** O servidor detém a soberania absoluta das mutações de estado em memória volátil (`RoomActor`). Valida regras de integridade, gera a `meta_oculta` secreta (`secret_target.go`), resolve o minijogo de iniciativa (`ppt_arbiter.go`) e computa o placar por tolerância de proximidade (`proximity.go`).
3. **Sincronização & Reconciliação (Cliente / Front-end):** A máquina de estados cliente (`GameEngine` / `state-machine.ts`) **não toma decisões autônomas de regras**. As atualizações locais ocorrem única e exclusivamente para sincronizar e reconciliar as mudanças ocorridas no servidor entre todos os jogadores através de envelopes WebSocket (`SYNC`, `SLIDER_STREAM`).
4. **Render (Cliente / Front-end):** A casca em Svelte 5 (`$state`, `$derived`, `$props`) e CSS projeta passivamente o estado atual ($UI = f(State)$ via `projections.ts`). As animações e transições reagem a deltas de estado sem interferir na lógica da partida.

## 3. Diretriz de Entidades e Componentes (Composição e Atomicidade)

Para aproximar a arquitetura das convenções de engines profissionais (como Godot e Unity):

1. **Entidades com Papéis Abrangentes:** Quanto mais papéis uma entidade puder conceitualmente abranger, melhor. A entidade atua como um agregador conceitual amplo (`Participante`, `Sessao`, `Artefato`, `Disputa`, `Placar`), especificando-se no momento da nomeação/instanciação (ex.: a entidade Participante é instanciada ora como Jogador, ora como Equipe).
2. **Componentes Imperativamente Atômicos:** Os componentes são estrita e obrigatoriamente atômicos e de uso específico. Cada componente encapsula um conjunto coeso de dados ou uma rotina pontual de comportamento (ex.: `ArrastoAnalogicoComponent`, `SigiloMetaComponent`, `RegraProximidadeComponent`). São os componentes que verdadeiramente modelam e conferem capacidades a uma entidade.

## 4. Pilares de Segurança do Front-end (Zero Trust & Autoritarismo de Estado)

Alinhado ao documento `backend/CONTRACT.md`:

- **Autoritarismo do Servidor:** O front-end nunca arbitra pontuações, vencedores de turnos ou do jogo. O cliente transmite apenas _intenções_ via WebSocket (`SUBMIT_GUESS`, `SUBMIT_CLUE`, `SUBMIT_PPT_MOVE`, `KICK_PLAYER`). A verdade autoritativa reside na goroutine de estado da sala (`RoomActor`).
- **Governança do Lobby e Moderação Soberana:** A expulsão de participantes indesejados é prerrogativa exclusiva do anfitrião (`host_id`) e validada com Zero Trust no backend. O front-end nunca remove participantes localmente por conta própria; despacha a intenção e aguarda a reconciliação autoritativa do evento `KICKADO` e `SYNC`.
- **Sanitização Defensiva (Defense in Depth):** Sanitização prévia no cliente: limite de 60 caracteres em dicas sem HTML, 20 caracteres em apelidos e palpites restritos a inteiros em $[0, 100]$.
- **Sigilo Absoluto da Meta Oculta:** O front-end nunca guarda ou infere a `meta_oculta` antes da fase `RODADA_REVELACAO` emitida pelo servidor.
- **TypeScript como Padrão de Engenharia:** Todo o motor, controladores, modelos e testes devem ser estritamente tipados em TypeScript (`.ts`), com ações modeladas por uniões discriminadas.

## 5. Padrão de Composição (POO) em Controladores de Interface

- **Componentes Pontuais:** Cada componente Svelte deve focar em uma tarefa visual específica (ex.: renderizar a escala do tubo de ensaio, exibir o placar, capturar o texto da dica).
- **Composição sobre Herança:** Rotinas operacionais complexas (cálculo de arrasto tátil no slider, cronômetro de rodada, sincronização WebSocket) devem ser desacopladas em classes composíveis (POO) em TypeScript (`SliderDragController`, `RoundTimer`, `GameSocket`).
- Os componentes Svelte instanciam esses controladores por composição, mantendo as tags `<script>` limpas e declarativas.

## 6. Estilo, Identidade Visual e Animações

- **Paleta Oficial:** Light e Dark extrapoladas a partir das matrizes base em `src/routes/layout.css` mapeadas pelo `@theme`.
- **Tipografia:** Bagel Fat One e Capriola (Estilizadas), SN Pro e Mona Sans (Utilitárias), Fira Code (Monospace).
- **Animações:** Utilizar primariamente Svelte Motion/Transitions (`spring`, `tweened`, `fade`), Web Animations API (Motion) e SVG procedural reativo com CSS para fluídos e menisco. GSAP pode ser empregado para timelines coreografadas de revelação.

## 7. Backend em Tempo Real: Servidor Go Nativo em Memória (Actor Pattern & WebSockets)

- **Motor de Backend:** Servidor autônomo em Go nativo (`net/http` e `gorilla/websocket`), com consumo ínfimo de memória (~10-20 MB de RAM) e zero I/O de disco.
- **Actor Pattern:** Cada sala de jogo é uma goroutine independente (`RoomActor`) consumindo um canal sequencial de mensagens (`inbox chan RoomMessage`), eliminando contention de concorrência e deadlocks sem locks globais de longa duração.
- **WebSockets Full-Duplex:** Comunicação bidirecional contínua de baixa latência em `/ws/salas/{codigo}`, unificando eventos de ciclo de vida e streaming de alta frequência (60 FPS via `requestAnimationFrame`) do slider analógico.
- **Efemeridade e Privacidade:** Autenticação Zero Trust no handshake HTTP de upgrade (101 Switching Protocols) via query parameters (`sessionToken`, `playerId`). Salas inativas são automaticamente purgadas da memória após 15 minutos sem conexões ativas.
