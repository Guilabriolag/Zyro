// GameRoom.js
// O Durable Object É a sala. Ele não é "o dono do mundo" — é a
// infraestrutura que mantém os participantes da mesma sala sincronizados
// e resolve, com autoridade, o único entrelaçamento deste protótipo:
//
//   PROCURADOR.posicao + ESCONDIDO.posicao
//     -> relação espacial
//     -> distância < limite
//     -> ESCONDIDO.estado = "encontrado"
//
// O cliente nunca declara "eu encontrei" — ele só observa o resultado.
// Também é aqui que se decide o que cada jogador PODE VER: durante
// esconder/procurar, a posição do escondido não é enviada para quem
// procura (estado interno da sala vs. estado visível por jogador).
//
// FASE A: o cliente também não declara mais "minha posição agora é
// X,Y,Z". Ele manda uma intenção (Intent: seq + movement), e é
// Simulation.js (com as restrições de WorldRules.js) quem decide a
// posição resultante a cada tick. Ver PROTOCOL.md para o contrato
// completo (Intent / Snapshot / regras de validade de seq/tick/roundId).

import { simulateStep } from './Simulation.js';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const PREP_SECONDS = 8;
const HIDE_SECONDS = 12;
const SEEK_SECONDS = 40;
const RESULT_SECONDS = 6;
const PROXIMITY_THRESHOLD = 1.6;
const SNAPSHOT_HZ = 15;

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    this.sockets = new Map(); // playerId -> WebSocket
    this.players = new Map(); // playerId -> { name, role, posicao, rotacao, movement, situacao, lastAckedSeq }
    this.phase = 'lobby';
    this.timer = 0;
    this.nextIdNum = 1;
    this.roundId = 0; // incrementa a cada nova partida (ver PROTOCOL.md)
    this.tick = 0; // incrementa a cada passo de simulação (ver PROTOCOL.md)

    this.timerHandle = null;
    this.broadcastHandle = null;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('esperado websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this._handleSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // -------------------------------------------------------------- socket
  _handleSocket(ws) {
    let playerId = null;

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'join') {
        if (this.players.size >= MAX_PLAYERS) {
          this._send(ws, { type: 'error', message: 'Sala cheia.' });
          ws.close();
          return;
        }
        playerId = `player_${this.nextIdNum++}`;
        this.sockets.set(playerId, ws);
        this.players.set(playerId, {
          name: (msg.name || playerId).toString().slice(0, 16),
          role: null,
          posicao: { x: (Math.random() - 0.5) * 6, y: 0, z: (Math.random() - 0.5) * 6 },
          rotacao: { y: 0 },
          movement: { direction: { x: 0, z: 0 }, magnitude: 0 },
          situacao: 'ativo',
          lastAckedSeq: 0,
        });

        this._send(ws, { type: 'welcome', playerId, roomCode: msg.roomCode, roundId: this.roundId });
        this._broadcastPlayers();
        this._broadcastPhaseTo(ws);
        this._maybeStartPrep();
        return;
      }

      if (!playerId) return;

      if (msg.type === 'intent') {
        const player = this.players.get(playerId);
        if (!player) return;

        // regra de validade: Intent de round antigo é descartado
        if (msg.roundId !== this.roundId) return;

        // regra de validade: seq fora de ordem/duplicado é descartado
        const seq = Number(msg.seq);
        if (!Number.isFinite(seq) || seq <= player.lastAckedSeq) return;

        // regra de validade: só a intenção mais recente importa até o
        // próximo tick de simulação (não enfileira intermediárias)
        if (seq > (player.pendingSeq || 0)) {
          player.pendingSeq = seq;
          player.movement = msg.movement || { direction: { x: 0, z: 0 }, magnitude: 0 };
        }
        return;
      }
    });

    const cleanup = () => {
      if (!playerId) return;
      this.sockets.delete(playerId);
      this.players.delete(playerId);
      this._broadcastPlayers();
      if (this.players.size < MIN_PLAYERS) this._resetToLobby();
    };
    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
  }

  // -------------------------------------------------------------- fases
  _maybeStartPrep() {
    if (this.phase === 'lobby' && this.players.size >= MIN_PLAYERS) {
      this._startPrep();
    }
  }

  _assignRoles() {
    const ids = [...this.players.keys()];
    const hiderIndex = Math.floor(Math.random() * ids.length);
    ids.forEach((id, i) => {
      const p = this.players.get(id);
      p.role = i === hiderIndex ? 'esconde' : 'procura';
      p.situacao = 'ativo';
    });
  }

  _startPrep() {
    this.roundId += 1; // ver PROTOCOL.md: invalida Intents da rodada anterior
    this._assignRoles();
    this._setPhase('prep', PREP_SECONDS);
    this._startBroadcastLoop();
    this._runCountdown(() => this._startHide());
  }

  _startHide() {
    this._setPhase('hide', HIDE_SECONDS);
    this._runCountdown(() => this._startSeek());
  }

  _startSeek() {
    this._setPhase('seek', SEEK_SECONDS);
    this._runCountdown(() => this._endRound('Tempo esgotado — ninguém encontrou o escondido.'));
  }

  _setPhase(phase, timer) {
    this.phase = phase;
    this.timer = timer;
    const roles = {};
    for (const [id, p] of this.players) roles[id] = p.role;
    this._broadcastAll({ type: 'phase', phase, timer, roles, roundId: this.roundId });
  }

  _broadcastPhaseTo(ws) {
    const roles = {};
    for (const [id, p] of this.players) roles[id] = p.role;
    this._send(ws, { type: 'phase', phase: this.phase, timer: this.timer, roles, roundId: this.roundId });
  }

  _runCountdown(onEnd) {
    clearInterval(this.timerHandle);
    this.timerHandle = setInterval(() => {
      this.timer -= 1;
      if (this.timer <= 0) {
        clearInterval(this.timerHandle);
        onEnd();
      } else {
        this._broadcastAll({ type: 'timer', timer: this.timer });
      }
    }, 1000);
  }

  _endRound(message) {
    clearInterval(this.timerHandle);
    clearInterval(this.broadcastHandle);
    this.phase = 'result';
    this._broadcastAll({ type: 'result', message });

    setTimeout(() => {
      if (this.players.size >= MIN_PLAYERS) this._startPrep();
      else this._resetToLobby();
    }, RESULT_SECONDS * 1000);
  }

  _resetToLobby() {
    clearInterval(this.timerHandle);
    clearInterval(this.broadcastHandle);
    this.phase = 'lobby';
    this.timer = 0;
    for (const p of this.players.values()) {
      p.role = null;
      p.situacao = 'ativo';
    }
    this._broadcastAll({ type: 'phase', phase: 'lobby', timer: 0, roles: {} });
  }

  // -------------------------------------------------------- estado/rede
  _broadcastPlayers() {
    const list = [...this.players.entries()].map(([id, p]) => ({
      id,
      name: p.name,
      role: p.role,
    }));
    this._broadcastAll({ type: 'players', players: list, count: list.length });
  }

  _startBroadcastLoop() {
    clearInterval(this.broadcastHandle);
    this.broadcastHandle = setInterval(() => this._tickSnapshot(), Math.round(1000 / SNAPSHOT_HZ));
  }

  _tickSnapshot() {
    this.tick += 1;
    this._simulateMovement();
    if (this.phase === 'hide' || this.phase === 'seek') {
      this._checkProximity();
    }
    this._broadcastSnapshots();
  }

  // Simulação autoritativa: para cada jogador ainda em jogo, aplica a
  // intenção mais recente conhecida (repete a última se nada novo
  // chegou — ver PROTOCOL.md, regra 6) e marca essa intenção como
  // reconhecida (ack) para a reconciliação do cliente.
  _simulateMovement() {
    const dt = 1 / SNAPSHOT_HZ;
    for (const player of this.players.values()) {
      if (player.situacao === 'encontrado') continue;
      const next = simulateStep(player.posicao, player.rotacao, player.movement, dt);
      player.posicao = next.position;
      player.rotacao = next.rotation;
      if (player.pendingSeq) player.lastAckedSeq = player.pendingSeq;
    }
  }

  // Entrelaçamento: proximidade entre procurador e escondido -> "encontrado"
  _checkProximity() {
    const hiderEntry = [...this.players.entries()].find(([, p]) => p.role === 'esconde');
    if (!hiderEntry) return;
    const [hiderId, hider] = hiderEntry;
    if (hider.situacao === 'encontrado') return;

    for (const [seekerId, seeker] of this.players) {
      if (seeker.role !== 'procura') continue;
      const dx = seeker.posicao.x - hider.posicao.x;
      const dz = seeker.posicao.z - hider.posicao.z;
      if (Math.hypot(dx, dz) < PROXIMITY_THRESHOLD) {
        hider.situacao = 'encontrado';
        this._broadcastAll({
          type: 'found',
          foundId: hiderId,
          seekerId,
          posicao: hider.posicao,
        });
        this._endRound(`${seeker.name} encontrou ${hider.name}!`);
        return;
      }
    }
  }

  // Estado visível por jogador: quem procura não recebe a posição de quem
  // está escondido (a menos que já tenha sido encontrado).
  _broadcastSnapshots() {
    for (const [viewerId, viewerSocket] of this.sockets) {
      const viewer = this.players.get(viewerId);
      const payload = {};
      for (const [id, p] of this.players) {
        const deveOcultar =
          (this.phase === 'hide' || this.phase === 'seek') &&
          p.role === 'esconde' &&
          p.situacao !== 'encontrado' &&
          id !== viewerId;
        if (deveOcultar) continue;
        payload[id] = { posicao: p.posicao, rotacao: p.rotacao, situacao: p.situacao };
      }
      this._send(viewerSocket, {
        type: 'snapshot',
        roundId: this.roundId,
        tick: this.tick,
        ack: { seq: viewer ? viewer.lastAckedSeq : 0 },
        players: payload,
      });
    }
  }

  _send(ws, obj) {
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      // socket já pode ter fechado; ignorado propositalmente
    }
  }

  _broadcastAll(obj) {
    const data = JSON.stringify(obj);
    for (const ws of this.sockets.values()) {
      try {
        ws.send(data);
      } catch {
        // idem
      }
    }
  }
}

