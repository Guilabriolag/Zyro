// ============================================================
// ZYRO — ENTITIES.JS (Zoológico)
// Define as 3 espécies de Cria, coloca uma de cada nos estandes,
// e resolve a interação por proximidade (botão "Interagir").
// Não depende de IA: cada Cria só tem um estado simples e reage
// a estímulo (perto = curiosa, interação = reage).
// ============================================================

(() => {
  "use strict";

  // ==========================================================
  // ESPÉCIES
  // archetype/states/transitions no mesmo espírito dos JSONs de
  // entidade (identity, archetype, states, capabilities) — aqui
  // simplificado direto em JS pra rodar sem um loader de arquivos.
  // ==========================================================

  const SPECIES = {
    drone: {
      id: "ent.cria.drone.001",
      name: "Vórtice",
      archetype: "cria_drone",
      descricao: "um pequeno organismo-drone que ainda não sabe voar direito",
      color: 0x5fd0e0,
      buildMesh(scale = 1) {
        const g = new THREE.Group();
        const corpo = new THREE.Mesh(
          new THREE.SphereGeometry(0.32 * scale, 12, 10),
          new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.4, metalness: 0.2 })
        );
        g.add(corpo);
        const anel = new THREE.Mesh(
          new THREE.TorusGeometry(0.5 * scale, 0.05 * scale, 8, 20),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
        );
        anel.rotation.x = Math.PI / 2;
        g.add(anel);
        return g;
      }
    },
    terra: {
      id: "ent.cria.terra.001",
      name: "Tromba",
      archetype: "cria_terrestre",
      descricao: "uma criatura terrestre atarracada, gosta de puxar e carregar coisas",
      color: 0xd68a4c,
      buildMesh(scale = 1) {
        const g = new THREE.Group();
        const corpo = new THREE.Mesh(
          new THREE.BoxGeometry(0.6 * scale, 0.4 * scale, 0.9 * scale),
          new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.75 })
        );
        corpo.position.y = 0.25 * scale;
        g.add(corpo);
        [[-0.22, -0.32], [0.22, -0.32], [-0.22, 0.32], [0.22, 0.32]].forEach(([x, z]) => {
          const perna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.3 * scale, 8),
            new THREE.MeshStandardMaterial({ color: 0x6b5030, roughness: 0.8 })
          );
          perna.position.set(x * scale, 0.05 * scale, z * scale);
          g.add(perna);
        });
        return g;
      }
    },
    agua: {
      id: "ent.cria.agua.001",
      name: "Ondina",
      archetype: "cria_aquatica",
      descricao: "uma criatura que mergulha e desliza sobre a água",
      color: 0x4c8fd6,
      buildMesh(scale = 1) {
        const g = new THREE.Group();
        const corpo = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.22 * scale, 0.5 * scale, 6, 10),
          new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.3, metalness: 0.1 })
        );
        corpo.rotation.z = Math.PI / 2;
        g.add(corpo);
        const nadadeira = new THREE.Mesh(
          new THREE.ConeGeometry(0.18 * scale, 0.3 * scale, 8),
          new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.3 })
        );
        nadadeira.position.set(0, 0.2 * scale, -0.35 * scale);
        g.add(nadadeira);
        return g;
      }
    }
  };

  window.ZYRO_SPECIES = SPECIES;

  // ==========================================================
  // ESTADO DO ZOOLÓGICO
  // ==========================================================

  const ZOO_STATE = {
    acquiredSpecies: null, // "drone" | "terra" | "agua" | null
    viewed: { drone: false, terra: false, agua: false }
  };
  window.ZOO_STATE = ZOO_STATE;

  // ==========================================================
  // COLOCA UMA CRIA EM CADA PEDESTAL DO ESTANDE
  // ==========================================================

  const criaMeshes = {};

  function placeCriasAtStands() {
    const stands = window.ZYRO_STANDS;
    const worldGroup = window.ZYRO_WORLD;
    if (!stands || !worldGroup) return;

    Object.keys(SPECIES).forEach(key => {
      const stand = stands[key];
      const species = SPECIES[key];
      const mesh = species.buildMesh(1.4);
      mesh.position.set(stand.x, 0.5, stand.z);
      mesh.userData.baseY = 0.5;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      mesh.name = `cria_estande_${key}`;
      worldGroup.add(mesh);
      criaMeshes[key] = mesh;
    });
  }

  if (window.ZYRO_WORLD) {
    placeCriasAtStands();
  } else {
    window.addEventListener("zyro:game-ready", () => setTimeout(placeCriasAtStands, 0), { once: true });
  }

  // ==========================================================
  // TOAST DE EVENTO (reaproveita #event-toast do index.html)
  // ==========================================================

  function toast(msg, ms = 2600) {
    const el = document.getElementById("event-toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), ms);
  }

  // ==========================================================
  // INTERAÇÃO POR PROXIMIDADE
  // ==========================================================

  const INTERACT_RADIUS = 3.2;

  function getInteractables() {
    const stands = window.ZYRO_STANDS;
    const exit = window.ZYRO_EXIT;
    const list = [];

    Object.keys(SPECIES).forEach(key => {
      const stand = stands[key];
      const species = SPECIES[key];
      list.push({
        x: stand.x, z: stand.z,
        title: species.name,
        description: ZOO_STATE.acquiredSpecies === key
          ? "Já é sua Cria"
          : (ZOO_STATE.acquiredSpecies ? "Você já adquiriu uma Cria" : "Interagir para observar"),
        onInteract() {
          if (ZOO_STATE.acquiredSpecies === key) {
            toast(`${species.name} já é sua — vocês já se conhecem.`);
            return;
          }
          if (ZOO_STATE.acquiredSpecies) {
            toast("Você já tem uma Cria. Só pode adquirir uma por vez, por enquanto.");
            return;
          }
          if (!ZOO_STATE.viewed[key]) {
            ZOO_STATE.viewed[key] = true;
            toast(`${species.name}: ${species.descricao}. Interaja de novo pra adquirir.`);
            return;
          }
          ZOO_STATE.acquiredSpecies = key;
          toast(`Você adquiriu ${species.name}! Vá até a saída pro bioma dela.`);
          updateAcquiredChip();
        }
      });
    });

    list.push({
      x: exit.x, z: exit.z,
      title: "Saída",
      description: ZOO_STATE.acquiredSpecies ? "Ir para o bioma da sua Cria" : "Adquira uma Cria antes de sair",
      onInteract() {
        if (!ZOO_STATE.acquiredSpecies) {
          toast("Adquira uma Cria em algum estande antes de sair.");
          return;
        }
        if (window.ZYRO_BIOMA && window.ZYRO_BIOMA.activate) {
          window.ZYRO_BIOMA.activate(ZOO_STATE.acquiredSpecies);
        }
      }
    });

    return list;
  }

  function updateAcquiredChip() {
    const chip = document.getElementById("acquired-chip");
    if (!chip) return;
    if (ZOO_STATE.acquiredSpecies) {
      const species = SPECIES[ZOO_STATE.acquiredSpecies];
      chip.textContent = `Sua Cria: ${species.name}`;
      chip.classList.remove("hidden");
    } else {
      chip.classList.add("hidden");
    }
  }

  // ==========================================================
  // LOOP — checa proximidade, atualiza HUD, consome input.action,
  // anima Crias dos estandes e o NPC guia
  // ==========================================================

  function loop() {
    requestAnimationFrame(loop);

    const ZYRO = window.ZYRO;
    if (!ZYRO || !ZYRO.player) return;

    // animação idle das Crias dos estandes
    const t = performance.now() / 1000;
    Object.values(criaMeshes).forEach(mesh => {
      mesh.position.y = mesh.userData.baseY + Math.sin(t * 1.6 + mesh.userData.phase) * 0.08;
      mesh.rotation.y = t * 0.6 + mesh.userData.phase;
    });

    // NPC guia patrulhando
    const npc = window.ZYRO_NPC;
    if (npc) {
      npc.progress += npc.speed * npc.dir * (1 / 60);
      if (npc.progress > 1) { npc.progress = 1; npc.dir = -1; }
      if (npc.progress < 0) { npc.progress = 0; npc.dir = 1; }
      const x = npc.a.x + (npc.b.x - npc.a.x) * npc.progress;
      npc.mesh.position.x = x;
      npc.mesh.rotation.y = npc.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    // se já estamos no bioma, este loop de estandes não faz proximidade do zoo
    if (window.ZYRO_BIOMA && window.ZYRO_BIOMA.isActive && window.ZYRO_BIOMA.isActive()) {
      ZYRO.input.action = false;
      return;
    }

    const player = ZYRO.player;
    const interactables = getInteractables();

    let nearest = null;
    let nearestDist = Infinity;
    interactables.forEach(i => {
      const d = Math.hypot(player.x - i.x, player.z - i.z);
      if (d < INTERACT_RADIUS && d < nearestDist) {
        nearest = i;
        nearestDist = d;
      }
    });

    const titleEl = document.getElementById("interaction-title");
    const descEl = document.getElementById("interaction-description");

    if (nearest) {
      if (titleEl) titleEl.textContent = nearest.title;
      if (descEl) descEl.textContent = nearest.description;
      if (ZYRO.input.action) {
        nearest.onInteract();
      }
    } else {
      if (titleEl) titleEl.textContent = "Nada por perto";
      if (descEl) descEl.textContent = "Explore o zoológico";
    }

    ZYRO.input.action = false;
  }

  requestAnimationFrame(loop);

})();
