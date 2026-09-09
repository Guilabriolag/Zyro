// Simulation.js
// A mesma função pura que roda no servidor (server/Simulation.js): dado
// um estado + uma intenção + dt, qual é o próximo estado? Existe aqui
// só para o cliente poder prever localmente (Prediction.js) antes da
// confirmação do servidor chegar — a fonte da verdade continua sendo o
// servidor.
//
// ATENÇÃO — dívida técnica conhecida: esta função precisa continuar com
// o mesmo comportamento de server/Simulation.js. Ver PROTOCOL.md.

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
