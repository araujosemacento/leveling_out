# Game Design e Game Loop: Leveling Out

Este documento detalha as regras de design, a dinâmica social, os pilares mecânicos e o fluxo narrativo do jogo **Leveling Out**, consolidando as diretrizes do pitch e do SGDD acadêmico.

---

## 1. Visão Geral do Jogo

**Leveling Out** é um _party game_ multiplayer focado em dedução, sintonia e empatia social. Os jogadores competem divididos em duas equipes tentando calibrar conceitos subjetivos do cotidiano ao longo de uma escala percentual contínua (0% a 100%).

### O Desafio Central

- **Codificar:** O integrante sorteado da equipe ativa (Codificador) recebe uma meta percentual secreta exibida dentro de um tubo de ensaio (ex.: 70%) e deve traduzir esse valor quantitativo em uma pista associativa qualitativa a partir de uma carta de espectro bipolar (ex.: polo "Anônimo" e polo "Famoso" $\rightarrow$ dica: _"Keanu Reeves"_).
- **Decodificar:** O parceiro de equipe (Palpiteiro) lê a dica na tela e tenta sintonizar com o raciocínio do colega, posicionando um marcador analógico (_slider_) no ponto exato em que estima estar o nível do líquido.

### Os 3 Pilares da Gameplay

1. **Nível Oculto:** O preenchimento estocástico de um tubo de ensaio com volume percentual visível unicamente para o Codificador da rodada, blindado no backend por sigilo absoluto de rede.
2. **Gerar Pistas:** Sistema associativo de comunicação livre onde a pontuação depende exclusivamente do alinhamento cultural e empático entre os jogadores da equipe.
3. **Acerto Aproximado:** Algoritmo que calcula a distância absoluta entre o palpite e a meta real, recompensando a precisão com pontuações graduadas por tolerância de erro.

---

## 2. Game Loop Narrativo Detalhado

O fluxo de jogo divide-se em três etapas bem definidas:

### Etapa 1: Onboarding, Divisão de Equipes e Disputa de Iniciativa

O fluxo tem início quando os participantes acessam a plataforma em seus dispositivos móveis ou computadores via URL única (`/[sala]`), reunindo-se no lobby da sala. O lobby apresenta uma divisão tripartite horizontal de equipes: à esquerda a **Equipe Pato (Equipe A)** com o ícone vetorial da ave em tema índigo; ao centro a caixa neutra de **Seleção Aleatória** em tons de cinza com ícone vetorial de dados; à direita a **Equipe Ganso (Equipe B)** com o ícone do ganso em tema âmbar. Os jogadores clicam em qualquer caixa para solicitar sua alocação, respeitando o quórum rigoroso da sala: máximo de 4 participantes no total e lotação de até 2 integrantes por equipe definida. A caixa central comporta qualquer quantidade de indecisos.

O primeiro jogador a ingressar na sala é designado autoritativamente pelo servidor como **Anfitrião da Sala (`is_host`)**. Durante a permanência no lobby, o anfitrião possui a prerrogativa soberana de moderação para remover participantes da sala (kick de jogador), garantindo a expurgação de jogadores inativos, intrusos ou inadequados e liberando imediatamente as vagas ocupadas para novos participantes. Uma vez preenchidas todas as 4 vagas da sala (independentemente de estarem em Pato, Ganso ou Aleatório), o anfitrião tem acesso exclusivo ao botão verde "Iniciar Partida" com ícone posicionado à direita. Ao ser acionado, o servidor Go nativo processa estocasticamente o balanceamento dos jogadores indecisos até que ambas as equipes contem com 2 integrantes cada, transicionando a partida para o minijogo digital de **Pedra, Papel e Tesoura (PPT)**. A equipe vencedora do PPT ganha a iniciativa e escolhe a carta temática da primeira rodada (ex.: "Fácil / Difícil").

### Etapa 2: O Core Loop da Rodada (Espectro, Dica, Palpite e Revelação)

O ciclo de cada rodada é composto por quatro momentos sequenciais estritos:

1. **Escolha de Espectro e Votação Cooperativa (30s):** O servidor Go sorteia duas cartas do baralho canônico de 150 espectros. A escolha é transmitida publicamente para todos os 4 participantes da sala. O Líder da equipe ativa possui a autoridade soberana de confirmação, contando com uma janela autoritativa de **30 segundos** antes do sorteio automático por timeout. Durante essa janela, o parceiro da equipe pode votar na carta de sua preferência clicando sobre ela, acionando o indicador de mão levantada (posicionado lateralmente em modo paisagem ou acima/abaixo em modo retrato).
2. **Definição de Nível e Dica:** Escolhido o espectro, o servidor Go gera secretamente a meta oculta (5% a 95%). O Codificador da vez visualiza o tubo cheio em sua tela e digita uma pista associativa (máximo de 60 caracteres).
3. **Palpite Analógico:** O Palpiteiro recebe a dica e arrasta o marcador analógico até onde estima estar o menisco do líquido.
4. **Revelação Dramática e Pontuação:** O tubo e a linha do palpite são revelados simultaneamente para todos os jogadores, e o algoritmo de proximidade computa a pontuação obtida (+4, +3, +2 ou 0 pontos).

### Regra Canônica de Alternância Compulsória de Cargos e Liderança

A dinâmica cooperativa de Leveling Out exige distribuição equitativa de protagonismo e tomada de decisão:

1. **Primeira Rodada da Equipe (Iniciativa / Rodada 1):**
   - O primeiro integrante a entrar na equipe durante o lobby atua como líder da equipe no minijogo de PPT e, caso a equipe vença, na primeira escolha de espectro.
   - Os cargos de **Codificador** e **Palpiteiro** dentro da equipe ativa são **sorteados aleatoriamente** pelo servidor Go na primeira rodada.
2. **Rodadas Subsequentes (Revezamento Compulsório):**
   - A cada nova posse de turno da equipe, **todos os privilégios operacionais alternam obrigatoriamente** para o outro integrante:
     - Quem codificou na rodada anterior assume compulsoriamente a função de Palpiteiro na rodada seguinte, e vice-versa.
     - A incumbência de Líder (quem decide a carta de espectro) transfere-se compulsoriamente para o integrante que não liderou a escolha anterior.
   - É proibido a um jogador repetir a liderança ou o papel de codificador em rodadas consecutivas de sua própria equipe.

### Etapa 3: Progressão, Corrida e Conclusão com Revanche

A partida se desenvolve em turnos alternados entre as duas equipes em uma corrida vertical rumo à meta de 10 pontos. A equipe que atinge a pontuação máxima é consagrada campeã, disparando a tela de vitória com o painel de métricas de sintonia e o botão de Revanche imediata, que zera os placares e reinicia a partida sem desfazer a sala.

---

## 3. Sistema de Pontuação e Faixas de Proximidade

A pontuação de cada rodada é computada autoritativamente pelo servidor Go nativo calculando a diferença absoluta $\Delta = |\text{meta} - \text{palpite}|$:

| Faixa de Tolerância | Margem de Erro ($\Delta$) | Pontuação     | Classificação da Jogada            |
| :------------------ | :------------------------ | :------------ | :--------------------------------- |
| **Faixa 1**         | $\Delta \le 2\%$          | **+4 pontos** | Na Mosca (Calibração Exata)        |
| **Faixa 2**         | $3\% \le \Delta \le 6\%$  | **+3 pontos** | Muito Perto (Sintonia Alta)        |
| **Faixa 3**         | $7\% \le \Delta \le 12\%$ | **+2 pontos** | Perto (Aproximação Razoável)       |
| **Faixa 4**         | $\Delta > 12\%$           | **0 pontos**  | Fora da Margem (Erro / Desconexão) |

---

## 4. O Peso da Falha e o Canal do Fluxo

- **O Peso da Falha (Momentum):** O erro ($\Delta > 12\%$) não subtrai pontos conquistados, mas custa o tempo da rodada: a equipe pontua zero e entrega a iniciativa para o adversário, elevando a tensão da disputa.
- **Canal do Fluxo (Desafio vs Habilidade):** O placar do oponente atua como uma curva dinâmica de dificuldade. O avanço do adversário eleva a ansiedade e a concentração; erros do rival trazem alívio e empurram os jogadores de volta ao centro do canal de engajamento ótimo.
- **Modulador de Tensão Visual (Aceleração do Menisco):** À medida que as equipes acumulam pontos rumo à vitória, o período do loop da animação senoidal do menisco no tubo de ensaio acelera de forma inversamente proporcional à pontuação (variando de 5.0s em 0 pontos até 0.25s na meta de vitória), funcionando como um termômetro visual e rítmico da proximidade do desfecho.
- **Interação Lúdica no Lobby (Easter Egg de Agitação e Ciclo de Cores):** No lobby inicial, o tubo de ensaio apresenta rotação contínua e infinita de matiz (Hue shift) sincronizada à frequência da onda senoidal e permite interação direta via cursor/toque (clicar e arrastar). Cada movimento injeta energia cinética aditiva no fluido, acelerando simultaneamente a ondulação do menisco e a transição cromática até o limite de 0.25s, seguido de desaceleração suave por decaimento exponencial viscoso.
