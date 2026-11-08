// Face -> melody -> WAV.
const test = require("node:test");
const assert = require("node:assert/strict");
const Melody = require("../public/js/melody.js");

test("8 + 8 brightness cells give 16 notes from the scale", () => {
  const notes = Melody.notesFrom([0, 32, 64, 96, 128, 160, 192, 255], new Array(8).fill(128));
  assert.equal(notes.length, 16);
  for (const f of notes) assert.ok(Melody.SCALE.includes(f));
  assert.equal(notes[0], Melody.SCALE[0]);
  assert.equal(notes[7], Melody.SCALE[Melody.SCALE.length - 1]);
});

test("rendered phrase is normalised and not clipped", () => {
  const s = Melody.render([440, 523.25]);
  let peak = 0;
  for (const v of s) peak = Math.max(peak, Math.abs(v));
  assert.ok(peak > 0.79 && peak <= 0.8 + 1e-6, `peak ${peak}`);
});

test("WAV header is valid 16-bit mono PCM", () => {
  const wav = Melody.toWav(new Float32Array(100));
  const v = new DataView(wav.buffer);
  const str = (o) => String.fromCharCode(...wav.slice(o, o + 4));
  assert.equal(str(0), "RIFF");
  assert.equal(str(8), "WAVE");
  assert.equal(v.getUint16(22, true), 1); // mono
  assert.equal(v.getUint32(24, true), 44100);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(40, true), 200);
  assert.equal(wav.length, 244);
});

test("fromFaces returns notes and a WAV under 1.5 MB (upload limit)", () => {
  const { notes, wav } = Melody.fromFaces(new Array(8).fill(10), new Array(8).fill(240));
  assert.equal(notes.length, 16);
  assert.ok(wav.length < 1.5 * 1024 * 1024);
});
