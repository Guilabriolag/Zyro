// ============================================================
// ZYRO — ZOOLOGICO-UI.JS
// Liga os botões da HUD do bioma (alimentar/brincar/dormir/observar)
// às funções de js/bioma.js.
// ============================================================

(() => {
  "use strict";

  window.addEventListener("load", () => {
    const $ = id => document.getElementById(id);

    $("bioma-feed")?.addEventListener("click", () => window.ZYRO_BIOMA?.feed());
    $("bioma-pet")?.addEventListener("click", () => window.ZYRO_BIOMA?.pet());
    $("bioma-sleep")?.addEventListener("click", () => window.ZYRO_BIOMA?.sleep());

    let observando = false;
    $("bioma-observe")?.addEventListener("click", () => {
      observando = !observando;
      window.ZYRO_BIOMA?.setObservando(observando);
      $("bioma-observe").textContent = observando ? "Conviver" : "Observar";
    });
  });

})();
