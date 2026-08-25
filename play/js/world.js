(() => {
  "use strict";

  function createWorld() {

    if (!window.ZYRO || !window.ZYRO.scene) {
      console.error("ZYRO: cena ainda não disponível.");
      return;
    }

    const scene = window.ZYRO.scene;

    // ========================================================
    // GRUPO DO MUNDO
    // ========================================================

    const world = new THREE.Group();
    world.name = "ZYRO_WORLD";

    // ========================================================
    // MATERIAIS
    // ========================================================

    const groundMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x777777
      });

    const roadMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x222222
      });

    const sidewalkMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xbbbbbb
      });

    const plazaMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x999999
      });

    const courtMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x336655
      });

    const skateMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x555555
      });

    const rampMaterial =
      new THREE.MeshStandardMaterial({
        color: 0xaa7744
      });

    // ========================================================
    // CHÃO GERAL
    // ========================================================

    const ground =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          140,
          0.5,
          100
        ),
        groundMaterial
      );

    ground.position.set(
      0,
      -0.25,
      20
    );

    ground.receiveShadow = true;

    world.add(ground);

    // ========================================================
    // AVENIDA
    // ========================================================

    const avenue =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          140,
          0.12,
          14
        ),
        roadMaterial
      );

    avenue.position.set(
      0,
      0.05,
      -8
    );

    world.add(avenue);

    // ========================================================
    // CALÇADA DA AVENIDA
    // ========================================================

    const sidewalk =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          140,
          0.2,
          5
        ),
        sidewalkMaterial
      );

    sidewalk.position.set(
      0,
      0.1,
      1
    );

    world.add(sidewalk);

    // ========================================================
    // PRAÇA
    // ========================================================

    const plaza =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          18,
          0.35,
          14
        ),
        plazaMaterial
      );

    plaza.position.set(
      12,
      0.18,
      15
    );

    world.add(plaza);

    // ========================================================
    // QUADRA
    // ========================================================

    const court =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          18,
          0.35,
          28
        ),
        courtMaterial
      );

    court.position.set(
      -10,
      0.18,
      20
    );

    world.add(court);

    // ========================================================
    // PISTA DE SKATE
    // ========================================================

    const skate =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          12,
          0.35,
          22
        ),
        skateMaterial
      );

    skate.position.set(
      -27,
      0.18,
      16
    );

    world.add(skate);

    // ========================================================
    // MINI RAMP
    // ========================================================

    const ramp =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          8,
          1.5,
          5
        ),
        rampMaterial
      );

    ramp.position.set(
      -27,
      0.75,
      16
    );

    world.add(ramp);

    // ========================================================
    // ESTAÇÃO DE EXERCÍCIO
    // ========================================================

    const exercise =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          8,
          2,
          4
        ),
        rampMaterial
      );

    exercise.position.set(
      13,
      1,
      30
    );

    world.add(exercise);

    // ========================================================
    // ADICIONA O MUNDO
    // ========================================================

    scene.add(world);

    // ========================================================
    // MARCA DE TESTE
    // ========================================================

    const marker =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          2,
          2,
          2
        ),
        new THREE.MeshStandardMaterial({
          color: 0xff0000
        })
      );

    marker.position.set(
      0,
      1,
      15
    );

    scene.add(marker);

    console.log(
      "ZYRO WORLD: mundo 3D criado.",
      world
    );
  }

  // ----------------------------------------------------------
  // O GAME.JS cria a cena depois do WORLD.JS.
  // ----------------------------------------------------------

  window.addEventListener(
    "zyro:game-ready",
    createWorld
  );

  // Caso a cena já exista
  if (
    window.ZYRO &&
    window.ZYRO.scene
  ) {
    createWorld();
  }

})();