# Arquitetura Técnica e Game Loop Canônico

Este documento detalha os princípios de engenharia, a máquina de estados desacoplada, os pilares de segurança e as convenções de infraestrutura do projeto **Leveling Out**.

---

## 1. A Regra de Ouro do Game Loop: Input $\rightarrow$ Update $\rightarrow$ Render

Apesar de ser implementado sobre o DOM e componentes reativos do Svelte, todo o fluxo do jogo segue a cadência estrita de um _game loop_ canônico, desacoplando o núcleo de regras da camada visual:

### 1.1. Fase de Input (Intenção do Jogador)

- Captura eventos brutos de usuário (toque, arrasto do slider analógico, digitação de pistas, escolha de lances no PPT) e eventos assíncronos de rede (mensagens SSE do PocketBase).
- Aplica sanitização defensiva local (limites de caracteres e filtros de segurança via `src/lib/engine/input/sanitize.ts`).
- Normaliza os eventos em objetos de ação tipados (`GameAction` via `src/lib/engine/input/intent-factory.ts`).
- Nenhum manipulador de evento de input altera diretamente elementos visuais ou estados de renderização sem passar pelo motor de atualização.

### 1.2. Fase de Update (Reconciliação com o Servidor)

- O núcleo agnóstico do jogo (`src/lib/engine/update/state-machine.ts`) processa a ação contra o estado atual da partida.
- Aplica transições de fase locais, cronômetros determinísticos e reconciliação com o estado autoritativo do PocketBase.
- O estado do jogo permanece puro, desacoplado de dependências do navegador ou do Svelte, permitindo testes unitários headless com `bun test`.

### 1.3. Fase de Render (Projeção e Coreografia Visual)

- A camada de componentes Svelte atua como função pura da projeção de estado (`UI = f(State)` via `src/lib/engine/render/projections.ts`).
- Reatividade declarativa via Svelte 5 Runes (`$state`, `$derived`, `$props`).
- Animações e transições visuais reagem a deltas de estado sem interferir na integridade do estado da partida.

---

## 2. Pilares de Segurança do Front-end (Zero Trust & Autoritarismo de Estado)

Alinhado às diretrizes de segurança do backend, o front-end opera sob o princípio de **Confiança Zero (Zero Trust)**:

1. **Autoritarismo do Servidor:** O front-end nunca calcula pontuações oficiais, não determina vencedores de PPT e não decide transições críticas de turno. O cliente envia unicamente _intenções_ (`SUBMIT_GUESS`, `SUBMIT_CLUE`, `SUBMIT_PPT_MOVE`). A verdade autoritativa reside exclusivamente nos hooks do PocketBase (`pb_hooks/game_rules.pb.js`).
2. **Defesa em Profundidade e Sanitização:** Antes de transmitir qualquer dado à rede, o front-end sanitiza rigorosamente as entradas:
   - Dicas conceituais: máximo de 60 caracteres, remoção de caracteres de controle e tags HTML.
   - Apelidos de jogadores: máximo de 20 caracteres alfanuméricos com pontuação básica.
   - Palpites do slider: número inteiro contido estritamente no intervalo fechado [0, 100].
3. **Sigilo Absoluto da Meta Oculta:** O valor percentual da meta no tubo de ensaio (`meta_oculta`) nunca deve ser armazenado ou inferido no cliente antes da fase de revelação oficial (`RODADA_REVELACAO`) enviada pelo servidor, impedindo que participantes visualizem o volume secreto inspecionando o console ou a memória do navegador.
4. **Papel de `score-rules.ts` no Front-end:** As regras de proximidade no cliente existem unicamente para pré-visualização visual de graduação ou feedback tátil imediato, jamais para gravar ou impor placares à sala.

---

## 3. TypeScript Nativo como Padrão de Engenharia

Toda a lógica pura do motor (`src/lib/engine/`), controladores compostos (`src/lib/controllers/`), modelos de dados e testes em `tests/` são escritos estritamente em **TypeScript (`.ts`)**:

- **Contratos Tipados:** Ações de jogo (`GameAction`) modeladas via uniões discriminadas (_discriminated unions_), garantindo que cada evento carregue seu payload obrigatório correto.
- **Svelte 5 Runes Tipados:** Aproveitamento total de tipos em `$props<T>()`, `$state<T>()` e nas classes de controladores orientados a objetos.
- **Execução Nativa com Bun:** Zero sobrecarga de build, com compilação e execução imediata pelo Bun e Vite.

---

## 4. Padrão de Composição (POO) em Controladores

Para garantir legibilidade, manutenibilidade e foco estrito de responsabilidade:

- **Componentes Pontuais:** Cada componente Svelte foca única e exclusivamente em sua tarefa visual e estrutural pontual (Single Responsibility Principle). Componentes não acumulam regras de negócio, cálculos matemáticos complexos ou lógica de rede em suas tags `<script>`.
- **Composição sobre Herança:** Métodos gerais, ações utilitárias e rotinas amplamente reprodutíveis são desacoplados em classes ou módulos composíveis orientados a objetos (ex.: `SliderDragController`, `RoundTimer`, `RoomSessionManager`).
- Os componentes Svelte instanciam ou recebem esses controladores por composição, delegando tarefas e observando mudanças de estado.

---

## 5. Ferramentas e Estratégias de Animação

Com a descontinuação total do p5.js, as animações do jogo (líquido do tubo, menisco, borbulhas, revelação de pontuação, transições de cartas) utilizam soluções nativas de alto desempenho:

1. **Svelte Motion e Transitions Nativas (`svelte/motion` e `svelte/transition`):**
   - Transições de interface, física de molas no slider analógico (`spring`), interpolações de valores numéricos de placar (`tweened`) e transições de tela (`fade`, `fly`, `scale`).
   - Vantagens: Zero dependências externas, sincronização com o ciclo de vida do Svelte e baixíssimo overhead.
2. **Motion ou Web Animations API (WAAPI):**
   - Execução direta na thread da GPU através da WAAPI nativa.
   - Ideal para animações contínuas, flutuações e efeitos dinâmicos sem quedas de frames na thread de JavaScript.
3. **GSAP (GreenSock):**
   - Empregado caso surja a necessidade de orquestrar timelines complexas e coreografadas na etapa de Revelação Dramática (subida do menisco, parada na meta oculta, expansão de ondas de acerto e incremento escalonado do placar).
4. **SVG Procedural Reativo:**
   - Renderização do tubo de ensaio, menisco curvo e borbulhas diretamente via paths e tags SVG reativas manipuladas por CSS e Svelte, garantindo nitidez vetorial infinita.

---

## 6. Backend Realtime: PocketBase Autohospedado

- **Tecnologia:** **PocketBase** (único binário executável em Go com SQLite embarcado).
- **Consumo de Recursos:** **~15 MB a 30 MB de RAM**, ideal para rodar em uma máquina pessoal ligada continuamente sem afetar o sistema.
- **Exposição para a Internet:** Conectado através de um túnel reverso com certificado TLS automático (**Tailscale Funnel** ou **Cloudflare Tunnel**), permitindo conexões diretas de qualquer dispositivo em redes 4G/5G (com CGNAT) ou Wi-Fi doméstico.
- **Protocolo Realtime:** _Server-Sent Events (SSE)_ nativo sobre HTTP com assinaturas por sala (`pb.collection('salas').subscribe(roomCode, ...)`).
- **Efemeridade e Privacidade:** Usuários anônimos identificados por `playerId` em `sessionStorage`. Higienização automática periódica via hook (`pb_hooks/cleanup.pb.js`) apagando salas inativas há mais de 15 minutos.
