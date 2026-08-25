(() => {
  "use strict";

  // ============================================================
  // ZYRO — WORLD.JS
  // Mundo 3D do complexo
  //
  // Este arquivo é carregado ANTES do game.js.
  // Por isso ele espera o ZYRO.scene ser criado pelo game.js.
  // ============================================================


  const WORLD = {

    initialized: false,

    objects: {},

    materials: {},

    config: {

      // --------------------------------------------------------
      // COMPLEXO
      // --------------------------------------------------------

      complex: {
        x: 0,
        z: 0
      },

      // --------------------------------------------------------
      // AVENIDA
      // --------------------------------------------------------

      avenue: {
        x: 0,
        z: 18,
        width: 18,
        length: 150
      },

      // --------------------------------------------------------
      // CALÇADA DA AVENIDA
      // --------------------------------------------------------

      sidewalk: {
        x: 0,
        z: 7,
        width: 4,
        length: 150
      },

      // --------------------------------------------------------
      // QUADRA
      // --------------------------------------------------------

      court: {
        x: 8,
        z: -2,
        width: 15,
        depth: 25
      },

      // --------------------------------------------------------
      // PISTA
      // --------------------------------------------------------

      skatepark: {
        x: -10,
        z: -1,
        width: 25,
        depth: 18
      },

      // --------------------------------------------------------
      // PRAÇA
      // --------------------------------------------------------

      plaza: {
        x: -3,
        z: -18,
        width: 25,
        depth: 14
      },

      // --------------------------------------------------------
      // MINI RAMP
      // --------------------------------------------------------

      miniRamp: {
        x: -10,
        z: 2,
        width: 7,
        depth: 11
      },

      // --------------------------------------------------------
      // ESTAÇÃO DE EXERCÍCIO
      // --------------------------------------------------------

      exercise: {
        x: 9,
        z: -17
      }

    }

  };


  window.ZYRO_WORLD = WORLD;


  // ============================================================
  // UTILITÁRIOS
  // ============================================================

  function createMaterial(
    color,
    roughness = 0.8,
    metalness = 0
  ) {

    return new THREE.MeshStandardMaterial({

      color,

      roughness,

      metalness

    });

  }


  function box(
    scene,
    name,
    width,
    height,
    depth,
    x,
    y,
    z,
    material,
    castShadow = true
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

    mesh.position.set(
      x,
      y,
      z
    );

    mesh.castShadow =
      castShadow;

    mesh.receiveShadow =
      true;

    mesh.name =
      name;

    scene.add(mesh);

    WORLD.objects[name] =
      mesh;

    return mesh;

  }


  function cylinder(
    scene,
    name,
    radius,
    height,
    x,
    y,
    z,
    material
  ) {

    const geometry =
      new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        16
      );

    const mesh =
      new THREE.Mesh(
        geometry,
        material
      );

    mesh.position.set(
      x,
      y,
      z
    );

    mesh.castShadow =
      true;

    mesh.receiveShadow =
      true;

    mesh.name =
      name;

    scene.add(mesh);

    WORLD.objects[name] =
      mesh;

    return mesh;

  }


  // ============================================================
  // MATERIAIS
  // ============================================================

  function createMaterials() {

    WORLD.materials.ground =
      createMaterial(
        0x777b72,
        0.95
      );

    WORLD.materials.avenue =
      createMaterial(
        0x34383d,
        0.95
      );

    WORLD.materials.sidewalk =
      createMaterial(
        0xb9b8ae,
        0.9
      );

    WORLD.materials.grass =
      createMaterial(
        0x526b42,
        1
      );

    WORLD.materials.concrete =
      createMaterial(
        0x8c8d88,
        0.95
      );

    WORLD.materials.plaza =
      createMaterial(
        0x9b9991,
        0.9
      );

    WORLD.materials.court =
      createMaterial(
        0x466f57,
        0.8
      );

    WORLD.materials.ramp =
      createMaterial(
        0x686b6d,
        0.85
      );

    WORLD.materials.metal =
      createMaterial(
        0x565b60,
        0.55,
        0.35
      );

    WORLD.materials.white =
      createMaterial(
        0xe5e5df,
        0.7
      );

    WORLD.materials.black =
      createMaterial(
        0x202327,
        0.8
      );

  }


  // ============================================================
  // TERRENO BASE
  // ============================================================

  function createGround(scene) {

    const material =
      WORLD.materials.ground;

    box(
      scene,
      "world-ground",
      180,
      0.3,
      130,
      0,
      -0.15,
      5,
      material,
      false
    );

  }


  // ============================================================
  // AVENIDA
  // ============================================================

  function createAvenue(scene) {

    const a =
      WORLD.config.avenue;

    box(
      scene,
      "avenue",
      a.width,
      0.12,
      a.length,
      a.x,
      0.02,
      a.z,
      WORLD.materials.avenue,
      false
    );


    // ----------------------------------------------------------
    // FAIXA CENTRAL
    // ----------------------------------------------------------

    const stripeMaterial =
      WORLD.materials.white;


    for (
      let z = a.z - a.length / 2 + 5;
      z < a.z + a.length / 2;
      z += 10
    ) {

      box(
        scene,
        "road-marking-" + z,
        0.25,
        0.025,
        5,
        a.x,
        0.09,
        z,
        stripeMaterial,
        false
      );

    }

  }


  // ============================================================
  // CALÇADA DA AVENIDA
  // ============================================================

  function createSidewalk(scene) {

    const s =
      WORLD.config.sidewalk;

    box(
      scene,
      "avenue-sidewalk",
      s.width,
      0.22,
      s.length,
      s.x,
      0.11,
      s.z,
      WORLD.materials.sidewalk,
      false
    );

  }


  // ============================================================
  // CANTEIRO
  // ============================================================

  function createGrassStrip(scene) {

    box(
      scene,
      "avenue-grass-strip",
      5,
      0.12,
      150,
      0,
      0.06,
      0,
      WORLD.materials.grass,
      false
    );

  }


  // ============================================================
  // QUADRA
  // ============================================================

  function createCourt(scene) {

    const c =
      WORLD.config.court;


    // Piso

    box(
      scene,
      "court-floor",
      c.width,
      0.18,
      c.depth,
      c.x,
      0.09,
      c.z,
      WORLD.materials.court,
      false
    );


    // ----------------------------------------------------------
    // LINHAS
    // ----------------------------------------------------------

    const line =
      WORLD.materials.white;


    box(
      scene,
      "court-line-long",
      0.08,
      0.025,
      c.depth - 1,
      c.x,
      0.20,
      c.z,
      line,
      false
    );


    box(
      scene,
      "court-line-center",
      c.width - 1,
      0.025,
      0.08,
      c.x,
      0.20,
      c.z,
      line,
      false
    );


    // ----------------------------------------------------------
    // CESTAS
    // ----------------------------------------------------------

    createBasket(
      scene,
      c.x,
      c.z - c.depth / 2 + 1
    );

    createBasket(
      scene,
      c.x,
      c.z + c.depth / 2 - 1
    );

  }


  function createBasket(
    scene,
    x,
    z
  ) {

    cylinder(
      scene,
      "basket-pole-" + x + "-" + z,
      0.08,
      3,
      x,
      1.5,
      z,
      WORLD.materials.metal
    );


    box(
      scene,
      "basket-board-" + x + "-" + z,
      1.4,
      0.9,
      0.08,
      x,
      2.7,
      z,
      WORLD.materials.white
    );


    const ring =
      new THREE.Mesh(
        new THREE.TorusGeometry(
          0.35,
          0.045,
          8,
          24
        ),
        WORLD.materials.metal
      );

    ring.position.set(
      x,
      2.35,
      z +
      (z < 0 ? 0.3 : -0.3)
    );

    ring.rotation.x =
      Math.PI / 2;

    ring.castShadow =
      true;

    scene.add(ring);

  }


  // ============================================================
  // PISTA DE SKATE
  // ============================================================

  function createSkatepark(scene) {

    const p =
      WORLD.config.skatepark;


    // Base

    box(
      scene,
      "skatepark-base",
      p.width,
      0.20,
      p.depth,
      p.x,
      0.10,
      p.z,
      WORLD.materials.concrete,
      false
    );


    // ----------------------------------------------------------
    // PLATAFORMA / BLOCO
    // ----------------------------------------------------------

    box(
      scene,
      "skatepark-platform",
      5,
      0.9,
      7,
      p.x + 5,
      0.45,
      p.z - 4,
      WORLD.materials.ramp
    );


    // ----------------------------------------------------------
    // QUARTER
    // ----------------------------------------------------------

    createQuarter(
      scene,
      p.x - 6,
      p.z + 1,
      5,
      8
    );


    // ----------------------------------------------------------
    // FUN BOX
    // ----------------------------------------------------------

    box(
      scene,
      "skate-funbox",
      3.5,
      0.65,
      4.5,
      p.x,
      0.325,
      p.z - 1,
      WORLD.materials.ramp
    );


    // ----------------------------------------------------------
    // RAIL
    // ----------------------------------------------------------

    createRail(
      scene,
      p.x + 4,
      0.8,
      p.z + 3,
      4
    );

  }


  // ============================================================
  // QUARTER / RAMPA
  // ============================================================

  function createQuarter(
    scene,
    x,
    z,
    width,
    depth
  ) {

    const group =
      new THREE.Group();

    group.name =
      "skate-quarter";


    const shape =
      new THREE.Shape();

    shape.moveTo(
      0,
      0
    );

    shape.lineTo(
      depth,
      0
    );

    shape.lineTo(
      depth,
      3
    );

    shape.quadraticCurveTo(
      depth * 0.5,
      3,
      0,
      0
    );


    const geometry =
      new THREE.ExtrudeGeometry(
        shape,
        {
          depth: width,
          bevelEnabled: false
        }
      );


    const mesh =
      new THREE.Mesh(
        geometry,
        WORLD.materials.ramp
      );


    mesh.rotation.x =
      -Math.PI / 2;

    mesh.position.set(
      x,
      0.05,
      z
    );


    mesh.castShadow =
      true;

    mesh.receiveShadow =
      true;


    group.add(mesh);

    scene.add(group);

    WORLD.objects[
      "skate-quarter"
    ] = group;

  }


  // ============================================================
  // RAIL
  // ============================================================

  function createRail(
    scene,
    x,
    y,
    z,
    length
  ) {

    const group =
      new THREE.Group();


    const bar =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.055,
          0.055,
          length,
          10
        ),
        WORLD.materials.metal
      );


    bar.rotation.z =
      Math.PI / 2;

    bar.position.set(
      0,
      0.35,
      0
    );

    group.add(bar);


    const leg1 =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.045,
          0.045,
          0.35,
          8
        ),
        WORLD.materials.metal
      );

    leg1.position.set(
      -length / 2 + 0.3,
      0.175,
      0
    );


    const leg2 =
      leg1.clone();

    leg2.position.x =
      length / 2 - 0.3;


    group.add(
      leg1,
      leg2
    );


    group.position.set(
      x,
      y,
      z
    );


    scene.add(group);

  }


  // ============================================================
  // MINI RAMP
  // ============================================================

  function createMiniRamp(scene) {

    const r =
      WORLD.config.miniRamp;


    // ----------------------------------------------------------
    // Base
    // ----------------------------------------------------------

    box(
      scene,
      "mini-ramp-base",
      r.width,
      0.25,
      r.depth,
      r.x,
      0.125,
      r.z,
      WORLD.materials.ramp
    );


    // ----------------------------------------------------------
    // Lado A
    // ----------------------------------------------------------

    createQuarter(
      scene,
      r.x - r.width / 2,
      r.z - r.depth / 2,
      r.width,
      r.depth / 2
    );


    // ----------------------------------------------------------
    // Lado B
    // ----------------------------------------------------------

    createQuarter(
      scene,
      r.x - r.width / 2,
      r.z,
      r.width,
      r.depth / 2
    );

  }


  // ============================================================
  // PRAÇA
  // ============================================================

  function createPlaza(scene) {

    const p =
      WORLD.config.plaza;


    box(
      scene,
      "plaza-floor",
      p.width,
      0.20,
      p.depth,
      p.x,
      0.10,
      p.z,
      WORLD.materials.plaza,
      false
    );


    // ----------------------------------------------------------
    // BANCOS
    // ----------------------------------------------------------

    createBench(
      scene,
      p.x - 6,
      0.5,
      p.z
    );


    createBench(
      scene,
      p.x + 6,
      0.5,
      p.z
    );


    // ----------------------------------------------------------
    // ÁREA CENTRAL
    // ----------------------------------------------------------

    cylinder(
      scene,
      "plaza-center",
      2.5,
      0.12,
      p.x,
      0.25,
      p.z,
      WORLD.materials.concrete
    );

  }


  function createBench(
    scene,
    x,
    y,
    z
  ) {

    box(
      scene,
      "bench-seat-" + x + "-" + z,
      2.5,
      0.18,
      0.55,
      x,
      y,
      z,
      WORLD.materials.metal
    );


    box(
      scene,
      "bench-back-" + x + "-" + z,
      2.5,
      0.75,
      0.12,
      x,
      y + 0.4,
      z + 0.22,
      WORLD.materials.metal
    );

  }


  // ============================================================
  // ESTAÇÃO DE EXERCÍCIO
  // ============================================================

  function createExerciseStation(scene) {

    const e =
      WORLD.config.exercise;


    // Barras laterais

    cylinder(
      scene,
      "exercise-post-left",
      0.08,
      2.3,
      e.x - 1.2,
      1.15,
      e.z,
      WORLD.materials.metal
    );


    cylinder(
      scene,
      "exercise-post-right",
      0.08,
      2.3,
      e.x + 1.2,
      1.15,
      e.z,
      WORLD.materials.metal
    );


    // Barra superior

    const bar =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.08,
          0.08,
          2.4,
          12
        ),
        WORLD.materials.metal
      );


    bar.rotation.z =
      Math.PI / 2;

    bar.position.set(
      e.x,
      2.25,
      e.z
    );


    bar.castShadow =
      true;

    scene.add(bar);


    // Banco

    box(
      scene,
      "exercise-bench",
      2.4,
      0.3,
      0.65,
      e.x,
      0.55,
      e.z + 1.2,
      WORLD.materials.metal
    );

  }


  // ============================================================
  // VEGETAÇÃO
  // ============================================================

  function createTree(
    scene,
    x,
    z,
    scale = 1
  ) {

    const trunk =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.16 * scale,
          0.22 * scale,
          1.8 * scale,
          8
        ),
        new THREE.MeshStandardMaterial({
          color: 0x654c37
        })
      );


    trunk.position.set(
      x,
      0.9 * scale,
      z
    );


    trunk.castShadow =
      true;


    const crown =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          1.2 * scale,
          12,
          10
        ),
        new THREE.MeshStandardMaterial({
          color: 0x416044
        })
      );


    crown.position.set(
      x,
      2.25 * scale,
      z
    );


    crown.castShadow =
      true;


    scene.add(
      trunk,
      crown
    );

  }


  // ============================================================
  // ILHAS / ÁREAS VERDES DA PRAÇA
  // ============================================================

  function createPlazaGreenery(scene) {

    const p =
      WORLD.config.plaza;


    createTree(
      scene,
      p.x - 8,
      p.z - 3,
      0.9
    );


    createTree(
      scene,
      p.x + 8,
      p.z + 3,
      0.9
    );

  }


  // ============================================================
  // LUMINÁRIAS
  // ============================================================

  function createLamp(
    scene,
    x,
    z
  ) {

    cylinder(
      scene,
      "lamp-pole-" + x + "-" + z,
      0.07,
      3.5,
      x,
      1.75,
      z,
      WORLD.materials.metal
    );


    const lamp =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.18,
          10,
          8
        ),
        new THREE.MeshStandardMaterial({
          color: 0xffe6ad,
          emissive: 0x553d15
        })
      );


    lamp.position.set(
      x,
      3.5,
      z
    );


    scene.add(lamp);

  }


  function createLights(scene) {

    createLamp(
      scene,
      -5,
      6
    );


    createLamp(
      scene,
      5,
      6
    );


    createLamp(
      scene,
      -15,
      -12
    );


    createLamp(
      scene,
      8,
      -12
    );

  }


  // ============================================================
  // GRADE VISUAL DISCRETA
  // ============================================================

  function createGrid(scene) {

    const material =
      new THREE.LineBasicMaterial({
        color: 0x9a9a92,
        transparent: true,
        opacity: 0.14
      });


    const size = 120;
    const divisions = 30;


    const grid =
      new THREE.GridHelper(
        size,
        divisions,
        0x777777,
        0xaaaaaa
      );


    grid.material =
      material;


    grid.position.y =
      0.01;


    scene.add(grid);

    WORLD.objects.grid =
      grid;

  }


  // ============================================================
  // MONTAGEM DO MUNDO
  // ============================================================

  function buildWorld(scene) {

    if (
      WORLD.initialized
    ) {
      return;
    }


    createMaterials();


    createGround(
      scene
    );


    createAvenue(
      scene
    );


    createSidewalk(
      scene
    );


    createGrassStrip(
      scene
    );


    createCourt(
      scene
    );


    createSkatepark(
      scene
    );


    createMiniRamp(
      scene
    );


    createPlaza(
      scene
    );


    createExerciseStation(
      scene
    );


    createPlazaGreenery(
      scene
    );


    createLights(
      scene
    );


    createGrid(
      scene
    );


    WORLD.initialized =
      true;


    console.log(
      "ZYRO WORLD iniciado."
    );

  }


  // ============================================================
  // ESPERA O GAME.JS CRIAR A CENA
  // ============================================================

  function waitForScene() {

    if (
      window.ZYRO &&
      window.ZYRO.scene
    ) {

      buildWorld(
        window.ZYRO.scene
      );

      return;

    }


    requestAnimationFrame(
      waitForScene
    );

  }


  waitForScene();


})();