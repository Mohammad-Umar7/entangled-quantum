// GET /api/health  ->  {ok, key}  (never reveals the key itself)
const { send } = require("../lib/http");

module.exports = (req, res) => {
  send(res, 200, { ok: true, key: Boolean(process.env.MOTH_API_KEY), engines: ["telablur-v1", "tessa-image-v1", "retrocausal-echo-v1", "coin-toss-v1"] });
};
