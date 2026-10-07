// Copa Button 3D — versão estática (HTML + CSS + JS, sem Next.js nem backend).
// O motor (física, partida, renderer 3D, áudio) está em ./js/game; dados em ./js/lib.

import { NATIONS, getNation } from "./js/lib/nations.js";
import { STADIUMS, GRASSES, getStadium } from "./js/lib/stadiums.js";
import { teamSetup } from "./js/lib/tournament.js";
import { MatchController } from "./js/game/match.js";
import { predictShot } from "./js/game/physics.js";

/* ------------------------------------------------------------------ */
/* Estado salvo no navegador                                           */
/* ------------------------------------------------------------------ */

const STORE_KEY = "copa-button-3d:static:v1";

const DEFAULTS = {
  xp: 0, coins: 250, played: 0, wins: 0,
  home: "BRA", away: "ARG",
  stadiumCode: "olimpico", weather: "sol", timeOfDay: "tarde", grass: "normal",
  halfSeconds: 75, quality: "alta",
  walls: true, gk: true, showPrediction: true, crowdSound: true, training: false,
  camera: "jogo", spin: 0,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* modo privado: ignora */ }
}

const state = loadState();

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);

function show(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === `screen-${name}`));
  if (name === "menu") renderMenu();
  if (name === "prematch") renderPrematch();
}

document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
$("btn-howto").addEventListener("click", () => $("dlg-howto").showModal());

function fillSelect(sel, items, value) {
  sel.innerHTML = "";
  for (const it of items) {
    const o = document.createElement("option");
    o.value = it.value;
    o.textContent = it.label;
    if (it.disabled) o.disabled = true;
    sel.appendChild(o);
  }
  sel.value = value;
}

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

function renderMenu() {
  $("p-xp").textContent = state.xp;
  $("p-coins").textContent = state.coins;
  $("p-played").textContent = state.played;
  $("p-wins").textContent = state.wins;
}

/* ------------------------------------------------------------------ */
/* Pré-jogo                                                            */
/* ------------------------------------------------------------------ */

const PHASE_LABEL = {
  kickoff: "Saída de bola",
  aim: "Sua vez: arraste para petelecar",
  cpu: "Adversário pensando…",
  run: "Bola correndo",
  goal: "Gol!",
  restart: "Reinício",
  halftime: "Intervalo",
  fulltime: "Fim de jogo",
};

function stadiumOptions() {
  return STADIUMS.map((s) => {
    const locked = state.xp < s.unlockXp;
    return {
      value: s.code,
      label: locked ? `${s.name} · ${s.city} (bloqueado: ${s.unlockXp} XP)` : `${s.name} · ${s.city}`,
      disabled: locked,
    };
  });
}

function renderPrematch() {
  const nations = NATIONS.map((n) => ({ value: n.code, label: `${n.name}` }));
  fillSelect($("sel-home"), nations, state.home);
  fillSelect($("sel-away"), nations, state.away);
  fillSelect($("sel-stadium"), stadiumOptions(), getStadium(state.stadiumCode).code);
  fillSelect($("sel-grass"), GRASSES.map((g) => ({ value: g.id, label: g.label })), state.grass);
  $("sel-weather").value = state.weather;
  $("sel-time").value = state.timeOfDay;
  $("sel-half").value = String(state.halfSeconds);
  $("sel-quality").value = state.quality;
  $("chk-walls").checked = state.walls;
  $("chk-gk").checked = state.gk;
  $("chk-assist").checked = state.showPrediction;
  $("chk-sound").checked = state.crowdSound;
  $("chk-training").checked = state.training;
  syncPrematchLabels();
}

function syncPrematchLabels() {
  $("flag-home").textContent = getNation($("sel-home").value).flag;
  $("flag-away").textContent = getNation($("sel-away").value).flag;
  $("stadium-desc").textContent = getStadium($("sel-stadium").value).description;
}

function readPrematch() {
  state.home = $("sel-home").value;
  state.away = $("sel-away").value;
  state.stadiumCode = $("sel-stadium").value;
  state.weather = $("sel-weather").value;
  state.timeOfDay = $("sel-time").value;
  state.grass = $("sel-grass").value;
  state.halfSeconds = Number($("sel-half").value);
  state.quality = $("sel-quality").value;
  state.walls = $("chk-walls").checked;
  state.gk = $("chk-gk").checked;
  state.showPrediction = $("chk-assist").checked;
  state.crowdSound = $("chk-sound").checked;
  state.training = $("chk-training").checked;
  saveState();
}

["sel-home", "sel-away", "sel-stadium"].forEach((id) => $(id).addEventListener("change", syncPrematchLabels));
$("btn-start").addEventListener("click", () => {
  readPrematch();
  if (state.home === state.away) {
    // mesmo país dos dois lados confunde as cores: troca o adversário
    state.away = NATIONS.find((n) => n.code !== state.home).code;
  }
  startMatch();
});

/* ------------------------------------------------------------------ */
/* Partida                                                             */
/* ------------------------------------------------------------------ */

/** Sessão da partida em andamento (null fora do jogo). */
let M = null;

const canvas = $("game-canvas");

async function startMatch() {
  teardownMatch();
  show("match");
  ["ov-pause", "ov-end", "ov-error", "goal-flash"].forEach((id) => ($(id).hidden = true));
  $("feed").innerHTML = "";

  const settings = {
    stadiumCode: state.stadiumCode,
    weather: state.weather,
    timeOfDay: state.timeOfDay,
    grass: state.grass,
    walls: state.walls,
    halves: 2,
    halfSeconds: state.halfSeconds,
    gk: state.gk,
    spin: state.spin,
    training: state.training,
  };

  const home = getNation(state.home);
  const away = getNation(state.away);
  setScoreboardTeams(home, away);

  // Renderer e áudio ficam em import dinâmico: se o CDN do Three.js falhar,
  // mostramos uma mensagem em vez de uma tela em branco.
  let RendererMod, AudioMod;
  try {
    [RendererMod, AudioMod] = await Promise.all([import("./js/game/renderer.js"), import("./js/game/audio.js")]);
  } catch (e) {
    return showError(`Falha ao carregar o motor 3D (${e instanceof Error ? e.message : e}).`);
  }

  try {
    const seed = Math.floor(Math.random() * 1e6);
    const homeSetup = teamSetup(state.home, {}, settings, seed);
    const awaySetup = teamSetup(state.away, {}, settings, seed + 991);
    const ctrl = new MatchController(settings, homeSetup, awaySetup, 0, seed);
    const rend = new RendererMod.MatchRenderer({
      canvas,
      stadium: getStadium(settings.stadiumCode),
      weather: settings.weather,
      timeOfDay: settings.timeOfDay,
      grass: settings.grass,
      walls: settings.walls,
      quality: state.quality,
    });
    rend.setWorld(ctrl.world);

    const audio = new AudioMod.MatchAudio();
    audio.setEnabled(state.crowdSound);

    M = {
      ctrl, rend, audio, home, away, settings,
      cameraLabels: RendererMod.CAMERA_LABELS,
      camera: state.camera, userCamera: state.camera,
      spin: state.spin, predict: state.showPrediction, sound: state.crowdSound,
      paused: false, ended: false, raf: 0,
      drag: null, aim: null,
      prevPhase: ctrl.phase, prevBallSpeed: 0,
      last: performance.now(), hudTimer: 0, goalTimer: 0,
    };

    buildCameraButtons();
    syncControls();
    M.raf = requestAnimationFrame(loop);
  } catch (e) {
    teardownMatch();
    showError(e instanceof Error ? e.message : String(e));
  }
}

function teardownMatch() {
  if (!M) return;
  cancelAnimationFrame(M.raf);
  try { M.audio.dispose(); } catch { /* ignora */ }
  try { M.rend.dispose(); } catch { /* ignora */ }
  M = null;
}

function showError(msg) {
  $("err-text").textContent = msg;
  $("ov-error").hidden = false;
}

function loop(now) {
  const m = M;
  if (!m) return;
  m.raf = requestAnimationFrame(loop);
  const { ctrl, rend, audio } = m;

  const dt = Math.min(0.05, (now - m.last) / 1000);
  m.last = now;
  if (!m.paused) ctrl.update(dt);

  const ball = ctrl.world.ball;
  const hype = ctrl.phase === "goal" ? 1 : Math.min(1, Math.hypot(ball.vx, ball.vy) * 0.22);

  rend.sync(ctrl.world, {
    selectedId: ctrl.selectedId,
    aim: m.aim,
    camera: m.camera,
    hype,
    shake: ctrl.phase === "goal" ? 1 : 0,
    homeCode: state.home,
    awayCode: state.away,
    score: ctrl.score,
    minute: ctrl.minute,
    showPrediction: m.predict,
  }, dt);
  rend.frame();

  // áudio reativo
  const bs = Math.hypot(ball.vx, ball.vy, ball.vz);
  audio.setHype(hype * 0.75 + Math.min(0.4, bs * 0.05));
  if (bs - m.prevBallSpeed > 0.85) audio.thump(Math.min(1, bs / 4.5));
  m.prevBallSpeed = bs;
  if (ctrl.phase !== m.prevPhase) {
    if (ctrl.phase === "goal") audio.goal();
    else if (ctrl.phase === "kickoff") audio.whistle(false);
    else if (ctrl.phase === "halftime" || ctrl.phase === "fulltime") audio.whistle(true);
    m.prevPhase = ctrl.phase;
  }

  m.hudTimer += dt;
  if (m.hudTimer > 0.1) {
    m.hudTimer = 0;
    updateHud();
  }

  // replay de gol
  if (ctrl.phase === "goal" && m.goalTimer <= 0) {
    m.goalTimer = 2.8;
    $("goal-who").textContent = ctrl.lastScorer ? `${ctrl.lastScorer.name} (${ctrl.lastScorer.shirt})` : "";
    $("goal-flash").hidden = false;
    m.camera = "replay";
  }
  if (m.goalTimer > 0) {
    m.goalTimer -= dt;
    if (m.goalTimer <= 0) {
      $("goal-flash").hidden = true;
      m.camera = m.userCamera;
    }
  }

  if (ctrl.finished && !m.ended) {
    m.ended = true;
    m.camera = "replay";
    finishMatch();
  }
}

/* ---------------- HUD ---------------- */

function setScoreboardTeams(home, away) {
  const h = $("sb-home"), a = $("sb-away");
  h.querySelector(".sb-flag").textContent = home.flag;
  h.querySelector(".sb-code").textContent = home.code;
  h.style.background = `${home.secondary}cc`;
  a.querySelector(".sb-flag").textContent = away.flag;
  a.querySelector(".sb-code").textContent = away.code;
  a.style.background = `${away.secondary}cc`;
  $("sc-h").textContent = "0";
  $("sc-a").textContent = "0";
}

function updateHud() {
  const { ctrl, aim } = M;
  $("sc-h").textContent = ctrl.score[0];
  $("sc-a").textContent = ctrl.score[1];
  $("sb-min").textContent = M.settings.training ? "TREINO" : `${String(Math.floor(ctrl.minute)).padStart(2, "0")}'`;
  $("sb-half").textContent = `${ctrl.half}º T`;

  const turn = $("turn-pill");
  turn.textContent = ctrl.turn === 0 ? "Seu peteleco" : "Adversário";
  turn.classList.toggle("cpu", ctrl.turn !== 0);
  $("phase-pill").textContent = PHASE_LABEL[ctrl.phase] ?? ctrl.phase;

  const sel = ctrl.world.bodies.find((b) => b.id === ctrl.selectedId);
  $("sel-pill").textContent = sel ? `${sel.name} · ${sel.shirt}` : "";

  const power = aim ? aim.power : 0;
  $("power-fill").style.width = `${power * 100}%`;
  $("power-out").textContent = `${Math.round(power * 100)}%`;

  const feed = $("feed");
  const items = ctrl.feed.slice(0, 4);
  const sig = items.map((f) => f.id).join(",");
  if (feed.dataset.sig !== sig) {
    feed.dataset.sig = sig;
    feed.replaceChildren(...items.map((f, i) => {
      const d = document.createElement("div");
      d.className = f.kind;
      d.style.opacity = String(1 - i * 0.22);
      d.textContent = f.text;
      return d;
    }));
  }
}

function buildCameraButtons() {
  const box = $("cam-buttons");
  box.replaceChildren();
  for (const [mode, label] of Object.entries(M.cameraLabels)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = label;
    b.dataset.mode = mode;
    b.addEventListener("click", () => {
      if (!M) return;
      M.camera = mode;
      M.userCamera = mode;
      state.camera = mode;
      saveState();
      syncControls();
    });
    box.appendChild(b);
  }
}

function syncControls() {
  document.querySelectorAll("#cam-buttons .chip").forEach((b) => b.classList.toggle("on", b.dataset.mode === M.userCamera));
  const assist = $("btn-assist");
  assist.textContent = M.predict ? "Trajetória: ligada" : "Trajetória: desligada";
  assist.classList.toggle("ice", M.predict);
  $("btn-sound").textContent = M.sound ? "Som: ligado" : "Som: desligado";
  $("btn-sound").classList.toggle("on", M.sound);
  $("spin").value = String(M.spin);
  $("spin-out").textContent = M.spin.toFixed(1);
  $("btn-pause").textContent = M.paused ? "Continuar" : "Pausar";
}

$("btn-assist").addEventListener("click", () => {
  if (!M) return;
  M.predict = !M.predict;
  state.showPrediction = M.predict;
  saveState();
  syncControls();
});
$("btn-sound").addEventListener("click", () => {
  if (!M) return;
  M.sound = !M.sound;
  M.audio.setEnabled(M.sound);
  state.crowdSound = M.sound;
  saveState();
  syncControls();
});
$("spin").addEventListener("input", (e) => {
  if (!M) return;
  M.spin = Number(e.target.value);
  state.spin = M.spin;
  syncControls();
});

function setPaused(p) {
  if (!M || M.ended) return;
  M.paused = p;
  $("pause-score").textContent = `${M.home.flag} ${M.ctrl.score[0]} × ${M.ctrl.score[1]} ${M.away.flag}`;
  $("ov-pause").hidden = !p;
  syncControls();
}
$("btn-pause").addEventListener("click", () => setPaused(!M?.paused));
$("pz-resume").addEventListener("click", () => setPaused(false));
$("pz-end").addEventListener("click", () => {
  if (!M) return;
  M.ctrl.forceEnd();
  setPaused(false);
});
$("pz-menu").addEventListener("click", () => { teardownMatch(); saveState(); show("menu"); });
$("err-back").addEventListener("click", () => { teardownMatch(); show("prematch"); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && M && !M.ended) setPaused(!M.paused);
});
// pausa sozinho quando a aba perde o foco
document.addEventListener("visibilitychange", () => {
  if (document.hidden && M && !M.ended && !M.paused) setPaused(true);
});

/* ---------------- Fim de jogo ---------------- */

function finishMatch() {
  const { ctrl, home, away } = M;
  const hs = ctrl.score[0];
  const as = ctrl.score[1];
  const stats = ctrl.stats;
  const poss = ctrl.possession();

  $("end-flag-h").textContent = home.flag;
  $("end-code-h").textContent = home.code;
  $("end-flag-a").textContent = away.flag;
  $("end-code-a").textContent = away.code;
  $("end-score").textContent = `${hs} × ${as}`;

  const rows = [
    ["Chutes", stats.shots], ["No gol", stats.onTarget], ["Defesas", stats.saves],
    ["Traves", stats.posts], ["Tabelas", stats.walls], ["Posse %", poss],
  ];
  $("end-stats").replaceChildren(...rows.map(([label, v]) => {
    const d = document.createElement("div");
    d.innerHTML = `<b>${v[0]}</b><span>${label}</span><b>${v[1]}</b>`;
    return d;
  }));

  $("end-scorers").replaceChildren(...stats.scorers.map((s) => {
    const li = document.createElement("li");
    const flag = (s.team === 0 ? home : away).flag;
    li.innerHTML = `<b>${s.minute}'</b>${flag} ${escapeHtml(s.name)} <span style="color:var(--dust)">camisa ${s.shirt}</span>`;
    return li;
  }));

  // Recompensas: mesma fórmula do jogo original; treino não rende nada.
  const reward = $("end-reward");
  if (M.settings.training) {
    reward.textContent = "";
  } else {
    const won = hs > as;
    const xpGain = 30 + hs * 18 + (won ? 60 : 0);
    const coinGain = 20 + hs * 12 + (won ? 45 : 0);
    state.xp += xpGain;
    state.coins += coinGain;
    state.played += 1;
    if (won) state.wins += 1;
    saveState();
    reward.textContent = `+${xpGain} XP · +${coinGain} moedas`;
  }

  setTimeout(() => { if (M) $("ov-end").hidden = false; }, 1200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

$("end-again").addEventListener("click", () => startMatch());
$("end-pre").addEventListener("click", () => { teardownMatch(); show("prematch"); });
$("end-menu").addEventListener("click", () => { teardownMatch(); show("menu"); });

/* ---------------- Entrada: arrastar para petelecar ---------------- */

canvas.addEventListener("pointerdown", (e) => {
  if (!M || M.paused) return;
  const { ctrl, rend, audio } = M;
  canvas.setPointerCapture?.(e.pointerId);
  audio.start();
  if (ctrl.phase !== "aim") return;
  const id = rend.pickBody(e.clientX, e.clientY, ctrl.world);
  if (id) {
    const b = ctrl.world.bodies.find((x) => x.id === id);
    if (b && b.team === 0) ctrl.selectBody(id);
  }
  ctrl.autoSelect();
  const f = rend.screenToField(e.clientX, e.clientY);
  if (!f) return;
  M.drag = { fx: f.x, fy: f.y, moved: false };
});

canvas.addEventListener("pointermove", (e) => {
  if (!M || !M.drag || M.ctrl.phase !== "aim") return;
  const { ctrl, rend, drag } = M;
  const f = rend.screenToField(e.clientX, e.clientY);
  if (!f) return;
  const dx = f.x - drag.fx;
  const dy = f.y - drag.fy;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.012) return;
  drag.moved = true;
  const power = Math.min(1, dist / 0.38); // 0,38 m de arrasto = 100% de força
  const dirX = dx / dist;
  const dirY = dy / dist;
  const bodyId = ctrl.selectedId;
  if (!bodyId) return;
  let prediction = null;
  if (M.predict) {
    try {
      prediction = predictShot(ctrl.world, bodyId, { x: dirX, y: dirY }, power, M.spin, 210);
    } catch {
      prediction = null;
    }
  }
  M.aim = { bodyId, dirX, dirY, power, spin: M.spin, prediction };
});

function endDrag(e) {
  canvas.releasePointerCapture?.(e.pointerId);
  if (!M) return;
  const { ctrl, drag, aim, audio } = M;
  M.drag = null;
  M.aim = null;
  if (!drag || !aim || !drag.moved || ctrl.phase !== "aim") return;
  audio.start();
  audio.click(aim.power);
  ctrl.playerShoot({ x: aim.dirX, y: aim.dirY }, aim.power, M.spin);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

window.addEventListener("resize", () => M?.rend.resize());
window.addEventListener("orientationchange", () => setTimeout(() => M?.rend.resize(), 200));

/* ------------------------------------------------------------------ */

renderMenu();
