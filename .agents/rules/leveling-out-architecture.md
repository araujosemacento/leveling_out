# Diretrizes de Arquitetura: Leveling Out (Svelte Nativo & Game Loop Canônico)

## 1. Foco Exclusivo no Jogo Leveling Out (Zero Portfólio)

- O projeto não é um portfólio nem hospeda múltiplos sketches. É única e exclusivamente a aplicação do jogo multiplayer **Leveling Out**.
- Toda a estrutura de rotas, componentes e módulos atende unicamente ao ciclo de jogo de Leveling Out (lobby, sala, disputa PPT, core loop com tubo e slider, revelação e vitória).
- O p5.js e os runners isolados em iframe (`P5Frame.svelte`) foram expressamente removidos.

## 2. Convenção do Game Loop Canônico: Input $\rightarrow$ Update $\rightarrow$ Render

Apesar de operar sobre tecnologias web e componentes do Svelte, o núcleo do jogo deve ser projetado sob os padrões de um Game Loop rigoroso e desacoplado:

1. **Input (Intenção do Jogador):** Captura e normalização pura de interações de usuário (toque, drag no slider, texto de dicas) e mensagens assíncronas de rede (SSE). Aplica sanitização defensiva no cliente antes do envio. Nenhum input manipula diretamente a renderização ou estilos.
2. **Update (Reconciliação e Máquina de Estados):** O motor agnóstico em TypeScript (`GameEngine` / Máquina de Estados) processa a ação, atualiza estados otimistas locais e reconcilia com a verdade autoritativa do PocketBase. Esta camada é 100% desacoplada do DOM e testável via `bun test`.
3. **Render (Projeção Visual):** A casca em Svelte 5 (`$state`, `$derived`, `$props`) e CSS projeta passivamente o estado atual (`UI = f(State)`). As animações reagem a deltas de estado sem interferir na lógica da partida.

## 3. Pilares de Segurança do Front-end (Zero Trust & Autoritarismo de Estado)

Alinhado ao documento `backend/SECURITY.md`:

- **Autoritarismo do Servidor:** O front-end nunca arbitra pontuações, vencedores de turnos ou do jogo. O cliente transmite apenas _intenções_ (`SUBMIT_GUESS`, `SUBMIT_CLUE`, `SUBMIT_PPT_MOVE`). A verdade autoritativa reside nos hooks do PocketBase (`pb_hooks/game_rules.pb.js`).
- **Sanitização Defensiva (Defense in Depth):** Sanitização prévia no cliente: limite de 60 caracteres em dicas sem HTML, 20 caracteres em apelidos e palpites restritos a inteiros em [0, 100].
- **Sigilo Absoluto da Meta Oculta:** O front-end nunca guarda ou infere a `meta_oculta` antes da fase `RODADA_REVELACAO` emitida pelo servidor.
- **TypeScript como Padrão de Engenharia:** Todo o motor, controladores, modelos e testes devem ser estritamente tipados em TypeScript (`.ts`), com ações modeladas por uniões discriminadas.

## 4. Padrão de Composição (POO) em Refatorações

- **Componentes Pontuais:** Cada componente Svelte deve focar em uma tarefa visual específica (ex.: renderizar a escala do tubo de ensaio, exibir o placar, capturar o texto da dica).
- **Composição sobre Herança:** Ações, métodos gerais ou rotinas amplamente reprodutíveis (ex.: lógica de arrasto tátil, cronômetro de rodada, sincronização SSE) devem ser desacoplados em classes e módulos composíveis (POO) em TypeScript.
- Os componentes Svelte instanciam esses controladores especializados por composição, mantendo as tags `<script>` limpas e coesas.

## 5. Estilo, Identidade Visual e Animações

- **Paleta Oficial:** Light e Dark extrapoladas a partir das matrizes base em `src/routes/layout.css` mapeadas pelo `@theme`.
- **Tipografia:** Bagel Fat One e Capriola (Estilizadas), SN Pro e Mona Sans (Utilitárias), Fira Code (Monospace).
- **Animações:** Utilizar primariamente Svelte Motion/Transitions (`spring`, `tweened`, `fade`), Web Animations API (Motion) e SVG procedural reativo com CSS para fluídos e menisco. GSAP pode ser empregado para timelines coreografadas de revelação.

## 6. Backend em Tempo Real: PocketBase Autohospedado

- **Motor de Backend:** **PocketBase** (binário único em Go + SQLite embarcado), selecionado por seu consumo mínimo de memória (~15-30 MB de RAM).
- **Túnel e Exposição:** Conexão externa via **Tailscale Funnel** ou **Cloudflare Tunnel**, permitindo conexões SSE e REST seguras.
- **Efemeridade e Privacidade:** Participantes anônimos via `sessionStorage` e higienização automática (`pb_hooks/cleanup.pb.js`) purgando registros inativos a cada 15 minutos.
