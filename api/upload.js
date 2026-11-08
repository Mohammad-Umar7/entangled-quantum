// POST /api/upload  {filename, contentType, data: base64}  ->  {asset_id}
const moth = require("../lib/moth");
const { send, fail, readJson } = require("../lib/http");
const { rateLimit } = require("../lib/guard");

const TYPES = new Set(["image/png", "image/jpeg", "image/webp", "audio/wav"]);
const MAX_BYTES = 1.5 * 1024 * 1024;

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });
    if (!rateLimit(req, { limit: 60 })) return send(res, 429, { error: "Too many uploads, try again later." });
    const body = await readJson(req);
    if (!TYPES.has(body.contentType)) return send(res, 400, { error: "unsupported content type" });
    const bytes = Buffer.from(String(body.data || ""), "base64");
    if (!bytes.length || bytes.length > MAX_BYTES) return send(res, 400, { error: "file empty or too large" });
    const name = String(body.filename || "upload").replace(/[^\w.-]/g, "_").slice(0, 60);
    const assetId = await moth.uploadAsset(bytes, name, body.contentType);
    send(res, 200, { asset_id: assetId });
  } catch (err) {
    fail(res, err);
  }
};
