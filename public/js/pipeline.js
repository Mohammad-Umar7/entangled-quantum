// The Entangled pipeline. runLive() chains four Moth engines on two faces;
// replayDemo() replays a recorded run (real job ids, compressed timings).
import * as api from "./api.js";
import { LIVE_STRENGTHS } from "./engines.js";
import { resized, toBase64, brightnessGrid, loadImage } from "./imageutil.js";

const short = (id) => (id || "").slice(0, 8);

export function wiresFor(strengths) {
  return [
    { key: "teleport", label: "Teleport", sub: "telablur-v1", gates: strengths.map((s) => `θ${s.toFixed(2).replace(/^0/, "")}`) },
    { key: "decohere", label: "Decohere", sub: "tessa-image-v1 · fake_torino", gates: ["A", "B"] },
    { key: "echo", label: "Echo", sub: "retrocausal-echo-v1", gates: ["♪"] },
    { key: "measure", label: "Measure", sub: "coin-toss-v1 · 100 shots", gates: ["M"] },
  ];
}

// Small concurrency gate so polling stays inside Moth's rate limit.
function limiter(n) {
  let active = 0;
  const q = [];
  const next = () => { if (active < n && q.length) { active++; q.shift()(); } };
  return (fn) => new Promise((res, rej) => {
    q.push(() => fn().then(res, rej).finally(() => { active--; next(); }));
    next();
  });
}

export async function runLive({ canvasA, canvasB, names }, circuit, log) {
  const limit = limiter(5);
  log(`entangling |${names[0]}⟩ ⊗ |${names[1]}⟩ on Moth Atlas`, "q");

  // 1. prepare media in the browser
  const a256 = resized(canvasA, 256), b256 = resized(canvasB, 256);
  const a64 = resized(canvasA, 64), b64 = resized(canvasB, 64);
  const melody = window.Melody.fromFaces(brightnessGrid(canvasA), brightnessGrid(canvasB));
  log(`composed melody from faces: ${melody.notes.length} notes`);

  // 2. upload everything as Moth assets
  log("uploading 4 images + melody as Moth assets…");
  const [ida, idb, ida64, idb64, idw] = await Promise.all([
    api.uploadBase64(toBase64(a256), "image/jpeg", "a.jpg"),
    api.uploadBase64(toBase64(b256), "image/jpeg", "b.jpg"),
    api.uploadBase64(toBase64(a64, "image/png"), "image/png", "a64.png"),
    api.uploadBase64(toBase64(b64, "image/png"), "image/png", "b64.png"),
    api.uploadBytes(melody.wav, "audio/wav", "melody.wav"),
  ]);
  log(`assets ready: ${[ida, idb, ida64, idb64, idw].map(short).join(" ")}`, "ok");

  const jobs = [];
  const track = (wire, i, label, engine, params, files) => limit(async () => {
    circuit.gate(wire, i, "running");
    const t0 = performance.now();
    try {
      const r = await api.run(engine, params, files, (id, st) => {
        if (st !== "completed") circuit.gate(wire, i, "running", `${engine} ${short(id)} ${st}`);
      });
      const ms = performance.now() - t0;
      circuit.gate(wire, i, "done", `${engine} job ${r.jobId}`);
      jobs.push({ label, engine, job_id: r.jobId, params: r.params, ms: Math.round(ms) });
      log(`✓ ${label.padEnd(16)} job ${short(r.jobId)}  ${(ms / 1000).toFixed(1)}s`, "ok");
      return r;
    } catch (e) {
      circuit.gate(wire, i, "failed", e.message);
      log(`✗ ${label}: ${e.message}`, "err");
      throw e;
    }
  });

  // longest jobs first
  const tessaA = track("decohere", 0, "tessa A", "tessa-image-v1", { shots: 2048, machine: "fake_torino" }, { image: ida64 });
  const tessaB = track("decohere", 1, "tessa B", "tessa-image-v1", { shots: 2048, machine: "fake_torino" }, { image: idb64 });
  const echo = track("echo", 0, "retrocausal echo", "retrocausal-echo-v1", { bpm: 96, mix: 0.55, depth: 12, n_sites: 8 }, { audio: idw });
  const coin = track("measure", 0, "coin toss ×100", "coin-toss-v1", { shots: 100 });
  const frames = LIVE_STRENGTHS.map((s, i) =>
    track("teleport", i, `teleblur θ=${s}`, "telablur-v1", { strength: s, size: 256 }, { image1: ida, image2: idb })
      .then(async (r) => ({ s, img: await loadImage(r.outputs[0].url) })));

  const [ta, tb, ec, co, ...fr] = await Promise.all([tessaA, tessaB, echo, coin, ...frames]);
  log(`all ${jobs.length} quantum jobs measured`, "ok");
  const wet = ec.outputs.find((o) => o.slot === "result") || ec.outputs[0];
  return {
    live: true,
    names,
    frames: fr.sort((x, y) => x.s - y.s),
    tessa: [ta.outputs[0].url, tb.outputs[0].url],
    melodyUrl: URL.createObjectURL(new Blob([melody.wav], { type: "audio/wav" })),
    echoUrl: wet.url,
    notes: melody.notes,
    coin: { heads: co.result.heads, shots: 100 },
    jobs,
  };
}

export async function replayDemo(manifest, circuit, log, { speed = 6 } = {}) {
  const names = manifest.names;
  log(`replaying a recorded run: |${names[0]}⟩ ⊗ |${names[1]}⟩`, "q");
  log(`recorded ${manifest.created.slice(0, 16).replace("T", " ")} UTC · ${manifest.jobs.length} real Moth jobs · ${(manifest.total_ms / 1000).toFixed(0)}s wall time`);
  const framesP = Promise.all(manifest.frames.map(async (u, i) => ({ s: manifest.strengths[i], img: await loadImage(u) })));
  const wireOf = (j) => (j.engine === "telablur-v1" ? "teleport" : j.engine === "tessa-image-v1" ? "decohere" : j.engine === "retrocausal-echo-v1" ? "echo" : "measure");
  const idx = { teleport: 0, decohere: 0, echo: 0, measure: 0 };
  const order = manifest.jobs.map((j) => {
    const wire = wireOf(j);
    const i = wire === "teleport" ? manifest.strengths.indexOf(j.params.strength) : idx[wire]++;
    return { ...j, wire, i };
  });
  order.forEach((j) => circuit.gate(j.wire, j.i, "running"));
  await Promise.all(order.map((j) => new Promise((r) => setTimeout(() => {
    circuit.gate(j.wire, j.i, "done", `${j.engine} job ${j.job_id}`);
    log(`✓ ${j.label.padEnd(16)} job ${short(j.job_id)}  ${(j.ms / 1000).toFixed(1)}s`, "ok");
    r();
  }, 400 + j.ms / speed))));
  log(`all ${order.length} quantum jobs measured`, "ok");
  return {
    live: false,
    names,
    frames: await framesP,
    tessa: manifest.tessa,
    melodyUrl: manifest.melody,
    echoUrl: manifest.echo,
    notes: manifest.notes,
    coin: manifest.coin,
    jobs: manifest.jobs,
  };
}
