---
name: update-agents-docs
description: >-
  Orienta a sincronização e atualização sistemática do arquivo AGENTS.md e da documentação
  modular em docs/agents/ após refatorações estruturais, alterações de arquitetura, adição
  de novos módulos ou conclusão de tarefas do roadmap. Use sempre após grandes alterações no código
  para manter o contexto dos agentes 100% alinhado com o estado real do repositório.
---

# Diretriz de Atualização Sistemática da Documentação dos Agentes

O arquivo [AGENTS.md](file:///home/melo/Documentos/GitHub/leveling_out/AGENTS.md) é a fonte canônica da verdade e o hub central de regras do repositório, injetado no contexto de sistema de todas as sessões de agentes autônomos. Para manter a densidade semântica alta e evitar truncamentos de contexto pelo LLM, a documentação adota o padrão **Hub & Spoke**:

1. **Hub Canônico Enxuto ([AGENTS.md](../../../AGENTS.md)):** Contém os conceitos centrais de cada tópico, mandamentos inegociáveis, proibições estritas, tabela de localização rápida, comandos da CLI e status do roadmap.
2. **Especificações Detalhadas ([docs/agents/](../../../docs/agents/)):** Contém o aprofundamento técnico de cada domínio:
   - [docs/agents/game-design.md](../../../docs/agents/game-design.md): Regras conceituais, 3 pilares e o game loop narrativo em 3 etapas.
   - [docs/agents/architecture.md](../../../docs/agents/architecture.md): Game loop canônico (Input -> Update -> Render), segurança Zero Trust, composição POO e backend PocketBase.
   - [docs/agents/style-guide.md](../../../docs/agents/style-guide.md): Sistema tipográfico, paletas completas Light/Dark com tokens hexadecimais, Tailwind v4 e restrições visuais.

Esta skill detalha o protocolo obrigatório para auditar e manter o [AGENTS.md](../../../AGENTS.md) e a pasta `docs/agents/` 100% sincronizados com o código real.

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

### Passo 3: Atualização das Especificações Modulares (docs/agents/)

Sincronize os arquivos correspondentes na pasta [docs/agents/](../../../docs/agents/):

1. **Se a mudança for de Game Design ou Game Loop:**
   - Atualize [docs/agents/game-design.md](../../../docs/agents/game-design.md) (regras de pontuação aproximada, dinâmica de turnos, narrativa do PPT ou revanche).
2. **Se a mudança for de Arquitetura, Game Loop Canônico ou Segurança:**
   - Atualize [docs/agents/architecture.md](../../../docs/agents/architecture.md) (máquina de estados, sanitização defensiva, blindagem de sigilo, composição POO ou PocketBase).
3. **Se a mudança for de Estilo, Tokens ou Componentes Visuais:**
   - Atualize [docs/agents/style-guide.md](../../../docs/agents/style-guide.md) (valores hexadecimais de cores, fontes, utilitários Tailwind ou convenção de ícones em botões).

---

### Passo 4: Sincronização em Cascata nas Regras Locais (.agents/rules/)

Se a alteração impactar diretamente as regras operacionais locais do agente, sincronize os arquivos satélites em [.agents/rules/](../../rules/):

1. [.agents/rules/leveling-out-architecture.md](../../rules/leveling-out-architecture.md): Se houve alteração na arquitetura do motor, game loop ou persistência do PocketBase.
2. [.agents/rules/frontend-style-guide.md](../../rules/frontend-style-guide.md): Se houve alteração em fontes, paleta ou tokens de estilo.

---

### Passo 5: Verificação de Conformidade com as Regras de Redação

Antes de salvar qualquer arquivo de documentação, certifique-se de cumprir todas as restrições:

1. **Zero Emojis:** Nenhum caractere emoji pode constar no documento.
2. **Zero Travessões como Separadores:** Não utilize travessões (`–`, `—`) nem hífens com espaços para separar títulos ou explicações. Use dois-pontos (`:`), barras (`/`), parênteses ou reformulação fluida da frase.
3. **Zero Bullets Circulares Decorativos:** Não utilize caracteres especiais como `●`, `○`, `•`, `▪`, `✓`. Para listas, use o hífen padrão do markdown `-` ou numeração `1.`, `2.`.
4. **Links Válidos:** Em `AGENTS.md`, utilize caminhos relativos para arquivos internos (ex.: `docs/agents/architecture.md`). Em referências no chat, utilize o esquema `file:///`.

---

## 3. Checklist de Validação Final

Antes de encerrar a atualização da documentação:

- [ ] O arquivo `AGENTS.md` permanece conciso e sem redundâncias prolixas?
- [ ] Todos os links relativos de `AGENTS.md` para `docs/agents/` estão corretos e apontam para arquivos existentes?
- [ ] A tabela de localização rápida na Seção 4 reflete fielmente a árvore de diretórios atual?
- [ ] As especificações aprofundadas em `docs/agents/` foram atualizadas com os novos detalhes técnicos?
- [ ] O roadmap reflete exatamente as tarefas concluídas e pendentes?
- [ ] O documento não possui emojis, travessões como separador ou marcadores decorativos proibidos?
- [ ] Os comandos `bun run check` e `bun run lint` foram executados com sucesso?
