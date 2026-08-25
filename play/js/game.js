// ============================================================
// ZYRO — GAME.JS
// Núcleo inicial do jogo
// ============================================================

(() => {
  "use strict";

  // ------------------------------------------------------------
  // CONFIGURAÇÃO
  // ------------------------------------------------------------

  const CONFIG = {
    moveSpeed: 4.0,
    cameraDistance: 7,
    cameraHeight: 4,
    playerHeight: 1.8,
    gravity: -18,
    jumpForce: 7,
    interactionDistance: 2.0
  };

  // ------------------------------------------------------------
  // ESTADO GLOBAL DO JOGO
  // ------------------------------------------------------------

  const GameState = {
    running: true,
    paused: false,

    player: {
      x: 0,
      y: 0,
      z: 0,

      velocityX: 0,
      velocityY: 0,
      velocityZ: 0,

      rotation: 0,
      grounded: true
    },

    input: {
      x: 0,
      y: 0,
      jump: false,
      interact: false
    }
  };

  // ------------------------------------------------------------
  // THREE.JS
  // ------------------------------------------------------------

  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x9fa8ad);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(
    0,
    CONFIG.cameraHeight,
    CONFIG.cameraDistance
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);

  // ------------------------------------------------------------
  // CONTROLES DE CÂMERA
  // ------------------------------------------------------------

  const cameraState = {
    yaw: 0,
    pitch: 0.35,

    distance: CONFIG.cameraDistance,

    target: new THREE.Vector3()
  };

  // ------------------------------------------------------------
  // ILUMINAÇÃO
  // ------------------------------------------------------------

  const ambientLight = new THREE.HemisphereLight(
    0xffffff,
    0x667788,
    1.2
  );

  scene.add(ambientLight);

  const sun = new THREE.DirectionalLight(
    0xffffff,
    1.5
  );

  sun.position.set(
    -30,
    50,
    30
  );

  sun.castShadow = true;

  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;

  scene.add(sun);

  // ------------------------------------------------------------
  // JOGADOR — PLACEHOLDER
  //
  // Depois substituímos este objeto pelo personagem real.
  // ------------------------------------------------------------

  const playerGroup = new THREE.Group();

  const playerBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      0.35,
      1.0,
      8,
      16
    ),
    new THREE.MeshStandardMaterial({
      color: 0x5fd0a0,
      roughness: 0.65
    })
  );

  playerBody.position.y = 0.85;
  playerBody.castShadow = true;

  playerGroup.add(playerBody);

  // cabeça

  const playerHead = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.28,
      16,
      16
    ),
    new THREE.MeshStandardMaterial({
      color: 0x8dd8b8,
      roughness: 0.7
    })
  );

  playerHead.position.y = 1.65;
  playerHead.castShadow = true;

  playerGroup.add(playerHead);

  scene.add(playerGroup);

  // ------------------------------------------------------------
  // CHÃO TEMPORÁRIO
  //
  // Será substituído pelo complexo esportivo.
  // ------------------------------------------------------------

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: 0x6b8e4e,
      roughness: 0.95
    })
  );

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  scene.add(ground);

  // ------------------------------------------------------------
  // JOYSTICK
  // ------------------------------------------------------------

  const joystick = {
    active: false,

    pointerId: null,

    x: 0,
    y: 0,

    centerX: 0,
    centerY: 0,

    radius: 0
  };

  const joyZone =
    document.getElementById("joy-zone");

  const joyKnob =
    document.getElementById("joy-knob");

  if (joyZone && joyKnob) {

    function updateJoystick(
      clientX,
      clientY
    ) {

      let dx =
        clientX - joystick.centerX;

      let dy =
        clientY - joystick.centerY;

      const distance =
        Math.hypot(dx, dy);

      if (distance > joystick.radius) {

        dx =
          dx / distance *
          joystick.radius;

        dy =
          dy / distance *
          joystick.radius;
      }

      joystick.x =
        dx / joystick.radius;

      joystick.y =
        dy / joystick.radius;

      joyKnob.style.transform =
        `translate(${dx}px, ${dy}px)`;
    }

    joyZone.addEventListener(
      "pointerdown",
      event => {

        event.preventDefault();

        joystick.active = true;
        joystick.pointerId =
          event.pointerId;

        const rect =
          joyZone.getBoundingClientRect();

        joystick.centerX =
          rect.left +
          rect.width / 2;

        joystick.centerY =
          rect.top +
          rect.height / 2;

        joystick.radius =
          rect.width * 0.29;

        joyZone.setPointerCapture(
          event.pointerId
        );

        updateJoystick(
          event.clientX,
          event.clientY
        );
      }
    );

    joyZone.addEventListener(
      "pointermove",
      event => {

        if (
          !joystick.active ||
          event.pointerId !==
          joystick.pointerId
        ) return;

        updateJoystick(
          event.clientX,
          event.clientY
        );
      }
    );

    function releaseJoystick() {

      joystick.active = false;
      joystick.pointerId = null;

      joystick.x = 0;
      joystick.y = 0;

      joyKnob.style.transform =
        "translate(0px, 0px)";
    }

    joyZone.addEventListener(
      "pointerup",
      releaseJoystick
    );

    joyZone.addEventListener(
      "pointercancel",
      releaseJoystick
    );
  }

  // ------------------------------------------------------------
  // TECLADO
  // ------------------------------------------------------------

  const keys = {};

  window.addEventListener(
    "keydown",
    event => {

      keys[event.key.toLowerCase()] =
        true;

      if (
        event.key === " " ||
        event.key.toLowerCase() === "w"
      ) {
        GameState.input.jump = true;
      }
    }
  );

  window.addEventListener(
    "keyup",
    event => {

      keys[event.key.toLowerCase()] =
        false;
    }
  );

  // ------------------------------------------------------------
  // BOTÃO DE INTERAÇÃO
  // ------------------------------------------------------------

  const actionButton =
    document.getElementById(
      "action-btn"
    );

  if (actionButton) {

    actionButton.addEventListener(
      "click",
      () => {

        GameState.input.interact =
          true;

        if (
          typeof window.ZYRO_INTERACT ===
          "function"
        ) {
          window.ZYRO_INTERACT();
        }
      }
    );
  }

  // ------------------------------------------------------------
  // PAUSE
  // ------------------------------------------------------------

  window.ZYRO_PAUSE = function() {

    GameState.paused =
      !GameState.paused;

    document.body.classList.toggle(
      "game-paused",
      GameState.paused
    );

    return GameState.paused;
  };

  // ------------------------------------------------------------
  // MOVIMENTO
  // ------------------------------------------------------------

  function readInput() {

    let x = joystick.x;
    let y = joystick.y;

    if (keys["a"] || keys["arrowleft"])
      x -= 1;

    if (keys["d"] || keys["arrowright"])
      x += 1;

    if (keys["w"] || keys["arrowup"])
      y -= 1;

    if (keys["s"] || keys["arrowdown"])
      y += 1;

    const magnitude =
      Math.hypot(x, y);

    if (magnitude > 1) {

      x /= magnitude;
      y /= magnitude;
    }

    GameState.input.x = x;
    GameState.input.y = y;
  }

  // ------------------------------------------------------------
  // FÍSICA BÁSICA
  // ------------------------------------------------------------

  function updatePlayer(dt) {

    readInput();

    if (GameState.paused)
      return;

    const inputX =
      GameState.input.x;

    const inputY =
      GameState.input.y;

    const moving =
      Math.hypot(
        inputX,
        inputY
      ) > 0.05;

    if (moving) {

      const worldX =
        inputX;

      const worldZ =
        inputY;

      GameState.player.velocityX =
        worldX *
        CONFIG.moveSpeed;

      GameState.player.velocityZ =
        worldZ *
        CONFIG.moveSpeed;

      const targetRotation =
        Math.atan2(
          worldX,
          worldZ
        );

      playerGroup.rotation.y =
        THREE.MathUtils.lerp(
          playerGroup.rotation.y,
          targetRotation,
          0.18
        );

    } else {

      GameState.player.velocityX *=
        0.80;

      GameState.player.velocityZ *=
        0.80;
    }

    // gravidade

    GameState.player.velocityY +=
      CONFIG.gravity * dt;

    // salto

    if (
      GameState.input.jump &&
      GameState.player.grounded
    ) {

      GameState.player.velocityY =
        CONFIG.jumpForce;

      GameState.player.grounded =
        false;
    }

    GameState.input.jump = false;

    // posição

    GameState.player.x +=
      GameState.player.velocityX * dt;

    GameState.player.y +=
      GameState.player.velocityY * dt;

    GameState.player.z +=
      GameState.player.velocityZ * dt;

    // chão

    if (
      GameState.player.y <= 0
    ) {

      GameState.player.y = 0;

      GameState.player.velocityY =
        0;

      GameState.player.grounded =
        true;
    }

    playerGroup.position.set(
      GameState.player.x,
      GameState.player.y,
      GameState.player.z
    );
  }

  // ------------------------------------------------------------
  // CÂMERA DE TERCEIRA PESSOA
  // ------------------------------------------------------------

  function updateCamera() {

    const playerPosition =
      playerGroup.position;

    cameraState.target.copy(
      playerPosition
    );

    cameraState.target.y += 1.0;

    const horizontalDistance =
      Math.cos(cameraState.pitch) *
      cameraState.distance;

    const verticalDistance =
      Math.sin(cameraState.pitch) *
      cameraState.distance;

    const offsetX =
      Math.sin(cameraState.yaw) *
      horizontalDistance;

    const offsetZ =
      Math.cos(cameraState.yaw) *
      horizontalDistance;

    camera.position.set(
      playerPosition.x + offsetX,
      playerPosition.y +
        verticalDistance +
        1.0,
      playerPosition.z + offsetZ
    );

    camera.lookAt(
      cameraState.target
    );
  }

  // ------------------------------------------------------------
  // RESIZE
  // ------------------------------------------------------------

  window.addEventListener(
    "resize",
    () => {

      camera.aspect =
        window.innerWidth /
        window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );
    }
  );

  // ------------------------------------------------------------
  // LOOP
  // ------------------------------------------------------------

  let lastTime =
    performance.now();

  function loop(now) {

    const dt =
      Math.min(
        (now - lastTime) / 1000,
        0.05
      );

    lastTime = now;

    updatePlayer(dt);
    updateCamera();

    renderer.render(
      scene,
      camera
    );

    requestAnimationFrame(
      loop
    );
  }

  // ------------------------------------------------------------
  // API PÚBLICA DO ZYRO
  // ------------------------------------------------------------

  window.ZYRO = {

    scene,

    camera,

    renderer,

    player: GameState.player,

    pause() {
      return window.ZYRO_PAUSE();
    },

    getState() {
      return GameState;
    },

    teleport(x, y, z) {

      GameState.player.x = x;
      GameState.player.y = y;
      GameState.player.z = z;

      playerGroup.position.set(
        x,
        y,
        z
      );
    }
  };

  // ------------------------------------------------------------
  // INICIAR
  // ------------------------------------------------------------

  requestAnimationFrame(loop);

})();