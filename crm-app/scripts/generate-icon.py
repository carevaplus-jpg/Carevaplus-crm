"""Generates the Careva+ CRM app icon (crown monogram on navy, gold accent)."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets-src"
OUT.mkdir(exist_ok=True)
S = 1024
SS = 4
NAVY_DEEP = np.array([6, 10, 20])
NAVY = np.array([17, 27, 48])
GOLD = (201, 162, 39, 255)


def navy_gradient(size):
    y, x = np.mgrid[0:size, 0:size] / size
    d = np.sqrt((x - 0.35) ** 2 + (y - 0.3) ** 2)
    t = np.clip(d / 0.9, 0, 1)[..., None]
    img = NAVY_DEEP * t + NAVY * (1 - t)
    return Image.fromarray(img.astype("uint8"), "RGB").convert("RGBA")


def crown(size, fg=GOLD):
    big = size * SS
    im = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    left, right = big * 0.14, big * 0.86
    base_top, base_bottom = big * 0.60, big * 0.74
    d.rectangle([left, base_top, right, base_bottom], fill=fg)
    pts = [
        (left, base_top), (big * 0.27, big * 0.26), (big * 0.40, big * 0.50),
        (big * 0.50, big * 0.16), (big * 0.60, big * 0.50),
        (big * 0.73, big * 0.26), (right, base_top),
    ]
    d.polygon(pts, fill=fg)
    for cx in (left, big * 0.27, 0.5 * big, big * 0.73, right):
        r = big * 0.038
        d.ellipse([cx - r, base_top - r * 1.7, cx + r, base_top + r * 0.5], fill=fg)
    return im.resize((size, size), Image.LANCZOS)


def with_glow(mark, radius):
    from PIL import ImageFilter

    g = mark.filter(ImageFilter.GaussianBlur(radius))
    out = Image.new("RGBA", mark.size, (0, 0, 0, 0))
    out.alpha_composite(g)
    out.alpha_composite(mark)
    return out


def icon_square(size):
    img = navy_gradient(size)
    c = with_glow(crown(int(size * 0.5)), int(size * 0.02))
    img.alpha_composite(c, ((size - c.width) // 2, int(size * 0.26)))
    return img


icon_square(S).convert("RGB").save(OUT / "icon-1024.png")

bg = navy_gradient(S)
bg.convert("RGB").save(OUT / "android-background.png")

fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
c = with_glow(crown(int(S * 0.42)), int(S * 0.015))
fg.alpha_composite(c, ((S - c.width) // 2, (S - c.height) // 2))
fg.save(OUT / "android-foreground.png")

mono = Image.new("RGBA", (S, S), (0, 0, 0, 0))
mono_crown = crown(int(S * 0.42), fg=(255, 255, 255, 255))
mono.alpha_composite(mono_crown, ((S - mono_crown.width) // 2, (S - mono_crown.height) // 2))
mono.save(OUT / "android-monochrome.png")

splash = navy_gradient(2732)
sc = with_glow(crown(760), 18)
splash.alpha_composite(sc, ((2732 - sc.width) // 2, (2732 - sc.height) // 2))
splash.convert("RGB").save(OUT / "splash.png")

print("icons written to", OUT)
