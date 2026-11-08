// GET /api/status?id=<job_id>  ->  {status, error?}
const moth = require("../lib/moth");
const { send, fail } = require("../lib/http");
const { UUID } = require("../lib/guard");

module.exports = async (req, res) => {
  try {
    const id = String((req.query && req.query.id) || "");
    if (!UUID.test(id)) return send(res, 400, { error: "bad job id" });
    const st = await moth.jobStatus(id);
    send(res, 200, { status: st.status, error: st.error || null });
  } catch (err) {
    fail(res, err);
  }
};
