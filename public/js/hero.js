// Hero orb: loops the recorded Einstein -> Bohr teleportation frames.
import { loadImage } from "./imageutil.js";
import { drawAt } from "./player.js";

export async function startHero(canvas, manifest) {
  const ctx = canvas.getContext("2d");
  const frames = await Promise.all(manifest.frames.map(async (u, i) => ({ s: manifest.strengths[i], img: await loadImage(u) })));
  const size = canvas.width;
  const t0 = performance.now();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const draw = (now) => {
    // hold on each face, sweep through the superposition in between
    const t = ((now - t0) / 1000) % 8;
    const ease = (x) => (1 - Math.cos(Math.PI * x)) / 2;
    const theta = t < 1.2 ? 0 : t < 4 ? ease((t - 1.2) / 2.8) : t < 5.2 ? 1 : ease(1 - (t - 5.2) / 2.8);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    drawAt(ctx, frames, theta, size);
    ctx.restore();
    if (!reduce) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  return frames;
}
