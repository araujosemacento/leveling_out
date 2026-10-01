# Diretrizes de Arquitetura: Leveling Out (Svelte Nativo & Game Loop Canônico)

## 1. Foco Exclusivo no Jogo Leveling Out (Zero Portfólio)

- O projeto não é um portfólio nem hospeda múltiplos sketches. É única e exclusivamente a aplicação do jogo multiplayer **Leveling Out**.
- Toda a estrutura de rotas, componentes e módulos atende unicamente ao ciclo de jogo de Leveling Out (lobby, sala, disputa PPT, core loop com tubo e slider, revelação e vitória).
- O p5.js e os runners isolados em iframe (`P5Frame.svelte`) foram expressamente removidos.

## 2. Convenção do Game Loop Canônico: Input $\rightarrow$ Update $\rightarrow$ Render

Apesar de operar sobre tecnologias web e componentes do Svelte, o núcleo do jogo deve ser projetado sob os padrões de um Game Loop rigoroso e desacoplado:

1. **Input:** Captura e normalização pura de interações de usuário (toque, drag no slider, texto de dicas) e mensagens assíncronas de rede (SSE). Nenhum input manipula diretamente a renderização ou estilos.
2. **Update:** O motor agnóstico (`GameEngine` / Máquina de Estados) processa a ação, atualiza o estado da partida, calcula pontuações por proximidade e lida com cronômetros determinísticos. Esta camada é 100% desacoplada do DOM e testável via `bun test`.
3. **Render:** A casca em Svelte 5 (`$state`, `$derived`) e CSS projeta passivamente o estado atual (`UI = f(State)`). As animações reagem a deltas de estado sem interferir na lógica da partida.

## 3. Padrão de Composição (POO) em Refatorações

- **Componentes Pontuais:** Cada componente Svelte deve focar em uma tarefa visual específica (ex.: renderizar a escala do tubo de ensaio, exibir o placar, capturar o texto da dica).
- **Composição sobre Herança:** Ações, métodos gerais ou rotinas amplamente reprodutíveis (ex.: lógica de arrasto tátil, cronômetro de rodada, sincronização SSE, algoritmo de proximidade) devem ser desacoplados em classes e módulos composíveis (POO).
- Os componentes Svelte instanciam esses controladores especializados por composição, mantendo as tags `<script>` limpas e coesas.

## 4. Estilo, Identidade Visual e Animações

- **Paleta Sake + Yaki:** Creme Base (`#FAF4EB`), Índigo Profundo (`#4B3EA8`), Amarelo Mostarda (`#F2A93B`), Pêssego Coral (`#F8ADA0`), Verde Sálvia (`#BCD6BD`), Lavanda Pastel (`#DFCEFA`).
- **Tipografia:** Fonte obrigatória **Mona Sans** para toda a interface.
- **Animações:** Utilizar primariamente Svelte Motion/Transitions (`spring`, `tweened`, `fade`), Web Animations API (Motion) e SVG procedural reativo com CSS para fluídos e menisco. GSAP pode ser empregado para timelines coreografadas de revelação.

## 5. Backend em Tempo Real: PocketBase Autohospedado

- **Motor de Backend:** **PocketBase** (binário único em Go + SQLite embarcado), selecionado por seu consumo mínimo de memória (~15-30 MB de RAM).
- **Túnel e Exposição:** Conexão externa via **Tailscale Funnel** ou **Cloudflare Tunnel**, permitindo conexões SSE e REST seguras.
- **Efemeridade e Privacidade:** Participantes anônimos via `sessionStorage` e higienização automática (`pb_hooks/cleanup.pb.js`) purgado registros inativos a cada 15 minutos.
