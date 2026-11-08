// Run the full Entangled pipeline once on two portraits and save every
// output (plus job ids and timings) to public/demo/, so the website can
// replay a real recorded quantum run instantly without spending credits.
//
//   node scripts/bake-demo.js public/demo/einstein.jpg public/demo/bohr.jpg Einstein Bohr
require("./env");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const moth = require("../lib/moth");
const Melody = require("../public/js/melody.js");

const OUT = path.join(__dirname, "..", "public", "demo");
const STRENGTHS = [0, 0.01, 0.03, 0.06, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.94, 0.97, 0.99, 1];

const ff = (args) => execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...args]);
const gray8 = (file) => [...execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, "-vf", "scale=4:2,format=gray", "-f", "rawvideo", "-"])];

// At most 6 jobs in flight, so polling stays well inside the 300 req/min limit.
let slots = 6;
const queue = [];
const acquire = () => (slots > 0 ? (slots--, Promise.resolve()) : new Promise((r) => queue.push(r)));
const release = () => (queue.length ? queue.shift()() : slots++);

async function job(label, engine, params, files, log) {
  await acquire();
  try { return await jobInner(label, engine, params, files, log); } finally { release(); }
}

async function jobInner(label, engine, params, files, log) {
  const t0 = Date.now();
  const sub = await moth.submitJob(engine, params, files);
  const st = await moth.waitJob(sub.job_id);
  const ms = Date.now() - t0;
  if (st.status !== "completed") throw new Error(`${label} ${st.status}: ${JSON.stringify(st.error)}`);
  const res = await moth.jobResult(sub.job_id);
  log.push({ label, engine, job_id: sub.job_id, params, ms });
  console.log(`${label.padEnd(18)} ${(ms / 1000).toFixed(1)}s ${sub.job_id}`);
  return res;
}

async function save(res, slot, file) {
  const o = res.outputs.find((x) => x.slot === slot);
  fs.writeFileSync(path.join(OUT, file), Buffer.from(await (await fetch(o.url)).arrayBuffer()));
}

(async () => {
  const [aPath, bPath, nameA = "A", nameB = "B"] = process.argv.slice(2);
  fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
  const tmp = path.join(__dirname, "..", "tmp");
  fs.mkdirSync(tmp, { recursive: true });
  ff(["-i", aPath, "-vf", "scale=256:256", path.join(tmp, "a256.jpg")]);
  ff(["-i", bPath, "-vf", "scale=256:256", path.join(tmp, "b256.jpg")]);
  ff(["-i", aPath, "-vf", "scale=64:64", path.join(tmp, "a64.png")]);
  ff(["-i", bPath, "-vf", "scale=64:64", path.join(tmp, "b64.png")]);

  const log = [];
  const up = (f, t) => moth.uploadAsset(fs.readFileSync(path.join(tmp, f)), f, t);
  const [a256, b256, a64, b64] = await Promise.all([
    up("a256.jpg", "image/jpeg"), up("b256.jpg", "image/jpeg"), up("a64.png", "image/png"), up("b64.png", "image/png"),
  ]);

  const melody = Melody.fromFaces(gray8(aPath), gray8(bPath));
  fs.writeFileSync(path.join(OUT, "melody.wav"), melody.wav);
  const wavId = await moth.uploadAsset(Buffer.from(melody.wav), "melody.wav", "audio/wav");

  const t0 = Date.now();
  const frames = STRENGTHS.map((s, i) => job(`teleblur ${s}`, "telablur-v1", { strength: s, size: 256 }, { image1: a256, image2: b256 }, log)
    .then((r) => save(r, "result", `frames/f${String(i).padStart(2, "0")}.jpg`)));
  const tessaA = job("tessa A", "tessa-image-v1", { shots: 2048, machine: "fake_torino" }, { image: a64 }, log).then((r) => save(r, "result", "tessa_a.png"));
  const tessaB = job("tessa B", "tessa-image-v1", { shots: 2048, machine: "fake_torino" }, { image: b64 }, log).then((r) => save(r, "result", "tessa_b.png"));
  const echo = job("retrocausal echo", "retrocausal-echo-v1", { machine: "aer", bpm: 96, mix: 0.55, depth: 12, n_sites: 8 }, { audio: wavId }, log)
    .then((r) => save(r, "result", "echo.wav"));
  const coin = job("coin toss", "coin-toss-v1", { mode: "emu", shots: 100 }, undefined, log);
  const [coinRes] = await Promise.all([coin, tessaA, tessaB, echo, ...frames]);

  const manifest = {
    names: [nameA, nameB],
    created: new Date().toISOString(),
    total_ms: Date.now() - t0,
    strengths: STRENGTHS,
    frames: STRENGTHS.map((_, i) => `demo/frames/f${String(i).padStart(2, "0")}.jpg`),
    tessa: ["demo/tessa_a.png", "demo/tessa_b.png"],
    tessa_machine: "fake_torino",
    melody: "demo/melody.wav",
    notes: melody.notes,
    echo: "demo/echo.wav",
    coin: { heads: coinRes.result.heads, shots: 100 },
    portraits: ["demo/" + path.basename(aPath), "demo/" + path.basename(bPath)],
    jobs: log,
  };
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("done in", (manifest.total_ms / 1000).toFixed(1) + "s", "coin", manifest.coin);
})().catch((e) => { console.error("ERROR", e.message, JSON.stringify(e.body || {})); process.exit(1); });
