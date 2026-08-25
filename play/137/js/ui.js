// ============================================================
// ZYRO — UI.JS
// Liga os botões do HTML (menu, pause, painéis) ao estado do jogo.
// Antes, esses botões existiam no HTML mas não tinham nenhum
// listener — cliques neles não faziam nada.
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

  window.addEventListener("load", () => {

    const loadingScreen = $("loading-screen");
    const pauseScreen = $("pause-screen");
    const mainMenu = $("main-menu");
    const playerPanel = $("player-panel");

    // Esconde a tela de loading assim que tudo carregou
    if (loadingScreen) {
      setTimeout(() => hidePanel(loadingScreen), 300);
    }

    // Botão de menu (hambúrguer) abre o menu principal e pausa
    $("menu-button")?.addEventListener("click", () => {
      showPanel(mainMenu);
      if (window.ZYRO && !window.ZYRO.paused) window.ZYRO.pause();
    });

    // Botão de pause (ícone II) alterna pause + abre a tela de pause
    $("pause-button")?.addEventListener("click", () => {
      const paused = window.ZYRO ? window.ZYRO.pause() : true;
      if (paused) {
        showPanel(pauseScreen);
      } else {
        hidePanel(pauseScreen);
      }
    });

    // Botão continuar (na tela de pause)
    $("resume-button")?.addEventListener("click", () => {
      if (window.ZYRO && window.ZYRO.paused) window.ZYRO.pause();
      hidePanel(pauseScreen);
    });

    // Painel de personagem
    $("character-button")?.addEventListener("click", () => {
      hidePanel(pauseScreen);
      showPanel(playerPanel);
    });

    $("close-player-panel")?.addEventListener("click", () => {
      hidePanel(playerPanel);
    });

    // Fechar menu principal
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

    // Atualiza posição do personagem no painel, se estiver aberto
    setInterval(() => {
      if (!window.ZYRO || !window.ZYRO.player) return;
      const posEl = $("character-position");
      if (posEl && playerPanel && !playerPanel.classList.contains("hidden")) {
        const p = window.ZYRO.player;
        posEl.textContent = `${p.x.toFixed(1)} / ${p.z.toFixed(1)}`;
      }
    }, 300);

  });

})();
