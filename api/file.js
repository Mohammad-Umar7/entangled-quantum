// GET /api/file?id=<job_id>&slot=<slot>  ->  the output file bytes
// Only job ids are accepted (never arbitrary URLs), so this cannot be used
// as an open proxy.
const moth = require("../lib/moth");
const { send, fail } = require("../lib/http");
const { UUID } = require("../lib/guard");

module.exports = async (req, res) => {
  try {
    const id = String((req.query && req.query.id) || "");
    const slot = String((req.query && req.query.slot) || "result");
    if (!UUID.test(id)) return send(res, 400, { error: "bad job id" });
    const r = await moth.jobResult(id);
    const out = (r.outputs || []).find((o) => o.slot === slot);
    if (!out) return send(res, 404, { error: "no such output" });
    const upstream = await fetch(out.url);
    if (!upstream.ok) return send(res, 502, { error: "output download failed" });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = 200;
    res.setHeader("Content-Type", out.content_type || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.end(buf);
  } catch (err) {
    fail(res, err);
  }
};
