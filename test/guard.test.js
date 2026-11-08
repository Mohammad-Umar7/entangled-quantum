// Guard rails for the public proxy: only whitelisted engines, clamped params.
const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeJob, rateLimit } = require("../lib/guard");

const ID = "9f8e7d6c-5b4a-4d21-8abc-def012345678";

test("rejects engines outside the whitelist", () => {
  assert.throws(() => sanitizeJob({ engine: "comet-qrng-v1" }), /engine not allowed/);
  assert.throws(() => sanitizeJob({}), /engine not allowed/);
});

test("clamps Teleblur strength and size", () => {
  const j = sanitizeJob({ engine: "telablur-v1", params: { strength: 7, size: 4096 }, input_files: { image1: ID, image2: ID } });
  assert.equal(j.params.strength, 1);
  assert.equal(j.params.size, 256);
  assert.equal(j.params.direction, "full");
});

test("never lets Tessa submit to real QPU hardware", () => {
  const j = sanitizeJob({ engine: "tessa-image-v1", params: { machine: "least_busy", shots: 1e9 }, input_files: { image: ID } });
  assert.equal(j.params.machine, "aer");
  assert.equal(j.params.shots, 4096);
  assert.equal(sanitizeJob({ engine: "tessa-image-v1", params: { machine: "fake_torino" } }).params.machine, "fake_torino");
});

test("forces the echo onto the simulator", () => {
  const j = sanitizeJob({ engine: "retrocausal-echo-v1", params: { machine: "ibm_fez", via: "direct", n_sites: 156 } });
  assert.equal(j.params.machine, "aer");
  assert.equal(j.params.n_sites, 12);
  assert.equal("via" in j.params, false);
});

test("coin toss stays on the emulator with at most 128 shots", () => {
  const j = sanitizeJob({ engine: "coin-toss-v1", params: { mode: "qpu", shots: 100000 } });
  assert.deepEqual(j.params, { mode: "emu", shots: 128 });
});

test("rejects asset ids that are not UUIDs", () => {
  assert.throws(() => sanitizeJob({ engine: "tessa-image-v1", input_files: { image: "../../etc/passwd" } }), /bad asset id/);
});

test("drops unknown file slots", () => {
  const j = sanitizeJob({ engine: "tessa-image-v1", input_files: { image: ID, evil: ID } });
  assert.deepEqual(Object.keys(j.inputFiles), ["image"]);
});

test("rate limiter blocks after the limit per IP", () => {
  const req = { headers: { "x-forwarded-for": "203.0.113.9" }, socket: {} };
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(req, { limit: 3 }), true);
  assert.equal(rateLimit(req, { limit: 3 }), false);
  const other = { headers: { "x-forwarded-for": "203.0.113.10" }, socket: {} };
  assert.equal(rateLimit(other, { limit: 3 }), true);
});
