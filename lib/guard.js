// Server-side guard rails for the public proxy.
// Visitors never see the Moth key; they can only run these engines,
// with parameters clamped to cheap, simulator-only settings.

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
};

const TESSA_MACHINES = new Set(["aer", "fake_torino", "fake_fez", "fake_marrakesh"]);

const ENGINES = {
  // Image teleportation: morph image1 into image2 through qubit rotations.
  "telablur-v1": {
    files: ["image1", "image2"],
    params: (p) => ({
      strength: clamp(p.strength, 0, 1, 0.5),
      size: Math.round(clamp(p.size, 32, 256, 256)),
      direction: ["full", "vertical", "horizontal"].includes(p.direction) ? p.direction : "full",
    }),
  },
  // Colour-sphere encoding: every pixel becomes a point on a qubit's sphere.
  "tessa-image-v1": {
    files: ["image"],
    params: (p) => ({
      shots: Math.round(clamp(p.shots, 256, 4096, 2048)),
      machine: TESSA_MACHINES.has(p.machine) ? p.machine : "aer",
    }),
  },
  // Quantum echo: a delay whose taps are measured from a scrambled qubit chain.
  "retrocausal-echo-v1": {
    files: ["audio"],
    params: (p) => ({
      machine: "aer",
      bpm: clamp(p.bpm, 60, 160, 96),
      mix: clamp(p.mix, 0, 1, 0.55),
      depth: Math.round(clamp(p.depth, 2, 16, 12)),
      n_sites: Math.round(clamp(p.n_sites, 2, 12, 8)),
      negative_mode: ["invert", "reverse", "phase"].includes(p.negative_mode) ? p.negative_mode : "invert",
    }),
  },
  // One qubit, measured: used as the "measurement" that collapses the portrait.
  "coin-toss-v1": {
    files: [],
    params: (p) => ({ mode: "emu", shots: Math.round(clamp(p.shots, 1, 128, 100)) }),
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeJob(body) {
  const spec = ENGINES[body && body.engine];
  if (!spec) throw Object.assign(new Error("engine not allowed"), { status: 400 });
  const params = spec.params((body && body.params) || {});
  let inputFiles;
  if (spec.files.length) {
    inputFiles = {};
    for (const slot of spec.files) {
      const id = body.input_files && body.input_files[slot];
      if (id == null) continue;
      if (!UUID.test(String(id))) throw Object.assign(new Error(`bad asset id for ${slot}`), { status: 400 });
      inputFiles[slot] = String(id);
    }
  }
  return { engine: body.engine, params, inputFiles };
}

// Very small in-memory rate limiter (per serverless instance).
const hits = new Map();
function rateLimit(req, { limit = 40, windowMs = 60 * 60 * 1000 } = {}) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= limit) return false;
  list.push(now);
  hits.set(ip, list);
  return true;
}

module.exports = { ENGINES, UUID, sanitizeJob, rateLimit, clamp };
