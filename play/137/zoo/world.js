// ============================================================
// ZYRO — WORLD.JS (Zoológico)
// Mesmo footprint do Shopping (térreo único, 40x38), mas com
// praça central, praça de alimentação, NPC e 3 estandes de Crias.
// Compatível com o mesmo GAME.JS do núcleo (via ZYRO_WORLD_COLLIDERS)
// ============================================================

(() => {
  "use strict";

  // ==========================================================
  // COLISÃO — piso único, plano (sem 1º piso/escada aqui)
  // ==========================================================

  const platforms = [
    { name: "terreo", minX: -20, maxX: 20, minZ: -19, maxZ: 19, y: 0 }
  ];

  window.ZYRO_WORLD_COLLIDERS = { platforms, escalators: [] };

  // ==========================================================
  // CENA
  // ==========================================================

  const worldGroup = new THREE.Group();
  worldGroup.name = "ZYRO_WORLD";
  window.ZYRO_WORLD = worldGroup;

  const materials = {
    floor: new THREE.MeshStandardMaterial({ color: 0xcfcac1, roughness: 0.85 }),
    plaza: new THREE.MeshStandardMaterial({ color: 0xb9c9b0, roughness: 0.9 }),
    counter: new THREE.MeshStandardMaterial({ color: 0x8a7358, roughness: 0.7 }),
    npc: new THREE.MeshStandardMaterial({ color: 0xc95fe0, roughness: 0.6 }),
    table: new THREE.MeshStandardMaterial({ color: 0xd6c39a, roughness: 0.8 }),
    standDrone: new THREE.MeshStandardMaterial({ color: 0x5fd0e0, roughness: 0.5 }),
    standTerra: new THREE.MeshStandardMaterial({ color: 0xd68a4c, roughness: 0.7 }),
    standAgua: new THREE.MeshStandardMaterial({ color: 0x4c8fd6, roughness: 0.6 }),
    ring: new THREE.MeshStandardMaterial({ color: 0x5fd0a0, emissive: 0x1a4a35, roughness: 0.4 })
  };

  function addBox(name, x, y, z, width, height, depth, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
    return mesh;
  }

  function addCylinder(name, x, y, z, radius, height, material, segments = 16) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
    return mesh;
  }

  // ----------------------------------------------------------
  // Piso térreo (mesmo tamanho do shopping)
  // ----------------------------------------------------------

  addBox("piso_terreo", 0, -0.2, 0, 44, 0.4, 44, materials.floor);

  // ----------------------------------------------------------
  // Praça central (área aberta em frente ao spawn)
  // ----------------------------------------------------------

  addCylinder("praca_central_piso", 0, 0.02, 6, 7, 0.05, materials.plaza, 24);
  addCylinder("praca_fonte", 0, 0.6, 6, 1.1, 1.2, materials.counter, 20);

  // ----------------------------------------------------------
  // Praça de alimentação (a leste da praça central)
  // ----------------------------------------------------------

  addBox("praca_alimentacao_piso", 13, 0.02, 6, 12, 0.05, materials.plaza);
  [[-3, 2], [3, 2], [-3, -2], [3, -2]].forEach(([dx, dz], i) => {
    addBox(`mesa_${i}`, 13 + dx, 0.4, 6 + dz, 1.2, 0.05, 1.2, materials.table);
    addCylinder(`banco_perna_${i}`, 13 + dx, 0.2, 6 + dz, 0.08, 0.4, materials.counter, 8);
  });

  // ----------------------------------------------------------
  // NPC (guia do zoológico) — patrulha simples entre dois pontos
  // ----------------------------------------------------------

  const npcMesh = addCylinder("npc_guia", 0, 0.9, -2, 0.4, 1.6, materials.npc, 12);
  window.ZYRO_NPC = {
    mesh: npcMesh,
    a: { x: -6, z: -2 },
    b: { x: 6, z: -2 },
    speed: 1.4,
    dir: 1,
    progress: 0
  };

  // ----------------------------------------------------------
  // Estandes — 3 Crias, ao norte, virados pra praça
  // ----------------------------------------------------------

  function addStand(name, x, z, material) {
    // fundo do estande (era a "caixa" azul/laranja)
    addBox(`${name}_fundo`, x, 1.5, z, 5, 3, 1, material);
    // balcão do NPC do estande
    addBox(`${name}_balcao`, x, 0.5, z + 2.2, 3, 1, 0.8, materials.counter);
    // pedestal onde a Cria fica (canto da criatura)
    addCylinder(`${name}_pedestal`, x, 0.15, z + 4.2, 1.3, 0.3, materials.plaza, 20);
  }

  addStand("estande_drone", -12, -12, materials.standDrone);
  addStand("estande_terra", 0, -14, materials.standTerra);
  addStand("estande_agua", 12, -12, materials.standAgua);

  window.ZYRO_STANDS = {
    drone: { x: -12, z: -12 - 4.2 },
    terra: { x: 0, z: -14 - 4.2 },
    agua: { x: 12, z: -12 - 4.2 }
  };

  // ----------------------------------------------------------
  // Saída do zoológico (anel luminoso ao sul, perto do spawn)
  // ----------------------------------------------------------

  const saida = addCylinder("saida_zoologico", 0, 0.05, 17, 1.6, 0.1, materials.ring, 24);
  window.ZYRO_EXIT = { x: 0, z: 17 };

  // ----------------------------------------------------------
  // Iluminação
  // ----------------------------------------------------------

  const centralLight = new THREE.PointLight(0xfff4e0, 0.9, 40);
  centralLight.position.set(0, 8, 0);
  worldGroup.add(centralLight);

  const standsLight = new THREE.PointLight(0xfff4e0, 0.6, 30);
  standsLight.position.set(0, 6, -12);
  worldGroup.add(standsLight);

  // ==========================================================
  // ANEXA À CENA
  // ==========================================================

  function attachToScene() {
    if (window.ZYRO && window.ZYRO.scene) {
      if (!window.ZYRO.scene.getObjectByName("ZYRO_WORLD")) {
        window.ZYRO.scene.add(worldGroup);
      }
      console.log("ZYRO WORLD (zoológico) conectado.");
    }
  }

  attachToScene();

  if (!window.ZYRO || !window.ZYRO.scene) {
    window.addEventListener("zyro:game-ready", attachToScene, { once: true });
  }

  window.ZYRO_WORLD_API = {
    group: worldGroup,
    getObject(name) { return worldGroup.getObjectByName(name); }
  };

})();
