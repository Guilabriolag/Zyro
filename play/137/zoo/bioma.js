// ============================================================
// ZYRO — BIOMA.JS
// Ao sair do zoológico com uma Cria adquirida, o player é levado
// pro bioma dela. Ali tem dois modos:
//  - Convivência: player 3D e Cria 3D no mesmo espaço
//  - Observação: a Cria fica numa redoma/jaula, e aparecem os
//    "estímulos vitais" (batimento, fome, energia) — instrumentação,
//    não HUD de jogo.
// Vitais aqui são simulados (sem IA ainda), só pra "sentir que tem
// vida ali", como já foi combinado pro primeiro experimento.
// ============================================================

(() => {
  "use strict";

  const BIOMA_DEFS = {
    drone: { floorColor: 0x9fd8e0, skyColor: 0xbfe9ee, label: "Bioma aéreo" },
    terra: { floorColor: 0xb98f5a, skyColor: 0xe0c79a, label: "Bioma terrestre" },
    agua: { floorColor: 0x2f6fa8, skyColor: 0x8fc4e6, label: "Bioma aquático" }
  };

  let active = false;
  let currentSpecies = null;
  let biomaGroup = null;
  let criaMesh = null;
  let jaulaGroup = null;
  let observando = false;

  const vitals = { batimento: 72, fome: 80, energia: 70, vinculo: 10 };

  function buildBioma(speciesKey) {
    const def = BIOMA_DEFS[speciesKey];
    const group = new THREE.Group();
    group.name = "ZYRO_BIOMA";

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: def.floorColor, roughness: 0.85 })
    );
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    group.add(floor);

    if (speciesKey === "agua") {
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 14, 0.05, 32),
        new THREE.MeshStandardMaterial({ color: 0x1c5f96, transparent: true, opacity: 0.75, roughness: 0.2 })
      );
      water.position.y = 0.05;
      group.add(water);
    }

    // casinha da Cria
    const casinha = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.8 })
    );
    casinha.rotation.y = Math.PI / 4;
    casinha.position.set(-5, 0.8, -3);
    group.add(casinha);

    return group;
  }

  function buildJaula() {
    const group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(1.3, 1.3, 1.8, 16, 1, true);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9dffe0, transparent: true, opacity: 0.18,
      metalness: 0.2, roughness: 0.1, side: THREE.DoubleSide
    });
    const redoma = new THREE.Mesh(geo, mat);
    redoma.position.y = 0.9;
    group.add(redoma);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.15, 20),
      new THREE.MeshStandardMaterial({ color: 0x2c333a, metalness: 0.5, roughness: 0.4 })
    );
    group.add(base);
    return group;
  }

  function activate(speciesKey) {
    const ZYRO = window.ZYRO;
    const SPECIES = window.ZYRO_SPECIES;
    if (!ZYRO || !SPECIES || !ZYRO.scene) return;

    currentSpecies = speciesKey;
    active = true;

    // esconde o mundo do zoológico
    if (window.ZYRO_WORLD) window.ZYRO_WORLD.visible = false;

    // monta (ou reaproveita) o grupo do bioma
    if (!biomaGroup) {
      biomaGroup = buildBioma(speciesKey);
      ZYRO.scene.add(biomaGroup);

      criaMesh = SPECIES[speciesKey].buildMesh(1.6);
      criaMesh.position.set(2, 0.6, -1);
      biomaGroup.add(criaMesh);

      jaulaGroup = buildJaula();
      jaulaGroup.position.set(2, 0, -1);
      jaulaGroup.visible = false;
      biomaGroup.add(jaulaGroup);
    }

    // teleporta o player pro centro do bioma
    ZYRO.player.x = 0;
    ZYRO.player.z = 4;
    ZYRO.player.y = 0;

    document.getElementById("bioma-hud")?.classList.remove("hidden");
    document.getElementById("bioma-label").textContent =
      `${BIOMA_DEFS[speciesKey].label} — ${SPECIES[speciesKey].name}`;

    const toastEl = document.getElementById("event-toast");
    if (toastEl) {
      toastEl.textContent = `Bem-vindo ao bioma de ${SPECIES[speciesKey].name}.`;
      toastEl.classList.add("show");
      setTimeout(() => toastEl.classList.remove("show"), 2600);
    }
  }

  function setObservando(v) {
    observando = v;
    if (criaMesh) criaMesh.visible = !v;
    if (jaulaGroup) {
      jaulaGroup.visible = v;
      if (v && criaMesh) {
        // move a Cria (invisível) pra dentro da redoma visualmente,
        // e desenha uma versão mini dela dentro da jaula
        if (!jaulaGroup.userData.mini) {
          const mini = window.ZYRO_SPECIES[currentSpecies].buildMesh(0.8);
          mini.position.y = 0.9;
          jaulaGroup.add(mini);
          jaulaGroup.userData.mini = mini;
        }
      }
    }
    document.getElementById("vitals-panel")?.classList.toggle("hidden", !v);
  }

  function feed() {
    vitals.fome = Math.min(100, vitals.fome + 20);
    vitals.vinculo = Math.min(100, vitals.vinculo + 3);
    flashToast("Você alimentou sua Cria.");
  }

  function pet() {
    vitals.vinculo = Math.min(100, vitals.vinculo + 6);
    vitals.energia = Math.min(100, vitals.energia + 4);
    flashToast("Sua Cria reage ao carinho.");
  }

  function sleep() {
    vitals.energia = Math.min(100, vitals.energia + 30);
    flashToast("Sua Cria foi dormir um pouco.");
  }

  function flashToast(msg) {
    const el = document.getElementById("event-toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(flashToast._t);
    flashToast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // ==========================================================
  // LOOP DE VITAIS + ANIMAÇÃO IDLE DA CRIA NO BIOMA
  // ==========================================================

  function loop() {
    requestAnimationFrame(loop);
    if (!active) return;

    const t = performance.now() / 1000;

    // decaimento lento de fome/energia, batimento com leve ruído
    vitals.fome = Math.max(0, vitals.fome - 0.01);
    vitals.energia = Math.max(0, vitals.energia - 0.006);
    vitals.batimento = 70 + Math.sin(t * 1.3) * 6 + (100 - vitals.energia) * 0.05;

    if (criaMesh && criaMesh.visible) {
      criaMesh.position.y = 0.6 + Math.sin(t * 1.4) * 0.06;
      criaMesh.rotation.y = t * 0.4;
    }
    if (jaulaGroup && jaulaGroup.userData.mini) {
      jaulaGroup.userData.mini.rotation.y = t * 0.5;
    }

    if (observando) {
      const set = (id, v, unit = "") => {
        const el = document.getElementById(id);
        if (el) el.textContent = Math.round(v) + unit;
      };
      set("vital-batimento", vitals.batimento, " bpm");
      set("vital-fome", vitals.fome, "%");
      set("vital-energia", vitals.energia, "%");
      set("vital-vinculo", vitals.vinculo, "%");
    }
  }
  requestAnimationFrame(loop);

  window.ZYRO_BIOMA = {
    activate,
    isActive: () => active,
    setObservando,
    feed,
    pet,
    sleep
  };

})();
