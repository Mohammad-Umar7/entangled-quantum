"""Render a rotating Bloch sphere of both faces' Tessa-measured pixels to PNG frames.

Same mapping as public/js/sphere.js: hue -> azimuth phi, lightness -> polar angle theta.
Used for the demo video (deterministic frames instead of live WebGL).

  python scripts/render_sphere.py public/demo/tessa_a.png public/demo/tessa_b.png out_dir 900 600 150
"""
import colorsys
import math
import sys
from pathlib import Path

import site
sys.path.append(site.getusersitepackages())
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402


def points(path, seed):
    rng = np.random.default_rng(seed)
    px = np.asarray(Image.open(path).convert("RGB")).reshape(-1, 3)
    out = []
    for r, g, b in px:
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        theta = (1 - l) * math.pi
        phi = h * 2 * math.pi + (rng.random() * 2 * math.pi if s < 0.05 else 0)
        rad = 0.9 + 0.1 * s
        out.append((rad * math.sin(theta) * math.cos(phi), rad * math.cos(theta), rad * math.sin(theta) * math.sin(phi), (int(r), int(g), int(b))))
    return out


def main():
    a, b, out_dir, W, H, N = sys.argv[1], sys.argv[2], Path(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
    out_dir.mkdir(parents=True, exist_ok=True)
    pts = points(a, 1) + points(b, 2)
    R = min(W, H) * 0.36
    cx, cy = W / 2, H / 2 + 10
    tilt = math.radians(18)

    def project(x, y, z, ang):
        x2 = x * math.cos(ang) + z * math.sin(ang)
        z2 = -x * math.sin(ang) + z * math.cos(ang)
        y3 = y * math.cos(tilt) - z2 * math.sin(tilt)
        z3 = y * math.sin(tilt) + z2 * math.cos(tilt)
        persp = 1 / (1 + 0.18 * z3)
        return cx + x2 * R * persp, cy - y3 * R * persp, z3

    for f in range(N):
        ang = 2 * math.pi * f / N
        img = Image.new("RGB", (W, H), (7, 6, 11))
        glow = Image.new("RGB", (W, H), (0, 0, 0))
        d = ImageDraw.Draw(img)
        gd = ImageDraw.Draw(glow)
        # sphere outline, equator and two meridians
        for kind in ("equator", "m1", "m2"):
            seg = []
            for i in range(121):
                t = 2 * math.pi * i / 120
                if kind == "equator":
                    p = (math.cos(t), 0, math.sin(t))
                elif kind == "m1":
                    p = (math.cos(t), math.sin(t), 0)
                else:
                    p = (0, math.sin(t), math.cos(t))
                seg.append(project(*p, ang))
            for (x0, y0, z0), (x1, y1, z1) in zip(seg, seg[1:]):
                alpha = 70 if (z0 + z1) / 2 < 0 else 140
                d.line([(x0, y0), (x1, y1)], fill=(alpha, int(alpha * 0.78), int(alpha * 1.4) if alpha * 1.4 < 255 else 255), width=2)
        x0, y0, _ = project(0, 1.2, 0, ang)
        x1, y1, _ = project(0, -1.2, 0, ang)
        d.line([(x0, y0), (x1, y1)], fill=(120, 116, 140), width=2)
        # points, far to near
        proj = sorted((project(x, y, z, ang) + (c,) for x, y, z, c in pts), key=lambda p: p[2], reverse=True)
        for x, y, z, c in proj:
            near = 0.55 + 0.45 * (1 - (z + 1) / 2)
            col = tuple(min(255, int(v * near + 40)) for v in c)
            rr = 4.2 * (1.25 - 0.25 * z)
            gd.ellipse([x - rr * 2.2, y - rr * 2.2, x + rr * 2.2, y + rr * 2.2], fill=tuple(int(v * 0.5) for v in col))
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=col)
        glow = glow.filter(ImageFilter.GaussianBlur(7))
        img = Image.fromarray(np.clip(np.asarray(img, dtype=np.int16) + np.asarray(glow, dtype=np.int16), 0, 255).astype(np.uint8))
        d = ImageDraw.Draw(img)
        d.text((cx - 22, cy - R * 1.32 - 10), "|0>", fill=(241, 238, 251))
        d.text((cx - 22, cy + R * 1.25), "|1>", fill=(164, 159, 184))
        img.save(out_dir / f"s{f:04d}.png")


if __name__ == "__main__":
    main()
