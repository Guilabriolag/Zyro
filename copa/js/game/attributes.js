import { getNation, FIRST_NAMES, LAST_NAMES } from "../lib/nations.js";
export const FIELD = {
    length: 2.2,
    width: 1.2,
    goalWidth: 0.3,
    goalHeight: 0.055,
    goalDepth: 0.09,
    wallHeight: 0.045,
    ballRadius: 0.011,
    ballMass: 0.0024,
    gravity: 9.81,
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
/** Camada 1 → Camada 2: geometria do botão. */
export function buttonGeometry(attrs) {
    const r = lerp(0.021, 0.031, clamp(attrs.radius, 0, 100) / 100);
    const h = lerp(0.006, 0.0145, clamp(attrs.height, 0, 100) / 100);
    const e = clamp(attrs.edge, 0, 100) / 100;
    // borda ~vertical (e=0) quase não tem chanfro; borda inclinada (e=1) chanfra desde a base
    const bevelStart = 1 - e * 0.85;
    const topRatio = lerp(0.88, 0.5, e);
    return { radiusM: r, heightM: h, topRadiusM: r * topRatio, bevelStart, bevelExp: 0.75 };
}
/** Derivada radial do perfil no ponto de contato com a bola. */
function slopeAtRadius(g, y) {
    const t = clamp(y / g.heightM, 0, 1);
    if (t <= g.bevelStart)
        return 0; // parede vertical → contato horizontal
    const u = (t - g.bevelStart) / (1 - g.bevelStart);
    const inset = g.radiusM - g.topRadiusM;
    const drdy = (-inset * g.bevelExp * Math.pow(Math.max(u, 1e-4), g.bevelExp - 1)) /
        (g.heightM * (1 - g.bevelStart));
    return Math.abs(drdy);
}
/** Raio do perfil em uma altura y (usado pelo renderer 3D e pelo editor). */
export function radiusAtHeight(g, y) {
    const t = clamp(y / g.heightM, 0, 1);
    if (t <= g.bevelStart)
        return g.radiusM;
    const u = (t - g.bevelStart) / (1 - g.bevelStart);
    const inset = g.radiusM - g.topRadiusM;
    return g.radiusM - inset * Math.pow(u, g.bevelExp);
}
/** Perfil completo para LatheGeometry — o editor mostra exatamente isto em 3D. */
export function buttonProfilePoints(attrs, segments = 26) {
    const g = buttonGeometry(attrs);
    const pts = [];
    pts.push([0.0002, 0]);
    pts.push([g.radiusM * 0.94, 0]);
    for (let i = 1; i <= segments; i++) {
        const y = (i / segments) * g.heightM;
        pts.push([Math.max(radiusAtHeight(g, y), 0.0006), y]);
    }
    // face superior levemente abaulada
    pts.push([g.topRadiusM * 0.72, g.heightM * 1.03]);
    pts.push([g.topRadiusM * 0.35, g.heightM * 1.045]);
    pts.push([0.0002, g.heightM * 1.05]);
    return pts;
}
/** Camada 2 → Camada 3: propriedades físicas lidas pelo motor. */
export function derivePhysics(attrs) {
    const g = buttonGeometry(attrs);
    const a = {
        force: clamp(attrs.force, 0, 100),
        slide: clamp(attrs.slide, 0, 100),
        precision: clamp(attrs.precision, 0, 100),
        edge: clamp(attrs.edge, 0, 100),
        height: clamp(attrs.height, 0, 100),
        mass: clamp(attrs.mass, 0, 100),
        radius: clamp(attrs.radius, 0, 100),
    };
    const massKg = lerp(0.0055, 0.026, a.mass / 100);
    // deslize alto → menos perda de velocidade
    const friction = lerp(3.5, 1.05, a.slide / 100);
    const restitution = lerp(0.24, 0.56, a.slide / 100) + (a.radius / 100) * 0.05;
    // botão pesado é mais difícil de acelerar, mas transfere mais impulso
    const massFactor = lerp(1.22, 0.74, a.mass / 100);
    const maxSpeed = lerp(1.9, 5.4, a.force / 100) * massFactor;
    const aimErrorDeg = 7.2 * Math.pow(1 - a.precision / 100, 1.15) + 0.25;
    const curveAuthority = lerp(0.15, 1.5, a.precision / 100) * lerp(0.7, 1.3, a.slide / 100);
    const stability = (massKg / 0.026) * 0.65 + (a.radius / 100) * 0.35;
    const contactHeightM = Math.min(FIELD.ballRadius, g.heightM * 0.92);
    const slope = slopeAtRadius(g, contactHeightM);
    const contactSlopeDeg = (Math.atan(slope) * 180) / Math.PI;
    const liftIndex = clamp(Math.sin((contactSlopeDeg * Math.PI) / 180) * 1.25, 0, 1);
    const heightBias = clamp((g.heightM - FIELD.ballRadius * 0.95) / FIELD.ballRadius, -0.4, 0.6);
    let signature;
    if (liftIndex > 0.62)
        signature = "Borda muito inclinada: bola aérea, traiçoeira para o goleiro.";
    else if (liftIndex > 0.32)
        signature = "Borda média: chute com leve elevação e bom efeito.";
    else if (liftIndex > 0.12)
        signature = "Borda baixa: chute semi-rasteiro, direto.";
    else
        signature = "Borda quase vertical: chute rasteiro, bola colada na mesa.";
    if (massKg > 0.019)
        signature += " Botão pesado — ganha todo duelo físico.";
    else if (massKg < 0.009)
        signature += " Botão leve — arranca rápido e é deslocado fácil.";
    if (friction < 1.6)
        signature += " Deslize extremo: quase não freia.";
    else if (friction > 2.9)
        signature += " Atrito alto: morre cedo, bom para trava.";
    return {
        ...g,
        massKg,
        friction,
        restitution,
        maxSpeed,
        aimErrorDeg,
        curveAuthority,
        stability,
        contactHeightM,
        contactSlopeDeg,
        liftIndex,
        heightBias,
        signature,
    };
}
export function overall(attrs) {
    const p = derivePhysics(attrs);
    const base = attrs.force * 0.22 + attrs.slide * 0.16 + attrs.precision * 0.3 + attrs.mass * 0.12 +
        attrs.radius * 0.05 + attrs.height * 0.05;
    // equilíbrio físico vale overall: extremos pagam preço
    const balance = 1 - Math.abs(p.liftIndex - 0.45) * 0.22;
    return Math.round(clamp(base * balance + p.curveAuthority * 8, 1, 99));
}
export function makeAthlete(nation, index, role, seed) {
    const rng = mulberry(seed * 9781 + index * 131 + nation.code.charCodeAt(0) * 7);
    const a = nation.attrs;
    const shapeBias = nation.buttonShape === "vertical" ? -22 : nation.buttonShape === "inclinada" ? 22 : 0;
    const jitter = (base, amp) => Math.round(clamp(base + (rng() * 2 - 1) * amp, 35, 99));
    const attrs = {
        force: jitter(a.force, 9),
        slide: jitter(a.slide, 9),
        precision: jitter(a.precision, 8),
        edge: Math.round(clamp(30 + shapeBias + (rng() * 2 - 1) * 22, 2, 98)),
        height: Math.round(clamp(45 + (rng() * 2 - 1) * 30, 5, 98)),
        mass: Math.round(clamp((role === "ZAG" || role === "GOL" ? 68 : role === "ATA" ? 40 : 54) + (rng() * 2 - 1) * 22, 5, 98)),
        radius: Math.round(clamp((role === "ZAG" || role === "GOL" ? 62 : 46) + (rng() * 2 - 1) * 24, 5, 98)),
    };
    return {
        id: `${nation.code}-${index}`,
        name: `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]}`,
        shirt: index === 0 ? 1 : index + 1,
        role,
        attrs,
        primary: nation.primary,
        secondary: nation.secondary,
        material: "acrilico",
    };
}
export const FORMATIONS = {
    "4-3-3": [
        { pos: [0.06, 0], role: "GOL", name: "Goleiro" },
        { pos: [0.2, -0.32], role: "ZAG", name: "Zagueiro" },
        { pos: [0.2, -0.11], role: "ZAG", name: "Zagueiro" },
        { pos: [0.2, 0.11], role: "ZAG", name: "Zagueiro" },
        { pos: [0.2, 0.32], role: "ZAG", name: "Zagueiro" },
        { pos: [0.4, -0.24], role: "MEI", name: "Meia" },
        { pos: [0.38, 0], role: "VOL", name: "Volante" },
        { pos: [0.4, 0.24], role: "MEI", name: "Meia" },
        { pos: [0.62, -0.3], role: "ATA", name: "Ponta" },
        { pos: [0.66, 0], role: "ATA", name: "Centroavante" },
        { pos: [0.62, 0.3], role: "ATA", name: "Ponta" },
    ],
    "4-4-2": [
        { pos: [0.06, 0], role: "GOL", name: "Goleiro" },
        { pos: [0.19, -0.32], role: "ZAG", name: "Zagueiro" },
        { pos: [0.19, -0.11], role: "ZAG", name: "Zagueiro" },
        { pos: [0.19, 0.11], role: "ZAG", name: "Zagueiro" },
        { pos: [0.19, 0.32], role: "ZAG", name: "Zagueiro" },
        { pos: [0.42, -0.33], role: "MEI", name: "Meia" },
        { pos: [0.39, -0.12], role: "VOL", name: "Volante" },
        { pos: [0.39, 0.12], role: "MEI", name: "Meia" },
        { pos: [0.42, 0.33], role: "MEI", name: "Meia" },
        { pos: [0.63, -0.14], role: "ATA", name: "Atacante" },
        { pos: [0.63, 0.14], role: "ATA", name: "Atacante" },
    ],
    "3-5-2": [
        { pos: [0.06, 0], role: "GOL", name: "Goleiro" },
        { pos: [0.19, -0.2], role: "ZAG", name: "Zagueiro" },
        { pos: [0.17, 0], role: "ZAG", name: "Zagueiro" },
        { pos: [0.19, 0.2], role: "ZAG", name: "Zagueiro" },
        { pos: [0.38, -0.38], role: "LAT", name: "Ala" },
        { pos: [0.36, -0.16], role: "MEI", name: "Meia" },
        { pos: [0.33, 0], role: "VOL", name: "Volante" },
        { pos: [0.36, 0.16], role: "MEI", name: "Meia" },
        { pos: [0.38, 0.38], role: "LAT", name: "Ala" },
        { pos: [0.6, -0.13], role: "ATA", name: "Atacante" },
        { pos: [0.6, 0.13], role: "ATA", name: "Atacante" },
    ],
    "4-2-3-1": [
        { pos: [0.06, 0], role: "GOL", name: "Goleiro" },
        { pos: [0.2, -0.33], role: "ZAG", name: "Zagueiro" },
        { pos: [0.2, -0.11], role: "ZAG", name: "Zagueiro" },
        { pos: [0.2, 0.11], role: "ZAG", name: "Zagueiro" },
        { pos: [0.2, 0.33], role: "ZAG", name: "Zagueiro" },
        { pos: [0.35, -0.14], role: "VOL", name: "Volante" },
        { pos: [0.35, 0.14], role: "VOL", name: "Volante" },
        { pos: [0.52, -0.3], role: "MEI", name: "Meia" },
        { pos: [0.54, 0], role: "MEI", name: "Meia" },
        { pos: [0.52, 0.3], role: "MEI", name: "Meia" },
        { pos: [0.68, 0], role: "ATA", name: "Centroavante" },
    ],
};
export const TACTICS = {
    ofensiva: { shift: 0.12, gkAggro: 0.85, press: 1.15, label: "Ofensiva" },
    equilibrada: { shift: 0.05, gkAggro: 0.6, press: 1.0, label: "Equilibrada" },
    defensiva: { shift: -0.06, gkAggro: 0.4, press: 0.85, label: "Defensiva" },
    pressao: { shift: 0.08, gkAggro: 0.95, press: 1.3, label: "Pressão alta" },
    recuo: { shift: -0.12, gkAggro: 0.3, press: 0.75, label: "Recuo total" },
};
export function buildSquad(nationCode, formation, seed = 1) {
    const nation = getNation(nationCode);
    const shape = FORMATIONS[formation] ?? FORMATIONS["4-3-3"];
    return shape.map((slot, i) => makeAthlete(nation, i, slot.role, seed + i * 3));
}
export function mulberry(seed) {
    let a = seed >>> 0;
    return function rand() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
