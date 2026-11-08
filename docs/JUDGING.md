# Entangled · notes for the judges

**Track:** Qiskit Fall Fest 2026 · Quantum Media (powered by Moth) · **Tier:** Code / Atlas API

## Which themes it covers

| Theme | How Entangled covers it |
|---|---|
| **Make a web app** (code) | A public web app that calls the Atlas API through a small serverless proxy: https://entangled-quantum.vercel.app |
| **Daisy chain** (most engines, used well) | Four engines feed one story: Teleblur (teleport) → Tessa (decohere) → Retrocausal Echo (sound) → Coin Toss (measure). Each is used for what it is uniquely good at, not as a filter. |
| **Moving image** | The superposition player, the 8-second clip export, and the demo video. |
| **Make it audible** | Faces become a melody that goes through Retrocausal Echo; you can A/B the dry and quantum versions. |
| **Quantum native 1** (repo) | This repository: the app, the proxy, tests, the demo-bake script and the video builder. |

## What to look at in 60 seconds

1. Press **▶ Try Einstein × Bohr** (instant, no credits): a replay of a real recorded run, with real job ids.
2. Drag **θ** to around 0.5: the image is neither person.
3. Press **Measure ⟨ψ⟩**: 100 real shots decide who survives.
4. Optional: **📸 Camera** twice → **Entangle** to run all four engines live (about 40 s).

## Engineering details

- 13 Moth jobs per live run, in parallel with at most 5 in flight (stays inside 300 req/min).
- The key never reaches the browser; engines are whitelisted and parameters clamped to simulators
  (`lib/guard.js`, covered by `test/guard.test.js`).
- Deterministic demo: `scripts/bake-demo.js` stores every output with its job id and timing.
- Honest framing: everything runs on Moth's simulators (Aer, plus the `fake_torino` noise model). We
  don't claim a quantum speed-up; the quantum parts are the media material itself.
