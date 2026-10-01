---
name: update-agents-docs
description: >-
  Orienta a sincronização e atualização sistemática do arquivo AGENTS.md e das regras
  associadas após refatorações estruturais, alterações de arquitetura, adição de novos
  módulos ou conclusão de tarefas do roadmap. Use sempre após grandes alterações no código
  para manter o contexto dos agentes 100% alinhado com o estado real do repositório.
---

# Diretriz de Atualização Sistemática do AGENTS.md

O arquivo [AGENTS.md](file:///home/melo/Documentos/GitHub/leveling_out/AGENTS.md) é a fonte canônica da verdade do repositório e é injetado como regra de sistema em todas as sessões de agentes autônomos. Qualquer discrepância entre este documento e o código real faz com que futuros agentes cometam erros de contexto, busquem arquivos inexistentes ou reintroduzam padrões já descontinuados.

Esta skill detalha o protocolo obrigatório para auditar e atualizar o [AGENTS.md](../../../AGENTS.md) após modificações estruturais ou extensas no projeto.

---

## 1. Gatilhos Obrigatórios de Atualização

Você deve acionar o fluxo desta skill sempre que uma das seguintes situações ocorrer:

1. **Alteração na Estrutura de Arquivos:** Criação, remoção, renomeação ou realocação de pastas em `src/lib/`, `src/routes/` ou `backend/`.
2. **Conclusão de Tarefas do Roadmap:** Finalização de qualquer item listado na Seção 7 do roadmap.
3. **Novas Convenções Arquiteturais:** Introdução ou refatoração de controladores POO, máquinas de estado ou manipuladores de rede.
4. **Evolução do Sistema de Design:** Ajustes na paleta de cores (Light ou Dark), novos tokens CSS em `src/routes/layout.css` ou inclusão de novas famílias tipográficas.
5. **Decisões Técnicas de Game Loop:** Ajustes na ordem de eventos de Input, Update ou Render.

---

## 2. Fluxo de Trabalho Passo a Passo

Ao preparar uma atualização no [AGENTS.md](../../../AGENTS.md), siga rigorosamente as quatro etapas abaixo:

### Passo 1: Inspeção do Delta Real de Código

Antes de alterar a documentação, investigue o que realmente mudou no repositório:

1. Execute `git status -s` para mapear arquivos novos, modificados ou excluídos.
2. Compare as importações e exports reais dos novos arquivos para entender suas responsabilidades.
3. Verifique se foram adicionadas novas dependências em `package.json` utilizando o Bun (`bun.lock`).

---

### Passo 2: Auditoria Seção a Seção do AGENTS.md

Percorra as 7 seções do [AGENTS.md](file:///home/melo/Documentos/GitHub/leveling_out/AGENTS.md) e aplique as correções necessárias:

#### Seção 1: Visão Geral do Jogo

- Confirme se os 3 pilares da gameplay e o objetivo central continuam alinhados com o foco exclusivo do jogo.

#### Seção 2: Game Loop Detalhado

- Inspecione se os 3 parágrafos narrativos continuam descrevendo com precisão o ciclo de Onboarding/PPT, Core Loop e Vitória/Revanche.

#### Seção 3: Arquitetura Técnica e Game Loop Canônico

- Garanta que a stack descrita corresponde à realidade (Svelte 5 Runes, CSS nativo, SVG procedural e PocketBase).
- Verifique se a cadência `Input -> Update -> Render` e os padrões de Composição (POO) estão devidamente explicados.

#### Seção 4: Estrutura Modular e Tabela de Localização Rápida (CRÍTICO)

- Atualize a árvore visual de diretórios (`src/lib/...`) para refletir a estrutura exata do disco.
- **Atualize a tabela "Síntese de Localização Rápida":**
  - Adicione novas linhas para novos controladores, componentes visuais ou serviços criados.
  - Atualize os caminhos caso arquivos tenham sido movidos.
  - Remova arquivos que foram descontinuados.

#### Seção 5: Diretrizes de Estilo e Identidade Visual

- Sincronize a taxonomia de fontes (Estilizadas: `Bagel Fat One`, `Capriola` / Utilitárias: `SN Pro`, `Mona Sans` / Monospace: `Fira Code`).
- Sincronize os valores hexadecimais dos tokens nos temas Light e Dark com o arquivo `src/routes/layout.css`.

#### Seção 6: Runtime Bun Exclusivo e Restrições Estritas

- Mantenha intacta a proibição do uso de Node.js, npm, npx e pnpm.
- Reafirme as proibições estritas de front-end (sem emojis, sem cards, sem travessões, sem bullets decorativos).

#### Seção 7: Roadmap de Desenvolvimento

- Marque com `[x]` as tarefas concluídas na sessão.
- Caso novos requisitos tenham surgido, adicione novas tarefas com `[ ]` na fase correspondente.

---

### Passo 3: Verificação de Conformidade com as Regras do Projeto

Antes de salvar qualquer alteração no [AGENTS.md](../../../AGENTS.md), revise o texto contra as restrições estritas:

1. **Zero Emojis:** Nenhum caractere emoji pode constar no documento.
2. **Zero Travessões como Separadores:** Não utilize travessões (`–`, `—`) nem hífens com espaços para separar títulos ou explicações. Use dois-pontos (`:`), barras (`/`), parênteses ou reformulação fluida da frase.
3. **Zero Bullets Circulares Decorativos:** Não utilize caracteres especiais como `●`, `○`, `•`, `▪`, `✓`. Para listas, use o hífen padrão do markdown `-` ou numeração `1.`, `2.`.
4. **Links Clicáveis:** Sempre referencie arquivos usando links markdown com esquema `file:///` apontando para o caminho absoluto no repositório.

---

### Passo 4: Sincronização em Cascata nos Arquivos Satélites

O [AGENTS.md](../../../AGENTS.md) é o documento mestre, mas existem arquivos de regras específicas em [.agents/rules/](../../rules/) que devem ser sincronizados caso a mudança afete suas áreas:

1. [.agents/rules/leveling-out-architecture.md](../../rules/leveling-out-architecture.md): Se houve alteração na arquitetura do motor, game loop ou persistência do PocketBase.
2. [.agents/rules/frontend-style-guide.md](../../rules/frontend-style-guide.md): Se houve alteração em fontes, paleta ou tokens de estilo.
3. [README.md](../../../README.md): Se houve alteração no escopo macro do projeto.

---

## 3. Checklist de Validação Final

Antes de encerrar a tarefa de atualização:

- [ ] A árvore de arquivos na Seção 4 bate exatamente com a estrutura de diretórios do repositório?
- [ ] A tabela de consulta rápida contém caminhos reais e links válidos?
- [ ] O roadmap na Seção 7 reflete fielmente o que está feito e o que falta fazer?
- [ ] O documento não possui emojis, travessões como separador ou marcadores decorativos proibidos?
- [ ] O comando `bun run check` e a formatação `bun run format` foram executados com sucesso?
