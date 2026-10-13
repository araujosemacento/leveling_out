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
- [Entidades e seus Componentes (docs/componentes/componentes.md)](docs/componentes/componentes.md): Decomposição detalhada dos 18 componentes atômicos que modelam as capacidades de cada entidade, com matriz de associação e justificativas técnicas.
- [Diagramas de Arquitetura, Entidades e Componentes (docs/diagramas/diagramas.md)](docs/diagramas/diagramas.md): Modelagem visual em grid das 5 entidades conceituais, instanciações de domínio, associação dos 18 componentes atômicos e fluxo distribuído do motor.

### 2. Código do Jogo (src/ e backend/)

- [Front-end / Client Engine (src/)](src/): Interface do usuário em SvelteKit e motor cliente. Responsável exclusivo pela captura de **Input** e pela apresentação de **Render**, além da reconciliação de estado.
- [Back-end / Server Engine (backend/)](backend/): Motor autoritativo autohospedado em PocketBase (SQLite + Goja, com migração planejada para Go puro). Responsável exclusivo pela fase de **Update** autoritária, regras de validação Zero Trust e resolução de confrontos via componentes atômicos.

### 3. Recursos Estáticos e Design (static/)

- [Recursos Estáticos Públicos (static/)](static/): Fontes tipográficas, ilustrações, favicons e sons do jogo, servidos nativamente pelo Vite e SvelteKit.
- [Diretrizes de Estilo e Cores (docs/agents/style-guide.md)](docs/agents/style-guide.md): Especificação do sistema de design, paletas Light e Dark e taxonomia tipográfica.

---

## Arquitetura: Sistema Distribuído e Composição por Entidades

O desenvolvimento de _Leveling Out_ adota duas diretrizes arquiteturais essenciais:

### 1. O Game Loop como Sistema Distribuído

O ciclo de vida do jogo é desacoplado entre cliente e servidor sob a cadência canônica do Game Loop:

- **Input (Cliente / Front-end):** Captura interações analógicas (arrasto do slider, toques, seleção de lances no PPT), sanitiza entradas contra injeção e emite intenções tipadas (`GameAction`) para a rede.
- **Update (Servidor / Back-end PocketBase):** O servidor detém a verdade autoritativa soberana. Ele sorteia as metas ocultas de forma segura (Zero Trust), arbitra disputas e calcula a pontuação por proximidade. Nenhuma pontuação é definida pelo cliente.
- **Sincronização / Reconciliação (Cliente):** A máquina de estados cliente (`GameEngine`) não toma decisões autônomas de regras; ela atua como ouvinte reativo de Server-Sent Events (SSE), atualizando a réplica local para sincronizar as mudanças decididas pelo servidor entre todos os jogadores.
- **Render (Cliente / Front-end):** A interface em Svelte 5 atua como uma função pura do estado recebido ($UI = f(State)$), projetando visualmente o tubo de ensaio, os marcadores e os placares.

### 2. Entidades Abrangentes e Componentes Atômicos

Inspirado na arquitetura de engines profissionais (como Godot e Unity):

- **Entidades Amplas:** Em vez de dezenas de classes isoladas, o domínio é estruturado em grandes entidades polimórficas que abrangem múltiplos papéis conceituais. A especialização ocorre na sua instanciação e na combinação de seus componentes.
- **Componentes Atômicos:** Cada componente possui escopo pontual e responsabilidade única. São os componentes atômicos que verdadeiramente modelam e conferem capacidades e comportamentos a uma entidade.

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
