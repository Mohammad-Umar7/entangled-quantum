// Renders the four engine "wires" as a quantum-circuit-like diagram and lets
// the pipeline light up individual gates (jobs) as they run.

export function buildCircuit(root, wires) {
  root.innerHTML = "";
  const byKey = {};
  for (const w of wires) {
    const row = document.createElement("div");
    row.className = "wire";
    row.innerHTML = `
      <div class="wire-label"><b>${w.label}</b>${w.sub}</div>
      <div class="wire-track"></div>
      <div class="wire-meta">waiting</div>`;
    const track = row.querySelector(".wire-track");
    const gates = w.gates.map((g) => {
      const el = document.createElement("div");
      el.className = "gate";
      el.textContent = g;
      el.title = "queued";
      track.appendChild(el);
      return el;
    });
    root.appendChild(row);
    byKey[w.key] = { row, gates, meta: row.querySelector(".wire-meta"), done: 0 };
  }

  return {
    gate(key, i, state, title) {
      const w = byKey[key];
      if (!w || !w.gates[i]) return;
      const el = w.gates[i];
      el.classList.remove("queued", "running", "done", "failed");
      el.classList.add(state);
      if (title) el.title = title;
      if (state === "done") {
        w.done += 1;
        w.meta.textContent = `${w.done}/${w.gates.length} measured`;
        if (w.done === w.gates.length) w.row.classList.add("complete");
      } else if (state === "running" && !w.done) {
        w.meta.textContent = "running…";
      } else if (state === "failed") {
        w.meta.textContent = "failed";
      }
    },
    meta(key, text) {
      if (byKey[key]) byKey[key].meta.textContent = text;
    },
  };
}

export function makeConsole(el) {
  el.innerHTML = "";
  const t0 = performance.now();
  return (msg, cls = "") => {
    const line = document.createElement("div");
    const t = ((performance.now() - t0) / 1000).toFixed(1).padStart(5, " ");
    line.innerHTML = `<span class="q">${t}s</span>  <span class="${cls}">${msg}</span>`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  };
}
