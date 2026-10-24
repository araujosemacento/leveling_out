---
name: update-agents-docs
description: >-
  Orienta a sincronização e atualização sistemática do arquivo AGENTS.md e da documentação modular em docs/agents/ após refatorações estruturais, alterações de arquitetura, adição de novos módulos ou conclusão de tarefas do roadmap. Use sempre após grandes alterações no código para manter o contexto dos agentes 100% alinhado com o estado real do repositório.
---

# Diretriz de Atualização Sistemática da Documentação dos Agentes

O arquivo [AGENTS.md](file:///home/melo/Documentos/GitHub/leveling_out/AGENTS.md) é a fonte canônica da verdade e o hub central de regras do repositório, injetado no contexto de sistema de todas as sessões de agentes autônomos. Para manter a densidade semântica alta e evitar truncamentos de contexto pelo LLM, a documentação adota o padrão **Hub & Spoke**:

1. **Hub Canônico Enxuto ([AGENTS.md](../../../AGENTS.md)):** Contém os conceitos centrais de cada tópico, mandamentos inegociáveis, proibições estritas, tabela de localização rápida, comandos da CLI e status do roadmap.
2. **Documentação Geral e Apresentação ([README.md](../../../README.md)):** Apresentação do jogo, integrantes e sumário de navegação com links diretos.
3. **Especificações Detalhadas ([docs/](../../../docs/)):** Contém o aprofundamento técnico e as entregas acadêmicas:
   - [docs/sgdd/sgdd.md](../../../docs/sgdd/sgdd.md): Short Game Design Document com texto corrido e listas de produção.
   - [docs/entidades/entidades.md](../../../docs/entidades/entidades.md): Especificação das 5 grandes entidades conceituais abrangentes.
   - [docs/componentes/componentes.md](../../../docs/componentes/componentes.md): Catálogo de componentes atômicos e matriz de associação.
   - [docs/diagramas/diagramas.md](../../../docs/diagramas/diagramas.md): Diagramas visuais em grid de entidades, componentes e fluxo distribuído.
   - [docs/agents/game-design.md](../../../docs/agents/game-design.md): Regras conceituais, 3 pilares e o game loop narrativo em 3 etapas.
   - [docs/agents/architecture.md](../../../docs/agents/architecture.md): Game loop distribuído (Input -> Update no servidor -> Sync e Render no cliente), Zero Trust e POO.
   - [docs/agents/style-guide.md](../../../docs/agents/style-guide.md): Sistema tipográfico, paletas completas Light/Dark com tokens hexadecimais e Tailwind v4.
4. **Submódulo Backend Go ([backend/](../../../backend/)):**
   - [backend/AGENTS.md](../../../backend/AGENTS.md): Guia canônico do backend, restrições arquiteturais Go, componentes atômicos e entidades de domínio.
   - [backend/CONTRACT.md](../../../backend/CONTRACT.md): Especificação formal de endpoints REST, rotas SSE em tempo real, payloads e códigos HTTP.
   - [backend/README.md](../../../backend/README.md): Guia de compilação, execução e variáveis de ambiente do servidor estendido PocketBase.

Esta skill detalha o protocolo obrigatório para auditar e manter o ecossistema documental 100% sincronizado com o código real.

---

## 1. Gatilhos Obrigatórios de Atualização

Você deve acionar o fluxo desta skill sempre que uma das seguintes situações ocorrer:

1. **Alteração na Estrutura de Arquivos:** Criação, remoção, renomeação ou realocação de pastas em `src/lib/`, `src/routes/` ou `backend/`.
2. **Conclusão de Tarefas do Roadmap:** Finalização de qualquer item listado na Seção 7 do roadmap.
3. **Novas Convenções Arquiteturais:** Introdução ou refatoração de controladores POO, máquinas de estado, seletores de render ou manipuladores de rede.
4. **Evolução do Sistema de Design:** Ajustes na paleta de cores (Light ou Dark), novos tokens CSS em `src/routes/layout.css` ou inclusão de novas famílias tipográficas.
5. **Decisões Técnicas de Game Loop:** Ajustes na ordem ou formato dos eventos de Input, Update ou Render.

---

## 2. Fluxo de Trabalho Passo a Passo

### Passo 1: Inspeção do Delta Real de Código

Antes de alterar a documentação, mapeie as modificações reais no repositório:

1. Execute `git status -s` para listar arquivos novos, modificados ou excluídos.
2. Inspecione as importações e exports reais dos novos arquivos para compreender suas responsabilidades.
3. Verifique se foram adicionadas novas dependências em `package.json` utilizando o Bun (`bun.lock`).

---

### Passo 2: Atualização do Hub Canônico (AGENTS.md)

No arquivo [AGENTS.md](../../../AGENTS.md), mantenha a concisão (~120 a 160 linhas) e atualize:

1. **Mandamentos Inegociáveis (Seção 1):** Reafirme o runtime Bun exclusivo, autoritarismo do servidor (Zero Trust) e proibições visuais.
2. **Resumo Conceitual e Links (Seções 2, 3 e 5):** Garanta que os resumos e os links relativos para `docs/agents/` permaneçam válidos e alinhados.
3. **Tabela de Localização Rápida (Seção 4 - CRÍTICO):**
   - Atualize caminhos de arquivos criados, movidos ou excluídos.
   - Assegure que cada linha descreva com precisão a responsabilidade principal do arquivo.
4. **Comandos da CLI (Seção 6):** Confirme a lista de comandos suportados com Bun (`bun run dev`, `bun test`, etc.).
5. **Roadmap de Desenvolvimento (Seção 7):**
   - Marque com `[x]` as tarefas concluídas.
   - Adicione novas tarefas com `[ ]` na fase correspondente se novos requisitos surgirem.

---

### Passo 3: Atualização das Especificações Modulares e Entregas (docs/)

Sincronize os arquivos correspondentes na pasta [docs/](../../../docs/):

1. **Se a mudança for de Game Design, SGDD ou Game Loop:**
   - Atualize [docs/sgdd/sgdd.md](../../../docs/sgdd/sgdd.md) e [docs/agents/game-design.md](../../../docs/agents/game-design.md) (regras conceituais, faixas de pontuação, dinâmica de turnos, canal do fluxo, PPT ou revanche).
2. **Se a mudança for de Arquitetura, Sistema Distribuído ou Segurança:**
   - Atualize [docs/agents/architecture.md](../../../docs/agents/architecture.md) (game loop distribuído, máquina de estados, reconciliação SSE, sanitização defensiva, blindagem de sigilo Zero Trust e PocketBase).
3. **Se a mudança for de Entidades ou Componentes:**
   - Atualize [docs/entidades/entidades.md](../../../docs/entidades/entidades.md) (grandes entidades abrangentes e seus papéis conceituais) e [docs/componentes/componentes.md](../../../docs/componentes/componentes.md) (catálogo de componentes atômicos e matriz de associação).
4. **Se a mudança for de Estilo, Tokens ou Componentes Visuais:**
   - Atualize [docs/agents/style-guide.md](../../../docs/agents/style-guide.md) (valores hexadecimais de cores, fontes, utilitários Tailwind ou convenção de ícones em botões).
5. **Se a mudança for no Backend Go, Endpoints ou Contratos de Rede:**
   - Atualize [backend/AGENTS.md](../../../backend/AGENTS.md), [backend/CONTRACT.md](../../../backend/CONTRACT.md) e [backend/README.md](../../../backend/README.md).
6. **Se a mudança impactar a Apresentação ou o Índice Geral do Repositório:**
   - Atualize [README.md](../../../README.md) (árvore de módulos, componentes e links do sumário).

---

### Passo 4: Sincronização em Cascata nas Regras Locais (.agents/rules/)

Se a alteração impactar diretamente as regras operacionais locais do agente, sincronize os arquivos satélites em [.agents/rules/](../../rules/):

1. [.agents/rules/leveling-out-architecture.md](../../rules/leveling-out-architecture.md): Se houve alteração na arquitetura do motor, game loop ou persistência do PocketBase.
2. [.agents/rules/frontend-style-guide.md](../../rules/frontend-style-guide.md): Se houve alteração em fontes, paleta ou tokens de estilo.

---

### Passo 5: Verificação de Conformidade e Orçamento de Contexto

Antes de salvar qualquer arquivo de documentação, certifique-se de cumprir todas as restrições:

1. **Zero Emojis:** Nenhum caractere emoji pode constar no documento.
2. **Zero Travessões como Separadores:** Não utilize travessões (`–`, `—`) nem hífens com espaços para separar títulos ou explicações. Use dois-pontos (`:`), barras (`/`), parênteses ou reformulação fluida da frase.
3. **Zero Bullets Circulares Decorativos:** Não utilize caracteres especiais como `●`, `○`, `•`, `▪`, `✓`. Para listas, use o hífen padrão do markdown `-` ou numeração `1.`, `2.`.
4. **Links Válidos:** Em `AGENTS.md`, utilize caminhos relativos para arquivos internos (ex.: `docs/agents/architecture.md`). Em referências no chat, utilize o esquema `file://`.
5. **Auditoria Automatizada de Orçamento de Contexto:** Execute `bun run check:context` para garantir que `AGENTS.md` não exceda 9.500 caracteres e que nenhum link esteja quebrado.

---

## 3. Checklist de Validação Final

Antes de encerrar a atualização da documentação:

- [ ] A validação `bun run check:context` foi executada e passou com sucesso ($\le$ 9.500 caracteres e 0 links quebrados)?
- [ ] O arquivo `AGENTS.md` permanece conciso e sem redundâncias prolixas (Hub enxuto $\le$ 2.5k tokens)?
- [ ] O arquivo `README.md` reflete a estrutura atualizada de componentes e módulos?
- [ ] Os documentos do backend (`backend/AGENTS.md`, `backend/CONTRACT.md`, `backend/README.md`) estão sincronizados se houve mudanças no servidor?
- [ ] Todos os links relativos de `AGENTS.md` para `docs/agents/` estão corretos e apontam para arquivos existentes?
- [ ] A tabela sintética de navegação na Seção 4 reflete fielmente os domínios atuais, apontando para `docs/agents/architecture.md` para catálogo exaustivo?
- [ ] As especificações aprofundadas em `docs/agents/` foram atualizadas com os novos detalhes técnicos?
- [ ] O roadmap detalhado em `docs/agents/roadmap.md` reflete exatamente as tarefas concluídas e pendentes?
- [ ] O documento não possui emojis, travessões como separador ou marcadores decorativos proibidos?
- [ ] Os comandos `bun run check` e `bun run lint` foram executados com sucesso?
- [ ] Os testes Go (`go test -v -race ./...`) e compilação (`go build`) foram validados no backend?
