# AGENTS.md: Documentação do Projeto Leveling Out

Este documento serve como guia central para desenvolvedores e agentes autônomos que operam neste repositório. O projeto é dedicado exclusivamente ao jogo **Leveling Out**, detalhando sua visão conceitual, a convenção canônica de _game loop_, a arquitetura técnica baseada em Svelte e CSS, o sistema de estilos e o roteiro de desenvolvimento.

---

## 1. Visão Geral do Jogo: Leveling Out

**Leveling Out** é um _party game_ multiplayer focado em dedução, sintonia e empatia social. Os jogadores competem em duas equipes tentando calibrar conceitos subjetivos ao longo de uma escala percentual contínua (0% a 100%).

### O Desafio Central

- **Codificar:** O membro sorteado da equipe (Codificador) recebe uma meta percentual secreta exibida dentro de um tubo de ensaio (ex.: 70%) e deve traduzir esse valor em uma pista conceitual compreensível a partir de um espectro bipolar sorteado (ex.: "Famoso / Anônimo" $\rightarrow$ dica: _"Keanu Reeves"_).
- **Decodificar:** O parceiro de equipe (Palpiteiro) ouve a dica e tenta ler a mente do colega, posicionando um marcador analógico (_slider_) no ponto que acredita representar o nível real estipulado pelo jogo.

### Os 3 Pilares da Gameplay

1. **Nível Oculto:** O preenchimento aleatório de um tubo de ensaio com volume visível unicamente para o Codificador da rodada.
2. **Gerar Pistas:** Sistema associativo em que a pontuação depende do alinhamento cultural e social entre os jogadores de uma equipe.
3. **Acerto Aproximado:** Algoritmo que calcula a distância entre o palpite e o valor real, recompensando precisão com pontos graduados (+4, +3, +2, ou 0).

---

## 2. Game Loop Detalhado

O ciclo de jogo divide-se em três etapas bem definidas:

### Parágrafo 1: Onboarding, Sala e Decisão de Turno

O fluxo tem início quando o usuário acessa a plataforma em seu dispositivo e cria ou ingressa em uma sala via slug na URL (`/[sala]`), reunindo os participantes em um lobby compartilhado onde são divididos em duas equipes. Para definir quem começa a partida de forma rápida e divertida, o sistema engatilha um minijogo digital de pedra, papel e tesoura entre representantes de cada time; a equipe vencedora ganha o direito de iniciar a partida e escolhe a carta temática da primeira rodada, delimitando o espectro bipolar conceitual (ex.: "Famoso / Anônimo" ou "Fácil / Difícil"). Com os parâmetros estabelecidos e os papéis atribuídos, a rodada é sincronizada em tempo real em todas as telas conectadas.

### Parágrafo 2: O Core Loop da Rodada (Dica, Palpite e Revelação)

Na fase ativa, o sistema sorteia aleatoriamente um membro da equipe da vez para atuar como Codificador e preenche exclusivamente em sua tela um tubo de ensaio com nível percentual oculto (como 70%), invisível aos demais jogadores. Esse integrante analisa a carta de espectro e digita uma pista associativa contextualizada (ex.: "Keanu Reeves"), enviando-a ao seu parceiro de equipe; cabe ao Palpiteiro decodificar o raciocínio do colega e deslizar o marcador analógico até onde estima estar o líquido no tubo. Finalizado o palpite, ocorre a revelação simultânea para todos os participantes: um algoritmo calcula a margem de erro por proximidade, convertendo exatidão em pontuação no placar, ao passo que erros grosseiros resultam em zero pontos e transferem o _momentum_ competitivo diretamente para o início do turno da equipe adversária.

### Parágrafo 3: Progressão, Ritmo de Corrida e Conclusão com Revanche

A partida se desenvolve em turnos estritamente alternados entre as duas equipes, estruturando uma corrida dinâmica rumo à pontuação-alvo predeterminada, em que cada acerto ou erro do rival atua como regulador de tensão e alívio no canal de fluxo dos competidores. O desfecho da disputa é alcançado no instante em que uma das equipes atinge a pontuação máxima, disparando a tela de vitória que consagra os campeões e exibe um painel de "Métricas de Sintonia", destacando os palpites milimetricamente certeiros e as gafes conceituais mais cômicas da partida. Essa interface final disponibiliza ações imediatas para iniciar uma Revanche mantendo as mesmas composições ou retornar ao lobby principal, fechando o ciclo e estimulando a rejogabilidade.

---

## 3. Arquitetura Técnica e Game Loop Canônico

O projeto elimina completamente qualquer formato de portfólio ou runner de terceiros, dedicando-se inteiramente ao jogo **Leveling Out** como aplicação autônoma. O p5.js é expressamente descontinuado do ecossistema, sendo substituído por tecnologias web nativas (**Svelte 5**, **CSS** e **SVG/Canvas procedural dedicado**).

### A Regra de Ouro do Game Loop: Input $\rightarrow$ Update $\rightarrow$ Render

Apesar de ser implementado sobre o DOM e componentes reativos do Svelte, todo o fluxo do jogo deve seguir a cadência estrita de um _game loop_ canônico, desacoplando o núcleo de regras da camada visual:

1. **Fase de Input (Intenção do Jogador):**
   - Captura eventos brutos de usuário (toque, arrasto do slider analógico, digitação de pistas, escolha de lances no PPT) e eventos assíncronos de rede (mensagens SSE do PocketBase).
   - Aplica sanitização defensiva local (limites de caracteres e filtros de segurança).
   - Normaliza os eventos em objetos de ação tipados (`GameAction`).
   - Nenhum manipulador de evento de input altera diretamente elementos visuais ou estados de renderização sem passar pelo motor de atualização.

2. **Fase de Update (Reconciliação com o Servidor):**
   - O núcleo do jogo (`GameEngine` / Máquina de Estados) processa a ação contra o estado atual da partida.
   - Aplica transições de fase locais, cronômetros determinísticos e reconciliação com o estado autoritativo do PocketBase.
   - O estado do jogo permanece puro, desacoplado de dependências do navegador ou do Svelte, permitindo testes unitários headless com `bun test`.

3. **Fase de Render (Projeção e Coreografia Visual):**
   - A camada de componentes Svelte atua como função pura da projeção de estado (`UI = f(State)`).
   - Reatividade declarativa via Svelte 5 Runes (`$state`, `$derived`, `$props`).
   - Animações e transições visuais reagem a deltas de estado sem interferir na integridade do estado da partida.

### Pilares de Segurança do Front-end (Zero Trust & Autoritarismo de Estado)

Alinhado às diretrizes de [backend/SECURITY.md](file:///home/melo/Documentos/GitHub/leveling_out/backend/SECURITY.md), o front-end opera sob o princípio de **Confiança Zero (Zero Trust)**:

1. **Autoritarismo do Servidor:** O front-end nunca calcula pontuações oficiais, não determina vencedores de PPT e não decide transições críticas de turno. O cliente envia unicamente _intenções_ (`SUBMIT_GUESS`, `SUBMIT_CLUE`, `SUBMIT_PPT_MOVE`). A verdade autoritativa reside exclusivamente nos hooks do PocketBase (`pb_hooks/game_rules.pb.js`).
2. **Defesa em Profundidade e Sanitização:** Antes de transmitir qualquer dado à rede, o front-end sanitiza rigorosamente as entradas:
   - Dicas conceituais: máximo de 60 caracteres, remoção de caracteres de controle e tags HTML.
   - Apelidos de jogadores: máximo de 20 caracteres alfanuméricos com pontuação básica.
   - Palpites do slider: número inteiro contido estritamente no intervalo fechado [0, 100].
3. **Sigilo Absoluto da Meta Oculta:** O valor percentual da meta no tubo de ensaio (`meta_oculta`) nunca deve ser armazenado ou inferido no cliente antes da fase de revelação oficial (`RODADA_REVELACAO`) enviada pelo servidor, impedindo que participantes visualizem o volume secreto inspecionando o console ou a memória do navegador.
4. **Papel de `score-rules.ts` no Front-end:** As regras de proximidade no cliente existem unicamente para pré-visualização visual de graduação ou feedback tátil imediato, jamais para gravar ou impor placares à sala.

### TypeScript Nativo como Padrão de Engenharia

Toda a lógica pura do motor (`src/lib/engine/`), controladores compostos (`src/lib/controllers/`), modelos de dados e testes em `tests/` devem ser escritos estritamente em **TypeScript (`.ts`)**:

- **Contratos Tipados:** Ações de jogo (`GameAction`) modeladas via uniões discriminadas (_discriminated unions_), garantindo que cada evento carregue seu payload obrigatório correto.
- **Svelte 5 Runes Tipados:** Aproveitamento total de tipos em `$props<T>()`, `$state<T>()` e nas classes de controladores orientados a objetos.
- **Execução Nativa com Bun:** Zero sobrecarga de build, com compilação e execução imediata pelo Bun e Vite.

### Padrão de Composição (POO) em Refatorações

Para garantir legibilidade, manutenibilidade e foco estrito de responsabilidade:

- **Componentes Pontuais:** Cada componente Svelte deve focar única e exclusivamente em sua tarefa visual e estrutural pontual (Single Responsibility Principle). Componentes não devem acumular regras de negócio, cálculos matemáticos complexos ou lógica de rede em suas tags `<script>`.
- **Composição sobre Herança:** Métodos gerais, ações utilitárias e rotinas amplamente reprodutíveis devem ser desacoplados em classes ou módulos composíveis orientados a objetos (ex.: `SliderDragController`, `RoundTimer`, `RoomSessionManager`).
- Os componentes Svelte instanciam ou recebem esses controladores por composição, delegando tarefas e observando mudanças de estado.

### Sugestões de Ferramentas para Animação

Com a remoção do p5.js, as animações do jogo (líquido do tubo, menisco, borbulhas, revelação de pontuação, transições de cartas) devem utilizar soluções modernas e performáticas:

1. **Svelte Motion e Transitions Nativas (`svelte/motion` e `svelte/transition`):**
   - Ideal para transições de interface, física de molas no slider analógico (`spring`), interpolações de valores numéricos de placar (`tweened`) e transições de tela (`fade`, `fly`, `scale`).
   - Vantagens: Zero dependências externas, sincronização com o ciclo de vida do Svelte e baixíssimo overhead.
2. **Motion (antigo Motion One) ou Web Animations API (WAAPI):**
   - Execução direta na thread da GPU através da WAAPI nativa.
   - Ideal para animações contínuas, flutuações e efeitos dinâmicos de alta performance sem quedas de frames na thread de JavaScript.
3. **GSAP (GreenSock):**
   - Excelente alternativa caso surja a necessidade de orquestrar timelines complexas e coreografadas na etapa de Revelação Dramática (subida do menisco, parada na meta oculta, expansão de ondas de acerto e incremento escalonado do placar).
4. **SVG Procedural Reativo:**
   - Renderização do tubo de ensaio, menisco curvo e borbulhas diretamente via paths e tags SVG reativas manipuladas por CSS e Svelte, garantindo nitidez vetorial infinita em telas de qualquer resolução.

### Backend Realtime: PocketBase Autohospedado

- **Tecnologia:** **PocketBase** (único binário executável em Go com SQLite embarcado).
- **Consumo de Recursos:** **~15 MB a 30 MB de RAM**, ideal para rodar em uma máquina pessoal ligada continuamente sem afetar o sistema.
- **Exposição para a Internet:** Conectado através de um túnel reverso com certificado TLS automático (**Tailscale Funnel** ou **Cloudflare Tunnel**), permitindo conexões diretas de qualquer dispositivo em redes 4G/5G (com CGNAT) ou Wi-Fi doméstico.
- **Protocolo Realtime:** _Server-Sent Events (SSE)_ nativo sobre HTTP com assinaturas por sala (`pb.collection('salas').subscribe(roomCode, ...)`).
- **Efemeridade e Privacidade:** Usuários anônimos identificados por `playerId` em `sessionStorage`. Higienização automática periódica via hook (`pb_hooks/cleanup.pb.js`) apagando salas inativas há mais de 15 minutos.

---

## 4. Estrutura Modular da Aplicação

O código do jogo organiza-se com desacoplamento rigoroso entre motor de lógica, controladores compostos e interface visual:

```text
src/
├── lib/
│   ├── engine/                <-- Núcleo agnóstico do jogo em TypeScript (Game Loop puro)
│   │   ├── types.ts           <-- Definições tipadas de ações (GameAction), fases e estados
│   │   ├── input/             <-- Camada de Input (Intenções, sanitização defensiva e normalização)
│   │   │   ├── sanitize.ts    <-- Higienização rigorosa contra HTML, limites de string e clamp
│   │   │   └── intent-factory.ts <-- Criadores puros de GameAction a partir de eventos brutos
│   │   ├── update/            <-- Camada de Update (Máquina de estados determinística e regras)
│   │   │   ├── state-machine.ts <-- Reducer determinístico puro e transições de fase
│   │   │   └── score-rules.ts <-- Algoritmo de referência por proximidade (+4, +3, +2, 0)
│   │   ├── render/            <-- Camada de Render (Projeções de estado puras UI = f(State))
│   │   │   └── projections.ts <-- Seletores e ViewModels desacoplados para os componentes Svelte
│   │   └── game-engine.ts     <-- Motor canônico reativo coordenando Input -> Update -> Render
│   ├── controllers/           <-- Classes composíveis (POO) reutilizáveis em TypeScript
│   │   ├── drag-controller.ts <-- Controlador de arrasto tátil para slider analógico
│   │   ├── round-timer.ts     <-- Temporizador determinístico de rodada
│   │   └── session-sync.ts    <-- Reconciliação otimista e assinaturas SSE
│   ├── components/            <-- Componentes Svelte pontuais e declarativos
│   │   ├── TestTube.svelte    <-- Tubo de ensaio e líquido animado (SVG/CSS)
│   │   ├── AnalogSlider.svelte<-- Marcador analógico com controlador composto
│   │   ├── ScoreBoard.svelte  <-- Placar das equipes
│   │   ├── SpectrumCard.svelte<-- Carta bipolar sorteada
│   │   └── PptArena.svelte    <-- Minijogo de disputa de primeiro turno
│   └── styles/
│       ├── tokens.css         <-- Variáveis CSS da paleta e fontes
│       └── base.css           <-- Estilos globais e reset
└── routes/
    ├── +layout.svelte         <-- Casca global com importação de tokens e Mona Sans
    ├── +page.svelte           <-- Lobby de entrada e criação rápida de sala
    └── [sala]/
        └── +page.svelte       <-- Arena principal da partida de Leveling Out
```

### Síntese de Localização Rápida (Onde Encontrar Cada Coisa)

Esta tabela sintetiza as responsabilidades de implementação para consulta imediata de desenvolvedores e agentes:

| O que você precisa alterar / inspecionar     | Onde encontrar (Arquivo / Pasta)           | Responsabilidade Principal                                                                   |
| :------------------------------------------- | :----------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Paleta, tokens CSS, dark mode e temas**    | `src/routes/layout.css`                    | Variáveis `:root` e `[data-theme='dark']` (superfícies, textos, cores de equipes e acentos). |
| **Importação de fontes e head global**       | `src/app.html`                             | Links para Google Fonts e CDN (Bagel Fat One, Capriola, SN Pro, Mona Sans, Fira Code).       |
| **Casca da aplicação e navegação**           | `src/routes/+layout.svelte`                | Estrutura comum que envolve todas as páginas e carrega os estilos globais.                   |
| **Lobby de entrada e criação de sala**       | `src/routes/+page.svelte`                  | Tela inicial com Title Card, criação rápida de sala e entrada de apelido.                    |
| **Arena principal do jogo (Partida)**        | `src/routes/[sala]/+page.svelte`           | Orquestração da sala, sincronização da partida e renderização das fases.                     |
| **Camada de Input (Intenção & Sanitização)** | `src/lib/engine/input/`                    | Higienização defensiva (sanitize.ts) e normalização de intenções (intent-factory.ts).        |
| **Camada de Update (Máquina de Estados)**    | `src/lib/engine/update/`                   | Reducer determinístico (state-machine.ts) e algoritmo de proximidade (score-rules.ts).       |
| **Camada de Render (Projeções UI)**          | `src/lib/engine/render/`                   | Seletores puros UI = f(State) e blindagem de sigilo da meta oculta (projections.ts).         |
| **Orquestrador do Motor Canônico**           | `src/lib/engine/game-engine.ts`            | Orquestrador reativo coordenando a cadência Input -> Update -> Render e inscrições.          |
| **Controlador do Slider (POO)**              | `src/lib/controllers/drag-controller.ts`   | Cálculo de arrasto, limites percentuais [0, 100], sensibilidade ao toque e snap.             |
| **Temporizador determinístico (POO)**        | `src/lib/controllers/round-timer.ts`       | Ticks determinísticos para contagem regressiva de rodadas.                                   |
| **Sincronização SSE e Heartbeat (POO)**      | `src/lib/controllers/session-sync.ts`      | Conexão com PocketBase, reconciliação autoritativa e emissão de intenções de rede.           |
| **Tubo de Ensaio e Menisco (Visual)**        | `src/lib/components/TestTube.svelte`       | Renderização SVG procedural do tubo, líquido graduado e borbulhas.                           |
| **Marcador Analógico (Visual)**              | `src/lib/components/AnalogSlider.svelte`   | Componente visual do slider que recebe e delega para o `SliderDragController`.               |
| **Placar e Métricas (Visual)**               | `src/lib/components/ScoreBoard.svelte`     | Exibição da corrida de pontuação entre as Equipes A e B.                                     |
| **Minijogo de Primeiro Turno (Visual)**      | `src/lib/components/PptArena.svelte`       | Disputa rápida de Pedra, Papel e Tesoura para definir quem começa.                           |
| **Backend, Migrações e Hooks de Limpeza**    | `backend/` (`pb_migrations/`, `pb_hooks/`) | Esquema do PocketBase SQLite e purga automática de salas inativas após 15 min.               |
| **Regras e Restrições para Agentes**         | `AGENTS.md` e `.agents/rules/`             | Proibições estritas (sem emojis, sem cards, sem travessões, sem bullets, Bun exclusivo).     |

---

## 5. Diretrizes de Estilo e Identidade Visual

### Taxonomia Tipográfica Oficial

O projeto divide sua tipografia em duas categorias complementares:

1. **Aplicações Estilizadas (Identidade Bubbly & Amigável):**
   - **Bagel Fat One:** Título principal, Title Card do jogo, momentos de celebração e aplicações de alto impacto onde chamar atenção e transmitir carisma é prioritário.
   - **Capriola:** Subtítulos, pontes de transição entre introdução e blocos textuais, e rótulos intermediários.
2. **Aplicações Utilitárias (Legibilidade, Concentração e Leitura Rápida):**
   - **SN Pro:** Títulos utilitários, cabeçalhos de regras, avisos pontuais e seções onde o jogador precisa bater o olho e assimilar de imediato.
   - **Mona Sans:** Textos corridos, explicações conceituais, termos de rodada e métricas.
3. **Apoio Técnico Monospace:**
   - **Fira Code:** Exclusiva para visualização e cópia de códigos de sala (`roomCode`).

### Paleta de Cores Oficial e Extrapolações

A paleta conta com matrizes base e extrapolações semânticas para os temas Light e Dark:

#### Tema Light (Padrão)

- **Base:** `--text: #271602`, `--background: #faf4eb`, `--primary: #e2931d`, `--secondary: #e5988b`, `--tertiary: #4bf762`, `--accent: #4c2bb1`
- **Superfícies:** `--bg-base: #faf4eb`, `--bg-surface: #ffffff`, `--bg-surface-soft: #f4ece0`, `--bg-surface-elevated: #ede2d3`
- **Bordas:** `--border-subtle: #e5d7c4`, `--border-medium: #d4c0a5`, `--border-strong: #271602`, `--border-accent: #4c2bb1`
- **Textos:** `--text-primary: #271602`, `--text-muted: #6e563d`, `--text-subtle: #988066`, `--text-on-accent: #ffffff`
- **Ações:** `--primary-hover: #cc7e12`, `--secondary-hover: #db8576`, `--tertiary-hover: #37df4e`, `--accent-hover: #3c2091`

#### Tema Dark

- **Base:** `--text: #fdecd8`, `--background: #140e05`, `--primary: #e2931d`, `--secondary: #74281a`, `--tertiary: #08b41f`, `--accent: #704ed4`
- **Superfícies:** `--bg-base: #140e05`, `--bg-surface: #1e1509`, `--bg-surface-soft: #291e10`, `--bg-surface-elevated: #352717`
- **Bordas:** `--border-subtle: #3a2b19`, `--border-medium: #4e3a24`, `--border-strong: #fdecd8`, `--border-accent: #704ed4`
- **Textos:** `--text-primary: #fdecd8`, `--text-muted: #cbb49c`, `--text-subtle: #8e7a63`, `--text-on-accent: #ffffff`
- **Ações:** `--primary-hover: #f0a32d`, `--secondary-hover: #8f3322`, `--tertiary-hover: #12cc2b`, `--accent-hover: #8666e8`

### Convenções de Botões e Utilitários Tailwind

- **Ícones em Botões de Formulário:** Em botões de formulário e ações de envio/criação, o ícone deve ser posicionado estritamente à direita do texto (ex.: `<span>Rótulo</span> <Icon ... />`).
- **Integração Tailwind:** Empregar classes utilitárias do Tailwind v4 (`bg-primary`, `bg-accent`, `bg-bg-surface`, `border-border-subtle`, `text-text-primary`, etc.) mapeadas pelo `@theme` sobre as variáveis CSS, evitando hardcode de cores hexadecimais literais.

### Restrições Visuais Estritas

É **expressamente proibido** incluir no front-end:

1. **Emojis:** Nenhuma utilização de emojis em títulos, botões, feedbacks, status ou ilustrações.
2. **Cards:** Não utilizar elementos genéricos com estilo de "card" flutuante ou contêineres decorativos padronizados.
3. **Travessões (–, —) e suas variações:** Proibido o uso de travessões ou hífen como separador de títulos e textos de interface. Utilizar dois-pontos (`:`), barras (`/`), ou fluxo textual contínuo.
4. **Bullet Points e Indicadores Circulares:** Proibido o uso de caracteres como "●", "○", "•", "▪", "✓", bem como círculos decorativos (`rounded-full` em spans de status ou pings de presença).

---

## 6. Diretriz Estrita de Runtime e Gerenciador de Pacotes (Bun Exclusivo)

Nesta máquina servidora e de desenvolvimento, o **Node.js** e o **npm** **NÃO estão instalados** no ambiente do sistema e é **expressamente proibido** tentar executar comandos `node`, `npm`, `npx` ou `pnpm`.

- O **único** runtime JavaScript/TypeScript e gerenciador de pacotes admitido neste repositório é o **Bun** (`bun`).
- Toda e qualquer operação de terminal executada por agentes autônomos ou desenvolvedores deve empregar estritamente a CLI do Bun:
  - Instalação de dependências: `bun install` / `bun add [-d] <pacote>`
  - Execução de scripts e build: `bun run dev`, `bun run build`, `bun run check`, `bun run test`
  - Execução de scripts avulsos: `bun <caminho_do_arquivo.js>`

---

## 7. Roadmap de Desenvolvimento

### Fase 1: Fundação & Migração para Svelte Nativo (Concluída)

- [x] Definição conceitual e validação do game loop via Pitch.
- [x] Backend PocketBase configurado com migrações declarativas e hooks de limpeza.
- [x] PoC de conectividade multiplayer funcional entre redes distintas (Wi-Fi vs 4G).
- [x] Eliminar completamente o runner de p5.js, o iframe e códigos de portfólio.
- [x] Implementar sistema de tokens com as paletas Light e Dark e as 4 famílias tipográficas.
- [x] Implementar o motor desacoplado com arquitetura Input $\rightarrow$ Update $\rightarrow$ Render.

### Fase 2: Componentes Compostos e Core Loop

- [ ] Criar o Title Card animado do jogo (aplicando Bagel Fat One e Capriola) para identidade visual no lobby.
- [ ] Implementar alternância dinâmica e manual entre os temas Light e Dark com transição suave de cores.
- [ ] Criar o componente `TestTube.svelte` em SVG procedural com física de líquido e menisco.
- [ ] Criar o componente `AnalogSlider.svelte` integrando a classe composível `SliderDragController`.
- [x] Implementar a máquina de estados desacoplada com as fases de Dica, Palpite e Revelação.
- [x] Implementar algoritmo de proximidade com faixas de acerto (+4, +3, +2, 0) testado com `bun test`.
- [ ] Minijogo de Pedra, Papel e Tesoura refatorado em Svelte puro para decisão de turno.

### Fase 3: Polimento e Experiência de Jogo

- [ ] Animação da Revelação Dramática com cálculo de sintonia e preenchimento de placar.
- [ ] Interface de Revanche imediata mantendo a sala e alternando posições.
- [ ] Otimizações táteis e feedback háptico (`navigator.vibrate`) em dispositivos móveis.
