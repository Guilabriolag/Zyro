import * as THREE from "three";

export const UPGRADE_KEYS = [
  "speed",
  "stamina",
  "coffee",
  "scanner",
  "stealth",
  "magnet",
] as const;

export type UpgradeKey = (typeof UPGRADE_KEYS)[number];
export type MessageTone = "info" | "success" | "danger";

export interface GameSnapshot {
  tickets: number;
  napkins: number;
  packs: number;
  carriedCores: number;
  cores: number;
  stamina: number;
  maxStamina: number;
  wave: number;
  binsLeft: number;
  binsTotal: number;
  baseDistance: number;
  baseBearing: number;
  threatDistance: number | null;
  alerted: boolean;
  nearBase: boolean;
  roundReady: boolean;
  hidden: boolean;
  interaction: string | null;
  effects: { name: string; color: string; time: number }[];
  upgrades: Record<UpgradeKey, number>;
}

export const INITIAL_SNAPSHOT: GameSnapshot = {
  tickets: 0,
  napkins: 0,
  packs: 0,
  carriedCores: 0,
  cores: 0,
  stamina: 100,
  maxStamina: 100,
  wave: 1,
  binsLeft: 6,
  binsTotal: 6,
  baseDistance: 6,
  baseBearing: 0,
  threatDistance: null,
  alerted: false,
  nearBase: false,
  roundReady: false,
  hidden: false,
  interaction: null,
  effects: [],
  upgrades: {
    speed: 0,
    stamina: 0,
    coffee: 0,
    scanner: 0,
    stealth: 0,
    magnet: 0,
  },
};

export function upgradePrice(key: UpgradeKey, level: number) {
  const prices: Record<UpgradeKey, number> = {
    speed: 35,
    stamina: 30,
    coffee: 45,
    scanner: 55,
    stealth: 65,
    magnet: 70,
  };
  return { tickets: prices[key] + level * 35, cores: key === "magnet" || (key === "stealth" && level > 0) ? 1 : 0 };
}

type Vec2 = { x: number; z: number };
type Obstacle = Vec2 & { hx: number; hz: number };
type ItemKind = "napkin" | "pack" | "core";
type Item = Vec2 & { kind: ItemKind; group: THREE.Group; active: boolean; baseY: number };
type Bin = Vec2 & { kind: "napkin" | "pack"; amount: number; group: THREE.Group; active: boolean };
type HideSpot = Vec2 & { group: THREE.Group; active: boolean };
type PowerKey = "cloak" | "blink" | "energy" | "turbo";
type Power = Vec2 & { key: PowerKey; group: THREE.Group; active: boolean; cooldown: number; baseY: number };
type Alien = Vec2 & {
  group: THREE.Group;
  cone: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  angle: number;
  mode: "patrol" | "chase";
  target: Vec2 | null;
  lastSeen: Vec2 | null;
  lost: number;
  stuck: number;
};
type Interaction = { kind: "bin" | "hide" | "exit"; target?: Bin | HideSpot; label: string };

const HALF = 30;
const BASE: Vec2 = { x: -24, z: 23 };
const START: Vec2 = { x: -24, z: 17 };
const VISION = 13;
const FOV = 1.5;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

function material(color: number, emissive = 0x000000, intensity = 1) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.12, emissive, emissiveIntensity: intensity });
}

function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = h > 0.5;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function orb(parent: THREE.Object3D, x: number, y: number, z: number, r: number, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function floorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#132b28";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 32; row++) {
    for (let col = 0; col < 32; col++) {
      const x = col * 32;
      const y = row * 32;
      const tone = Math.floor(rand(35, 49));
      ctx.fillStyle = `rgb(${Math.floor(tone * 0.48)}, ${tone}, ${Math.floor(tone * 0.86)})`;
      ctx.fillRect(x + 1, y + 1, 30, 30);
      ctx.strokeStyle = "rgba(116, 174, 150, .07)";
      ctx.strokeRect(x + 3.5, y + 3.5, 25, 25);
    }
  }
  ctx.strokeStyle = "rgba(149, 224, 174, .14)";
  ctx.lineWidth = 2;
  for (let n = 0; n <= 1024; n += 128) {
    ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, n); ctx.lineTo(1024, n); ctx.stroke();
  }
  for (let i = 0; i < 440; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(169, 231, 189, .09)" : "rgba(0, 0, 0, .13)";
    ctx.fillRect(rand(0, 1024), rand(0, 1024), rand(1, 4), rand(1, 4));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function signTexture(text: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#102923";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(5, 5, 502, 118);
  ctx.fillStyle = accent;
  ctx.font = "bold 55px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class GameEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(54, 1, 0.1, 150);
  private renderer: THREE.WebGLRenderer;
  private resizeObserver: ResizeObserver;
  private frameId = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private uiElapsed = 0;
  private started = false;
  private paused = true;
  private obstacles: Obstacle[] = [];
  private items: Item[] = [];
  private bins: Bin[] = [];
  private hides: HideSpot[] = [];
  private powers: Power[] = [];
  private aliens: Alien[] = [];
  private player = { x: START.x, z: START.z, angle: 0 };
  private playerGroup = new THREE.Group();
  private playerBody = new THREE.Group();
  private baseRing!: THREE.Mesh;
  private baseBeacon!: THREE.Mesh;
  private keys = new Set<string>();
  private joystick = { x: 0, y: 0 };
  private runHeld = false;
  private drag: { id: number; x: number; y: number } | null = null;
  private yaw = Math.PI / 4;
  private pitch = 0.72;
  private cameraDistance = 17;
  private tickets = 0;
  private napkins = 0;
  private packs = 0;
  private carriedCores = 0;
  private cores = 0;
  private stamina = 100;
  private exhausted = false;
  private stun = 0;
  private safe = 0;
  private hidden = 0;
  private wave = 1;
  private roundReady = false;
  private nearBase = false;
  private alerted = false;
  private interaction: Interaction | null = null;
  private litterClock = 0;
  private packClock = 0;
  private effects = { cloak: 0, turbo: 0, energy: 0 };
  private upgrades: Record<UpgradeKey, number> = { speed: 0, stamina: 0, coffee: 0, scanner: 0, stealth: 0, magnet: 0 };

  constructor(
    private container: HTMLElement,
    private onSnapshot: (snapshot: GameSnapshot) => void,
    private onMessage: (message: string, tone: MessageTone) => void,
    private onPauseRequest: () => void,
  ) {
    this.scene.background = new THREE.Color(0x071b19);
    this.scene.fog = new THREE.FogExp2(0x071b19, 0.018);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    const smallScreen = window.innerWidth <= 800 || window.matchMedia("(pointer: coarse)").matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.1 : 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = !smallScreen;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = "game-canvas";
    this.renderer.domElement.style.touchAction = "none";
    this.container.appendChild(this.renderer.domElement);

    this.buildWorld();
    this.createPlayer();
    this.createRound();
    this.camera.position.set(START.x + 10, 13, START.z + 10);
    this.camera.lookAt(START.x, 0, START.z);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    this.renderer.domElement.addEventListener("pointercancel", this.onPointerUp);
    this.renderer.domElement.addEventListener("wheel", this.onWheel, { passive: false });
    this.frameId = requestAnimationFrame(this.frame);
    this.emit();
  }

  private resize = () => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code) && this.started) event.preventDefault();
    this.keys.add(event.code);
    if (!this.started || this.paused || event.repeat) return;
    if (event.code === "KeyE" || event.code === "Space") this.interact();
    if (event.code === "Escape") this.onPauseRequest();
  };

  private onKeyUp = (event: KeyboardEvent) => { this.keys.delete(event.code); };
  private onBlur = () => { this.keys.clear(); this.runHeld = false; this.joystick = { x: 0, y: 0 }; };

  private onPointerDown = (event: PointerEvent) => {
    if (!this.started || this.paused) return;
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    this.yaw -= (event.clientX - this.drag.x) * 0.006;
    this.pitch = THREE.MathUtils.clamp(this.pitch + (event.clientY - this.drag.y) * 0.004, 0.35, 1.12);
    this.drag.x = event.clientX;
    this.drag.y = event.clientY;
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.drag?.id === event.pointerId) this.drag = null;
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.started || this.paused) return;
    event.preventDefault();
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + event.deltaY * 0.012, 11, 22);
  };

  private buildWorld() {
    this.scene.add(new THREE.HemisphereLight(0xcfffe6, 0x10342a, 2.2));
    const sun = new THREE.DirectionalLight(0xffe2aa, 2.3);
    sun.position.set(-15, 28, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -38;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 38;
    sun.shadow.camera.bottom = -38;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    const ambience = new THREE.PointLight(0x6cffb1, 18, 24, 2);
    ambience.position.set(-24, 5, 22);
    this.scene.add(ambience);

    const outside = new THREE.Mesh(new THREE.PlaneGeometry(230, 230), material(0x071713));
    outside.rotation.x = -Math.PI / 2;
    outside.position.y = -0.09;
    this.scene.add(outside);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.75, metalness: 0.08 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wall = material(0x193c35);
    const rail = material(0x65bd85, 0x228b4d, 0.55);
    const boundaries: [number, number, number, number][] = [[0, -31, 62, 2], [0, 31, 62, 2], [-31, 0, 2, 62], [31, 0, 2, 62]];
    for (const [x, z, w, d] of boundaries) {
      box(this.scene, x, 0.65, z, w, 1.3, d, wall);
      box(this.scene, x, 1.34, z, w > d ? w : 0.14, 0.09, w > d ? 0.14 : d, rail);
      this.obstacles.push({ x, z, hx: w / 2, hz: d / 2 });
    }

    const stores: [number, number, number, number, string, number][] = [
      [-17, -18, 7, 7, "ORBIT", 0x91efbb], [-3, -18, 8, 7, "NEBULA", 0xffba79],
      [12, -18, 8, 8, "SODA", 0x9de5ed], [23, -17, 7, 8, "NOVA", 0xd3b4ff],
      [-18, -2, 7, 8, "MATERIA", 0xffc575], [-4, -2, 8, 7, "GALAX", 0xa4f4bb],
      [11, -2, 8, 8, "POC-POFT", 0xffb884], [23, -1, 7, 7, "COSMO", 0x9ce7ea],
      [-17, 14, 7, 7, "CAFE", 0xffc575], [-4, 14, 8, 7, "LUNAR", 0xbadffa],
      [11, 14, 8, 7, "ASTRO", 0xb9f394], [23, 14, 7, 7, "BURGER", 0xffbb84],
    ];
    stores.forEach(([x, z, w, d, name, accent], index) => this.createStore(x, z, w, d, name, accent, index));

    for (let i = 0; i < 18; i++) {
      const angle = i / 18 * Math.PI * 2;
      const x = Math.cos(angle) * 27.5;
      const z = Math.sin(angle) * 27.5;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.5, 8), material(0x466e60));
      post.position.set(x, 1.25, z);
      this.scene.add(post);
      orb(this.scene, x, 2.55, z, 0.15, material(0xd2f9b5, 0xa6ff87, 2.5));
    }
    this.createBase();
  }

  private createStore(x: number, z: number, w: number, d: number, name: string, accent: number, index: number) {
    const height = 2.8 + (index % 3) * 0.25;
    const colors = [0x2c4e47, 0x4b5143, 0x344a54, 0x4c3f53];
    box(this.scene, x, height / 2, z, w, height, d, material(colors[index % colors.length]));
    box(this.scene, x, height + 0.06, z, w + 0.36, 0.15, d + 0.36, material(0x25483d));
    box(this.scene, x, height + 0.16, z + d / 2 + 0.16, w + 0.36, 0.065, 0.12, material(accent, accent, 0.45));
    box(this.scene, x, 1.08, z + d / 2 + 0.025, w - 1.2, 1.2, 0.055, material(0x153a35, 0x175a4e, 0.28));
    box(this.scene, x, 0.35, z + d / 2 + 0.08, w - 0.65, 0.12, 0.15, material(accent, accent, 0.5));
    for (const side of [-1, 1]) {
      box(this.scene, x + side * (w / 2 - 0.42), 1.2, z + d / 2 + 0.1, 0.28, 1.6, 0.12, material(accent, accent, 0.4));
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 0.7, 5.5), 0.84), new THREE.MeshBasicMaterial({ map: signTexture(name, `#${accent.toString(16).padStart(6, "0")}`), toneMapped: false }));
    sign.position.set(x, height - 0.55, z + d / 2 + 0.052);
    this.scene.add(sign);
    this.obstacles.push({ x, z, hx: w / 2, hz: d / 2 });
  }

  private createBase() {
    const group = new THREE.Group();
    group.position.set(BASE.x, 0, BASE.z);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.75, 0.15, 40), material(0x1c4b3c));
    pad.position.y = 0.09;
    pad.receiveShadow = true;
    group.add(pad);
    this.baseRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.09, 8, 48), new THREE.MeshBasicMaterial({ color: 0xb5ff8f, toneMapped: false }));
    this.baseRing.rotation.x = Math.PI / 2;
    this.baseRing.position.y = 0.23;
    group.add(this.baseRing);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.83, 1.35, 8), material(0x315549));
    pedestal.position.set(-1.35, 0.72, 0);
    group.add(pedestal);
    box(group, -1.35, 1.45, 0, 0.9, 0.5, 0.25, material(0xd6faaf, 0x8dff8c, 0.9));
    this.baseBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, 4, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xb5ff90, transparent: true, opacity: 0.065, side: THREE.DoubleSide, depthWrite: false }));
    this.baseBeacon.position.y = 2;
    group.add(this.baseBeacon);
    const icon = new THREE.Mesh(new THREE.OctahedronGeometry(0.36), material(0xd8ffc2, 0x8effa2, 1.4));
    icon.position.set(0, 3.5, 0);
    group.add(icon);
    this.scene.add(group);
  }

  private createPlayer() {
    const cream = material(0xe8f2dc, 0x2a4539, 0.3);
    const belt = material(0x7cdbaa, 0x309d69, 0.8);
    const dark = material(0x142b29);
    const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.67, 6, 12), cream);
    core.position.y = 0.98;
    core.castShadow = true;
    this.playerBody.add(core);
    const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.17, 14), belt);
    beltMesh.position.y = 0.72;
    this.playerBody.add(beltMesh);
    for (const side of [-1, 1]) {
      orb(this.playerBody, side * 0.18, 1.26, 0.356, 0.075, dark);
      orb(this.playerBody, side * 0.51, 0.86, 0, 0.12, cream);
    }
    box(this.playerBody, 0, 0.87, -0.44, 0.43, 0.57, 0.24, material(0x407763, 0x154c34, 0.25));
    orb(this.playerBody, 0, 1.83, 0, 0.07, material(0xb9ff9e, 0x8dff85, 1.7));
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.27, 6), cream);
    antenna.position.y = 1.69;
    this.playerBody.add(antenna);
    this.playerGroup.add(this.playerBody);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.65, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    this.playerGroup.add(shadow);
    this.playerGroup.position.set(this.player.x, 0, this.player.z);
    this.scene.add(this.playerGroup);
  }

  private isFree(x: number, z: number, radius: number) {
    if (Math.abs(x) > HALF - radius - 0.8 || Math.abs(z) > HALF - radius - 0.8) return false;
    return !this.obstacles.some((obstacle) => Math.abs(x - obstacle.x) < obstacle.hx + radius && Math.abs(z - obstacle.z) < obstacle.hz + radius);
  }

  private randomSpot(radius = 0.8, away = 0): Vec2 {
    for (let i = 0; i < 160; i++) {
      const x = rand(-HALF + 2, HALF - 2);
      const z = rand(-HALF + 2, HALF - 2);
      if (this.isFree(x, z, radius) && Math.hypot(x - START.x, z - START.z) > away) return { x, z };
    }
    return { x: 0, z: 7 };
  }

  private pushOut(position: Vec2, radius: number) {
    for (const b of this.obstacles) {
      const closestX = THREE.MathUtils.clamp(position.x, b.x - b.hx, b.x + b.hx);
      const closestZ = THREE.MathUtils.clamp(position.z, b.z - b.hz, b.z + b.hz);
      const dx = position.x - closestX;
      const dz = position.z - closestZ;
      const distance = Math.hypot(dx, dz);
      if (distance >= radius) continue;
      if (distance > 0.0001) {
        position.x += dx / distance * (radius - distance);
        position.z += dz / distance * (radius - distance);
      } else {
        const left = Math.abs(position.x - (b.x - b.hx));
        const right = Math.abs(position.x - (b.x + b.hx));
        const near = Math.abs(position.z - (b.z - b.hz));
        const far = Math.abs(position.z - (b.z + b.hz));
        const side = Math.min(left, right, near, far);
        if (side === left) position.x = b.x - b.hx - radius;
        else if (side === right) position.x = b.x + b.hx + radius;
        else if (side === near) position.z = b.z - b.hz - radius;
        else position.z = b.z + b.hz + radius;
      }
    }
    position.x = THREE.MathUtils.clamp(position.x, -HALF + 0.8, HALF - 0.8);
    position.z = THREE.MathUtils.clamp(position.z, -HALF + 0.8, HALF - 0.8);
  }

  private lineOfSight(a: Vec2, b: Vec2) {
    return !this.obstacles.some((wall) => {
      let near = 0;
      let far = 1;
      for (const [origin, delta, min, max] of [
        [a.x, b.x - a.x, wall.x - wall.hx, wall.x + wall.hx],
        [a.z, b.z - a.z, wall.z - wall.hz, wall.z + wall.hz],
      ]) {
        if (Math.abs(delta) < 0.00001) {
          if (origin < min || origin > max) return false;
        } else {
          const v1 = (min - origin) / delta;
          const v2 = (max - origin) / delta;
          near = Math.max(near, Math.min(v1, v2));
          far = Math.min(far, Math.max(v1, v2));
          if (near > far) return false;
        }
      }
      return true;
    });
  }

  private createRound() {
    const binSpots: Vec2[] = [
      { x: -25, z: 8 }, { x: -11, z: 6 }, { x: 4, z: 6 },
      { x: 17.5, z: 6 }, { x: 17, z: -10 }, { x: -11, z: -10 },
    ];
    binSpots.forEach((spot, index) => {
      const jitterX = this.wave === 1 ? 0 : rand(-1, 1);
      const jitterZ = this.wave === 1 ? 0 : rand(-1, 1);
      const x = this.isFree(spot.x + jitterX, spot.z + jitterZ, 1.1) ? spot.x + jitterX : spot.x;
      const z = this.isFree(x, spot.z + jitterZ, 1.1) ? spot.z + jitterZ : spot.z;
      this.createBin({ x, z }, index === 2 || index === 4 ? "pack" : "napkin", this.wave === 1 && index === 0 ? 36 : undefined);
    });
    const hideSpots: Vec2[] = [
      { x: -25, z: -1 }, { x: -14, z: 6 }, { x: 1, z: 6 },
      { x: 16, z: -1 }, { x: 1, z: -10 }, { x: -23, z: -12 },
    ];
    hideSpots.forEach((spot) => this.createHide(spot));
    for (let i = 0; i < 25; i++) this.spawnItem("napkin");
    for (let i = 0; i < 5; i++) this.spawnItem("pack");
    for (let i = 0; i < 3; i++) this.spawnItem("core");
    const powerSpots: Vec2[] = [{ x: -3, z: 7 }, { x: 18, z: -11 }, { x: -10, z: -25 }, { x: 24, z: 23 }];
    (["cloak", "blink", "energy", "turbo"] as PowerKey[]).forEach((key, index) => {
      const spot = powerSpots[index];
      this.createPower(key, this.isFree(spot.x, spot.z, 1.1) ? spot : this.randomSpot(1.1, 12));
    });
    for (let i = 0; i < Math.min(3 + this.wave - 1, 7); i++) this.createAlien();
  }

  private createBin(position: Vec2, kind: "napkin" | "pack", guaranteedAmount?: number) {
    const group = new THREE.Group();
    const color = kind === "napkin" ? 0x68bd8d : 0xffba76;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.54, 1.05, 10), material(kind === "napkin" ? 0x42695b : 0x70644f));
    body.position.y = 0.58;
    body.castShadow = true;
    group.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 0.14, 10), material(0x9bb8a3));
    lid.position.y = 1.16;
    group.add(lid);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 7, 24), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.25;
    group.add(ring);
    const light = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.91, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    light.rotation.x = -Math.PI / 2;
    light.position.y = 0.035;
    group.add(light);
    group.position.set(position.x, 0, position.z);
    this.scene.add(group);
    const amount = guaranteedAmount ?? (kind === "napkin" ? Math.floor(rand(15, 29)) : Math.floor(rand(2, 6)));
    this.bins.push({ ...position, kind, amount, group, active: true });
  }

  private createHide(position: Vec2) {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.28, 0.58, 8), material(0x977657));
    pot.position.y = 0.29;
    group.add(pot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.65, 6), material(0x4d8a57));
    stem.position.y = 0.82;
    group.add(stem);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const leaf = orb(group, Math.cos(angle) * 0.28, 1.02 + Math.sin(i * 3) * 0.07, Math.sin(angle) * 0.28, 0.27, material(i % 2 ? 0x61b875 : 0x417c55));
      leaf.scale.set(0.75, 0.5, 1.25);
      leaf.rotation.y = angle;
    }
    group.position.set(position.x, 0, position.z);
    this.scene.add(group);
    this.hides.push({ ...position, group, active: true });
  }

  private spawnItem(kind: ItemKind, near?: Vec2) {
    if (this.items.filter((item) => item.active && item.kind === kind).length > (kind === "napkin" ? 48 : kind === "pack" ? 9 : 5)) return;
    let position = this.randomSpot(0.7, kind === "core" ? 15 : 5);
    if (near) {
      for (let i = 0; i < 30; i++) {
        const x = near.x + rand(-3, 3);
        const z = near.z + rand(-3, 3);
        if (this.isFree(x, z, 0.7)) { position = { x, z }; break; }
      }
    }
    const group = new THREE.Group();
    let baseY = 0.18;
    if (kind === "napkin") {
      box(group, 0, 0, 0, 0.52, 0.045, 0.45, material(0xf3f3df, 0x777d6d, 0.12));
      box(group, 0.08, 0.032, 0, 0.1, 0.015, 0.44, material(0xdce5d0));
      group.rotation.y = rand(0, 6);
    } else if (kind === "pack") {
      baseY = 0.3;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.44, 9), material(0xe8a260, 0x965221, 0.2));
      group.add(cup);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 9), material(0xffd395));
      lid.position.y = 0.24;
      group.add(lid);
      const shine = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.39, 20), new THREE.MeshBasicMaterial({ color: 0xffb875, transparent: true, opacity: 0.65, side: THREE.DoubleSide }));
      shine.rotation.x = -Math.PI / 2;
      shine.position.y = -0.25;
      group.add(shine);
    } else {
      baseY = 0.63;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.39), material(0x9fecef, 0x42cbd6, 2));
      group.add(crystal);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: 0x83f2e5, toneMapped: false }));
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }
    group.position.set(position.x, baseY, position.z);
    this.scene.add(group);
    this.items.push({ ...position, kind, group, active: true, baseY });
  }

  private createPower(key: PowerKey, position: Vec2) {
    const colors: Record<PowerKey, number> = { cloak: 0xb7a0ff, blink: 0x83e5f5, energy: 0x9cf3ac, turbo: 0xffd486 };
    const group = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.39, 1), material(colors[key], colors[key], 1.6));
    group.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 8, 24), new THREE.MeshBasicMaterial({ color: colors[key], toneMapped: false }));
    ring.rotation.x = Math.PI / 2.7;
    group.add(ring);
    group.position.set(position.x, 1.05, position.z);
    this.scene.add(group);
    this.powers.push({ ...position, key, group, active: true, cooldown: 0, baseY: 1.05 });
  }

  private createAlien() {
    const position = this.randomSpot(1.2, 18);
    const group = new THREE.Group();
    const skin = material(0x8ed179, 0x183d20, 0.22);
    const body = orb(group, 0, 0.9, 0, 0.6, skin);
    body.scale.y = 1.18;
    for (const side of [-1, 1]) {
      const eye = orb(group, side * 0.24, 1.07, 0.51, 0.13, material(0x132c25));
      eye.scale.y = 1.3;
      orb(group, side * 0.23, 1.1, 0.618, 0.037, material(0xe8ffb5, 0xb6ff93, 0.8));
      orb(group, side * 0.36, 1.7, 0, 0.075, material(0xb2e999, 0x59ac55, 0.4));
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 6), skin);
      antenna.position.set(side * 0.28, 1.5, 0);
      antenna.rotation.z = side * 0.38;
      group.add(antenna);
    }
    const cone = new THREE.Mesh(
      new THREE.CircleGeometry(VISION, 32, -Math.PI / 2 - FOV / 2, FOV),
      new THREE.MeshBasicMaterial({ color: 0xffc273, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
    );
    cone.rotation.x = -Math.PI / 2;
    cone.position.y = 0.045;
    group.add(cone);
    group.position.set(position.x, 0, position.z);
    this.scene.add(group);
    this.aliens.push({ ...position, group, cone, angle: rand(0, Math.PI * 2), mode: "patrol", target: null, lastSeen: null, lost: 0, stuck: 0 });
  }

  private frame = (timestamp: number) => {
    this.frameId = requestAnimationFrame(this.frame);
    const dt = Math.min((timestamp - (this.lastFrame || timestamp)) / 1000, 0.24);
    this.lastFrame = timestamp;
    this.elapsed += dt;
    this.animateWorld(dt);
    if (this.started && !this.paused) {
      let remaining = dt;
      while (remaining > 0) {
        const step = Math.min(0.05, remaining);
        this.update(step);
        remaining -= step;
      }
    }
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private animateWorld(dt: number) {
    this.baseRing.rotation.z += dt * 0.16;
    this.baseBeacon.material instanceof THREE.MeshBasicMaterial && (this.baseBeacon.material.opacity = 0.045 + Math.sin(this.elapsed * 2) * 0.018);
    for (const item of this.items) if (item.active) {
      if (item.kind === "core") {
        item.group.rotation.y += dt * 1.3;
        item.group.position.y = item.baseY + Math.sin(this.elapsed * 2 + item.x) * 0.12;
      }
    }
    for (const power of this.powers) if (power.active) {
      power.group.rotation.y += dt * 1.5;
      power.group.position.y = power.baseY + Math.sin(this.elapsed * 2.3 + power.x) * 0.18;
    }
  }

  private updateCamera(dt: number) {
    const horizontal = this.cameraDistance * Math.cos(this.pitch);
    const targetX = this.player.x + Math.sin(this.yaw) * horizontal;
    const targetZ = this.player.z + Math.cos(this.yaw) * horizontal;
    const targetY = 1.2 + this.cameraDistance * Math.sin(this.pitch);
    const amount = 1 - Math.exp(-dt * 5);
    this.camera.position.x += (targetX - this.camera.position.x) * amount;
    this.camera.position.y += (targetY - this.camera.position.y) * amount;
    this.camera.position.z += (targetZ - this.camera.position.z) * amount;
    this.camera.lookAt(this.player.x, 0.8, this.player.z);
  }

  private update(dt: number) {
    this.updatePlayer(dt);
    this.updateItems(dt);
    this.updateInteraction();
    this.updateBase();
    this.updateAliens(dt);
    this.uiElapsed += dt;
    if (this.uiElapsed > 0.1) { this.uiElapsed = 0; this.emit(); }
  }

  private updatePlayer(dt: number) {
    let inputX = this.joystick.x + (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
    let inputY = this.joystick.y + (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) - (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0);
    const length = Math.hypot(inputX, inputY);
    if (length > 1) { inputX /= length; inputY /= length; }
    const moveX = inputX * Math.cos(this.yaw) + inputY * Math.sin(this.yaw);
    const moveZ = -inputX * Math.sin(this.yaw) + inputY * Math.cos(this.yaw);
    const moving = length > 0.12 && this.stun <= 0 && this.hidden <= 0;
    const wantsRun = (this.runHeld || this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")) && moving;
    const maximum = this.maxStamina();
    if (this.stamina <= 0) this.exhausted = true;
    else if (this.stamina > 22) this.exhausted = false;
    const running = wantsRun && (!this.exhausted || this.effects.energy > 0);
    if (running && this.effects.energy <= 0) this.stamina = Math.max(0, this.stamina - Math.max(17, 32 - this.upgrades.coffee * 3) * dt);
    else this.stamina = Math.min(maximum, this.stamina + (17 + this.upgrades.coffee * 5) * dt);
    const speed = (running ? 9.4 : 5.8) * (1 + this.upgrades.speed * 0.12) * (this.effects.turbo > 0 ? 1.5 : 1);
    if (moving) {
      this.player.x += moveX * speed * dt;
      this.player.z += moveZ * speed * dt;
      const target = Math.atan2(moveX, moveZ);
      const delta = Math.atan2(Math.sin(target - this.player.angle), Math.cos(target - this.player.angle));
      this.player.angle += delta * Math.min(1, dt * 12);
    }
    this.pushOut(this.player, 0.46);
    this.stun = Math.max(0, this.stun - dt);
    this.safe = Math.max(0, this.safe - dt);
    this.hidden = Math.max(0, this.hidden - dt);
    this.effects.cloak = Math.max(0, this.effects.cloak - dt);
    this.effects.turbo = Math.max(0, this.effects.turbo - dt);
    this.effects.energy = Math.max(0, this.effects.energy - dt);
    this.playerGroup.position.set(this.player.x, 0, this.player.z);
    this.playerGroup.rotation.y = this.player.angle;
    this.playerBody.position.y = moving ? Math.abs(Math.sin(this.elapsed * (running ? 16 : 10))) * 0.07 : Math.sin(this.elapsed * 2) * 0.018;
    this.playerGroup.visible = this.hidden <= 0 && (this.safe <= 0 || Math.floor(this.elapsed * 11) % 2 === 0);
    this.playerBody.scale.setScalar(this.effects.cloak > 0 ? 0.93 : 1);
  }

  private updateItems(dt: number) {
    this.litterClock += dt;
    this.packClock += dt;
    if (this.litterClock > 3.7) { this.spawnItem("napkin"); this.litterClock = 0; }
    if (this.packClock > 19) {
      this.spawnItem("pack", this.aliens[Math.floor(Math.random() * this.aliens.length)]);
      this.packClock = 0;
    }
    const range = 0.9 + this.upgrades.magnet * 1.15;
    for (const item of this.items) {
      if (!item.active || Math.hypot(this.player.x - item.x, this.player.z - item.z) > range) continue;
      item.active = false;
      item.group.visible = false;
      if (item.kind === "napkin") this.napkins++;
      else if (item.kind === "pack") this.packs++;
      else { this.carriedCores++; this.onMessage("N\u00facleo raro encontrado! Leve-o at\u00e9 a base.", "success"); }
    }
    for (const power of this.powers) {
      if (!power.active) {
        power.cooldown -= dt;
        if (power.cooldown <= 0) { power.active = true; power.group.visible = true; }
        continue;
      }
      if (Math.hypot(this.player.x - power.x, this.player.z - power.z) > 1.1) continue;
      power.active = false;
      power.group.visible = false;
      power.cooldown = 30;
      if (power.key === "cloak") { this.effects.cloak = 8; this.onMessage("Invisibilidade ativada por 8 segundos.", "success"); }
      if (power.key === "turbo") { this.effects.turbo = 7; this.onMessage("Supervelocidade ativada!", "success"); }
      if (power.key === "energy") { this.effects.energy = 10; this.stamina = this.maxStamina(); this.onMessage("Energia infinita por 10 segundos.", "success"); }
      if (power.key === "blink") {
        const destination = this.randomSpot(1.1, 12);
        this.player.x = destination.x;
        this.player.z = destination.z;
        this.safe = 1;
        this.onMessage("Teletransporte! Nova rota descoberta.", "success");
      }
    }
  }

  private updateInteraction() {
    if (this.hidden > 0) { this.interaction = { kind: "exit", label: "Sair do esconderijo" }; return; }
    this.interaction = null;
    let closest = 2.25;
    for (const bin of this.bins) {
      const distance = Math.hypot(this.player.x - bin.x, this.player.z - bin.z);
      if (!bin.active || distance >= closest) continue;
      closest = distance;
      this.interaction = { kind: "bin", target: bin, label: `Coletar ${bin.amount} ${bin.kind === "napkin" ? "guardanapos" : "POC-POFT"}` };
    }
    for (const hide of this.hides) {
      const distance = Math.hypot(this.player.x - hide.x, this.player.z - hide.z);
      if (!hide.active || distance >= closest) continue;
      closest = distance;
      this.interaction = { kind: "hide", target: hide, label: "Esconder-se na planta" };
    }
  }

  private updateBase() {
    const inside = Math.hypot(this.player.x - BASE.x, this.player.z - BASE.z) < 3.1;
    if (inside && !this.nearBase) {
      const reward = this.napkins + this.packs * 12;
      if (reward || this.carriedCores) {
        this.tickets += reward;
        this.cores += this.carriedCores;
        this.onMessage(`Carga entregue! +${reward} tickets${this.carriedCores ? ` e ${this.carriedCores} n\u00facleo(s)` : ""}.`, "success");
        this.napkins = 0;
        this.packs = 0;
        this.carriedCores = 0;
      } else this.onMessage("Base segura. Use seus tickets para evoluir.", "info");
    }
    this.nearBase = inside;
    if (this.bins.every((bin) => !bin.active)) this.roundReady = true;
  }

  private updateAliens(dt: number) {
    this.alerted = false;
    for (const alien of this.aliens) {
      const dx = this.player.x - alien.x;
      const dz = this.player.z - alien.z;
      const distance = Math.hypot(dx, dz);
      const viewRange = this.effects.cloak > 0 ? 2.3 : Math.max(5, VISION - this.upgrades.stealth * 1.6);
      let seesPlayer = false;
      if (this.hidden <= 0 && this.safe <= 0 && distance < viewRange) {
        const facing = (Math.sin(alien.angle) * dx + Math.cos(alien.angle) * dz) / (distance || 1);
        seesPlayer = (facing > Math.cos(FOV / 2) || distance < 2.1) && this.lineOfSight(alien, this.player);
      }
      if (seesPlayer) {
        alien.mode = "chase";
        alien.lost = 0;
        alien.lastSeen = { x: this.player.x, z: this.player.z };
      } else if (alien.mode === "chase") {
        alien.lost += dt;
        if (alien.lost > 3.4) { alien.mode = "patrol"; alien.target = null; }
      }
      let target: Vec2;
      if (alien.mode === "chase" && alien.lastSeen) target = alien.lastSeen;
      else {
        if (!alien.target || Math.hypot(alien.x - alien.target.x, alien.z - alien.target.z) < 1.4 || alien.stuck > 1) {
          alien.target = this.randomSpot(1.1);
          alien.stuck = 0;
        }
        target = alien.target;
      }
      const tx = target.x - alien.x;
      const tz = target.z - alien.z;
      const targetDistance = Math.hypot(tx, tz) || 1;
      if (targetDistance > 0.7) {
        const oldX = alien.x;
        const oldZ = alien.z;
        const pace = (alien.mode === "chase" ? 7.6 : 3.1) + Math.min(1.4, (this.wave - 1) * 0.22);
        alien.x += tx / targetDistance * pace * dt;
        alien.z += tz / targetDistance * pace * dt;
        this.pushOut(alien, 0.68);
        if (Math.hypot(alien.x - oldX, alien.z - oldZ) < pace * dt * 0.25) alien.stuck += dt;
        else alien.stuck = 0;
        const heading = Math.atan2(tx, tz);
        const turn = Math.atan2(Math.sin(heading - alien.angle), Math.cos(heading - alien.angle));
        alien.angle += turn * Math.min(1, dt * 6);
      }
      alien.group.position.set(alien.x, 0, alien.z);
      alien.group.rotation.y = alien.angle;
      alien.cone.material.color.setHex(alien.mode === "chase" ? 0xff6e62 : 0xffc273);
      alien.cone.material.opacity = alien.mode === "chase" ? 0.2 : 0.12;
      if (alien.mode === "chase") this.alerted = true;
      if (this.hidden <= 0 && this.safe <= 0 && this.effects.cloak <= 0 && Math.hypot(this.player.x - alien.x, this.player.z - alien.z) < 1.17) this.caught();
    }
  }

  private caught() {
    this.napkins = 0;
    this.packs = 0;
    this.carriedCores = 0;
    this.hidden = 0;
    this.player.x = START.x;
    this.player.z = START.z;
    this.safe = 3;
    this.stun = 0.8;
    this.effects.cloak = 0;
    this.effects.energy = 0;
    this.effects.turbo = 0;
    this.aliens.forEach((alien) => { alien.mode = "patrol"; alien.target = null; });
    this.onMessage("Voc\u00ea foi visto! A carga foi perdida, mas suas melhorias continuam.", "danger");
    this.emit();
  }

  private maxStamina() { return 100 + this.upgrades.stamina * 25; }

  private emit() {
    const dx = BASE.x - this.player.x;
    const dz = BASE.z - this.player.z;
    const screenX = dx * Math.cos(this.yaw) - dz * Math.sin(this.yaw);
    const screenUp = -dx * Math.sin(this.yaw) - dz * Math.cos(this.yaw);
    const nearest = this.aliens.reduce((best, alien) => Math.min(best, Math.hypot(this.player.x - alien.x, this.player.z - alien.z)), Infinity);
    const effects: GameSnapshot["effects"] = [];
    if (this.effects.cloak > 0) effects.push({ name: "Invis\u00edvel", color: "violet", time: this.effects.cloak });
    if (this.effects.turbo > 0) effects.push({ name: "Turbo", color: "orange", time: this.effects.turbo });
    if (this.effects.energy > 0) effects.push({ name: "Energia infinita", color: "green", time: this.effects.energy });
    if (this.hidden > 0) effects.push({ name: "Escondido", color: "green", time: this.hidden });
    this.onSnapshot({
      tickets: this.tickets,
      napkins: this.napkins,
      packs: this.packs,
      carriedCores: this.carriedCores,
      cores: this.cores,
      stamina: this.stamina,
      maxStamina: this.maxStamina(),
      wave: this.wave,
      binsLeft: this.bins.filter((bin) => bin.active).length,
      binsTotal: this.bins.length,
      baseDistance: Math.round(Math.hypot(dx, dz)),
      baseBearing: Math.atan2(screenX, screenUp) * 180 / Math.PI,
      threatDistance: nearest < 12 + this.upgrades.scanner * 9 ? Math.round(nearest) : null,
      alerted: this.alerted,
      nearBase: this.nearBase,
      roundReady: this.roundReady,
      hidden: this.hidden > 0,
      interaction: this.interaction?.label ?? null,
      effects,
      upgrades: { ...this.upgrades },
    });
  }

  start() {
    this.started = true;
    this.paused = false;
    this.onMessage("Recolha o Lixo C\u00f3smico e volte para a base sem ser visto.", "info");
    this.emit();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) { this.keys.clear(); this.runHeld = false; this.joystick = { x: 0, y: 0 }; }
  }

  setJoystick(x: number, y: number) { this.joystick = { x, y }; }
  setRunning(running: boolean) { this.runHeld = running; }

  interact() {
    if (!this.started || this.paused || !this.interaction) return;
    const action = this.interaction;
    if (action.kind === "bin") {
      const bin = action.target as Bin;
      if (!bin.active) return;
      bin.active = false;
      bin.group.visible = false;
      if (bin.kind === "napkin") this.napkins += bin.amount;
      else this.packs += bin.amount;
      this.onMessage(`Coleta conclu\u00edda: +${bin.amount} ${bin.kind === "napkin" ? "guardanapos" : "embalagens POC-POFT"}.`, "success");
    } else if (action.kind === "hide") {
      const hide = action.target as HideSpot;
      if (!hide.active) return;
      hide.active = false;
      hide.group.visible = false;
      this.hidden = 8;
      this.onMessage("Escondido. Espere os alien\u00edgenas passarem.", "info");
    } else {
      this.hidden = 0;
      this.onMessage("Voc\u00ea saiu do esconderijo.", "info");
    }
    this.updateInteraction();
    this.emit();
  }

  buyUpgrade(key: UpgradeKey) {
    if (!this.started || this.paused || !this.nearBase) return false;
    const price = upgradePrice(key, this.upgrades[key]);
    if (this.tickets < price.tickets || this.cores < price.cores) {
      this.onMessage("Recursos insuficientes para esta melhoria.", "danger");
      return false;
    }
    this.tickets -= price.tickets;
    this.cores -= price.cores;
    this.upgrades[key]++;
    if (key === "stamina") this.stamina = this.maxStamina();
    this.onMessage("Melhoria instalada! Volte \u00e0 arena mais forte.", "success");
    this.emit();
    return true;
  }

  nextWave() {
    if (!this.started || this.paused || !this.nearBase || !this.roundReady) return;
    this.clearRound();
    this.wave++;
    this.roundReady = false;
    this.litterClock = 0;
    this.packClock = 0;
    this.createRound();
    this.onMessage(`Rodada ${this.wave}: novos pontos de coleta apareceram.`, "success");
    this.emit();
  }

  reset() {
    this.clearRound();
    this.tickets = 0;
    this.napkins = 0;
    this.packs = 0;
    this.carriedCores = 0;
    this.cores = 0;
    this.stamina = 100;
    this.exhausted = false;
    this.stun = 0;
    this.safe = 0;
    this.hidden = 0;
    this.wave = 1;
    this.roundReady = false;
    this.nearBase = false;
    this.interaction = null;
    this.litterClock = 0;
    this.packClock = 0;
    this.effects = { cloak: 0, turbo: 0, energy: 0 };
    this.upgrades = { speed: 0, stamina: 0, coffee: 0, scanner: 0, stealth: 0, magnet: 0 };
    this.player.x = START.x;
    this.player.z = START.z;
    this.player.angle = 0;
    this.createRound();
    this.started = true;
    this.paused = false;
    this.onMessage("Nova infiltra\u00e7\u00e3o iniciada. Boa sorte!", "info");
    this.emit();
  }

  private clearRound() {
    for (const entity of [...this.items, ...this.bins, ...this.hides, ...this.powers, ...this.aliens]) {
      this.scene.remove(entity.group);
      entity.group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((mat) => mat.dispose());
      });
    }
    this.items = [];
    this.bins = [];
    this.hides = [];
    this.powers = [];
    this.aliens = [];
  }

  destroy() {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.renderer.domElement.removeEventListener("pointercancel", this.onPointerUp);
    this.renderer.domElement.removeEventListener("wheel", this.onWheel);
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat) => {
        if ("map" in mat && mat.map instanceof THREE.Texture) mat.map.dispose();
        mat.dispose();
      });
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}