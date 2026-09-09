// worker.js
// Ponto de entrada do Worker. Cada código de sala vira o "nome" de um
// Durable Object (idFromName), então todo mundo que se conecta com o
// mesmo código cai sempre na mesma instância — sem precisar de um banco
// de dados para registrar salas.

export { GameRoom } from './GameRoom.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/room') {
      const code = (url.searchParams.get('code') || '').trim().toUpperCase();
      if (!code) {
        return new Response('parâmetro "code" é obrigatório', { status: 400 });
      }
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('esta rota espera uma conexão websocket', { status: 426 });
      }

      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    // Qualquer outra rota: serve o cliente estático (client/index.html etc.)
    // via Workers Assets, se configurado no wrangler.toml.
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Esconde-Esconde G0 — servidor de coordenação ativo', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
