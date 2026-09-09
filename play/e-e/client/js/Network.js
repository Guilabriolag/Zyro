// Network.js
// Esconde os detalhes do WebSocket. Game.js nunca chama ws.send/onmessage
// diretamente — só conceitos como connect(), publishIntent(), on(evento, cb).
//
// Fluxo (ver PROTOCOL.md):
//   CLIENTE A: joystick muda -> Prediction aplica localmente
//     -> Network.publishIntent(roundId, seq, movement)
//     -> Cloudflare Durable Object simula com autoridade
//     -> broadcast (Snapshot com tick/ack)
//   CLIENTE B: Network recebe Snapshot -> State interpola -> Renderer observa

const BATCH_INTERVAL_MS = 66; // ~15 Hz, dentro da faixa recomendada de 50-100ms

export class Network {
  constructor() {
    this.ws = null;
    this.handlers = {};
    this.playerId = null;
    this.batchHandle = null;
    this.pendingIntent = null;
  }

  on(event, callback) {
    this.handlers[event] = callback;
  }

  _emit(event, payload) {
    this.handlers[event]?.(payload);
  }

  connect(url, { name, roomCode }) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', name, roomCode }));
      };

      ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === 'welcome') {
          this.playerId = msg.playerId;
          this._startBatching();
          settled = true;
          resolve(msg);
          return;
        }
        if (msg.type === 'error' && !settled) {
          settled = true;
          reject(new Error(msg.message));
          return;
        }
        this._emit(msg.type, msg);
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error('falha ao conectar à sala'));
        }
      };

      ws.onclose = () => {
        clearInterval(this.batchHandle);
        this._emit('disconnected');
      };
    });
  }

  _startBatching() {
    clearInterval(this.batchHandle);
    this.batchHandle = setInterval(() => {
      if (this.pendingIntent && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'intent', ...this.pendingIntent }));
        this.pendingIntent = null;
      }
    }, BATCH_INTERVAL_MS);
  }

  // roundId identifica a partida atual (ver PROTOCOL.md); seq é gerado
  // por Prediction.js e nunca reaproveitado.
  publishIntent(roundId, seq, movement) {
    this.pendingIntent = { roundId, seq, movement };
  }

  sendReady() {
    this.ws?.send(JSON.stringify({ type: 'ready' }));
  }

  disconnect() {
    clearInterval(this.batchHandle);
    this.ws?.close();
  }
}
