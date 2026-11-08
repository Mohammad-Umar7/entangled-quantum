// Browser client for our /api proxy (the Moth key never reaches the browser).

async function call(path, opts = {}, tries = 3) {
  for (let i = 0; ; i++) {
    const res = await fetch(path, opts);
    if (res.ok) return res.json();
    const body = await res.json().catch(() => ({}));
    const retryable = res.status === 429 && /rate/i.test(body.error || "") || res.status >= 500;
    if (!retryable || i >= tries - 1) throw new Error(body.error || `request failed (${res.status})`);
    await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
}

export function uploadBase64(data, contentType, filename) {
  return call("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, contentType, filename }),
  }).then((r) => r.asset_id);
}

export function uploadBytes(bytes, contentType, filename) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return uploadBase64(btoa(bin), contentType, filename);
}

export function submit(engine, params, inputFiles) {
  return call("/api/job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ engine, params, input_files: inputFiles }),
  });
}

export const status = (id) => call(`/api/status?id=${id}`);
export const result = (id) => call(`/api/result?id=${id}`);

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export async function waitFor(id, { interval = 1500, timeout = 240000, onTick } = {}) {
  const t0 = performance.now();
  for (;;) {
    const st = await status(id);
    onTick && onTick(st.status, performance.now() - t0);
    if (TERMINAL.has(st.status)) {
      if (st.status !== "completed") throw new Error((st.error && st.error.message) || `job ${st.status}`);
      return result(id);
    }
    if (performance.now() - t0 > timeout) throw new Error("quantum job timed out");
    await new Promise((r) => setTimeout(r, interval));
  }
}

// Submit + wait in one go.
export async function run(engine, params, inputFiles, onTick) {
  const job = await submit(engine, params, inputFiles);
  const res = await waitFor(job.job_id, { onTick: (s, t) => onTick && onTick(job.job_id, s, t) });
  return { jobId: job.job_id, params: job.params, ...res };
}
