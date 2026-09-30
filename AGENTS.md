# AGENTS.md: Documentação do Projeto & Leveling Out

Este documento serve como guia central para desenvolvedores e agentes autônomos que operam neste repositório. Ele detalha a visão conceitual do jogo **Leveling Out**, o funcionamento de seu _game loop_, a arquitetura técnica adotada e o roteiro (_roadmap_) de desenvolvimento.

---

## 1. Visão Geral do Jogo: Leveling Out

**Leveling Out** é um _party game_ multiplayer focado em **dedução, sintonia e empatia social**. Os jogadores competem em duas equipes tentando calibrar conceitos subjetivos ao longo de uma escala percentual contínua (0% a 100%).

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

O fluxo tem início quando o usuário acessa a plataforma em seu dispositivo e cria ou ingressa em uma sala via slug na URL (`/projeto/leveling-out/[sala]`), reunindo os participantes em um lobby compartilhado onde são divididos em duas equipes. Para definir quem começa a partida de forma rápida e divertida, o sistema engatilha um minijogo digital de pedra, papel e tesoura entre representantes de cada time; a equipe vencedora ganha o direito de iniciar a partida e escolhe a carta temática da primeira rodada, delimitando o espectro bipolar conceitual (ex.: "Famoso / Anônimo" ou "Fácil / Difícil"). Com os parâmetros estabelecidos e os papéis atribuídos, a rodada é sincronizada em tempo real em todas as telas conectadas.

### Parágrafo 2: O Core Loop da Rodada (Dica, Palpite e Revelação)

Na fase ativa, o sistema sorteia aleatoriamente um membro da equipe da vez para atuar como Codificador e preenche exclusivamente em sua tela um tubo de ensaio com nível percentual oculto (como 70%), invisível aos demais jogadores. Esse integrante analisa a carta de espectro e digita uma pista associativa contextualizada (ex.: "Keanu Reeves"), enviando-a ao seu parceiro de equipe; cabe ao Palpiteiro decodificar o raciocínio do colega e deslizar o marcador analógico até onde estima estar o líquido no tubo. Finalizado o palpite, ocorre a revelação simultânea para todos os participantes: um algoritmo calcula a margem de erro por proximidade, convertendo exatidão em pontuação no placar, ao passo que erros grosseiros resultam em zero pontos e transferem o _momentum_ competitivo diretamente para o início do turno da equipe adversária.

### Parágrafo 3: Progressão, Ritmo de Corrida e Conclusão com Revanche

A partida se desenvolve em turnos estritamente alternados entre as duas equipes, estruturando uma corrida dinâmica rumo à pontuação-alvo predeterminada, em que cada acerto ou erro do rival atua como regulador de tensão e alívio no canal de fluxo dos competidores. O desfecho da disputa é alcançado no instante em que uma das equipes atinge a pontuação máxima, disparando a tela de vitória que consagra os campeões e exibe um painel de "Métricas de Sintonia", destacando os palpites milimetricamente certeiros e as gafes conceituais mais cômicas da partida. Essa interface final disponibiliza ações imediatas para iniciar uma Revanche mantendo as mesmas composições ou retornar ao lobby principal, fechando o ciclo e estimulando a rejogabilidade.

---

## 3. Arquitetura Técnica Escolhida

O ecossistema equilibra hospedagem estática gratuita com um servidor em tempo real autohospedado de consumo mínimo de recursos.

### Front-end (SvelteKit + p5.js)

- **Hospedagem Estática:** Compilado via `@sveltejs/adapter-static` e servido no **GitHub Pages**.
- **Slugs Aninhados:** A rota `/projeto/[slug]/[sala]` opera com `prerender = false; ssr = false;` e é resolvida em runtime através do fallback `404.html` do GitHub Pages.
- **Motor Gráfico p5.js (p5-First):** Toda a renderização interativa (tubo de ensaio, fluidos, borbulhas, slider analógico, botões de ação e efeitos de pontuação) vive no canvas do **p5.js**.
- **Runner Isolado:** O [P5Frame.svelte](file:///home/melo/Documentos/GitHub/portfolio_programacao_jogos/src/lib/components/P5Frame.svelte) executa as sketches dentro de um `<iframe>` com `srcdoc`, injetando `window.__ROOM_CODE__` e scripts de rede de forma limpa.

### Backend Realtime: PocketBase Autohospedado

- **Tecnologia:** **PocketBase** (único binário executável em Go com SQLite embarcado).
- **Consumo de Recursos:** **~15 MB a 30 MB de RAM**, ideal para rodar em uma máquina pessoal ligada continuamente sem afetar o sistema.
- **Exposição para a Internet:** Conectado através de um túnel reverso com certificado TLS automático (**Tailscale Funnel** ou **Cloudflare Tunnel**), permitindo conexões diretas de qualquer dispositivo em redes 4G/5G (com CGNAT) ou Wi-Fi doméstico.
- **Protocolo Realtime:** _Server-Sent Events (SSE)_ nativo sobre HTTP com assinaturas por sala (`pb.collection('salas').subscribe(roomCode, ...)`).

### Privacidade e Efemeridade por Design

- **Usuários Anônimos:** Nenhum cadastro de conta, e-mail ou senha. Apenas identidades temporárias geradas para a sessão (`playerId`).
- **Resiliência e Tolerância a Quedas:** O `sessionStorage` do navegador memoriza o `playerId` e o estado local da sala. Se o jogador tiver oscilação no 4G ou recarregar a aba, ele reconecta à mesma sala sem perder sua vaga nem o placar.
- **Higienização Automática de Dados (Zero Bloat):** O banco de dados SQLite não retém histórico após o encerramento das partidas. Um hook agendado (`pb_hooks/cleanup.pb.js`) purga automaticamente salas e registros inativos há mais de 15 minutos, garantindo que o disco da máquina hospedeira não acumule lixo.

---

## 4. Estrutura Modular da Sketch

O código em [src/sketches/leveling-out/](./src/sketches/leveling-out/) foi desacoplado em módulos de responsabilidade única:

```text
src/sketches/leveling-out/
├── meta.json           <-- Metadados, tags de realtime e ordem das abas (filesOrder)
├── icons.js            <-- Definições Path2D compiladas de ícones vetoriais (Game Icons)
├── session.js          <-- Gerenciamento de sessão, identidade e reconexão (NetworkSession)
├── network-actions.js  <-- Endpoints REST, lances PPT e heartbeat (NetworkActions)
├── network.js          <-- Orquestrador de rede, assinaturas SSE e reconciliação (NetworkManager)
├── game.js             <-- Máquina de estados do jogo, regras e cálculo de pontos (GameEngine)
├── ui-components.js    <-- Cabeçalho, placar e tubo de ensaio (UIComponents)
├── ui-screens.js       <-- Telas de estados: espera, lances, revelação e vitória (UIScreens)
├── ui-overlays.js      <-- Overlays de sincronização e reconexão (UIOverlays)
├── ui.js               <-- Fachada coordenadora de renderização e hit-testing (UIRenderer)
└── sketch.js           <-- Ponto de entrada leve (< 100 linhas) de orquestração p5.js
```

---

## 5. Roadmap de Desenvolvimento

### Fase 1: Fundação & Prova de Conceito (Concluído)

- [x] Definição conceitual e validação do game loop via Pitch.
- [x] Implementação de slugs aninhados no SvelteKit (`/projeto/[slug]/[sala]`) compatíveis com SPA estática no GitHub Pages.
- [x] Atualização do runner do p5.js para suportar passagem de sala e bibliotecas de rede externas.
- [x] PoC de conectividade multiplayer funcional entre redes distintas (Wi-Fi vs 4G).
- [x] Minijogo sincronizado em tempo real de Pedra, Papel e Tesoura.
- [x] Camada de criptografia E2EE transparente via Web Crypto API.
- [x] Modularização completa do sketch p5.js (`crypto`, `network`, `game`, `ui`, `sketch`).
- [x] Definição arquitetural do backend: PocketBase com Tailscale/Tunnel.

### Fase 2: Integração com PocketBase & Infraestrutura

- [x] Instalar o binário do PocketBase na máquina servidora.
- [x] Criar as coleções efêmeras particionadas em migrações declarativas:
  - `salas`: `codigo`, `fase`, `rodada_atual`, `equipe_ativa`, `placar_a`, `placar_b`, `vencedor`.
  - `rodadas`: `sala_codigo`, `numero`, `equipe`, `fase_rodada`, `espectro_esquerda`, `espectro_direita`, `meta_oculta`, `dica`, `palpite`, `pontos`.
  - `jogadores`: `sala_codigo`, `player_id`, `nome`, `equipe`, `papel`, `last_seen`.
- [x] Criar script de higienização periódica em `pb_hooks/cleanup.pb.js` com `cronAdd` para apagar salas, jogadores e rodadas inativas em cascata.
- [x] Criar validações de integridade, sorteio de meta e cálculo de pontuação em `pb_hooks/game_rules.pb.js`.
- [x] Adaptar o `network.js` da sketch para consumir as assinaturas SSE e REST do PocketBase (`salas`, `jogadores`, `/api/ppt/lance`).
- [ ] Expor a porta do PocketBase via **Tailscale Funnel** ou **Cloudflare Tunnel**.

### Fase 3: Gameplay Completa do Leveling Out (A Fazer)

- [ ] **Renderização do Tubo de Ensaio:**
  - Animação do líquido graduado de 0% a 100% com menisco e borbulhas em p5.js.
  - Modo oculto: líquido visível apenas na tela do Codificador sorteado.
- [ ] **Sistemas de Reatividade Otimista (Look & Feel):**
  - Integrar padrões arquitetados (Optimistic UI, Heartbeat de Presença e tolerância a quedas) em todos os estágios do ciclo (ver `reactive_interactions_map.md`), garantindo feedback imediato e sem engasgos para os jogadores.
- [ ] **Cartas de Espectro Conceitual:**
  - Banco de tópicos polares (ex.: Famoso/Anônimo, Fácil/Difícil, Gostoso/Ruim, etc.).
  - Interface de escolha de carta pelo time vencedor do minijogo.
- [ ] **Sistema de Dicas & Input:**
  - Input interativo em tela para envio da pista textual pelo Codificador.
- [ ] **Slider Analógico Interativo:**
  - Marcador arrastável tátil (touch/mouse) com indicador de precisão no p5.js.
- [ ] **Algoritmo de Proximidade & Pontuação:**
  - Cálculo de faixas de acerto: Na mosca (+4 pts), Muito perto (+3 pts), Perto (+2 pts), Fora da margem (0 pts).
  - Revelação dramática do tubo e animação de preenchimento do placar.
- [ ] **Divisão de Equipes & Alternância de Papéis:**
  - Gerenciamento de 4+ jogadores em 2 equipes (Azul vs Vermelha).
  - Rotação automática de quem codifica e quem palpita a cada rodada.
- [ ] **Tela de Vitória & Métricas de Sintonia:**
  - Painel final com destaques da partida e atalhos para Revanche rápida.

---

## 6. Diretrizes Estritas de Front-end e Estilo Visual

É **expressamente proibido** incluir no front-end:

1. **Emojis**: Nenhuma utilização de emojis em títulos, botões, feedbacks, status ou canvas.
2. **Cards**: Não utilizar elementos genéricos com estilo de "card" a menos que haja um comando explícito no prompt para tal.
3. **Travessões (–, —) e suas variações**: Proibido o uso de travessões ou hífen como separador de títulos e textos de interface.
4. **Bullet Points e Indicadores Circulares**:
   - Proibido o uso de caracteres de ponto como "●", "○", "•", "▪", "✓".
   - Proibido o uso de elementos circulares decorativos (como classes `rounded-full` em spans de status ou pings de presença).

Qualquer exceção requer comando explícito e direto no prompt do usuário.

---

## 7. Diretriz Estrita de Runtime e Gerenciador de Pacotes (Bun Exclusivo)

Nesta máquina servidora e de desenvolvimento, o **Node.js** e o **npm** **NÃO estão instalados** no ambiente do sistema e é **expressamente proibido** tentar executar comandos `node`, `npm`, `npx` ou `pnpm`.

- O **único** runtime JavaScript/TypeScript e gerenciador de pacotes admitido neste repositório é o **Bun** (`bun`).
- Toda e qualquer operação de terminal executada por agentes autônomos ou desenvolvedores deve empregar estritamente a CLI do Bun:
  - Instalação de dependências: `bun install` / `bun add [-d] <pacote>`
  - Execução de scripts e build: `bun run dev`, `bun run build`, `bun run check`, `bun run test`
  - Execução de scripts avulsos: `bun <caminho_do_arquivo.js>`
