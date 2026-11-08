// Plays the dry melody and the quantum echo, draws both waveforms with a
// moving playhead, and exposes a MediaStream for clip recording.

export class AudioDeck {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext("2d");
    this.buffers = {};
    this.source = null;
  }

  ensureContext() {
    if (!this.ac) {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.out = this.ac.createGain();
      this.out.connect(this.ac.destination);
      this.streamDest = this.ac.createMediaStreamDestination();
      this.out.connect(this.streamDest);
    }
    return this.ac;
  }

  async load(dryUrl, wetUrl) {
    const ac = this.ensureContext();
    const get = async (u) => ac.decodeAudioData(await (await fetch(u)).arrayBuffer());
    const [dry, wet] = await Promise.all([get(dryUrl), get(wetUrl)]);
    this.buffers = { dry, wet };
    this.gains = { dry: this.normGain(dry, 0.7), wet: this.normGain(wet, 0.9) };
    this.draw(0, null);
  }

  normGain(buf, target) {
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i += 7) peak = Math.max(peak, Math.abs(d[i]));
    }
    return peak ? Math.min(12, target / peak) : 1;
  }

  play(which = "wet", onEnd) {
    const ac = this.ensureContext();
    if (ac.state === "suspended") ac.resume();
    this.stop();
    const buf = this.buffers[which];
    if (!buf) return;
    const src = ac.createBufferSource();
    const g = ac.createGain();
    g.gain.value = this.gains[which];
    src.buffer = buf;
    src.connect(g).connect(this.out);
    src.start();
    this.source = src;
    const t0 = ac.currentTime;
    const tick = () => {
      if (this.source !== src) return;
      const p = (ac.currentTime - t0) / buf.duration;
      this.draw(Math.min(1, p), which);
      if (p < 1) this.raf = requestAnimationFrame(tick);
    };
    tick();
    src.onended = () => { if (this.source === src) { this.source = null; this.draw(0, null); onEnd && onEnd(); } };
  }

  stop() {
    if (this.source) { try { this.source.stop(); } catch {} this.source = null; }
    cancelAnimationFrame(this.raf);
  }

  stream() { this.ensureContext(); return this.streamDest.stream; }

  draw(progress, active) {
    const { canvas: c, ctx2d: g } = this;
    const W = (c.width = c.clientWidth * (window.devicePixelRatio || 1) || 640);
    const H = (c.height = c.clientHeight * (window.devicePixelRatio || 1) || 140);
    g.clearRect(0, 0, W, H);
    const lane = (buf, y0, y1, color, gain) => {
      if (!buf) return;
      const d = buf.getChannelData(0);
      const step = Math.max(1, Math.floor(d.length / W));
      const mid = (y0 + y1) / 2, amp = (y1 - y0) / 2;
      g.fillStyle = color;
      for (let x = 0; x < W; x++) {
        let m = 0;
        for (let i = x * step; i < (x + 1) * step && i < d.length; i += 4) m = Math.max(m, Math.abs(d[i]));
        const hgt = Math.max(1, Math.min(1, m * gain) * amp);
        g.fillRect(x, mid - hgt, 1, hgt * 2);
      }
    };
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "#ffb547"); grad.addColorStop(0.5, "#b38cff"); grad.addColorStop(1, "#5fd4ff");
    lane(this.buffers.dry, 6, H * 0.36, active === "dry" ? "#f1eefb" : "rgba(241,238,251,0.35)", this.gains?.dry || 1);
    lane(this.buffers.wet, H * 0.42, H - 6, active === "wet" ? grad : "rgba(179,140,255,0.55)", this.gains?.wet || 1);
    g.fillStyle = "rgba(164,159,184,0.8)";
    g.font = `${Math.round(H * 0.09)}px JetBrains Mono, monospace`;
    g.fillText("melody", 8, H * 0.12);
    g.fillText("quantum echo", 8, H * 0.52);
    if (active) {
      g.fillStyle = "#fff";
      g.fillRect(progress * W, 0, 2, H);
    }
  }
}
