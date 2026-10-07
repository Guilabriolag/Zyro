import * as THREE from "three";
import { FIELD, derivePhysics } from "./attributes.js";
import { allStopped, bodyFromAthlete, createWorld, makeFieldCfg, predictShot, resetBall, shoot, stepWorld, } from "./physics.js";
import { makeButtonDecal } from "./stadium3d.js";
/** Fábrica do botão 3D: a malha é gerada pela geometria derivada dos atributos. */
export function createButtonMesh(attrs, colors, shirt = 10, name = "ATLETA") {
    const phys = derivePhysics(attrs);
    const profile = [];
    const r = phys.radiusM;
    const h = phys.heightM;
    const rt = phys.topRadiusM;
    const t0 = phys.bevelStart;
    profile.push(new THREE.Vector2(0.0004, 0));
    profile.push(new THREE.Vector2(r * 0.96, 0));
    const seg = 26;
    for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const y = t * h;
        const rad = t <= t0 ? r : r - (r - rt) * Math.pow((t - t0) / (1 - t0), 0.75);
        profile.push(new THREE.Vector2(Math.max(rad, 0.0008), y));
    }
    profile.push(new THREE.Vector2(rt * 0.6, h * 1.04));
    profile.push(new THREE.Vector2(0.0004, h * 1.05));
    const group = new THREE.Group();
    const lathe = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colors.secondary),
        roughness: 0.26, metalness: 0.06, clearcoat: 0.9, clearcoatRoughness: 0.2,
    }));
    lathe.castShadow = true;
    lathe.receiveShadow = true;
    const decal = new THREE.Mesh(new THREE.CircleGeometry(rt * 1.005, 48), new THREE.MeshStandardMaterial({
        map: makeButtonDecal(shirt, name.split(" ")[0] ?? "", colors.primary, colors.secondary),
        roughness: 0.34, transparent: true,
    }));
    decal.rotation.x = -Math.PI / 2;
    decal.position.y = h * 1.052;
    group.add(lathe, decal);
    group.userData.phys = phys;
    return { group, phys, lathe, decal };
}
/** Palco base com órbita por arraste, iluminação de estúdio e chão técnico. */
export class PreviewStage {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.pivot = new THREE.Group();
        this.button = null;
        this.helpers = new THREE.Group();
        this.az = 0.9;
        this.pol = 1.05;
        this.dist = 0.14;
        this.raf = 0;
        this.disposed = false;
        this.autoRotate = true;
        this.t = 0;
        this.detach = () => { };
        this.loop = () => {
            if (this.disposed)
                return;
            this.raf = requestAnimationFrame(this.loop);
            this.t += 0.016;
            if (this.autoRotate)
                this.az += 0.0035;
            this.camera.position.set(Math.cos(this.az) * Math.sin(this.pol) * this.dist, Math.cos(this.pol) * this.dist + 0.012, Math.sin(this.az) * Math.sin(this.pol) * this.dist);
            this.camera.lookAt(0, 0.006, 0);
            this.resizeIfNeeded();
            this.renderer.render(this.scene, this.camera);
        };
        this.lastW = 0;
        this.lastH = 0;
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 40);
        this.scene.background = new THREE.Color("#080c14");
        this.scene.fog = new THREE.FogExp2(0x080c14, 0.55);
        const key = new THREE.DirectionalLight(0xffffff, 2.6);
        key.position.set(0.35, 0.7, 0.4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -0.2;
        key.shadow.camera.right = 0.2;
        key.shadow.camera.top = 0.2;
        key.shadow.camera.bottom = -0.2;
        this.scene.add(key);
        const rim = new THREE.DirectionalLight(new THREE.Color("#5fb2ff"), 1.5);
        rim.position.set(-0.5, 0.25, -0.5);
        this.scene.add(rim);
        this.scene.add(new THREE.HemisphereLight(0x9fc7ff, 0x0a0f16, 0.7));
        const floor = new THREE.Mesh(new THREE.CircleGeometry(0.16, 64), new THREE.MeshStandardMaterial({ color: "#111823", roughness: 0.6, metalness: 0.2 }));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        const grid = new THREE.GridHelper(0.32, 16, new THREE.Color("#2b3a52"), new THREE.Color("#1b2534"));
        grid.material.transparent = true;
        grid.material.opacity = 0.55;
        grid.position.y = 0.0005;
        this.scene.add(grid);
        this.scene.add(this.pivot);
        this.pivot.add(this.helpers);
        this.attachControls();
        this.resize();
        this.loop();
    }
    attachControls() {
        let dragging = false;
        let lx = 0, ly = 0;
        const down = (e) => {
            dragging = true;
            this.autoRotate = false;
            lx = e.clientX;
            ly = e.clientY;
            this.canvas.setPointerCapture(e.pointerId);
        };
        const move = (e) => {
            if (!dragging)
                return;
            this.az -= (e.clientX - lx) * 0.011;
            this.pol = Math.max(0.25, Math.min(1.5, this.pol - (e.clientY - ly) * 0.008));
            lx = e.clientX;
            ly = e.clientY;
        };
        const up = (e) => {
            dragging = false;
            try {
                this.canvas.releasePointerCapture(e.pointerId);
            }
            catch { /* ignore */ }
        };
        const wheel = (e) => {
            e.preventDefault();
            this.dist = Math.max(0.06, Math.min(0.4, this.dist + e.deltaY * 0.00016));
        };
        this.canvas.addEventListener("pointerdown", down);
        this.canvas.addEventListener("pointermove", move);
        this.canvas.addEventListener("pointerup", up);
        this.canvas.addEventListener("wheel", wheel, { passive: false });
        this.detach = () => {
            this.canvas.removeEventListener("pointerdown", down);
            this.canvas.removeEventListener("pointermove", move);
            this.canvas.removeEventListener("pointerup", up);
            this.canvas.removeEventListener("wheel", wheel);
        };
    }
    resize() {
        const w = this.canvas.clientWidth || 320;
        const h = this.canvas.clientHeight || 320;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / Math.max(1, h);
        this.camera.updateProjectionMatrix();
    }
    setAthlete(attrs, colors, shirt = 10, name = "ATLETA") {
        if (this.button) {
            this.pivot.remove(this.button.group);
            this.button.dispose();
        }
        const made = createButtonMesh(attrs, colors, shirt, name);
        const phys = made.phys;
        // bola de referência + vetor de contato (a borda decide o chute)
        const ball = new THREE.Mesh(new THREE.SphereGeometry(FIELD.ballRadius, 24, 16), new THREE.MeshStandardMaterial({ color: "#f2f4f7", roughness: 0.4 }));
        ball.castShadow = true;
        const contactY = phys.contactHeightM;
        ball.position.set(phys.radiusM + FIELD.ballRadius, contactY, 0);
        const slopeRad = (phys.contactSlopeDeg * Math.PI) / 180;
        const dir = new THREE.Vector3(Math.cos(slopeRad), Math.sin(slopeRad), 0);
        const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(phys.radiusM, contactY, 0), 0.02 + phys.liftIndex * 0.06, phys.liftIndex > 0.5 ? 0xff8f6b : phys.liftIndex > 0.22 ? 0xffe066 : 0x7ee08a, 0.012, 0.008);
        // linha do perfil (corte) para leitura da geometria
        const pts = [];
        for (let i = 0; i <= 40; i++) {
            const y = (i / 40) * phys.heightM;
            const t = y / phys.heightM;
            const rad = t <= phys.bevelStart
                ? phys.radiusM
                : phys.radiusM - (phys.radiusM - phys.topRadiusM) * Math.pow((t - phys.bevelStart) / (1 - phys.bevelStart), 0.75);
            pts.push(new THREE.Vector3(-rad, y, 0));
        }
        const profileLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color("#67e8f9") }));
        const holder = new THREE.Group();
        holder.add(made.group, ball, arrow, profileLine);
        const dispose = () => {
            holder.traverse((o) => {
                const m = o;
                if (m.geometry)
                    m.geometry.dispose();
                const mat = m.material;
                if (Array.isArray(mat))
                    mat.forEach((x) => x.dispose());
                else
                    mat?.dispose();
            });
        };
        this.pivot.add(holder);
        this.button = { group: holder, dispose };
    }
    resizeIfNeeded() {
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        if (w !== this.lastW || h !== this.lastH) {
            this.lastW = w;
            this.lastH = h;
            this.resize();
        }
    }
    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        this.detach();
        if (this.button)
            this.button.dispose();
        this.scene.traverse((o) => {
            const m = o;
            if (m.geometry)
                m.geometry.dispose();
            const mat = m.material;
            if (Array.isArray(mat))
                mat.forEach((x) => x.dispose());
            else
                mat?.dispose();
        });
        this.renderer.dispose();
    }
}
/** Laboratório: pista pequena + telemetria real medida pela mesma física do jogo. */
export class LabStage {
    constructor(canvas, opts) {
        this.canvas = canvas;
        this.opts = opts;
        this.scene = new THREE.Scene();
        this.telemetry = {
            ballSpeed: 0, apex: 0, distance: 0, curve: 0, buttonSpeed: 0,
            transfer: 0, hitTarget: false, running: false, shots: 0,
        };
        this.buttonMesh = null;
        this.trail = [];
        this.raf = 0;
        this.disposed = false;
        this.t = 0;
        this.az = -0.5;
        this.pol = 0.95;
        this.dist = 1.5;
        this.look = new THREE.Vector3(0, 0, 0);
        this.startX = 0;
        this.startY = 0;
        this.apex = 0;
        this.maxCurve = 0;
        this.impact = 0;
        this.buttonSpeed = 0;
        this.detach = () => { };
        this.lastW = 0;
        this.lastH = 0;
        this.loop = () => {
            if (this.disposed)
                return;
            this.raf = requestAnimationFrame(this.loop);
            this.t += 0.016;
            const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
            if (w !== this.lastW || h !== this.lastH) {
                this.lastW = w;
                this.lastH = h;
                this.resize();
            }
            const dt = 1 / 60;
            const sub = 4;
            for (let i = 0; i < sub; i++)
                stepWorld(this.world, dt / sub);
            const ball = this.world.ball;
            if (this.telemetry.running) {
                const sp = Math.hypot(ball.vx, ball.vy, ball.vz);
                this.apex = Math.max(this.apex, ball.z);
                this.impact = Math.max(this.impact, sp);
                const dx = ball.x - this.startX, dy = ball.y - this.startY;
                const d = Math.hypot(dx, dy);
                const lateral = Math.abs(dx * 0 + dy * 1 - 0);
                this.maxCurve = Math.max(this.maxCurve, Math.abs(ball.y));
                this.telemetry = {
                    ...this.telemetry,
                    ballSpeed: sp,
                    apex: this.apex - FIELD.ballRadius,
                    distance: d,
                    curve: this.maxCurve,
                    transfer: this.buttonSpeed > 0 ? this.impact / this.buttonSpeed : 0,
                    hitTarget: this.telemetry.hitTarget || (ball.x > this.world.cfg.length / 2 - 0.3 && Math.abs(ball.y) < 0.12 && ball.z < 0.09),
                    running: !allStopped(this.world),
                };
                void lateral;
                this.trail.push(new THREE.Vector3(ball.x, ball.z, -ball.y));
                if (this.trail.length > 120)
                    this.trail.shift();
                const attr = this.trailLine.geometry.getAttribute("position");
                for (let i = 0; i < this.trail.length; i++)
                    attr.setXYZ(i, this.trail[i].x, this.trail[i].y + 0.002, this.trail[i].z);
                attr.needsUpdate = true;
                this.trailLine.geometry.setDrawRange(0, this.trail.length);
            }
            if (this.buttonMesh) {
                this.buttonMesh.position.set(this.body.pos.x, 0, -this.body.pos.y);
                this.buttonMesh.rotation.y += this.body.spin * 0.01;
            }
            this.ballMesh.position.set(ball.x, ball.z, -ball.y);
            this.target.material.color.set(this.telemetry.hitTarget ? "#7ee08a" : "#ff6b6b");
            this.camera.position.set(Math.cos(this.az) * Math.sin(this.pol) * this.dist, Math.cos(this.pol) * this.dist, Math.sin(this.az) * Math.sin(this.pol) * this.dist);
            this.camera.lookAt(this.look);
            this.renderer.render(this.scene, this.camera);
        };
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.camera = new THREE.PerspectiveCamera(45, 1.6, 0.02, 40);
        this.scene.background = new THREE.Color("#070b12");
        this.scene.fog = new THREE.FogExp2(0x070b12, 0.22);
        const cfg = makeFieldCfg({ length: 1.5, width: 0.7, walls: true, wetness: opts.wetness, grassDamping: opts.grassDamping, goalWidth: 0.22 });
        const athlete = {
            id: "lab", name: "LAB", shirt: 10, role: "ATA",
            attrs: opts.attrs, primary: opts.primary, secondary: opts.secondary, material: "acrilico",
        };
        this.body = bodyFromAthlete(athlete, 0, 0, { x: -0.55, y: 0 });
        this.world = createWorld(cfg, [this.body], { x: -0.38, y: 0 });
        this.startX = this.world.ball.x;
        this.startY = this.world.ball.y;
        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(-0.7, 1.6, -0.9);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -1;
        key.shadow.camera.right = 1;
        key.shadow.camera.top = 1;
        key.shadow.camera.bottom = -1;
        this.scene.add(key);
        this.scene.add(new THREE.HemisphereLight(0x9fc7ff, 0x0a0f16, 0.55));
        const fill = new THREE.PointLight(new THREE.Color("#5fb2ff"), 12, 6);
        fill.position.set(0.9, 0.7, 0.9);
        this.scene.add(fill);
        const floor = new THREE.Mesh(new THREE.BoxGeometry(cfg.length, 0.02, cfg.width), new THREE.MeshStandardMaterial({
            color: opts.wetness > 0.2 ? "#1d5b3a" : "#22703c",
            roughness: opts.wetness > 0.2 ? 0.32 : 0.9, metalness: opts.wetness > 0.2 ? 0.2 : 0,
        }));
        floor.position.y = -0.011;
        floor.receiveShadow = true;
        this.scene.add(floor);
        const grid = new THREE.GridHelper(Math.max(cfg.length, cfg.width) * 1.6, 24, new THREE.Color("#25364d"), new THREE.Color("#141d29"));
        grid.material.transparent = true;
        grid.material.opacity = 0.5;
        grid.position.y = -0.019;
        this.scene.add(grid);
        // trilhos laterais
        const railMat = new THREE.MeshStandardMaterial({
            color: "#a9cbe0", transparent: true, opacity: 0.22, roughness: 0.2, metalness: 0.1,
        });
        for (const s of [-1, 1]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(cfg.length, 0.04, 0.008), railMat);
            rail.position.set(0, 0.02, (s * cfg.width) / 2);
            this.scene.add(rail);
        }
        // alvo
        this.target = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff6b6b"), transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        this.target.rotation.x = -Math.PI / 2;
        this.target.position.set(cfg.length / 2 - 0.18, 0.002, 0);
        this.scene.add(this.target);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.11, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffe066"), side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(this.target.position).setY(0.003);
        this.scene.add(ring);
        this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(FIELD.ballRadius, 24, 16), new THREE.MeshStandardMaterial({ color: "#f6f7f9", roughness: 0.35 }));
        this.ballMesh.castShadow = true;
        this.scene.add(this.ballMesh);
        const tg = new THREE.BufferGeometry();
        tg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
        this.trailLine = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: new THREE.Color("#67e8f9"), transparent: true, opacity: 0.8 }));
        this.trailLine.frustumCulled = false;
        this.scene.add(this.trailLine);
        this.setAthlete(opts.attrs);
        this.attach();
        this.resize();
        this.loop();
    }
    setAthlete(attrs) {
        if (this.buttonMesh) {
            this.scene.remove(this.buttonMesh);
            this.buttonMesh.traverse((o) => {
                const m = o;
                if (m.geometry)
                    m.geometry.dispose();
                const mat = m.material;
                if (Array.isArray(mat))
                    mat.forEach((x) => x.dispose());
                else
                    mat?.dispose();
            });
        }
        const made = createButtonMesh(attrs, { primary: this.opts.primary, secondary: this.opts.secondary }, 10, "LAB");
        this.buttonMesh = made.group;
        this.scene.add(this.buttonMesh);
        this.body.phys = made.phys;
    }
    setConditions(wetness, grassDamping) {
        this.world.cfg.wetness = wetness;
        this.world.cfg.grassDamping = grassDamping;
    }
    kick(power, angleDeg, spin) {
        resetBall(this.world, -0.38, 0);
        this.body.pos = { x: -0.55, y: 0 };
        this.body.vel = { x: 0, y: 0 };
        const a = (angleDeg * Math.PI) / 180;
        const dir = { x: Math.cos(a), y: Math.sin(a) };
        shoot(this.world, this.body.id, dir, power, spin, () => 0.5);
        this.buttonSpeed = Math.hypot(this.body.vel.x, this.body.vel.y);
        this.trail = [];
        this.apex = FIELD.ballRadius;
        this.maxCurve = 0;
        this.impact = 0;
        this.telemetry.running = true;
        this.telemetry.hitTarget = false;
        this.telemetry.shots += 1;
        this.telemetry.buttonSpeed = this.buttonSpeed;
    }
    reset() {
        resetBall(this.world, -0.38, 0);
        this.body.pos = { x: -0.55, y: 0 };
        this.body.vel = { x: 0, y: 0 };
        this.trail = [];
        this.telemetry.running = false;
    }
    /** Pré-visualização analítica (sem rodar a simulação). */
    preview(power, angleDeg, spin) {
        const a = (angleDeg * Math.PI) / 180;
        return predictShot(this.world, this.body.id, { x: Math.cos(a), y: Math.sin(a) }, power, spin, 160);
    }
    attach() {
        let dragging = false, lx = 0, ly = 0;
        const down = (e) => {
            dragging = true;
            lx = e.clientX;
            ly = e.clientY;
            this.canvas.setPointerCapture(e.pointerId);
        };
        const move = (e) => {
            if (!dragging)
                return;
            this.az -= (e.clientX - lx) * 0.008;
            this.pol = Math.max(0.25, Math.min(1.45, this.pol - (e.clientY - ly) * 0.006));
            lx = e.clientX;
            ly = e.clientY;
        };
        const up = (e) => {
            dragging = false;
            try {
                this.canvas.releasePointerCapture(e.pointerId);
            }
            catch { /* ignore */ }
        };
        const wheel = (e) => {
            e.preventDefault();
            this.dist = Math.max(0.6, Math.min(3.4, this.dist + e.deltaY * 0.0016));
        };
        this.canvas.addEventListener("pointerdown", down);
        this.canvas.addEventListener("pointermove", move);
        this.canvas.addEventListener("pointerup", up);
        this.canvas.addEventListener("wheel", wheel, { passive: false });
        this.detach = () => {
            this.canvas.removeEventListener("pointerdown", down);
            this.canvas.removeEventListener("pointermove", move);
            this.canvas.removeEventListener("pointerup", up);
            this.canvas.removeEventListener("wheel", wheel);
        };
    }
    resize() {
        const w = this.canvas.clientWidth || 640;
        const h = this.canvas.clientHeight || 360;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / Math.max(1, h);
        this.camera.updateProjectionMatrix();
    }
    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        this.detach();
        this.scene.traverse((o) => {
            const m = o;
            if (m.geometry)
                m.geometry.dispose();
            const mat = m.material;
            if (Array.isArray(mat))
                mat.forEach((x) => x.dispose());
            else
                mat?.dispose();
        });
        this.renderer.dispose();
    }
}
