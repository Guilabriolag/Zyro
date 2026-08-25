// ============================================================
// ZYRO — GAME.JS
// Núcleo do jogo
// Jogador + câmera + joystick + movimento + gravidade
// ============================================================

(() => {
  "use strict";

  // ==========================================================
  // CONFIGURAÇÃO
  // ==========================================================

  const CONFIG = {
    player: {
      height: 1.8,
      radius: 0.35,
      speed: 5.0,
      jumpForce: 6.5,
      gravity: 18.0
    },

    camera: {
      distance: 7.5,
      height: 4.5,
      lookHeight: 1.0,
      smooth: 7.0
    },

    world: {
      minX: -80,
      maxX: 80,
      minZ: -45,
      maxZ: 55
    }
  };


  // ==========================================================
  // ESTADO GLOBAL ZYRO
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
      action: false
    },

    state: {
      initialized: false
    },

    pause() {
      this.paused = !this.paused;
      return this.paused;
    },

    getState() {
      return {
        paused: this.paused,
        player: this.player,
        input: this.input
      };
    }
  };


  window.ZYRO = ZYRO;


  // ==========================================================
  // CENA
  // ==========================================================

  const scene = new THREE.Scene();

window.dispatchEvent(
  new Event("zyro:game-ready")
);

  scene.background =
    new THREE.Color(0xd7dde2);

  scene.fog =
    new THREE.Fog(
      0xd7dde2,
      70,
      180
    );

  ZYRO.scene = scene;


  // ==========================================================
  // CÂMERA
  // ==========================================================

  const camera =
    new THREE.PerspectiveCamera(
      60,
      window.innerWidth /
      window.innerHeight,
      0.1,
      1000
    );

  camera.position.set(
    8,
    6,
    10
  );

  ZYRO.camera = camera;


  // ==========================================================
  // RENDERER
  // ==========================================================

  const renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      2
    )
  );

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.shadowMap.enabled = true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.outputEncoding =
    THREE.sRGBEncoding;

  renderer.domElement.id =
    "zyro-canvas";

  const shell =
    document.getElementById(
      "game-shell"
    );

  if (shell) {
    shell.appendChild(
      renderer.domElement
    );
  } else {
    document.body.appendChild(
      renderer.domElement
    );
  }

  ZYRO.renderer = renderer;


  // ==========================================================
  // ILUMINAÇÃO
  // ==========================================================

  const ambient =
    new THREE.AmbientLight(
      0xffffff,
      0.65
    );

  scene.add(ambient);


  const sun =
    new THREE.DirectionalLight(
      0xffffff,
      1.1
    );

  sun.position.set(
    -25,
    45,
    25
  );

  sun.castShadow = true;

  sun.shadow.mapSize.set(
    2048,
    2048
  );

  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;

  scene.add(sun);


  // ==========================================================
  // CÂMERA DE TERCEIRA PESSOA
  // ==========================================================

  let cameraYaw = Math.PI;
  let cameraPitch = 0.28;

  let cameraTarget =
    new THREE.Vector3();

  let cameraPosition =
    new THREE.Vector3();

  let cameraLook =
    new THREE.Vector3();


  // ==========================================================
  // JOGADOR
  // ==========================================================

  const player = {

    x: -4,
    y: 0,
    z: 7,

    vx: 0,
    vy: 0,
    vz: 0,

    grounded: true,

    radius:
      CONFIG.player.radius,

    height:
      CONFIG.player.height,

    speed:
      CONFIG.player.speed
  };

  ZYRO.player = player;


  // ==========================================================
  // MATERIAL DO PLAYER
  // ==========================================================

  const playerMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x5fd0a0,
      roughness: 0.65
    });


  // Corpo

  const body =
    new THREE.Mesh(
      new THREE.CapsuleGeometry(
        0.35,
        0.9,
        6,
        12
      ),
      playerMaterial
    );

  body.position.y =
    0.85;

  body.castShadow = true;

  body.receiveShadow = true;

  scene.add(body);

  ZYRO.playerMesh = body;


  // ==========================================================
  // MARCADOR DE DIREÇÃO
  // ==========================================================

  const directionMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xffffff
    });

  const direction =
    new THREE.Mesh(
      new THREE.ConeGeometry(
        0.12,
        0.35,
        8
      ),
      directionMaterial
    );

  direction.rotation.x =
    Math.PI / 2;

  direction.position.set(
    0,
    0.95,
    -0.48
  );

  body.add(direction);


  // ==========================================================
  // INPUT
  // ==========================================================

  const keys = {};


  window.addEventListener(
    "keydown",
    event => {

      keys[
        event.key.toLowerCase()
      ] = true;

      if (
        event.key === " "
      ) {

        event.preventDefault();

        ZYRO.input.jump =
          true;
      }

    }
  );


  window.addEventListener(
    "keyup",
    event => {

      keys[
        event.key.toLowerCase()
      ] = false;

    }
  );


  // ==========================================================
  // JOYSTICK
  // ==========================================================

  const joyZone =
    document.getElementById(
      "joy-zone"
    );

  const joyKnob =
    document.getElementById(
      "joy-knob"
    );

  let joystickActive = false;

  let joystickPointerId = null;

  let joystickCenter = {
    x: 0,
    y: 0
  };

  let joystickVector = {
    x: 0,
    y: 0
  };


  function getJoystickCenter() {

    if (!joyZone) {
      return {
        x: 0,
        y: 0
      };
    }

    const rect =
      joyZone.getBoundingClientRect();

    return {
      x:
        rect.left +
        rect.width / 2,

      y:
        rect.top +
        rect.height / 2
    };

  }


  function joystickStart(
    pointerId,
    x,
    y
  ) {

    if (!joyZone)
      return;

    joystickActive =
      true;

    joystickPointerId =
      pointerId;

    joystickCenter =
      getJoystickCenter();

    joystickMove(
      x,
      y
    );

  }


  function joystickMove(
    x,
    y
  ) {

    if (
      !joystickActive
    )
      return;

    const rect =
      joyZone.getBoundingClientRect();

    const maxRadius =
      rect.width / 2;

    let dx =
      x -
      joystickCenter.x;

    let dy =
      y -
      joystickCenter.y;

    const distance =
      Math.hypot(
        dx,
        dy
      );

    if (
      distance >
      maxRadius
    ) {

      dx =
        dx /
        distance *
        maxRadius;

      dy =
        dy /
        distance *
        maxRadius;

    }

    joystickVector.x =
      dx /
      maxRadius;

    joystickVector.y =
      dy /
      maxRadius;

    if (joyKnob) {

      joyKnob.style.transform =
        `translate(${dx}px, ${dy}px)`;

    }

  }


  function joystickEnd() {

    joystickActive =
      false;

    joystickPointerId =
      null;

    joystickVector.x = 0;
    joystickVector.y = 0;

    if (joyKnob) {

      joyKnob.style.transform =
        "translate(0,0)";

    }

  }


  if (joyZone) {

    joyZone.addEventListener(
      "pointerdown",
      event => {

        event.preventDefault();

        joyZone.setPointerCapture(
          event.pointerId
        );

        joystickStart(
          event.pointerId,
          event.clientX,
          event.clientY
        );

      }
    );


    joyZone.addEventListener(
      "pointermove",
      event => {

        if (
          event.pointerId !==
          joystickPointerId
        )
          return;

        event.preventDefault();

        joystickMove(
          event.clientX,
          event.clientY
        );

      }
    );


    joyZone.addEventListener(
      "pointerup",
      event => {

        if (
          event.pointerId !==
          joystickPointerId
        )
          return;

        joystickEnd();

      }
    );


    joyZone.addEventListener(
      "pointercancel",
      joystickEnd
    );

  }


  // ==========================================================
  // BOTÃO DE PULO
  // ==========================================================

  const jumpButton =
    document.getElementById(
      "jump-btn"
    );


  if (jumpButton) {

    jumpButton.addEventListener(
      "pointerdown",
      event => {

        event.preventDefault();

        ZYRO.input.jump =
          true;

      }
    );

  }


  // ==========================================================
  // BOTÃO DE INTERAÇÃO
  // ==========================================================

  const actionButton =
    document.getElementById(
      "action-btn"
    );


  if (actionButton) {

    actionButton.addEventListener(
      "pointerdown",
      event => {

        event.preventDefault();

        ZYRO.input.action =
          true;

      }
    );

  }


  // ==========================================================
  // MOVIMENTO DO JOGADOR
  // ==========================================================

  function updateInput() {

    let x =
      joystickVector.x;

    let z =
      joystickVector.y;


    // Teclado

    if (
      keys["a"] ||
      keys["arrowleft"]
    ) {

      x -= 1;

    }


    if (
      keys["d"] ||
      keys["arrowright"]
    ) {

      x += 1;

    }


    if (
      keys["w"] ||
      keys["arrowup"]
    ) {

      z -= 1;

    }


    if (
      keys["s"] ||
      keys["arrowdown"]
    ) {

      z += 1;

    }


    const length =
      Math.hypot(
        x,
        z
      );


    if (
      length > 1
    ) {

      x /= length;
      z /= length;

    }


    ZYRO.input.x =
      x;

    ZYRO.input.z =
      z;

  }


  // ==========================================================
  // MOVIMENTO RELATIVO À CÂMERA
  // ==========================================================

  function updatePlayer(
    dt
  ) {

    updateInput();


    if (
      ZYRO.paused
    ) {

      player.vx = 0;
      player.vz = 0;

      return;

    }


    let inputX =
      ZYRO.input.x;

    let inputZ =
      ZYRO.input.z;


    const inputLength =
      Math.hypot(
        inputX,
        inputZ
      );


    if (
      inputLength >
      0.05
    ) {

      inputX /=
        Math.max(
          inputLength,
          1
        );

      inputZ /=
        Math.max(
          inputLength,
          1
        );


      // Direção horizontal da câmera

      const forwardX =
        -Math.sin(
          cameraYaw
        );

      const forwardZ =
        -Math.cos(
          cameraYaw
        );


      const rightX =
        Math.cos(
          cameraYaw
        );

      const rightZ =
        -Math.sin(
          cameraYaw
        );


      const moveX =
        rightX * inputX +
        forwardX * (-inputZ);


      const moveZ =
        rightZ * inputX +
        forwardZ * (-inputZ);


      player.vx =
        moveX *
        player.speed;

      player.vz =
        moveZ *
        player.speed;


      // Rotaciona o personagem

      const angle =
        Math.atan2(
          moveX,
          moveZ
        );

      body.rotation.y =
        angle;

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


    // Movimento horizontal

    player.x +=
      player.vx *
      dt;

    player.z +=
      player.vz *
      dt;


    // Limites provisórios do mundo

    player.x =
      Math.max(
        CONFIG.world.minX,
        Math.min(
          CONFIG.world.maxX,
          player.x
        )
      );

    player.z =
      Math.max(
        CONFIG.world.minZ,
        Math.min(
          CONFIG.world.maxZ,
          player.z
        )
      );


    // ======================================================
    // PULO
    // ======================================================

    if (
      ZYRO.input.jump &&
      player.grounded
    ) {

      player.vy =
        CONFIG.player.jumpForce;

      player.grounded =
        false;

    }

    ZYRO.input.jump =
      false;


    // ======================================================
    // GRAVIDADE
    // ======================================================

    player.vy -=
      CONFIG.player.gravity *
      dt;

    player.y +=
      player.vy *
      dt;


    // Chão provisório

    if (
      player.y <= 0
    ) {

      player.y = 0;

      player.vy = 0;

      player.grounded =
        true;

    }


    // Atualiza mesh

    body.position.set(
      player.x,
      player.y +
      CONFIG.player.height / 2,
      player.z
    );

  }


  // ==========================================================
  // CÂMERA
  // ==========================================================

  function updateCamera(
    dt
  ) {

    const target =
      new THREE.Vector3(
        player.x,
        player.y +
        CONFIG.camera.lookHeight,
        player.z
      );


    cameraTarget.lerp(
      target,
      1 -
      Math.exp(
        -CONFIG.camera.smooth *
        dt
      )
    );


    const horizontalDistance =
      CONFIG.camera.distance *
      Math.cos(
        cameraPitch
      );


    const verticalDistance =
      CONFIG.camera.distance *
      Math.sin(
        cameraPitch
      );


    const desiredX =
      player.x +
      Math.sin(
        cameraYaw
      ) *
      horizontalDistance;


    const desiredZ =
      player.z +
      Math.cos(
        cameraYaw
      ) *
      horizontalDistance;


    const desiredY =
      player.y +
      CONFIG.camera.height +
      verticalDistance;


    cameraPosition.set(
      desiredX,
      desiredY,
      desiredZ
    );


    camera.position.lerp(
      cameraPosition,
      1 -
      Math.exp(
        -CONFIG.camera.smooth *
        dt
      )
    );


    cameraLook.copy(
      cameraTarget
    );


    camera.lookAt(
      cameraLook
    );

  }


  // ==========================================================
  // CÂMERA TOUCH / MOUSE
  // Arrastar fora do joystick gira a câmera.
  // ==========================================================

  let cameraDragging =
    false;

  let cameraPointerId =
    null;

  let lastPointerX = 0;
  let lastPointerY = 0;


  renderer.domElement.addEventListener(
    "pointerdown",
    event => {

      if (
        event.pointerType ===
        "mouse" &&
        event.button !== 0
      ) {

        return;

      }


      cameraDragging =
        true;

      cameraPointerId =
        event.pointerId;

      lastPointerX =
        event.clientX;

      lastPointerY =
        event.clientY;

      renderer.domElement.setPointerCapture(
        event.pointerId
      );

    }
  );


  renderer.domElement.addEventListener(
    "pointermove",
    event => {

      if (
        !cameraDragging ||
        event.pointerId !==
        cameraPointerId
      ) {

        return;

      }


      const dx =
        event.clientX -
        lastPointerX;

      const dy =
        event.clientY -
        lastPointerY;


      lastPointerX =
        event.clientX;

      lastPointerY =
        event.clientY;


      cameraYaw -=
        dx *
        0.006;


      cameraPitch -=
        dy *
        0.004;


      cameraPitch =
        Math.max(
          -0.05,
          Math.min(
            0.85,
            cameraPitch
          )
        );

    }
  );


  renderer.domElement.addEventListener(
    "pointerup",
    event => {

      if (
        event.pointerId ===
        cameraPointerId
      ) {

        cameraDragging =
          false;

        cameraPointerId =
          null;

      }

    }
  );


  renderer.domElement.addEventListener(
    "pointercancel",
    () => {

      cameraDragging =
        false;

      cameraPointerId =
        null;

    }
  );


  // ==========================================================
  // RESIZE
  // ==========================================================

  function resize() {

    const width =
      window.innerWidth;

    const height =
      window.innerHeight;


    camera.aspect =
      width /
      height;

    camera.updateProjectionMatrix();


    renderer.setSize(
      width,
      height
    );

  }


  window.addEventListener(
    "resize",
    resize
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


    if (
      !ZYRO.paused
    ) {

      updatePlayer(
        dt
      );

    }


    updateCamera(
      dt
    );


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
    "ZYRO GAME iniciado."
  );


  animate();

})();