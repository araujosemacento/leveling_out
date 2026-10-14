# AGENTS.md: Guia Canônico do Projeto Leveling Out

Este documento é a fonte canônica da verdade e o hub central de navegação para desenvolvedores e agentes autônomos que operam neste repositório. O projeto é dedicado exclusivamente ao jogo multiplayer **Leveling Out**.

Para especificações detalhadas de cada domínio, consulte os documentos em `docs/`:

- [Game Design e Mecânicas de Gameplay](docs/agents/game-design.md)
- [Arquitetura Técnica, Sistema Distribuído e Composição](docs/agents/architecture.md)
- [Diretrizes de Estilo, Tipografia e Cores](docs/agents/style-guide.md)
- [SGDD Consolidado do Jogo](docs/sgdd/sgdd.md)
- [Especificação de Entidades do Jogo](docs/entidades/entidades.md)
- [Catálogo de Componentes Atômicos](docs/componentes/componentes.md)
- [Diagramas de Arquitetura, Entidades e Componentes](docs/diagramas/diagramas.md)

---

## 1. Mandamentos Inegociáveis e Restrições Absolutas

Todo código, estilo ou modificação submetida neste repositório deve respeitar rigorosamente as seguintes restrições:

1. **Runtime Bun Exclusivo:** O único runtime JavaScript/TypeScript e gerenciador de pacotes admitido é o **Bun** (`bun`). É expressamente proibido tentar executar comandos `node`, `npm`, `npx` ou `pnpm`.
2. **Sistema Distribuído e Autoritarismo do Servidor (Zero Trust):** O front-end é responsável exclusivamente por Input e Render. O servidor PocketBase detém autoridade soberana e exclusiva sobre a fase de Update (regras de integridade, cálculo oficial de pontuação e sigilo da `meta_oculta`). A máquina de estados cliente (`GameEngine`) atua unicamente para sincronizar e reconciliar as mudanças ocorridas no servidor entre os jogadores.
3. **Composição por Entidades e Componentes:** Entidades são concebidas como agregadores conceituais amplos (quanto mais papéis uma entidade puder abranger, melhor), especializando-se na instanciação e nomeação. Já os componentes são necessária e imperativamente atômicos e de uso específico, sendo os responsáveis diretos por modelar e conferir capacidades a uma entidade.
4. **Sem Emojis:** Proibido utilizar emojis em títulos, botões, status ou ilustrações.
5. **Sem Cards Genéricos:** Proibido utilizar contêineres decorativos padronizados no formato de "card" flutuante.
6. **Sem Travessões como Separadores:** Proibido utilizar travessões (`–`, `—`) ou hífen como separador de títulos ou textos de interface. Utilize dois-pontos (`:`), barras (`/`) ou formulação textual contínua.
7. **Sem Bullets Decorativos:** Proibido utilizar marcadores como `●`, `○`, `•`, `▪`, `✓` ou círculos decorativos (`rounded-full` em pings de status).
8. **TypeScript Nativo:** Toda a lógica de motor, controladores, modelos de dados e testes deve ser estritamente tipada em TypeScript (`.ts`), com ações modeladas por uniões discriminadas.
9. **Proibição de Commits e Pushes Autônomos:** Agentes de IA são expressamente proibidos de executar comandos de commit (`git commit`), criação de tags (`git tag`) ou envio para remotos (`git push`) de forma autônoma. A responsabilidade do agente restringe-se a fornecer propostas de sumário, descrição detalhada e o comando git sugerido pronto para que o desenvolvedor humano execute a ação por conta própria.

---

## 2. Visão Geral e Game Loop

**Leveling Out** é um _party game_ multiplayer focado em dedução e sintonia social. Duas equipes competem tentando calibrar conceitos subjetivos ao longo de uma escala percentual contínua (0% a 100%).

- **Desafio Central:** O Codificador visualiza uma meta percentual secreta em um tubo de ensaio e digita uma pista associativa a partir de um espectro bipolar sorteado (ex.: "Anônimo / Famoso" $\rightarrow$ _"Keanu Reeves"_). O Palpiteiro da equipe ajusta o marcador analógico até onde estima estar o nível do líquido.
- **Cadência Canônica do Loop:**
  1. _Onboarding e Iniciativa:_ Criação/acesso de sala via slug (`/[sala]`), divisão em equipes e minijogo de Pedra, Papel e Tesoura para definir quem inicia e escolhe a primeira carta.
  2. _Core Loop da Rodada:_ Escolha do espectro, envio de dica e arrasto do slider analógico com revelação simultânea por tolerância de proximidade (+4, +3, +2 ou 0 pontos).
  3. _Corrida e Revanche:_ Turnos alternados rumo à meta de 10 pontos, com tela de vitória, métricas de sintonia e reinício instantâneo por revanche.

> Para a narrativa de gameplay completa e os 3 pilares, consulte [docs/agents/game-design.md](docs/agents/game-design.md) e [docs/sgdd/sgdd.md](docs/sgdd/sgdd.md).

---

## 3. Arquitetura do Motor: Input $\rightarrow$ Update (Servidor) $\rightarrow$ Sync & Render (Cliente)

O motor do jogo adota o desacoplamento de um sistema distribuído em tempo real:

- **Camada de Input (Cliente - `src/lib/engine/input/`):** Captura eventos de interface e gestos, aplica sanitização defensiva rigorosa (`sanitize.ts`) e despacha intenções tipadas (`intent-factory.ts`) para a rede.
- **Camada de Update (Servidor Autoritário - `backend/`):** Executa em PocketBase. No protótipo atual, opera via hooks JavaScript (`game_rules.pb.js` e `iniciativa.pb.js`), com migração planejada para Go nativo estendendo o PocketBase como framework, formalizando as entidades de domínio e componentes atômicos autoritativos (`ArbitroPptComponent`, `RegraProximidadeComponent`, `SigiloMetaComponent`).
- **Camada de Sincronização (Cliente - `src/lib/engine/update/`):** Reducer determinístico puro `gameReducer` (`state-machine.ts`) que reconcilia o estado da máquina cliente via Server-Sent Events (SSE) sem decidir regras por conta própria.
- **Camada de Render (Cliente - `src/lib/engine/render/`):** Projeções puras `UI = f(State)` (`projections.ts`) que blindam a meta oculta e entregam ViewModels reativos para os componentes Svelte.
- **Orquestrador Central (`src/lib/engine/game-engine.ts`):** Coordena o ciclo de vida e notifica os ouvintes reativos da interface.
- **Análise de Serialização JSON e Otimização:** No modelo atual com `pb_hooks`, o fluxo de dados atravessa um funil de três camadas (`HTTP` $\rightarrow$ `Go` $\rightarrow$ `Goja JS` $\rightarrow$ `SQLite/SSE`), incorrendo em conversão de tipos por reflexão em runtime (`reflect`) e alocações na heap da VM. Na cadência atual de turnos (ações esparsas a cada ~30s), o custo é irrelevante (~0,5 ms a 2 ms). Para tráfego contínuo em tempo real (arrasto do slider a 60 fps), a solução exige Go nativo com WebSockets duplex. Para snapshots volumosos (reconciliação `FULL_SYNC` e métricas finais), a arquitetura prevê a técnica de **SQL-Generated JSON** (`json_object` e `json_group_array` no SQLite) repassando bytes brutos diretamente ao HTTP sem overhead de serialização no Go.

> Para detalhes de arquitetura, componentes atômicos e integração com PocketBase, consulte [docs/agents/architecture.md](docs/agents/architecture.md) e [docs/componentes/componentes.md](docs/componentes/componentes.md).

---

## 4. Síntese de Localização Rápida (Onde Encontrar Cada Coisa)

| O que você precisa alterar / inspecionar     | Onde encontrar (Arquivo / Pasta)         | Responsabilidade Principal                                                                           |
| :------------------------------------------- | :--------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Página inicial do projeto e índice**       | `README.md`                              | Apresentação do jogo, integrantes e sumário de navegação com links diretos.                          |
| **SGDD consolidado da versão atual**         | `docs/sgdd/sgdd.md`                      | Short Game Design Document (Motta & Trigueiro, SBGames 2013) com texto corrido e listas de produção. |
| **Modelagem de Entidades abrangentes**       | `docs/entidades/entidades.md`            | As 5 grandes entidades conceituais (`Participante`, `Sessao`, `Artefato`, `Disputa`, etc.).          |
| **Catálogo de Componentes atômicos**         | `docs/componentes/componentes.md`        | Os 18 componentes atômicos, matriz de associação com entidades e justificativas técnicas.            |
| **Diagramas de Entidades e Componentes**     | `docs/diagramas/diagramas.md`            | Diagramas visuais em grid de entidades, instanciações e composição com componentes.                  |
| **Paleta, tokens CSS, dark mode e temas**    | `src/routes/layout.css`                  | Variáveis `:root` e `[data-theme='dark']` (superfícies, textos, cores de equipes e acentos).         |
| **Importação de fontes e head global**       | `src/app.html`                           | Links para Google Fonts e CDN (Bagel Fat One, Capriola, SN Pro, Mona Sans, Fira Code).               |
| **Casca da aplicação e navegação**           | `src/routes/+layout.svelte`              | Estrutura comum que envolve todas as páginas e carrega os estilos globais.                           |
| **Lobby de entrada e criação de sala**       | `src/routes/+page.svelte`                | Tela inicial com Title Card, criação rápida de sala e entrada de apelido.                            |
| **Arena principal do jogo (Partida)**        | `src/routes/[sala]/+page.svelte`         | Orquestração da sala, sincronização da partida e renderização das fases.                             |
| **Componente do Tubo de Ensaio (SVG)**       | `src/lib/components/TestTube.svelte`     | Tubo procedural SVG, dupla camada de menisco contínuo e física de agitação tátil.                    |
| **Camada de Input (Intenção & Sanitização)** | `src/lib/engine/input/`                  | Higienização defensiva (sanitize.ts) e normalização de intenções (intent-factory.ts).                |
| **Camada de Update (Máquina de Estados)**    | `src/lib/engine/update/`                 | Reducer determinístico (state-machine.ts) e algoritmo de proximidade (score-rules.ts).               |
| **Camada de Render (Projeções UI)**          | `src/lib/engine/render/`                 | Seletores puros UI = f(State) e blindagem de sigilo da meta oculta (projections.ts).                 |
| **Orquestrador do Motor Canônico**           | `src/lib/engine/game-engine.ts`          | Orquestrador reativo coordenando a cadência Input -> Update -> Render e inscrições.                  |
| **Backend Autoritativo em Go Nativo**        | `backend/` (`cmd/server/`, `internal/`)  | Servidor estendendo PocketBase, Entidades de Domínio, Componentes Atômicos e rotas pass-through.     |
| **Regras e Restrições para Agentes**         | `AGENTS.md`, `docs/agents/` e `.agents/` | Proibições estritas, guias aprofundados e convenções do repositório.                                 |

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

### Fase 1: Fundação, Migração e Especificações Acadêmicas (Concluída)

- [x] Definição conceitual e validação do game loop via Pitch.
- [x] Backend PocketBase configurado com migrações declarativas e hooks de limpeza.
- [x] PoC de conectividade multiplayer funcional entre redes distintas (Wi-Fi vs 4G).
- [x] Eliminar completamente o runner de p5.js, o iframe e códigos de portfólio.
- [x] Implementar sistema de tokens com as paletas Light e Dark e as 4 famílias tipográficas.
- [x] Implementar o motor desacoplado com arquitetura Input $\rightarrow$ Update $\rightarrow$ Render em TypeScript nativo.
- [x] Formalização do SGDD acadêmico, modelagem de Entidades abrangentes e catálogo de Componentes atômicos.

### Fase 2: Componentes Compostos e Core Loop (Em Andamento)

- [ ] Implementar alternância dinâmica e manual entre os temas Light e Dark com transição suave de cores.
- [x] Criar o componente `TestTube.svelte` em SVG procedural com física de líquido, menisco senoidal contínuo e easter egg interativo de chacoalho.
- [ ] Criar o componente `AnalogSlider.svelte` integrando a classe composível `SliderDragController`.
- [x] Implementar a máquina de estados desacoplada com as fases de Dica, Palpite e Revelação.
- [x] Implementar algoritmo de proximidade com faixas de acerto (+4, +3, +2, 0) testado com `bun test`.
- [ ] Implementar divisão tripartite de equipes no Lobby (Corvo, Aleatório, Águia), controle de quórum de 4 jogadores e início autoritativo pelo anfitrião.
- [ ] Minijogo de Pedra, Papel e Tesoura refatorado em Svelte puro para decisão de turno.
- [x] Portabilidade autoritativa dos hooks para Go nativo com PocketBase estendido, adequando o backend à arquitetura de Entidades e Componentes atômicos.

### Fase 3: Polimento e Experiência de Jogo

- [x] Criar ícone animado procedural da identidade visual (substituindo o placeholder do favicon no Title Card pelo `TestTube`).
- [ ] Dinamizar a aceleração do menisco em função da pontuação acumulada das equipes (Canal do Fluxo / Modulador de Tensão: duração de 5.0s a 0.25s).
- [ ] Animação da Revelação Dramática com cálculo de sintonia e preenchimento de placar.
- [ ] Interface de Revanche imediata mantendo a sala e alternando posições.
- [ ] Otimizações táteis e feedback háptico (`navigator.vibrate`) em dispositivos móveis.
