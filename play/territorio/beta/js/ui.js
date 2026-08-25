// ============================================================
// ZYRO — UI.JS
// Liga os botões do HTML (menu, pause, painéis) ao estado do jogo.
// Igual ao núcleo do Complexo, com um acréscimo: mostra em qual
// piso o player está no painel de personagem.
// ============================================================

(() => {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function showPanel(el) {
    if (el) el.classList.remove("hidden");
  }

  function hidePanel(el) {
    if (el) el.classList.add("hidden");
  }

  // Metade da altura de piso (ver CONFIG.floors.height no game.js) —
  // usado só pra decidir se mostra "Térreo" ou "1º Piso" no painel.
  const FLOOR_SPLIT_Y = 2.2;

  window.addEventListener("load", () => {

    const loadingScreen = $("loading-screen");
    const pauseScreen = $("pause-screen");
    const mainMenu = $("main-menu");
    const playerPanel = $("player-panel");

    if (loadingScreen) {
      setTimeout(() => hidePanel(loadingScreen), 300);
    }

    $("menu-button")?.addEventListener("click", () => {
      showPanel(mainMenu);
      if (window.ZYRO && !window.ZYRO.paused) window.ZYRO.pause();
    });

    $("pause-button")?.addEventListener("click", () => {
      const paused = window.ZYRO ? window.ZYRO.pause() : true;
      if (paused) {
        showPanel(pauseScreen);
      } else {
        hidePanel(pauseScreen);
      }
    });

    $("resume-button")?.addEventListener("click", () => {
      if (window.ZYRO && window.ZYRO.paused) window.ZYRO.pause();
      hidePanel(pauseScreen);
    });

    $("character-button")?.addEventListener("click", () => {
      hidePanel(pauseScreen);
      showPanel(playerPanel);
    });

    $("close-player-panel")?.addEventListener("click", () => {
      hidePanel(playerPanel);
    });

    $("close-main-menu")?.addEventListener("click", () => {
      hidePanel(mainMenu);
      if (window.ZYRO && window.ZYRO.paused) window.ZYRO.pause();
    });

    $("main-menu")?.querySelectorAll("[data-menu]").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.menu;
        if (target === "continue") {
          hidePanel(mainMenu);
          if (window.ZYRO && window.ZYRO.paused) window.ZYRO.pause();
        } else if (target === "character") {
          hidePanel(mainMenu);
          showPanel(playerPanel);
        }
      });
    });

    setInterval(() => {
      if (!window.ZYRO || !window.ZYRO.player) return;
      if (!playerPanel || playerPanel.classList.contains("hidden")) return;

      const p = window.ZYRO.player;

      const posEl = $("character-position");
      if (posEl) {
        posEl.textContent = `${p.x.toFixed(1)} / ${p.z.toFixed(1)}`;
      }

      const floorEl = $("character-floor");
      if (floorEl) {
        floorEl.textContent = p.y > FLOOR_SPLIT_Y ? "1º Piso" : "Térreo";
      }
    }, 300);

  });

})();