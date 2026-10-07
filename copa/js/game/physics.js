import { FIELD, derivePhysics } from "./attributes.js";
import { mulberry } from "./attributes.js";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function makeFieldCfg(partial = {}) {
    return {
        length: FIELD.length,
        width: FIELD.width,
        goalWidth: FIELD.goalWidth,
        goalHeight: FIELD.goalHeight,
        goalDepth: FIELD.goalDepth,
        walls: true,
        grassDamping: 1,
        grassBounce: 1,
        wetness: 0,
        ballFriction: 1.5,
        ballDrag: 0.42,
        wallRestitution: 0.74,
        ...partial,
    };
}
export function bodyFromAthlete(athlete, team, slot, home) {
    return {
        id: `${team}-${slot}`,
        team,
        slot,
        role: athlete.role,
        name: athlete.name,
        shirt: athlete.shirt,
        isGK: athlete.role === "GOL",
        pos: { ...home },
        vel: { x: 0, y: 0 },
        home: { ...home },
        phys: derivePhysics(athlete.attrs),
        primary: athlete.primary,
        secondary: athlete.secondary,
        spin: 0,
        pendingSpin: 0,
        pendingPower: 1,
        flash: 0,
        active: true,
    };
}
export function createWorld(cfg, bodies, ballPos) {
    return {
        cfg,
        bodies,
        ball: {
            x: ballPos.x, y: ballPos.y, z: FIELD.ballRadius,
            vx: 0, vy: 0, vz: 0, spin: 0,
            r: FIELD.ballRadius, mass: FIELD.ballMass, airborne: false,
        },
        events: [],
        time: 0,
        lastTouch: null,
        locked: false,
        gkSaves: [0, 0],
    };
}
export function resetBall(w, x, y) {
    w.ball.x = x;
    w.ball.y = y;
    w.ball.z = w.ball.r;
    w.ball.vx = 0;
    w.ball.vy = 0;
    w.ball.vz = 0;
    w.ball.spin = 0;
    w.ball.airborne = false;
    w.locked = false;
}
/**
 * Remove sobreposições depois de reposicionar botões (reinícios, cobrança,
 * reposicionamento da CPU). Sem isso o chute "engasga" em corpos vizinhos.
 */
export function separate(w, iterations = 4) {
    for (let it = 0; it < iterations; it++) {
        let moved = false;
        for (let i = 0; i < w.bodies.length; i++) {
            const a = w.bodies[i];
            for (let j = i + 1; j < w.bodies.length; j++) {
                const b = w.bodies[j];
                const min = a.phys.radiusM + b.phys.radiusM + 0.0008;
                let dx = b.pos.x - a.pos.x;
                let dy = b.pos.y - a.pos.y;
                let d = Math.hypot(dx, dy);
                if (d >= min)
                    continue;
                if (d < 1e-6) {
                    dx = 0.001;
                    dy = 0;
                    d = 0.001;
                }
                const push = (min - d) / 2;
                const nx = dx / d, ny = dy / d;
                a.pos.x -= nx * push;
                a.pos.y -= ny * push;
                b.pos.x += nx * push;
                b.pos.y += ny * push;
                moved = true;
            }
            // botão nunca fica em cima da bola
            const bx = w.ball.x - a.pos.x;
            const by = w.ball.y - a.pos.y;
            const bd = Math.hypot(bx, by);
            const bmin = a.phys.radiusM + w.ball.r + 0.0008;
            if (bd < bmin && bd > 1e-6) {
                a.pos.x -= (bx / bd) * (bmin - bd);
                a.pos.y -= (by / bd) * (bmin - bd);
                moved = true;
            }
            const hx = w.cfg.length / 2, hy = w.cfg.width / 2;
            a.pos.x = Math.max(-hx + a.phys.radiusM, Math.min(hx - a.phys.radiusM, a.pos.x));
            a.pos.y = Math.max(-hy + a.phys.radiusM, Math.min(hy - a.phys.radiusM, a.pos.y));
        }
        if (!moved)
            break;
    }
}
export function stopAll(w) {
    for (const b of w.bodies) {
        b.vel.x = 0;
        b.vel.y = 0;
    }
    w.ball.vx = 0;
    w.ball.vy = 0;
    w.ball.vz = 0;
    w.ball.spin = 0;
}
export function kineticEnergy(w) {
    let e = 0.5 * w.ball.mass * (w.ball.vx ** 2 + w.ball.vy ** 2 + w.ball.vz ** 2);
    for (const b of w.bodies)
        e += 0.5 * b.phys.massKg * (b.vel.x ** 2 + b.vel.y ** 2);
    return e;
}
export function allStopped(w) {
    const ball = w.ball;
    // bola "dormindo" acima de 9 cm/s: acelera a resolução do lance sem mudar a sensação
    const ballStill = Math.hypot(ball.vx, ball.vy) < 0.09 && Math.abs(ball.vz) < 0.08 && ball.z <= ball.r + 0.0015;
    if (!ballStill)
        return false;
    return w.bodies.every((b) => Math.hypot(b.vel.x, b.vel.y) < 0.03);
}
export function isMoving(w) {
    return !allStopped(w);
}
/** Aplica o peteleco: direção normalizada, potência 0..1 e efeito desejado. */
export function shoot(w, bodyId, dir, power, spin, rand = Math.random) {
    const b = w.bodies.find((x) => x.id === bodyId);
    if (!b)
        return;
    const len = Math.hypot(dir.x, dir.y) || 1;
    const nx = dir.x / len;
    const ny = dir.y / len;
    // precisão → dispersão angular do vetor
    const errDeg = b.phys.aimErrorDeg * (1.35 - power * 0.55);
    const a = ((rand() * 2 - 1) * errDeg * Math.PI) / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    const dx = nx * ca - ny * sa;
    const dy = nx * sa + ny * ca;
    const speed = b.phys.maxSpeed * clamp(power, 0.05, 1);
    b.vel.x = dx * speed;
    b.vel.y = dy * speed;
    b.pendingSpin = spin * b.phys.curveAuthority * 55;
    b.pendingPower = power;
    b.flash = 1;
}
function resolveButtonBall(w, b, dt) {
    const ball = w.ball;
    const dx = ball.x - b.pos.x;
    const dy = ball.y - b.pos.y;
    const minDist = ball.r + b.phys.radiusM;
    const d2 = dx * dx + dy * dy;
    if (d2 > minDist * minDist)
        return;
    const dist = Math.sqrt(d2) || 1e-6;
    const nx = dx / dist;
    const ny = dy / dist;
    // separação posicional (bola é empurrada para fora do botão)
    const pen = minDist - dist;
    const bMass = b.phys.massKg;
    const totalInv = 1 / ball.mass + 1 / bMass;
    ball.x += nx * pen * (1 / ball.mass / totalInv) * 0.9;
    ball.y += ny * pen * (1 / ball.mass / totalInv) * 0.9;
    b.pos.x -= nx * pen * (1 / bMass / totalInv) * 0.55;
    b.pos.y -= ny * pen * (1 / bMass / totalInv) * 0.55;
    const rvx = ball.vx - b.vel.x;
    const rvy = ball.vy - b.vel.y;
    const rvn = rvx * nx + rvy * ny;
    if (rvn >= 0)
        return;
    const e = 0.6;
    const j = (-(1 + e) * rvn) / totalInv;
    ball.vx += (j * nx) / ball.mass;
    ball.vy += (j * ny) / ball.mass;
    b.vel.x -= (j * nx) / bMass;
    b.vel.y -= (j * ny) / bMass;
    const impact = -rvn;
    // ── GEOMETRIA → FÍSICA: a borda do botão define a componente vertical ──
    const lift = impact * b.phys.liftIndex * 0.5;
    ball.vz += lift;
    // botão mais alto que a bola empurra para baixo → bola quica na mesa
    if (b.phys.heightBias > 0)
        ball.vz -= impact * b.phys.heightBias * 0.3;
    // botão muito fino passa por baixo → bola ganha backspin e fica rasteira
    if (b.phys.heightBias < 0) {
        ball.vz += impact * 0.06;
        ball.spin += impact * 4 * Math.sign(b.vel.x * -ny + b.vel.y * nx || 1);
    }
    // ── EFEITO: contato fora do centro gera curva (Magnus) ──
    const tx = -ny, ty = nx;
    const tangential = b.vel.x * tx + b.vel.y * ty;
    ball.spin += tangential * b.phys.curveAuthority * 9;
    if (b.pendingSpin !== 0) {
        ball.spin += b.pendingSpin * (0.4 + impact * 0.12);
        b.pendingSpin = 0;
    }
    ball.spin = clamp(ball.spin, -90, 90);
    ball.airborne = ball.z > ball.r + 0.002 || Math.abs(ball.vz) > 0.25;
    b.flash = 1;
    w.lastTouch = { team: b.team, bodyId: b.id };
    const speed = Math.hypot(ball.vx, ball.vy, ball.vz);
    if (b.isGK) {
        w.gkSaves[b.team] += 1;
        w.events.push({ t: "save", team: b.team });
    }
    else {
        w.events.push({ t: "touch", team: b.team, bodyId: b.id, speed });
    }
    void dt;
}
function resolveButtonButton(w, a, b) {
    const dx = b.pos.x - a.pos.x;
    const dy = b.pos.y - a.pos.y;
    const minDist = a.phys.radiusM + b.phys.radiusM;
    const d2 = dx * dx + dy * dy;
    if (d2 > minDist * minDist || d2 < 1e-12)
        return;
    const dist = Math.sqrt(d2);
    const nx = dx / dist, ny = dy / dist;
    const pen = minDist - dist;
    const ma = a.phys.massKg, mb = b.phys.massKg;
    const inv = 1 / (1 / ma + 1 / mb);
    a.pos.x -= nx * pen * 0.5;
    a.pos.y -= ny * pen * 0.5;
    b.pos.x += nx * pen * 0.5;
    b.pos.y += ny * pen * 0.5;
    const rvn = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny;
    if (rvn >= 0)
        return;
    const e = Math.min(a.phys.restitution, b.phys.restitution) * 0.75;
    const j = (-(1 + e) * rvn) * inv;
    a.vel.x -= (j * nx) / ma;
    a.vel.y -= (j * ny) / ma;
    b.vel.x += (j * nx) / mb;
    b.vel.y += (j * ny) / mb;
    const impact = -rvn;
    if (impact > 1.2)
        w.events.push({ t: "blocked" });
    a.flash = Math.max(a.flash, 0.6);
    b.flash = Math.max(b.flash, 0.6);
    // estabilidade: botão pesado quase não é deslocado (já expresso pela massa)
    a.spin += impact * 0.4;
    b.spin -= impact * 0.4;
}
function inGoalMouth(w, y, z) {
    return Math.abs(y) < w.cfg.goalWidth / 2 - w.ball.r * 0.25 && z < w.cfg.goalHeight;
}
/** Um passo de física de tamanho fixo. Determinístico dado o mesmo dt. */
export function stepWorld(w, dt, rand = Math.random) {
    w.events.length = 0;
    const cfg = w.cfg;
    const ball = w.ball;
    const hx = cfg.length / 2;
    const hy = cfg.width / 2;
    const wet = cfg.wetness;
    // ── BOLA ──
    if (!w.locked) {
        const airDrag = cfg.ballDrag * (ball.z > ball.r + 0.001 ? 1 : 0.35);
        const damp = Math.exp(-airDrag * dt);
        ball.vx *= damp;
        ball.vy *= damp;
        ball.vz -= FIELD.gravity * dt;
        // curva de Magnus (efeito) — a chuva "mata" o efeito
        const spinK = 0.0105 * (1 - 0.5 * wet);
        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > 0.05 && Math.abs(ball.spin) > 0.01) {
            const ax = (-ball.vy / sp) * ball.spin * sp * spinK * 12;
            const ay = (ball.vx / sp) * ball.spin * sp * spinK * 12;
            ball.vx += ax * dt;
            ball.vy += ay * dt;
        }
        ball.spin *= Math.exp(-1.9 * dt);
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.z += ball.vz * dt;
        // contato com a mesa
        if (ball.z <= ball.r) {
            ball.z = ball.r;
            if (ball.vz < 0) {
                const bounce = clamp(0.62 * cfg.grassBounce * (1 - 0.35 * wet), 0.15, 0.9);
                ball.vz = -ball.vz * bounce;
                if (ball.vz < 0.12)
                    ball.vz = 0;
                const grip = clamp(cfg.ballFriction * cfg.grassDamping * (1 - 0.4 * wet), 0.4, 3);
                const keep = Math.exp(-grip * dt * 22);
                ball.vx *= keep;
                ball.vy *= keep;
                ball.spin *= 0.86;
            }
            ball.airborne = false;
            const roll = clamp(0.95 * cfg.grassDamping * (1 - 0.42 * wet), 0.25, 2.2);
            const rd = Math.exp(-roll * dt);
            ball.vx *= rd;
            ball.vy *= rd;
        }
        else {
            ball.airborne = true;
        }
        // ── GOL / LINHAS ──
        if (Math.abs(ball.x) > hx - ball.r * 0.4) {
            const side = ball.x > 0 ? 0 : 1; // time 0 ataca o gol +x
            if (inGoalMouth(w, ball.y, ball.z)) {
                ball.vx *= 0.25;
                ball.vy *= 0.25;
                w.locked = true;
                w.events.push({
                    t: "goal",
                    team: side,
                    bodyId: w.lastTouch?.bodyId ?? "",
                    speed: Math.hypot(ball.vx, ball.vy, ball.vz),
                });
            }
            else if (Math.abs(ball.x) > hx + cfg.goalDepth * 0.2) {
                w.locked = true;
                // quem atacava aquele gol é `side`; a posse volta para o adversário de quem tocou por último
                const lastTeam = w.lastTouch?.team ?? side;
                const awarded = lastTeam === 0 ? 1 : 0;
                const kind = lastTeam === side ? "meta" : "escanteio";
                w.events.push({
                    t: "out", kind, team: awarded,
                    x: Math.sign(ball.x) * (hx - 0.08),
                    y: clamp(ball.y, -hy + 0.05, hy - 0.05),
                });
            }
        }
        // travessas / postes
        if (!w.locked && Math.abs(ball.x) > hx - 0.012 && Math.abs(ball.x) < hx + 0.02) {
            for (const py of [-cfg.goalWidth / 2, cfg.goalWidth / 2]) {
                const d = Math.hypot(ball.x - Math.sign(ball.x) * hx, ball.y - py);
                if (d < ball.r + 0.005) {
                    const nx = (ball.x - Math.sign(ball.x) * hx) / d;
                    const ny = (ball.y - py) / d;
                    const vn = ball.vx * nx + ball.vy * ny;
                    if (vn < 0) {
                        ball.vx -= 1.7 * vn * nx;
                        ball.vy -= 1.7 * vn * ny;
                        ball.vz += 0.35;
                        w.events.push({ t: "post", speed: -vn });
                    }
                }
            }
            // travessão
            if (Math.abs(ball.y) < cfg.goalWidth / 2 && Math.abs(ball.z - cfg.goalHeight) < ball.r + 0.004 && ball.vz > 0) {
                ball.vz = -ball.vz * 0.6;
                w.events.push({ t: "post", speed: Math.abs(ball.vz) });
            }
        }
        // laterais / paredes
        if (Math.abs(ball.y) > hy - ball.r) {
            if (cfg.walls) {
                ball.y = Math.sign(ball.y) * (hy - ball.r);
                ball.vy = -ball.vy * cfg.wallRestitution * (1 - 0.2 * wet);
                ball.vx *= 0.96;
                ball.spin *= 0.7;
                w.events.push({ t: "wall" });
            }
            else {
                w.locked = true;
                w.events.push({
                    t: "out", kind: "lateral", x: clamp(ball.x, -hx + 0.1, hx - 0.1),
                    y: Math.sign(ball.y) * (hy - 0.06), team: (w.lastTouch?.team ?? 0) === 0 ? 1 : 0,
                });
            }
        }
        if (cfg.walls && Math.abs(ball.x) > hx - ball.r && !inGoalMouth(w, ball.y, ball.z) && !w.locked) {
            ball.x = Math.sign(ball.x) * (hx - ball.r);
            ball.vx = -ball.vx * cfg.wallRestitution * (1 - 0.2 * wet);
            w.events.push({ t: "wall" });
        }
    }
    // ── BOTÕES ──
    for (const b of w.bodies) {
        if (!b.active)
            continue;
        const fr = b.phys.friction * cfg.grassDamping * (1 - 0.35 * wet);
        const d = Math.exp(-fr * dt);
        b.vel.x *= d;
        b.vel.y *= d;
        b.pos.x += b.vel.x * dt;
        b.pos.y += b.vel.y * dt;
        b.spin *= Math.exp(-3 * dt);
        if (Math.hypot(b.vel.x, b.vel.y) < 0.018) {
            b.vel.x = 0;
            b.vel.y = 0;
        }
        if (b.flash > 0)
            b.flash = Math.max(0, b.flash - dt * 3.4);
        // limites da mesa
        const r = b.phys.radiusM;
        if (b.pos.x < -hx + r) {
            b.pos.x = -hx + r;
            b.vel.x = Math.abs(b.vel.x) * 0.4;
        }
        if (b.pos.x > hx - r) {
            b.pos.x = hx - r;
            b.vel.x = -Math.abs(b.vel.x) * 0.4;
        }
        if (b.pos.y < -hy + r) {
            b.pos.y = -hy + r;
            b.vel.y = Math.abs(b.vel.y) * 0.4;
        }
        if (b.pos.y > hy - r) {
            b.pos.y = hy - r;
            b.vel.y = -Math.abs(b.vel.y) * 0.4;
        }
    }
    // colisões botão × bola
    for (const b of w.bodies) {
        if (!b.active)
            continue;
        resolveButtonBall(w, b, dt);
    }
    // colisões botão × botão (2 passadas para pilhas)
    for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < w.bodies.length; i++) {
            for (let j = i + 1; j < w.bodies.length; j++) {
                const a = w.bodies[i], c = w.bodies[j];
                if (!a.active || !c.active)
                    continue;
                resolveButtonButton(w, a, c);
            }
        }
    }
    w.time += dt;
    void rand;
}
/** Roda N passos sem render (usado pela copa para simular jogos da CPU). */
export function runSteps(w, steps, dt) {
    for (let i = 0; i < steps; i++)
        stepWorld(w, dt);
}
export function cloneWorld(w) {
    return {
        cfg: w.cfg,
        bodies: w.bodies.map((b) => ({
            ...b, pos: { ...b.pos }, vel: { ...b.vel }, home: { ...b.home }, phys: b.phys,
        })),
        ball: { ...w.ball },
        events: [],
        time: w.time,
        lastTouch: w.lastTouch ? { ...w.lastTouch } : null,
        locked: w.locked,
        gkSaves: [w.gkSaves[0], w.gkSaves[1]],
    };
}
/**
 * Predição de trajetória: roda a mesma física em um mundo clonado.
 * É a "assistência de precisão" — quanto maior a precisão do atleta,
 * menor a dispersão e mais a linha coincide com o chute real.
 */
export function predictShot(w, bodyId, dir, power, spin, steps = 200) {
    const sim = cloneWorld(w);
    sim.locked = false;
    const dl = Math.hypot(dir.x, dir.y) || 1;
    const ux = dir.x / dl;
    const uy = dir.y / dl;
    const body = sim.bodies.find((b) => b.id === bodyId);
    if (body) {
        body.pos = { ...body.pos };
        body.vel = { x: 0, y: 0 };
    }
    shoot(sim, bodyId, dir, power, spin, () => 0.5); // sem erro aleatório na predição
    const points = [];
    let goal = false;
    let out = false;
    let apex = sim.ball.z;
    let impactSpeed = 0;
    const startX = sim.ball.x;
    const startY = sim.ball.y;
    let maxLateral = 0;
    const dt = 1 / 120;
    for (let i = 0; i < steps; i++) {
        stepWorld(sim, dt);
        for (const e of sim.events) {
            if (e.t === "goal")
                goal = true;
            if (e.t === "out")
                out = true;
            if (e.t === "touch")
                impactSpeed = Math.max(impactSpeed, e.speed);
        }
        apex = Math.max(apex, sim.ball.z);
        if (i % 3 === 0) {
            points.push({ x: sim.ball.x, y: sim.ball.y, z: sim.ball.z });
            const d = Math.hypot(sim.ball.x - startX, sim.ball.y - startY);
            const straight = Math.abs((sim.ball.x - startX) * -uy + (sim.ball.y - startY) * ux);
            maxLateral = Math.max(maxLateral, Math.min(straight, d));
        }
        if (sim.locked || allStopped(sim))
            break;
    }
    return { points, goal, out, apex, impactSpeed, curve: maxLateral };
}
export function rngFrom(seed) {
    return mulberry(seed);
}
