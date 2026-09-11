// ============================================================
// ZYRO — POI.JS (Shopping)
// Detecta proximidade do player com os pontos de interesse (POIs)
// definidos em world.js (window.ZYRO_POINTS_OF_INTEREST) e
// atualiza o HUD de interação (#interaction-title etc).
//
// Placeholder "em_breve": ainda não abre nenhuma sala/loja real —
// só sinaliza que ali vai existir uma interação futura. Quando um
// POI virar real, basta trocar seu "status" pra outro valor e
// tratar esse caso aqui (ex: abrir uma room de chat).
// ============================================================

(() => {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function distance2D(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function findNearestPOI(px, pz) {
    const points = window.ZYRO_POINTS_OF_INTEREST || [];
    let nearest = null;
    let nearestDist = Infinity;

    points.forEach(poi => {
      const d = distance2D(px, pz, poi.x, poi.z);
      if (d <= poi.radius && d < nearestDist) {
        nearest = poi;
        nearestDist = d;
      }
    });

    return nearest;
  }

  window.addEventListener("load", () => {
    const icon = $("interaction-icon");
    const title = $("interaction-title");
    const description = $("interaction-description");

    setInterval(() => {
      if (!window.ZYRO || !window.ZYRO.player) return;

      const p = window.ZYRO.player;
      const poi = findNearestPOI(p.x, p.z);

      if (!poi) {
        if (icon) icon.textContent = "•";
        if (title) title.textContent = "Nada por perto";
        if (description) description.textContent = "Explore o shopping";
        return;
      }

      if (icon) icon.textContent = poi.type === "convivio" ? "🪑" : "🏪";
      if (title) title.textContent = poi.name;
      if (description) {
        description.textContent =
          poi.status === "em_breve" ? "Em breve" : "Toque para interagir";
      }
    }, 150);
  });

})();
