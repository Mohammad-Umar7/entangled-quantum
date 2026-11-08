// POST /api/job  {engine, params, input_files}  ->  {job_id, engine, params}
const moth = require("../lib/moth");
const { send, fail, readJson } = require("../lib/http");
const { sanitizeJob, rateLimit } = require("../lib/guard");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });
    if (!rateLimit(req, { limit: 80 })) return send(res, 429, { error: "Quantum budget for this hour is used up. Try the Einstein × Bohr demo." });
    const { engine, params, inputFiles } = sanitizeJob(await readJson(req));
    const job = await moth.submitJob(engine, params, inputFiles);
    send(res, 200, { job_id: job.job_id, engine, params });
  } catch (err) {
    fail(res, err);
  }
};
