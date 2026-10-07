import * as THREE from "three";
import { FIELD } from "./attributes.js";
import { buildStadium, makeBallTexture, makeButtonDecal, makePitchTexture, } from "./stadium3d.js";
export const CAMERA_LABELS = {
    jogo: "Gameplay",
    broadcast: "Transmissão",
    tatica: "Tática",
    bola: "Bola",
    replay: "Replay",
};
const WET = { sol: 0, nublado: 0.06, chuva: 0.36, "chuva-forte": 0.64 };
export class MatchRenderer {
    constructor(opts) {
        this.opts = opts;
        this.scene = new THREE.Scene();
        this.wallsGroup = new THREE.Group();
        this.goalsGroup = new THREE.Group();
        this.buttonsGroup = new THREE.Group();
        this.aimGroup = new THREE.Group();
        this.views = new Map();
        this.trailPts = [];
        this.look = new THREE.Vector3();
        this.camTarget = new THREE.Vector3();
        this.lookTarget = new THREE.Vector3();
        this.shakeAmt = 0;
        this.time = 0;
        this.powerGeo = null;
        this.screenTimer = 0;
        this.disposed = false;
        this.cfg = { length: FIELD.length, width: FIELD.width };
        this.quality = opts.quality ?? "alta";
        this.renderer = new THREE.WebGLRenderer({
            canvas: opts.canvas, antialias: this.quality === "alta", powerPreference: "high-performance",
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === "alta" ? 2 : 1.35));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 90);
        this.camera.position.set(-1.6, 1.05, -0.95);
        this.look.set(0.1, 0, 0);
        const wet = WET[opts.weather];
        this.stadium = buildStadium({ stadium: opts.stadium, weather: opts.weather, timeOfDay: opts.timeOfDay, grass: opts.grass }, FIELD.length, FIELD.width);
        this.renderer.toneMappingExposure = this.stadium.palette.exposure;
        this.scene.add(this.stadium.group);
        this.scene.fog = new THREE.FogExp2(this.stadium.palette.bottom.getHex(), this.stadium.palette.fogDensity);
        // ── MESA / GRAMADO ──
        const pitchTex = makePitchTexture(opts.stadium, opts.grass, wet);
        const pitchMat = new THREE.MeshStandardMaterial({
            map: pitchTex,
            roughness: wet > 0.2 ? 0.34 : 0.88,
            metalness: wet > 0.2 ? 0.22 : 0.02,
            envMapIntensity: 0.6,
        });
        this.pitch = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.length, FIELD.width, 1, 1), pitchMat);
        this.pitch.rotation.x = -Math.PI / 2;
        this.pitch.receiveShadow = true;
        this.scene.add(this.pitch);
        // corpo da mesa
        const table = new THREE.Mesh(new THREE.BoxGeometry(FIELD.length + 0.08, 0.06, FIELD.width + 0.08), new THREE.MeshStandardMaterial({ color: "#1d2126", roughness: 0.7 }));
        table.position.y = -0.031;
        table.receiveShadow = true;
        this.scene.add(table);
        this.buildGoals();
        this.buildWalls();
        this.scene.add(this.wallsGroup);
        this.scene.add(this.goalsGroup);
        this.scene.add(this.buttonsGroup);
        // ── BOLA ──
        const ballTex = makeBallTexture();
        this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(FIELD.ballRadius, 26, 18), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.42, metalness: 0.02 }));
        this.ballMesh.castShadow = true;
        this.scene.add(this.ballMesh);
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(32 * 3), 3));
        this.trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
            color: new THREE.Color("#9fe8ff"), transparent: true, opacity: 0.55,
        }));
        this.trail.frustumCulled = false;
        this.scene.add(this.trail);
        // ── MIRA ──
        this.predictGeo = new THREE.BufferGeometry();
        this.predictGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
        this.predictLine = new THREE.Line(this.predictGeo, new THREE.LineDashedMaterial({
            color: new THREE.Color("#ffe066"), dashSize: 0.02, gapSize: 0.014, transparent: true, opacity: 0.9,
        }));
        this.predictLine.frustumCulled = false;
        this.predictLine.visible = false;
        this.aimGroup.add(this.predictLine);
        const shaftGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 1, 10);
        shaftGeo.rotateZ(Math.PI / 2);
        shaftGeo.translate(0.5, 0, 0);
        this.arrowShaft = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ color: "#ffe066" }));
        const headGeo = new THREE.ConeGeometry(0.017, 0.05, 14);
        headGeo.rotateZ(-Math.PI / 2);
        this.arrowHead = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: "#fff3b0" }));
        this.aimGroup.add(this.arrowShaft, this.arrowHead);
        this.aimGroup.visible = false;
        this.scene.add(this.aimGroup);
        this.powerRing = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.062, 44, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: "#7ee08a", transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
        this.powerRing.rotation.x = -Math.PI / 2;
        this.powerRing.visible = false;
        this.scene.add(this.powerRing);
        this.resize();
    }
    buildGoals() {
        const cfg = this.cfg;
        const hx = cfg.length / 2;
        const gw = FIELD.goalWidth;
        const gh = FIELD.goalHeight;
        const gd = FIELD.goalDepth;
        const postMat = new THREE.MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.35, metalness: 0.35 });
        const netCanvas = document.createElement("canvas");
        netCanvas.width = netCanvas.height = 128;
        const ng = netCanvas.getContext("2d");
        ng.strokeStyle = "rgba(255,255,255,0.85)";
        ng.lineWidth = 2;
        for (let i = 0; i <= 16; i++) {
            ng.beginPath();
            ng.moveTo((i * 128) / 16, 0);
            ng.lineTo((i * 128) / 16, 128);
            ng.stroke();
            ng.beginPath();
            ng.moveTo(0, (i * 128) / 16);
            ng.lineTo(128, (i * 128) / 16);
            ng.stroke();
        }
        const netTex = new THREE.CanvasTexture(netCanvas);
        netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
        netTex.repeat.set(4, 2);
        const netMat = new THREE.MeshStandardMaterial({
            map: netTex, transparent: true, opacity: 0.5, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false,
        });
        for (const s of [-1, 1]) {
            const g = new THREE.Group();
            const post = new THREE.CylinderGeometry(0.0055, 0.0055, gh, 10);
            for (const sy of [-1, 1]) {
                const p = new THREE.Mesh(post, postMat);
                p.position.set(0, gh / 2, (sy * gw) / 2);
                p.castShadow = true;
                g.add(p);
            }
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, gw, 10), postMat);
            bar.rotation.x = Math.PI / 2;
            bar.position.set(0, gh, 0);
            bar.castShadow = true;
            g.add(bar);
            const back = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), netMat);
            back.rotation.y = Math.PI / 2;
            back.position.set(s * gd, gh / 2, 0);
            g.add(back);
            for (const sy of [-1, 1]) {
                const side = new THREE.Mesh(new THREE.PlaneGeometry(gd, gh), netMat);
                side.position.set((s * gd) / 2, gh / 2, (sy * gw) / 2);
                g.add(side);
            }
            const top = new THREE.Mesh(new THREE.PlaneGeometry(gd, gw), netMat);
            top.rotation.x = Math.PI / 2;
            top.position.set((s * gd) / 2, gh, 0);
            g.add(top);
            g.position.x = s * hx;
            // inverte a profundidade para fora do campo
            if (s === 1)
                g.rotation.y = Math.PI;
            this.goalsGroup.add(g);
        }
    }
    buildWalls() {
        this.wallsGroup.clear();
        if (!this.opts.walls)
            return;
        const cfg = this.cfg;
        const hx = cfg.length / 2, hy = cfg.width / 2;
        const h = FIELD.wallHeight;
        // acrílico barato: sem transmission (custo alto no mobile)
        const mat = new THREE.MeshPhysicalMaterial({
            color: "#bcd6e6", transparent: true, opacity: 0.2, roughness: 0.12,
            metalness: 0.05, clearcoat: 0.6, side: THREE.DoubleSide, depthWrite: false,
        });
        const edgeMat = new THREE.MeshStandardMaterial({
            color: "#eaf6ff", emissive: new THREE.Color("#79c6ff"), emissiveIntensity: 0.35, roughness: 0.4,
        });
        const side = new THREE.BoxGeometry(cfg.length + 0.03, h, 0.008);
        const end = new THREE.BoxGeometry(0.008, h, cfg.width + 0.03);
        for (const s of [-1, 1]) {
            const w = new THREE.Mesh(side, mat);
            w.position.set(0, h / 2, s * hy);
            this.wallsGroup.add(w);
            const e = new THREE.Mesh(new THREE.BoxGeometry(cfg.length + 0.03, 0.006, 0.01), edgeMat);
            e.position.set(0, h, s * hy);
            this.wallsGroup.add(e);
        }
        for (const s of [-1, 1]) {
            const w = new THREE.Mesh(end, mat);
            w.position.set(s * hx, h / 2, 0);
            this.wallsGroup.add(w);
            const e = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, cfg.width + 0.03), edgeMat);
            e.position.set(s * hx, h, 0);
            this.wallsGroup.add(e);
        }
    }
    /** Cria/recria as malhas dos botões a partir do mundo (geometria vem dos atributos). */
    setWorld(world) {
        this.cfg = { length: world.cfg.length, width: world.cfg.width };
        for (const [, v] of this.views) {
            this.buttonsGroup.remove(v.group);
            v.group.traverse((o) => {
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
        this.views.clear();
        for (const b of world.bodies) {
            // o perfil 3D é reconstruído das propriedades físicas: a geometria VEM do atributo
            const profile = [];
            const r = b.phys.radiusM;
            const h = b.phys.heightM;
            const rt = b.phys.topRadiusM;
            const t0 = b.phys.bevelStart;
            profile.push(new THREE.Vector2(0.0004, 0));
            profile.push(new THREE.Vector2(r * 0.96, 0));
            const seg = 16;
            for (let i = 0; i <= seg; i++) {
                const t = i / seg;
                const y = t * h;
                const rad = t <= t0 ? r : r - (r - rt) * Math.pow((t - t0) / (1 - t0), 0.75);
                profile.push(new THREE.Vector2(Math.max(rad, 0.0008), y));
            }
            profile.push(new THREE.Vector2(rt * 0.6, h * 1.04));
            profile.push(new THREE.Vector2(0.0004, h * 1.05));
            const geo = new THREE.LatheGeometry(profile, 34);
            const mat = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(b.secondary),
                roughness: 0.28,
                metalness: 0.05,
                clearcoat: 0.85,
                clearcoatRoughness: 0.22,
                sheen: 0.2,
            });
            const lathe = new THREE.Mesh(geo, mat);
            lathe.castShadow = true;
            lathe.receiveShadow = true;
            const decal = new THREE.Mesh(new THREE.CircleGeometry(rt * 1.005, 32), new THREE.MeshStandardMaterial({
                map: makeButtonDecal(b.shirt, b.name.split(" ")[0] ?? "", b.primary, b.secondary),
                roughness: 0.35, metalness: 0.05, transparent: true,
            }));
            decal.rotation.x = -Math.PI / 2;
            decal.position.y = h * 1.052;
            const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.18, r * 1.42, 40), new THREE.MeshBasicMaterial({
                color: new THREE.Color(b.team === 0 ? "#ffe066" : "#ff7a7a"),
                transparent: true, opacity: 0.95, side: THREE.DoubleSide,
            }));
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.0016;
            ring.visible = false;
            const group = new THREE.Group();
            group.add(lathe, decal, ring);
            group.userData.bodyId = b.id;
            group.position.set(b.pos.x, 0, -b.pos.y);
            this.buttonsGroup.add(group);
            this.views.set(b.id, { group, ring, radius: r, height: h, team: b.team });
        }
    }
    resize() {
        const c = this.opts.canvas;
        const w = c.clientWidth || window.innerWidth;
        const h = c.clientHeight || window.innerHeight;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / Math.max(1, h);
        this.camera.updateProjectionMatrix();
    }
    /** Converte um ponto da tela para o plano da mesa (y=0). */
    screenToField(cx, cy) {
        const rect = this.opts.canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hit = new THREE.Vector3();
        if (!ray.ray.intersectPlane(plane, hit))
            return null;
        return { x: hit.x, y: -hit.z };
    }
    pickBody(cx, cy, world) {
        const rect = this.opts.canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, this.camera);
        const meshes = [];
        this.views.forEach((v) => meshes.push(v.group));
        const hits = ray.intersectObjects(meshes, true);
        if (hits.length) {
            let o = hits[0].object;
            while (o && !o.userData.bodyId)
                o = o.parent;
            if (o?.userData.bodyId)
                return o.userData.bodyId;
        }
        // tolerância: botão mais próximo do ponto tocado no plano
        const f = this.screenToField(cx, cy);
        if (!f)
            return null;
        let best = null;
        let bd = 0.075;
        for (const b of world.bodies) {
            const d = Math.hypot(b.pos.x - f.x, b.pos.y - f.y);
            if (d < bd + b.phys.radiusM) {
                bd = d;
                best = b.id;
            }
        }
        return best;
    }
    sync(world, ui, dt) {
        this.time += dt;
        const ball = world.ball;
        this.ballMesh.position.set(ball.x, ball.z, -ball.y);
        this.ballMesh.rotation.x += ball.vy * dt * 26;
        this.ballMesh.rotation.z -= ball.vx * dt * 26;
        for (const b of world.bodies) {
            const v = this.views.get(b.id);
            if (!v)
                continue;
            v.group.position.set(b.pos.x, 0, -b.pos.y);
            v.group.rotation.y += b.spin * dt * 2.2;
            const sel = ui.selectedId === b.id;
            v.ring.visible = sel;
            if (sel) {
                const pulse = 1 + Math.sin(this.time * 7) * 0.06;
                v.ring.scale.setScalar(pulse);
                v.ring.material.opacity = 0.75 + Math.sin(this.time * 7) * 0.2;
            }
            const mat = v.group.children[0];
            const m = mat.material;
            if (b.flash > 0) {
                m.emissive = new THREE.Color(b.team === 0 ? "#ffd75e" : "#ff6b6b");
                m.emissiveIntensity = b.flash * 0.85;
            }
            else if (m.emissiveIntensity !== 0) {
                m.emissiveIntensity = 0;
            }
        }
        // rastro da bola
        this.trailPts.push(new THREE.Vector3(ball.x, ball.z, -ball.y));
        if (this.trailPts.length > 32)
            this.trailPts.shift();
        const attr = this.trail.geometry.getAttribute("position");
        for (let i = 0; i < 32; i++) {
            const p = this.trailPts[Math.max(0, this.trailPts.length - 32 + i)] ?? this.trailPts[0];
            if (p)
                attr.setXYZ(i, p.x, p.y, p.z);
        }
        attr.needsUpdate = true;
        this.trail.geometry.setDrawRange(0, this.trailPts.length);
        this.trail.material.opacity =
            Math.min(0.6, Math.hypot(ball.vx, ball.vy) * 0.14);
        this.updateAim(world, ui);
        this.updateCamera(ui, ball, dt);
        this.stadium.update(this.time, ui.hype);
        this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.4) + Math.max(0, ui.shake - this.shakeAmt) * 0.4;
        this.screenTimer += dt;
        if (this.screenTimer > 0.35) {
            this.screenTimer = 0;
            for (const s of this.stadium.screens) {
                s.draw(ui.homeCode, ui.awayCode, ui.score[0], ui.score[1], Math.floor(ui.minute));
            }
        }
    }
    updateAim(world, ui) {
        const aim = ui.aim;
        if (!aim) {
            this.aimGroup.visible = false;
            this.powerRing.visible = false;
            this.predictLine.visible = false;
            return;
        }
        const v = this.views.get(aim.bodyId);
        if (!v)
            return;
        const b = world.bodies.find((x) => x.id === aim.bodyId);
        if (!b)
            return;
        const origin = new THREE.Vector3(b.pos.x, 0.004, -b.pos.y);
        const dir3 = new THREE.Vector3(aim.dirX, 0, -aim.dirY);
        const len = 0.07 + aim.power * 0.3;
        this.aimGroup.visible = true;
        this.aimGroup.position.set(0, 0, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir3.clone().setY(0).normalize());
        this.arrowShaft.scale.set(len, 1, 1);
        this.arrowShaft.position.copy(origin).setY(0.012);
        this.arrowShaft.quaternion.copy(q);
        this.arrowHead.position.copy(origin).add(dir3.clone().multiplyScalar(len)).setY(0.012);
        this.arrowHead.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir3.clone().normalize());
        const hot = aim.power > 0.78;
        const col = new THREE.Color().setHSL(0.33 - aim.power * 0.33, 0.9, 0.55);
        this.arrowShaft.material.color = col;
        this.arrowHead.material.color = hot ? new THREE.Color("#ff9d5e") : new THREE.Color("#fff3b0");
        // anel de força
        this.powerRing.visible = true;
        if (this.powerGeo)
            this.powerGeo.dispose();
        this.powerGeo = new THREE.RingGeometry(v.radius * 1.55, v.radius * 1.8, 48, 1, -Math.PI / 2, Math.max(0.05, aim.power * Math.PI * 2));
        this.powerRing.geometry = this.powerGeo;
        this.powerRing.position.set(b.pos.x, 0.003, -b.pos.y);
        this.powerRing.material.color = col;
        // linha de predição (mesma física, mundo clonado)
        if (ui.showPrediction && aim.prediction && aim.prediction.points.length > 1) {
            const p = aim.prediction;
            const arr = this.predictGeo.getAttribute("position");
            const n = Math.min(p.points.length, 240);
            for (let i = 0; i < n; i++) {
                arr.setXYZ(i, p.points[i].x, p.points[i].z + 0.004, -p.points[i].y);
            }
            arr.needsUpdate = true;
            this.predictGeo.setDrawRange(0, n);
            this.predictLine.visible = true;
            this.predictLine.computeLineDistances();
            const mat = this.predictLine.material;
            mat.color = p.goal ? new THREE.Color("#7ee08a") : p.out ? new THREE.Color("#ff8f6b") : new THREE.Color("#ffe066");
            mat.opacity = 0.5 + Math.min(0.45, aim.power * 0.5);
        }
        else {
            this.predictLine.visible = false;
        }
    }
    updateCamera(ui, ball, dt) {
        const hx = this.cfg.length / 2;
        switch (ui.camera) {
            case "jogo":
                this.camTarget.set(-hx - 0.52 + ball.x * 0.28, 0.98, -0.92 + ball.y * 0.3);
                this.lookTarget.set(ball.x * 0.55 + 0.1, 0.01, -ball.y * 0.45);
                break;
            case "broadcast":
                this.camTarget.set(ball.x * 0.22, 1.28, -1.42);
                this.lookTarget.set(ball.x * 0.4, 0.02, -ball.y * 0.4);
                break;
            case "tatica":
                this.camTarget.set(0, 2.35, -0.001);
                this.lookTarget.set(0, 0, 0);
                break;
            case "bola":
                this.camTarget.set(ball.x - 0.24, ball.z + 0.22, -ball.y - 0.26);
                this.lookTarget.set(ball.x, ball.z, -ball.y);
                break;
            case "replay": {
                const a = this.time * 0.55;
                this.camTarget.set(ball.x + Math.cos(a) * 0.42, 0.16 + Math.abs(Math.sin(a * 0.7)) * 0.1, -ball.y + Math.sin(a) * 0.42);
                this.lookTarget.set(ball.x, ball.z + 0.01, -ball.y);
                break;
            }
        }
        const k = 1 - Math.exp(-dt * (ui.camera === "replay" ? 6 : 3.4));
        this.camera.position.lerp(this.camTarget, k);
        this.look.lerp(this.lookTarget, k);
        const s = this.shakeAmt;
        if (s > 0.001) {
            this.camera.position.x += (Math.random() - 0.5) * s * 0.03;
            this.camera.position.y += (Math.random() - 0.5) * s * 0.03;
        }
        this.camera.lookAt(this.look);
    }
    frame() {
        if (this.disposed)
            return;
        this.renderer.render(this.scene, this.camera);
    }
    dispose() {
        this.disposed = true;
        this.stadium.dispose();
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
