"""Generate one Kokoro WAV per voice-over line (American voice af_heart) and log durations."""
import json, subprocess, sys
from pathlib import Path
HERE = Path(__file__).parent
lines = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))
out = []
for ln in lines:
    wav = HERE / f"{ln['id']}.wav"
    if not wav.exists():
        r = subprocess.run(f'npx hyperframes tts "{ln["say"]}" --voice af_heart --output "{wav}"', shell=True, capture_output=True, text=True)
        if r.returncode:
            print("FAIL", ln["id"], r.stdout[-400:], r.stderr[-400:], flush=True); sys.exit(1)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav)], capture_output=True, text=True).stdout)
    out.append({"id": ln["id"], "dur": round(d, 3)})
    print(ln["id"], round(d, 2), flush=True)
(HERE / "durations.json").write_text(json.dumps(out, indent=1))
print("TOTAL", round(sum(o["dur"] for o in out), 1))
