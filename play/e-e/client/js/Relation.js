// Relation.js
// A resolução oficial do entrelaçamento (proximidade -> "encontrado")
// acontece no servidor (GameRoom.js), que é quem tem autoridade sobre o
// estado da partida — ver seção 22 do prompt original ("segurança da
// informação do jogo"). O cliente nunca declara "eu encontrei".
//
// Esta classe existe para manter a mesma estrutura conceitual do lado do
// cliente, caso uma futura relação precise de efeito puramente visual
// (por exemplo, destacar uma entidade quando uma relação é satisfeita)
// sem depender de lógica de jogo específica.

export class Relation {
  constructor({ origem, destino, tipo, regra }) {
    this.origem = origem;
    this.destino = destino;
    this.tipo = tipo;
    this.regra = regra;
  }

  // Retorna true se a regra desta relação for satisfeita para os estados
  // fornecidos. Uso opcional no cliente (ex: feedback visual antecipado);
  // a fonte da verdade continua sendo o servidor.
  isSatisfied(estadoOrigem, estadoDestino) {
    if (this.tipo === 'proximidade') {
      const dx = estadoOrigem.posicao.x - estadoDestino.posicao.x;
      const dz = estadoOrigem.posicao.z - estadoDestino.posicao.z;
      const dist = Math.hypot(dx, dz);
      return dist < this.regra.distanciaMaxima;
    }
    return false;
  }
}
