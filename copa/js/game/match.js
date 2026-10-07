import { getNation } from "../lib/nations.js";
import { GRASSES } from "../lib/stadiums.js";
import { FIELD, FORMATIONS, TACTICS, mulberry, } from "./attributes.js";
import { allStopped, bodyFromAthlete, createWorld, makeFieldCfg, resetBall, separate, shoot, stepWorld, } from "./physics.js";
export const PHYS_DT = 1 / 240;
const WETNESS = {
    sol: 0, nublado: 0.06, chuva: 0.36, "chuva-forte": 0.64,
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function fieldCfgFrom(settings) {
    const grass = GRASSES.find((g) => g.id === settings.grass) ?? GRASSES[1];
    return makeFieldCfg({
        walls: settings.walls,
        grassDamping: grass.damping,
        grassBounce: grass.bounce,
        wetness: WETNESS[settings.weather],
        ballDrag: 0.42 + WETNESS[settings.weather] * 0.12,
    });
}
function teamPositions(team, formation, tactic, cfg) {
    const shape = FORMATIONS[formation] ?? FORMATIONS["4-3-3"];
    const t = TACTICS[tactic] ?? TACTICS.equilibrada;
    const hx = cfg.length / 2;
    const hy = cfg.width / 2;
    return shape.map((slot) => {
        const fx = clamp(slot.pos[0] + (slot.role === "GOL" ? 0 : t.shift), 0.03, 0.95);
        const dir = team === 0 ? -1 : 1;
        const x = dir * (hx - fx * cfg.length);
        const y = (team === 0 ? 1 : -1) * slot.pos[1] * cfg.width * 0.92;
        return { x, y: clamp(y, -hy + 0.04, hy - 0.04) };
    });
}
export class MatchController {
    constructor(settings, home, away, humanTeam = 0, seed = 20260611) {
        this.phase = "kickoff";
        this.turn = 0;
        this.score = [0, 0];
        this.minute = 0;
        this.half = 1;
        this.feed = [];
        this.selectedId = null;
        this.lastScorer = null;
        this.finished = false;
        this.result = null;
        this.phaseTimer = 0;
        this.runTimer = 0;
        this.shotEvents = [];
        this.shotBody = null;
        this.consecutive = 0;
        this.acc = 0;
        this.feedId = 1;
        this.gkCooldown = 0;
        this.gkY = [0, 0];
        this.settings = settings;
        this.teams = [home, away];
        this.humanTeam = humanTeam;
        this.headless = humanTeam === null;
        this.rng = mulberry(seed);
        this.cfg = fieldCfgFrom(settings);
        const bodies = [];
        [home, away].forEach((team, ti) => {
            const t = ti;
            const homes = teamPositions(t, team.formation, team.tactic, this.cfg);
            team.squad.slice(0, 11).forEach((athlete, i) => {
                if (athlete.role === "GOL" && !settings.gk)
                    return;
                const b = bodyFromAthlete(athlete, t, i, homes[i] ?? { x: 0, y: 0 });
                b.primary = athlete.primary;
                b.secondary = athlete.secondary;
                bodies.push(b);
            });
        });
        this.world = createWorld(this.cfg, bodies, { x: 0, y: 0 });
        this.stats = {
            shots: [0, 0], onTarget: [0, 0], goals: [0, 0], saves: [0, 0],
            posts: [0, 0], walls: [0, 0], touches: [0, 0], scorers: [],
        };
        this.kickoff(0);
        this.push("Bola rolando na mesa! " + getNation(home.nationCode).flag + " × " + getNation(away.nationCode).flag, "info");
    }
    push(text, kind = "info") {
        this.feed.unshift({ id: this.feedId++, text, kind });
        if (this.feed.length > 26)
            this.feed.pop();
    }
    bodiesOf(team) {
        return this.world.bodies.filter((b) => b.team === team);
    }
    kickoff(team) {
        const w = this.world;
        [0, 1].forEach((t) => {
            const homes = teamPositions(t, this.teams[t].formation, this.teams[t].tactic, this.cfg);
            this.bodiesOf(t).forEach((b) => {
                const h = homes[b.slot] ?? { x: 0, y: 0 };
                b.pos = { ...h };
                b.vel = { x: 0, y: 0 };
                b.pendingSpin = 0;
                b.flash = 0;
            });
        });
        resetBall(w, 0, 0);
        // um atleta do time que sai jogando vem até a bola
        const starter = this.pickStarter(team);
        if (starter) {
            const dir = team === 0 ? -1 : 1;
            starter.pos = { x: dir * (starter.phys.radiusM + w.ball.r + 0.004), y: 0.002 };
        }
        this.gkY = [0, 0];
        separate(w);
        this.turn = team;
        this.selectedId = starter?.id ?? null;
        this.phase = "kickoff";
        this.phaseTimer = this.headless ? 0.05 : 1.1;
        this.consecutive = 0;
    }
    pickStarter(team) {
        const field = this.bodiesOf(team).filter((b) => !b.isGK);
        field.sort((a, b) => Math.abs(a.home.x) - Math.abs(b.home.x));
        return field[0];
    }
    /** Chamado pelo cliente a cada frame; acumula passos de tamanho fixo. */
    update(dt) {
        const maxSteps = this.headless ? 4000 : 900;
        this.acc = Math.min(this.acc + dt, this.headless ? 12 : 0.12);
        let steps = 0;
        while (this.acc >= PHYS_DT && steps < maxSteps) {
            this.tick(PHYS_DT);
            this.acc -= PHYS_DT;
            steps++;
        }
        if (steps >= maxSteps)
            this.acc = 0;
    }
    fastForward(maxTicks = 60000) {
        let i = 0;
        while (!this.finished && i < maxTicks) {
            this.tick(PHYS_DT * 4);
            i++;
        }
        if (!this.finished)
            this.endMatch();
        return this.result;
    }
    tick(dt) {
        if (this.finished)
            return;
        const w = this.world;
        this.phaseTimer = Math.max(0, this.phaseTimer - dt);
        this.gkCooldown = Math.max(0, this.gkCooldown - dt);
        const clockRunning = !this.settings.training &&
            (this.phase === "aim" || this.phase === "cpu" || this.phase === "run" || this.phase === "kickoff");
        if (clockRunning) {
            this.minute += dt * (45 / Math.max(8, this.settings.halfSeconds));
            if (this.minute >= 45 * this.settings.halves) {
                this.endMatch();
                return;
            }
            if (this.minute >= 45 && this.half === 1 && this.settings.halves > 1) {
                this.half = 2;
                this.phase = "halftime";
                this.phaseTimer = this.headless ? 0.05 : 2.4;
                this.push("Fim do primeiro tempo. " + this.scoreLine(), "regra");
                w.locked = true;
                return;
            }
        }
        // goleiros são autônomos nos dois lados
        if (this.settings.gk && this.phase !== "goal" && this.phase !== "halftime") {
            this.updateGK(0, dt);
            this.updateGK(1, dt);
        }
        switch (this.phase) {
            case "kickoff":
                if (this.phaseTimer <= 0)
                    this.beginTurn();
                break;
            case "aim":
                break; // espera o humano
            case "cpu":
                if (this.phaseTimer <= 0)
                    this.execCpuShot();
                break;
            case "run": {
                this.runTimer += dt;
                const steps = Math.max(1, Math.round(dt / PHYS_DT));
                for (let i = 0; i < steps; i++) {
                    stepWorld(w, PHYS_DT, this.rng);
                    this.absorbEvents();
                    if (w.locked || this.phase !== "run")
                        break;
                }
                if (this.phase !== "run")
                    break;
                if (allStopped(w) || this.runTimer > 9)
                    this.resolveShot();
                break;
            }
            case "goal":
                if (this.phaseTimer <= 0) {
                    const conceding = this.turn === 0 ? 1 : 0;
                    this.kickoff(conceding);
                }
                break;
            case "restart":
                if (this.phaseTimer <= 0)
                    this.beginTurn();
                break;
            case "halftime":
                if (this.phaseTimer <= 0) {
                    this.minute = 45;
                    this.kickoff(this.half === 1 ? 1 : 0);
                    this.half = 2;
                    this.push("Segundo tempo!", "info");
                }
                break;
            case "fulltime":
                break;
        }
    }
    scoreLine() {
        return `${this.score[0]} × ${this.score[1]}`;
    }
    absorbEvents() {
        const w = this.world;
        for (const e of w.events) {
            this.shotEvents.push(e);
            if (e.t === "goal") {
                const team = e.team;
                this.score[team] += 1;
                this.stats.goals[team] += 1;
                const scorer = w.bodies.find((b) => b.id === (w.lastTouch?.bodyId ?? ""));
                const isOwnGoal = !scorer || scorer.team !== team;
                this.lastScorer = scorer
                    ? { name: scorer.name, shirt: scorer.shirt, team: scorer.team }
                    : null;
                this.stats.scorers.push({
                    team: scorer?.team ?? team,
                    name: scorer?.name ?? "Gol",
                    shirt: scorer?.shirt ?? 0,
                    minute: Math.floor(this.minute),
                });
                this.phase = "goal";
                this.phaseTimer = this.headless ? 0.05 : 2.8;
                this.runTimer = 0;
                this.push(isOwnGoal
                    ? `GOOOL contra! ${this.scoreLine()}`
                    : `GOOOOOL de ${scorer?.name ?? ""} (${scorer?.shirt ?? "-"})! ${this.scoreLine()}`, "gol");
                return;
            }
            if (e.t === "save") {
                this.stats.saves[e.team] += 1;
                this.push(`Defesa do goleiro ${e.team === 0 ? this.teams[0].nationCode : this.teams[1].nationCode}!`, "perigo");
            }
            if (e.t === "post") {
                this.stats.posts[this.turn] += 1;
                this.push("Na trave! A mesa tremeu.", "perigo");
            }
            if (e.t === "wall")
                this.stats.walls[this.turn] += 1;
            if (e.t === "touch")
                this.stats.touches[e.team] += 1;
            if (e.t === "blocked")
                this.push("Travada! Duelo de massa no meio-campo.", "info");
        }
    }
    beginTurn() {
        this.shotEvents = [];
        this.runTimer = 0;
        if (this.humanTeam === this.turn) {
            this.phase = "aim";
            if (!this.selectedId)
                this.selectedId = this.bestBodyFor(this.turn)?.id ?? null;
        }
        else {
            this.phase = "cpu";
            this.phaseTimer = this.headless ? 0.01 : 0.55 + this.rng() * 0.5;
            this.selectedId = null;
        }
    }
    bestBodyFor(team) {
        const w = this.world;
        const attack = team === 0 ? 1 : -1;
        let best;
        let bestScore = -Infinity;
        for (const b of w.bodies) {
            if (b.team !== team || !b.active)
                continue;
            const dx = w.ball.x - b.pos.x;
            const dy = w.ball.y - b.pos.y;
            const dist = Math.hypot(dx, dy);
            const behind = attack * dx; // precisa estar do lado do próprio gol
            let s = -dist * 2.4 + Math.min(behind, 0.08) * 9 - (b.isGK ? 2.4 : 0);
            if (behind < -0.01)
                s -= 0.9;
            if (s > bestScore) {
                bestScore = s;
                best = b;
            }
        }
        return best;
    }
    selectBody(id) {
        const b = this.world.bodies.find((x) => x.id === id);
        if (!b || b.team !== this.humanTeam || this.phase !== "aim")
            return false;
        this.selectedId = id;
        return true;
    }
    autoSelect() {
        if (this.phase !== "aim")
            return;
        this.selectedId = this.bestBodyFor(this.turn)?.id ?? this.selectedId;
    }
    /** O humano solta o arrasto: dir = vetor do peteleco, power 0..1, spin -1..1. */
    playerShoot(dir, power, spin) {
        if (this.phase !== "aim" || this.humanTeam === null)
            return false;
        const id = this.selectedId ?? this.bestBodyFor(this.turn)?.id ?? null;
        if (!id)
            return false;
        this.execShot(id, dir, clamp(power, 0.08, 1), spin);
        return true;
    }
    execShot(id, dir, power, spin) {
        const w = this.world;
        this.shotEvents = [];
        this.runTimer = 0;
        this.shotBody = id;
        this.stats.shots[this.turn] += 1;
        shoot(w, id, dir, power, spin, this.rng);
        this.phase = "run";
        w.locked = false;
        const b = w.bodies.find((x) => x.id === id);
        if (b)
            this.push(`${b.name} (${b.shirt}) — peteleco ${Math.round(power * 100)}%`, "info");
    }
    execCpuShot() {
        const team = this.turn;
        const plan = this.planShot(team);
        if (!plan) {
            this.resolveShot(true);
            return;
        }
        this.selectedId = plan.bodyId;
        this.execShot(plan.bodyId, plan.dir, plan.power, plan.spin);
    }
    planShot(team) {
        const w = this.world;
        const body = this.bestBodyFor(team);
        if (!body)
            return null;
        const attack = team === 0 ? 1 : -1;
        const hx = this.cfg.length / 2;
        const goalX = attack * hx;
        const distBall = Math.abs(goalX - w.ball.x);
        const nation = getNation(this.teams[team].nationCode);
        const aggression = TACTICS[this.teams[team].tactic]?.press ?? 1;
        // alvo: gol, passe para o atleta mais avançado ou avanço territorial
        let target;
        const shootChance = clamp(0.28 + (1 - distBall / this.cfg.length) * 0.75, 0.1, 0.92) * aggression;
        if (this.rng() < shootChance && distBall < this.cfg.length * 0.72) {
            const spread = (this.cfg.goalWidth / 2) * (0.42 + this.rng() * 0.5);
            target = { x: goalX, y: (this.rng() * 2 - 1) * spread };
            this.stats.onTarget[team] += 1;
        }
        else {
            const mates = this.bodiesOf(team).filter((b) => b.id !== body.id && !b.isGK);
            mates.sort((a, b) => attack * (b.pos.x - a.pos.x));
            const mate = mates[0];
            if (mate && this.rng() < 0.5) {
                target = { x: mate.pos.x + attack * 0.05, y: mate.pos.y };
            }
            else {
                target = { x: w.ball.x + attack * (0.25 + this.rng() * 0.35), y: (this.rng() * 2 - 1) * 0.3 };
            }
        }
        const bx = w.ball.x, by = w.ball.y;
        // posiciona o botão atrás da bola em relação ao alvo
        const tdx = target.x - bx;
        const tdy = target.y - by;
        const tlen = Math.hypot(tdx, tdy) || 1;
        const ux = tdx / tlen, uy = tdy / tlen;
        const back = body.phys.radiusM + w.ball.r + 0.004;
        body.pos = {
            x: clamp(bx - ux * back, -hx + body.phys.radiusM, hx - body.phys.radiusM),
            y: clamp(by - uy * back, -this.cfg.width / 2 + body.phys.radiusM, this.cfg.width / 2 - body.phys.radiusM),
        };
        body.vel = { x: 0, y: 0 };
        // força necessária para a bola chegar ao alvo (transferência de impulso pela massa)
        const transfer = (1.6 * body.phys.massKg) / (body.phys.massKg + FIELD.ballMass);
        const neededBallSpeed = tlen * 1.62 + 0.55;
        const neededBodySpeed = neededBallSpeed / Math.max(0.35, transfer);
        const power = clamp(neededBodySpeed / Math.max(0.6, body.phys.maxSpeed), 0.18, 1);
        const angle = Math.abs(Math.atan2(by, goalX - bx));
        const spin = clamp((angle > 0.5 ? -Math.sign(by || 1) : 0) * (0.35 + this.rng() * 0.5), -1, 1) *
            (nation.attrs.precision / 100);
        separate(w);
        return { bodyId: body.id, dir: { x: ux, y: uy }, power, spin };
    }
    resolveShot(forced = false) {
        const w = this.world;
        w.ball.vx = 0;
        w.ball.vy = 0;
        w.ball.vz = 0;
        w.ball.spin = 0;
        const out = this.shotEvents.find((e) => e.t === "out");
        this.runTimer = 0;
        if (out) {
            this.placeRestart(out.kind, out.x, out.y, out.team);
            return;
        }
        const last = w.lastTouch;
        const touched = this.shotEvents.some((e) => e.t === "touch" || e.t === "save");
        let next = this.turn;
        if (!touched || !last || last.team !== this.turn) {
            next = this.turn === 0 ? 1 : 0;
            this.consecutive = 0;
            if (!touched && !forced)
                this.push("Peteleco no vazio — posse trocada.", "regra");
        }
        else {
            this.consecutive += 1;
            if (this.consecutive >= 8) {
                next = this.turn === 0 ? 1 : 0;
                this.consecutive = 0;
                this.push("Oito toques seguidos: posse trocada pela regra.", "regra");
            }
            else {
                this.push("Posse mantida — continua quem tocou por último.", "regra");
            }
        }
        if (this.settings.training)
            next = (this.humanTeam ?? next);
        this.turn = next;
        this.selectedId = null;
        this.phase = "restart";
        this.phaseTimer = this.headless ? 0.02 : 0.35;
        w.locked = false;
        this.nudgeNearest(next);
    }
    nudgeNearest(team) {
        const w = this.world;
        const b = this.bestBodyFor(team);
        if (!b)
            return;
        const dist = Math.hypot(w.ball.x - b.pos.x, w.ball.y - b.pos.y);
        if (dist < b.phys.radiusM + w.ball.r + 0.01)
            return;
        if (dist > 0.12)
            return; // só aproxima se estiver perto (não teletransporta)
        const attack = team === 0 ? 1 : -1;
        const back = b.phys.radiusM + w.ball.r + 0.004;
        b.pos = {
            x: clamp(w.ball.x - attack * back, -this.cfg.length / 2 + b.phys.radiusM, this.cfg.length / 2 - b.phys.radiusM),
            y: clamp(w.ball.y, -this.cfg.width / 2 + b.phys.radiusM, this.cfg.width / 2 - b.phys.radiusM),
        };
        b.vel = { x: 0, y: 0 };
        separate(w);
    }
    placeRestart(kind, x, y, team) {
        const w = this.world;
        const hx = this.cfg.length / 2;
        const hy = this.cfg.width / 2;
        let bx = clamp(x, -hx + 0.06, hx - 0.06);
        let by = clamp(y, -hy + 0.05, hy - 0.05);
        if (kind === "escanteio") {
            bx = Math.sign(bx || 1) * (hx - 0.045);
            by = Math.sign(by || 1) * (hy - 0.045);
        }
        if (kind === "meta") {
            bx = Math.sign(team === 0 ? -1 : 1) * (hx - 0.16);
            by = 0;
        }
        resetBall(w, bx, by);
        if (this.settings.training)
            team = (this.humanTeam ?? team);
        const label = kind === "lateral" ? "Lateral" : kind === "escanteio" ? "Escanteio" : "Tiro de meta";
        this.push(`${label} para ${getNation(this.teams[team].nationCode).name}.`, "regra");
        this.turn = team;
        this.selectedId = null;
        this.phase = "restart";
        this.phaseTimer = this.headless ? 0.02 : 0.75;
        // traz o cobrador para trás da bola
        const b = this.bestBodyFor(team);
        if (b && !b.isGK) {
            const attack = team === 0 ? 1 : -1;
            const back = b.phys.radiusM + w.ball.r + 0.004;
            b.pos = {
                x: clamp(bx - attack * back, -hx + b.phys.radiusM, hx - b.phys.radiusM),
                y: clamp(by, -hy + b.phys.radiusM, hy - b.phys.radiusM),
            };
            b.vel = { x: 0, y: 0 };
        }
        separate(w);
    }
    updateGK(team, dt) {
        const w = this.world;
        const gk = w.bodies.find((b) => b.team === team && b.isGK);
        if (!gk)
            return;
        const hx = this.cfg.length / 2;
        const gw = this.cfg.goalWidth;
        const attack = team === 0 ? -1 : 1; // o gol próprio fica para trás
        const goalX = attack * (hx - 0.028);
        const ballSpeed = Math.hypot(w.ball.vx, w.ball.vy);
        const inBox = team === 0 ? w.ball.x < -hx + 0.34 : w.ball.x > hx - 0.34;
        const aggro = clamp(TACTICS[this.teams[team].tactic]?.gkAggro ?? 0.6, 0.2, 1);
        // reação: o goleiro persegue um alvo filtrado, não a bola instantânea
        const ownHalf = team === 0 ? w.ball.x < 0.05 : w.ball.x > -0.05;
        const desired = ownHalf || inBox
            ? clamp(w.ball.y * 0.95 + w.ball.vy * 0.045, -gw / 2, gw / 2)
            : this.gkY[team] * 0.6;
        const rate = inBox ? 5.2 : 2.3;
        this.gkY[team] += (desired - this.gkY[team]) * (1 - Math.exp(-dt * rate));
        const limit = gw / 2 - gk.phys.radiusM * 0.35;
        let tx = goalX;
        let ty = clamp(this.gkY[team], -limit, limit);
        const distToBall = Math.hypot(w.ball.x - gk.pos.x, w.ball.y - gk.pos.y);
        if (inBox && ballSpeed > 0.7 && distToBall < 0.2 && this.gkCooldown <= 0) {
            // saída / mergulho: intercepta à frente da linha (com erro de leitura)
            tx = attack * (hx - 0.062);
            ty = clamp(w.ball.y + w.ball.vy * 0.035, -gw / 2 - 0.015, gw / 2 + 0.015);
        }
        const dx = tx - gk.pos.x;
        const dy = ty - gk.pos.y;
        const d = Math.hypot(dx, dy);
        const distBall = Math.hypot(w.ball.x - gk.pos.x, w.ball.y - gk.pos.y);
        if (d > 0.003 && distBall > gk.phys.radiusM + w.ball.r + 0.002) {
            const speed = clamp(d * (inBox ? 9 : 4.5) * aggro, 0, gk.phys.maxSpeed * (inBox ? 0.42 : 0.2));
            gk.vel.x = (dx / d) * speed;
            gk.vel.y = (dy / d) * speed;
        }
        else if (distBall <= gk.phys.radiusM + w.ball.r + 0.004 && ballSpeed < 0.25) {
            // bola dominada na área → reinicia o jogo com tiro de meta
            this.gkCooldown = 1.2;
            if (!w.locked && this.phase === "run") {
                this.placeRestart("meta", 0, 0, team);
            }
        }
        void dt;
    }
    endMatch() {
        this.finished = true;
        this.phase = "fulltime";
        this.minute = 45 * this.settings.halves;
        this.result = {
            home: this.score[0],
            away: this.score[1],
            stats: this.stats,
            minute: Math.floor(this.minute),
        };
        this.push(`Fim de jogo: ${this.scoreLine()}`, "regra");
    }
    forceEnd() {
        this.endMatch();
    }
    possession() {
        const t = this.stats.touches[0] + this.stats.touches[1];
        if (!t)
            return [50, 50];
        const a = Math.round((this.stats.touches[0] / t) * 100);
        return [a, 100 - a];
    }
}
/** Simula uma partida inteira sem render — usada pela Copa nos jogos da CPU. */
export function simulateMatch(settings, home, away, seed) {
    const m = new MatchController(settings, home, away, null, seed);
    m.fastForward();
    return {
        home: m.score[0],
        away: m.score[1],
        stats: m.stats,
        possession: m.possession(),
        scorers: m.stats.scorers,
    };
}
