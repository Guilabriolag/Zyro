// WorldRules.js
// Quais restrições este mundo impõe: velocidade máxima, limites da
// arena, raio de colisão do jogador e o layout de obstáculos. Não sabe
// nada sobre intenção, tempo ou rede — só responde "o que é permitido
// aqui".
//
// ATENÇÃO — dívida técnica conhecida: o layout de obstáculos abaixo
// precisa continuar idêntico ao de client/js/WorldRules.js (que também
// alimenta o desenho da cena em World.js). Isso só se resolve quando o
// mapa virar dado compartilhado entre cliente e servidor (world.json) —
// não faz parte do escopo da Fase A. Ver PROTOCOL.md.

export const MOVE_SPEED = 3.2;
export const ARENA_RADIUS = 20;
export const PLAYER_RADIUS = 0.4;

const RAW_OBSTACLES = [
  { x: -6, z: -4, w: 2.2 },
  { x: 5, z: 3, w: 2.6 },
  { x: 2, z: -7, w: 2.0 },
  { x: -8, z: 6, w: 3.0 },
  { x: 7, z: -2, w: 1.8 },
  { x: 0, z: 8, w: 2.4 },
  { x: -3, z: 2, w: 1.6 },
  { x: -9, z: -8, w: 2.8 },
];

export const OBSTACLES = RAW_OBSTACLES.map((o) => ({
  x: o.x,
  z: o.z,
  halfSize: o.w / 2 + PLAYER_RADIUS,
}));

export function resolveObstacleCollisions(pos, obstacles = OBSTACLES) {
  let { x, z } = pos;
  for (const o of obstacles) {
    const dx = x - o.x;
    const dz = z - o.z;
    if (Math.abs(dx) < o.halfSize && Math.abs(dz) < o.halfSize) {
      // empurra para fora pelo eixo de menor penetração
      const overlapX = o.halfSize - Math.abs(dx);
      const overlapZ = o.halfSize - Math.abs(dz);
      if (overlapX < overlapZ) {
        x += Math.sign(dx || 1) * overlapX;
      } else {
        z += Math.sign(dz || 1) * overlapZ;
      }
    }
  }
  return { x, z };
}

export function clampToArena(pos, radius = ARENA_RADIUS) {
  const dist = Math.hypot(pos.x, pos.z);
  if (dist <= radius) return pos;
  const scale = radius / dist;
  return { x: pos.x * scale, z: pos.z * scale };
}
