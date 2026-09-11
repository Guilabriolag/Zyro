// ============================================================
// ZYRO — GIROSPIN.JS
// Campo de Possibilidades — V0
//
// GAME.JS   = movimento físico
// WORLD.JS  = território
// POI.JS    = percepção espacial
// GIROSPIN  = campo semântico
// UI.JS     = interface
//
// O Girospin NÃO atrai o player.
// Ele torna estados existentes progressivamente legíveis.
// ============================================================

(() => {
  "use strict";

  // ------------------------------------------------------------
  // CONFIGURAÇÃO
  // ------------------------------------------------------------

  const CONFIG = {
    playerRadius: [1.5, 2.25, 3.05, 3.85],
    entityRadius: [0.95, 1.45, 2.0, 2.55],

    perceptionDistance: 14,
    alignmentDistance: 8,

    rotationSpeed: 0.35,
    pulseSpeed: 2.5,

    internalStep: 220,

    colors: {
      ser: 0x4cc9f0,
      poder: 0x6fa8dc,
      querer: 0xd99a32,
      impulso: 0xf1c66a,

      neutral: 0x8d969c,
      compatible: 0x55d68a,
      mismatch: 0xd85c5c
    }
  };

  // ------------------------------------------------------------
  // ESTADOS SEMÂNTICOS
  // ------------------------------------------------------------

  const PLAYER_INTENT = {
    action: "COMPRAR",
    entity: "CAMISETA"
  };

  const NPC_DEFINITIONS = [
    {
      id: "NPC-A",
      name: "Pessoa A",
      x: -5,
      z: 10,
      state: {
        action: "TENHO",
        entity: "CAMISETA"
      }
    },

    {
      id: "NPC-B",
      name: "Pessoa B",
      x: 6,
      z: 9,
      state: {
        action: "QUERO",
        entity: "CAMISETA"
      }
    },

    {
      id: "NPC-C",
      name: "Pessoa C",
      x: -6,
      z: 1,
      state: {
        action: "TENHO",
        entity: "SKATE"
      }
    },

    {
      id: "NPC-D",
      name: "Pessoa D",
      x: 7,
      z: -3,
      state: {
        action: "PROCURO",
        entity: "CELULAR"
      }
    },

    {
      id: "NPC-E",
      name: "Pessoa E",
      x: -8,
      z: -10,
      state: {
        action: "TENHO",
        entity: "PIZZA"
      }
    }
  ];

  // ------------------------------------------------------------
  // ESTADOS DAS LOJAS
  // ------------------------------------------------------------

  const STORE_STATES = {
    "loja_terreo_1": {
      action: "VENDE",
      entity: "CAMISETA"
    },

    "loja_terreo_2": {
      action: "VENDE",
      entity: "SKATE"
    },

    "loja_terreo_3": {
      action: "CADASTRA",
      entity: "PESSOAS"
    },

    "loja_terreo_4": {
      action: "OFERECE",
      entity: "EMPRESTIMO"
    },

    "praca_alimentacao": {
      action: "ENSINA",
      entity: "CULINARIA"
    },

    "praca_central": {
      action: "OFERECE",
      entity: "BANCO"
    }
  };

  // ------------------------------------------------------------
  // UTILIDADES
  // ------------------------------------------------------------

  function v(x = 0, y = 0, z = 0) {
    return new THREE.Vector3(x, y, z);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function distance(a, b) {
    return a.distanceTo(b);
  }

  function compatibility(intent, state) {
    if (!intent || !state) return false;

    if (
      intent.action === "COMPRAR" &&
      ["TENHO", "VENDE"].includes(state.action)
    ) {
      return intent.entity === state.entity;
    }

    if (
      intent.action === "VENDER" &&
      ["QUERO", "PROCURO"].includes(state.action)
    ) {
      return intent.entity === state.entity;
    }

    if (
      intent.action === "PROCURAR" &&
      ["TENHO", "VENDE"].includes(state.action)
    ) {
      return intent.entity === state.entity;
    }

    if (
      intent.action === "PROCURAR" &&
      state.action === "OFERECE"
    ) {
      return intent.entity === state.entity;
    }

    return false;
  }

  // ------------------------------------------------------------
  // GIROSPIN FIELD
  // ------------------------------------------------------------

  class GirospinField {

    constructor(options = {}) {

      this.name = options.name || "GIROSPIN";

      this.radius =
        options.radius || CONFIG.entityRadius;

      this.parent = options.parent || null;

      this.type = options.type || "entity";

      this.state = options.state || null;

      this.group = new THREE.Group();
      this.group.name = `${this.name}_GIROSPIN`;

      this.layers = [];

      this.flash = 0;
      this.feedback = null;

      this.createLayers();

      if (this.parent) {
        this.parent.add(this.group);
      }
    }

    createLayers() {

      const names = [
        "SER",
        "PODER",
        "QUERER",
        "IMPULSO"
      ];

      const colors = [
        CONFIG.colors.ser,
        CONFIG.colors.poder,
        CONFIG.colors.querer,
        CONFIG.colors.impulso
      ];

      const axes = [
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(1, 0.35, 0),
        new THREE.Vector3(0.35, 1, 0.7),
        new THREE.Vector3(-0.5, 0.7, 1)
      ];

      for (let i = 0; i < 4; i++) {

        const geometry =
          new THREE.IcosahedronGeometry(
            this.radius[i],
            1
          );

        const material =
          new THREE.LineBasicMaterial({
            color: colors[i],
            transparent: true,
            opacity: this.type === "player"
              ? 0.34
              : 0.20,
            depthWrite: false
          });

        const mesh =
          new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            material
          );

        mesh.rotation.set(
          i * 0.4,
          i * 0.7,
          i * 0.25
        );

        mesh.renderOrder = 10;

        this.group.add(mesh);

        // ------------------------------------------------------
        // Nó de cada camada
        // ------------------------------------------------------

        const nodeGeometry =
          new THREE.SphereGeometry(
            this.type === "player" ? 0.075 : 0.055,
            8,
            8
          );

        const nodeMaterial =
          new THREE.MeshBasicMaterial({
            color: colors[i],
            transparent: true,
            opacity: 0.45,
            depthWrite: false
          });

        const node =
          new THREE.Mesh(
            nodeGeometry,
            nodeMaterial
          );

        const direction =
          axes[i].clone().normalize();

        node.position.copy(direction.multiplyScalar(this.radius[i]));

        node.renderOrder = 11;

        this.group.add(node);

        this.layers.push({
          name: names[i],
          mesh,
          node,
          color: colors[i],
          axis: axes[i],
          pulse: 0,
          phase: i * 1.3
        });
      }
    }

    update(time, dt, alignment = 0) {

      const visible =
        this.type === "player"
          ? 1
          : clamp01(alignment);

      this.layers.forEach((layer, index) => {

        layer.mesh.rotation.x +=
          dt * CONFIG.rotationSpeed *
          (0.7 + index * 0.15);

        layer.mesh.rotation.y +=
          dt * CONFIG.rotationSpeed *
          (0.45 + index * 0.12);

        layer.mesh.rotation.z +=
          dt * CONFIG.rotationSpeed *
          (0.25 + index * 0.08);

        const breathing =
          1 +
          Math.sin(
            time * 1.2 +
            layer.phase
          ) * 0.025;

        layer.mesh.scale.setScalar(
          breathing
        );

        let opacity =
          (this.type === "player" ? 0.34 : 0.08)
          +
          visible * 0.25;

        if (this.feedback) {
          opacity += 0.15;
        }

        layer.mesh.material.opacity =
          opacity;

        layer.node.material.opacity =
          Math.max(
            0.1,
            opacity + layer.pulse * 0.5
          );

        layer.pulse *=
          Math.pow(0.05, dt);
      });

      if (this.flash > 0) {
        this.flash -= dt;

        this.layers.forEach(layer => {
          layer.pulse = Math.max(
            layer.pulse,
            this.flash
          );
        });
      }
    }

    activateLayer(index) {

      const layer = this.layers[index];

      if (!layer) return;

      layer.pulse = 1;

      layer.mesh.scale.setScalar(1.14);

      setTimeout(() => {
        if (layer.mesh) {
          layer.mesh.scale.setScalar(1);
        }
      }, 160);
    }

    setFeedback(type) {

      this.feedback = type;

      const color =
        type === "compatible"
          ? CONFIG.colors.compatible
          : CONFIG.colors.mismatch;

      this.layers.forEach(layer => {

        layer.mesh.material.color.setHex(color);

        layer.node.material.color.setHex(color);

        layer.pulse = 1;
      });

      setTimeout(() => {

        if (!this.feedback) return;

        this.layers.forEach((layer, index) => {

          const original = [
            CONFIG.colors.ser,
            CONFIG.colors.poder,
            CONFIG.colors.querer,
            CONFIG.colors.impulso
          ][index];

          layer.mesh.material.color.setHex(
            original
          );

          layer.node.material.color.setHex(
            original
          );
        });

        this.feedback = null;

      }, 900);
    }
  }

  // ------------------------------------------------------------
  // NPC
  // ------------------------------------------------------------

  class GirospinNPC {

    constructor(definition) {

      this.definition = definition;

      this.group = new THREE.Group();

      this.group.name =
        `GIROSPIN_NPC_${definition.id}`;

      this.group.position.set(
        definition.x,
        0,
        definition.z
      );

      this.createBody();

      this.field =
        new GirospinField({
          name: definition.id,
          parent: this.group,
          type: "npc",
          radius: CONFIG.entityRadius,
          state: definition.state
        });

      this.field.group.position.y = 0.9;

      window.ZYRO.scene.add(this.group);
    }

    createBody() {

      const material =
        new THREE.MeshStandardMaterial({
          color: 0x7d8790,
          roughness: 0.7
        });

      const geometry =
        new THREE.CapsuleGeometry(
          0.30,
          1.0,
          6,
          10
        );

      const body =
        new THREE.Mesh(
          geometry,
          material
        );

      body.position.y = 0.9;

      body.castShadow = true;
      body.receiveShadow = true;

      this.group.add(body);

      this.body = body;
    }

    update(time, dt, playerPosition) {

      const worldPosition =
        new THREE.Vector3();

      this.group.getWorldPosition(
        worldPosition
      );

      const d =
        distance(
          playerPosition,
          worldPosition
        );

      const alignment =
        clamp01(
          1 -
          (
            d -
            CONFIG.alignmentDistance
          ) /
          CONFIG.perceptionDistance
        );

      this.field.update(
        time,
        dt,
        alignment
      );

      // pequena respiração do NPC
      this.body.position.y =
        0.9 +
        Math.sin(
          time * 1.5 +
          this.definition.x
        ) * 0.025;
    }
  }

  // ------------------------------------------------------------
  // LOJA
  // ------------------------------------------------------------

  class GirospinStore {

    constructor(poi) {

      this.poi = poi;

      this.state =
        STORE_STATES[poi.id] || {
          action: "EXISTE",
          entity: poi.name
        };

      this.object =
        window.ZYRO_WORLD_API
          ? window.ZYRO_WORLD_API.getObject(poi.id)
          : null;

      this.group =
        new THREE.Group();

      this.group.name =
        `GIROSPIN_STORE_${poi.id}`;

      this.group.position.set(
        poi.x,
        poi.y || 0,
        poi.z
      );

      this.field =
        new GirospinField({
          name: poi.id,
          parent: this.group,
          type: "store",
          radius: CONFIG.entityRadius,
          state: this.state
        });

      this.field.group.position.y = 2.0;

      window.ZYRO.scene.add(
        this.group
      );
    }

    update(time, dt, playerPosition) {

      const center =
        new THREE.Vector3();

      this.group.getWorldPosition(
        center
      );

      const d =
        distance(
          playerPosition,
          center
        );

      const alignment =
        clamp01(
          1 -
          (
            d -
            CONFIG.alignmentDistance
          ) /
          CONFIG.perceptionDistance
        );

      this.field.update(
        time,
        dt,
        alignment
      );
    }
  }

  // ------------------------------------------------------------
  // SISTEMA
  // ------------------------------------------------------------

  let playerField = null;

  const npcs = [];

  const stores = [];

  let currentIntent =
    { ...PLAYER_INTENT };

  let emissionId = 0;

  let branches = [];

  // ------------------------------------------------------------
  // CAMPO DO PLAYER
  // ------------------------------------------------------------

  function createPlayerField() {

    if (!window.ZYRO.playerMesh) {
      return;
    }

    playerField =
      new GirospinField({
        name: "PLAYER",
        parent: window.ZYRO.playerMesh,
        type: "player",
        radius: CONFIG.playerRadius
      });

    playerField.group.position.set(
      0,
      0,
      0
    );

    console.log(
      "GIROSPIN: campo do PLAYER criado."
    );
  }

  // ------------------------------------------------------------
  // NPCS
  // ------------------------------------------------------------

  function createNPCs() {

    NPC_DEFINITIONS.forEach(definition => {

      npcs.push(
        new GirospinNPC(
          definition
        )
      );

    });

    console.log(
      `GIROSPIN: ${npcs.length} NPCs criados.`
    );
  }

  // ------------------------------------------------------------
  // LOJAS
  // ------------------------------------------------------------

  function createStores() {

    const pois =
      window.ZYRO_POINTS_OF_INTEREST || [];

    pois.forEach(poi => {

      if (
        !STORE_STATES[poi.id]
      ) {
        return;
      }

      stores.push(
        new GirospinStore(
          poi
        )
      );

    });

    console.log(
      `GIROSPIN: ${stores.length} lojas/campos criados.`
    );
  }

  // ------------------------------------------------------------
  // IMPULSO
  // ------------------------------------------------------------

  function emitIntent() {

    if (!window.ZYRO) return;
    if (!playerField) return;
    if (window.ZYRO.paused) return;

    emissionId++;

    const thisEmission =
      emissionId;

    branches.forEach(branch => {

      if (branch.line) {
        window.ZYRO.scene.remove(
          branch.line
        );
      }

      if (branch.pulse) {
        window.ZYRO.scene.remove(
          branch.pulse
        );
      }

    });

    branches = [];

    console.log(
      "GIROSPIN IMPULSO:",
      currentIntent.action,
      currentIntent.entity
    );

    // ----------------------------------------------------------
    // Primeiro percorre o próprio campo
    // ----------------------------------------------------------

    for (let i = 0; i < 4; i++) {

      setTimeout(() => {

        if (
          thisEmission !== emissionId
        ) return;

        playerField.activateLayer(i);

      }, i * CONFIG.internalStep);
    }

    // ----------------------------------------------------------
    // Depois sai para o território
    // ----------------------------------------------------------

    setTimeout(() => {

      if (
        thisEmission !== emissionId
      ) return;

      launchBranches();

    }, 4 * CONFIG.internalStep + 100);
  }

  // ------------------------------------------------------------
  // RAMIFICAÇÃO DO IMPULSO
  // ------------------------------------------------------------

  function launchBranches() {

    const start =
      new THREE.Vector3();

    window.ZYRO.playerMesh.getWorldPosition(
      start
    );

    // NPCs
    npcs.forEach(npc => {

      const target =
        new THREE.Vector3();

      npc.group.getWorldPosition(
        target
      );

      createBranch(
        start,
        target,
        npc.field,
        npc.definition.state,
        npc.definition.id
      );
    });

    // LOJAS
    stores.forEach(store => {

      const target =
        new THREE.Vector3();

      store.group.getWorldPosition(
        target
      );

      createBranch(
        start,
        target,
        store.field,
        store.state,
        store.poi.id
      );
    });
  }

  // ------------------------------------------------------------
  // RAMO INDIVIDUAL
  // ------------------------------------------------------------

  function createBranch(
    start,
    target,
    field,
    state,
    id
  ) {

    const material =
      new THREE.LineBasicMaterial({
        color: CONFIG.colors.impulso,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
      });

    const geometry =
      new THREE.BufferGeometry();

    geometry.setFromPoints([
      start.clone(),
      start.clone()
    ]);

    const line =
      new THREE.Line(
        geometry,
        material
      );

    line.renderOrder = 12;

    window.ZYRO.scene.add(line);

    const pulse =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.11,
          8,
          8
        ),
        new THREE.MeshBasicMaterial({
          color: CONFIG.colors.impulso,
          transparent: true,
          opacity: 0.95
        })
      );

    pulse.renderOrder = 13;

    window.ZYRO.scene.add(
      pulse
    );

    branches.push({
      id,
      start: start.clone(),
      target: target.clone(),
      field,
      state,
      line,
      pulse,
      progress: 0,
      evaluated: false,
      finished: false
    });
  }

  // ------------------------------------------------------------
  // ATUALIZA IMPULSOS
  // ------------------------------------------------------------

  function updateBranches(dt) {

    branches.forEach(branch => {

      if (branch.finished) {
        return;
      }

      const direction =
        branch.target.clone()
          .sub(branch.start);

      const totalDistance =
        direction.length();

      if (totalDistance <= 0.01) {
        branch.finished = true;
        return;
      }

      const speed = 7;

      branch.progress +=
        (speed * dt) /
        totalDistance;

      branch.progress =
        clamp01(
          branch.progress
        );

      const current =
        branch.start.clone()
          .lerp(
            branch.target,
            branch.progress
          );

      branch.pulse.position.copy(
        current
      );

      branch.line.geometry
        .setFromPoints([
          branch.start,
          current
        ]);

      // --------------------------------------------------------
      // Entrada no campo
      // --------------------------------------------------------

      const fieldCenter =
        branch.target;

      const d =
        current.distanceTo(
          fieldCenter
        );

      if (
        !branch.evaluated &&
        d <= CONFIG.entityRadius[3]
      ) {

        branch.evaluated = true;

        const compatible =
          compatibility(
            currentIntent,
            branch.state
          );

        if (compatible) {

          branch.field.setFeedback(
            "compatible"
          );

          branch.line.material.color
            .setHex(
              CONFIG.colors.compatible
            );

          branch.pulse.material.color
            .setHex(
              CONFIG.colors.compatible
            );

          console.log(
            "GIROSPIN ✓ COMPATÍVEL:",
            branch.id,
            branch.state
          );

        } else {

          branch.field.setFeedback(
            "mismatch"
          );

          branch.line.material.color
            .setHex(
              CONFIG.colors.mismatch
            );

          branch.pulse.material.color
            .setHex(
              CONFIG.colors.mismatch
            );

          console.log(
            "GIROSPIN · não compatível:",
            branch.id,
            branch.state
          );
        }
      }

      if (
        branch.progress >= 1
      ) {

        branch.finished = true;

        setTimeout(() => {

          if (branch.line) {
            window.ZYRO.scene.remove(
              branch.line
            );
          }

          if (branch.pulse) {
            window.ZYRO.scene.remove(
              branch.pulse
            );
          }

        }, 700);
      }
    });
  }

  // ------------------------------------------------------------
  // INTENÇÃO
  // ------------------------------------------------------------

  function setIntent(action, entity) {

    currentIntent = {
      action: String(action).toUpperCase(),
      entity: String(entity).toUpperCase()
    };

    console.log(
      "GIROSPIN — novo QUERER:",
      currentIntent
    );
  }

  // ------------------------------------------------------------
  // INPUT
  // ------------------------------------------------------------

  function setupInput() {

    window.addEventListener(
      "keydown",
      event => {

        if (
          event.key.toLowerCase() === "e"
        ) {
          emitIntent();
        }

        // atalhos de teste
        if (event.key === "1") {
          setIntent(
            "COMPRAR",
            "CAMISETA"
          );
        }

        if (event.key === "2") {
          setIntent(
            "COMPRAR",
            "SKATE"
          );
        }

        if (event.key === "3") {
          setIntent(
            "PROCURAR",
            "EMPRESTIMO"
          );
        }

        if (event.key === "4") {
          setIntent(
            "PROCURAR",
            "CELULAR"
          );
        }
      }
    );
  }

  // ------------------------------------------------------------
  // LOOP
  // ------------------------------------------------------------

  let lastTime = 0;

  function update(timeMs) {

    requestAnimationFrame(
      update
    );

    if (
      !window.ZYRO ||
      !window.ZYRO.player ||
      !window.ZYRO.playerMesh
    ) {
      return;
    }

    const time =
      timeMs * 0.001;

    const dt =
      Math.min(
        0.05,
        lastTime
          ? time - lastTime
          : 0.016
      );

    lastTime = time;

    const playerPosition =
      new THREE.Vector3();

    window.ZYRO.playerMesh.getWorldPosition(
      playerPosition
    );

    // Player
    if (playerField) {

      playerField.update(
        time,
        dt,
        1
      );
    }

    // NPCs
    npcs.forEach(npc => {

      npc.update(
        time,
        dt,
        playerPosition
      );

    });

    // Lojas
    stores.forEach(store => {

      store.update(
        time,
        dt,
        playerPosition
      );

    });

    updateBranches(dt);

    // ----------------------------------------------------------
    // Consumir o botão ACTION existente no GAME.JS
    // ----------------------------------------------------------

    if (
      window.ZYRO.input &&
      window.ZYRO.input.action
    ) {

      window.ZYRO.input.action =
        false;

      emitIntent();
    }
  }

  // ------------------------------------------------------------
  // BOOT
  // ------------------------------------------------------------

  function boot() {

    if (
      !window.ZYRO ||
      !window.ZYRO.scene ||
      !window.ZYRO.playerMesh
    ) {

      setTimeout(
        boot,
        200
      );

      return;
    }

    createPlayerField();

    createNPCs();

    createStores();

    setupInput();

    window.ZYRO_GIROSPIN = {

      getIntent() {
        return {
          ...currentIntent
        };
      },

      setIntent,

      emit: emitIntent,

      playerField,

      npcs,

      stores
    };

    console.log(
      "================================================"
    );

    console.log(
      "ZYRO — GIROSPIN V0 ATIVO"
    );

    console.log(
      "QUERER:",
      currentIntent.action,
      currentIntent.entity
    );

    console.log(
      "E = emitir impulso"
    );

    console.log(
      "1 = comprar camiseta"
    );

    console.log(
      "2 = comprar skate"
    );

    console.log(
      "3 = procurar empréstimo"
    );

    console.log(
      "4 = procurar celular"
    );

    console.log(
      "================================================"
    );

    requestAnimationFrame(
      update
    );
  }

  window.addEventListener(
    "load",
    boot
  );

})();
