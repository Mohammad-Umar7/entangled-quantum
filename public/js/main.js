// Entangled: wires the four steps together.
import { ENGINES, LIVE_STRENGTHS } from "./engines.js";
import { buildCircuit, makeConsole } from "./circuit.js";
import { Player } from "./player.js";
import { AudioDeck } from "./audio.js";
import { drawCard, animateCollapse, downloadCanvas, recordClip } from "./card.js";
import { fromFile, fromCamera } from "./capture.js";
import { initTour, makeStepper } from "./onboarding.js";
import { runLive, replayDemo, wiresFor } from "./pipeline.js";
import { startHero } from "./hero.js";
import { loadImage, pixels, squareCanvas } from "./imageutil.js";

const $ = (id) => document.getElementById(id);
const LIVE_BUDGET = 3;

const state = { a: null, b: null, demoPair: false, run: null, busy: false, measured: false };
const go = makeStepper();
const player = new Player($("player"), $("player-badge"), $("theta"), $("play"));
const deck = new AudioDeck($("wave"));
let sphere = null;
let manifest = null;

// ---------- toast ----------
let toastTimer;
function toast(msg, isErr = false) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.toggle("err", isErr);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 4500);
}

// ---------- live budget (per browser) ----------
const used = () => { try { return Number(localStorage.getItem("entangled.live") || 0); } catch { return 0; } };
const spend = () => { try { localStorage.setItem("entangled.live", String(used() + 1)); } catch {} };
function updateBudget() {
  const left = Math.max(0, LIVE_BUDGET - used());
  $("budget-note").textContent = `Live runs use about 13 Moth credits each: ${left} of ${LIVE_BUDGET} live runs left in this browser. ` +
    "Photos are sent only to the Moth API for processing and are not stored by this site.";
}

// ---------- engines section ----------
$("engine-grid").innerHTML = ENGINES.map((e) => `
  <article class="engine"><code>${e.id}</code><h3>${e.name}</h3><p>${e.desc}</p><div class="cost">${e.cost}</div></article>`).join("");

// ---------- step 1: slots ----------
function setSlot(which, canvas, name) {
  state[which] = canvas;
  const slot = $(`slot-${which}`);
  const img = slot.querySelector("img");
  img.src = canvas.toDataURL("image/jpeg", 0.9);
  img.hidden = false;
  slot.querySelector(".slot-empty").hidden = true;
  slot.querySelector(".slot-frame").classList.add("filled");
  if (name != null) slot.querySelector(".slot-name").value = name;
  refreshChoose();
}

function refreshChoose() {
  const ready = !!(state.a && state.b);
  const btn = $("go-entangle");
  btn.disabled = !ready;
  btn.classList.toggle("pulse-cta", ready);
  btn.textContent = !ready ? "Add two faces to entangle" : state.demoPair ? "Entangle them ⊗ (instant replay)" : "Entangle them ⊗ (live quantum)";
}

function names() {
  const n = (w, d) => ($(`slot-${w}`).querySelector(".slot-name").value || d).trim().slice(0, 18) || d;
  return [n("a", "A"), n("b", "B")];
}

for (const which of ["a", "b"]) {
  const slot = $(`slot-${which}`);
  slot.querySelector('[data-act="camera"]').addEventListener("click", async () => {
    try {
      const c = await fromCamera($("camera-modal"), $("cam"), $("cam-count"), $("cam-snap"), $("cam-cancel"));
      state.demoPair = false;
      setSlot(which, c, null);
    } catch (e) { if (e.message !== "cancelled") toast(e.message, true); }
  });
  slot.querySelector('[data-act="upload"]').addEventListener("change", async (ev) => {
    try {
      const c = await fromFile(ev.target.files[0]);
      state.demoPair = false;
      setSlot(which, c, null);
    } catch (e) { toast(e.message, true); }
    ev.target.value = "";
  });
  slot.querySelector(".slot-name").addEventListener("input", () => {
    if (state.demoPair) { state.demoPair = false; refreshChoose(); }
  });
}

async function useDemoPair() {
  const [ea, eb] = await Promise.all([loadImage("demo/einstein.jpg"), loadImage("demo/bohr.jpg")]);
  setSlot("a", squareCanvas(ea, 512), "Einstein");
  setSlot("b", squareCanvas(eb, 512), "Bohr");
  state.demoPair = true;
  refreshChoose();
}
$("use-demo-pair").addEventListener("click", useDemoPair);

// ---------- step 2: entangle ----------
async function entangle() {
  if (state.busy || !state.a || !state.b) return;
  const live = !state.demoPair;
  if (live && used() >= LIVE_BUDGET) {
    toast("You've used this browser's live runs. Try the Einstein × Bohr replay, or clone the repo with your own Moth key.", true);
    return;
  }
  state.busy = true;
  state.measured = false;
  $("go-entangle").disabled = true;
  const nm = live ? names() : ["Einstein", "Bohr"];
  document.querySelectorAll(".names-inline").forEach((el) => (el.textContent = `${nm[0]} ⊗ ${nm[1]}`));
  $("entangle-sub").textContent = live
    ? "Four quantum engines run on Moth Atlas right now. Each gate is a real job: watch it go from queued to measured (about 30–60 s)."
    : "Replaying a real recorded run of four Moth engines (job ids are real; waiting time is sped up 6×).";
  ["step-observe", "step-measure"].forEach((id) => ($(id).hidden = true));
  go(2);
  const strengths = live ? LIVE_STRENGTHS : manifest.strengths;
  const circuit = buildCircuit($("circuit"), wiresFor(strengths));
  const log = makeConsole($("console"));
  try {
    let run;
    if (live) {
      spend();
      updateBudget();
      run = await runLive({ canvasA: state.a, canvasB: state.b, names: nm }, circuit, log);
    } else {
      run = await replayDemo(manifest, circuit, log);
    }
    state.run = run;
    await showObserve(run);
  } catch (e) {
    console.error(e);
    log(`run stopped: ${e.message}`, "err");
    toast(`Quantum run failed: ${e.message}. The Einstein × Bohr replay always works.`, true);
  } finally {
    state.busy = false;
    refreshChoose();
  }
}
$("go-entangle").addEventListener("click", entangle);

// ---------- step 3: observe ----------
async function showObserve(run) {
  $("recorded-badge").hidden = run.live;
  $("end-a").textContent = run.names[0];
  $("end-b").textContent = run.names[1];
  $("tessa-a-name").textContent = run.names[0];
  $("tessa-b-name").textContent = run.names[1];
  player.load(run.frames, run.names);
  $("tessa-a").src = run.tessa[0];
  $("tessa-b").src = run.tessa[1];
  $("notes").textContent = `notes: ${run.notes.map((f) => Math.round(f)).join(" ")} Hz`;
  go(3);
  setTimeout(() => player.play(), 700);
  const [ia, ib] = await Promise.all(run.tessa.map(loadImage));
  if (sphere) sphere.dispose();
  try {
    const { makeSphere } = await import("./sphere.js");
    sphere = makeSphere($("sphere"), pixels(ia), pixels(ib));
  } catch (e) {
    console.warn("sphere unavailable", e);
    $("sphere").innerHTML = '<p style="padding:20px;color:var(--muted)">3D view unavailable in this browser.</p>';
  }
  await deck.load(run.melodyUrl, run.echoUrl).catch((e) => toast(`Audio failed to load: ${e.message}`, true));
  drawCard($("card"), run, 0.5);
  $("measure").hidden = false;
  $("measure").disabled = false;
  $("dl-card").disabled = $("dl-clip").disabled = true;
  $("shots").innerHTML = Array.from({ length: run.coin.shots }, () => '<i class="shot"></i>').join("");
  $("collapse-line").innerHTML = "Press <strong>Measure</strong> to collapse the state.";
}

$("play-dry").addEventListener("click", () => deck.play("dry"));
$("play-wet").addEventListener("click", () => deck.play("wet"));
$("go-measure").addEventListener("click", () => { player.stop(); go(4); });

// ---------- step 4: measure ----------
// heads = |A>, tails = |B>; the majority of the shots is the collapsed state
function target(run) { return run.coin.heads * 2 >= run.coin.shots ? 0 : 1; }

$("measure").addEventListener("click", () => {
  const run = state.run;
  if (!run) return;
  $("measure").hidden = true;
  deck.play("wet");
  // reveal shots in a shuffled order (count is the real measurement)
  const shots = [...$("shots").children];
  const outcomes = shots.map((_, i) => (i < run.coin.heads ? "h" : "t")).sort(() => Math.random() - 0.5);
  shots.forEach((el, i) => setTimeout(() => el.classList.add(outcomes[i]), 18 * i));
  animateCollapse($("card"), run, target(run), () => {
    state.measured = true;
    const isA = target(run) === 0;
    const win = isA ? run.names[0] : run.names[1];
    $("collapse-line").innerHTML = `Measured: <span class="${isA ? "pa" : "pb"}">|${win}⟩</span>
      <br><small style="color:var(--muted)">${run.coin.heads} shots gave |${run.names[0]}⟩ and ${run.coin.shots - run.coin.heads} gave |${run.names[1]}⟩.
      The superposition is gone: looking at it picked one of you.</small>`;
    $("dl-card").disabled = $("dl-clip").disabled = false;
  });
});

$("dl-card").addEventListener("click", () => downloadCanvas($("card"), `entangled-${state.run.names.join("-").toLowerCase()}.png`));
$("dl-clip").addEventListener("click", async () => {
  const btn = $("dl-clip");
  btn.disabled = true;
  try {
    deck.play("wet");
    await recordClip($("card"), state.run, target(state.run), deck.stream(), (p) => (btn.textContent = `● Recording ${Math.round(p * 100)}%`));
  } catch (e) {
    toast(`Recording is not supported here: ${e.message}`, true);
  }
  btn.textContent = "⬇ Record 8 s clip";
  btn.disabled = false;
});
$("again").addEventListener("click", () => { go(1); });

// ---------- hero + tour ----------
async function startDemoFlow() {
  await useDemoPair();
  go(1);
  setTimeout(entangle, 500);
}
$("cta-demo").addEventListener("click", startDemoFlow);
$("cta-live").addEventListener("click", () => {
  if (state.demoPair) { state.a = state.b = null; resetSlots(); }
  go(1);
  setTimeout(() => $("slot-a").querySelector('[data-act="camera"]').focus(), 600);
  toast("Add a photo for each person: camera or upload. Then press Entangle.");
});
function resetSlots() {
  for (const w of ["a", "b"]) {
    const slot = $(`slot-${w}`);
    slot.querySelector("img").hidden = true;
    slot.querySelector(".slot-empty").hidden = false;
    slot.querySelector(".slot-frame").classList.remove("filled");
    slot.querySelector(".slot-name").value = "";
  }
  state.demoPair = false;
  refreshChoose();
}

const tour = initTour({ onStartDemo: startDemoFlow });
$("replay-tour").addEventListener("click", () => tour.open());

(async () => {
  updateBudget();
  refreshChoose();
  manifest = await (await fetch("demo/manifest.json")).json();
  startHero($("hero-canvas"), manifest).catch(() => {});
  if (/[?&]demo\b/.test(location.search)) startDemoFlow();
})();
