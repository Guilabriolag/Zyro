// WorldRules.js
// Quais restrições este mundo impõe: velocidade máxima, limites da
// arena, raio de colisão do jogador e o layout de obstáculos. World.js
// usa OBSTACLE_LAYOUT pra desenhar a cena; Simulation.js usa as funções
// de colisão pra prever o movimento local antes da confirmação do
// servidor chegar.
//
// ATENÇÃO — dívida técnica conhecida: este arquivo precisa continuar
// idêntico a server/WorldRules.js. Isso só se resolve quando o mapa
// virar dado compartilhado entre cliente e servidor (world.json) — não
// faz parte do escopo da Fase A. Ver PROTOCOL.md.

export const MOVE_SPEED = 3.2;
export const ARENA_RADIUS = 20;
export const PLAYER_RADIUS = 0.4;

export const OBSTACLE_LAYOUT = [
  { x: -6, z: -4, w: 2.2, h: 2.4, color: 0x6b5842 },
  { x: 5, z: 3, w: 2.6, h: 2.0, color: 0x5c6b48 },
  { x: 2, z: -7, w: 2.0, h: 2.8, color: 0x6b5842 },
  { x: -8, z: 6, w: 3.0, h: 1.8, color: 0x5c6b48 },
  { x: 7, z: -2, w: 1.8, h: 2.6, color: 0x6b5842 },
  { x: 0, z: 8, w: 2.4, h: 2.2, color: 0x5c6b48 },
  { x: -3, z: 2, w: 1.6, h: 2.0, color: 0x6b5842 },
  { x: -9, z: -8, w: 2.8, h: 2.4, color: 0x5c6b48 },
];

const COLLISION_OBSTACLES = OBSTACLE_LAYOUT.map((o) => ({
  x: o.x,
  z: o.z,
  halfSize: o.w / 2 + PLAYER_RADIUS,
}));

export function resolveObstacleCollisions(pos, obstacles = COLLISION_OBSTACLES) {
  let { x, z } = pos;
  for (const o of obstacles) {
    const dx = x - o.x;
    const dz = z - o.z;
    if (Math.abs(dx) < o.halfSize && Math.abs(dz) < o.halfSize) {
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
