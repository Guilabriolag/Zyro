// State.js
// Guarda um pequeno histórico de snapshots de estado recebidos da rede
// para uma entidade remota, e resolve uma posição interpolada entre dois
// snapshots. Isso evita que jogadores remotos "pulem" quando o snapshot
// chega em baixa frequência (ver seção 23 do prompt: latência/interpolação).

const RENDER_DELAY_MS = 100; // renderiza levemente "no passado" para poder interpolar

export class StateBuffer {
  constructor() {
    this.snapshots = [];
  }

  push(posicao, rotacao, situacao) {
    this.snapshots.push({ t: performance.now(), posicao, rotacao, situacao });
    if (this.snapshots.length > 12) this.snapshots.shift();
  }

  latestSituacao() {
    const last = this.snapshots[this.snapshots.length - 1];
    return last ? last.situacao : 'ativo';
  }

  getInterpolated() {
    const buf = this.snapshots;
    if (buf.length === 0) return null;
    if (buf.length === 1) return buf[0];

    const renderTime = performance.now() - RENDER_DELAY_MS;

    for (let i = buf.length - 1; i > 0; i--) {
      if (buf[i - 1].t <= renderTime && buf[i].t >= renderTime) {
        const a = buf[i - 1];
        const b = buf[i];
        const span = b.t - a.t || 1;
        const t = (renderTime - a.t) / span;
        return {
          posicao: {
            x: a.posicao.x + (b.posicao.x - a.posicao.x) * t,
            y: a.posicao.y + (b.posicao.y - a.posicao.y) * t,
            z: a.posicao.z + (b.posicao.z - a.posicao.z) * t,
          },
          rotacao: b.rotacao,
          situacao: b.situacao,
        };
      }
    }
    // renderTime está fora do intervalo conhecido: usa o mais recente
    return buf[buf.length - 1];
  }
}
