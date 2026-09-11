// ============================================================
// ZYRO — GAME.JS V0.2
// ESQUERDO = movimento
// DIREITO  = câmera / visão
// AMARELO  = pular ou interagir
// RUN      = correr + estamina
// ============================================================

(() => {
  "use strict";

  const CFG = {
    speed: 5,
    runSpeed: 8,
    jump: 6.5,
    gravity: 18,

    staminaMax: 100,
    staminaDrain: 25,
    staminaRecover: 18,

    cameraDistance: 7,
    cameraHeight: 3.8,
    cameraLookHeight: 1.0,
    cameraSmooth: 8,

    sensitivityX: 0.006,
    sensitivityY: 0.004,

    minPitch: -0.15,
    maxPitch: 0.8
  };

  // ==========================================================
  // ZYRO GLOBAL
  // ==========================================================

  const ZYRO = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,

    player: null,
    playerMesh: null,

    paused: false,
    clock: null,

    input: {
      x: 0,
      z: 0,
      jump: false,
      action: false,
      run: false
    },

    state: {
      initialized: false,
      running: false,
      stamina: CFG.staminaMax,
      maxStamina: CFG.staminaMax,
      nearbyPOI: null
    },

    pause() {
      this.paused = !this.paused;
      return this.paused;
    },

    getState() {
      return {
        paused: this.paused,
        player: this.player,
        stamina: this.state.stamina,
        running: this.state.running,
        nearbyPOI: this.state.nearbyPOI
      };
    }
  };

  window.ZYRO = ZYRO;

  // ==========================================================
  // CENA
  // ==========================================================

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18181c);
  ZYRO.scene = scene;

  // ==========================================================
  // CÂMERA
  // ==========================================================

  const camera = new THREE.PerspectiveCamera(
    60,
    innerWidth / innerHeight,
    0.1,
    1000
  );

  ZYRO.camera = camera;

  let cameraYaw = Math.PI;
  let cameraPitch = 0.28;

  // ==========================================================
  // RENDERER
  // ==========================================================

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, 2)
  );

  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;

  const shell =
    document.getElementById("game-shell") ||
    document.getElementById("game-container");

  if (shell) {
    shell.appendChild(renderer.domElement);
  } else {
    document.body.appendChild(renderer.domElement);
  }

  renderer.domElement.style.touchAction = "none";
  renderer.domElement.id = "zyro-canvas";

  ZYRO.renderer = renderer;

  // ==========================================================
  // LUZ
  // ==========================================================

  scene.add(
    new THREE.AmbientLight(0xffffff, 0.6)
  );

  const light = new THREE.DirectionalLight(
    0xffffff,
    0.7
  );

  light.position.set(-20, 30, 20);
  light.castShadow = true;

  scene.add(light);

  // ==========================================================
  // PLAYER
  // ==========================================================

  const player = {
    x: 0,
    y: 0,
    z: 15,

    vx: 0,
    vy: 0,
    vz: 0,

    grounded: true,

    radius: 0.35,
    height: 1.8,

    speed: CFG.speed
  };

  ZYRO.player = player;

  const playerMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      0.35,
      0.9,
      6,
      12
    ),
    new THREE.MeshStandardMaterial({
      color: 0x5fd0a0
    })
  );

  playerMesh.position.set(
    player.x,
    player.y + 0.9,
    player.z
  );

  playerMesh.castShadow = true;

  scene.add(playerMesh);

  ZYRO.playerMesh = playerMesh;

  // ==========================================================
  // TECLADO
  // ==========================================================

  const keys = {};

  addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (e.code === "Space") {
      ZYRO.input.jump = true;
      e.preventDefault();
    }

    if (e.key === "Shift") {
      ZYRO.input.run = true;
    }

    if (e.key.toLowerCase() === "e") {
      ZYRO.input.action = true;
    }
  });

  addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;

    if (e.key === "Shift") {
      ZYRO.input.run = false;
    }
  });

  // ==========================================================
  // JOYSTICK ESQUERDO
  // ==========================================================

  const joyZone =
    document.getElementById("joy-zone");

  const joyKnob =
    document.getElementById("joy-knob");

  let joyActive = false;
  let joyPointer = null;

  let joyX = 0;
  let joyY = 0;

  function joyCenter() {
    const r = joyZone.getBoundingClientRect();

    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };
  }

  function joyMove(x, y) {
    const center = joyCenter();

    let dx = x - center.x;
    let dy = y - center.y;

    const radius =
      joyZone.getBoundingClientRect().width / 2;

    const d = Math.hypot(dx, dy);

    if (d > radius) {
      dx = dx / d * radius;
      dy = dy / d * radius;
    }

    joyX = dx / radius;
    joyY = dy / radius;

    if (joyKnob) {
      joyKnob.style.transform =
        `translate(${dx}px,${dy}px)`;
    }
  }

  if (joyZone) {

    joyZone.style.touchAction = "none";

    joyZone.addEventListener(
      "pointerdown",
      e => {
        e.preventDefault();

        joyActive = true;
        joyPointer = e.pointerId;

        joyZone.setPointerCapture(
          e.pointerId
        );

        joyMove(
          e.clientX,
          e.clientY
        );
      }
    );

    joyZone.addEventListener(
      "pointermove",
      e => {
        if (!joyActive) return;
        if (e.pointerId !== joyPointer) return;

        e.preventDefault();

        joyMove(
          e.clientX,
          e.clientY
        );
      }
    );

    const joyEnd = e => {
      if (
        joyPointer !== null &&
        e.pointerId !== joyPointer
      ) return;

      joyActive = false;
      joyPointer = null;

      joyX = 0;
      joyY = 0;

      if (joyKnob) {
        joyKnob.style.transform =
          "translate(0,0)";
      }
    };

    joyZone.addEventListener(
      "pointerup",
      joyEnd
    );

    joyZone.addEventListener(
      "pointercancel",
      joyEnd
    );
  }

  // ==========================================================
  // JOYSTICK DIREITO
  // CÂMERA / CABEÇA / VISÃO
  // ==========================================================

  let lookZone =
    document.getElementById("look-zone");

  if (!lookZone) {

    lookZone = document.createElement("div");

    lookZone.id = "look-zone";

    Object.assign(
      lookZone.style,
      {
        position: "fixed",
        top: "0",
        right: "0",
        width: "50%",
        height: "100%",
        zIndex: "5",
        background: "transparent",
        touchAction: "none"
      }
    );

    document.body.appendChild(
      lookZone
    );
  }

  let lookActive = false;
  let lookPointer = null;

  let lastLookX = 0;
  let lastLookY = 0;

  lookZone.addEventListener(
    "pointerdown",
    e => {

      if (ZYRO.paused) return;

      e.preventDefault();

      lookActive = true;
      lookPointer = e.pointerId;

      lastLookX = e.clientX;
      lastLookY = e.clientY;

      try {
        lookZone.setPointerCapture(
          e.pointerId
        );
      } catch (_) {}
    }
  );

  lookZone.addEventListener(
    "pointermove",
    e => {

      if (!lookActive) return;

      if (e.pointerId !== lookPointer)
        return;

      const dx =
        e.clientX - lastLookX;

      const dy =
        e.clientY - lastLookY;

      lastLookX = e.clientX;
      lastLookY = e.clientY;

      cameraYaw -=
        dx * CFG.sensitivityX;

      cameraPitch -=
        dy * CFG.sensitivityY;

      cameraPitch = Math.max(
        CFG.minPitch,
        Math.min(
          CFG.maxPitch,
          cameraPitch
        )
      );

      e.preventDefault();
    }
  );

  function stopLook() {
    lookActive = false;
    lookPointer = null;
  }

  lookZone.addEventListener(
    "pointerup",
    stopLook
  );

  lookZone.addEventListener(
    "pointercancel",
    stopLook
  );

  // ==========================================================
  // POI
  // ==========================================================

  function nearestPOI() {

    const list =
      window.ZYRO_POINTS_OF_INTEREST;

    if (!Array.isArray(list))
      return null;

    let nearest = null;
    let distance = Infinity;

    for (const poi of list) {

      const px =
        Number(
          poi.x ??
          poi.position?.x
        );

      const pz =
        Number(
          poi.z ??
          poi.position?.z
        );

      if (
        !Number.isFinite(px) ||
        !Number.isFinite(pz)
      ) continue;

      const d =
        Math.hypot(
          player.x - px,
          player.z - pz
        );

      const radius =
        Number(
          poi.radius ?? 2.8
        );

      if (
        d <= radius &&
        d < distance
      ) {
        nearest = poi;
        distance = d;
      }
    }

    return nearest;
  }

  // ==========================================================
  // BOTÃO AMARELO
  // ==========================================================

  const actionButton =
    document.getElementById(
      "action-btn"
    );

  function action() {

    const poi = nearestPOI();

    ZYRO.state.nearbyPOI = poi;

    if (poi) {

      ZYRO.input.action = true;

      window.dispatchEvent(
        new CustomEvent(
          "zyro:action",
          {
            detail: {
              poi: poi,
              player: player
            }
          }
        )
      );

      console.log(
        "ZYRO INTERAÇÃO:",
        poi
      );

    } else {

      ZYRO.input.jump = true;

    }
  }

  if (actionButton) {

    actionButton.addEventListener(
      "pointerdown",
      e => {
        e.preventDefault();
        action();
      }
    );

  }

  // ==========================================================
  // BOTÃO DE PULO EXISTENTE
  // ==========================================================

  const jumpButton =
    document.getElementById(
      "jump-btn"
    );

  if (jumpButton) {

    jumpButton.addEventListener(
      "pointerdown",
      e => {
        e.preventDefault();
        ZYRO.input.jump = true;
      }
    );

  }

  // ==========================================================
  // BOTÃO RUN
  // ==========================================================

  let runButton =
    document.getElementById(
      "run-btn"
    );

  if (!runButton) {

    runButton =
      document.createElement("button");

    runButton.id = "run-btn";
    runButton.textContent = "RUN";

    Object.assign(
      runButton.style,
      {
        position: "fixed",
        right: "24px",
        bottom: "205px",
        width: "68px",
        height: "68px",
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,.3)",
        background: "rgba(15,15,15,.8)",
        color: "#fffef2",
        fontWeight: "700",
        zIndex: "40",
        touchAction: "none"
      }
    );

    document.body.appendChild(
      runButton
    );
  }

  runButton.addEventListener(
    "pointerdown",
    e => {

      e.preventDefault();

      if (
        ZYRO.state.stamina > 5
      ) {
        ZYRO.input.run = true;
      }
    }
  );

  runButton.addEventListener(
    "pointerup",
    e => {
      e.preventDefault();
      ZYRO.input.run = false;
    }
  );

  runButton.addEventListener(
    "pointercancel",
    () => {
      ZYRO.input.run = false;
    }
  );

  // ==========================================================
  // ESTAMINA HUD
  // ==========================================================

  let staminaHUD =
    document.getElementById(
      "stamina-hud"
    );

  if (!staminaHUD) {

    staminaHUD =
      document.createElement("div");

    staminaHUD.id =
      "stamina-hud";

    Object.assign(
      staminaHUD.style,
      {
        position: "fixed",
        left: "50%",
        bottom: "20px",
        transform: "translateX(-50%)",
        width: "180px",
        height: "9px",
        padding: "2px",
        border: "1px solid rgba(255,255,255,.35)",
        borderRadius: "8px",
        background: "rgba(0,0,0,.55)",
        zIndex: "40",
        pointerEvents: "none"
      }
    );

    const fill =
      document.createElement("div");

    fill.id =
      "stamina-fill";

    Object.assign(
      fill.style,
      {
        width: "100%",
        height: "100%",
        borderRadius: "6px",
        background: "#d99a32",
        transformOrigin: "left"
      }
    );

    staminaHUD.appendChild(
      fill
    );

    document.body.appendChild(
      staminaHUD
    );
  }

  const staminaFill =
    document.getElementById(
      "stamina-fill"
    );

  function updateStaminaHUD() {

    if (!staminaFill)
      return;

    const ratio =
      ZYRO.state.stamina /
      CFG.staminaMax;

    staminaFill.style.transform =
      `scaleX(${Math.max(0, ratio)})`;
  }

  // ==========================================================
  // INPUT
  // ==========================================================

  function readInput() {

    let x = joyX;
    let z = joyY;

    if (
      keys["a"] ||
      keys["arrowleft"]
    ) x -= 1;

    if (
      keys["d"] ||
      keys["arrowright"]
    ) x += 1;

    if (
      keys["w"] ||
      keys["arrowup"]
    ) z -= 1;

    if (
      keys["s"] ||
      keys["arrowdown"]
    ) z += 1;

    const length =
      Math.hypot(x, z);

    if (length > 1) {
      x /= length;
      z /= length;
    }

    ZYRO.input.x = x;
    ZYRO.input.z = z;
  }

  // ==========================================================
  // MOVIMENTO
  // ==========================================================

  function updatePlayer(dt) {

    readInput();

    if (ZYRO.paused)
      return;

    const ix =
      ZYRO.input.x;

    const iz =
      ZYRO.input.z;

    const magnitude =
      Math.hypot(ix, iz);

    const moving =
      magnitude > 0.05;

    // --------------------------
    // CORRIDA / ESTAMINA
    // --------------------------

    let running = false;

    if (
      ZYRO.input.run &&
      moving &&
      ZYRO.state.stamina > 0
    ) {

      running = true;

      ZYRO.state.stamina -=
        CFG.staminaDrain * dt;

    } else {

      ZYRO.state.stamina +=
        CFG.staminaRecover * dt;
    }

    ZYRO.state.stamina =
      Math.max(
        0,
        Math.min(
          CFG.staminaMax,
          ZYRO.state.stamina
        )
      );

    if (
      ZYRO.state.stamina <= 0
    ) {
      ZYRO.input.run = false;
      running = false;
    }

    ZYRO.state.running =
      running;

    updateStaminaHUD();

    // --------------------------
    // DIREÇÃO RELATIVA À CÂMERA
    // --------------------------

    if (moving) {

      const nx =
        ix / magnitude;

      const nz =
        iz / magnitude;

      const forwardX =
        -Math.sin(cameraYaw);

      const forwardZ =
        -Math.cos(cameraYaw);

      const rightX =
        Math.cos(cameraYaw);

      const rightZ =
        -Math.sin(cameraYaw);

      let moveX =
        rightX * nx +
        forwardX * (-nz);

      let moveZ =
        rightZ * nx +
        forwardZ * (-nz);

      const len =
        Math.hypot(
          moveX,
          moveZ
        );

      if (len > 0) {

        moveX /= len;
        moveZ /= len;

      }

      const speed =
        running
          ? CFG.runSpeed
          : CFG.speed;

      player.vx =
        moveX * speed;

      player.vz =
        moveZ * speed;

      // personagem vira para onde anda

      playerMesh.rotation.y =
        Math.atan2(
          moveX,
          moveZ
        );

    } else {

      player.vx *=
        Math.pow(
          0.001,
          dt
        );

      player.vz *=
        Math.pow(
          0.001,
          dt
        );
    }

    // --------------------------
    // POSIÇÃO
    // --------------------------

    player.x +=
      player.vx * dt;

    player.z +=
      player.vz * dt;

    // --------------------------
    // LIMITES BÁSICOS
    // --------------------------

    player.x =
      Math.max(
        -20,
        Math.min(
          20,
          player.x
        )
      );

    player.z =
      Math.max(
        -20,
        Math.min(
          20,
          player.z
        )
      );

    // --------------------------
    // PULO
    // --------------------------

    if (
      ZYRO.input.jump &&
      player.grounded
    ) {

      player.vy =
        CFG.jump;

      player.grounded =
        false;
    }

    ZYRO.input.jump =
      false;

    // --------------------------
    // GRAVIDADE
    // --------------------------

    player.vy -=
      CFG.gravity * dt;

    player.y +=
      player.vy * dt;

    // --------------------------
    // PLATAFORMAS
    // --------------------------

    let floorY = 0;

    const colliders =
      window.ZYRO_WORLD_COLLIDERS;

    if (
      colliders &&
      Array.isArray(
        colliders.platforms
      )
    ) {

      for (
        const p of colliders.platforms
      ) {

        if (
          player.x >= p.minX &&
          player.x <= p.maxX &&
          player.z >= p.minZ &&
          player.z <= p.maxZ &&
          p.y <= player.y + 1
        ) {

          floorY =
            Math.max(
              floorY,
              p.y
            );
        }
      }
    }

    if (
      player.y <= floorY
    ) {

      player.y =
        floorY;

      player.vy =
        0;

      player.grounded =
        true;
    }

    // --------------------------
    // MESH
    // --------------------------

    playerMesh.position.set(
      player.x,
      player.y + 0.9,
      player.z
    );

    // --------------------------
    // POI
    // --------------------------

    ZYRO.state.nearbyPOI =
      nearestPOI();
  }

  // ==========================================================
  // CÂMERA
  // ==========================================================

  function updateCamera(dt) {

    const target =
      new THREE.Vector3(
        player.x,
        player.y +
          CFG.cameraLookHeight,
        player.z
      );

    const horizontal =
      CFG.cameraDistance *
      Math.cos(cameraPitch);

    const vertical =
      CFG.cameraDistance *
      Math.sin(cameraPitch);

    const desired =
      new THREE.Vector3(
        player.x +
          Math.sin(cameraYaw) *
          horizontal,

        player.y +
          CFG.cameraHeight +
          vertical,

        player.z +
          Math.cos(cameraYaw) *
          horizontal
      );

    const factor =
      1 -
      Math.exp(
        -CFG.cameraSmooth * dt
      );

    camera.position.lerp(
      desired,
      factor
    );

    camera.lookAt(
      target
    );
  }

  // ==========================================================
  // RESIZE
  // ==========================================================

  addEventListener(
    "resize",
    () => {

      camera.aspect =
        innerWidth /
        innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        innerWidth,
        innerHeight
      );
    }
  );

  // ==========================================================
  // LOOP
  // ==========================================================

  const clock =
    new THREE.Clock();

  ZYRO.clock =
    clock;

  function animate() {

    requestAnimationFrame(
      animate
    );

    const dt =
      Math.min(
        clock.getDelta(),
        0.05
      );

    updatePlayer(dt);
    updateCamera(dt);

    renderer.render(
      scene,
      camera
    );
  }

  // ==========================================================
  // BOOT
  // ==========================================================

  ZYRO.state.initialized =
    true;

  console.log(
    "ZYRO GAME.JS V0.2 carregado"
  );

  animate();

})();