// Minimal Moth Atlas API client (Node 18+, uses global fetch).
// Shared by the Vercel functions in /api and the scripts in /scripts.

const API = "https://api.mothquantum.com/api/v1";

function key() {
  const k = process.env.MOTH_API_KEY;
  if (!k) throw new Error("MOTH_API_KEY is not set");
  return k;
}

function headers(extra = {}) {
  return { Authorization: `Bearer ${key()}`, ...extra };
}

async function asJson(res, what) {
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`${what} failed: ${res.status} ${body.title || ""} ${body.detail || ""}`.trim());
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// Upload bytes as an asset: create -> PUT to presigned URL -> complete.
async function uploadAsset(bytes, filename, contentType) {
  const created = await asJson(await fetch(`${API}/assets`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ filename, content_type: contentType, size_bytes: bytes.length }),
  }), "create asset");
  const put = await fetch(created.upload.url, {
    method: created.upload.method || "PUT",
    headers: created.upload.headers || { "Content-Type": contentType },
    body: bytes,
  });
  if (!put.ok) throw new Error(`asset upload failed: ${put.status}`);
  await asJson(await fetch(`${API}/assets/${created.asset_id}/complete`, {
    method: "POST", headers: headers(),
  }), "complete asset");
  return created.asset_id;
}

async function submitJob(engine, params = {}, inputFiles) {
  const body = { params };
  if (inputFiles) body.input_files = inputFiles;
  return asJson(await fetch(`${API}/engines/${engine}/process`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  }), `submit ${engine}`);
}

async function jobStatus(jobId) {
  return asJson(await fetch(`${API}/jobs/${jobId}/status`, { headers: headers() }), "job status");
}

async function jobResult(jobId) {
  return asJson(await fetch(`${API}/jobs/${jobId}/result`, { headers: headers() }), "job result");
}

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

async function waitJob(jobId, { intervalMs = 1500, timeoutMs = 300000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const st = await jobStatus(jobId);
    if (TERMINAL.has(st.status)) return st;
    if (Date.now() - t0 > timeoutMs) throw new Error(`job ${jobId} timed out`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

module.exports = { API, uploadAsset, submitJob, jobStatus, jobResult, waitJob, TERMINAL };
