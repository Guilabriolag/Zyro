// ============================================================
// core/event.js
// GRAMÁTICA ZERO — normalização de evento + encadeamento
//
// Esta é a primeira peça extraída do chão de fábrica.
// Não sabe nada sobre grid, canvas, joystick ou entidades —
// só sabe transformar uma ação em evento normalizado e
// encadeá-lo ao anterior. Qualquer outra peça da fábrica
// (render, input, entities) pode importar e chamar emitEvent().
//
// O digest aqui é um placeholder não-criptográfico, só para
// visualizar o encadeamento no sandbox. Quando o zyrolog.js
// real entrar, é só trocar simpleDigest() por SHA-256 — a
// assinatura de emitEvent() não muda, então nada que já usa
// esse módulo precisa ser reescrito.
// ============================================================

let eventChain = [];
let lastEventDigest = 'GENESIS';

// listeners externos (ex: toast na UI, painel de inspeção futuro)
const listeners = [];

function simpleDigest(str){
  // hash não-criptográfico só para o sandbox visual (placeholder).
  // trocar por SHA-256 real quando integrar o zyrolog.js.
  let h = 0;
  for (let i=0; i<str.length; i++){
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return 'sbx_' + Math.abs(h).toString(16).slice(0,8);
}

/**
 * Emite um evento na Gramática Zero:
 * entidade, verbo, objeto, condição, estado anterior, ação, estado novo.
 * Encadeia automaticamente com o hash do evento anterior.
 */
export function emitEvent({entidade, verbo, objeto, condicao, estadoAnterior, acao, estadoNovo}){
  const evento = {
    id: eventChain.length + 1,
    entidade, verbo, objeto, condicao,
    estado_anterior: estadoAnterior,
    acao,
    estado_novo: estadoNovo,
    timestamp: Date.now(),
    evento_anterior: lastEventDigest
  };
  const normalized = JSON.stringify(evento);
  const digest = simpleDigest(normalized + lastEventDigest);
  evento.hash = digest;
  lastEventDigest = digest;
  eventChain.push(evento);

  listeners.forEach(fn => fn(evento));

  return evento;
}

/** Retorna uma cópia da cadeia completa de eventos, na ordem em que ocorreram. */
export function getEventChain(){
  return eventChain.slice();
}

/** Retorna o hash do último evento emitido (ou 'GENESIS' se nada aconteceu ainda). */
export function getLastDigest(){
  return lastEventDigest;
}

/**
 * Verifica a integridade da cadeia recalculando cada hash na ordem.
 * Se alguém alterou um evento no meio, a verificação falha a partir dali.
 * Retorna { valido: boolean, quebrouEm: number|null }.
 */
export function verificarCadeia(){
  let prevDigest = 'GENESIS';
  for (const evento of eventChain){
    const { hash, ...semHash } = evento;
    const normalized = JSON.stringify({ ...semHash, evento_anterior: prevDigest });
    const recomputed = simpleDigest(normalized + prevDigest);
    if (recomputed !== hash){
      return { valido: false, quebrouEm: evento.id };
    }
    prevDigest = hash;
  }
  return { valido: true, quebrouEm: null };
}

/** Registra uma função a ser chamada toda vez que um evento novo for emitido. */
export function onEvent(fn){
  listeners.push(fn);
}
