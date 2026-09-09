// collision.js
// Funções puras de colisão local (só afetam a suavidade do movimento no
// cliente — a autoridade sobre a posição final para fins de detecção
// continua sendo o próprio valor que o cliente publica, verificado pelo
// servidor via proximidade).

const ARENA_RADIUS = 20;
const PLAYER_RADIUS = 0.4;

export function clampToArena(pos) {
  const dist = Math.hypot(pos.x, pos.z);
  if (dist <= ARENA_RADIUS) return pos;
  const scale = ARENA_RADIUS / dist;
  return { x: pos.x * scale, z: pos.z * scale };
}

export function resolveObstacleCollisions(pos, obstacles) {
  let { x, z } = pos;
  for (const obstacle of obstacles) {
    const o = obstacle.getState().posicao;
    const halfSize = obstacle.getState().tamanho.w / 2 + PLAYER_RADIUS;
    const dx = x - o.x;
    const dz = z - o.z;
    if (Math.abs(dx) < halfSize && Math.abs(dz) < halfSize) {
      // empurra para fora pelo eixo de menor penetração
      const overlapX = halfSize - Math.abs(dx);
      const overlapZ = halfSize - Math.abs(dz);
      if (overlapX < overlapZ) {
        x += Math.sign(dx || 1) * overlapX;
      } else {
        z += Math.sign(dz || 1) * overlapZ;
      }
    }
  }
  return { x, z };
}
