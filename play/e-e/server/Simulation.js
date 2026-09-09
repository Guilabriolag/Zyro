// Simulation.js
// O motor temporal: dado um estado (posição + rotação), uma intenção
// (direção + magnitude) e um dt, qual é o próximo estado?
//
// Não conhece WebSocket, GameRoom, fases de jogo nem jogadores — só
// consome WorldRules para saber os limites físicos deste mundo. Isso é
// deliberado: a autoridade sobre "o que pode acontecer fisicamente" vive
// aqui e em WorldRules.js, nunca em GameRoom.js.

import { MOVE_SPEED, ARENA_RADIUS, resolveObstacleCollisions, clampToArena } from './WorldRules.js';

export function simulateStep(position, rotation, movement, dt) {
  const magnitude = Math.max(0, Math.min(1, movement?.magnitude || 0));
  let { x, z } = position;
  let nextRotation = rotation;

  if (magnitude > 0) {
    const dir = movement.direction || { x: 0, z: 0 };
    const len = Math.hypot(dir.x, dir.z) || 1;
    const ux = dir.x / len;
    const uz = dir.z / len;
    x += ux * magnitude * MOVE_SPEED * dt;
    z += uz * magnitude * MOVE_SPEED * dt;
    nextRotation = { y: Math.atan2(ux, uz) };
  }

  const resolved = resolveObstacleCollisions({ x, z });
  const clamped = clampToArena(resolved, ARENA_RADIUS);

  return {
    position: { x: clamped.x, y: 0, z: clamped.z },
    rotation: nextRotation,
  };
}
