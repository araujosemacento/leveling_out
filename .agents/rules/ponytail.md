# Regra de Engenharia Ponytail (Pragmatismo & Simplicidade Máxima)

Esta regra adota os princípios do repositório [Ponytail](https://github.com/dietrichgebert/ponytail) adaptados ao projeto **Leveling Out**: o melhor código é aquele que não precisa ser escrito. Todo problema deve ser resolvido com o menor diff completo possível, eliminando complexidade acidental, abstrações prematuras (YAGNI) e dependências supérfluas.

---

## 1. A Escada da Menor Mudança Completa (The Ladder)

Antes de escrever qualquer linha nova de código ou introduzir abstrações, pare no primeiro degrau que solucionar a demanda:

1. **Precisa existir?** Ignore recursos, opções e flexibilidades não solicitados. Pedidos vagos recebem a menor versão que atende ao requisito central.
2. **Já existe no repositório?** Reaproveite funções utilitárias, componentes Svelte 5, tipos TypeScript ou estruturas Go já implementados.
3. **A plataforma nativa resolve?** Priorize APIs nativas do navegador e a biblioteca padrão do Go (`net/http`, `sync`, etc.). Um componente interno do projeto sempre supera uma biblioteca externa.
4. **Dependência já instalada resolve?** Use o que já está em `package.json` ou `go.mod`. É terminantemente proibido instalar novas bibliotecas para substituir poucas linhas de código.
5. **Pode ser expresso em uma linha clara?** Use uma linha direta e autoexplicativa.
6. **Caso contrário:** Escreva o menor código funcional possível.

---

## 2. Inviolabilidade: O que NUNCA Deve ser Cortado

Ser minimalista não significa ser negligente. Nunca remova ou simplifique:

- **Zero Trust:** Validações rigorosas em bordas de confiança (higienização defensiva no front-end em `input/sanitize.ts` e autoritarismo absoluto no servidor Go em `backend/`);
- **Tratamento de Erros:** Blocos que previnam perda de estado, panes silenciosas ou crashes do servidor;
- **Acessibilidade e Usabilidade:** Rótulos semânticos, atributos ARIA e suporte a teclado no front-end;
- **Mandamentos Inegociáveis do Repositório:** Runtime Bun exclusivo, ausência de emojis, ausência de cards genéricos decorativos e ausência de travessões como separadores.

---

## 3. Gestão Consciente de Débito Técnico (`shortcut:`)

Quando um atalho pragmático for deliberadamente adotado para evitar over-engineering imediato, documente a decisão em uma única linha no código fonte seguindo o padrão:

```typescript
// shortcut: <limite ou cenário suportado>, <gatilho para refatorar>
```

Exemplo:

```typescript
// shortcut: memória local suficiente para até 100 salas simultâneas, adicionar sharding se passar de 1.000
```

Esses apontamentos são consolidados periodicamente através da skill `/ponytail-debt`.

---

## 4. Testes e Autoverificação

- Código com lógica não-trivial (ramificações, laços, cálculos de pontuação, parsers ou segurança) deve sempre acompanhar pelo menos um teste enxuto que falhe se a lógica quebrar (`bun test` ou `go test ./...`).
- Alterações puramente triviais ou deleções de código morto dispensam testes adicionais.

---

## 5. Harnesses e Comandos Ponytail Disponíveis

O repositório possui as seguintes skills disponíveis para consulta e automação:

- `/ponytail [lite | full | ultra]`: Define a intensidade da postura pragmática nas respostas e propostas de código.
- `/ponytail-review`: Revisa o diff atual com mentalidade de sênior de plantão (foco em bugs reais, segurança, escala, testes faltantes e cortes lean).
- `/ponytail-audit`: Audita o repositório inteiro ranqueando o que deve ser corrigido ou removido primeiro.
- `/ponytail-debt`: Compila o inventário de comentários `shortcut:` em um relatório de débito técnico.
- `/ponytail-gain`: Exibe o placar de métricas de economia de tokens e código.
- `/ponytail-help`: Guia rápido de consulta dos comandos.
