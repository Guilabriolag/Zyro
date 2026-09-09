// Prediction.js
// Client-side prediction + reconciliation. O jogador local nunca espera
// o servidor para se mover na tela: cada frame aplica a intenção
// localmente (predição, via Simulation.js) e guarda essa intenção numa
// fila. Quando o Snapshot com o `ack` do servidor chega, descarta da
// fila tudo que já foi confirmado e reaplica só o que ainda não foi —
// corrigindo a posição prevista sem "teletransportar" o jogador.

import { simulateStep } from './Simulation.js';

export class Prediction {
  constructor() {
    this.seq = 0;
    this.pending = []; // [{ seq, movement, dt }] — ainda não confirmados pelo servidor
  }

  // Chamado a cada frame local. Retorna o Intent a mandar pro servidor
  // e o estado previsto pra renderizar já, sem esperar confirmação.
  applyIntent(currentState, movement, dt) {
    this.seq += 1;
    this.pending.push({ seq: this.seq, movement, dt });

    const next = simulateStep(currentState.posicao, currentState.rotacao, movement, dt);
    return {
      intent: { seq: this.seq, movement },
      predicted: { posicao: next.position, rotacao: next.rotation },
    };
  }

  // Chamado quando um Snapshot traz a posição autoritativa do próprio
  // jogador e o `ack` do servidor. Descarta os intents já confirmados e
  // reaplica os pendentes sobre o estado autoritativo, na ordem em que
  // foram gerados, pra chegar na mesma posição prevista sem regressão
  // visível.
  reconcile(authoritativeState, ack) {
    this.pending = this.pending.filter((p) => p.seq > ack.seq);

    let posicao = authoritativeState.posicao;
    let rotacao = authoritativeState.rotacao;
    for (const p of this.pending) {
      const next = simulateStep(posicao, rotacao, p.movement, p.dt);
      posicao = next.position;
      rotacao = next.rotation;
    }
    return { posicao, rotacao };
  }
}
