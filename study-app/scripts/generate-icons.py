"""Renders Vidya's app icon, adaptive icon layers, splash mark and favicon."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
S = 1024
SS = 4  # supersampling


def aurora_bg(size):
    y, x = np.mgrid[0:size, 0:size] / size
    base = np.zeros((size, size, 3))
    base[..., :] = np.array([6, 6, 12]) / 255

    def glow(cx, cy, r, color, k):
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        a = np.clip(1 - d / r, 0, 1) ** 2 * k
        return a[..., None] * (np.array(color) / 255)

    img = base + glow(0.2, 0.15, 0.9, (120, 84, 255), 0.95) + glow(0.95, 0.55, 0.8, (47, 107, 255), 0.7) + glow(0.35, 1.0, 0.7, (24, 183, 154), 0.45)
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype("uint8"), "RGB")


def mark(size, color=(255, 255, 255, 255)):
    """Stylised V: two strokes meeting at a point, with a spark above (knowledge / light)."""
    big = size * SS
    im = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = int(big * 0.085)
    top_y, bot_y = big * 0.33, big * 0.72
    left, right, mid = big * 0.30, big * 0.70, big * 0.5
    d.line([(left, top_y), (mid, bot_y)], fill=color, width=w, joint="curve")
    d.line([(mid, bot_y), (right, top_y)], fill=color, width=w, joint="curve")
    for (px, py) in [(left, top_y), (right, top_y), (mid, bot_y)]:
        d.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=color)
    # spark: four-point star
    cx, cy, r = mid, big * 0.24, big * 0.075
    pts = []
    for i in range(8):
        ang = np.pi / 4 * i - np.pi / 2
        rr = r if i % 2 == 0 else r * 0.28
        pts.append((cx + rr * np.cos(ang), cy + rr * np.sin(ang)))
    d.polygon(pts, fill=color)
    return im.resize((size, size), Image.LANCZOS)


def with_glow(m, radius):
    g = m.filter(ImageFilter.GaussianBlur(radius))
    out = Image.new("RGBA", m.size, (0, 0, 0, 0))
    out.alpha_composite(g)
    out.alpha_composite(g)
    out.alpha_composite(m)
    return out


bg = aurora_bg(S).convert("RGBA")
m = with_glow(mark(S), 18)
icon = bg.copy()
icon.alpha_composite(m)
icon.convert("RGB").save(OUT / "icon.png")

# Android adaptive: background + foreground (mark scaled into the 66% safe zone)
bg.convert("RGB").save(OUT / "android-icon-background.png")
fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
small = with_glow(mark(int(S * 0.66)), 12)
fg.alpha_composite(small, ((S - small.width) // 2, (S - small.height) // 2))
fg.save(OUT / "android-icon-foreground.png")
mono = Image.new("RGBA", (S, S), (0, 0, 0, 0))
mono.alpha_composite(mark(int(S * 0.66)), ((S - small.width) // 2, (S - small.height) // 2))
mono.save(OUT / "android-icon-monochrome.png")

# Splash mark (transparent) + favicon
with_glow(mark(512), 10).save(OUT / "splash-icon.png")
icon.convert("RGB").resize((96, 96), Image.LANCZOS).save(OUT / "favicon.png")
print("icons written")
