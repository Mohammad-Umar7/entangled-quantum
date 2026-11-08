// GET /api/result?id=<job_id>  ->  {result?, outputs: [{slot, content_type, size_bytes, url}]}
// Output URLs are rewritten to our own /api/file proxy so the browser can
// read pixels and audio without cross-origin trouble.
const moth = require("../lib/moth");
const { send, fail } = require("../lib/http");
const { UUID } = require("../lib/guard");

module.exports = async (req, res) => {
  try {
    const id = String((req.query && req.query.id) || "");
    if (!UUID.test(id)) return send(res, 400, { error: "bad job id" });
    const r = await moth.jobResult(id);
    const outputs = (r.outputs || []).map((o) => ({
      slot: o.slot,
      content_type: o.content_type,
      size_bytes: o.size_bytes,
      url: `/api/file?id=${id}&slot=${encodeURIComponent(o.slot)}`,
    }));
    send(res, 200, { result: r.result || null, outputs });
  } catch (err) {
    fail(res, err);
  }
};
