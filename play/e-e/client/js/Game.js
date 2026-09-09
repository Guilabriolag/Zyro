// Game.js
// Orquestra o ciclo da partida: LOBBY -> PREPARAÇÃO -> ESCONDER -> PROCURAR
// -> RESULTADO -> NOVA PARTIDA. Conversa com Network através de conceitos
// (network.on('phase', ...), network.publishIntent(...)) e nunca manipula
// WebSocket diretamente. Também nunca decide sozinho quem foi encontrado —
// isso é resolvido pelo servidor e apenas observado aqui.
//
// FASE A: o jogador local não calcula mais sua posição final. Ele manda
// uma intenção (Prediction.applyIntent) e prevê o movimento na hora pra
// não parecer travado; quando o Snapshot do servidor chega com o `ack`,
// Prediction.reconcile corrige a posição prevista sem teletransportar o
// jogador. Ver PROTOCOL.md.

import { Player } from './Player.js';
import { Prediction } from './Prediction.js';

export class Game {
  constructor({ world, renderer, network, ui, input, cameraController }) {
    this.world = world;
    this.renderer = renderer;
    this.network = network;
    this.ui = ui;
    this.input = input;
    this.cameraController = cameraController;

    this.players = new Map(); // id -> Player
    this.localId = null;
    this.phase = 'lobby';
    this.roundId = 0;
    this.prediction = new Prediction();

    this._bindNetworkEvents();
  }

  async connect(url, { name, roomCode }) {
    const welcome = await this.network.connect(url, { name, roomCode });
    this.localId = welcome.playerId;
    this.roundId = welcome.roundId || 0;
    const local = new Player(this.localId, { isLocal: true });
    local.name = name;
    local.entity.setState({ posicao: { x: 0, y: 0, z: (Math.random() - 0.5) * 4 } });
    this.players.set(this.localId, local);
    this.renderer.ensure(this.localId, { isLocal: true });
    return welcome;
  }

  _bindNetworkEvents() {
    this.network.on('players', (msg) => {
      this.ui.setPlayersCount(msg.count);
      for (const p of msg.players) {
        if (!this.players.has(p.id) && p.id !== this.localId) {
          const remote = new Player(p.id, { isLocal: false });
          remote.name = p.name;
          this.players.set(p.id, remote);
          this.renderer.ensure(p.id, { isLocal: false });
        }
        const player = this.players.get(p.id);
        if (player) player.role = p.role;
      }
      // remove jogadores que saíram
      const ids = new Set(msg.players.map((p) => p.id));
      for (const id of [...this.players.keys()]) {
        if (!ids.has(id)) {
          this.renderer.remove(id);
          this.players.delete(id);
        }
      }
    });

    this.network.on('phase', (msg) => {
      this.phase = msg.phase;
      if (msg.roundId !== undefined) this.roundId = msg.roundId;
      this.ui.setPhaseBanner(msg.phase);
      this.ui.setTimer(msg.timer);
      if (msg.phase === 'lobby') this.ui.hideResult();

      for (const [id, role] of Object.entries(msg.roles || {})) {
        const player = this.players.get(id);
        if (player) player.role = role;
      }
      const localPlayer = this.players.get(this.localId);
      this.ui.setRole(localPlayer?.role || null);

      if (msg.phase === 'prep' || msg.phase === 'hide' || msg.phase === 'seek') {
        this.ui.hideResult();
        for (const [id, player] of this.players) {
          player.entity.setState({ situacao: 'ativo' });
          this.renderer.show(id);
        }
      }
    });

    this.network.on('timer', (msg) => this.ui.setTimer(msg.timer));

    this.network.on('found', (msg) => {
      const player = this.players.get(msg.foundId);
      if (player) {
        player.entity.setState({ posicao: msg.posicao, situacao: 'encontrado' });
        this.renderer.show(msg.foundId);
        this.renderer.update(msg.foundId, msg.posicao, player.entity.getState().rotacao, 'encontrado');
      }
    });

    this.network.on('result', (msg) => {
      this.ui.showResult(msg.message);
    });

    this.network.on('snapshot', (msg) => {
      if (msg.roundId !== undefined) this.roundId = msg.roundId;

      for (const [id, state] of Object.entries(msg.players)) {
        if (id === this.localId) {
          const local = this.players.get(id);
          if (!local || !msg.ack) continue;
          const corrected = this.prediction.reconcile(state, msg.ack);
          local.entity.setState({
            posicao: corrected.posicao,
            rotacao: corrected.rotacao,
            situacao: state.situacao,
          });
          continue;
        }
        let player = this.players.get(id);
        if (!player) continue;
        player.buffer?.push(state.posicao, state.rotacao, state.situacao);
      }
    });

    this.network.on('disconnected', () => {
      this.ui.setLobbyStatus('Conexão com a sala perdida.', true);
      this.ui.backToLobby();
    });
  }

  // Chamado a cada frame pelo main.js
  update(dt) {
    this._updateLocalPlayer(dt);
    this._updateRemotePlayers();

    const local = this.players.get(this.localId);
    if (local) {
      this.cameraController.updateTarget(local.entity.getState().posicao);
    }
  }

  _updateLocalPlayer(dt) {
    const local = this.players.get(this.localId);
    if (!local) return;
    const state = local.entity.getState();
    if (state.situacao === 'encontrado') return;

    // Input.getMovementIntent() devolve um vetor já rotacionado pela
    // câmera, com magnitude 0..1 (não necessariamente unitário). O
    // contrato (PROTOCOL.md) separa direção de magnitude explicitamente.
    const raw = this.input.getMovementIntent();
    const len = Math.hypot(raw.x, raw.z);
    const movement = len > 0
      ? { direction: { x: raw.x / len, z: raw.z / len }, magnitude: Math.min(len, 1) }
      : { direction: { x: 0, z: 0 }, magnitude: 0 };

    const { intent, predicted } = this.prediction.applyIntent(state, movement, dt);
    local.entity.setState({ posicao: predicted.posicao, rotacao: predicted.rotacao });

    const newState = local.entity.getState();
    this.renderer.update(this.localId, newState.posicao, newState.rotacao, newState.situacao);
    this.network.publishIntent(this.roundId, intent.seq, intent.movement);
  }

  _updateRemotePlayers() {
    for (const [id, player] of this.players) {
      if (id === this.localId) continue;
      const interpolated = player.buffer?.getInterpolated();
      if (!interpolated) continue;
      player.entity.setState({
        posicao: interpolated.posicao,
        rotacao: interpolated.rotacao,
        situacao: interpolated.situacao,
      });
      if (interpolated.situacao === 'encontrado') {
        this.renderer.show(id);
      }
      this.renderer.update(id, interpolated.posicao, interpolated.rotacao, interpolated.situacao);
    }
  }
}
