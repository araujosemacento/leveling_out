# AGENTS.md: Guia Canônico do Projeto Leveling Out

Hub canônico de regras e navegação para desenvolvedores e agentes autônomos no jogo multiplayer **Leveling Out**.

Especificações detalhadas em `docs/`: [Game Design](docs/agents/game-design.md) / [Arquitetura](docs/agents/architecture.md) / [Estilo Visual](docs/agents/style-guide.md) / [Roadmap](docs/agents/roadmap.md) / [SGDD](docs/sgdd/sgdd.md) / [Entidades](docs/entidades/entidades.md) / [Componentes](docs/componentes/componentes.md) / [Diagramas](docs/diagramas/diagramas.md).

---

## 1. Mandamentos Inegociáveis e Restrições Absolutas

Todo código, estilo ou modificação submetida neste repositório deve respeitar rigorosamente as seguintes restrições:

1. **Runtime Bun Exclusivo:** O único runtime JavaScript/TypeScript e gerenciador de pacotes admitido é o **Bun** (`bun`). É expressamente proibido tentar executar comandos `node`, `npm`, `npx` ou `pnpm`.
2. **Sistema Distribuído e Autoritarismo do Servidor (Zero Trust):** O front-end é responsável exclusivamente por Input e Render. O servidor Go nativo em memória detém autoridade soberana e exclusiva sobre Update (regras de integridade, pontuação e sigilo da `meta_oculta`). A `GameEngine` cliente sincroniza o estado via WebSockets full-duplex sem decidir regras por conta própria.
3. **Composição por Entidades e Componentes:** Entidades são agregadores conceituais amplos (especializadas em ciclo de vida e nomeação). Componentes são imperativamente atômicos e de uso específico, conferindo capacidades operacionais às entidades.
4. **Sem Emojis:** Proibido utilizar emojis em títulos, botões, status ou ilustrações.
5. **Sem Cards Genéricos:** Proibido utilizar contêineres decorativos padronizados no formato de "card" flutuante.
6. **Sem Travessões como Separadores:** Proibido utilizar travessões (`–`, `—`) ou hífen como separador de títulos ou textos de interface. Utilize dois-pontos (`:`), barras (`/`) ou formulação textual contínua.
7. **Sem Bullets Decorativos:** Proibido utilizar marcadores como `●`, `○`, `•`, `▪`, `✓` ou círculos decorativos (`rounded-full` em pings de status).
8. **TypeScript Nativo:** Toda a lógica de motor, controladores, modelos de dados e testes deve ser estritamente tipada em TypeScript (`.ts`), com ações modeladas por uniões discriminadas.
9. **Proibição de Commits e Pushes Autônomos:** Agentes de IA são expressamente proibidos de executar comandos de commit (`git commit`), criação de tags (`git tag`) ou envio para remotos (`git push`) de forma autônoma. A responsabilidade do agente restringe-se a fornecer propostas de sumário, descrição detalhada e o comando git sugerido pronto para que o desenvolvedor humano execute a ação por conta própria.
10. **Filosofia Ponytail (Pragmatismo e Simplicidade Máxima):** O melhor código é aquele que não precisou ser escrito. Toda solução deve adotar o menor diff completo que atenda à demanda (YAGNI estrito), seguindo a Escada da Menor Mudança (`.agents/rules/ponytail.md`). Nunca corte validações de integridade (Zero Trust), segurança, acessibilidade ou tratamento de erros. Atalhos deliberados devem ser marcados com `// shortcut: <limite>, <quando refatorar>` para auditoria via `/ponytail-debt`.

---

## 2. Visão Geral e Game Loop

**Leveling Out** é um _party game_ multiplayer focado em dedução e sintonia social. Duas equipes competem tentando calibrar conceitos subjetivos ao longo de uma escala percentual contínua (0% a 100%).

- **Desafio Central:** O Codificador visualiza uma meta secreta no tubo de ensaio e envia uma dica textual baseada em um espectro bipolar. O Palpiteiro da equipe ajusta o marcador analógico até onde estima estar o nível do líquido.
- **Cadência Canônica:**
  1. _Lobby e Iniciativa:_ Entrada via slug (`/[sala]`), divisão de equipes e minijogo de Pedra, Papel e Tesoura (PPT).
  2. _Core Loop:_ Escolha do espectro, envio de dica, arrasto analógico e revelação simultânea por tolerância de proximidade (+4, +3, +2 ou 0 pontos).
  3. _Conclusão:_ Turnos alternados até 10 pontos e revanche instantânea.

> Detalhamento narrativo e mecânicas em [docs/agents/game-design.md](docs/agents/game-design.md) e [docs/sgdd/sgdd.md](docs/sgdd/sgdd.md).

---

## 3. Arquitetura do Motor: Input $\rightarrow$ Update $\rightarrow$ Sync & Render

O motor adota o desacoplamento de um sistema distribuído em tempo real:

- **Input (Cliente - `src/lib/engine/input/`):** Sanitização defensiva rigorosa (`sanitize.ts`) e normalização de intenções (`intent-factory.ts`).
- **Update (Servidor Go - `backend/`):** Autoridade soberana em memória com padrão de Ator (`RoomActor`), eliminando concorrência sem I/O de disco. Modela entidades (`entities/`) e componentes atômicos (`components/`).
- **Sincronização (Cliente - `src/lib/network/`):** WebSocket full-duplex (`GameSocket`), reconexão exponencial e reconciliação determinística (`state-machine.ts`).
- **Render (Cliente - `src/lib/engine/render/`):** Projeções puras `UI = f(State)` (`projections.ts`) que blindam a meta oculta até a revelação.
- **Orquestrador (`src/lib/engine/game-engine.ts`):** Coordena ciclo de vida e notifica listeners da interface.

> Especificação técnica completa em [docs/agents/architecture.md](docs/agents/architecture.md) e [docs/componentes/componentes.md](docs/componentes/componentes.md).

---

## 4. Mapa Sintético de Localização por Domínio

Para a catalogação exaustiva com todos os 29 arquivos e classes, consulte [docs/agents/architecture.md](docs/agents/architecture.md#6-catálogo-exaustivo-de-localização-do-código-e-recursos).

| Domínio de Engenharia | Onde encontrar (Arquivo / Pasta) | Papel Principal |
| :--- | :--- | :--- |
| **Motor e Estado Front-end** | `src/lib/engine/` (`input/`, `update/`, `render/`) | Captura de intenções, reducer determinístico, projeções de interface e orquestrador. |
| **Componentes Visuais** | `src/lib/components/` e `src/routes/` | Tubo de ensaio SVG procedural, slider analógico, lobby tripartite e casca da sala. |
| **Servidor Autoritário Go** | `backend/internal/` (`actor/`, `entities/`, `components/`) | Goroutines por sala (Actor Pattern), Zero Trust, árbitro PPT e segredo em memória. |
| **Rede e Protocolo** | `backend/internal/protocol/` e `src/lib/network/` | Protocolo WebSocket unificado full-duplex (`GameSocket`), reconexão e streaming. |
| **Identidade de Dispositivo** | `src/lib/config/device.ts` | Tripla persistência resiliente com auto-cura de `device_id` para moderação. |
| **Especificações e SGDD** | `docs/` (`sgdd/`, `entidades/`, `componentes/`, `diagramas/`) | SGDD acadêmico, modelagem das 5 entidades e catálogo dos 19 componentes. |
| **Diretrizes e Regras** | `docs/agents/` e `.agents/rules/` | Guias de arquitetura, game design, estilo visual e filosofia Ponytail. |

---

## 5. Diretrizes de Estilo e Identidade Visual

- **Taxonomia Tipográfica:**
  - Estilizadas (Alto Impacto): `Bagel Fat One` (título principal e celebração) e `Capriola` (subtítulos e transições).
  - Utilitárias (Legibilidade Rápida): `SN Pro` (cabeçalhos e avisos) e `Mona Sans` (textos corridos e métricas).
  - Monospace: `Fira Code` (códigos de sala `roomCode`).
- **Paleta de Cores e Temas:** Matrizes semânticas para os modos Light (`#faf4eb`) e Dark (`#140e05`), mapeadas em `src/routes/layout.css` e consumidas por utilitários Tailwind v4.
- **Convenção de Botões:** O ícone em botões de ação deve ser posicionado estritamente à direita do texto (ex.: `<span>Ação</span> <Icon ... />`).

> Para a especificação completa de tokens CSS hexadecimais e regras visuais, consulte [docs/agents/style-guide.md](docs/agents/style-guide.md).

---

## 6. Comandos Essenciais da CLI (Bun Exclusivo)

- Iniciar servidor de desenvolvimento: `bun run dev`
- Executar suíte de testes automatizados: `bun test`
- Verificar diagnósticos de tipagem TypeScript: `bun run check`
- Validar conformidade de lint e estilo: `bun run lint`
- Formatar código com Prettier: `bun run format`
- Auditar orçamento de contexto e links: `bun run check:context`
- Gerar build de produção: `bun run build`

---

## 7. Status do Projeto e Roadmap Ativo

Para o histórico completo de entregas das Fases 1 e 2, consulte [docs/agents/roadmap.md](docs/agents/roadmap.md).

### Fase 3: Polimento e Experiência de Jogo (Em Andamento)

- [x] Ícone animado procedural da identidade visual (`TestTube` no Title Card).
- [x] Streaming contínuo do slider analógico em tempo real via WebSockets (30-60 Hz).
- [x] Eliminação completa dos arquivos legados em `static/` (`p5.min.js`, `p5.sound.min.js`, `pocketbase.umd.js`).
- [ ] Dinamizar a aceleração do menisco em função da pontuação acumulada (Canal do Fluxo / Modulador de Tensão).
- [ ] Animação da Revelação Dramática com cálculo de sintonia e preenchimento de placar.
- [ ] Interface de Revanche imediata mantendo a sala e alternando posições.
- [ ] Otimizações táteis e feedback háptico (`navigator.vibrate`) em dispositivos móveis.
