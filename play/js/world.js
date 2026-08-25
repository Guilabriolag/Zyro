// ============================================================
// ZYRO — WORLD.JS
// Mundo 3D do complexo
// Compatível com GAME.JS
// ============================================================

(() => {
  "use strict";

  // ==========================================================
  // CONFIGURAÇÃO DO COMPLEXO
  // ==========================================================

  const WORLD = {
    avenueZ: 0,

    sidewalk: {
      x: 0,
      z: 4,
      width: 12,
      depth: 4
    },

    plaza: {
      x: 10,
      z: 14,
      width: 18,
      depth: 14
    },

    court: {
      x: -10,
      z: 18,
      width: 18,
      depth: 30
    },

    skate: {
      x: -24,
      z: 14,
      width: 12,
      depth: 22
    },

    gym: {
      x: 13,
      z: 29,
      width: 10,
      depth: 7
    }
  };


  // ==========================================================
  // GRUPO PRINCIPAL
  // ==========================================================

  const worldGroup = new THREE.Group();

  worldGroup.name = "ZYRO_WORLD";

  window.ZYRO_WORLD = worldGroup;


  // ==========================================================
  // MATERIAIS
  // ==========================================================

  const materials = {

    ground:
      new THREE.MeshStandardMaterial({
        color: 0x899196,
        roughness: 0.95
      }),

    asphalt:
      new THREE.MeshStandardMaterial({
        color: 0x30363b,
        roughness: 0.9
      }),

    sidewalk:
      new THREE.MeshStandardMaterial({
        color: 0xc9c9c3,
        roughness: 0.9
      }),

    grass:
      new THREE.MeshStandardMaterial({
        color: 0x55734d,
        roughness: 1
      }),

    plaza:
      new THREE.MeshStandardMaterial({
        color: 0xb8b4aa,
        roughness: 0.9
      }),

    court:
      new THREE.MeshStandardMaterial({
        color: 0x4d5960,
        roughness: 0.85
      }),

    courtLine:
      new THREE.MeshBasicMaterial({
        color: 0xe9e4d6
      }),

    skate:
      new THREE.MeshStandardMaterial({
        color: 0x777b7d,
        roughness: 0.8
      }),

    ramp:
      new THREE.MeshStandardMaterial({
        color: 0x62676a,
        roughness: 0.8
      }),

    metal:
      new THREE.MeshStandardMaterial({
        color: 0x444b50,
        metalness: 0.65,
        roughness: 0.45
      }),

    wood:
      new THREE.MeshStandardMaterial({
        color: 0x826c4d,
        roughness: 0.85
      }),

    exercise:
      new THREE.MeshStandardMaterial({
        color: 0x3f5558,
        metalness: 0.55,
        roughness: 0.5
      })
  };


  // ==========================================================
  // HELPERS
  // ==========================================================

  function addBox(
    name,
    x,
    y,
    z,
    width,
    height,
    depth,
    material
  ) {

    const geometry =
      new THREE.BoxGeometry(
        width,
        height,
        depth
      );

    const mesh =
      new THREE.Mesh(
        geometry,
        material
      );

    mesh.name = name;

    mesh.position.set(
      x,
      y,
      z
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    worldGroup.add(mesh);

    return mesh;
  }


  function addCylinder(
    name,
    x,
    y,
    z,
    radius,
    height,
    material,
    segments = 16
  ) {

    const geometry =
      new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        segments
      );

    const mesh =
      new THREE.Mesh(
        geometry,
        material
      );

    mesh.name = name;

    mesh.position.set(
      x,
      y,
      z
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    worldGroup.add(mesh);

    return mesh;
  }


  // ==========================================================
  // TERRENO BASE
  // ==========================================================

  addBox(
    "terreno",
    0,
    -0.3,
    20,
    150,
    0.6,
    110,
    materials.ground
  );


  // ==========================================================
  // AVENIDA
  // ==========================================================

  addBox(
    "avenida",
    0,
    0.02,
    -8,
    150,
    0.08,
    14,
    materials.asphalt
  );


  // Faixas simples

  for (
    let x = -65;
    x <= 65;
    x += 12
  ) {

    addBox(
      "faixa_avenida",
      x,
      0.08,
      -8,
      6,
      0.025,
      0.18,
      materials.courtLine
    );

  }


  // ==========================================================
  // ÚNICA CALÇADA PRINCIPAL DA AVENIDA
  // ==========================================================

  addBox(
    "calcada_avenida",
    0,
    0.12,
    1,
    150,
    0.22,
    5,
    materials.sidewalk
  );


  // Pequeno canteiro entre calçada e complexo

  addBox(
    "canteiro_avenida",
    0,
    0.08,
    4.5,
    150,
    0.16,
    2.5,
    materials.grass
  );


  // ==========================================================
  // PRAÇA
  // ==========================================================

  addBox(
    "praca",
    WORLD.plaza.x,
    0.22,
    WORLD.plaza.z,
    WORLD.plaza.width,
    0.4,
    WORLD.plaza.depth,
    materials.plaza
  );


  // ==========================================================
  // ÁREA DA QUADRA
  // ==========================================================

  addBox(
    "quadra",
    WORLD.court.x,
    0.18,
    WORLD.court.z,
    WORLD.court.width,
    0.32,
    WORLD.court.depth,
    materials.court
  );


  // ==========================================================
  // MARCAÇÕES DA QUADRA
  // ==========================================================

  const courtX =
    WORLD.court.x;

  const courtZ =
    WORLD.court.z;

  const cw =
    WORLD.court.width;

  const cd =
    WORLD.court.depth;


  // Linha central

  addBox(
    "quadra_linha_central",
    courtX,
    0.36,
    courtZ,
    cw - 1,
    0.025,
    0.12,
    materials.courtLine
  );


  // Linhas laterais

  addBox(
    "quadra_linha_esquerda",
    courtX - cw / 2 + 0.35,
    0.36,
    courtZ,
    0.12,
    0.025,
    cd - 0.7,
    materials.courtLine
  );


  addBox(
    "quadra_linha_direita",
    courtX + cw / 2 - 0.35,
    0.36,
    courtZ,
    0.12,
    0.025,
    cd - 0.7,
    materials.courtLine
  );


  // Linhas de fundo

  addBox(
    "quadra_linha_fundo_1",
    courtX,
    0.36,
    courtZ - cd / 2 + 0.35,
    cw - 0.7,
    0.025,
    0.12,
    materials.courtLine
  );


  addBox(
    "quadra_linha_fundo_2",
    courtX,
    0.36,
    courtZ + cd / 2 - 0.35,
    cw - 0.7,
    0.025,
    0.12,
    materials.courtLine
  );


  // ==========================================================
  // POSTES DE BASQUETE
  // ==========================================================

  function basketballHoop(z) {

    addBox(
      "poste_basquete",
      courtX,
      1.9,
      z,
      0.18,
      3.6,
      0.18,
      materials.metal
    );

    addBox(
      "tabela_basquete",
      courtX,
      3.3,
      z,
      2.0,
      1.2,
      0.12,
      materials.courtLine
    );

    addCylinder(
      "aro_basquete",
      courtX,
      2.85,
      z - 0.45,
      0.35,
      0.08,
      materials.metal,
      24
    );

  }


  basketballHoop(
    courtZ - cd / 2 + 0.7
  );

  basketballHoop(
    courtZ + cd / 2 - 0.7
  );


  // ==========================================================
  // PISTA DE SKATE
  // ==========================================================

  addBox(
    "pista_skate",
    WORLD.skate.x,
    0.15,
    WORLD.skate.z,
    WORLD.skate.width,
    0.3,
    WORLD.skate.depth,
    materials.skate
  );


  // ==========================================================
  // MINI RAMP
  // ==========================================================

  const rampX =
    WORLD.skate.x;

  const rampZ =
    WORLD.skate.z + 4;


  const rampGroup =
    new THREE.Group();

  rampGroup.name =
    "mini_ramp";


  const rampBase =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        8,
        0.6,
        5
      ),
      materials.ramp
    );

  rampBase.position.y =
    0.45;

  rampBase.castShadow = true;
  rampBase.receiveShadow = true;

  rampGroup.add(
    rampBase
  );


  const rampLeft =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        8,
        1.6,
        2.2
      ),
      materials.ramp
    );

  rampLeft.position.set(
    0,
    1.0,
    -1.4
  );

  rampLeft.rotation.x =
    -0.32;

  rampLeft.castShadow = true;

  rampGroup.add(
    rampLeft
  );


  const rampRight =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        8,
        1.6,
        2.2
      ),
      materials.ramp
    );

  rampRight.position.set(
    0,
    1.0,
    1.4
  );

  rampRight.rotation.x =
    0.32;

  rampRight.castShadow = true;

  rampGroup.add(
    rampRight
  );


  rampGroup.position.set(
    rampX,
    0,
    rampZ
  );

  worldGroup.add(
    rampGroup
  );


  // ==========================================================
  // ESTAÇÃO DE EXERCÍCIO
  // ==========================================================

  const gymX =
    WORLD.gym.x;

  const gymZ =
    WORLD.gym.z;


  addCylinder(
    "academia_poste_1",
    gymX - 3,
    1.3,
    gymZ,
    0.12,
    2.6,
    materials.exercise
  );


  addCylinder(
    "academia_poste_2",
    gymX + 3,
    1.3,
    gymZ,
    0.12,
    2.6,
    materials.exercise
  );


  addCylinder(
    "academia_barra",
    gymX,
    2.4,
    gymZ,
    0.09,
    6,
    materials.exercise
  );


  // ==========================================================
  // BANCOS DA PRAÇA
  // ==========================================================

  function addBench(
    x,
    z,
    rotation = 0
  ) {

    const group =
      new THREE.Group();

    const seat =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          2.2,
          0.16,
          0.55
        ),
        materials.wood
      );

    seat.position.y =
      0.8;

    seat.castShadow = true;

    group.add(seat);


    const leg1 =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          0.12,
          0.8,
          0.12
        ),
        materials.metal
      );

    leg1.position.set(
      -0.75,
      0.4,
      0
    );

    group.add(leg1);


    const leg2 =
      leg1.clone();

    leg2.position.x =
      0.75;

    group.add(leg2);


    group.position.set(
      x,
      0,
      z
    );

    group.rotation.y =
      rotation;

    worldGroup.add(
      group
    );

  }


  addBench(
    WORLD.plaza.x - 5,
    WORLD.plaza.z,
    Math.PI / 2
  );


  addBench(
    WORLD.plaza.x + 5,
    WORLD.plaza.z,
    Math.PI / 2
  );


  // ==========================================================
  // ÁRVORES — SOMENTE DENTRO DO COMPLEXO
  // Não colocamos árvores na faixa da avenida.
  // ==========================================================

  function addTree(
    x,
    z
  ) {

    const tree =
      new THREE.Group();


    const trunk =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.22,
          0.3,
          2.2,
          10
        ),
        materials.wood
      );

    trunk.position.y =
      1.1;

    trunk.castShadow = true;

    tree.add(
      trunk
    );


    const crown =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          1.25,
          12,
          10
        ),
        new THREE.MeshStandardMaterial({
          color: 0x426044,
          roughness: 1
        })
      );

    crown.position.y =
      2.7;

    crown.castShadow = true;

    tree.add(
      crown
    );


    tree.position.set(
      x,
      0,
      z
    );

    worldGroup.add(
      tree
    );

  }


  addTree(
    WORLD.plaza.x + 6,
    WORLD.plaza.z + 4
  );


  addTree(
    WORLD.plaza.x - 6,
    WORLD.plaza.z + 4
  );


  // ==========================================================
  // ILUMINAÇÃO LOCAL
  // ==========================================================

  const plazaLight =
    new THREE.PointLight(
      0xffffff,
      0.35,
      30
    );

  plazaLight.position.set(
    WORLD.plaza.x,
    7,
    WORLD.plaza.z
  );

  worldGroup.add(
    plazaLight
  );


  // ==========================================================
  // ADICIONA O MUNDO À CENA
  // ==========================================================

  function attachToScene() {

  if (!window.ZYRO) {
    console.log("ZYRO ainda não existe.");
    return;
  }

  if (!window.ZYRO.scene) {
    console.log("ZYRO existe, mas a cena ainda não existe.");
    return;
  }

  if (
    !window.ZYRO.scene.getObjectByName(
      "ZYRO_WORLD"
    )
  ) {

    window.ZYRO.scene.add(
      worldGroup
    );

    console.log(
      "ZYRO WORLD ADICIONADO À CENA."
    );

  } else {

    console.log(
      "ZYRO WORLD já estava na cena."
    );

  }

}


  // ==========================================================
  // TENTATIVA IMEDIATA
  // ==========================================================

  attachToScene();


  // ==========================================================
  // CASO O GAME AINDA NÃO TENHA CRIADO A CENA
  // ==========================================================

  if (
    !window.ZYRO ||
    !window.ZYRO.scene
  ) {

    window.addEventListener(
      "zyro:game-ready",
      attachToScene,
      {
        once: true
      }
    );

  }


  // ==========================================================
  // API DO WORLD
  // ==========================================================

  window.ZYRO_WORLD_API = {

    group: worldGroup,

    getObject(name) {

      return worldGroup.getObjectByName(
        name
      );

    },

    getPosition(name) {

      const object =
        this.getObject(name);

      if (!object)
        return null;

      return {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      };

    }

  };


})();