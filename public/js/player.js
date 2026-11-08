// Superposition player: draws the Teleblur frame sequence on a canvas and
// cross-fades between the two frames nearest to the chosen strength θ.

export function drawAt(ctx, frames, theta, size) {
  if (!frames.length) return;
  let j = frames.findIndex((f) => f.s >= theta);
  if (j <= 0) j = j === 0 ? 0 : frames.length - 1;
  const i = Math.max(0, j - 1);
  const a = frames[i], b = frames[j];
  const w = b.s === a.s ? 1 : (theta - a.s) / (b.s - a.s);
  ctx.imageSmoothingQuality = "high";
  ctx.globalAlpha = 1;
  ctx.drawImage(a.img, 0, 0, size, size);
  ctx.globalAlpha = Math.max(0, Math.min(1, w));
  ctx.drawImage(b.img, 0, 0, size, size);
  ctx.globalAlpha = 1;
}

export class Player {
  constructor(canvas, badge, slider, playBtn) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.badge = badge;
    this.slider = slider;
    this.playBtn = playBtn;
    this.frames = [];
    this.theta = 0;
    this.playing = false;
    this.names = ["A", "B"];
    slider.addEventListener("input", () => { this.stop(); this.set(slider.value / 1000); });
    playBtn.addEventListener("click", () => (this.playing ? this.stop() : this.play()));
  }

  load(frames, names) {
    this.frames = frames;
    this.names = names;
    this.set(0);
  }

  set(theta) {
    this.theta = theta;
    this.slider.value = Math.round(theta * 1000);
    drawAt(this.ctx, this.frames, theta, this.canvas.width);
    const pa = Math.round((1 - theta) * 100);
    this.badge.textContent = `θ = ${theta.toFixed(2)} · ${pa}% ${this.names[0]} · ${100 - pa}% ${this.names[1]}`;
  }

  play() {
    this.playing = true;
    this.playBtn.textContent = "❚❚ Pause";
    const t0 = performance.now() - Math.acos(1 - 2 * this.theta) / Math.PI * 4000;
    const tick = (now) => {
      if (!this.playing) return;
      const phase = ((now - t0) / 4000) * Math.PI;
      this.set((1 - Math.cos(phase)) / 2);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.playBtn.textContent = "▶ Oscillate";
  }
}
