// First-visit tour + the 4-step progress stepper.

const SLIDES = [
  {
    title: "Welcome to Entangled",
    body: `<p class="tour-kicker">A quantum photobooth for two</p>
      <div class="tour-visual"><span class="ta">|A⟩</span><span class="tx">⊗</span><span class="tb">|B⟩</span></div>
      <p>Give it two faces. Real quantum engines on <b>Moth Atlas</b> put them into one shared state: halfway
      between you and your friend, the image is <i>neither</i> of you.</p>`,
  },
  {
    title: "What's quantum here?",
    body: `<ul class="tour-list">
      <li><b>Teleport</b>: Teleblur rotates face A into face B through qubit gates.</li>
      <li><b>Decohere</b>: Tessa puts every pixel on a Bloch sphere and measures it through IBM Torino's noise.</li>
      <li><b>Echo</b>: your faces become a melody that echoes through a scrambled 8-qubit chain.</li>
      <li><b>Measure</b>: one qubit, 100 shots, decides who you collapse into.</li></ul>`,
  },
  {
    title: "How to use it (about a minute)",
    body: `<ol class="tour-steps">
      <li><span>1</span>Choose two faces: camera, upload, or Einstein × Bohr.</li>
      <li><span>2</span>Press <b>Entangle</b> and watch the quantum jobs run.</li>
      <li><span>3</span>Drag θ, spin the Bloch sphere, play the echo.</li>
      <li><span>4</span><b>Measure</b>, then download your card or clip.</li></ol>
      <p class="tour-tip">Fastest way in: <b>Try Einstein × Bohr</b>. It replays a real recorded run instantly.</p>`,
  },
];

export function initTour({ onStartDemo }) {
  const root = document.getElementById("tour");
  const body = document.getElementById("tour-body");
  const dots = document.getElementById("tour-dots");
  const next = document.getElementById("tour-next");
  const skip = document.getElementById("tour-skip");
  let i = 0;

  const render = () => {
    const s = SLIDES[i];
    body.innerHTML = `<h2 id="tour-title">${s.title}</h2>${s.body}`;
    dots.innerHTML = SLIDES.map((_, k) => `<span class="${k === i ? "on" : ""}"></span>`).join("");
    next.textContent = i === SLIDES.length - 1 ? "▶ Try Einstein × Bohr" : "Next";
    skip.textContent = i === SLIDES.length - 1 ? "I'll explore" : "Skip";
  };
  const close = () => {
    root.hidden = true;
    try { localStorage.setItem("entangled.toured", "1"); } catch {}
  };
  const open = () => { i = 0; render(); root.hidden = false; next.focus(); };

  next.addEventListener("click", () => {
    if (i < SLIDES.length - 1) { i++; render(); }
    else { close(); onStartDemo(); }
  });
  skip.addEventListener("click", close);
  root.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  let seen = false;
  try { seen = localStorage.getItem("entangled.toured") === "1"; } catch {}
  if (!seen && !/[?&]notour\b/.test(location.search)) setTimeout(open, 600);
  return { open, close };
}

export function makeStepper() {
  const items = [...document.querySelectorAll("#stepper li")];
  const panels = {
    1: document.getElementById("step-choose"),
    2: document.getElementById("step-entangle"),
    3: document.getElementById("step-observe"),
    4: document.getElementById("step-measure"),
  };
  return function go(n, { scroll = true, show = [] } = {}) {
    items.forEach((li) => {
      const k = Number(li.dataset.step);
      li.classList.toggle("active", k === n);
      li.classList.toggle("done", k < n);
    });
    for (const k of [n, ...show]) panels[k].hidden = false;
    if (scroll) {
      const top = panels[n].getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };
}
