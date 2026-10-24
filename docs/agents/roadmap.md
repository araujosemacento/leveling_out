# Roadmap de Desenvolvimento: Leveling Out

Este documento registra o histórico consolidado de entregas e os objetivos em andamento do projeto **Leveling Out**.

---

## Fase 1: Fundação, Migração e Especificações Acadêmicas (Concluída)

- [x] Definição conceitual e validação do game loop via Pitch.
- [x] Backend inicial configurado e testado.
- [x] PoC de conectividade multiplayer funcional entre redes distintas (Wi-Fi vs 4G).
- [x] Eliminar completamente o runner de p5.js, o iframe e códigos de portfólio.
- [x] Implementar sistema de tokens com as paletas Light e Dark e as 4 famílias tipográficas.
- [x] Implementar o motor desacoplado com arquitetura Input $\rightarrow$ Update $\rightarrow$ Render em TypeScript nativo.
- [x] Formalização do SGDD acadêmico, modelagem de Entidades abrangentes e catálogo de Componentes atômicos.

---

## Fase 2: Componentes Compostos e Core Loop (Concluída)

- [x] Implementar alternância dinâmica e manual entre os temas Light e Dark com transição suave de cores.
- [x] Criar o componente `TestTube.svelte` em SVG procedural com física de líquido, menisco senoidal contínuo e easter egg interativo de chacoalho.
- [x] Criar o componente `AnalogSlider.svelte` integrando a classe composível `SliderDragController`.
- [x] Implementar a máquina de estados desacoplada com as fases de Dica, Palpite e Revelação.
- [x] Implementar divisão tripartite de equipes no Lobby (Pato, Aleatório, Ganso), controle de quórum de 4 jogadores e início autoritativo pelo anfitrião.
- [x] Fluxo de ingresso autoritativo Zero Trust: tela inicial exclusiva por código de sala, diálogo bloqueante de apelido e validação com token de sessão.
- [x] Monitoramento de presença via protocolo WebSocket nativo e reconexão autoritativa.
- [x] Minijogo de Pedra, Papel e Tesoura com arbitragem concorrente e contagem regressiva determinística de 10s.
- [x] Moderação autoritativa no Lobby: expulsão de participante pelo anfitrião (kick de jogador) com revogação imediata de assento e notificação dedicada.
- [x] Overhaul da arquitetura: servidor Go nativo autônomo em memória (Actor Pattern com goroutine por sala) e WebSockets full-duplex de baixa latência, eliminando persistência relacional em disco.

---

## Fase 3: Polimento e Experiência de Jogo (Em Andamento)

- [x] Criar ícone animado procedural da identidade visual (substituindo o placeholder do favicon no Title Card pelo `TestTube`).
- [x] Suporte nativo a streaming contínuo do slider analógico em tempo real via WebSockets (30-60 Hz).
- [x] Eliminação completa dos arquivos legados em `static/` (`p5.min.js`, `p5.sound.min.js`, `pocketbase.umd.js`).
- [ ] Dinamizar a aceleração do menisco em função da pontuação acumulada das equipes (Canal do Fluxo / Modulador de Tensão: duração de 5.0s a 0.25s).
- [ ] Animação da Revelação Dramática com cálculo de sintonia e preenchimento de placar.
- [ ] Interface de Revanche imediata mantendo a sala e alternando posições.
- [ ] Otimizações táteis e feedback háptico (`navigator.vibrate`) em dispositivos móveis.
