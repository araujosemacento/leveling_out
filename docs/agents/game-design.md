# Game Design e Game Loop: Leveling Out

Este documento detalha as regras de design, a dinâmica social e o fluxo conceitual narrativo do jogo **Leveling Out**.

---

## 1. Visão Geral do Jogo

**Leveling Out** é um _party game_ multiplayer focado em dedução, sintonia e empatia social. Os jogadores competem em duas equipes tentando calibrar conceitos subjetivos ao longo de uma escala percentual contínua (0% a 100%).

### O Desafio Central

- **Codificar:** O membro sorteado da equipe (Codificador) recebe uma meta percentual secreta exibida dentro de um tubo de ensaio (ex.: 70%) e deve traduzir esse valor em uma pista conceitual compreensível a partir de um espectro bipolar sorteado (ex.: "Famoso / Anônimo" $\rightarrow$ dica: _"Keanu Reeves"_).
- **Decodificar:** O parceiro de equipe (Palpiteiro) ouve a dica e tenta ler a mente do colega, posicionando um marcador analógico (_slider_) no ponto que acredita representar o nível real estipulado pelo jogo.

### Os 3 Pilares da Gameplay

1. **Nível Oculto:** O preenchimento aleatório de um tubo de ensaio com volume visível unicamente para o Codificador da rodada.
2. **Gerar Pistas:** Sistema associativo em que a pontuação depende do alinhamento cultural e social entre os jogadores de uma equipe.
3. **Acerto Aproximado:** Algoritmo que calcula a distância entre o palpite e o valor real, recompensando precisão com pontos graduados (+4, +3, +2 ou 0).

---

## 2. Game Loop Narrativo Detalhado

O ciclo de jogo divide-se em três etapas bem definidas:

### Etapa 1: Onboarding, Sala e Decisão de Turno

O fluxo tem início quando o usuário acessa a plataforma em seu dispositivo e cria ou ingressa em uma sala via slug na URL (`/[sala]`), reunindo os participantes em um lobby compartilhado onde são divididos em duas equipes. Para definir quem começa a partida de forma rápida e divertida, o sistema engatilha um minijogo digital de pedra, papel e tesoura entre representantes de cada time; a equipe vencedora ganha o direito de iniciar a partida e escolhe a carta temática da primeira rodada, delimitando o espectro bipolar conceitual (ex.: "Famoso / Anônimo" ou "Fácil / Difícil"). Com os parâmetros estabelecidos e os papéis atribuídos, a rodada é sincronizada em tempo real em todas as telas conectadas.

### Etapa 2: O Core Loop da Rodada (Dica, Palpite e Revelação)

Na fase ativa, o sistema sorteia aleatoriamente um membro da equipe da vez para atuar como Codificador e preenche exclusivamente em sua tela um tubo de ensaio com nível percentual oculto (como 70%), invisível aos demais jogadores. Esse integrante analisa a carta de espectro e digita uma pista associativa contextualizada (ex.: "Keanu Reeves"), enviando-a ao seu parceiro de equipe; cabe ao Palpiteiro decodificar o raciocínio do colega e deslizar o marcador analógico até onde estima estar o líquido no tubo. Finalizado o palpite, ocorre a revelação simultânea para todos os participantes: um algoritmo calcula a margem de erro por proximidade, convertendo exatidão em pontuação no placar, ao passo que erros grosseiros resultam em zero pontos e transferem o _momentum_ competitivo diretamente para o início do turno da equipe adversária.

### Etapa 3: Progressão, Ritmo de Corrida e Conclusão com Revanche

A partida se desenvolve em turnos estritamente alternados entre as duas equipes, estruturando uma corrida dinâmica rumo à pontuação-alvo predeterminada, em que cada acerto ou erro do rival atua como regulador de tensão e alívio no canal de fluxo dos competidores. O desfecho da disputa é alcançado no instante em que uma das equipes atinge a pontuação máxima, disparando a tela de vitória que consagra os campeões e exibe um painel de "Métricas de Sintonia", destacando os palpites milimetricamente certeiros e as gafes conceituais mais cômicas da partida. Essa interface final disponibiliza ações imediatas para iniciar uma Revanche mantendo as mesmas composições ou retornar ao lobby principal, fechando o ciclo e estimulando a rejogabilidade.
