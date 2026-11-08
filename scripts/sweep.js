// Sweep Teleblur strength on two portraits to see how the morph evolves.
require("./env");
const fs = require("fs");
const path = require("path");
const moth = require("../lib/moth");

(async () => {
  const [aPath, bPath, outDir, ...rest] = process.argv.slice(2);
  const strengths = rest.length ? rest.map(Number) : [0.1, 0.3, 0.5, 0.7, 0.9, 1.0];
  fs.mkdirSync(outDir, { recursive: true });
  const a = await moth.uploadAsset(fs.readFileSync(aPath), path.basename(aPath), "image/jpeg");
  const b = await moth.uploadAsset(fs.readFileSync(bPath), path.basename(bPath), "image/jpeg");
  await Promise.all(strengths.map(async (s) => {
    const t0 = Date.now();
    const job = await moth.submitJob("telablur-v1", { strength: s, size: 256 }, { image1: a, image2: b });
    const st = await moth.waitJob(job.job_id);
    if (st.status !== "completed") return console.log(s, st.status, JSON.stringify(st.error));
    const res = await moth.jobResult(job.job_id);
    const buf = Buffer.from(await (await fetch(res.outputs[0].url)).arrayBuffer());
    fs.writeFileSync(path.join(outDir, `s${String(Math.round(s * 100)).padStart(3, "0")}.png`), buf);
    console.log(`strength ${s}: ${((Date.now() - t0) / 1000).toFixed(1)}s ${buf.length}B`);
  }));
})().catch((e) => { console.error("ERROR", e.message, JSON.stringify(e.body || {})); process.exit(1); });
