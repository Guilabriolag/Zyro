// ============================================================
// ZYRO — GIROSPIN.JS
// V0.1 — apenas o campo do PLAYER
//
// Não altera GAME.JS
// Não altera WORLD.JS
// Não altera POI.JS
// Não altera UI.JS
// ============================================================

(() => {
  "use strict";

  function boot() {

    // Espera o núcleo do jogo existir.
    if (!window.ZYRO) {
      setTimeout(boot, 100);
      return;
    }

    if (!window.ZYRO.scene) {
      setTimeout(boot, 100);
      return;
    }

    if (!window.ZYRO.playerMesh) {
      setTimeout(boot, 100);
      return;
    }

    console.log("GIROSPIN: iniciando...");

    createPlayerField();

    console.log("GIROSPIN: PLAYER conectado.");
  }


  // ==========================================================
  // CAMPO DO PLAYER
  // ==========================================================

  function createPlayerField() {

    const playerMesh = window.ZYRO.playerMesh;

    const field = new THREE.Group();

    field.name = "GIROSPIN_PLAYER";

    playerMesh.add(field);


    // --------------------------------------------------------
    // CAMADAS
    // --------------------------------------------------------

    const layers = [
      {
        name: "SER",
        radius: 1.5,
        color: 0x4cc9f0,
        speed: 0.25
      },

      {
        name: "PODER",
        radius: 2.2,
        color: 0x6fa8dc,
        speed: -0.18
      },

      {
        name: "QUERER",
        radius: 3.0,
        color: 0xd99a32,
        speed: 0.14
      },

      {
        name: "IMPULSO",
        radius: 3.8,
        color: 0xf1c66a,
        speed: -0.10
      }
    ];


    layers.forEach(layer => {

      const geometry =
        new THREE.IcosahedronGeometry(
          layer.radius,
          1
        );

      const edges =
        new THREE.EdgesGeometry(
          geometry
        );

      const material =
        new THREE.LineBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: 0.30,
          depthWrite: false
        });

      const mesh =
        new THREE.LineSegments(
          edges,
          material
        );

      mesh.name =
        `GIROSPIN_${layer.name}`;

      field.add(mesh);

      layer.mesh = mesh;
    });


    // --------------------------------------------------------
    // PEQUENOS NÓS NAS FACETAS
    // --------------------------------------------------------

    const nodeGeometry =
      new THREE.SphereGeometry(
        0.08,
        8,
        8
      );

    layers.forEach((layer, index) => {

      const material =
        new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: 0.8
        });

      const node =
        new THREE.Mesh(
          nodeGeometry,
          material
        );

      const angle =
        index * Math.PI * 0.5;

      node.position.set(
        Math.cos(angle) * layer.radius,
        Math.sin(angle) * layer.radius,
        0
      );

      field.add(node);

      layer.node = node;
    });


    // --------------------------------------------------------
    // API
    // --------------------------------------------------------

    window.ZYRO_GIROSPIN = {

      field: field,

      layers: layers,

      player: playerMesh

    };


    // --------------------------------------------------------
    // ANIMAÇÃO
    // --------------------------------------------------------

    let previous = performance.now();

    function animate(now) {

      requestAnimationFrame(
        animate
      );

      const dt =
        Math.min(
          0.05,
          (now - previous) / 1000
        );

      previous = now;


      layers.forEach(layer => {

        layer.mesh.rotation.x +=
          layer.speed * dt;

        layer.mesh.rotation.y +=
          layer.speed * 0.7 * dt;

        layer.mesh.rotation.z +=
          layer.speed * 0.35 * dt;

      });

    }

    requestAnimationFrame(
      animate
    );
  }


  // ==========================================================
  // BOOT
  // ==========================================================

  window.addEventListener(
    "load",
    boot
  );

})();