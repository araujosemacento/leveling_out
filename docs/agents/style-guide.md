# Diretrizes de Estilo e Identidade Visual

Este documento detalha o sistema de design, a tipografia oficial, as paletas cromáticas nos temas Light e Dark, as convenções de Tailwind CSS e as restrições visuais estritas do projeto **Leveling Out**.

---

## 1. Taxonomia Tipográfica Oficial

O projeto divide sua tipografia em duas categorias complementares:

### 1.1. Aplicações Estilizadas (Identidade Bubbly & Amigável)

- **Bagel Fat One:** Título principal, Title Card do jogo, momentos de celebração e aplicações de alto impacto visual onde transmitir carisma e identidade é prioritário.
- **Capriola:** Subtítulos, pontes de transição entre introdução e blocos textuais e rótulos intermediários.

### 1.2. Aplicações Utilitárias (Legibilidade e Leitura Rápida)

- **SN Pro:** Títulos utilitários, cabeçalhos de regras, avisos pontuais e seções onde o jogador precisa bater o olho e assimilar a instrução de imediato.
- **Mona Sans:** Textos corridos, explicações conceituais, termos de rodada e métricas.

### 1.3. Apoio Técnico Monospace

- **Fira Code:** Exclusiva para visualização e cópia de códigos de sala (`roomCode`).

---

## 2. Paleta de Cores Oficial e Extrapolações

A paleta conta com matrizes base e extrapolações semânticas para os temas Light e Dark, espelhadas em `src/routes/layout.css`:

### 2.1. Tema Light (Padrão)

- **Base:** `--text: #271602`, `--background: #faf4eb`, `--primary: #e2931d`, `--secondary: #e5988b`, `--tertiary: #4bf762`, `--accent: #4c2bb1`
- **Superfícies:** `--bg-base: #faf4eb`, `--bg-surface: #ffffff`, `--bg-surface-soft: #f4ece0`, `--bg-surface-elevated: #ede2d3`
- **Bordas:** `--border-subtle: #e5d7c4`, `--border-medium: #d4c0a5`, `--border-strong: #271602`, `--border-accent: #4c2bb1`
- **Textos:** `--text-primary: #271602`, `--text-muted: #6e563d`, `--text-subtle: #988066`, `--text-on-accent: #ffffff`
- **Ações:** `--primary-hover: #cc7e12`, `--secondary-hover: #db8576`, `--tertiary-hover: #37df4e`, `--accent-hover: #3c2091`

### 2.2. Tema Dark

- **Base:** `--text: #fdecd8`, `--background: #140e05`, `--primary: #e2931d`, `--secondary: #74281a`, `--tertiary: #08b41f`, `--accent: #704ed4`
- **Superfícies:** `--bg-base: #140e05`, `--bg-surface: #1e1509`, `--bg-surface-soft: #291e10`, `--bg-surface-elevated: #352717`
- **Bordas:** `--border-subtle: #3a2b19`, `--border-medium: #4e3a24`, `--border-strong: #fdecd8`, `--border-accent: #704ed4`
- **Textos:** `--text-primary: #fdecd8`, `--text-muted: #cbb49c`, `--text-subtle: #8e7a63`, `--text-on-accent: #ffffff`
- **Ações:** `--primary-hover: #f0a32d`, `--secondary-hover: #8f3322`, `--tertiary-hover: #12cc2b`, `--accent-hover: #8666e8`

---

## 3. Convenções de Botões, Padrão Soft UI e Utilitários Tailwind v4

1. **Padrão Canônico de Ações: Soft UI (Neumorfismo):**
   - O padrão canônico e obrigatório para botões de ação e submissão na interface é o **Soft UI** (Neumorfismo tátil), implementado pela classe `.btn-soft-elevated` em `src/routes/layout.css`.
   - **Formato:** Pílula contínua (`rounded-full`) e tipografia utilitária `SN Pro` (`font-util-heading`).
   - **Superfície e Relevo:** Fundo integrado à base (`var(--bg-base)`), com efeito de relevo extrudado por sombras opostas de luz e sombra (`var(--shadow-neumorph-light)` e `var(--shadow-neumorph-dark)`).
   - **Afundamento no Clique e Desativação:** Tanto no clique (`:active`) quanto no estado desativado (`:disabled`), o botão assume o relevo rebaixado/afundado na superfície via sombras internas (`inset`), removendo a sombra de projeção e o text-shadow para simular fisicamente que está imóvel e encravado no plano de fundo.
   - **Posicionamento de Ícones:** Em botões de formulário e ações de envio/criação, o ícone deve ser posicionado estritamente à direita do texto (ex.: `<span>Rótulo</span> <Icon ... />`), com transição sutil no hover (`group-hover:translate-x-0.5` ou `group-hover:scale-110`).

2. **Exceção Deliberada de Design: Cartas de Espectro:**
   - As **Cartas de Espectro** (`SpectrumCard.svelte`) constituem uma exceção consciente e deliberada ao Soft UI e à regra de não usar cards genéricos.
   - Foram intencionalmente desenhadas com cantos retos e afiados (`rounded-none`), moldura interna e cantoneiras geométricas em SVG especificamente para evocar a materialidade, rigidez e tangibilidade de cartas físicas colecionáveis de um jogo de mesa real.
   - Todos os demais botões da mesma tela (como o botão "Confirmar Carta" em `SpectrumArena.svelte`) continuam seguindo obrigatoriamente o padrão Soft UI (`.btn-soft-elevated`).

3. **Integração Tailwind:**
   - Empregar classes utilitárias do Tailwind v4 (`bg-primary`, `bg-accent`, `bg-bg-surface`, `border-border-subtle`, `text-text-primary`, etc.) mapeadas pelo `@theme` sobre as variáveis CSS, evitando hardcode de cores hexadecimais literais.

---

## 4. Restrições Visuais Estritas

É **expressamente proibido** incluir no front-end:

1. **Emojis:** Nenhuma utilização de emojis em títulos, botões, feedbacks, status ou ilustrações.
2. **Cards:** Não utilizar elementos genéricos com estilo de "card" flutuante ou contêineres decorativos padronizados. Exceção canônica única: Cartas de Espectro (`SpectrumCard.svelte`), desenhadas com cantos retos para emular cartas físicas reais.
3. **Travessões (–, —) e suas variações:** Proibido o uso de travessões ou hífen como separador de títulos e textos de interface. Utilizar dois-pontos (`:`), barras (`/`), ou fluxo textual contínuo.
4. **Bullet Points e Indicadores Circulares:** Proibido o uso de caracteres como "●", "○", "•", "▪", "✓", bem como círculos decorativos (`rounded-full` em spans de status ou pings de presença).
