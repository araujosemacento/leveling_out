---
name: git-commit-summary
description: >-
  Gera sumários e descrições estruturados de commits Git para um ou múltiplos repositórios
  no workspace. Use sempre que o usuário solicitar mensagens, sumários, descrições de commit,
  ou estiver preparando alterações para versionamento em repositórios únicos ou múltiplos.
---

# Git Commit Summary & Description Generator

Esta skill orienta o agente a inspecionar alterações pendentes no Git em qualquer workspace e gerar propostas padronizadas de **sumário** (título de commit) e **descrição detalhada** (corpo de commit), suportando repositórios únicos, múltiplos repositórios aninhados, submódulos e monorepos.

---

## 1. Fluxo de Trabalho Passo a Passo

Siga rigorosamente a seguinte sequência ao atender a pedidos de sumário e descrição de commits:

### Passo 1: Descoberta de Repositórios Git no Workspace

Identifique todos os repositórios Git presentes no diretório de trabalho atual ou em seus subdiretórios:

1. **Repositório Principal/Raiz:**
   Execute no diretório atual:
   ```bash
   git rev-parse --show-toplevel 2>/dev/null
   ```
2. **Repositórios Aninhados e Submódulos:**
   Procure pastas filhas contendo diretórios `.git` ou arquivos de ponte de submódulo:

   ```bash
   find . -maxdepth 3 -name ".git" -not -path "*/node_modules/*" -not -path "*/.venv/*"
   ```

   Também verifique se existe um arquivo `.gitmodules` na raiz.

3. Registre a lista de caminhos de repositórios que possuem trabalho ativo.

---

### Passo 2: Inspeção das Alterações em Cada Repositório

Para **cada** repositório identificado no Passo 1:

1. Obtenha a visão geral dos arquivos modificados, adicionados, renomeados ou deletados:
   ```bash
   git -C <caminho_do_repo> status -s
   ```
2. Inspecione o conteúdo das diferenças (tanto arquivos em _stage_ quanto fora dele):
   ```bash
   # Diferenças de arquivos já modificados/rastreados
   git -C <caminho_do_repo> diff HEAD

   # Para alterações já preparadas (staged)
   git -C <caminho_do_repo> diff --cached
   ```
3. Se houver arquivos novos não rastreados (`??`), examine brevemente seu propósito e estrutura através de comandos de leitura de arquivo ou busca.

Se um repositório estiver limpo (sem nenhuma alteração pendente), informe explicitamente que ele não possui modificações para commit.

---

### Passo 3: Análise e Agrupamento Semântico

Antes de redigir o commit, classifique a natureza das mudanças:

1. **Defina o Tipo de Commit (Conventional Commits):**
   - `feat`: Nova funcionalidade adicionada ao projeto.
   - `fix`: Correção de um bug, erro de runtime ou comportamento inesperado.
   - `refactor`: Refatoração interna de código que não altera o comportamento externo (ex.: desacoplamento, divisão de módulos, simplificação).
   - `perf`: Mudança focada em melhoria de desempenho ou consumo de memória.
   - `style`: Formatação, espaçamento, linting ou ajustes visuais sem alteração de lógica.
   - `test`: Adição, correção ou remoção de testes automatizados.
   - `docs`: Alterações exclusivas em documentações, guias ou READMEs.
   - `build`: Mudanças em dependências, configurações de empacotamento ou scripts de build.
   - `ci`: Alterações em pipelines de integração ou deploy contínuos.
   - `chore`: Tarefas rotineiras de manutenção ou limpeza de arquivos temporários.

2. **Identifique o Escopo:**
   - Especifique a camada, pacote, tela ou módulo afetado (ex.: `ui`, `api`, `auth`, `icons`, `session`, `config`).

3. **Verifique Atomicidade:**
   - Se o repositório contiver duas tarefas completamente não relacionadas, sugira ao usuário separar as mudanças em commits atômicos distintos.

---

### Passo 4: Estruturação da Resposta

Apresente as propostas separadas por repositório de forma limpa, direta e padronizada.

Para cada repositório com alterações, formate a saída com a seguinte estrutura:

#### Repositório: `<nome-ou-caminho-relativo>`

1. **Sumário:**
   - Uma única linha concisa (recomendado até 72 caracteres).
   - Emprega o padrão Conventional Commits: `<tipo>(<escopo>): <descrição>` ou `<tipo>: <descrição>`.
   - Escrito no tempo verbal imperativo (ex.: `fix(api): corrige sincronização de rodadas e adiciona purga de presença`).

2. **Descrição Detalhada:**
   - **Parágrafo Contextualizador:** Um parágrafo conciso explicando objetivamente o que foi feito e por que foi feito.
   - **Principais Alterações:** Logo abaixo do parágrafo, uma seção intitulada `Principais alterações:` contendo uma lista numerada detalhando as mudanças técnicas (módulos afetados, causas raízes sanadas e fluxos corrigidos).

3. **Comando Git Sugerido:**
   - Comando pronto para copiar e colar com o sumário no primeiro `-m` e o corpo completo (parágrafo + principais alterações) no segundo `-m`:
   ```bash
   git -C <caminho_do_repo> add <arquivos_ou_.>
   git -C <caminho_do_repo> commit -m "<tipo>(<escopo>): <sumario_curto>" -m "<Parágrafo conciso de contextualização.
   ```

Principais alterações:

1. <Primeira alteração técnica>
2. <Segunda alteração técnica>
3. <Terceira alteração técnica>"
   ```

   ```

---

## 2. Diretrizes Universais de Reusabilidade

Para manter esta skill 100% reutilizável em qualquer máquina ou projeto:

1. **Agnóstica de Projeto:**
   - Não mencione projetos, nomes de produtos, regras locais ou repositórios específicos nas regras de commit. As mensagens devem refletir estritamente as alterações de código observadas pelo `git status` e `git diff`.

2. **Correspondência de Idioma:**
   - Gere o sumário e a descrição no idioma em que o usuário formulou o pedido (se o usuário pediu em português, responda em português; se em inglês, em inglês).

3. **Clareza e Precisão Técnica:**
   - Evite mensagens genéricas como "ajustes gerais", "correções diversas" ou "update code".
   - Destaque causas raízes de correções e objetivos de refatorações estruturais.

4. **Respeito a Arquivos Temporários:**
   - Se detectar arquivos temporários, logs ou lixo que deveriam estar no `.gitignore`, avise o usuário antes de sugerir `git add .`.
