// The Moth Atlas engines Entangled chains together, and what each one does here.
export const ENGINES = [
  {
    id: "telablur-v1",
    name: "Quantum Teleblur",
    wire: "Teleport",
    role: "A → B through qubit rotations",
    desc: "Both faces are encoded as qubit amplitudes; rotation gates teleport face A into face B. We run it at 9 strengths θ to get every in-between state.",
    cost: "1 credit × 9 strengths",
  },
  {
    id: "tessa-image-v1",
    name: "Tessa Image",
    wire: "Decohere",
    role: "pixels → Bloch sphere → noisy chip",
    desc: "Every pixel becomes a point on the colour sphere, the same coordinates as a qubit state, and is measured through a simulator calibrated to IBM Torino's noise.",
    cost: "1 credit × 2 faces",
  },
  {
    id: "retrocausal-echo-v1",
    name: "Retrocausal Echo",
    wire: "Echo",
    role: "melody → quantum multi-tap delay",
    desc: "Your faces become an 8 + 8 note melody. The echo's taps are measured from a scrambled 8-qubit chain; negative amplitudes flip the echo's polarity.",
    cost: "2 credits",
  },
  {
    id: "coin-toss-v1",
    name: "Coin Toss",
    wire: "Measure",
    role: "1 qubit × 100 shots",
    desc: "A single qubit in superposition, measured 100 times. heads / shots is how much of person A survives the collapse.",
    cost: "2 credits",
  },
];

export const LIVE_STRENGTHS = [0, 0.03, 0.1, 0.25, 0.5, 0.75, 0.9, 0.97, 1];
