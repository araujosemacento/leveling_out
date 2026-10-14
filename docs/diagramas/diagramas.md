# Diagramas de Arquitetura, Entidades e Componentes

Este documento consolida a modelagem visual do jogo **Leveling Out**, unificando as representações gráficas de entidades, instanciações de domínio, composição por componentes e o fluxo distribuído do motor.

Para as especificações textuais detalhadas de cada conceito, consulte:

- [Especificação de Entidades do Jogo](../entidades/entidades.md)
- [Catálogo de Componentes Atômicos](../componentes/componentes.md)
- [SGDD Consolidado do Jogo](../sgdd/sgdd.md)
- [Arquitetura Técnica do Motor](../agents/architecture.md)

---

## 1. Visão Arquitetural: Entidades Abrangentes e Componentes Atômicos

A modelagem de _Leveling Out_ adota o princípio de **Composição por Componentes**:

1. **Entidades Amplas e Polimórficas:** As 5 entidades conceituais cobrem todo o domínio da aplicação. Elas não contêm regras hardcoded de mecânicas; sua especialização emerge de sua instanciação e dos componentes acoplados.
2. **Componentes Atômicos:** Os 19 componentes são imperativamente atômicos e de propósito único, sendo os reais responsáveis por conferir capacidades e comportamentos a uma entidade.
3. **Distribuição em Grid:** Para otimizar a visualização em telas convencionais e evitar diagramas excessivamente horizontais, as representações são organizadas em um grid semântico de três camadas:
   - _Coordenação e Presença Social_ (Participante e Sessão)
   - _Mecânicas de Jogo e Interação_ (Artefato e Disputa)
   - _Resultados e Evolução_ (Placar)

---

## 2. Diagrama de Entidades e Instanciações de Domínio

O diagrama a seguir ilustra como as **5 Grandes Entidades Conceituais** se ramificam em papéis e instâncias concretas no ciclo de vida do jogo:

```mermaid
flowchart TB
    subgraph LinhaSocial ["Coordenação e Presença Social"]
        direction LR
        subgraph SubE1 ["EntidadeParticipante"]
            direction TB
            E1["<b>EntidadeParticipante</b><br><i>ParticipantEntity</i>"]
            P1["Jogador Individual"]
            P2["Equipe Coletiva"]
            E1 -->|Instanciação| P1
            E1 -->|Instanciação| P2
        end

        subgraph SubE2 ["EntidadeSessao"]
            direction TB
            E2["<b>EntidadeSessao</b><br><i>SessionEntity</i>"]
            S1["Sala Global da Partida"]
            S2["Rodada Ativa"]
            E2 -->|Instanciação| S1
            E2 -->|Instanciação| S2
        end
    end

    subgraph LinhaMecanica ["Artefatos e Mecânicas de Jogo"]
        direction LR
        subgraph SubE3 ["EntidadeArtefato"]
            direction TB
            E3["<b>EntidadeArtefato</b><br><i>ArtifactEntity</i>"]
            A1["Tubo de Ensaio"]
            A2["Marcador Analógico"]
            A3["Carta de Espectro"]
            E3 -->|Instanciação| A1
            E3 -->|Instanciação| A2
            E3 -->|Instanciação| A3
        end

        subgraph SubE4 ["EntidadeDisputa"]
            direction TB
            E4["<b>EntidadeDisputa</b><br><i>ContestEntity</i>"]
            D1["Minijogo PPT"]
            D2["Revelação de Proximidade"]
            E4 -->|Instanciação| D1
            E4 -->|Instanciação| D2
        end
    end

    subgraph LinhaResultados ["Progresso e Sintonia"]
        direction LR
        subgraph SubE5 ["EntidadePlacar"]
            direction TB
            E5["<b>EntidadePlacar</b><br><i>ScoreboardEntity</i>"]
            M1["Corrida de Pontuação"]
            M2["Métricas de Sintonia"]
            E5 -->|Instanciação| M1
            E5 -->|Instanciação| M2
        end
    end

    LinhaSocial ~~~ LinhaMecanica ~~~ LinhaResultados
```

---

## 3. Diagrama de Composição: Entidades $\times$ Componentes Atômicos

O diagrama abaixo detalha a associação direta entre cada entidade conceitual e os componentes atômicos que definem suas capacidades:

```mermaid
flowchart TB
    subgraph LinhaSocial ["Coordenação e Presença Social"]
        direction LR
        subgraph SubE1 ["EntidadeParticipante"]
            direction TB
            EP["<b>EntidadeParticipante</b>"]
            EP --- C_Id["IdentidadeComponent"]
            EP --- C_Pres["PresencaRedeComponent"]
            EP --- C_Papel["PapelTurnoComponent"]
            EP --- C_Pontos["AcumuladorPontosComponent"]
        end

        subgraph SubE2 ["EntidadeSessao"]
            direction TB
            ES["<b>EntidadeSessao</b>"]
            ES --- C_Ciclo["CicloFasesComponent"]
            ES --- C_Prog["ProgressaoRodadaComponent"]
            ES --- C_Reconc["ReconciliacaoRedeComponent"]
            ES --- C_Mod["ModeracaoLobbyComponent"]
        end
    end

    subgraph LinhaMecanica ["Artefatos e Mecânicas de Jogo"]
        direction LR
        subgraph SubE3 ["EntidadeArtefato"]
            direction TB
            EA["<b>EntidadeArtefato</b>"]
            EA --- C_Nivel["NivelLiquidoComponent"]
            EA --- C_Sigilo["SigiloMetaComponent"]
            EA --- C_Arrasto["ArrastoAnalogicoComponent"]
            EA --- C_Polos["PolosSemanticosComponent"]
            EA --- C_Dica["DicaTextualComponent"]
        end

        subgraph SubE4 ["EntidadeDisputa"]
            direction TB
            ED["<b>EntidadeDisputa</b>"]
            ED --- C_Lance["LancePptComponent"]
            ED --- C_Arbitro["ArbitroPptComponent"]
            ED --- C_Regra["RegraProximidadeComponent"]
        end
    end

    subgraph LinhaResultados ["Progresso e Sintonia"]
        direction LR
        subgraph SubE5 ["EntidadePlacar"]
            direction TB
            EPL["<b>EntidadePlacar</b>"]
            EPL --- C_Barra["BarraProgressoComponent"]
            EPL --- C_Tensao["ModuladorTensaoComponent"]
            EPL --- C_Revanche["DisparadorRevancheComponent"]
        end
    end

    LinhaSocial ~~~ LinhaMecanica ~~~ LinhaResultados
```

---

## 4. Diagrama de Sequência do Game Loop Distribuído

O diagrama a seguir detalha a cadência temporal do Game Loop de _Leveling Out_ em um sistema distribuído autoritativo em tempo real, demonstrando a interação cronológica entre o Jogador, o motor cliente (`GameEngine`) e o servidor PocketBase:

```mermaid
sequenceDiagram
    autonumber
    actor Player as Jogador (Cliente)
    participant ClientEngine as Client Engine (Input / Reconciliação / Render)
    participant ServerEngine as PocketBase Server (Update Autoritativo)

    Note over Player,ClientEngine: Fase 1: Input (Cliente)
    Player->>ClientEngine: Interação (Arrasto Slider / Digitação Dica / Lance PPT)
    ClientEngine->>ClientEngine: Sanitização Defensiva Local
    ClientEngine->>ServerEngine: Envio de Intenção Tipada (HTTP / REST)

    Note over ServerEngine: Fase 2: Update Autoritativo (Servidor)
    ServerEngine->>ServerEngine: Validação de Regras de Integridade (pb_hooks)
    ServerEngine->>ServerEngine: Sorteio de Segredos / Resolução de Confrontos / Cálculo de Proximidade
    ServerEngine->>ServerEngine: Persistência no SQLite
    ServerEngine-->>ClientEngine: Broadcast de Mudança de Estado (SSE / Realtime)

    Note over ClientEngine,Player: Fase 3: Sincronização & Render (Cliente)
    ClientEngine->>ClientEngine: Reconciliação da Máquina de Estados Local (gameReducer)
    ClientEngine->>Player: Projeção Visual Reativa UI = f(State) em Svelte 5
```

> Para a especificação detalhada da implementação de cada fase, controladores POO e regras de Zero Trust, consulte [Arquitetura Técnica do Motor](../agents/architecture.md).

---

## 5. Diagrama de Topologia de Fluxo no Sistema Distribuído

A operação dos módulos e subsistemas obedece à separação estrita de responsabilidades entre cliente e servidor:

```mermaid
flowchart LR
    subgraph Cliente_Input ["Front-end: Input"]
        direction TB
        I1["Gesto do Jogador / Teclado"]
        I2["Sanitização Defensiva (sanitize.ts)"]
        I3["Fábrica de Intenções (intent-factory.ts)"]
        I1 --> I2 --> I3
    end

    subgraph Servidor_Update ["Back-end PocketBase: Update"]
        direction TB
        U1["Recebe Ação via HTTP REST"]
        U2["Hooks Autoritários (game_rules.pb.js)"]
        U3["Cálculo de Margem & Sorteio Seguro"]
        U4["Gravação no Banco SQLite"]
        U1 --> U2 --> U3 --> U4
    end

    subgraph Cliente_SyncRender ["Front-end: Sync & Render"]
        direction TB
        S1["Assinatura SSE (PocketBase SDK)"]
        S2["Reducer Determinístico (state-machine.ts)"]
        S3["Projeções Puras (projections.ts)"]
        S4["Componentes Svelte 5 (UI reativa)"]
        S1 --> S2 --> S3 --> S4
    end

    I3 -->|Despacho HTTP POST| U1
    U4 -->|Difusão em Tempo Real via SSE| S1
```
