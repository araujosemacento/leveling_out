# AGENTS.md: Guia Canônico do Projeto Leveling Out

Este documento é a fonte canônica da verdade e o hub central de navegação para desenvolvedores e agentes autônomos que operam neste repositório. O projeto é dedicado exclusivamente ao jogo multiplayer **Leveling Out**.

Para especificações detalhadas de cada domínio, consulte os documentos satélites em `docs/agents/`:

- [Game Design e Mecânicas de Gameplay](docs/agents/game-design.md)
- [Arquitetura Técnica, Game Loop e Segurança](docs/agents/architecture.md)
- [Diretrizes de Estilo, Tipografia e Cores](docs/agents/style-guide.md)

---

## 1. Mandamentos Inegociáveis e Restrições Absolutas

Todo código, estilo ou modificação submetida neste repositório deve respeitar rigorosamente as seguintes restrições:

1. **Runtime Bun Exclusivo:** O único runtime JavaScript/TypeScript e gerenciador de pacotes admitido é o **Bun** (`bun`). É expressamente proibido tentar executar comandos `node`, `npm`, `npx` ou `pnpm`.
2. **Autoritarismo do Servidor (Zero Trust):** O front-end nunca calcula placares oficiais, não decide vencedores e não armazena a `meta_oculta` antes da fase `RODADA_REVELACAO`. O cliente emite apenas intenções tipadas; a verdade autoritativa reside nos hooks do PocketBase (`pb_hooks/game_rules.pb.js`).
3. **Sem Emojis:** Proibido utilizar emojis em títulos, botões, status ou ilustrações.
4. **Sem Cards Genéricos:** Proibido utilizar contêineres decorativos padronizados no formato de "card" flutuante.
5. **Sem Travessões como Separadores:** Proibido utilizar travessões (`–`, `—`) ou hífen como separador de títulos ou textos de interface. Utilize dois-pontos (`:`), barras (`/`) ou formulação textual contínua.
6. **Sem Bullets Decorativos:** Proibido utilizar marcadores como `●`, `○`, `•`, `▪`, `✓` ou círculos decorativos (`rounded-full` em pings de status).
7. **TypeScript Nativo:** Toda a lógica de motor, controladores, modelos de dados e testes deve ser estritamente tipada em TypeScript (`.ts`), com ações modeladas por uniões discriminadas.

---

## 2. Visão Geral e Game Loop

**Leveling Out** é um _party game_ multiplayer focado em dedução e sintonia social. Duas equipes competem tentando calibrar conceitos subjetivos ao longo de uma escala percentual contínua (0% a 100%).

- **Desafio Central:** O Codificador da vez visualiza uma meta percentual secreta em um tubo de ensaio e digita uma pista associativa a partir de um espectro bipolar sorteado (ex.: "Famoso / Anônimo" $\rightarrow$ _"Keanu Reeves"_). O Palpiteiro da equipe ajusta o marcador analógico até onde estima estar o nível do líquido.
- **Cadência Canônica do Loop:**
  1. _Onboarding e Iniciativa:_ Criação/acesso de sala via slug (`/[sala]`), divisão em equipes e minijogo de Pedra, Papel e Tesoura para definir quem inicia e escolhe a carta.
  2. _Core Loop da Rodada:_ Escolha do espectro, sorteio do codificador, envio de dica e arrasto do slider analógico com revelação simultânea por proximidade (+4, +3, +2 ou 0 pontos).
  3. _Corrida e Revanche:_ Turnos alternados até a pontuação máxima, com tela de vitória, métricas de sintonia e reinício instantâneo por revanche.

> Para a narrativa de gameplay completa e os 3 pilares, consulte [docs/agents/game-design.md](docs/agents/game-design.md).

---

## 3. Arquitetura do Motor: Input $\rightarrow$ Update $\rightarrow$ Render

O motor do jogo adota o desacoplamento estrito do game loop canônico:

- **Camada de Input (`src/lib/engine/input/`):** Captura eventos de interface e mensagens de rede SSE, aplicando sanitização defensiva rigorosa (`sanitize.ts`) e convertendo-os em ações tipadas (`intent-factory.ts`).
- **Camada de Update (`src/lib/engine/update/`):** Reducer determinístico puro `gameReducer` (`state-machine.ts`) e algoritmo de referência de proximidade (`score-rules.ts`), testáveis de forma headless sem depender do DOM.
- **Camada de Render (`src/lib/engine/render/`):** Projeções puras `UI = f(State)` (`projections.ts`) que blindam a meta oculta e entregam ViewModels otimizados para os componentes Svelte.
- **Orquestrador Central (`src/lib/engine/game-engine.ts`):** Coordena a cadência e notifica os ouvintes reativos da interface.

> Para detalhes de arquitetura, ferramentas de animação e integração com PocketBase, consulte [docs/agents/architecture.md](docs/agents/architecture.md).

---

## 4. Síntese de Localização Rápida (Onde Encontrar Cada Coisa)

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
| **Title Card e Identidade (Visual)**         | `src/lib/components/TitleCard.svelte`      | Identidade visual do jogo com Bagel Fat One e ícone placeholder de tubo.                     |
| **Tubo de Ensaio e Menisco (Visual)**        | `src/lib/components/TestTube.svelte`       | Renderização SVG procedural do tubo, líquido graduado e borbulhas.                           |
| **Marcador Analógico (Visual)**              | `src/lib/components/AnalogSlider.svelte`   | Componente visual do slider que recebe e delega para o `SliderDragController`.               |
| **Placar e Métricas (Visual)**               | `src/lib/components/ScoreBoard.svelte`     | Exibição da corrida de pontuação entre as Equipes A e B.                                     |
| **Minijogo de Primeiro Turno (Visual)**      | `src/lib/components/PptArena.svelte`       | Disputa rápida de Pedra, Papel e Tesoura para definir quem começa.                           |
| **Backend, Migrações e Hooks de Limpeza**    | `backend/` (`pb_migrations/`, `pb_hooks/`) | Esquema do PocketBase SQLite e purga automática de salas inativas após 15 min.               |
| **Regras e Restrições para Agentes**         | `AGENTS.md`, `docs/agents/` e `.agents/`   | Proibições estritas, guias aprofundados e convenções do repositório.                         |

---

## 5. Diretrizes de Estilo e Identidade Visual

- **Taxonomia Tipográfica:**
  - Estilizadas (Alto Impacto): `Bagel Fat One` (título principal e momentos de celebração) e `Capriola` (subtítulos e transições).
  - Utilitárias (Legibilidade Rápida): `SN Pro` (cabeçalhos de regras e avisos) e `Mona Sans` (textos corridos e métricas).
  - Monospace: `Fira Code` (códigos de sala `roomCode`).
- **Paleta de Cores e Temas:** Sistema com matrizes base e superfícies semânticas para os modos Light (`#faf4eb`) e Dark (`#140e05`), mapeadas em `src/routes/layout.css` e consumidas por utilitários Tailwind v4 (`bg-primary`, `bg-accent`, `bg-bg-surface`, etc.).
- **Convenção de Botões:** O ícone em botões de formulário e ações de envio deve ser posicionado estritamente à direita do texto (ex.: `<span>Ação</span> <Icon ... />`).

> Para a especificação completa de tokens CSS hexadecimais e regras visuais, consulte [docs/agents/style-guide.md](docs/agents/style-guide.md).

---

## 6. Comandos Essenciais da CLI (Bun Exclusivo)

- Iniciar servidor de desenvolvimento: `bun run dev`
- Executar suíte de testes automatizados: `bun test`
- Verificar diagnósticos de tipagem TypeScript: `bun run check`
- Validar conformidade de lint e estilo: `bun run lint`
- Formatar código com Prettier: `bun run format`
- Gerar build de produção: `bun run build`

---

## 7. Roadmap de Desenvolvimento

### Fase 1: Fundação & Migração para Svelte Nativo (Concluída)

- [x] Definição conceitual e validação do game loop via Pitch.
- [x] Backend PocketBase configurado com migrações declarativas e hooks de limpeza.
- [x] PoC de conectividade multiplayer funcional entre redes distintas (Wi-Fi vs 4G).
- [x] Eliminar completamente o runner de p5.js, o iframe e códigos de portfólio.
- [x] Implementar sistema de tokens com as paletas Light e Dark e as 4 famílias tipográficas.
- [x] Implementar o motor desacoplado com arquitetura Input $\rightarrow$ Update $\rightarrow$ Render em TypeScript nativo.

### Fase 2: Componentes Compostos e Core Loop (Em Andamento)

- [ ] Implementar alternância dinâmica e manual entre os temas Light e Dark com transição suave de cores.
- [ ] Criar o componente `TestTube.svelte` em SVG procedural com física de líquido e menisco.
- [ ] Criar o componente `AnalogSlider.svelte` integrando a classe composível `SliderDragController`.
- [x] Implementar a máquina de estados desacoplada com as fases de Dica, Palpite e Revelação.
- [x] Implementar algoritmo de proximidade com faixas de acerto (+4, +3, +2, 0) testado com `bun test`.
- [ ] Minijogo de Pedra, Papel e Tesoura refatorado em Svelte puro para decisão de turno.

### Fase 3: Polimento e Experiência de Jogo

- [ ] Criar ícone animado procedural da identidade visual (substituindo o placeholder atual do favicon).
- [ ] Animação da Revelação Dramática com cálculo de sintonia e preenchimento de placar.
- [ ] Interface de Revanche imediata mantendo a sala e alternando posições.
- [ ] Otimizações táteis e feedback háptico (`navigator.vibrate`) em dispositivos móveis.
