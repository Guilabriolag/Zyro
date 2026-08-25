// ============================================================
// ZYRO — WORLD.JS
// Mundo 3D / Complexo esportivo
// ============================================================

(() => {
  "use strict";

  if (!window.ZYRO) {
    console.error("ZYRO não foi inicializado.");
    return;
  }

  const THREE = window.THREE;
  const scene = ZYRO.scene;

  // ==========================================================
  // CONFIGURAÇÃO DO COMPLEXO
  // ==========================================================

  const WORLD = {
    roadZ: -18,

    sidewalkZ: -11.5,
    sidewalkWidth: 3,

    // O complexo inteiro fica mais próximo da avenida.
    complexZ: -4,

    skateX: -4,
    skateZ: -1,

    courtX: 25,
    courtZ: -1,

    plazaX: -25,
    plazaZ: -1,

    gymX: -37,
    gymZ: -1
  };

  // ==========================================================
  // MATERIAIS
  // ==========================================================

  const materials = {

    grass: new THREE.MeshStandardMaterial({
      color: 0x6b8e4e,
      roughness: 0.95
    }),

    road: new THREE.MeshStandardMaterial({
      color: 0x2e2e2e,
      roughness: 0.9
    }),

    sidewalk: new THREE.MeshStandardMaterial({
      color: 0x9e9e9e,
      roughness: 0.8
    }),

    concrete: new THREE.MeshStandardMaterial({
      color: 0xc7c2b6,
      roughness: 0.85
    }),

    skate: new THREE.MeshStandardMaterial({
      color: 0xb8b3aa,
      roughness: 0.85
    }),

    court: new THREE.MeshStandardMaterial({
      color: 0x2b5b84,
      roughness: 0.65
    }),

    courtBorder: new THREE.MeshStandardMaterial({
      color: 0xc7522a,
      roughness: 0.65
    }),

    white: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4
    }),

    metal: new THREE.MeshStandardMaterial({
      color: 0x202020,
      metalness: 0.55,
      roughness: 0.4
    }),

    plaza: new THREE.MeshStandardMaterial({
      color: 0xb6b0a5,
      roughness: 0.85
    }),

    plazaCenter: new THREE.MeshStandardMaterial({
      color: 0x3f7d3a,
      roughness: 0.85
    }),

    gym: new THREE.MeshStandardMaterial({
      color: 0x1976d2,
      roughness: 0.6
    })
  };

  // ==========================================================
  // GRAMADO
  // ==========================================================

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 220),
    materials.grass
  );

  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  grass.receiveShadow = true;

  scene.add(grass);

  // ==========================================================
  // AVENIDA
  // ==========================================================

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 10),
    materials.road
  );

  road.rotation.x = -Math.PI / 2;
  road.position.set(
    0,
    0.01,
    WORLD.roadZ
  );

  road.receiveShadow = true;

  scene.add(road);

  // Faixa central

  const divider = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 0.25),
    new THREE.MeshStandardMaterial({
      color: 0xffeb3b
    })
  );

  divider.rotation.x = -Math.PI / 2;

  divider.position.set(
    0,
    0.025,
    WORLD.roadZ
  );

  scene.add(divider);

  // ==========================================================
  // ÚNICA CALÇADA
  //
  // Conforme o último ajuste:
  // todas as outras calçadas foram removidas.
  // Esta é a calçada junto da avenida.
  // ==========================================================

  const avenueSidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(
      180,
      0.12,
      WORLD.sidewalkWidth
    ),
    materials.sidewalk
  );

  avenueSidewalk.position.set(
    0,
    0.06,
    WORLD.sidewalkZ
  );

  avenueSidewalk.receiveShadow = true;

  scene.add(avenueSidewalk);

  // ==========================================================
  // CANTEIRO ESTREITO ENTRE CALÇADA E COMPLEXO
  // ==========================================================

  const greenStrip = new THREE.Mesh(
    new THREE.BoxGeometry(
      180,
      0.05,
      1.5
    ),
    materials.grass
  );

  greenStrip.position.set(
    0,
    0.025,
    -9.4
  );

  greenStrip.receiveShadow = true;

  scene.add(greenStrip);

  // ==========================================================
  // HELPERS
  // ==========================================================

  function addBox(
    width,
    height,
    depth,
    x,
    y,
    z,
    material,
    parent = scene
  ) {

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        height,
        depth
      ),
      material
    );

    mesh.position.set(
      x,
      y,
      z
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    parent.add(mesh);

    return mesh;
  }

  function addCylinder(
    radius,
    height,
    x,
    y,
    z,
    material,
    parent = scene
  ) {

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        16
      ),
      material
    );

    mesh.position.set(
      x,
      y,
      z
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    parent.add(mesh);

    return mesh;
  }

  // ==========================================================
  // PISTA DE SKATE
  // ==========================================================

  const skateGroup =
    new THREE.Group();

  skateGroup.name =
    "ZYRO_Skatepark";

  skateGroup.position.set(
    WORLD.skateX,
    0,
    WORLD.skateZ
  );

  scene.add(skateGroup);

  // Piso base

  addBox(
    38,
    0.15,
    8,
    0,
    0.075,
    0,
    materials.skate,
    skateGroup
  );

  // ----------------------------------------------------------
  // Mini ramp
  // ----------------------------------------------------------

  function createRamp(
    x,
    z,
    width,
    height,
    length,
    direction = 1
  ) {

    const group =
      new THREE.Group();

    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(
        length,
        0.3,
        width
      ),
      materials.concrete
    );

    ramp.position.set(
      x,
      height / 2,
      z
    );

    ramp.rotation.z =
      direction *
      Math.atan2(
        height,
        length
      );

    ramp.castShadow = true;
    ramp.receiveShadow = true;

    group.add(ramp);

    skateGroup.add(group);

    return group;
  }

  // Mini ramp principal

  createRamp(
    -2,
    0,
    5,
    2.8,
    5,
    1
  );

  createRamp(
    -10,
    0,
    5,
    2.8,
    5,
    -1
  );

  // ----------------------------------------------------------
  // Platô
  //
  // Recuado para não atravessar a rampa.
  // ----------------------------------------------------------

  addBox(
    5.5,
    0.35,
    5,
    -6.8,
    2.8,
    0,
    materials.concrete,
    skateGroup
  );

  // ----------------------------------------------------------
  // Caixote
  // ----------------------------------------------------------

  addBox(
    4,
    0.5,
    1.2,
    4,
    0.25,
    0,
    materials.concrete,
    skateGroup
  );

  // ----------------------------------------------------------
  // Corrimão
  // ----------------------------------------------------------

  const railGroup =
    new THREE.Group();

  railGroup.position.set(
    4,
    0.7,
    0
  );

  skateGroup.add(railGroup);

  addCylinder(
    0.04,
    3.8,
    0,
    0,
    0,
    materials.metal,
    railGroup
  );

  // ==========================================================
  // MEIA QUADRA
  //
  // Afastada do mini ramp para evitar sobreposição.
  // ==========================================================

  const court =
    new THREE.Group();

  court.name =
    "ZYRO_BasketballCourt";

  const courtX =
    WORLD.courtX + 2;

  court.position.set(
    courtX,
    0,
    WORLD.courtZ
  );

  scene.add(court);

  const COURT_L = 12;
  const COURT_W = 10;

  addBox(
    COURT_L + 0.7,
    0.06,
    COURT_W + 0.7,
    0,
    0.03,
    0,
    materials.courtBorder,
    court
  );

  addBox(
    COURT_L,
    0.08,
    COURT_W,
    0,
    0.07,
    0,
    materials.court,
    court
  );

  // linha central

  addBox(
    0.08,
    0.09,
    COURT_W,
    0,
    0.12,
    0,
    materials.white,
    court
  );

  // ==========================================================
  // TABELA
  // ==========================================================

  const hoop =
    new THREE.Group();

  hoop.position.set(
    COURT_L / 2 - 0.7,
    0,
    0
  );

  court.add(hoop);

  addCylinder(
    0.09,
    4,
    0,
    2,
    0,
    materials.metal,
    hoop
  );

  addBox(
    0.08,
    1.1,
    1.7,
    -0.6,
    3.3,
    0,
    materials.white,
    hoop
  );

  const rim =
    new THREE.Mesh(
      new THREE.TorusGeometry(
        0.3,
        0.035,
        8,
        20
      ),
      new THREE.MeshStandardMaterial({
        color: 0xff4500
      })
    );

  rim.rotation.x =
    Math.PI / 2;

  rim.position.set(
    -0.9,
    2.95,
    0
  );

  rim.castShadow = true;

  hoop.add(rim);

  // ==========================================================
  // PRAÇA
  //
  // Agora alinhada ao mesmo eixo da pista e da quadra.
  // ==========================================================

  const plaza =
    new THREE.Group();

  plaza.name =
    "ZYRO_Plaza";

  plaza.position.set(
    WORLD.plazaX,
    0,
    WORLD.plazaZ
  );

  scene.add(plaza);

  // base circular

  const plazaBase =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        7,
        7,
        0.12,
        40
      ),
      materials.plaza
    );

  plazaBase.position.y =
    0.06;

  plazaBase.receiveShadow = true;

  plaza.add(plazaBase);

  // canteiro central

  const center =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        2.5,
        2.5,
        0.25,
        32
      ),
      materials.plazaCenter
    );

  center.position.y =
    0.18;

  center.castShadow = true;

  plaza.add(center);

  // bancos

  for (
    let i = 0;
    i < 4;
    i++
  ) {

    const angle =
      i *
      Math.PI /
      2;

    const x =
      Math.cos(angle) *
      4.3;

    const z =
      Math.sin(angle) *
      4.3;

    addBox(
      1.8,
      0.35,
      0.45,
      x,
      0.35,
      z,
      materials.concrete,
      plaza
    );
  }

  // ==========================================================
  // ACADEMIA AO AR LIVRE
  // ==========================================================

  const gym =
    new THREE.Group();

  gym.name =
    "ZYRO_OutdoorGym";

  gym.position.set(
    WORLD.gymX,
    0,
    WORLD.gymZ
  );

  scene.add(gym);

  // quatro equipamentos simples

  const gymPositions = [
    [-2.2, -1.8],
    [2.2, -1.8],
    [-2.2, 1.8],
    [2.2, 1.8]
  ];

  gymPositions.forEach(
    ([x, z]) => {

      addCylinder(
        0.08,
        1.6,
        x,
        0.8,
        z,
        materials.gym,
        gym
      );

      addBox(
        0.8,
        0.1,
        0.4,
        x,
        1.45,
        z,
        materials.metal,
        gym
      );
    }
  );

  // ==========================================================
  // API DO WORLD
  // ==========================================================

  window.ZYRO_WORLD = {

    scene,

    skatepark: skateGroup,

    court,

    plaza,

    gym,

    road,

    sidewalk: avenueSidewalk,

    getPositions() {
      return {
        skatepark:
          skateGroup.position.clone(),

        court:
          court.position.clone(),

        plaza:
          plaza.position.clone(),

        gym:
          gym.position.clone()
      };
    }
  };

  console.log(
    "ZYRO WORLD carregado."
  );

})();