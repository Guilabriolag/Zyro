import * as THREE from "three";
import { mulberry } from "./attributes.js";
export function paletteFor(weather, time) {
    const base = {
        manha: {
            top: new THREE.Color("#7db4e8"), bottom: new THREE.Color("#dce9f2"),
            sun: new THREE.Color("#fff3d6"), sunIntensity: 2.1, ambient: 0.55, flood: 0.15,
            fogDensity: 0.045, exposure: 1.02,
        },
        tarde: {
            top: new THREE.Color("#4f95dd"), bottom: new THREE.Color("#cfe3f2"),
            sun: new THREE.Color("#ffffff"), sunIntensity: 2.5, ambient: 0.5, flood: 0.1,
            fogDensity: 0.035, exposure: 1.0,
        },
        poente: {
            top: new THREE.Color("#3b3168"), bottom: new THREE.Color("#f08a3c"),
            sun: new THREE.Color("#ffb257"), sunIntensity: 1.7, ambient: 0.34, flood: 0.55,
            fogDensity: 0.06, exposure: 1.06,
        },
        noite: {
            top: new THREE.Color("#05070f"), bottom: new THREE.Color("#131a2c"),
            sun: new THREE.Color("#8fa8d8"), sunIntensity: 0.22, ambient: 0.16, flood: 1.5,
            fogDensity: 0.075, exposure: 1.12,
        },
    };
    const p = base[time];
    if (weather === "nublado") {
        p.top = p.top.clone().lerp(new THREE.Color("#8e97a3"), 0.55);
        p.bottom = p.bottom.clone().lerp(new THREE.Color("#b9c0c7"), 0.5);
        p.sunIntensity *= 0.55;
        p.ambient += 0.14;
        p.fogDensity += 0.02;
    }
    else if (weather === "chuva") {
        p.top = p.top.clone().lerp(new THREE.Color("#4a5260"), 0.72);
        p.bottom = p.bottom.clone().lerp(new THREE.Color("#6b7480"), 0.65);
        p.sunIntensity *= 0.34;
        p.ambient += 0.2;
        p.flood *= 1.25;
        p.fogDensity += 0.05;
        p.exposure *= 0.97;
    }
    else if (weather === "chuva-forte") {
        p.top = p.top.clone().lerp(new THREE.Color("#2d333d"), 0.86);
        p.bottom = p.bottom.clone().lerp(new THREE.Color("#4b535e"), 0.8);
        p.sunIntensity *= 0.2;
        p.ambient += 0.26;
        p.flood *= 1.5;
        p.fogDensity += 0.1;
        p.exposure *= 0.92;
    }
    return p;
}
/** Textura procedural do gramado com todas as marcações da mesa. */
export function makePitchTexture(stadium, grass, wet) {
    const W = 1100, H = 600;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const base = new THREE.Color(stadium.pitchTint);
    g.fillStyle = `#${base.getHexString()}`;
    g.fillRect(0, 0, W, H);
    // faixas de corte
    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
        const dark = i % 2 === 0;
        g.fillStyle = dark ? "rgba(0,0,0,0.085)" : "rgba(255,255,255,0.055)";
        g.fillRect((i * W) / stripes, 0, W / stripes + 1, H);
    }
    // ruído de grama
    const rnd = mulberry(9137);
    for (let i = 0; i < 9000; i++) {
        const x = rnd() * W, y = rnd() * H;
        g.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
        g.fillRect(x, y, 2.2, 1.4);
    }
    if (grass === "gasto") {
        for (let i = 0; i < 26; i++) {
            g.fillStyle = "rgba(96,72,40,0.28)";
            g.beginPath();
            g.ellipse(rnd() * W, rnd() * H, 14 + rnd() * 40, 8 + rnd() * 20, rnd() * 3, 0, Math.PI * 2);
            g.fill();
        }
    }
    if (wet > 0.1) {
        for (let i = 0; i < 40; i++) {
            g.fillStyle = `rgba(190,215,235,${0.05 + rnd() * 0.09 * wet})`;
            g.beginPath();
            g.ellipse(rnd() * W, rnd() * H, 20 + rnd() * 90, 6 + rnd() * 24, 0, 0, Math.PI * 2);
            g.fill();
        }
    }
    // marcações
    g.strokeStyle = "rgba(255,255,255,0.92)";
    g.lineWidth = 5;
    const m = 26;
    g.strokeRect(m, m, W - m * 2, H - m * 2);
    g.beginPath();
    g.moveTo(W / 2, m);
    g.lineTo(W / 2, H - m);
    g.stroke();
    g.beginPath();
    g.arc(W / 2, H / 2, 78, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.beginPath();
    g.arc(W / 2, H / 2, 7, 0, Math.PI * 2);
    g.fill();
    const areaD = 0.155 * W, areaH = 0.56 * H;
    const smallD = 0.058 * W, smallH = 0.28 * H;
    for (const side of [0, 1]) {
        const x = side === 0 ? m : W - m - areaD;
        g.strokeRect(x, (H - areaH) / 2, areaD, areaH);
        const sx = side === 0 ? m : W - m - smallD;
        g.strokeRect(sx, (H - smallH) / 2, smallD, smallH);
        const px = side === 0 ? m + areaD * 0.72 : W - m - areaD * 0.72;
        g.beginPath();
        g.arc(px, H / 2, 6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(side === 0 ? m : W - m, H / 2, 22, side === 0 ? -Math.PI / 2 : Math.PI / 2, side === 0 ? Math.PI / 2 : -Math.PI / 2);
        g.stroke();
        // boca do gol
        g.strokeStyle = "rgba(255,255,255,0.5)";
        g.lineWidth = 3;
        g.strokeRect(side === 0 ? m - 22 : W - m, (H - 0.26 * H) / 2, 22, 0.26 * H);
        g.strokeStyle = "rgba(255,255,255,0.92)";
        g.lineWidth = 5;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
}
export function makeBallTexture() {
    const W = 512, H = 256;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#f6f7f9";
    g.fillRect(0, 0, W, H);
    const rnd = mulberry(77);
    g.fillStyle = "#15181d";
    for (let i = 0; i < 16; i++) {
        const x = rnd() * W, y = 20 + rnd() * (H - 40), r = 16 + rnd() * 12;
        g.beginPath();
        for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
            const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.9;
            if (k === 0)
                g.moveTo(px, py);
            else
                g.lineTo(px, py);
        }
        g.closePath();
        g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
/** Decalque do topo do botão: número + nome + anel da equipe. */
export function makeButtonDecal(shirt, name, primary, secondary) {
    const S = 256;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const g = c.getContext("2d");
    g.clearRect(0, 0, S, S);
    g.fillStyle = primary;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    g.fill();
    const grad = g.createRadialGradient(S / 2, S / 2 - 30, 10, S / 2, S / 2, S / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.42)");
    grad.addColorStop(0.65, "rgba(255,255,255,0.02)");
    grad.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = secondary;
    g.lineWidth = 14;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 16, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 26, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = secondary;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `900 ${S * 0.42}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    g.fillText(String(shirt), S / 2, S / 2 + 6);
    g.font = `700 ${S * 0.085}px "Barlow Condensed", sans-serif`;
    g.fillText(name.toUpperCase().slice(0, 12), S / 2, S * 0.82);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
export function makeScreenTexture() {
    const W = 512, H = 256;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const draw = (home, away, hs, as, minute) => {
        g.fillStyle = "#05070c";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#0d1424";
        for (let y = 0; y < H; y += 4)
            g.fillRect(0, y, W, 2);
        g.fillStyle = "#f7d417";
        g.font = "900 30px 'Barlow Condensed', sans-serif";
        g.textAlign = "center";
        g.fillText("COPA BUTTON 3D", W / 2, 44);
        g.fillStyle = "#eef2f7";
        g.font = "900 56px 'Barlow Condensed', sans-serif";
        g.fillText(`${home}  ${hs} × ${as}  ${away}`, W / 2, 128);
        g.fillStyle = "#7ee08a";
        g.font = "700 30px 'Barlow Condensed', sans-serif";
        g.fillText(`${String(Math.floor(minute)).padStart(2, "0")}'`, W / 2, 186);
        tex.needsUpdate = true;
    };
    draw("BRA", "ARG", 0, 0, 0);
    return { texture: tex, draw, canvas: c };
}
function tierBox(w, h, d, color, rough = 0.85) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 }));
    mesh.receiveShadow = true;
    return mesh;
}
export function buildStadium(opts, fieldLen, fieldWid) {
    const { stadium, weather, timeOfDay } = opts;
    const pal = paletteFor(weather, timeOfDay);
    const group = new THREE.Group();
    const lights = [];
    const disposables = [];
    const rnd = mulberry(stadium.code.length * 7919 + stadium.capacity);
    // ── CÉU ──
    const skyGeo = new THREE.SphereGeometry(28, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
            uTop: { value: pal.top },
            uBottom: { value: pal.bottom },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uBottom; varying vec3 vP;
      void main(){ float h = clamp(vP.y/28.0*0.5+0.5, 0.0, 1.0); vec3 c = mix(uBottom, uTop, pow(h, 0.85)); gl_FragColor = vec4(c,1.0); }`,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    group.add(sky);
    disposables.push(skyGeo, skyMat);
    // ── LUZES ──
    const sun = new THREE.DirectionalLight(pal.sun, pal.sunIntensity);
    const sunAngle = timeOfDay === "manha" ? -0.9 : timeOfDay === "tarde" ? 0.6 : timeOfDay === "poente" ? 1.5 : 0.2;
    sun.position.set(Math.cos(sunAngle) * 6, Math.max(1.2, Math.sin(sunAngle) * 6), 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -2.2;
    sun.shadow.camera.right = 2.2;
    sun.shadow.camera.top = 2.2;
    sun.shadow.camera.bottom = -2.2;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 18;
    sun.shadow.bias = -0.0012;
    group.add(sun);
    lights.push(sun);
    const hemi = new THREE.HemisphereLight(pal.bottom, new THREE.Color("#12240f"), pal.ambient);
    group.add(hemi);
    lights.push(hemi);
    const hx = fieldLen / 2, hy = fieldWid / 2;
    const depth = stadium.standDepth;
    const height = stadium.standHeight;
    const concrete = new THREE.Color("#8d949c").lerp(pal.bottom, 0.25);
    const concreteDark = new THREE.Color("#5a6169").lerp(pal.bottom, 0.2);
    const accent = new THREE.Color(stadium.crowdColors[0] ?? "#f7d417");
    const tiers = 5;
    const crowdSeats = [];
    function buildStand(len, isSide, sign) {
        const stand = new THREE.Group();
        const gap = 0.055;
        for (let i = 0; i < tiers; i++) {
            const t = i / (tiers - 1);
            const tierDepth = depth / tiers;
            const y = height * (0.16 + t * 0.84);
            const z = sign * (hy + gap + tierDepth * (i + 0.5));
            const box = tierBox(len, 0.055 + y, tierDepth * 1.04, i % 2 === 0 ? concrete : concreteDark);
            box.position.set(0, (0.055 + y) / 2 - 0.02, z);
            stand.add(box);
            // assentos / torcida
            const seats = Math.round(len * (isSide ? 26 : 20) * stadium.crowdDensity * 0.42);
            for (let s = 0; s < seats; s++) {
                const px = (rnd() * 2 - 1) * (len / 2 - 0.03);
                const pz = z + (rnd() * 2 - 1) * tierDepth * 0.42;
                const py = y + 0.045;
                crowdSeats.push(isSide ? new THREE.Vector3(px, py, pz) : new THREE.Vector3(pz, py, px));
            }
        }
        // fachada externa
        const facade = tierBox(len + depth * 0.4, height * 1.08, 0.06, concreteDark, 0.9);
        facade.position.set(0, height * 0.5, sign * (hy + gap + depth + 0.03));
        stand.add(facade);
        // cobertura
        if (stadium.roof) {
            const roof = tierBox(len + depth * 0.7, 0.045, depth * 1.15, new THREE.Color("#c9ced6"), 0.55);
            roof.position.set(0, height * 1.16, sign * (hy + gap + depth * 0.55));
            roof.rotation.x = sign * -0.09;
            stand.add(roof);
            const trim = tierBox(len + depth * 0.7, 0.035, 0.03, accent, 0.4);
            trim.position.set(0, height * 1.1, sign * (hy + gap + 0.02));
            stand.add(trim);
        }
        if (!isSide)
            stand.rotation.y = Math.PI / 2;
        return stand;
    }
    const sideLen = fieldLen + depth * 2.2;
    const goalLen = fieldWid + depth * 2.0;
    group.add(buildStand(sideLen, true, -1));
    group.add(buildStand(sideLen, true, 1));
    group.add(buildStand(goalLen, false, -1));
    group.add(buildStand(goalLen, false, 1));
    // piso externo / entorno
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(fieldLen + depth * 4.4, fieldWid + depth * 4.4), new THREE.MeshStandardMaterial({ color: new THREE.Color("#20262c").lerp(pal.bottom, 0.15), roughness: 0.95 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.012;
    apron.receiveShadow = true;
    group.add(apron);
    disposables.push(apron.geometry, apron.material);
    // ── TORCIDAS INSTANCIADAS ──
    let crowd = null;
    let crowdUniforms = null;
    const maxCrowd = Math.min(crowdSeats.length, 3200);
    if (maxCrowd > 20) {
        const geo = new THREE.BoxGeometry(0.032, 0.05, 0.032);
        const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
        crowdUniforms = { uTime: { value: 0 }, uHype: { value: 0 } };
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = crowdUniforms.uTime;
            shader.uniforms.uHype = crowdUniforms.uHype;
            shader.vertexShader = `uniform float uTime; uniform float uHype;\n` + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
         vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
         float w = sin(uTime*3.2 + ip.x*5.0 + ip.z*4.0) * 0.5 + 0.5;
         transformed.y += w * (0.006 + uHype*0.02);
         transformed.x += sin(uTime*2.1 + ip.z*7.0) * (0.003 + uHype*0.008);`);
        };
        crowd = new THREE.InstancedMesh(geo, mat, maxCrowd);
        const colors = stadium.crowdColors.map((c) => new THREE.Color(c));
        const m4 = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        for (let i = 0; i < maxCrowd; i++) {
            const p = crowdSeats[i];
            q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
            const s = 0.75 + rnd() * 0.55;
            sc.set(s, s, s);
            m4.compose(p, q, sc);
            crowd.setMatrixAt(i, m4);
            crowd.setColorAt(i, colors[Math.floor(rnd() * colors.length)]);
        }
        crowd.instanceMatrix.needsUpdate = true;
        if (crowd.instanceColor)
            crowd.instanceColor.needsUpdate = true;
        crowd.frustumCulled = false;
        group.add(crowd);
        disposables.push(geo, mat);
    }
    // ── ILUMINAÇÃO DO ESTÁDIO ──
    const floodColor = new THREE.Color("#eaf3ff");
    const floodPositions = [];
    if (stadium.lightRig === "torres") {
        for (const sx of [-1, 1])
            for (const sz of [-1, 1]) {
                floodPositions.push(new THREE.Vector3(sx * (hx + depth + 0.35), height * 1.5, sz * (hy + depth + 0.35)));
            }
    }
    else if (stadium.lightRig === "anel") {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            floodPositions.push(new THREE.Vector3(Math.cos(a) * (hx + depth * 0.8), height * 1.35, Math.sin(a) * (hy + depth * 0.8)));
        }
    }
    else {
        floodPositions.push(new THREE.Vector3(0, height * 1.6, -(hy + depth * 0.6)));
        floodPositions.push(new THREE.Vector3(0, height * 1.6, hy + depth * 0.6));
    }
    const rigGeo = new THREE.BoxGeometry(0.22, 0.07, 0.1);
    const rigMat = new THREE.MeshStandardMaterial({
        color: floodColor, emissive: floodColor, emissiveIntensity: 0.4 + pal.flood * 1.6, roughness: 0.4,
    });
    disposables.push(rigGeo, rigMat);
    for (const p of floodPositions) {
        const rig = new THREE.Mesh(rigGeo, rigMat);
        rig.position.copy(p);
        rig.lookAt(0, 0, 0);
        group.add(rig);
    }
    // apenas 2 spotlights reais (custo mobile)
    const spotCount = Math.min(2, floodPositions.length);
    for (let i = 0; i < spotCount; i++) {
        const sp = new THREE.SpotLight(floodColor, pal.flood * 18, 14, 0.78, 0.5, 1.0);
        sp.position.copy(floodPositions[i * Math.max(1, Math.floor(floodPositions.length / 2))]);
        sp.target.position.set(0, 0, 0);
        group.add(sp);
        group.add(sp.target);
        lights.push(sp);
    }
    // ── TELÕES ──
    const screens = [];
    for (let i = 0; i < stadium.screens; i++) {
        const st = makeScreenTexture();
        const geo = new THREE.PlaneGeometry(0.62, 0.31);
        const mat = new THREE.MeshBasicMaterial({ map: st.texture, toneMapped: false });
        const mesh = new THREE.Mesh(geo, mat);
        const side = i % 2 === 0 ? -1 : 1;
        const along = i < 2;
        if (along) {
            mesh.position.set(i === 0 ? -0.55 : 0.55, height * 1.02, side * (hy + depth * 0.72));
            mesh.rotation.y = side > 0 ? Math.PI : 0;
        }
        else {
            mesh.position.set(side * (hx + depth * 0.72), height * 1.02, 0);
            mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
        group.add(mesh);
        screens.push({ mesh, draw: st.draw });
        disposables.push(geo, mat, st.texture);
    }
    // ── CHUVA ──
    let rain = null;
    let rainVel = null;
    if (weather === "chuva" || weather === "chuva-forte") {
        const n = weather === "chuva-forte" ? 1500 : 750;
        const pos = new Float32Array(n * 6);
        rainVel = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (rnd() * 2 - 1) * (hx + depth * 1.6);
            const z = (rnd() * 2 - 1) * (hy + depth * 1.6);
            const y = rnd() * 2.4 + 0.1;
            const len = 0.05 + rnd() * 0.05;
            pos.set([x, y, z, x + 0.008, y - len, z], i * 6);
            rainVel[i] = 2.6 + rnd() * 2.4;
        }
        const g2 = new THREE.BufferGeometry();
        g2.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const m2 = new THREE.LineBasicMaterial({
            color: new THREE.Color("#cfe2f2"), transparent: true, opacity: weather === "chuva-forte" ? 0.5 : 0.34,
        });
        rain = new THREE.LineSegments(g2, m2);
        rain.frustumCulled = false;
        group.add(rain);
        disposables.push(g2, m2);
    }
    // ── BANDEIRAS ──
    const flagGeo = new THREE.PlaneGeometry(0.16, 0.1);
    for (let i = 0; i < 10; i++) {
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(stadium.crowdColors[i % stadium.crowdColors.length]),
            side: THREE.DoubleSide, roughness: 0.8,
        });
        const flag = new THREE.Mesh(flagGeo, mat);
        const a = (i / 10) * Math.PI * 2;
        flag.position.set(Math.cos(a) * (hx + depth * 1.05), height * 1.22, Math.sin(a) * (hy + depth * 1.05));
        flag.rotation.y = -a;
        group.add(flag);
        disposables.push(mat);
    }
    disposables.push(flagGeo);
    const update = (t, hype) => {
        if (crowdUniforms) {
            crowdUniforms.uTime.value = t;
            crowdUniforms.uHype.value = hype;
        }
        if (rain && rainVel) {
            const attr = rain.geometry.getAttribute("position");
            const arr = attr.array;
            const n = rainVel.length;
            const wind = weather === "chuva-forte" ? 0.35 : 0.12;
            for (let i = 0; i < n; i++) {
                const dy = rainVel[i] * 0.016;
                arr[i * 6 + 1] -= dy;
                arr[i * 6 + 4] -= dy;
                arr[i * 6 + 0] += wind * dy;
                arr[i * 6 + 3] += wind * dy;
                if (arr[i * 6 + 1] < 0.01) {
                    const y = 2.2 + Math.random() * 0.5;
                    const d = arr[i * 6 + 1] - 0.01;
                    arr[i * 6 + 1] = y + d;
                    arr[i * 6 + 4] = arr[i * 6 + 1] - 0.06;
                }
            }
            attr.needsUpdate = true;
        }
    };
    const dispose = () => {
        for (const d of disposables)
            d.dispose();
        if (crowd) {
            crowd.geometry.dispose();
            crowd.material.dispose();
        }
    };
    return { group, lights, crowd, rain, screens, sky, sun, palette: pal, update, dispose };
}
