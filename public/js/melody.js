// Face -> melody. Each portrait is reduced to an 8-cell brightness grid; every
// cell picks a note from a pentatonic scale. Person A plays first, person B
// answers. The result is a short mono WAV that we send through Moth's
// Retrocausal Echo engine. Works in the browser and in Node (UMD).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Melody = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const SR = 44100;
  // A minor pentatonic over two octaves (Hz).
  const SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];

  function notesFrom(gridA, gridB) {
    const pick = (v) => SCALE[Math.min(SCALE.length - 1, Math.floor((v / 256) * SCALE.length))];
    return [...gridA.map(pick), ...gridB.map(pick)];
  }

  // Render notes to Float32 samples: soft bell (sine + octave partial) with an
  // exponential decay, slightly overlapping so it sounds like a phrase.
  function render(notes, { step = 0.22, tail = 1.2 } = {}) {
    const total = Math.ceil((notes.length * step + tail) * SR);
    const out = new Float32Array(total);
    notes.forEach((f, i) => {
      const start = Math.floor(i * step * SR);
      const len = Math.floor((step + tail) * SR);
      const accent = i % 8 === 0 ? 1 : 0.75;
      for (let n = 0; n < len && start + n < total; n++) {
        const t = n / SR;
        const env = Math.min(1, t / 0.008) * Math.exp(-t * 3.2) * accent;
        out[start + n] += env * (0.55 * Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(4 * Math.PI * f * t));
      }
    });
    let peak = 0;
    for (const s of out) peak = Math.max(peak, Math.abs(s));
    const g = peak ? 0.8 / peak : 1;
    for (let i = 0; i < out.length; i++) out[i] *= g;
    return out;
  }

  // 16-bit PCM mono WAV.
  function toWav(samples, sr = SR) {
    const buf = new ArrayBuffer(44 + samples.length * 2);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE");
    w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Uint8Array(buf);
  }

  function fromFaces(gridA, gridB) {
    const notes = notesFrom(gridA, gridB);
    return { notes, wav: toWav(render(notes)) };
  }

  return { SR, SCALE, notesFrom, render, toWav, fromFaces };
});
