# Leveling Out

> Party game multiplayer de dedução, empatia e sintonia social. Projeto acadêmico desenvolvido para a disciplina de Programação para Jogos.

---

## Integrantes da Equipe

- **Gabriel Melo** - 536093
- **Emilly Lima** - 540576

---

## Índice Central de Navegação do Repositório

Para garantir legibilidade e organização modular na entrega da disciplina, a estrutura do projeto é subdividida nos seguintes eixos:

### 1. Documentação Acadêmica de Game Design e Modelagem (docs/)

- [SGDD do Jogo (docs/sgdd/sgdd.md)](docs/sgdd/sgdd.md): Short Game Design Document estruturado na metodologia de Motta & Trigueiro (SBGames 2013), com texto corrido jogável mentalmente e listas de produção (Arte, Programação e Áudio).
- [Entidades do Jogo (docs/entidades/entidades.md)](docs/entidades/entidades.md): Especificação das 5 grandes entidades conceituais abrangentes (`Participante`, `Sessao`, `Artefato`, `Disputa` e `Placar`) e seus papéis no ciclo do jogo.
- [Entidades e seus Componentes (docs/componentes/componentes.md)](docs/componentes/componentes.md): Decomposição detalhada dos 19 componentes atômicos que modelam as capacidades de cada entidade, com matriz de associação e justificativas técnicas.
- [Diagramas de Arquitetura, Entidades e Componentes (docs/diagramas/diagramas.md)](docs/diagramas/diagramas.md): Modelagem visual em grid das 5 entidades conceituais, instanciações de domínio, associação dos 19 componentes atômicos e fluxo distribuído do motor.

### 2. Código do Jogo (src/ e backend/)

- [Front-end / Client Engine (src/)](src/): Interface do usuário em SvelteKit e motor cliente desacoplado em componentes atômicos/compostos (`src/lib/components/`). Responsável exclusivo pela captura de **Input** e pela apresentação de **Render**, além da reconciliação de estado determinística.
- [Back-end / Server Engine (backend/)](backend/): Motor autoritativo nativo em Go puro (`CGO_ENABLED=0`) operando sob o padrão de **Ator em Memória** (`internal/actor/room_actor.go`) e comunicação bidirecional de alta frequência via **WebSockets** (`internal/protocol/`). Responsável exclusivo pela fase de **Update** autoritária, regras de validação Zero Trust e resolução de confrontos via componentes atômicos.

### 3. Recursos Estáticos e Assets (`static/`)

> **Nota sobre a Pasta de Assets:** Por exigência e convenção técnica do framework **SvelteKit** e do bundler **Vite**, o diretório de recursos estáticos não-processados (imagens, favicons, sons e fontes) chama-se obrigatoriamente **`static/`** na raiz do projeto (correspondendo exatamente à pasta `assets/` sugerida nas diretrizes de entrega). Os arquivos aqui contidos são servidos de forma direta na raiz pública sem hashing ou recompilação.

- [Recursos Estáticos e Mídias (static/)](static/): Fontes tipográficas, ilustrações, favicons e sons do jogo.
- [Diretrizes de Estilo, Tipografia e Cores (docs/agents/style-guide.md)](docs/agents/style-guide.md): Especificação do sistema de design, paletas Light e Dark e taxonomia tipográfica.

---

## Arquitetura: Sistema Distribuído e Composição por Entidades

O desenvolvimento de _Leveling Out_ adota duas diretrizes arquiteturais essenciais:

### 1. O Game Loop como Sistema Distribuído (Zero Trust)

O ciclo de vida do jogo é desacoplado entre cliente e servidor sob a cadência canônica do Game Loop:

- **Input (Cliente / Front-end - `src/lib/engine/input/`):** Captura interações analógicas (arrasto contínuo do slider, toques, seleção de lances no PPT), sanitiza entradas contra injeção (`sanitize.ts`) e despacha comandos tipados via WebSocket unificado (`GameSocket`).
- **Update (Servidor / Back-end Go em Memória - `backend/`):** O servidor detém autoridade soberana e exclusiva sobre a integridade da partida. Cada sala opera como um `RoomActor` isolado em goroutine própria. Ele sorteia a `meta_oculta` de forma criptograficamente segura (Zero Trust), arbitra disputas de PPT e calcula pontuações oficiais por proximidade. Nenhuma pontuação é definida pelo cliente.
- **Sincronização / Reconciliação (Cliente - `src/lib/network/game-socket.ts` e `src/lib/engine/update/`):** A máquina de estados cliente (`state-machine.ts` / `GameEngine`) sincroniza o estado determinístico a partir dos envelopes `SYNC` e `SLIDER_STREAM` recebidos via WebSocket, sem decidir regras por conta própria.
- **Render (Cliente / Front-end - `src/lib/engine/render/` e `src/lib/components/`):** A interface em Svelte 5 atua como uma projeção pura do estado recebido ($UI = f(State)$ em `projections.ts`), projetando o tubo de ensaio procedural (`TestTube.svelte`), o modal de apelido (`NicknameModal.svelte`), a barra superior (`RoomHeader.svelte`), o banner de desconexão (`DisconnectionBanner.svelte`) e a grade tripartite (`LobbyArena.svelte`).

### 2. Onde Encontrar as Entidades e Componentes no Código

A tabela a seguir orienta a localização direta de cada entidade e componente atômico no repositório:

| Entidade Conceitual        | Instanciações de Domínio                              | Componentes Atômicos Associados                                                                                                         | Implementação no Backend (Go)                                                                                                                                                                                                                                                                                                                            | Implementação no Frontend (TS/Svelte)                                                                                                                                                                                                            |
| :------------------------- | :---------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`EntidadeParticipante`** | Jogador Individual, Equipe                            | `IdentidadeComponent`<br>`PresencaRedeComponent`<br>`PapelTurnoComponent`<br>`AcumuladorPontosComponent`                                | [`backend/internal/entities/participant.go`](backend/internal/entities/participant.go)<br>[`backend/internal/actor/client_conn.go`](backend/internal/actor/client_conn.go)                                                                                                                                                                               | [`src/lib/engine/input/sanitize.ts`](src/lib/engine/input/sanitize.ts)<br>[`src/lib/engine/render/projections.ts`](src/lib/engine/render/projections.ts)<br>[`src/lib/components/NicknameModal.svelte`](src/lib/components/NicknameModal.svelte) |
| **`EntidadeSessao`**       | SalaMatch (Lobby), RodadaAtiva                        | `CicloFasesComponent`<br>`ProgressaoRodadaComponent`<br>`ReconciliacaoRedeComponent`<br>`ModeracaoLobbyComponent`                       | [`backend/internal/entities/session.go`](backend/internal/entities/session.go)<br>[`backend/internal/actor/room_actor.go`](backend/internal/actor/room_actor.go)<br>[`backend/internal/hub/lobby_hub.go`](backend/internal/hub/lobby_hub.go)                                                                                                             | [`src/lib/engine/update/state-machine.ts`](src/lib/engine/update/state-machine.ts)<br>[`src/lib/network/game-socket.ts`](src/lib/network/game-socket.ts)<br>[`src/lib/components/LobbyArena.svelte`](src/lib/components/LobbyArena.svelte)       |
| **`EntidadeArtefato`**     | Tubo de Ensaio, Marcador Analógico, Carta de Espectro | `NivelLiquidoComponent`<br>`SigiloMetaComponent`<br>`ArrastoAnalogicoComponent`<br>`PolosSemanticosComponent`<br>`DicaTextualComponent` | [`backend/internal/components/secret_target.go`](backend/internal/components/secret_target.go)<br>[`backend/internal/components/spectrums.go`](backend/internal/components/spectrums.go)                                                                                                                                                                 | [`src/lib/components/TestTube.svelte`](src/lib/components/TestTube.svelte)<br>[`src/lib/engine/input/sanitize.ts`](src/lib/engine/input/sanitize.ts)<br>[`src/lib/network/game-socket.ts`](src/lib/network/game-socket.ts)                       |
| **`EntidadeDisputa`**      | Disputa PPT, Aferição de Proximidade                  | `LancePptComponent`<br>`ArbitroPptComponent`<br>`RegraProximidadeComponent`                                                             | [`backend/internal/entities/contest.go`](backend/internal/entities/contest.go)<br>[`backend/internal/components/ppt_arbiter.go`](backend/internal/components/ppt_arbiter.go)<br>[`backend/internal/components/proximity.go`](backend/internal/components/proximity.go)<br>[`backend/internal/actor/room_actor.go`](backend/internal/actor/room_actor.go) | [`src/lib/network/game-socket.ts`](src/lib/network/game-socket.ts)<br>[`src/lib/engine/update/score-rules.ts`](src/lib/engine/update/score-rules.ts)                                                                                             |
| **`EntidadePlacar`**       | Corrida de Pontos, Painel de Celebração               | `BarraProgressoComponent`<br>`ModuladorTensaoComponent`<br>`DisparadorRevancheComponent`                                                | [`backend/internal/entities/session.go`](backend/internal/entities/session.go)<br>[`backend/internal/actor/room_actor.go`](backend/internal/actor/room_actor.go)                                                                                                                                                                                         | [`src/lib/engine/render/projections.ts`](src/lib/engine/render/projections.ts)<br>[`src/lib/components/RoomHeader.svelte`](src/lib/components/RoomHeader.svelte)<br>[`src/routes/[sala]/+page.svelte`](src/routes/[sala]/+page.svelte)           |

> Para o detalhamento conceitual de cada componente e entidade, consulte [docs/entidades/entidades.md](docs/entidades/entidades.md) e [docs/componentes/componentes.md](docs/componentes/componentes.md).

---

## Execução e Desenvolvimento Local

Este projeto utiliza o runtime [**Bun**](https://bun.sh/) de forma exclusiva.

```bash
# Instalar dependências
bun install

# Iniciar o servidor de desenvolvimento do SvelteKit
bun run dev

# Executar a suíte de testes unitários automatizados (Headless)
bun test

# Verificar integridade de tipagem TypeScript
bun run check

# Validar conformidade de formatação e linter
bun run lint
```
