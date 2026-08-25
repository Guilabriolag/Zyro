/* ============================================================
   ZYRO — STYLE.CSS
   Interface do container do jogo
   Compatível com game.js v18
   ============================================================ */

:root {
  --bg: #0b0e14;
  --panel: rgba(16, 20, 28, 0.94);
  --panel-soft: rgba(16, 20, 28, 0.78);

  --border: #26344a;
  --border-soft: rgba(95, 208, 160, 0.28);

  --accent: #5fd0a0;
  --accent-soft: rgba(95, 208, 160, 0.18);

  --text: #c9d3e0;
  --muted: #6c7891;

  --danger: #e0705f;
}

/* ============================================================
   RESET
   ============================================================ */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;

  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

html,
body {
  width: 100%;
  height: 100%;

  overflow: hidden;

  background: var(--bg);

  font-family:
    "SF Mono",
    "JetBrains Mono",
    "Courier New",
    monospace;

  color: var(--text);

  touch-action: none;
  overscroll-behavior: none;
}

/* ============================================================
   CONTAINER PRINCIPAL
   ============================================================ */

#game-shell {
  position: fixed;
  inset: 0;

  width: 100vw;
  height: 100vh;

  overflow: hidden;

  background: var(--bg);
}

/* ============================================================
   CANVAS THREE.JS
   ============================================================ */

#zyro-canvas {
  position: absolute;

  inset: 0;

  display: block;

  width: 100%;
  height: 100%;

  outline: none;

  touch-action: none;

  z-index: 1;
}

/* ============================================================
   HUD SUPERIOR
   ============================================================ */

#hud-top {
  position: fixed;

  top: 0;
  left: 0;
  right: 0;

  z-index: 10;

  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  padding:
    max(14px, env(safe-area-inset-top))
    16px
    10px;

  pointer-events: none;
}

#hud-title {
  font-size: 11px;

  letter-spacing: 0.14em;

  text-transform: uppercase;

  color: var(--muted);

  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.7);
}

#hud-title b {
  color: var(--accent);

  font-weight: 600;
}

#hud-coords {
  font-size: 11px;

  line-height: 1.5;

  text-align: right;

  color: var(--muted);

  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.7);
}

#hud-coords span {
  color: var(--text);
}

/* ============================================================
   BOTÃO DE PAUSE / MENU
   ============================================================ */

#pause-btn {
  position: fixed;

  top:
    max(14px, env(safe-area-inset-top));

  right: 16px;

  z-index: 20;

  width: 42px;
  height: 42px;

  border-radius: 50%;

  border: 1px solid var(--border);

  background: var(--panel-soft);

  color: var(--accent);

  font-family: inherit;

  font-size: 13px;

  backdrop-filter: blur(8px);

  cursor: pointer;

  pointer-events: auto;
}

#pause-btn:active {
  background: var(--accent-soft);

  transform: scale(0.96);
}

/* ============================================================
   JOYSTICK
   ============================================================ */

#joy-zone {
  position: fixed;

  left: 0;
  bottom: 0;

  z-index: 15;

  width: min(220px, 44vw);
  height: min(220px, 44vw);

  margin:
    0
    0
    max(24px, env(safe-area-inset-bottom))
    24px;

  border-radius: 50%;

  touch-action: none;

  pointer-events: auto;
}

#joy-base {
  position: absolute;

  inset: 0;

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      rgba(95, 208, 160, 0.04),
      rgba(255, 255, 255, 0.015)
    );

  border: 1px solid var(--border);

  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.18),
    0 4px 20px rgba(0, 0, 0, 0.18);

  backdrop-filter: blur(4px);

  pointer-events: none;
}

#joy-knob {
  position: absolute;

  left: 29%;
  top: 29%;

  width: 42%;
  height: 42%;

  border-radius: 50%;

  background: var(--accent-soft);

  border: 1px solid var(--accent);

  box-shadow:
    0 0 18px rgba(95, 208, 160, 0.12);

  transform: translate(0, 0);

  transition: transform 0.04s linear;

  pointer-events: none;
}

/* ============================================================
   ÁREA DOS BOTÕES DE AÇÃO
   ============================================================ */

#action-controls {
  position: fixed;

  right: 0;
  bottom: 0;

  z-index: 15;

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 14px;

  margin:
    0
    24px
    max(30px, env(safe-area-inset-bottom))
    0;

  pointer-events: auto;
}

/* ============================================================
   BOTÃO DE PULO
   ============================================================ */

#jump-btn,
#action-btn {
  width: 64px;
  height: 64px;

  border-radius: 50%;

  background: var(--panel);

  border: 1px solid var(--accent);

  color: var(--accent);

  font-family: inherit;

  font-size: 10px;

  letter-spacing: 0.06em;

  text-transform: uppercase;

  cursor: pointer;

  backdrop-filter: blur(8px);

  box-shadow:
    0 5px 20px rgba(0, 0, 0, 0.25);

  touch-action: manipulation;
}

#jump-btn:active,
#action-btn:active {
  background: var(--accent-soft);

  transform: scale(0.94);
}

/* ============================================================
   CASO OS BOTÕES NÃO ESTEJAM DENTRO DE #action-controls
   ============================================================ */

#jump-btn {
  position: fixed;

  right: 104px;

  bottom:
    max(30px, env(safe-area-inset-bottom));

  z-index: 15;
}

#action-btn {
  position: fixed;

  right: 24px;

  bottom:
    max(30px, env(safe-area-inset-bottom));

  z-index: 15;
}

/*
   Se o HTML colocar os dois dentro de #action-controls,
   estas regras de position ainda funcionam de forma segura
   para a primeira versão.
*/

/* ============================================================
   PAINEL LATERAL
   ============================================================ */

#panel-toggle {
  position: fixed;

  top:
    max(14px, env(safe-area-inset-top));

  left: 50%;

  transform: translateX(-50%);

  z-index: 20;

  padding: 8px 16px;

  border-radius: 20px;

  border: 1px solid var(--border);

  background: var(--panel);

  color: var(--text);

  font-family: inherit;

  font-size: 11px;

  letter-spacing: 0.08em;

  text-transform: uppercase;

  cursor: pointer;

  pointer-events: auto;

  backdrop-filter: blur(8px);
}

#panel-toggle:active {
  background: var(--accent-soft);
}

/* ============================================================
   PAINEL
   ============================================================ */

#panel {
  position: fixed;

  top: 0;
  right: 0;

  z-index: 30;

  width: min(300px, 82vw);
  height: 100%;

  padding:
    max(20px, env(safe-area-inset-top))
    16px
    max(16px, env(safe-area-inset-bottom));

  overflow-y: auto;

  background: var(--panel);

  border-left: 1px solid var(--border);

  backdrop-filter: blur(10px);

  transform: translateX(100%);

  transition:
    transform 0.25s ease;

  pointer-events: auto;
}

#panel.open {
  transform: translateX(0);
}

#panel h2 {
  display: flex;

  justify-content: space-between;
  align-items: center;

  margin: 0 0 14px;

  color: var(--muted);

  font-size: 12px;

  letter-spacing: 0.12em;

  text-transform: uppercase;
}

#panel h2 button {
  border: 0;

  background: transparent;

  color: var(--muted);

  font-family: inherit;

  font-size: 18px;

  cursor: pointer;
}

/* ============================================================
   ENTIDADES
   ============================================================ */

.entity-row {
  display: flex;

  align-items: center;

  gap: 10px;

  padding: 10px 0;

  border-bottom: 1px solid var(--border);

  font-size: 12px;
}

.entity-dot {
  width: 10px;
  height: 10px;

  flex-shrink: 0;

  border-radius: 2px;
}

.entity-info {
  flex: 1;

  min-width: 0;
}

.entity-info b {
  display: block;

  color: var(--text);

  font-size: 12px;
}

.entity-info span {
  display: block;

  color: var(--muted);

  font-size: 10px;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;
}

.entity-remove {
  padding: 4px 8px;

  border: 1px solid var(--danger);

  border-radius: 6px;

  background: transparent;

  color: var(--danger);

  font-family: inherit;

  font-size: 10px;

  cursor: pointer;
}

.empty-note {
  padding: 12px 0;

  color: var(--muted);

  font-size: 11px;

  line-height: 1.6;
}

/* ============================================================
   LISTA DE SPAWN
   ============================================================ */

#spawn-list {
  margin-top: 20px;
}

.spawn-btn {
  width: 100%;

  display: flex;

  align-items: center;

  gap: 10px;

  margin-bottom: 8px;

  padding: 10px 12px;

  border: 1px solid var(--border);

  border-radius: 8px;

  background: rgba(255, 255, 255, 0.025);

  color: var(--text);

  font-family: inherit;

  font-size: 12px;

  text-align: left;

  cursor: pointer;
}

.spawn-btn:active {
  background: var(--accent-soft);

  border-color: var(--accent);
}

/* ============================================================
   PAINEL DE PAUSE
   ============================================================ */

#pause-overlay {
  position: fixed;

  inset: 0;

  z-index: 40;

  display: none;

  align-items: center;

  justify-content: center;

  background: rgba(5, 8, 12, 0.58);

  backdrop-filter: blur(5px);

  pointer-events: auto;
}

#pause-overlay.show {
  display: flex;
}

#pause-card {
  width: min(340px, 82vw);

  padding: 24px;

  border: 1px solid var(--border);

  border-radius: 14px;

  background: var(--panel);

  text-align: center;

  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.35);
}

#pause-card h2 {
  margin-bottom: 8px;

  color: var(--accent);

  font-size: 16px;

  letter-spacing: 0.08em;

  text-transform: uppercase;
}

#pause-card p {
  color: var(--muted);

  font-size: 11px;

  line-height: 1.6;
}

/* ============================================================
   TOAST / EVENTOS
   ============================================================ */

#event-toast {
  position: fixed;

  left: 50%;
  bottom:
    max(150px, calc(env(safe-area-inset-bottom) + 150px));

  z-index: 25;

  max-width: 82vw;

  padding: 10px 16px;

  border: 1px solid var(--border);

  border-radius: 8px;

  background: var(--panel);

  color: var(--text);

  font-size: 11px;

  text-align: center;

  opacity: 0;

  pointer-events: none;

  transform:
    translateX(-50%)
    translateY(20px);

  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

#event-toast.show {
  opacity: 1;

  transform:
    translateX(-50%)
    translateY(0);
}

#event-toast b {
  color: var(--accent);
}

/* ============================================================
   ESTADO PAUSADO
   ============================================================ */

body.paused #joy-zone,
body.paused #jump-btn,
body.paused #action-btn {
  opacity: 0.45;
}

/* ============================================================
   MOBILE
   ============================================================ */

@media (max-width: 700px) {

  #hud-title {
    font-size: 9px;
  }

  #hud-coords {
    font-size: 9px;
  }

  #panel {
    width: min(320px, 88vw);
  }

  #joy-zone {
    width: min(190px, 42vw);
    height: min(190px, 42vw);

    margin-left: 18px;
  }

  #jump-btn {
    right: 96px;
  }

  #action-btn {
    right: 18px;
  }

}

/* ============================================================
   TELAS MUITO PEQUENAS
   ============================================================ */

@media (max-height: 520px) {

  #joy-zone {
    width: 145px;
    height: 145px;

    margin-bottom: 14px;
  }

  #jump-btn,
  #action-btn {
    width: 54px;
    height: 54px;

    bottom: 18px;
  }

  #jump-btn {
    right: 88px;
  }

  #action-btn {
    right: 16px;
  }

}

/* ============================================================
   DESKTOP
   ============================================================ */

@media (min-width: 1000px) {

  #joy-zone {
    width: 180px;
    height: 180px;
  }

  #jump-btn,
  #action-btn {
    width: 58px;
    height: 58px;
  }

}

/* ============================================================
   ACESSIBILIDADE / REDUÇÃO DE MOVIMENTO
   ============================================================ */

@media (prefers-reduced-motion: reduce) {

  #panel,
  #event-toast,
  #joy-knob {
    transition: none;
  }

}