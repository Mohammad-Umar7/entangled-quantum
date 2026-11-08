// Probe: upload two images, run Teleblur + Tessa, report timings and outputs.
require("./env");
const fs = require("fs");
const path = require("path");
const moth = require("../lib/moth");

async function timed(label, fn) {
  const t0 = Date.now();
  const out = await fn();
  console.log(`${label}: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return out;
}

(async () => {
  const [aPath, bPath] = process.argv.slice(2);
  const a = await timed("upload a", () => moth.uploadAsset(fs.readFileSync(aPath), path.basename(aPath), "image/png"));
  const b = await timed("upload b", () => moth.uploadAsset(fs.readFileSync(bPath), path.basename(bPath), "image/png"));

  const jobs = {
    teleblur: await moth.submitJob("telablur-v1", { strength: 0.5, size: 256 }, { image1: a, image2: b }),
    tessa: await moth.submitJob("tessa-image-v1", { shots: 1024 }, { image: a }),
    coin: await moth.submitJob("coin-toss-v1", { shots: 16 }),
  };
  console.log("submitted", Object.fromEntries(Object.entries(jobs).map(([k, v]) => [k, v.job_id])));

  await Promise.all(Object.entries(jobs).map(async ([name, j]) => {
    const st = await timed(`job ${name}`, () => moth.waitJob(j.job_id));
    if (st.status !== "completed") { console.log(name, st.status, JSON.stringify(st.error)); return; }
    const res = await moth.jobResult(j.job_id);
    const summary = JSON.stringify(res, (k, v) => (k === "url" ? String(v).split("?")[0] : v)).slice(0, 600);
    console.log(name, "result:", summary);
    for (const out of res.outputs || []) {
      const buf = Buffer.from(await (await fetch(out.url)).arrayBuffer());
      const file = path.join("tmp", `${name}_${out.slot}${path.extname(out.filename || "") || ".bin"}`);
      fs.writeFileSync(file, buf);
      console.log("  saved", file, buf.length, "bytes");
    }
  }));
})().catch((e) => { console.error("ERROR", e.message, JSON.stringify(e.body || {})); process.exit(1); });
