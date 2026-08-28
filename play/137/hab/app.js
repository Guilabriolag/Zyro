// ============================================================
// ZYRO — HABITAT (teste)
// Terreno / território explorável em três.js: térreo, subsolo,
// 1º e 2º andar, lago com física simples, colisão de paredes,
// pontos de interação (lojas + bichinhos), pular/interagir,
// e um "smartphone" com telas "em breve".
// ============================================================

(() => {
  "use strict";

  // ---------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------
  const CONFIG = {
    gravity: -22,
    walkSpeed: 5.2,
    runMult: 1.7,
    jumpVel: 8.2,
    playerRadius: 0.4,
    playerHeight: 1.7,
    floor1Y: 4.4,
    floor2Y: 8.8,
    basementY: -4.2,
    interactRange: 2.6,
  };

  // ---------------------------------------------------------
  // COLLIDERS DO MUNDO (paredes + plataformas)
  // ---------------------------------------------------------
  // Plataformas: onde o chão existe em cada altura (AABB em X/Z)
  const platforms = [
    // térreo (com buraco retangular pro lago, tratado à parte)
    { name: "terreo", minX: -26, maxX: 26, minZ: -20, maxZ: 20, y: 0 },
    // subsolo — cobre a área toda, um nível abaixo
    { name: "subsolo", minX: -26, maxX: 26, minZ: -20, maxZ: 20, y: CONFIG.basementY },
    // 1º andar — anel ao redor do átrio central (vão da escada rolante)
    { name: "f1_norte", minX: -18, maxX: 18, minZ: 6, maxZ: 17, y: CONFIG.floor1Y },
    { name: "f1_sul_o", minX: -18, maxX: -3, minZ: -17, maxZ: -6, y: CONFIG.floor1Y },
    { name: "f1_sul_l", minX: 3, maxX: 18, minZ: -17, maxZ: -6, y: CONFIG.floor1Y },
    { name: "f1_leste", minX: 8, maxX: 18, minZ: -6, maxZ: 6, y: CONFIG.floor1Y },
    { name: "f1_oeste", minX: -18, maxX: -8, minZ: -6, maxZ: 6, y: CONFIG.floor1Y },
    // 2º andar — anel menor
    { name: "f2_norte", minX: -12, maxX: 12, minZ: 6, maxZ: 13, y: CONFIG.floor2Y },
    { name: "f2_sul", minX: -12, maxX: 12, minZ: -13, maxZ: -6, y: CONFIG.floor2Y },
  ];

  // Lago: buraco no térreo (sem plataforma ali) — água em y = -0.6
  const LAKE = { minX: -9, maxX: 9, minZ: -19.4, maxZ: -9, waterY: -0.6, floorY: -3.2 };

  // Rampa pro subsolo (perto do lago, lado leste)
  const RAMP = { minX: 12, maxX: 18, minZ: -19.5, maxZ: -13, topY: 0, botY: CONFIG.basementY };

  // Escadas rolantes: sobem ao longo de Z. A 2ª fica deslocada em X pra não
  // ocupar exatamente o mesmo corredor da 1ª (evita ambiguidade de suporte).
  const escalators = [
    { minX: -2.2, maxX: 2.2, minZ: -6, maxZ: 6, y0: 0, y1: CONFIG.floor1Y, carry: 1.5 },
    { minX: 5, maxX: 9.4, minZ: -6, maxZ: 6, y0: CONFIG.floor1Y, y1: CONFIG.floor2Y, carry: 1.5 },
  ];

  // Paredes externas (colisão sólida) — perímetro do térreo
  const walls = [
    { minX: -26.3, maxX: -25.7, minZ: -20.5, maxZ: 20.5, minY: -0.2, maxY: 6 },
    { minX: 25.7, maxX: 26.3, minZ: -20.5, maxZ: 20.5, minY: -0.2, maxY: 6 },
    { minX: -26.5, maxX: 26.5, minZ: -20.5, maxZ: -19.7, minY: -0.2, maxY: 6 },
    { minX: -26.5, maxX: 26.5, minZ: 19.7, maxZ: 20.5, minY: -0.2, maxY: 6 },
  ];

  // ---------------------------------------------------------
  // THREE SETUP
  // ---------------------------------------------------------
  const canvas = document.getElementById("world");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);
  scene.fog = new THREE.Fog(0x0b1220, 30, 90);

  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 300);

  const hemi = new THREE.HemisphereLight(0x8fb8ff, 0x1a1420, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4d6, 1.1);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -35; sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
  scene.add(sun);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  function box(w, h, d, color, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.85, metalness: opts.metalness ?? 0.05 });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function addAt(mesh, x, y, z) { mesh.position.set(x, y, z); worldGroup.add(mesh); return mesh; }

  // ---- pisos ----
  function slabColor(name) {
    if (name === "subsolo") return 0x161b28;
    if (name.startsWith("f1")) return 0x28324a;
    if (name.startsWith("f2")) return 0x2e3a56;
    return 0x22314a;
  }
  function renderSlab(minX, maxX, minZ, maxZ, y, color) {
    const w = maxX - minX, d = maxZ - minZ;
    if (w <= 0 || d <= 0) return;
    addAt(box(w, 0.5, d, color), (minX + maxX) / 2, y - 0.25, (minZ + maxZ) / 2);
  }
  platforms.forEach(p => {
    if (p.name === "terreo") {
      // recorta o térreo em volta do lago e da rampa (que já tem piso próprio)
      renderSlab(p.minX, p.maxX, LAKE.maxZ, p.maxZ, p.y, slabColor(p.name)); // norte do lago
      renderSlab(p.minX, LAKE.minX, LAKE.minZ, LAKE.maxZ, p.y, slabColor(p.name)); // oeste do lago
      renderSlab(RAMP.maxX, p.maxX, LAKE.minZ, LAKE.maxZ, p.y, slabColor(p.name)); // leste do lago, depois da rampa
      renderSlab(LAKE.minX, RAMP.minX, LAKE.minZ, LAKE.maxZ, p.y, slabColor(p.name)); // faixa entre lago e rampa
      renderSlab(p.minX, p.maxX, p.minZ, LAKE.minZ, p.y, slabColor(p.name)); // sul do lago/rampa
      return;
    }
    renderSlab(p.minX, p.maxX, p.minZ, p.maxZ, p.y, slabColor(p.name));
  });

  // ---- água do lago ----
  // (o slab do térreo cobre a área toda por baixo; a água entra visualmente
  // por cima, na altura certa, então o "buraco" nunca aparece vazio)
  const waterGeo = new THREE.PlaneGeometry(LAKE.maxX - LAKE.minX, LAKE.maxZ - LAKE.minZ, 20, 20);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2aa4c9, transparent: true, opacity: 0.72, roughness: 0.25, metalness: 0.1 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set((LAKE.minX + LAKE.maxX) / 2, LAKE.waterY, (LAKE.minZ + LAKE.maxZ) / 2);
  water.receiveShadow = true;
  worldGroup.add(water);
  const waterBasePos = water.geometry.attributes.position.array.slice();

  // fundo do lago (visual, abaixo da água)
  addAt(box(LAKE.maxX - LAKE.minX, 0.4, LAKE.maxZ - LAKE.minZ, 0x123044), (LAKE.minX + LAKE.maxX) / 2, LAKE.floorY, (LAKE.minZ + LAKE.maxZ) / 2);

  // ---- rampa pro subsolo ----
  {
    const rw = RAMP.maxX - RAMP.minX, rd = RAMP.maxZ - RAMP.minZ;
    const rampMesh = box(rw, 0.5, rd, 0x394866);
    rampMesh.rotation.x = Math.atan2(RAMP.topY - RAMP.botY, rd);
    addAt(rampMesh, (RAMP.minX + RAMP.maxX) / 2, (RAMP.topY + RAMP.botY) / 2, (RAMP.minZ + RAMP.maxZ) / 2);
  }

  // ---- escadas rolantes (visual: caixa inclinada + trilhos) ----
  escalators.forEach(es => {
    const d = es.maxZ - es.minZ, w = es.maxX - es.minX;
    const m = box(w, 0.4, d, 0x3a5f52, { metalness: 0.3, roughness: 0.5 });
    m.rotation.x = Math.atan2(es.y1 - es.y0, d);
    addAt(m, (es.minX + es.maxX) / 2, (es.y0 + es.y1) / 2, (es.minZ + es.maxZ) / 2);
    for (const side of [-1, 1]) {
      const rail = box(0.12, 1.1, d, 0x5df1c9, { metalness: 0.6, roughness: 0.2 });
      rail.rotation.x = m.rotation.x;
      addAt(rail, (es.minX + es.maxX) / 2 + side * w / 2, (es.y0 + es.y1) / 2 + 0.5, (es.minZ + es.maxZ) / 2);
    }
  });

  // ---- paredes externas ----
  walls.forEach(w => {
    const width = w.maxX - w.minX, depth = w.maxZ - w.minZ, height = w.maxY - w.minY;
    addAt(box(width, height, depth, 0x1a2236, { metalness: 0.1 }), (w.minX + w.maxX) / 2, (w.minY + w.maxY) / 2, (w.minZ + w.maxZ) / 2);
  });

  // ---- lojas / pontos de interação fixos ----
  const STORE_DEFS = [
    { name: "Loja Nébula Chips", desc: "Snacks estelares e recarga de energia.", x: -20, y: 0, z: 0, color: 0xff9f5a },
    { name: "Loja Ártemis Wear", desc: "Roupas pro seu bichinho explorar biomas frios.", x: 20, y: 0, z: 0, color: 0xff79d0 },
    { name: "Estúdio Bioluz", desc: "Personalize a cor e o brilho da sua criatura.", x: 0, y: CONFIG.floor1Y, z: 15, color: 0x5df1c9 },
    { name: "Aquapônica Zyro", desc: "Equipamentos pra biomas aquáticos.", x: -14, y: CONFIG.floor1Y, z: -12, color: 0x62c2ff },
    { name: "Laboratório Gzero", desc: "Scanner dimensional e diagnósticos.", x: 0, y: CONFIG.floor2Y, z: -10, color: 0x9dff4a },
    { name: "Depósito", desc: "Itens guardados e cargas antigas.", x: 20, y: CONFIG.basementY, z: -16, color: 0x8892b0 },
  ];

  const interactables = []; // {mesh, name, desc, type, radius, onInteract}

  function makeKiosk(def) {
    const g = new THREE.Group();
    const base = box(2.2, 0.15, 1.6, 0x11151f);
    base.position.y = 0.08;
    g.add(base);
    const body = box(1.8, 2.1, 1.2, def.color, { metalness: 0.15, roughness: 0.5 });
    body.position.y = 1.15;
    g.add(body);
    const sign = box(1.9, 0.4, 0.1, 0x0b0e16);
    sign.position.set(0, 2.35, 0.65);
    g.add(sign);
    addAt(g, def.x, def.y, def.z);
    interactables.push({
      obj: g, name: def.name, desc: def.desc, type: "loja", radius: CONFIG.interactRange,
      onInteract: () => toast(`${def.name}`, "Em breve: catálogo completo. Por ora, só admire a vitrine.")
    });
    return g;
  }
  STORE_DEFS.forEach(makeKiosk);

  // entrada (pórtico)
  {
    const g = new THREE.Group();
    const postL = box(1, 6, 1, 0x394866); postL.position.set(-6, 3, 19.2);
    const postR = box(1, 6, 1, 0x394866); postR.position.set(6, 3, 19.2);
    const top = box(13, 1, 1.4, 0x5df1c9, { metalness: 0.4 }); top.position.set(0, 6, 19.2);
    g.add(postL, postR, top);
    worldGroup.add(g);
  }

  // ---------------------------------------------------------
  // BICHINHOS (criaturas exploráveis / interagíveis / adquiríveis)
  // ---------------------------------------------------------
  function hash(s) { let h = 2166136261 >>> 0; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

  const CREATURE_DEFS = [
    { seed: "xy-ath-01", home: "lago", x: -3, z: -14 },
    { seed: "vor-ix-02", home: "lago", x: 4, z: -15 },
    { seed: "nyx-um-03", home: "terreo", x: 10, z: 8 },
    { seed: "thal-esh-04", home: "f1", x: -10, z: 12 },
    { seed: "grix-ora-05", home: "f2", x: 5, z: -9 },
  ];

  const creatures = [];
  const owned = new Set(); // seeds adquiridos

  function buildCreatureMesh(h) {
    const hue = h % 360;
    const color = new THREE.Color(`hsl(${hue}, 70%, 60%)`);
    const g = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(0.5, 20, 16);
    bodyGeo.scale(1, 0.8, 1.2);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1, emissive: color, emissiveIntensity: 0.15 });
    const body = new THREE.Mesh(bodyGeo, mat);
    body.castShadow = true;
    g.add(body);
    const finGeo = new THREE.ConeGeometry(0.22, 0.5, 8);
    const fin = new THREE.Mesh(finGeo, mat);
    fin.rotation.z = Math.PI / 2;
    fin.position.set(-0.55, 0.1, 0);
    g.add(fin);
    return g;
  }

  CREATURE_DEFS.forEach(def => {
    const h = hash(def.seed);
    const mesh = buildCreatureMesh(h);
    let baseY = 0.6;
    if (def.home === "lago") baseY = LAKE.waterY + 0.1;
    if (def.home === "f1") baseY = CONFIG.floor1Y + 0.6;
    if (def.home === "f2") baseY = CONFIG.floor2Y + 0.6;
    addAt(mesh, def.x, baseY, def.z);
    const c = {
      seed: def.seed, home: def.home, mesh, baseY,
      pos: new THREE.Vector3(def.x, baseY, def.z),
      target: new THREE.Vector3(def.x, baseY, def.z),
      speed: 1.2 + (h % 100) / 100, timer: 0, phase: Math.random() * 10,
    };
    creatures.push(c);
    interactables.push({
      obj: mesh, name: alienName(h), desc: owned.has(def.seed) ? "Já é seu companheiro." : "Um bichinho selvagem. Interaja pra fazer carinho ou adquirir.",
      type: "criatura", radius: 2.2, creature: c,
      onInteract: () => interactCreature(c),
    });
  });

  function alienName(h) {
    const a = ["Xy", "Vor", "Qel", "Zha", "Nyx", "Thal", "Kry", "Or", "Vel", "Ith"];
    const b = ["ath", "on", "ix", "ux", "ara", "eth", "oth", "yn", "ora", "esh"];
    return a[h % a.length] + b[(h >> 5) % b.length];
  }

  let petCount = 0;
  function interactCreature(c) {
    petCount++;
    const already = owned.has(c.seed);
    if (!already && petCount % 3 === 0) {
      owned.add(c.seed);
      toast("Novo companheiro!", `Você adquiriu ${alienName(hash(c.seed))}. Ele agora te segue por perto.`);
    } else {
      toast(alienName(hash(c.seed)), already ? "Seu companheiro balança de alegria." : "A criatura reage ao seu carinho. Continue interagindo pra conquistar a confiança dela.");
    }
  }

  function updateCreatures(dt, t) {
    creatures.forEach(c => {
      c.timer -= dt;
      if (c.timer <= 0) {
        const range = c.home === "lago" ? 4 : 3.5;
        c.target.set(c.pos.x + (Math.random() - 0.5) * range * 2, c.baseY, c.pos.z + (Math.random() - 0.5) * range * 2);
        c.timer = 2 + Math.random() * 3;
      }
      const dx = c.target.x - c.pos.x, dz = c.target.z - c.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const step = Math.min(d, c.speed * dt);
      c.pos.x += dx / d * step; c.pos.z += dz / d * step;
      c.pos.y = c.baseY + Math.sin(t * 1.6 + c.phase) * 0.12;
      c.mesh.position.copy(c.pos);
      if (d > 0.05) c.mesh.rotation.y = Math.atan2(dx, dz);
      if (owned.has(c.seed)) {
        // segue o player suavemente
        const pdx = player.pos.x - c.pos.x, pdz = player.pos.z - c.pos.z;
        const pd = Math.hypot(pdx, pdz);
        if (pd > 3) { c.pos.x += pdx / pd * c.speed * dt * 1.4; c.pos.z += pdz / pd * c.speed * dt * 1.4; }
      }
    });
  }

  // ---------------------------------------------------------
  // JOGADOR / FÍSICA
  // ---------------------------------------------------------
  const player = {
    pos: new THREE.Vector3(0, 0.9, 16),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: Math.PI,
    grounded: true,
    inWater: false,
  };

  // curY = altura atual dos pés do jogador. Só aceitamos como apoio uma
  // superfície até um degrau acima disso (evita "teleportar" pro andar de
  // cima só por pisar na área XZ de uma escada/plataforma mais alta).
  function supportY(x, z, curY = 999) {
    let best = -Infinity, found = false;
    const consider = (val) => { if (val <= curY + 1.4 && val > best) { best = val; found = true; } };
    const overLake = x >= LAKE.minX && x <= LAKE.maxX && z >= LAKE.minZ && z <= LAKE.maxZ;
    for (const p of platforms) {
      if (p.name === "terreo" && overLake) continue; // térreo tem um buraco onde fica o lago
      if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) consider(p.y);
    }
    // rampa
    if (x >= RAMP.minX && x <= RAMP.maxX && z >= RAMP.minZ && z <= RAMP.maxZ) {
      const tt = (z - RAMP.minZ) / (RAMP.maxZ - RAMP.minZ);
      consider(RAMP.botY + (RAMP.topY - RAMP.botY) * (1 - tt));
    }
    // escadas rolantes
    for (const es of escalators) {
      if (x >= es.minX && x <= es.maxX && z >= es.minZ && z <= es.maxZ) {
        const tt = (z - es.minZ) / (es.maxZ - es.minZ);
        consider(es.y0 + (es.y1 - es.y0) * (1 - tt));
      }
    }
    // buraco do lago no térreo: dentro da área do lago, o fundo do lago
    // sempre conta como apoio (mesmo que fique bem abaixo do jogador).
    if (x >= LAKE.minX && x <= LAKE.maxX && z >= LAKE.minZ && z <= LAKE.maxZ) {
      found = true; best = Math.max(best, LAKE.floorY);
    }
    return found ? best : -50; // vazio = queda livre
  }

  function isInLake(x, z) {
    return x >= LAKE.minX && x <= LAKE.maxX && z >= LAKE.minZ && z <= LAKE.maxZ;
  }

  function resolveWalls(pos, r) {
    for (const w of walls) {
      if (pos.y + 1 < w.minY || pos.y > w.maxY) continue;
      const cx = Math.max(w.minX, Math.min(pos.x, w.maxX));
      const cz = Math.max(w.minZ, Math.min(pos.z, w.maxZ));
      const dx = pos.x - cx, dz = pos.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r && d > 0.0001) {
        const push = (r - d);
        pos.x += dx / d * push; pos.z += dz / d * push;
      } else if (d === 0) {
        pos.x += r; // fallback
      }
    }
  }

  // input
  const keys = {};
  addEventListener("keydown", e => { keys[e.code] = true; if (e.code === "Space") doJump(); if (e.code === "KeyE") doInteractNearest(); });
  addEventListener("keyup", e => { keys[e.code] = false; });

  let moveVec = { x: 0, y: 0 }; // do joystick virtual
  let wantJump = false;

  function doJump() {
    if (player.grounded) { player.vel.y = CONFIG.jumpVel; player.grounded = false; }
    else if (player.inWater) { player.vel.y = 4.5; }
  }

  let nearest = null;
  function doInteractNearest() {
    if (nearest) nearest.onInteract();
  }

  function updatePlayer(dt) {
    const ax = (moveVec.x || 0) + (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const az = (moveVec.y || 0) + (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    const camF = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
    const camR = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const move = new THREE.Vector3()
      .addScaledVector(camF, -az)
      .addScaledVector(camR, ax);
    if (move.lengthSq() > 1) move.normalize();

    const speed = CONFIG.walkSpeed * (keys.ShiftLeft ? CONFIG.runMult : 1) * (player.inWater ? 0.55 : 1);
    player.vel.x = move.x * speed;
    player.vel.z = move.z * speed;

    player.inWater = isInLake(player.pos.x, player.pos.z) && player.pos.y < LAKE.waterY + 0.4;

    if (!player.inWater) player.vel.y += CONFIG.gravity * dt;
    else player.vel.y += (CONFIG.gravity * 0.18) * dt;

    const feetY = player.pos.y - 0.9;
    // escada rolante: se sobre uma e no degrau certo, empurra pra cima ao longo de Z
    for (const es of escalators) {
      if (player.pos.x >= es.minX && player.pos.x <= es.maxX && player.pos.z >= es.minZ && player.pos.z <= es.maxZ) {
        const groundHere = supportY(player.pos.x, player.pos.z, feetY);
        if (Math.abs(feetY - groundHere) < 0.6) {
          player.pos.z -= es.carry * dt;
        }
      }
    }

    player.pos.x += player.vel.x * dt;
    player.pos.z += player.vel.z * dt;
    resolveWalls(player.pos, CONFIG.playerRadius);
    player.pos.y += player.vel.y * dt;

    const ground = supportY(player.pos.x, player.pos.z, player.pos.y - 0.9);
    if (player.inWater) {
      const floatY = LAKE.waterY - 0.35;
      if (player.pos.y < floatY - 1.2) { player.pos.y += (floatY - 1.2 - player.pos.y) * 0.1; }
      if (player.pos.y > LAKE.waterY + 1.2) player.vel.y -= 2 * dt;
      player.grounded = false;
    } else if (player.pos.y <= ground + 0.9) {
      player.pos.y = ground + 0.9;
      player.vel.y = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }

    if (move.lengthSq() > 0.001) {
      player.yaw = Math.atan2(move.x, move.z);
      playerMesh.rotation.y = player.yaw;
    }
    playerMesh.position.set(player.pos.x, player.pos.y - 0.9, player.pos.z);

    // interação mais próxima
    let best = null, bestD = Infinity;
    interactables.forEach(it => {
      const wp = new THREE.Vector3(); it.obj.getWorldPosition(wp);
      const d = Math.hypot(wp.x - player.pos.x, wp.z - player.pos.z);
      if (d < it.radius && d < bestD) { bestD = d; best = it; }
    });
    nearest = best;
    updateInteractionHUD(best);
  }

  // player mesh (cápsula simples)
  const playerMesh = new THREE.Group();
  const pBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 4, 8), new THREE.MeshStandardMaterial({ color: 0xeaf6ff, roughness: 0.6 }));
  pBody.position.y = 0.9; pBody.castShadow = true;
  playerMesh.add(pBody);
  const pVisor = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), new THREE.MeshStandardMaterial({ color: 0x5df1ff, emissive: 0x2aa4c9, emissiveIntensity: 0.6 }));
  pVisor.position.set(0, 1.55, 0.3);
  playerMesh.add(pVisor);
  scene.add(playerMesh);

  // ---------------------------------------------------------
  // CÂMERA (terceira pessoa, orbital simples)
  // ---------------------------------------------------------
  let camYaw = Math.PI, camPitch = 0.35, camDist = 7.5;
  function updateCamera() {
    const cx = player.pos.x - Math.sin(camYaw) * Math.cos(camPitch) * camDist;
    const cz = player.pos.z - Math.cos(camYaw) * Math.cos(camPitch) * camDist;
    const cy = player.pos.y + 1.6 + Math.sin(camPitch) * camDist;
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.18);
    camera.lookAt(player.pos.x, player.pos.y + 1.1, player.pos.z);
  }

  // ---------------------------------------------------------
  // UI: joystick, botões, HUD de interação, smartphone
  // ---------------------------------------------------------
  const interactionBox = document.getElementById("interaction-box");
  const interactionTitle = document.getElementById("interaction-title");
  const interactionDesc = document.getElementById("interaction-description");
  const btnInteract = document.getElementById("btn-interact");

  function updateInteractionHUD(it) {
    if (it) {
      interactionBox.classList.add("active");
      interactionTitle.textContent = it.name;
      interactionDesc.textContent = it.desc;
      btnInteract.classList.add("ready");
    } else {
      interactionBox.classList.remove("active");
      interactionTitle.textContent = "Nada por perto";
      interactionDesc.textContent = "Explore o habitat";
      btnInteract.classList.remove("ready");
    }
  }

  btnInteract.addEventListener("click", doInteractNearest);
  document.getElementById("btn-jump").addEventListener("click", doJump);

  // joystick virtual (esquerda)
  (function setupJoystick() {
    const pad = document.getElementById("joypad");
    const nub = document.getElementById("joynub");
    let active = false, id = null;
    const R = 42;
    function center() { const r = pad.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    function move(cx, cy) {
      const c = center();
      let dx = cx - c.x, dy = cy - c.y;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      nub.style.transform = `translate(${dx}px, ${dy}px)`;
      moveVec.x = dx / R; moveVec.y = dy / R;
    }
    pad.addEventListener("pointerdown", e => { active = true; id = e.pointerId; pad.setPointerCapture(id); move(e.clientX, e.clientY); });
    pad.addEventListener("pointermove", e => { if (active && e.pointerId === id) move(e.clientX, e.clientY); });
    function end(e) { if (e.pointerId !== id) return; active = false; nub.style.transform = "translate(0,0)"; moveVec.x = 0; moveVec.y = 0; }
    pad.addEventListener("pointerup", end); pad.addEventListener("pointercancel", end);
  })();

  // arraste com o dedo/mouse na tela pra girar câmera (fora do joystick/botões)
  (function setupCameraDrag() {
    let dragging = false, lastX = 0, lastY = 0, pid = null;
    canvas.addEventListener("pointerdown", e => { dragging = true; pid = e.pointerId; lastX = e.clientX; lastY = e.clientY; });
    addEventListener("pointermove", e => {
      if (!dragging || e.pointerId !== pid) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      camYaw -= dx * 0.006;
      camPitch = Math.max(0.08, Math.min(1.1, camPitch + dy * 0.004));
    });
    addEventListener("pointerup", e => { if (e.pointerId === pid) dragging = false; });
  })();

  // toast de interação
  let toastTimer = null;
  function toast(title, desc) {
    const el = document.getElementById("event-toast");
    el.innerHTML = `<b>${title}</b><br><span>${desc}</span>`;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  // ---- smartphone (overlay "em breve") ----
  const phoneBtn = document.getElementById("btn-phone");
  const phoneOverlay = document.getElementById("phone-overlay");
  const phoneClose = document.getElementById("phone-close");
  phoneBtn.addEventListener("click", () => phoneOverlay.classList.add("open"));
  phoneClose.addEventListener("click", () => phoneOverlay.classList.remove("open"));
  phoneOverlay.addEventListener("click", e => { if (e.target === phoneOverlay) phoneOverlay.classList.remove("open"); });

  // ---------------------------------------------------------
  // LOOP
  // ---------------------------------------------------------
  let last = performance.now();
  function animate(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    updatePlayer(dt);
    updateCreatures(dt, t);
    updateCamera();

    // ondulação da água
    const pos = water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = waterBasePos[i * 3], bz = waterBasePos[i * 3 + 2];
      pos.setY(i, Math.sin(bx * 0.5 + t * 1.4) * 0.06 + Math.cos(bz * 0.4 + t * 1.1) * 0.06);
    }
    pos.needsUpdate = true;
    water.geometry.computeVertexNormals();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener("resize", resize);
  resize();

  document.getElementById("loading-screen").classList.add("hidden");
  requestAnimationFrame(animate);
})();
