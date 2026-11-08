# The story behind Entangled

Einstein and Bohr argued about quantum mechanics for thirty years, so I put them in the same quantum state.

**Entangled** is a quantum photobooth for two (https://entangled-quantum.vercel.app). You give it two faces
(camera, upload, or the Einstein × Bohr demo) and it daisy-chains four Moth Atlas engines through the
Atlas API:

1. **Teleport.** Quantum Teleblur encodes both faces as qubit amplitudes and rotates one into the other at
   nine strengths θ. Halfway, the image is neither person; you drag θ and sit inside the superposition.
2. **Decohere.** Tessa puts every pixel on the colour sphere (the same coordinates as a qubit state) and
   measures it through `fake_torino`, IBM Torino's noise model. The app plots both faces' measured pixels on
   a 3D Bloch sphere.
3. **Echo.** Each face becomes eight notes (brightness → pentatonic pitch). The melody goes through
   Retrocausal Echo, whose taps are measured from a scrambled 8-qubit chain, so some echoes come back with
   their polarity flipped.
4. **Measure.** One qubit, 100 shots (Coin Toss). Heads vote for A, tails for B: the superposition collapses
   into one face, and you get a share card or an 8-second clip with the quantum echo.

**The vision:** quantum media where the quantum part is the material itself, not a filter. You can see the
superposition, measuring it destroys it, noise becomes texture, and echoes can have negative amplitudes. It
is also honest: everything runs on Moth's simulators, and there is no speed-up claim.

Built with code: Atlas API, a Vercel serverless proxy that keeps the key hidden and whitelists engines,
unit tests and CI.

- Live app: https://entangled-quantum.vercel.app
- Demo video: https://youtu.be/QdBPTQH0uMg
- Code: https://github.com/Mohammad-Umar7/entangled-quantum
