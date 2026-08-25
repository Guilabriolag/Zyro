// ============================================================
// ZYRO — WORLD.JS (Shopping)
// Mundo 3D do shopping: térreo + 1º piso + escada rolante
// Compatível com o mesmo GAME.JS do núcleo (via ZYRO_WORLD_COLLIDERS)
// ============================================================

(() => {
  "use strict";

  // ==========================================================
  // LAYOUT
  // ==========================================================

  const FLOOR_HEIGHT = 4.5;   // altura do 1º piso em relação ao térreo
  const SLAB_THICKNESS = 0.4;

  const ATRIUM = { minX: -7, maxX: 7, minZ: -5, maxZ: 5 };

  // Escada rolante: sobe ao longo do eixo Z, de z=-5 (térreo) até z=3 (1º piso)
  const ESCALATOR = {
    minX: -2, maxX: 2,
    minZ: -5, maxZ: 3,
    y0: 0, y1: FLOOR_HEIGHT,
    axis: "z",
    carry: 1.3 // m/s — velocidade que a esteira "carrega" o player pra cima
  };

  // Anéis do 1º piso ao redor do atrium (deixando um vão pra escada rolante passar)
  const RING_1F = [
    { name: "piso1_norte",      minX: -15, maxX: 15,  minZ: 5,   maxZ: 13 },
    { name: "piso1_sul_oeste",  minX: -15, maxX: -2,  minZ: -13, maxZ: -5 },
    { name: "piso1_sul_leste",  minX: 2,   maxX: 15,  minZ: -13, maxZ: -5 },
    { name: "piso1_leste",      minX: 7,   maxX: 15,  minZ: -5,  maxZ: 5 },
    { name: "piso1_oeste",      minX: -15, maxX: -7,  minZ: -5,  maxZ: 5 }
  ];

  // ==========================================================
  // COLISÃO — consumido pelo game.js
  // ==========================================================

  const platforms = [
    { name: "terreo", minX: -20, maxX: 20, minZ: -19, maxZ: 19, y: 0 },
    ...RING_1F.map(r => ({ ...r, y: FLOOR_HEIGHT }))
  ];

  const escalators = [ESCALATOR];

  window.ZYRO_WORLD_COLLIDERS = { platforms, escalators };

  // ==========================================================
  // CENA
  // ==========================================================

  const worldGroup = new THREE.Group();
  worldGroup.name = "ZYRO_WORLD";
  window.ZYRO_WORLD = worldGroup;

  const materials = {
    floor: new THREE.MeshStandardMaterial({ color: 0xcfcac1, roughness: 0.85 }),
    floor1: new THREE.MeshStandardMaterial({ color: 0xc3bdb2, roughness: 0.85 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x2c333a, metalness: 0.6, roughness: 0.35 }),
    escalator: new THREE.MeshStandardMaterial({ color: 0x565f66, metalness: 0.45, roughness: 0.5 }),
    column: new THREE.MeshStandardMaterial({ color: 0xe4e0d6, roughness: 0.8 }),
    shopWarm: new THREE.MeshStandardMaterial({ color: 0xd68a4c, roughness: 0.7 }),
    shopCool: new THREE.MeshStandardMaterial({ color: 0x4c8fd6, roughness: 0.7 }),
    shopGreen: new THREE.MeshStandardMaterial({ color: 0x5aa06a, roughness: 0.7 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 1 })
  };

  function addBox(name, x, y, z, width, height, depth, material) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
    return mesh;
  }

  function addCylinder(name, x, y, z, radius, height, material, segments = 16) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
    return mesh;
  }

  // ----------------------------------------------------------
  // Térreo
  // ----------------------------------------------------------

  addBox("piso_terreo", 0, -0.2, 0, 44, SLAB_THICKNESS, 44, materials.floor);

  // ----------------------------------------------------------
  // Colunas do atrium (decorativas por enquanto, sem colisão própria)
  // ----------------------------------------------------------

  [
    [-6, -4], [6, -4], [-6, 4], [6, 4]
  ].forEach(([x, z], i) => {
    addCylinder(`coluna_atrium_${i}`, x, FLOOR_HEIGHT / 2, z, 0.35, FLOOR_HEIGHT, materials.column, 16);
  });

  // ----------------------------------------------------------
  // 1º piso — anéis ao redor do atrium
  // ----------------------------------------------------------

  RING_1F.forEach(r => {
    const width = r.maxX - r.minX;
    const depth = r.maxZ - r.minZ;
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    addBox(r.name, cx, FLOOR_HEIGHT - SLAB_THICKNESS / 2, cz, width, SLAB_THICKNESS, depth, materials.floor1);
  });

  // Guarda-corpo do 1º piso, na borda interna que dá pro vão do atrium
  function addRail(x, z, width, depth) {
    addBox("guarda_corpo", x, FLOOR_HEIGHT + 0.5, z, width, 1.0, depth, materials.rail);
  }

  addRail(0, ATRIUM.minZ, (ATRIUM.maxX - ATRIUM.minX) - 4, 0.08); // lado sul (com vão pra escada)
  addRail(0, ATRIUM.maxZ, ATRIUM.maxX - ATRIUM.minX, 0.08);       // lado norte
  addRail(ATRIUM.minX, 0, 0.08, ATRIUM.maxZ - ATRIUM.minZ);       // lado oeste
  addRail(ATRIUM.maxX, 0, 0.08, ATRIUM.maxZ - ATRIUM.minZ);       // lado leste

  // ----------------------------------------------------------
  // Escada rolante (visual — a colisão real vem de ESCALATOR acima)
  // ----------------------------------------------------------

  const escGroup = new THREE.Group();
  escGroup.name = "escada_rolante";

  const runLength = ESCALATOR.maxZ - ESCALATOR.minZ;
  const rise = ESCALATOR.y1 - ESCALATOR.y0;
  const hypotenuse = Math.sqrt(runLength * runLength + rise * rise);
  const angle = Math.atan2(rise, runLength);

  const escSurface = new THREE.Mesh(
    new THREE.BoxGeometry(ESCALATOR.maxX - ESCALATOR.minX, 0.3, hypotenuse),
    materials.escalator
  );
  escSurface.rotation.x = -angle;
  escSurface.castShadow = true;
  escSurface.receiveShadow = true;
  escGroup.add(escSurface);

  // Corrimãos laterais
  [-1, 1].forEach(side => {
    const handrail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.9, hypotenuse),
      materials.rail
    );
    handrail.position.set(side * (ESCALATOR.maxX - ESCALATOR.minX) / 2, 0.5, 0);
    handrail.rotation.x = -angle;
    escGroup.add(handrail);
  });

  escGroup.position.set(
    0,
    rise / 2,
    (ESCALATOR.minZ + ESCALATOR.maxZ) / 2
  );

  worldGroup.add(escGroup);

  // ----------------------------------------------------------
  // Lojas — térreo (perímetro leste/oeste)
  // ----------------------------------------------------------

  function addShop(name, x, z, width, depth, material, floorY = 0) {
    addBox(name, x, floorY + 1.5, z, width, 3, depth, material);
  }

  addShop("loja_terreo_1", -16, -6, 5, 6, materials.shopWarm);
  addShop("loja_terreo_2", -16, 6, 5, 6, materials.shopCool);
  addShop("loja_terreo_3", 16, -6, 5, 6, materials.shopGreen);
  addShop("loja_terreo_4", 16, 6, 5, 6, materials.shopWarm);
  addShop("praca_alimentacao", 0, -16, 14, 6, materials.shopCool);

  // ----------------------------------------------------------
  // Lojas — 1º piso
  // ----------------------------------------------------------

  addShop("loja_1piso_1", -11, 0, 4, 6, materials.shopGreen, FLOOR_HEIGHT);
  addShop("loja_1piso_2", 11, 0, 4, 6, materials.shopWarm, FLOOR_HEIGHT);
  addShop("loja_1piso_3", 0, 9, 14, 4, materials.shopCool, FLOOR_HEIGHT);

  // ----------------------------------------------------------
  // Iluminação
  // ----------------------------------------------------------

  const atriumLight = new THREE.PointLight(0xfff4e0, 0.9, 40);
  atriumLight.position.set(0, FLOOR_HEIGHT + 4, 0);
  worldGroup.add(atriumLight);

  const terreoLight = new THREE.PointLight(0xfff4e0, 0.5, 30);
  terreoLight.position.set(0, 3, -12);
  worldGroup.add(terreoLight);

  // ----------------------------------------------------------
  // Conexão futura com outros mapas (ex: Complexo) — placeholder
  // Objeto nomeado, sem lógica ainda: só um ponto de referência
  // pra quando a "entidade de transição" existir na Gramática.
  // ----------------------------------------------------------

  addBox("entrada_shopping", 0, 1, 19, 4, 2, 0.3, materials.rail);

  // ==========================================================
  // ANEXA À CENA
  // ==========================================================

  function attachToScene() {
    if (window.ZYRO && window.ZYRO.scene) {
      if (!window.ZYRO.scene.getObjectByName("ZYRO_WORLD")) {
        window.ZYRO.scene.add(worldGroup);
      }
      console.log("ZYRO WORLD (shopping) conectado.");
    }
  }

  attachToScene();

  if (!window.ZYRO || !window.ZYRO.scene) {
    window.addEventListener("zyro:game-ready", attachToScene, { once: true });
  }

  window.ZYRO_WORLD_API = {
    group: worldGroup,
    getObject(name) {
      return worldGroup.getObjectByName(name);
    },
    getPosition(name) {
      const object = this.getObject(name);
      if (!object) return null;
      return { x: object.position.x, y: object.position.y, z: object.position.z };
    }
  };

})();