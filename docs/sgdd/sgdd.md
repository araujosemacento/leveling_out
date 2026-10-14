# Leveling Out

## Short Game Design Document

### Integrantes

- **Gabriel Melo** - 536093
- **Emilly Lima** - 540576

---

## 1. História

Num mundo saturado de opiniões divergentes, duas equipes rivais de amigos decidem colocar sua sintonia à prova em um laboratório de calibragem social. O desafio consiste em sintonizar seus achismos e decodificar a mente dos seus parceiros de equipe, alinhando conceitos subjetivos do cotidiano ao longo de uma escala percentual contínua de um tubo de ensaio. A equipe que alcançar primeiro a sintonia perfeita acumula a pontuação máxima e prova quem realmente tem a melhor telepatia social.

---

## 2. Jogo

> **Convenção de Cores do Documento:**
>
> - ![Arte](../assets/badges/arte.svg): Elementos visuais e de interface gráfica (Bege claro base).
> - ![Programação](../assets/badges/programação.svg): Ações do jogador, mecânicas e lógica do sistema (Roxo acento).
> - ![Áudio](../assets/badges/áudio.svg): Músicas de fundo e efeitos sonoros (Laranja primário).

Começa o jogo com a ![tela de carregamento](../assets/badges/tela_de_carregamento.svg) exibindo o ![logotipo do jogo](../assets/badges/logotipo_do_jogo.svg), em seguida a ![tela inicial](../assets/badges/tela_inicial.svg) ![música de lobby](../assets/badges/música_de_lobby.svg) com um ![campo para digitar](../assets/badges/campo_para_digitar.svg) o ![apelido](../assets/badges/apelido.svg) e um ![botão para entrar](../assets/badges/botão_para_entrar.svg) ![som: clique](../assets/badges/som_clique.svg). Ao ![confirmar a entrada](../assets/badges/confirmar_a_entrada.svg), o jogador é direcionado para o ![lobby da sala](../assets/badges/lobby_da_sala.svg), onde visualiza o ![código da sala](../assets/badges/código_da_sala.svg), um ![botão para copiar link](../assets/badges/botão_para_copiar_link.svg) ![som: confirmação de cópia](../assets/badges/som_confirmação_de_cópia.svg) e o ![painel de divisão de equipes](../assets/badges/painel_de_divisão_de_equipes.svg), onde os participantes ![escolhem seu time](../assets/badges/escolhem_seu_time.svg) entre a ![Equipe Corvo](../assets/badges/equipe_corvo.svg) e a ![Equipe Águia](../assets/badges/equipe_águia.svg) em ![tempo real](../assets/badges/tempo_real.svg).

Havendo participantes em ambos os lados, tem início a ![disputa de iniciativa](../assets/badges/disputa_de_iniciativa.svg) ![música de contagem rápida](../assets/badges/música_de_contagem_rápida.svg): cada equipe escolhe um representante para disputar um minijogo de Pedra, Papel e Tesoura através de ![três botões com ícones](../assets/badges/três_botões_com_ícones.svg) ![som: seleção de lance](../assets/badges/som_seleção_de_lance.svg). O jogo ![compara as escolhas](../assets/badges/compara_as_escolhas.svg): em caso de ![empate](../assets/badges/empate.svg), o confronto se ![repete na hora](../assets/badges/repete_na_hora.svg); em caso de ![vitória](../assets/badges/vitória.svg), a equipe vencedora ganha o direito de começar e ![escolhe a carta da rodada](../assets/badges/escolhe_a_carta_da_rodada.svg) ![fanfarra de vitória PPT](../assets/badges/fanfarra_de_vitória_ppt.svg).

A equipe vencedora vê a ![tela de escolha de espectro](../assets/badges/tela_de_escolha_de_espectro.svg) contendo uma ![carta de espectro](../assets/badges/carta_de_espectro.svg) com dois polos conceituais opostos (como "Anônimo" e "Famoso"). Definido o espectro, inicia-se a rodada ![música de tensão da rodada](../assets/badges/música_de_tensão_da_rodada.svg). O jogo ![sorteia secretamente uma porcentagem](../assets/badges/sorteia_secretamente_uma_porcentagem.svg) entre 5% e 95% e define quem da equipe será o Codificador e quem será o Palpiteiro.

Na tela exclusiva do Codificador surge um ![tubo de ensaio](../assets/badges/tubo_de_ensaio.svg) com ![líquido colorido preenchido](../assets/badges/líquido_colorido_preenchido.svg) até a altura secreta, com ![menisco e borbulhas animadas](../assets/badges/menisco_e_borbulhas_animadas.svg) ![som: líquido borbulhando](../assets/badges/som_líquido_borbulhando.svg) e um ![campo de texto](../assets/badges/campo_de_texto.svg). Para os outros jogadores, o conteúdo do tubo fica escondido com uma ![mensagem de espera](../assets/badges/mensagem_de_espera.svg). O Codificador avalia os dois extremos da carta, ![digita uma pista associativa](../assets/badges/digita_uma_pista_associativa.svg) (ex.: para 70% entre Anônimo e Famoso, digita "Keanu Reeves") e ![clica em enviar](../assets/badges/clica_em_enviar.svg) ![som: envio de dica](../assets/badges/som_envio_de_dica.svg).

A pista é exibida em um ![balão de fala](../assets/badges/balão_de_fala.svg) para todos. O Palpiteiro da equipe assume o controle e manipula um ![marcador analógico deslizante](../assets/badges/marcador_analógico_deslizante.svg), ![arrastando o marcador](../assets/badges/arrastando_o_marcador.svg) para calibrar seu palpite ![som: deslizamento mecânico](../assets/badges/som_deslizamento_mecânico.svg), sentindo o celular ![vibrar a cada marcação](../assets/badges/vibrar_a_cada_marcação.svg). Ao encontrar a posição estimada, o Palpiteiro ![clica no botão de confirmação](../assets/badges/clica_no_botão_de_confirmação.svg) ![som: trava de confirmação](../assets/badges/som_trava_de_confirmação.svg).

O jogo inicia a revelação dramática ![música de suspense em crescendo](../assets/badges/música_de_suspense_em_crescendo.svg): o ![tubo de ensaio abre na tela de todos](../assets/badges/tubo_de_ensaio_abre_na_tela_de_todos.svg), o ![líquido sobe até a marcação real](../assets/badges/líquido_sobe_até_a_marcação_real.svg) e uma ![linha de sobreposição do palpite](../assets/badges/linha_de_sobreposição_do_palpite.svg) indica o valor chutado. O jogo ![compara a distância entre palpite e meta](../assets/badges/compara_distância_palpite_e_meta.svg) e premia a equipe com ![emblemas visuais de pontuação](../assets/badges/emblemas_visuais_de_pontuação.svg):

- Se acertar "Na Mosca" (diferença de até 2%), ganham ![4 pontos](../assets/badges/4_pontos.svg) ![sino de celebração máxima](../assets/badges/sino_de_celebração_máxima.svg);
- Se ficar "Muito Perto" (diferença de até 6%), ganham ![3 pontos](../assets/badges/3_pontos.svg) ![som: acerto de média precisão](../assets/badges/som_acerto_de_média_precisão.svg);
- Se ficar "Perto" (diferença de até 12%), ganham ![2 pontos](../assets/badges/2_pontos.svg) ![som: acerto básico](../assets/badges/som_acerto_básico.svg);
- Se errar por mais de 12%, ganham ![0 pontos](../assets/badges/0_pontos.svg) ![som: erro abafado](../assets/badges/som_erro_abafado.svg) com o aviso ![Fora da Margem!](../assets/badges/fora_da_margem!.svg).

A pontuação ![aumenta no placar vertical](../assets/badges/aumenta_no_placar_vertical.svg) de cada equipe em uma corrida animada até a meta de 10 pontos. Se nenhuma equipe alcançou 10 pontos, o jogo ![alterna a posse de turno](../assets/badges/alterna_a_posse_de_turno.svg) e a outra equipe joga a próxima rodada.

Quando uma equipe ![alcança 10 pontos](../assets/badges/alcança_10_pontos.svg), a partida termina e abre a ![tela de vitória final](../assets/badges/tela_de_vitória_final.svg) consagrando os campeões ![música épica de vitória](../assets/badges/música_épica_de_vitória.svg), com o ![painel de métricas de sintonia](../assets/badges/painel_de_métricas_de_sintonia.svg) exibindo o maior acerto e a maior gafe da partida, além do ![botão de revanche](../assets/badges/botão_de_revanche.svg) ![som: clique de revanche](../assets/badges/som_clique_de_revanche.svg), que ![reinicia e recomeça a partida](../assets/badges/reinicia_e_recomeça_a_partida.svg) na mesma sala, e o ![botão para voltar ao início](../assets/badges/botão_para_voltar_ao_início.svg).

---

## 3. Listas de Produção (Backlog Derivado do Texto)

### ![Arte](../assets/badges/arte.svg) Arte

- [ ] Tela de Carregamento Inicial (Loading)
- [ ] Logotipo oficial do jogo em tipografia Bagel Fat One
- [ ] Tela de Entrada Principal (Title Card)
- [ ] Campo de entrada e rótulos de Apelido do Jogador
- [ ] Botão de Ação: Criar Sala / Entrar na Sala
- [ ] Tela de Lobby Multiplayer
- [ ] Identificador de Sala em fonte Fira Code
- [ ] Botão de Copiar Link de Convite com estado reativo de confirmação
- [ ] Painel Tripartite de Escolha de Equipes (Corvo, Aleatório em tons de cinza e Águia com watermarks dedicadas)
- [ ] Botão de Iniciar Partida exclusivo do anfitrião (verde com ícone à direita e quórum de 4 jogadores)
- [ ] Arena de Minijogo de Iniciativa (PPT)
- [ ] Três botões com ícones vetoriais de Pedra, Papel e Tesoura
- [ ] Tela de Escolha de Espectro
- [x] Tubo de Ensaio Procedural em SVG com graduação de 10% em 10% (TestTube.svelte)
- [x] Renderização de Líquido Procedural em SVG com dupla camada de menisco senoidal contínuo
- [ ] Animação vetorial contínua de micro-borbulhas de fluido
- [ ] Modulador de Tensão Visual: aceleração do menisco em função dos pontos da equipe (5.0s a 0.25s)
- [ ] Mensagem de Status de Ocultamento de Visão da Meta
- [ ] Campo de Entrada de Dica Contextualizada com contador de caracteres
- [ ] Balão de Fala de Exibição da Pista Enviada
- [ ] Marcador Analógico (Slider contínuo com trilha, escala e ponteiro deslizante)
- [ ] Linha visual de sobreposição de Palpite no tubo com cota percentual
- [ ] Emblemas visuais de pontuação: "Na Mosca!", "Muito Perto!", "Perto" e "Fora da Margem!"
- [ ] Placar de Corrida Vertical das Equipes com ícones de avanço
- [ ] Tela de Vitória Final com consagração da equipe campeã
- [ ] Painel de Métricas de Sintonia (melhor acerto e maior gafe da partida)
- [ ] Botão: Revanche Imediata
- [ ] Botão: Retornar ao Lobby Principal

### ![Programação](../assets/badges/programação.svg) Programação

- [ ] Inicialização do cliente SvelteKit e verificação de saúde do backend PocketBase
- [ ] Sanitização defensiva de apelidos de jogador contra injeção de tags HTML (máximo 20 caracteres)
- [ ] Geração dinâmica de slug de sala na URL (`/[sala]`) e inserção no banco de dados SQLite
- [ ] Cópia para a área de transferência (`navigator.clipboard.writeText`) com feedback visual temporário
- [ ] Sincronização de presença de jogadores em tempo real via Server-Sent Events (SSE)
- [ ] Controle autoritativo de quórum (máx 4 jogadores por sala e máx 2 por equipe), sorteio estocástico de aleatórios e início pelo host
- [ ] Envio de intenções tipadas (`GameAction`) via REST para o backend
- [ ] Rota autoritativa POST `/api/ppt/lance` e arbitragem em memória thread-safe (`$app.store()`)
- [ ] Resolução de confronto de PPT com desempate e reemissão automática
- [ ] Sorteio estocástico de cartas bipolares a partir do catálogo temático
- [ ] Criação autoritativa de rodadas e sorteio da meta percentual secreta no intervalo [5%, 95%]
- [ ] Blindagem de sigilo Zero Trust da meta oculta (ocultação inviolável antes da revelação oficial)
- [ ] Sanitização defensiva de pistas textuais (remoção de HTML e truncamento em 60 caracteres)
- [ ] Transição autoritativa de fase de Dica para Palpite no backend (`game_rules.pb.js`)
- [ ] Controlador de física e arrasto analógico (`SliderDragController`) com clamp matemático em [0, 100]
- [ ] Acionamento de feedback háptico por vibração móvel (`navigator.vibrate`) a cada dezena percorrida
- [ ] Submissão do palpite e transmissão via SSE da fase de revelação para todos os clientes
- [x] Integração temporal contínua da fase do menisco (requestAnimationFrame) e física aditiva de agitação no lobby
- [ ] Dinamização da velocidade da onda do menisco em função do placar da equipe (5.0s a 0.25s)
- [ ] Animação vetorial SVG do menisco subindo até o valor real do líquido
- [ ] Algoritmo autoritativo de acerto aproximado por faixas de tolerância (|meta - palpite|: <=2%, <=6%, <=12%, >12%)
- [ ] Atualização autoritativa em cascata dos placares na coleção `salas`
- [ ] Interpolação numérica suave do placar via Svelte Runes / tweened
- [ ] Alternância de posse de turno (_momentum_) e avanço do número da rodada
- [ ] Verificação de condição de vitória ao atingir a meta de 10 pontos
- [ ] Disparo de ação de Revanche (`REMATCH_INTENT`) com reset dos placares e reinício no PPT
- [ ] Hook de higienização periódica (`cleanup.pb.js`) apagando salas inativas há mais de 15 minutos

### ![Áudio](../assets/badges/áudio.svg) Áudio

- [ ] Música ambiente de lobby e espera
- [ ] Música de contagem regressiva rápida da disputa de PPT
- [ ] Música de concentração e tensão da rodada ativa
- [ ] Música de suspense com crescendo dramático para a revelação do tubo
- [ ] Música épica de vitória da partida
- [ ] Efeito sonoro (SFX): clique de botão e interações gerais
- [ ] Efeito sonoro (SFX): confirmação de cópia de link da sala
- [ ] Efeito sonoro (SFX): seleção de lance de Pedra, Papel e Tesoura
- [ ] Efeito sonoro (SFX): fanfarra de vitória na disputa de PPT
- [ ] Efeito sonoro (SFX): líquido borbulhando dentro do tubo de ensaio
- [ ] Efeito sonoro (SFX): envio confirmado da dica conceitual
- [ ] Efeito sonoro (SFX): ruído mecânico de deslizamento contínuo do slider
- [ ] Efeito sonoro (SFX): trava de confirmação do palpite analógico
- [ ] Efeito sonoro (SFX): revelação dramática com acerto "Na Mosca!" (+4 pontos com sino)
- [ ] Efeito sonoro (SFX): revelação com acerto de média precisão (+3 pontos)
- [ ] Efeito sonoro (SFX): revelação com acerto básico (+2 pontos)
- [ ] Efeito sonoro (SFX): revelação com erro fora da margem (0 pontos e som abafado)
- [ ] Efeito sonoro (SFX): clique de ativação de revanche imediata
