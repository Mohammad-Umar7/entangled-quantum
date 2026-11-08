"""Build the Hyperframes composition for the Entangled demo video.

Scene timing follows the real Kokoro voice-line durations (voiceover/durations.json);
visuals use the real recorded demo run (public/demo: Teleblur frames, Tessa outputs,
melody/echo, coin result, job ids).
"""
import json
import html
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
lines = json.loads((HERE / "voiceover/lines.json").read_text(encoding="utf-8"))
durs = {d["id"]: d["dur"] for d in json.loads((HERE / "voiceover/durations.json").read_text())}
man = json.loads((ROOT / "public/demo/manifest.json").read_text(encoding="utf-8"))

GAP, SCENE_GAP, LEAD = 0.30, 0.65, 0.6
ECHO_PLAY = 3.6
OUTRO_HOLD = 3.4

# ---- timing ------------------------------------------------------------
t = LEAD
prev_scene = None
for ln in lines:
    if prev_scene is not None:
        t += SCENE_GAP if ln["scene"] != prev_scene else GAP
    if ln["id"] == "L10":
        t += ECHO_PLAY  # let the quantum echo play on its own after L09
    ln["start"] = round(t, 3)
    ln["dur"] = durs[ln["id"]]
    t += ln["dur"]
    prev_scene = ln["scene"]
TOTAL = round(t + OUTRO_HOLD, 3)
L = {ln["id"]: ln for ln in lines}
end = lambda i: L[i]["start"] + L[i]["dur"]

scene_order = ["hook", "title", "choose", "circuit", "teleport", "decohere", "echo", "measure", "outro"]
scene_start = {}
for ln in lines:
    scene_start.setdefault(ln["scene"], ln["start"])
scene_win = {}
for i, s in enumerate(scene_order):
    a = 0 if i == 0 else scene_start[s] - 0.35
    b = TOTAL if i == len(scene_order) - 1 else scene_start[scene_order[i + 1]] - 0.35
    scene_win[s] = (round(a, 3), round(b, 3))

tw = []  # timeline statements
def add(s):
    tw.append(s)

# scene fades
for s, (a, b) in scene_win.items():
    if s != "hook":
        add(f'tl.fromTo("#sc-{s}", {{opacity:0}}, {{opacity:1, duration:0.4, ease:"power2.out"}}, {a:.3f});')
    else:
        add(f'tl.set("#sc-{s}", {{opacity:1}}, 0);')
    if s != "outro":
        add(f'tl.to("#sc-{s}", {{opacity:0, duration:0.35, ease:"power2.in"}}, {b - 0.05:.3f});')

# ---- frames helper -------------------------------------------------------
N = len(man["frames"])
S = man["strengths"]

def frame_stack(prefix, size, extra_cls=""):
    imgs = "".join(
        f'<img id="{prefix}{k}" class="fr" src="assets/img/f{k:02d}.jpg" style="opacity:{1 if k == 0 else 0}" alt="">'
        for k in range(N))
    return f'<div class="stack {extra_cls}" style="width:{size}px;height:{size}px">{imgs}</div>'

def morph(prefix, t0, t1, th0, th1):
    """Tween frame opacities so the visible state goes from theta th0 to th1 over [t0, t1]."""
    # visible frame index as function of theta: crossfade between neighbours
    def idx(th):
        for k in range(N - 1):
            if S[k] <= th <= S[k + 1]:
                return k + (th - S[k]) / (S[k + 1] - S[k] or 1)
        return N - 1
    i0, i1 = idx(th0), idx(th1)
    span = i1 - i0
    if span == 0:
        return
    for k in range(1, N):
        # frame k is fully shown once the fractional index passes k
        if span > 0 and i0 < k <= i1 + 1e-9 or span > 0 and i0 < k < i1 + 1:
            pass
    steps = []
    if span > 0:
        for k in range(int(i0) + 1, int(min(i1, N - 1)) + 1):
            a = (k - 1 - i0) / span
            b = (k - i0) / span
            steps.append((k, max(0, a), min(1, b), 1))
        frac = i1 - int(i1)
        if frac > 1e-6 and int(i1) + 1 < N:
            k = int(i1) + 1
            steps.append((k, (int(i1) - i0) / span, 1, frac))
    else:
        for k in range(int(i0), int(i1), -1):
            a = (i0 - k) / -span
            b = (i0 - k + 1) / -span
            steps.append((k, max(0, a), min(1, b), 0))
    for k, a, b, target in steps:
        ta, tb = t0 + a * (t1 - t0), t0 + b * (t1 - t0)
        add(f'tl.to("#{prefix}{k}", {{opacity:{target}, duration:{max(0.04, tb - ta):.3f}, ease:"none"}}, {ta:.3f});')

# ---- HOOK ----------------------------------------------------------------
h0, h1 = L["L01"]["start"], end("L02")
add(f'tl.fromTo("#hook-stack", {{scale:1.08}}, {{scale:1, duration:{h1:.2f}, ease:"power1.out"}}, 0);')
add(f'tl.fromTo("#hook-a", {{opacity:0, x:-30}}, {{opacity:1, x:0, duration:0.6, ease:"power3.out"}}, 0.5);')
add(f'tl.fromTo("#hook-b", {{opacity:0, x:30}}, {{opacity:1, x:0, duration:0.6, ease:"power3.out"}}, 1.4);')
morph("hk", L["L02"]["start"] - 0.3, end("L02") + 0.2, 0, 0.5)
add(f'tl.fromTo("#hook-psi", {{opacity:0, y:20}}, {{opacity:1, y:0, duration:0.5, ease:"power3.out"}}, {L["L02"]["start"] + 0.6:.3f});')

# ---- TITLE ---------------------------------------------------------------
t0 = scene_win["title"][0]
add(f'tl.fromTo("#t-word", {{opacity:0, y:40, scale:1.06}}, {{opacity:1, y:0, scale:1, duration:0.9, ease:"power3.out"}}, {t0 + 0.2:.3f});')
add(f'tl.fromTo("#t-tag", {{opacity:0, y:20}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {t0 + 1.0:.3f});')
add(f'tl.fromTo("#t-moth", {{opacity:0, y:20}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {t0 + 2.2:.3f});')
add(f'tl.fromTo("#t-orb", {{opacity:0, scale:0.85, rotation:-8}}, {{opacity:1, scale:1, rotation:0, duration:1.2, ease:"power3.out"}}, {t0 + 0.4:.3f});')
add(f'tl.fromTo("#t-ring", {{rotation:0}}, {{rotation:140, duration:{scene_win["title"][1] - t0:.2f}, ease:"none"}}, {t0:.3f});')

# ---- CHOOSE --------------------------------------------------------------
c0 = scene_win["choose"][0]
add(f'tl.fromTo("#ch-a", {{opacity:0, y:30}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {c0 + 0.3:.3f});')
add(f'tl.fromTo("#ch-b", {{opacity:0, y:30}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {c0 + 0.7:.3f});')
add(f'tl.fromTo("#ch-x", {{opacity:0, scale:0.5}}, {{opacity:1, scale:1, duration:0.5, ease:"back.out(2)"}}, {c0 + 1.3:.3f});')
cb = end("L04") - 0.2
add(f'tl.fromTo("#ch-btn", {{opacity:0.35}}, {{opacity:1, duration:0.4}}, {c0 + 1.6:.3f});')
add(f'tl.fromTo("#cursor", {{opacity:0, x:1500, y:900}}, {{opacity:1, x:1180, y:868, duration:1.0, ease:"power2.inOut"}}, {cb - 1.1:.3f});')
add(f'tl.to("#ch-btn", {{scale:0.94, duration:0.08, yoyo:true, repeat:1}}, {cb:.3f});')
add(f'tl.to("#cursor", {{opacity:0, duration:0.3}}, {cb + 0.5:.3f});')
click_t = cb

# ---- CIRCUIT -------------------------------------------------------------
k0 = scene_win["circuit"][0]
k1 = scene_win["circuit"][1] - 0.4
jobs = man["jobs"]
maxms = max(j["ms"] for j in jobs)
wire_of = lambda e: {"telablur-v1": "tp", "tessa-image-v1": "dc", "retrocausal-echo-v1": "ec", "coin-toss-v1": "ms"}[e]
gate_ids = {"tp": [], "dc": [], "ec": [], "ms": []}
idx_count = {"dc": 0, "ec": 0, "ms": 0}
gate_jobs = []
for j in jobs:
    w = wire_of(j["engine"])
    if w == "tp":
        i = S.index(j["params"]["strength"])
    else:
        i = idx_count[w]; idx_count[w] += 1
    gate_jobs.append((w, i, j))
run_a, run_b = k0 + 1.0, k1 - 0.4
log_lines = []
for w, i, j in gate_jobs:
    tdone = run_a + (j["ms"] / maxms) * (run_b - run_a)
    gid = f"g-{w}-{i}"
    add(f'tl.set("#{gid}", {{color:"#f1eefb", borderColor:"#b38cff", boxShadow:"0 0 22px rgba(179,140,255,0.55)"}}, {run_a - 0.6 + 0.03 * i:.3f});')
    add(f'tl.set("#{gid}", {{backgroundColor:"rgba(87,227,161,0.14)", color:"#57e3a1", borderColor:"rgba(87,227,161,0.6)", boxShadow:"0 0 0 rgba(0,0,0,0)"}}, {tdone:.3f});')
    log_lines.append((tdone, j))
log_lines.sort(key=lambda x: x[0])
for n, (tdone, j) in enumerate(log_lines[-7:]):
    pass
console_html = ""
for n, (tdone, j) in enumerate(log_lines):
    console_html += f'<div class="ln" id="log{n}">✓ {html.escape(j["label"]).ljust(18)} job {j["job_id"]} · {j["ms"]/1000:.1f}s</div>'
    add(f'tl.fromTo("#log{n}", {{opacity:0, x:-8}}, {{opacity:1, x:0, duration:0.2}}, {tdone:.3f});')
# scroll console so the newest lines stay visible (7 visible rows of 34px)
for n, (tdone, j) in enumerate(log_lines):
    if n >= 7:
        add(f'tl.set("#console-in", {{y:{-(n - 6) * 34}}}, {tdone:.3f});')
add(f'tl.fromTo("#k-all", {{opacity:0, y:10}}, {{opacity:1, y:0, duration:0.4}}, {run_b + 0.1:.3f});')

def gates(w, labels):
    return "".join(f'<div class="gate" id="g-{w}-{i}">{lab}</div>' for i, lab in enumerate(labels))

tp_labels = [f"θ{s:.2f}".replace("θ0.", "θ.").replace("θ1.00", "θ1") for s in S]

# ---- TELEPORT ------------------------------------------------------------
p0 = L["L06"]["start"]
mid = L["L07"]["start"] + 1.6
p_end = end("L07")
morph("tp", p0 + 0.4, mid, 0, 0.5)
morph("tp", p_end - 1.2, scene_win["teleport"][1] - 0.4, 0.5, 1.0)
add(f'tl.fromTo("#thumb", {{x:0}}, {{x:320, duration:{mid - p0 - 0.4:.3f}, ease:"none"}}, {p0 + 0.4:.3f});')
add(f'tl.to("#thumb", {{x:640, duration:{scene_win["teleport"][1] - 0.4 - (p_end - 1.2):.3f}, ease:"none"}}, {p_end - 1.2:.3f});')
add(f'tl.fromTo("#sup-tag", {{opacity:0, scale:0.9}}, {{opacity:1, scale:1, duration:0.4, ease:"back.out(2)"}}, {mid:.3f});')
add(f'tl.to("#sup-tag", {{opacity:0, duration:0.3}}, {p_end - 1.1:.3f});')
add(f'tl.fromTo("#tp-copy", {{opacity:0, x:30}}, {{opacity:1, x:0, duration:0.6, ease:"power3.out"}}, {p0 + 0.2:.3f});')

# ---- DECOHERE ------------------------------------------------------------
d0 = scene_win["decohere"][0]
add(f'tl.fromTo("#dc-sphere", {{opacity:0, scale:0.92}}, {{opacity:1, scale:1, duration:0.8, ease:"power3.out"}}, {d0 + 0.2:.3f});')
add(f'tl.fromTo("#dc-a", {{opacity:0, y:30}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {d0 + 1.6:.3f});')
add(f'tl.fromTo("#dc-b", {{opacity:0, y:30}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {d0 + 2.1:.3f});')

# ---- ECHO ----------------------------------------------------------------
e0 = scene_win["echo"][0]
echo_t = end("L09") + 0.35
add(f'tl.fromTo("#ec-wave", {{opacity:0, y:20}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {e0 + 0.3:.3f});')
add(f'tl.fromTo("#ec-notes", {{opacity:0}}, {{opacity:1, duration:0.5}}, {e0 + 1.2:.3f});')
add(f'tl.fromTo("#playhead", {{x:0, opacity:1}}, {{x:1497, opacity:1, duration:3.075, ease:"none"}}, {echo_t:.3f});')
add(f'tl.fromTo("#listen", {{opacity:0}}, {{opacity:1, duration:0.3}}, {echo_t - 0.1:.3f});')

# ---- MEASURE -------------------------------------------------------------
m0 = L["L10"]["start"]
heads = man["coin"]["heads"]
import random
rng = random.Random(7)
outcomes = ["h"] * heads + ["t"] * (100 - heads)
rng.shuffle(outcomes)
shots_html = "".join(f'<i class="shot" id="sh{n}"></i>' for n in range(100))
shot_t0 = m0 + 1.4
for n, o in enumerate(outcomes):
    add(f'tl.set("#sh{n}", {{backgroundColor:"{"#ffb547" if o == "h" else "#5fd4ff"}"}}, {shot_t0 + n * 0.022:.3f});')
coll = L["L11"]["start"] - 0.2
add(f'tl.fromTo("#cnt", {{opacity:0}}, {{opacity:1, duration:0.4}}, {shot_t0 + 2.3:.3f});')
# collapse: flicker through superposed frames, then snap to Bohr (seeded, deterministic)
fl_rng = random.Random(11)
for n in range(10):
    tt = coll - 1.0 + n * 0.1
    k = fl_rng.randint(3, N - 4)
    add(f'tl.set(".ms-fr", {{opacity:0}}, {tt:.3f}); tl.set("#ms{k}", {{opacity:1}}, {tt:.3f});')
add(f'tl.set(".ms-fr", {{opacity:0}}, {coll:.3f}); tl.set("#ms{N-1}", {{opacity:1}}, {coll:.3f});')
add(f'tl.fromTo("#ms-flash", {{opacity:0.9}}, {{opacity:0, duration:0.6, ease:"power2.out"}}, {coll:.3f});')
add(f'tl.fromTo("#ms-result", {{opacity:0, y:16}}, {{opacity:1, y:0, duration:0.5, ease:"power3.out"}}, {coll + 0.2:.3f});')
add(f'tl.set("#ms-super", {{opacity:0}}, {coll:.3f});')
bong_t = coll

ms_frames = "".join(
    f'<img id="ms{k}" class="fr ms-fr" src="assets/img/f{k:02d}.jpg" style="opacity:{1 if k == 7 else 0}" alt="">' for k in range(N))

# ---- OUTRO ---------------------------------------------------------------
o0 = scene_win["outro"][0]
add(f'tl.fromTo("#o-word", {{opacity:0, y:30, scale:1.08}}, {{opacity:1, y:0, scale:1, duration:1.0, ease:"power3.out"}}, {o0 + 0.2:.3f});')
add(f'tl.fromTo("#o-url", {{opacity:0, y:16}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {o0 + 1.0:.3f});')
add(f'tl.fromTo("#o-meta", {{opacity:0, y:16}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {o0 + 1.8:.3f});')
add(f'tl.fromTo("#o-eng", {{opacity:0, y:16}}, {{opacity:1, y:0, duration:0.6, ease:"power3.out"}}, {o0 + 2.4:.3f});')
add(f'tl.to("#fade", {{opacity:1, duration:0.8, ease:"power2.in"}}, {TOTAL - 0.85:.3f});')
add(f'tl.fromTo("#fade", {{opacity:1}}, {{opacity:0, duration:0.6, ease:"power2.out"}}, 0);')

# ---- captions ------------------------------------------------------------
def chunks(text, maxc=58):
    words, out, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > maxc and cur:
            out.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    out.append(cur)
    return out

caps = ""
ci = 0
for ln in lines:
    parts = chunks(ln["text"])
    total_c = sum(len(p) for p in parts)
    tt = ln["start"]
    for p in parts:
        d = ln["dur"] * len(p) / total_c
        caps += f'<div class="cap" id="cap{ci}"><span>{html.escape(p)}</span></div>'
        add(f'tl.fromTo("#cap{ci}", {{opacity:0, y:8}}, {{opacity:1, y:0, duration:0.14, ease:"power2.out"}}, {tt:.3f});')
        add(f'tl.to("#cap{ci}", {{opacity:0, duration:0.12}}, {tt + d - 0.05:.3f});')
        tt += d
        ci += 1

# ---- audio ---------------------------------------------------------------
audio = ""
for n, ln in enumerate(lines):
    audio += f'<audio id="vo-{ln["id"]}" src="assets/vo/{ln["id"]}.wav" data-start="{ln["start"]:.3f}" data-duration="{ln["dur"]:.3f}" data-track-index="{10 + n % 2}" data-volume="1"></audio>\n'
audio += f'<audio id="music" src="assets/audio/music.mp3" data-start="0" data-duration="{TOTAL:.3f}" data-track-index="5" data-volume="0.09"></audio>\n'
audio += f'<audio id="echo" src="assets/audio/echo.wav" data-start="{echo_t:.3f}" data-duration="3.075" data-track-index="6" data-volume="1"></audio>\n'
audio += f'<audio id="sfx-click" src="assets/sfx/click2.ogg" data-start="{click_t:.3f}" data-duration="0.06" data-track-index="7" data-volume="0.5"></audio>\n'
audio += f'<audio id="sfx-bong" src="assets/sfx/bong_001.ogg" data-start="{bong_t:.3f}" data-duration="0.12" data-track-index="8" data-volume="0.55"></audio>\n'

notes = " ".join(str(round(f)) for f in man["notes"])
jobs_n = len(jobs)

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>Entangled demo</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@font-face {{ font-family: "Space Grotesk"; src: url("assets/fonts/SpaceGrotesk-700.woff2") format("woff2"); font-weight: 300 700; }}
@font-face {{ font-family: "JetBrains Mono"; src: url("assets/fonts/JetBrainsMono-500.woff2") format("woff2"); font-weight: 500; }}
body {{ margin: 0; background: #07060b; }}
#root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: #07060b; color: #f1eefb; font-family: "Space Grotesk", sans-serif; }}
.aur {{ position: absolute; inset: -200px; background:
  radial-gradient(900px 600px at 15% 10%, rgba(255,181,71,0.13), transparent 60%),
  radial-gradient(900px 600px at 85% 20%, rgba(95,212,255,0.12), transparent 60%),
  radial-gradient(1100px 800px at 50% 95%, rgba(179,140,255,0.15), transparent 60%); }}
.scene {{ position: absolute; inset: 0; opacity: 0; display: flex; align-items: center; justify-content: center; box-sizing: border-box; padding: 80px 120px 170px; }}
.iri {{ background: linear-gradient(100deg,#ffb547 0%,#ff6bd6 30%,#b38cff 55%,#5fd4ff 80%,#57e3a1 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }}
.mono {{ font-family: "JetBrains Mono", monospace; }}
.brand {{ position: absolute; left: 56px; top: 44px; display: flex; gap: 14px; align-items: center; font-weight: 700; font-size: 30px; z-index: 5; }}
.brand b {{ font-family: "JetBrains Mono", monospace; font-size: 22px; padding: 6px 10px; border-radius: 10px; color: #120f1c; background: linear-gradient(100deg,#ffb547,#ff6bd6,#b38cff,#5fd4ff); }}
.stack {{ position: relative; border-radius: 28px; overflow: hidden; background: #000; flex: none; }}
.stack .fr {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
.eyebrow {{ font-family: "JetBrains Mono", monospace; font-size: 22px; letter-spacing: 0.14em; text-transform: uppercase; color: #b38cff; margin: 0 0 14px; }}
h2 {{ font-size: 64px; line-height: 1.05; margin: 0 0 18px; letter-spacing: -0.02em; }}
p.body {{ font-size: 30px; line-height: 1.4; color: #a49fb8; margin: 0; max-width: 640px; }}
/* hook */
#sc-hook {{ gap: 70px; }}
.ket {{ font-family: "JetBrains Mono", monospace; font-size: 56px; font-weight: 500; }}
.ket.a {{ color: #ffb547; }} .ket.b {{ color: #5fd4ff; }}
#hook-psi {{ position: absolute; left: 0; right: 0; bottom: 190px; text-align: center; font-family: "JetBrains Mono", monospace; font-size: 34px; color: #d9c8ff; }}
/* title */
#sc-title {{ gap: 90px; }}
#t-word {{ font-size: 180px; font-weight: 700; line-height: 0.95; letter-spacing: -0.03em; margin: 0; }}
#t-tag {{ font-size: 50px; font-weight: 600; margin: 18px 0 0; }}
#t-moth {{ font-size: 30px; color: #a49fb8; margin: 26px 0 0; }}
#t-orb {{ position: relative; width: 520px; height: 520px; flex: none; }}
#t-orb .ball {{ position: absolute; inset: 0; border-radius: 50%; overflow: hidden; }}
#t-orb .ball img {{ width: 100%; height: 100%; object-fit: cover; }}
#t-ring {{ position: absolute; inset: -14px; border-radius: 50%; background: conic-gradient(#ffb547,#ff6bd6,#b38cff,#5fd4ff,#57e3a1,#ffb547);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px)); mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px)); }}
/* panel look from the site */
.panel {{ background: rgba(22,19,34,0.78); border: 1px solid rgba(255,255,255,0.10); border-radius: 30px; padding: 44px 52px; box-shadow: 0 30px 80px rgba(0,0,0,0.5); box-sizing: border-box; }}
.step-tag {{ font-family: "JetBrains Mono", monospace; font-size: 18px; letter-spacing: 0.12em; text-transform: uppercase; color: #b38cff; }}
/* choose */
.pair {{ display: flex; gap: 60px; align-items: center; justify-content: center; margin-top: 26px; }}
.slot {{ display: flex; flex-direction: column; gap: 16px; align-items: center; }}
.slot .frame {{ width: 380px; height: 380px; border-radius: 22px; overflow: hidden; }}
.slot .frame img {{ width: 100%; height: 100%; object-fit: cover; }}
.slot.a .frame {{ border: 3px solid #ffb547; box-shadow: 0 0 50px rgba(255,181,71,0.3); }}
.slot.b .frame {{ border: 3px solid #5fd4ff; box-shadow: 0 0 50px rgba(95,212,255,0.3); }}
.namebox {{ width: 380px; box-sizing: border-box; text-align: center; font-size: 26px; padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); }}
.btnrow {{ display: flex; gap: 10px; }}
.btn {{ display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); font-size: 22px; font-weight: 600; }}
.btn.primary {{ background: linear-gradient(100deg,#ffb547,#ff6bd6,#b38cff,#5fd4ff); color: #120f1c; border-color: transparent; box-shadow: 0 10px 40px rgba(179,140,255,0.45); font-size: 30px; padding: 18px 34px; }}
#ch-x {{ font-size: 70px; color: #b38cff; text-align: center; }}
#ch-x small {{ display: block; font-family: "JetBrains Mono", monospace; font-size: 16px; letter-spacing: 0.12em; color: #6f6a85; }}
.foot {{ display: flex; justify-content: flex-end; margin-top: 30px; }}
#cursor {{ position: absolute; left: 0; top: 0; width: 44px; height: 44px; opacity: 0; z-index: 20; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6)); }}
/* circuit */
#sc-circuit .panel {{ width: 1680px; }}
.wire {{ display: grid; grid-template-columns: 250px 1fr 150px; align-items: center; gap: 20px; padding: 14px 22px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.02); margin-top: 12px; }}
.wire .lab {{ font-family: "JetBrains Mono", monospace; font-size: 18px; color: #a49fb8; }}
.wire .lab b {{ display: block; font-family: "Space Grotesk"; font-size: 26px; color: #f1eefb; }}
.track {{ position: relative; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }}
.track::before {{ content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(255,255,255,0.16); }}
.gate {{ position: relative; z-index: 1; min-width: 56px; height: 46px; padding: 0 8px; box-sizing: border-box; border-radius: 10px; display: grid; place-items: center; font-family: "JetBrains Mono", monospace; font-size: 15px; background: #15121f; border: 1px solid rgba(255,255,255,0.16); color: #6f6a85; }}
.gate.running {{ color: #f1eefb; border-color: #b38cff; box-shadow: 0 0 22px rgba(179,140,255,0.55); }}
.gate.done {{ background: rgba(87,227,161,0.14); color: #57e3a1; border-color: rgba(87,227,161,0.6); }}
.console {{ margin-top: 18px; height: 238px; overflow: hidden; padding: 14px 18px; border-radius: 14px; background: #05040a; border: 1px solid rgba(255,255,255,0.09); box-sizing: border-box; }}
.console .ln {{ font-family: "JetBrains Mono", monospace; font-size: 20px; line-height: 34px; height: 34px; color: #57e3a1; white-space: pre; opacity: 0; }}
#k-all {{ font-family: "JetBrains Mono", monospace; font-size: 22px; color: #57e3a1; margin-top: 12px; opacity: 0; }}
/* teleport */
#sc-teleport {{ gap: 80px; }}
.player {{ display: flex; flex-direction: column; gap: 22px; }}
.slider {{ position: relative; width: 640px; height: 10px; border-radius: 999px; background: linear-gradient(90deg,#ffb547,#b38cff,#5fd4ff); }}
#thumb {{ position: absolute; top: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; background: #fff; border: 4px solid #b38cff; box-shadow: 0 0 20px rgba(179,140,255,0.8); box-sizing: border-box; }}
.ends {{ display: flex; justify-content: space-between; font-family: "JetBrains Mono", monospace; font-size: 24px; }}
#sup-tag {{ position: absolute; top: 22px; left: 22px; padding: 10px 16px; border-radius: 999px; background: rgba(7,6,11,0.75); font-family: "JetBrains Mono", monospace; font-size: 24px; color: #d9c8ff; border: 1px solid rgba(179,140,255,0.5); opacity: 0; }}
/* decohere */
#sc-decohere {{ gap: 60px; }}
#dc-sphere {{ width: 900px; height: 680px; border-radius: 26px; overflow: hidden; flex: none; }}
#dc-sphere video {{ width: 100%; height: 100%; object-fit: cover; }}
.dcol {{ display: flex; flex-direction: column; gap: 22px; }}
.dpair {{ display: flex; gap: 22px; }}
.dpair figure {{ margin: 0; position: relative; }}
.dpair img {{ width: 270px; height: 270px; border-radius: 18px; image-rendering: pixelated; display: block; }}
.dpair figcaption {{ position: absolute; left: 10px; bottom: 10px; font-family: "JetBrains Mono", monospace; font-size: 18px; background: rgba(0,0,0,0.7); padding: 4px 10px; border-radius: 999px; }}
/* echo */
#sc-echo {{ flex-direction: column; gap: 30px; }}
#ec-wave {{ position: relative; width: 1500px; height: 420px; border-radius: 22px; overflow: hidden; border: 1px solid rgba(255,255,255,0.09); }}
#ec-wave img {{ width: 100%; height: 100%; display: block; }}
#playhead {{ position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #fff; box-shadow: 0 0 14px #fff; opacity: 0; }}
.wlab {{ position: absolute; left: 18px; font-family: "JetBrains Mono", monospace; font-size: 20px; color: #a49fb8; }}
#ec-notes {{ font-family: "JetBrains Mono", monospace; font-size: 22px; color: #6f6a85; }}
#listen {{ font-family: "JetBrains Mono", monospace; font-size: 26px; color: #d9c8ff; opacity: 0; }}
/* measure */
#sc-measure {{ gap: 80px; }}
.shots {{ display: grid; grid-template-columns: repeat(10, 46px); gap: 8px; }}
.shot {{ width: 46px; height: 46px; border-radius: 8px; background: rgba(255,255,255,0.07); }}
.shot.h {{ background: #ffb547; }} .shot.t {{ background: #5fd4ff; }}
#cnt {{ font-size: 30px; margin-top: 22px; opacity: 0; }}
#cnt .pa {{ color: #ffb547; font-weight: 700; }} #cnt .pb {{ color: #5fd4ff; font-weight: 700; }}
.card {{ position: relative; width: 600px; padding: 30px; border-radius: 30px; background: #0d0b14; border: 1px solid rgba(255,255,255,0.12); box-sizing: border-box; }}
.card .stack {{ border: 4px solid transparent; border-radius: 24px; background: linear-gradient(#000,#000) padding-box, linear-gradient(100deg,#ffb547,#ff6bd6,#b38cff,#5fd4ff) border-box; }}
#ms-flash {{ position: absolute; inset: 0; background: #fff; opacity: 0; border-radius: 20px; }}
#ms-result {{ font-size: 46px; font-weight: 700; color: #5fd4ff; margin-top: 20px; opacity: 0; }}
#ms-super {{ font-size: 46px; font-weight: 700; color: #b38cff; margin-top: 20px; position: absolute; left: 30px; bottom: 30px; }}
/* outro */
#sc-outro {{ flex-direction: column; text-align: center; gap: 22px; }}
#o-word {{ font-size: 200px; font-weight: 700; line-height: 0.95; letter-spacing: -0.03em; }}
#o-url {{ font-family: "JetBrains Mono", monospace; font-size: 44px; color: #f1eefb; }}
#o-meta {{ font-size: 30px; color: #a49fb8; }}
#o-eng {{ display: flex; gap: 14px; }}
#o-eng span {{ font-family: "JetBrains Mono", monospace; font-size: 22px; padding: 10px 18px; border-radius: 999px; border: 1px solid rgba(179,140,255,0.5); color: #d9c8ff; }}
/* captions */
.cap {{ position: absolute; left: 0; right: 0; bottom: 52px; text-align: center; opacity: 0; z-index: 30; }}
.cap span {{ display: inline-block; max-width: 1500px; background: rgba(7,6,11,0.86); color: #f6f4fc; font-weight: 500; font-size: 42px; line-height: 1.25; padding: 12px 28px 14px; border-radius: 14px; box-shadow: 0 8px 28px rgba(0,0,0,0.5); }}
#fade {{ position: absolute; inset: 0; background: #07060b; opacity: 1; z-index: 40; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="{TOTAL:.3f}">
  <div class="aur"></div>
  <div class="brand"><b>⟨ψ⟩</b>Entangled</div>

  <section class="scene" id="sc-hook">
    <div class="ket a" id="hook-a">|Einstein⟩</div>
    <div id="hook-stack">{frame_stack("hk", 640)}</div>
    <div class="ket b" id="hook-b">|Bohr⟩</div>
    <div id="hook-psi">|ψ⟩ = |Einstein⟩ + |Bohr⟩</div>
  </section>

  <section class="scene" id="sc-title">
    <div>
      <h1 id="t-word" class="iri">Entangled</h1>
      <p id="t-tag">Two people. One quantum state.</p>
      <p id="t-moth">A quantum photobooth for two · built on Moth Quantum Atlas</p>
    </div>
    <div id="t-orb"><div class="ball"><img src="assets/img/f07.jpg" alt=""></div><div id="t-ring"></div></div>
  </section>

  <section class="scene" id="sc-choose">
    <div class="panel" style="width:1360px">
      <div class="step-tag">Step 1</div>
      <h2>Choose two faces</h2>
      <div class="pair">
        <div class="slot a" id="ch-a"><div class="frame"><img src="assets/img/einstein.jpg" alt=""></div><div class="namebox">Einstein</div><div class="btnrow"><span class="btn">📷 Camera</span><span class="btn">⬆ Upload</span></div></div>
        <div id="ch-x">⊗<small>ENTANGLE</small></div>
        <div class="slot b" id="ch-b"><div class="frame"><img src="assets/img/bohr.jpg" alt=""></div><div class="namebox">Bohr</div><div class="btnrow"><span class="btn">📷 Camera</span><span class="btn">⬆ Upload</span></div></div>
      </div>
      <div class="foot"><span class="btn primary" id="ch-btn">Entangle them ⊗</span></div>
    </div>
  </section>

  <section class="scene" id="sc-circuit">
    <div class="panel">
      <div class="step-tag">Step 2 · {jobs_n} real Moth jobs</div>
      <h2 style="font-size:52px">Entangling Einstein ⊗ Bohr</h2>
      <div class="wire"><div class="lab"><b>Teleport</b>telablur-v1</div><div class="track">{gates("tp", tp_labels)}</div><div class="lab">×{N}</div></div>
      <div class="wire"><div class="lab"><b>Decohere</b>tessa · fake_torino</div><div class="track">{gates("dc", ["A", "B"])}</div><div class="lab">IBM noise</div></div>
      <div class="wire"><div class="lab"><b>Echo</b>retrocausal-echo-v1</div><div class="track">{gates("ec", ["♪"])}</div><div class="lab">8 qubits</div></div>
      <div class="wire"><div class="lab"><b>Measure</b>coin-toss-v1</div><div class="track">{gates("ms", ["M"])}</div><div class="lab">100 shots</div></div>
      <div class="console"><div id="console-in">{console_html}</div></div>
      <div id="k-all">all {jobs_n} quantum jobs measured</div>
    </div>
  </section>

  <section class="scene" id="sc-teleport">
    <div class="player">
      <div style="position:relative">{frame_stack("tp", 620)}<div id="sup-tag">θ = 0.50 · neither of them</div></div>
      <div class="slider"><div id="thumb" style="left:0"></div></div>
      <div class="ends"><span style="color:#ffb547">Einstein</span><span style="color:#b38cff">θ</span><span style="color:#5fd4ff">Bohr</span></div>
    </div>
    <div id="tp-copy">
      <p class="eyebrow">Step 3 · Teleport</p>
      <h2>Quantum Teleblur</h2>
      <p class="body">Both faces become qubit amplitudes. Rotation gates teleport one into the other; θ is the rotation strength.</p>
    </div>
  </section>

  <section class="scene" id="sc-decohere">
    <div id="dc-sphere"><video id="sphere-vid" src="assets/media/sphere.mp4" data-start="{scene_win['decohere'][0]:.3f}" data-duration="{scene_win['decohere'][1] - scene_win['decohere'][0]:.3f}" data-track-index="1" muted playsinline></video></div>
    <div class="dcol">
      <p class="eyebrow">Decohere · tessa-image-v1</p>
      <h2 style="font-size:54px">Every pixel is a qubit</h2>
      <div class="dpair">
        <figure id="dc-a"><img src="assets/img/tessa_a.png" alt=""><figcaption>Einstein</figcaption></figure>
        <figure id="dc-b"><img src="assets/img/tessa_b.png" alt=""><figcaption>Bohr</figcaption></figure>
      </div>
      <p class="body" style="font-size:24px">Measured through fake_torino, a simulator calibrated to IBM Torino's noise.</p>
    </div>
  </section>

  <section class="scene" id="sc-echo">
    <div style="width:1500px"><p class="eyebrow">Echo · retrocausal-echo-v1</p><h2 style="font-size:54px">Your faces, as sound</h2></div>
    <div id="ec-wave"><img src="assets/img/wave.png" alt=""><span class="wlab" style="top:10px">melody · 8 + 8 notes from brightness</span><span class="wlab" style="top:200px">quantum echo · taps measured from a scrambled 8-qubit chain</span><div id="playhead"></div></div>
    <div id="ec-notes">notes (Hz): {notes}</div>
    <div id="listen">🔊 listen</div>
  </section>

  <section class="scene" id="sc-measure">
    <div>
      <p class="eyebrow">Step 4 · Measure · coin-toss-v1</p>
      <h2 style="font-size:54px">One qubit, 100 shots</h2>
      <div class="shots">{shots_html}</div>
      <div id="cnt"><span class="pa">{heads} × |Einstein⟩</span> · <span class="pb">{100 - heads} × |Bohr⟩</span></div>
    </div>
    <div class="card">
      <div class="stack" style="width:540px;height:540px">{ms_frames}<div id="ms-flash"></div></div>
      <div id="ms-result">Measured: |Bohr⟩</div>
      <div id="ms-super">superposition…</div>
    </div>
  </section>

  <section class="scene" id="sc-outro">
    <div id="o-word" class="iri">Entangled</div>
    <div id="o-url">entangled-quantum.vercel.app</div>
    <div id="o-meta">github.com/Mohammad-Umar7/entangled-quantum · Mohammad Umar · Qiskit Fall Fest 2026</div>
    <div id="o-eng"><span>telablur-v1</span><span>tessa-image-v1</span><span>retrocausal-echo-v1</span><span>coin-toss-v1</span><span>Moth Atlas</span></div>
  </section>

  <svg id="cursor" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#120f1c" stroke-width="1.5"/></svg>
  {caps}
  <div id="fade"></div>
{audio}
</div>
<script>
  const tl = gsap.timeline({{ paused: true }});
  {chr(10).join("  " + s for s in tw)}
  window.__timelines["main"] = tl;
</script>
</body>
</html>
"""
(HERE / "composition/index.html").write_text(page, encoding="utf-8")
print("TOTAL", TOTAL, "statements", len(tw))
for s, w in scene_win.items():
    print(s, w)
