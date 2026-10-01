# Diretrizes Estritas de Front-end e Estilo Visual

## 1. Identidade Visual e Paleta de Cores (Light & Dark)

O projeto baseia sua paleta em valores calibrados para contraste, acessibilidade e harmonia:

### Tema Light (Padrão)

- **Base:** `--text: #271602`, `--background: #faf4eb`, `--primary: #e2931d`, `--secondary: #e5988b`, `--tertiary: #4bf762`, `--accent: #4c2bb1`
- **Superfícies:** `--bg-base: #faf4eb`, `--bg-surface: #ffffff`, `--bg-surface-soft: #f4ece0`, `--bg-surface-elevated: #ede2d3`
- **Bordas:** `--border-subtle: #e5d7c4`, `--border-medium: #d4c0a5`, `--border-strong: #271602`, `--border-accent: #4c2bb1`
- **Textos:** `--text-primary: #271602`, `--text-muted: #6e563d`, `--text-subtle: #988066`, `--text-on-accent: #ffffff`
- **Ações:** `--primary-hover: #cc7e12`, `--secondary-hover: #db8576`, `--tertiary-hover: #37df4e`, `--accent-hover: #3c2091`

### Tema Dark

- **Base:** `--text: #fdecd8`, `--background: #140e05`, `--primary: #e2931d`, `--secondary: #74281a`, `--tertiary: #08b41f`, `--accent: #704ed4`
- **Superfícies:** `--bg-base: #140e05`, `--bg-surface: #1e1509`, `--bg-surface-soft: #291e10`, `--bg-surface-elevated: #352717`
- **Bordas:** `--border-subtle: #3a2b19`, `--border-medium: #4e3a24`, `--border-strong: #fdecd8`, `--border-accent: #704ed4`
- **Textos:** `--text-primary: #fdecd8`, `--text-muted: #cbb49c`, `--text-subtle: #8e7a63`, `--text-on-accent: #ffffff`
- **Ações:** `--primary-hover: #f0a32d`, `--secondary-hover: #8f3322`, `--tertiary-hover: #12cc2b`, `--accent-hover: #8666e8`

## 2. Taxonomia Tipográfica Oficial

1. **Aplicações Estilizadas (Identidade Bubbly & Friendly):**
   - **Bagel Fat One (`.font-display`):** Título principal, Title Card do jogo, vitórias e momentos de alto impacto onde o apelo visual sobrepõe a densidade de leitura.
   - **Capriola (`.font-subheading`):** Subtítulos, objetos de transição entre introdução e blocos informativos.
2. **Aplicações Utilitárias (Legibilidade, Concentração e Leitura Rápida):**
   - **SN Pro (`.font-util-heading`):** Títulos utilitários, alertas pontuais, cabeçalhos de regras e conteúdos que o usuário precisa bater o olho e assimilar de relance.
   - **Mona Sans (`.font-util-body`):** Textos corridos, explicações conceituais de espectro, regras do jogo e métricas.
3. **Monospace:**
   - **Fira Code (`.font-code`):** Exclusiva para códigos de sala (`roomCode`).

## 3. Proibições Estritas de Front-end

Neste repositório, é **expressamente proibido** incluir no front-end:

1. **Emojis:**
   - Nenhuma utilização de emojis em títulos, botões, feedbacks, status ou canvas.
   - Utilizar apenas tipografia limpa e vetores SVG funcionais.

2. **Cards:**
   - Não utilizar elementos genéricos com estilo de "card" (contêineres flutuantes decorativos, caixas de card padronizadas ou designs baseados em cartões) a menos que haja um comando explícito no prompt para tal.

3. **Travessões (–, —) e suas variações:**
   - Proibido o uso de travessões (en-dash `–`, em-dash `—`) ou hífen como separador de títulos e textos de interface. Utilizar dois-pontos (`:`), barras (`/`), ou reescrever a frase de forma fluida.

4. **Bullet Points e Indicadores Circulares:**
   - Proibido o uso de caracteres de ponto ou marcadores como "●", "○", "•", "▪", "✓".
   - Proibido o uso de elementos visuais circulares decorativos (como spans com classes `rounded-full`, a exemplo de pontos de status ou pings de presença).

---

### Exceção Única

Qualquer um dos elementos proibidos acima só poderá ser adicionado se houver uma instrução **explícita e direta** no prompt do usuário solicitando especificamente tal elemento.
