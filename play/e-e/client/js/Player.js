// Player.js
// Um jogador é uma Entity do tipo "jogador" mais, se for remoto, um
// StateBuffer para interpolar as atualizações que chegam pela rede.

import { Entity } from './Entity.js';
import { StateBuffer } from './State.js';

export class Player {
  constructor(id, { isLocal = false } = {}) {
    this.entity = new Entity(id, 'jogador', {
      posicao: { x: 0, y: 0, z: 0 },
      rotacao: { y: 0 },
      movimento: { x: 0, z: 0 },
      situacao: 'ativo',
    });
    this.isLocal = isLocal;
    this.role = null;
    this.name = '';
    this.buffer = isLocal ? null : new StateBuffer();
  }

  get id() {
    return this.entity.id;
  }
}
