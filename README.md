# ⟨ψ⟩ Entangled — a quantum photobooth for two

**Two people. One quantum state.** Entangled takes two faces and puts them through four real quantum
engines on [Moth Quantum Atlas](https://platform.mothquantum.com): one face is *teleported* into the other
through qubit rotations, both are measured through a noisy IBM-calibrated chip, your faces become a melody
that echoes through a scrambled qubit chain, and finally a measured qubit decides **who you collapse into**.

**▶ Live app: https://entangled-quantum.vercel.app**

Built for the **Qiskit Fall Fest 2026 · Quantum Media track** (powered by Moth), Code / Atlas API tier
(themes: *Make a web app* + *Daisy chain*).

## Try it in 60 seconds (for judges)

1. Open **https://entangled-quantum.vercel.app**. A 3-slide tour explains everything; press **▶ Try Einstein × Bohr**.
2. Watch **Step 2 · Entangle**: every gate is a real Moth job id (the demo replays a recorded run, sped up 6×).
3. In **Step 3 · Observe**, drag **θ** between Einstein and Bohr, spin the Bloch sphere, play the quantum echo.
4. In **Step 4 · Measure**, press **Measure ⟨ψ⟩**: 100 shots of one qubit collapse the superposition into one face.
   Download the share card, or record an 8-second clip with sound.
5. Want your own faces? Use **📸 Camera** or **⬆ Upload** for both people and press **Entangle**: this runs
   all four engines live on Moth Atlas (about 30–60 s, 13 credits).

## The daisy chain: four Moth engines, one story

| Step | Engine | What it does in Entangled | Runs per entanglement |
|---|---|---|---|
| **Teleport** | `telablur-v1` (Quantum Teleblur) | Encodes both faces as qubit amplitudes and rotates face A into face B. Running it at many strengths θ ∈ [0, 1] gives every in-between state: at θ ≈ 0.5 the image is *neither* person. | 9 (live) / 15 (demo) |
| **Decohere** | `tessa-image-v1` (Tessa) | Every pixel becomes a point on the colour sphere (the same coordinates as a qubit state) and is measured through `fake_torino`, a simulator calibrated to IBM Torino's real noise. We plot the measured pixels of both faces on a 3D Bloch sphere. | 2 |
| **Echo** | `retrocausal-echo-v1` (Retrocausal Echo) | Each face is turned into 8 notes (brightness → pentatonic pitch). The 16-note phrase goes through a multi-tap delay whose taps are measured from a scrambled 8-qubit chain; negative amplitudes flip the echo's polarity. | 1 |
| **Measure** | `coin-toss-v1` (Coin Toss) | One qubit in superposition, measured 100 times. Heads vote \|A⟩, tails vote \|B⟩; the majority is the state the portrait collapses into. | 1 |

All four run **in parallel** (max 5 jobs in flight to respect the 300 req/min limit), and the circuit view
shows each job as a gate going from queued → running → measured.
