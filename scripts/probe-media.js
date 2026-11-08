// Probe Tessa (64x64, aer vs IBM-calibrated noise) and Retrocausal Echo on a short tone.
require("./env");
const fs = require("fs");
const path = require("path");
const moth = require("../lib/moth");

async function run(name, engine, params, files, outDir) {
  const t0 = Date.now();
  const job = await moth.submitJob(engine, params, files);
  const st = await moth.waitJob(job.job_id);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (st.status !== "completed") return console.log(name, st.status, dt + "s", JSON.stringify(st.error));
  const res = await moth.jobResult(job.job_id);
  console.log(name, dt + "s", JSON.stringify(res, (k, v) => (k === "url" ? "<url>" : v)).slice(0, 400));
  for (const o of res.outputs || []) {
    const buf = Buffer.from(await (await fetch(o.url)).arrayBuffer());
    fs.writeFileSync(path.join(outDir, `${name}_${o.slot}${path.extname(o.filename || "") || ".bin"}`), buf);
  }
}

(async () => {
  const out = "tmp/media"; fs.mkdirSync(out, { recursive: true });
  const img = await moth.uploadAsset(fs.readFileSync("tmp/e64.png"), "e64.png", "image/png");
  const wav = await moth.uploadAsset(fs.readFileSync("tmp/tone.wav"), "tone.wav", "audio/wav");
  await Promise.all([
    run("tessa_aer", "tessa-image-v1", { shots: 2048 }, { image: img }, out),
    run("tessa_torino", "tessa-image-v1", { shots: 2048, machine: "fake_torino" }, { image: img }, out),
    run("echo", "retrocausal-echo-v1", { bpm: 96, mix: 0.55, depth: 12, n_sites: 8 }, { audio: wav }, out),
    run("coin", "coin-toss-v1", { shots: 100, mode: "emu" }, undefined, out),
  ]);
})().catch((e) => { console.error("ERROR", e.message, JSON.stringify(e.body || {})); process.exit(1); });
