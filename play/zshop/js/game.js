// ============================================================
// ZYRO — GAME.JS V0.3
// ESQUERDO = movimento
// DIREITO  = câmera / visão
// AMARELO  = ação / pulo
// RUN      = correr
// RESET    = reiniciar posição
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
    cameraLookHeight: 1,

    cameraSmooth: 8,

    lookSensitivity: 0.045,
    minPitch: -0.35,
    maxPitch: 0.75
  };

  // ==========================================================
  // ZYRO
  // ==========================================================

  const ZYRO = {

    scene: null,
    camera: null,
    renderer: null,

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

    reset() {
      resetPlayer();
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

  scene.background =
    new THREE.Color(0x18181c);

  ZYRO.scene = scene;

  // ==========================================================
  // CÂMERA
  // ==========================================================

  const camera =
    new THREE.PerspectiveCamera(
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

  const renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });

  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, 2)
  );

  renderer.setSize(
    innerWidth,
    innerHeight
  );

  renderer.shadowMap.enabled = true;

  const shell =
    document.getElementById("game-shell") ||
    document.getElementById("game-container");

  if (shell) {
    shell.appendChild(
      renderer.domElement
    );
  } else {
    document.body.appendChild(
      renderer.domElement
    );
  }

  renderer.domElement.id =
    "zyro-canvas";

  renderer.domElement.style.touchAction =
    "none";

  ZYRO.renderer = renderer;

  // ==========================================================
  // LUZ
  // ==========================================================

  scene.add(
    new THREE.AmbientLight(
      0xffffff,
      0.6
    )
  );

  const light =
    new THREE.DirectionalLight(
      0xffffff,
      0.7
    );

  light.position.set(
    -20,
    30,
    20
  );

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
    height: 1.8
  };

  ZYRO.player = player;

  const playerMesh =
    new THREE.Mesh(

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

  playerMesh.castShadow = true;

  scene.add(
    playerMesh
  );

  ZYRO.playerMesh =
    playerMesh;

  // ==========================================================
  // TECLADO
  // ==========================================================

  const keys = {};

  addEventListener(
    "keydown",
    e => {

      keys[
        e.key.toLowerCase()
      ] = true;

      if (e.code === "Space") {
        ZYRO.input.jump = true;
        e.preventDefault();
      }

      if (e.key === "Shift") {
        ZYRO.input.run = true;
      }

      if (
        e.key.toLowerCase() === "e"
      ) {
        ZYRO.input.action = true;
      }

      if (
        e.key.toLowerCase() === "r"
      ) {
        resetPlayer();
      }
    }
  );

  addEventListener(
    "keyup",
    e => {

      keys[
        e.key.toLowerCase()
      ] = false;

      if (e.key === "Shift") {
        ZYRO.input.run = false;
      }
    }
  );

  // ==========================================================
  // JOYSTICK ESQUERDO
  // ==========================================================

  const joyZone =
    document.getElementById(
      "joy-zone"
    );

  const joyKnob =
    document.getElementById(
      "joy-knob"
    );

  let leftActive = false;
  let leftPointer = null;

  let leftX = 0;
  let leftY = 0;

  function leftCenter() {

    const r =
      joyZone.getBoundingClientRect();

    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };
  }

  function updateLeft(
    x,
    y
  ) {

    if (!joyZone)
      return;

    const c =
      leftCenter();

    const r =
      joyZone.getBoundingClientRect();

    const radius =
      r.width / 2;

    let dx =
      x - c.x;

    let dy =
      y - c.y;

    const distance =
      Math.hypot(
        dx,
        dy
      );

    if (
      distance > radius
    ) {

      dx =
        dx / distance *
        radius;

      dy =
        dy / distance *
        radius;
    }

    leftX =
      dx / radius;

    leftY =
      dy / radius;

    if (joyKnob) {

      joyKnob.style.transform =
        `translate(${dx}px,${dy}px)`;
    }
  }

  function releaseLeft() {

    leftActive = false;
    leftPointer = null;

    leftX = 0;
    leftY = 0;

    if (joyKnob) {
      joyKnob.style.transform =
        "translate(0,0)";
    }
  }

  if (joyZone) {

    joyZone.style.touchAction =
      "none";

    joyZone.addEventListener(
      "pointerdown",
      e => {

        e.preventDefault();

        leftActive = true;
        leftPointer =
          e.pointerId;

        joyZone.setPointerCapture(
          e.pointerId
        );

        updateLeft(
          e.clientX,
          e.clientY
        );
      }
    );

    joyZone.addEventListener(
      "pointermove",
      e => {

        if (
          !leftActive ||
          e.pointerId !== leftPointer
        )
          return;

        e.preventDefault();

        updateLeft(
          e.clientX,
          e.clientY
        );
      }
    );

    joyZone.addEventListener(
      "pointerup",
      releaseLeft
    );

    joyZone.addEventListener(
      "pointercancel",
      releaseLeft
    );
  }

  // ==========================================================
  // JOYSTICK DIREITO — CÂMERA
  //
  // Criado automaticamente se o HTML ainda não possuir
  // #look-zone.
  // ==========================================================

  let lookZone =
    document.getElementById(
      "look-zone"
    );

  if (!lookZone) {

    lookZone =
      document.createElement(
        "div"
      );

    lookZone.id =
      "look-zone";

    Object.assign(
      lookZone.style,
      {
        position: "fixed",
        right: "28px",
        bottom: "28px",
        width: "145px",
        height: "145px",
        borderRadius: "50%",
        border:
          "1px solid rgba(255,255,255,.20)",
        background:
          "rgba(255,255,255,.035)",
        zIndex: "20",
        touchAction: "none",
        pointerEvents: "auto",
        boxSizing: "border-box"
      }
    );

    document.body.appendChild(
      lookZone
    );
  }

  // pequeno indicador central

  const lookKnob =
    document.createElement(
      "div"
    );

  Object.assign(
    lookKnob.style,
    {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: "42px",
      height: "42px",
      marginLeft: "-21px",
      marginTop: "-21px",
      borderRadius: "50%",
      background:
        "rgba(255,255,255,.12)",
      border:
        "1px solid rgba(255,255,255,.25)",
      pointerEvents: "none"
    }
  );

  lookZone.appendChild(
    lookKnob
  );

  let rightActive = false;
  let rightPointer = null;

  let lastRightX = 0;
  let lastRightY = 0;

  function rightDown(e) {

    if (ZYRO.paused)
      return;

    e.preventDefault();

    rightActive = true;
    rightPointer =
      e.pointerId;

    lastRightX =
      e.clientX;

    lastRightY =
      e.clientY;

    try {
      lookZone.setPointerCapture(
        e.pointerId
      );
    } catch (_) {}
  }

  function rightMove(e) {

    if (
      !rightActive ||
      e.pointerId !== rightPointer
    )
      return;

    e.preventDefault();

    const dx =
      e.clientX -
      lastRightX;

    const dy =
      e.clientY -
      lastRightY;

    lastRightX =
      e.clientX;

    lastRightY =
      e.clientY;

    cameraYaw -=
      dx * CFG.lookSensitivity;

    cameraPitch -=
      dy * CFG.lookSensitivity;

    cameraPitch =
      Math.max(
        CFG.minPitch,
        Math.min(
          CFG.maxPitch,
          cameraPitch
        )
      );

    // deslocamento visual do centro

    const max =
      35;

    const x =
      Math.max(
        -max,
        Math.min(
          max,
          dx * 1.5
        )
      );

    const y =
      Math.max(
        -max,
        Math.min(
          max,
          dy * 1.5
        )
      );

    lookKnob.style.transform =
      `translate(${x}px,${y}px)`;
  }

  function rightUp() {

    rightActive = false;
    rightPointer = null;

    lookKnob.style.transform =
      "translate(0,0)";
  }

  lookZone.addEventListener(
    "pointerdown",
    rightDown
  );

  lookZone.addEventListener(
    "pointermove",
    rightMove
  );

  lookZone.addEventListener(
    "pointerup",
    rightUp
  );

  lookZone.addEventListener(
    "pointercancel",
    rightUp
  );

  // ==========================================================
  // POI
  // ==========================================================

  function nearestPOI() {

    const list =
      window.ZYRO_POINTS_OF_INTEREST;

    if (
      !Array.isArray(list)
    )
      return null;

    let nearest = null;
    let min = Infinity;

    for (
      const poi of list
    ) {

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
      )
        continue;

      const distance =
        Math.hypot(
          player.x - px,
          player.z - pz
        );

      const radius =
        Number(
          poi.radius ?? 2.8
        );

      if (
        distance <= radius &&
        distance < min
      ) {

        min = distance;
        nearest = poi;
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

  function doAction() {

    const poi =
      nearestPOI();

    ZYRO.state.nearbyPOI =
      poi;

    if (poi) {

      ZYRO.input.action =
        true;

      window.dispatchEvent(
        new CustomEvent(
          "zyro:action",
          {
            detail: {
              poi,
              player
            }
          }
        )
      );

    } else {

      ZYRO.input.jump =
        true;
    }
  }

  if (actionButton) {

    actionButton.addEventListener(
      "pointerdown",
      e => {

        e.preventDefault();

        doAction();
      }
    );
  }

  // ==========================================================
  // BOTÃO DE PULO ANTIGO
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

        ZYRO.input.jump =
          true;
      }
    );
  }

  // ==========================================================
  // RUN
  // ==========================================================

  let runButton =
    document.getElementById(
      "run-btn"
    );

  if (!runButton) {

    runButton =
      document.createElement(
        "button"
      );

    runButton.id =
      "run-btn";

    runButton.textContent =
      "RUN";

    Object.assign(
      runButton.style,
      {
        position: "fixed",
        right: "190px",
        bottom: "45px",
        width: "65px",
        height: "65px",
        borderRadius: "50%",
        border:
          "1px solid rgba(255,255,255,.3)",
        background:
          "rgba(10,10,10,.75)",
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
        ZYRO.input.run =
          true;
      }
    }
  );

  runButton.addEventListener(
    "pointerup",
    e => {

      e.preventDefault();

      ZYRO.input.run =
        false;
    }
  );

  runButton.addEventListener(
    "pointercancel",
    () => {
      ZYRO.input.run =
        false;
    }
  );

  // ==========================================================
  // ESTAMINA
  // ==========================================================

  let stamina =
    document.getElementById(
      "stamina-hud"
    );

  if (!stamina) {

    stamina =
      document.createElement(
        "div"
      );

    stamina.id =
      "stamina-hud";

    Object.assign(
      stamina.style,
      {
        position: "fixed",
        left: "50%",
        bottom: "18px",
        transform:
          "translateX(-50%)",
        width: "160px",
        height: "8px",
        border:
          "1px solid rgba(255,255,255,.3)",
        borderRadius: "8px",
        background:
          "rgba(0,0,0,.5)",
        padding: "2px",
        zIndex: "40",
        pointerEvents: "none"
      }
    );

    const fill =
      document.createElement(
        "div"
      );

    fill.id =
      "stamina-fill";

    Object.assign(
      fill.style,
      {
        width: "100%",
        height: "100%",
        borderRadius: "6px",
        background: "#d99a32",
        transformOrigin:
          "left center"
      }
    );

    stamina.appendChild(
      fill
    );

    document.body.appendChild(
      stamina
    );
  }

  const staminaFill =
    document.getElementById(
      "stamina-fill"
    );

  function updateStamina() {

    if (!staminaFill)
      return;

    const ratio =
      ZYRO.state.stamina /
      CFG.staminaMax;

    staminaFill.style.transform =
      `scaleX(${Math.max(0, ratio)})`;
  }

  // ==========================================================
  // RESET
  // ==========================================================

  function resetPlayer() {

    player.x = 0;
    player.y = 0;
    player.z = 15;

    player.vx = 0;
    player.vy = 0;
    player.vz = 0;

    player.grounded = true;

    cameraYaw =
      Math.PI;

    cameraPitch =
      0.28;

    ZYRO.input.x = 0;
    ZYRO.input.z = 0;
    ZYRO.input.jump = false;
    ZYRO.input.action = false;
    ZYRO.input.run = false;

    ZYRO.state.stamina =
      CFG.staminaMax;

    ZYRO.state.running =
      false;

    ZYRO.state.nearbyPOI =
      null;

    playerMesh.position.set(
      player.x,
      player.y + 0.9,
      player.z
    );

    updateStamina();

    console.log(
      "ZYRO RESET"
    );
  }

  // qualquer botão com id reset-button funciona
  const resetButton =
    document.getElementById(
      "reset-button"
    );

  if (resetButton) {

    resetButton.addEventListener(
      "pointerdown",
      e => {

        e.preventDefault();

        resetPlayer();
      }
    );
  }

  // ==========================================================
  // INPUT
  // ==========================================================

  function readInput() {

    let x = leftX;
    let z = leftY;

    if (
      keys["a"] ||
      keys["arrowleft"]
    )
      x -= 1;

    if (
      keys["d"] ||
      keys["arrowright"]
    )
      x += 1;

    if (
      keys["w"] ||
      keys["arrowup"]
    )
      z -= 1;

    if (
      keys["s"] ||
      keys["arrowdown"]
    )
      z += 1;

    const length =
      Math.hypot(
        x,
        z
      );

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
      Math.hypot(
        ix,
        iz
      );

    const moving =
      magnitude > 0.05;

    // --------------------------
    // ESTAMINA
    // --------------------------

    let running = false;

    if (
      ZYRO.input.run &&
      moving &&
      ZYRO.state.stamina > 0
    ) {

      running = true;

      ZYRO.state.stamina -=
        CFG.staminaDrain *
        dt;

    } else {

      ZYRO.state.stamina +=
        CFG.staminaRecover *
        dt;
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

      ZYRO.input.run =
        false;

      running = false;
    }

    ZYRO.state.running =
      running;

    updateStamina();

    // --------------------------
    // MOVIMENTO RELATIVO À VISÃO
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
    // LIMITES
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
      CFG.gravity *
      dt;

    player.y +=
      player.vy *
      dt;

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

    playerMesh.position.set(
      player.x,
      player.y + 0.9,
      player.z
    );

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
        -CFG.cameraSmooth *
        dt
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
    "ZYRO GAME.JS V0.3 — DUAL TOUCH"
  );

  animate();

})();