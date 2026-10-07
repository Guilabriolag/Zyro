/**
 * Áudio 100% procedural (WebAudio): nada de asset externo.
 * Torcida = ruído filtrado em loop; peteleco = estalo curto;
 * gol = acorde ascendente + pico de torcida; apito = dois senoides agudos.
 */
export class MatchAudio {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.crowdGain = null;
        this.crowdFilter = null;
        this.noiseSrc = null;
        this.started = false;
        this.enabled = true;
    }
    /** Precisa de gesto do usuário para liberar o AudioContext. */
    start() {
        if (this.started) {
            this.ctx?.resume?.();
            return;
        }
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            const ctx = new Ctx();
            this.ctx = ctx;
            this.started = true;
            const master = ctx.createGain();
            master.gain.value = this.enabled ? 0.5 : 0;
            master.connect(ctx.destination);
            this.master = master;
            const len = Math.floor(ctx.sampleRate * 2.5);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buf.getChannelData(0);
            let last = 0;
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                last = (last + 0.02 * white) / 1.02;
                data[i] = last * 3.2 + white * 0.22;
            }
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            const filter = ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 520;
            filter.Q.value = 0.7;
            const gain = ctx.createGain();
            gain.gain.value = 0.05;
            src.connect(filter);
            filter.connect(gain);
            gain.connect(master);
            src.start();
            this.noiseSrc = src;
            this.crowdFilter = filter;
            this.crowdGain = gain;
        }
        catch (e) {
            console.warn("áudio indisponível", e);
            this.started = false;
        }
    }
    setEnabled(on) {
        this.enabled = on;
        if (this.master && this.ctx) {
            this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.08);
        }
    }
    setHype(h) {
        if (!this.ctx || !this.crowdGain || !this.crowdFilter)
            return;
        const t = this.ctx.currentTime;
        const v = Math.max(0, Math.min(1, h));
        this.crowdGain.gain.setTargetAtTime(0.035 + v * 0.14, t, 0.25);
        this.crowdFilter.frequency.setTargetAtTime(380 + v * 900, t, 0.3);
    }
    env(node, peak, attack, decay) {
        if (!this.ctx || !this.master)
            return null;
        const g = this.ctx.createGain();
        const t = this.ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
        node.connect(g);
        g.connect(this.master);
        return g;
    }
    /** Estalo do peteleco (plástico na mesa). */
    click(power = 0.6) {
        if (!this.ctx || !this.enabled)
            return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(1250 - power * 320, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.06);
        this.env(osc, 0.1 + power * 0.16, 0.004, 0.07);
        osc.start(t);
        osc.stop(t + 0.1);
        const len = Math.floor(this.ctx.sampleRate * 0.05);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++)
            d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const bp = this.ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 2400;
        src.connect(bp);
        this.env(bp, 0.14, 0.002, 0.05);
        src.start(t);
    }
    /** Bola tocada / tabela na parede. */
    thump(intensity = 0.5) {
        if (!this.ctx || !this.enabled)
            return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.09);
        this.env(osc, 0.05 + intensity * 0.12, 0.003, 0.1);
        osc.start(t);
        osc.stop(t + 0.14);
    }
    post() {
        if (!this.ctx || !this.enabled)
            return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1750, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.28);
        this.env(osc, 0.2, 0.004, 0.3);
        osc.start(t);
        osc.stop(t + 0.35);
    }
    goal() {
        if (!this.ctx || !this.enabled)
            return;
        const t = this.ctx.currentTime;
        [261.6, 329.6, 392, 523.2].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(f, t + i * 0.06);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, t + i * 0.06);
            g.gain.linearRampToValueAtTime(0.09, t + i * 0.06 + 0.03);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
            osc.connect(g);
            g.connect(this.master);
            osc.start(t + i * 0.06);
            osc.stop(t + 1.6);
        });
        if (this.crowdGain)
            this.crowdGain.gain.setTargetAtTime(0.3, t, 0.05);
        if (this.crowdFilter)
            this.crowdFilter.frequency.setTargetAtTime(1800, t, 0.05);
    }
    whistle(long = false) {
        if (!this.ctx || !this.enabled)
            return;
        const t = this.ctx.currentTime;
        const dur = long ? 0.7 : 0.22;
        for (const f of [2150, 2680]) {
            const osc = this.ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(f, t);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.075, t + 0.02);
            g.gain.setValueAtTime(0.075, t + dur * 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(g);
            g.connect(this.master);
            osc.start(t);
            osc.stop(t + dur + 0.05);
        }
    }
    dispose() {
        try {
            this.noiseSrc?.stop();
            this.ctx?.close();
        }
        catch {
            /* ignore */
        }
        this.ctx = null;
        this.started = false;
    }
}
