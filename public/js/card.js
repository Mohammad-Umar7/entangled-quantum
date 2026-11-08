// Measurement: animates the collapse, then renders a 1080x1350 share card.
// Also records a short clip (morph + quantum echo) with MediaRecorder.
import { drawAt } from "./player.js";

const W = 1080, H = 1350;

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function background(g) {
  g.fillStyle = "#07060b";
  g.fillRect(0, 0, W, H);
  const r1 = g.createRadialGradient(150, 120, 0, 150, 120, 700);
  r1.addColorStop(0, "rgba(255,181,71,0.22)"); r1.addColorStop(1, "rgba(255,181,71,0)");
  g.fillStyle = r1; g.fillRect(0, 0, W, H);
  const r2 = g.createRadialGradient(950, 1250, 0, 950, 1250, 800);
  r2.addColorStop(0, "rgba(95,212,255,0.2)"); r2.addColorStop(1, "rgba(95,212,255,0)");
  g.fillStyle = r2; g.fillRect(0, 0, W, H);
}

function iri(g, x0, x1) {
  const grd = g.createLinearGradient(x0, 0, x1, 0);
  ["#ffb547", "#ff6bd6", "#b38cff", "#5fd4ff", "#57e3a1"].forEach((c, i) => grd.addColorStop(i / 4, c));
  return grd;
}

// Draw the portrait area (square) with the frame at strength theta.
function portrait(g, frames, theta) {
  const x = 140, y = 200, s = 800;
  g.save();
  roundRect(g, x, y, s, s, 36);
  g.clip();
  g.translate(x, y);
  drawAt(g, frames, theta, s);
  g.restore();
  g.lineWidth = 6;
  g.strokeStyle = iri(g, x, x + s);
  roundRect(g, x, y, s, s, 36);
  g.stroke();
}

export function drawCard(canvas, run, theta, { collapsed = false } = {}) {
  const g = canvas.getContext("2d");
  const [nA, nB] = run.names;
  background(g);
  g.fillStyle = "#f1eefb";
  g.font = "700 64px Space Grotesk, sans-serif";
  g.fillText("Entangled", 90, 120);
  g.font = "500 30px JetBrains Mono, monospace";
  g.fillStyle = "#a49fb8";
  g.fillText(`|${nA}⟩ ⊗ |${nB}⟩`, 90, 168);
  portrait(g, run.frames, theta);

  // the teleportation path: 7 small frames from A to B
  const strip = [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1];
  const sw = 100, gap = (900 - strip.length * sw) / (strip.length - 1);
  strip.forEach((s, i) => {
    const x = 90 + i * (sw + gap), y = 1030;
    g.save();
    roundRect(g, x, y, sw, sw, 12);
    g.clip();
    g.translate(x, y);
    drawAt(g, run.frames, s, sw);
    g.restore();
  });

  // probability bar from the 100 shots
  const pA = run.coin.heads / run.coin.shots;
  const bx = 90, by = 1150, bw = 900, bh = 14;
  g.fillStyle = "#ffb547"; roundRect(g, bx, by, bw * pA, bh, 7); g.fill();
  g.fillStyle = "#5fd4ff"; roundRect(g, bx + bw * pA, by, bw * (1 - pA), bh, 7); g.fill();

  g.font = "700 50px Space Grotesk, sans-serif";
  if (collapsed) {
    const win = theta < 0.5 ? nA : nB;
    g.fillStyle = theta < 0.5 ? "#ffb547" : "#5fd4ff";
    g.fillText(`Measured: |${win}⟩`, 90, 1232);
    g.font = "400 25px JetBrains Mono, monospace";
    g.fillStyle = "#a49fb8";
    g.fillText(`${run.coin.heads} × |${nA}⟩  ·  ${run.coin.shots - run.coin.heads} × |${nB}⟩  in ${run.coin.shots} shots of one qubit`, 90, 1276);
  } else {
    g.fillStyle = "#b38cff";
    g.fillText("superposition…", 90, 1232);
    g.font = "400 25px JetBrains Mono, monospace";
    g.fillStyle = "#a49fb8";
    g.fillText(`${Math.round(pA * 100)}% |${nA}⟩  ·  ${100 - Math.round(pA * 100)}% |${nB}⟩`, 90, 1276);
  }
  g.font = "400 21px JetBrains Mono, monospace";
  g.fillStyle = "#6f6a85";
  g.fillText("Teleblur · Tessa · Retrocausal Echo · Coin Toss  —  Moth Atlas", 90, 1318);
  g.textAlign = "right";
  g.fillStyle = "#a49fb8";
  g.fillText("entangled-quantum.vercel.app", 990, 120);
  g.textAlign = "left";
}

// Collapse animation: flicker through random superposed states, then settle.
export function animateCollapse(canvas, run, target, onDone) {
  const t0 = performance.now(), dur = 2200;
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    if (p < 1) {
      // random jumps that narrow towards the measured value
      const spread = (1 - p) ** 2;
      const theta = Math.max(0, Math.min(1, target + (Math.random() - 0.5) * 2 * spread));
      drawCard(canvas, run, theta);
      requestAnimationFrame(tick);
    } else {
      drawCard(canvas, run, target, { collapsed: true });
      onDone && onDone();
    }
  };
  requestAnimationFrame(tick);
}

export function downloadCanvas(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, "image/png");
}

// Record ~8 s: oscillate between the two faces, then collapse, with the echo.
export async function recordClip(canvas, run, target, audioStream, onProgress) {
  const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...(audioStream ? audioStream.getAudioTracks() : [])]);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start(250);
  const total = 8000, t0 = performance.now();
  await new Promise((resolve) => {
    const tick = (now) => {
      const t = now - t0;
      onProgress && onProgress(Math.min(1, t / total));
      if (t < 5500) {
        drawCard(canvas, run, (1 - Math.cos((t / 2750) * Math.PI)) / 2);
      } else if (t < 6500) {
        const spread = (1 - (t - 5500) / 1000) ** 2;
        drawCard(canvas, run, Math.max(0, Math.min(1, target + (Math.random() - 0.5) * 2 * spread)));
      } else {
        drawCard(canvas, run, target, { collapsed: true });
      }
      if (t < total) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await done;
  const blob = new Blob(chunks, { type: "video/webm" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `entangled-${run.names.join("-").toLowerCase()}.webm`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
