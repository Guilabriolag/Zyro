# PROTOCOL.md — Contrato mínimo de rede (G0)

Este documento define **apenas a forma dos dados** trocados entre cliente e
servidor para o movimento se tornar propriedade da simulação autoritativa,
em vez de mensagem de posição.

Não define: `Simulation.js`, `Prediction.js`, `WorldRules.js` ou `Relation`.
Esses arquivos consomem este contrato — não o contrário. Este é o contrato
mínimo, não a arquitetura definitiva.

---

## Princípio

```
CLIENTE                          SERVIDOR
  │                                 │
  │  Intent (seq)                  │
  ├────────────────────────────────▶
  │                                 │  Simulation + WorldRules
  │                                 │  → AuthoritativeState (tick)
  │                                 │
  │  Snapshot (tick, ack)          │
  ◀────────────────────────────────┤
  │                                 │
```

O cliente nunca envia posição. O servidor nunca envia "sua intenção foi
recusada" — ele simplesmente não avança o estado se a intenção for
inválida (fora de ordem, sem sala, etc.), e o snapshot seguinte reflete
a verdade.

---

## Identificadores

| Campo     | Dono      | Papel                                                                 |
|-----------|-----------|------------------------------------------------------------------------|
| `roomId`  | sala      | identifica a instância (Durable Object / GameRoom)                    |
| `roundId` | servidor  | incrementa a cada nova partida dentro da mesma sala                   |
| `seq`     | cliente   | monotônico por cliente; ordena e confirma Intents (nunca ordena tempo)|
| `tick`    | servidor  | monotônico por sala; identifica a evolução temporal do estado (nunca ordena Intent) |

Regra de ouro: **`seq` pertence ao cliente e fala sobre intenção. `tick`
pertence ao servidor e fala sobre estado.** Os dois nunca se substituem.

---

## Intent (cliente → servidor)

```jsonc
{
  "type": "intent",
  "roomId": "ZERO-7K4P",
  "roundId": 12,
  "seq": 1842,
  "movement": {
    "direction": { "x": 0.72, "z": -0.31 }, // vetor normalizado
    "magnitude": 1.0                          // 0.0–1.0, separado da direção
  }
}
```

- `direction` e `magnitude` são campos separados desde já — mesmo que hoje
  o joystick sempre entregue `magnitude = 1.0`, isso deixa o contrato
  pronto para andar/correr/stamina sem quebrar o formato depois.
- `seq` é estritamente crescente por cliente durante um mesmo `roundId`.
  Reinicia (ou é ignorado) quando `roundId` muda.
- Não existe `tick` no Intent. O cliente não declara "em que momento do
  servidor" sua intenção deveria valer — isso seria dar ao cliente
  autoridade sobre o tempo do servidor.

---

## AuthoritativeState (interno ao servidor — não trafega assim)

Representa o estado que `Simulation.js` + `WorldRules.js` produzem a cada
tick. É a fonte da verdade; o `Snapshot` é a projeção dela por jogador.

```jsonc
{
  "roomId": "ZERO-7K4P",
  "roundId": 12,
  "tick": 9214,
  "players": {
    "player_1": {
      "position": { "x": 3.1, "y": 0, "z": -2.4 },
      "rotation": { "y": 1.02 },
      "situacao": "ativo",
      "lastAckedSeq": 1842
    }
  }
}
```

- `lastAckedSeq` é por jogador: o último `seq` daquele cliente que já foi
  incorporado ao estado.
- Este objeto nunca é serializado inteiro para os clientes — ele alimenta
  o `Snapshot`, que é filtrado por regras de visibilidade (quem pode ver
  quem, hoje resolvido em `_broadcastSnapshots`).

---

## Snapshot (servidor → cliente, um por conexão)

```jsonc
{
  "type": "snapshot",
  "roomId": "ZERO-7K4P",
  "roundId": 12,
  "tick": 9214,
  "ack": { "seq": 1842 },
  "players": {
    "player_1": {
      "position": { "x": 3.1, "y": 0, "z": -2.4 },
      "rotation": { "y": 1.02 },
      "situacao": "ativo"
    }
  }
}
```

- `ack` só existe em relação ao dono da conexão (cada cliente só sabe o
  `ack` da própria fila de Intents, nunca da de outro jogador).
- `players` é a projeção já filtrada por visibilidade — um escondido não
  visível não aparece aqui, do mesmo jeito que já acontece hoje.
- `lastAckedSeq` do `AuthoritativeState` vira `ack.seq` só para o próprio
  jogador; para os demais jogadores, esse campo nunca é exposto.

---

## Regras de validade

1. **Intent fora de ordem**: se `seq` recebido `<= lastAckedSeq` já
   confirmado para aquele cliente, o servidor descarta o Intent
   silenciosamente (duplicata ou atraso de rede).
2. **Intent de round antigo**: se `roundId` do Intent é diferente do
   `roundId` atual da sala, o servidor descarta.
3. **Múltiplos Intents no mesmo tick**: se mais de um Intent chegar antes
   do próximo tick de simulação, só o de maior `seq` é aplicado — os
   intermediários são descartados (não enfileirados).
4. **Snapshot/estado antigo no cliente**: se o cliente receber um
   `Snapshot` com `tick` menor que o último já processado, ou com
   `roundId` diferente do atual, ele descarta o pacote inteiro.
5. **Troca de `roundId`**: invalida toda fila de Intents pendentes do
   cliente (o que hoje seria o buffer de reconciliation) — nada do round
   anterior sobrevive para o novo.
6. **Ausência de Intent**: se o servidor não recebe nenhum Intent novo de
   um jogador em um tick, ele repete a última `direction`/`magnitude`
   conhecida (ou aplica zero, a decidir na implementação de
   `Simulation.js` — este contrato não resolve isso, só expõe que a
   decisão existe).

---

## O que este contrato explicitamente NÃO decide

- Como `Simulation.js` calcula o próximo estado (fórmula de movimento).
- Onde mora `maxSpeed` (proposta: `WorldRules`, não aqui).
- Como o cliente faz prediction/reconciliation (`Prediction.js`).
- Qualquer coisa sobre `Relation` — proximidade, visibilidade, "found".
  Isso continua um circuito separado, que consome o `AuthoritativeState`
  resultante, mas não participa do cálculo de movimento.

Depois que cliente e servidor obedecerem a este contrato — cliente só
manda `Intent`, servidor só manda `Snapshot` — a Fase A está pronta para
ser implementada em cima dele.
