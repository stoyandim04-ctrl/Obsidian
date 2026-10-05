"""Deterministic front-print texture for the canonical OBSIDIAN bottle.
Covers the flat front face of the glass body: 0.84 x 1.29 units (x -0.42..0.42, z 0.08..1.37).
Usage: python make_label.py 50|100
"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONTS = "/home/user/Obsidian/source/fonts"
OUT = "/home/user/Obsidian/source/textures"
PPU = 2400                      # pixels per bottle unit
FACE_W, FACE_Z0, FACE_Z1 = 0.84, 0.08, 1.37
W, H = round(FACE_W * PPU), round((FACE_Z1 - FACE_Z0) * PPU)
INK = (236, 229, 216, 255)      # warm off-white screen print


def font(name, px, wght=None):
    f = ImageFont.truetype(f"{FONTS}/{name}", px)
    if wght is not None:
        axes = f.get_variation_axes()
        vals = []
        for a in axes:
            n = a.get("name", b"")
            n = n.decode() if isinstance(n, bytes) else n
            vals.append(wght if n.lower().startswith("weight") else a["default"])
        f.set_variation_by_axes(vals)
    return f


def zpx(z):
    return round((FACE_Z1 - z) * PPU)


def tracked(d, text, f, cy, track_em, fill=INK, features=None):
    """Draw centred, letter-spaced text with its cap-height centred on cy (px)."""
    size = f.size
    widths = [f.getlength(c, features=features) for c in text]
    total = sum(widths) + track_em * size * (len(text) - 1)
    x = (W - total) / 2
    asc = f.getbbox("H", features=features)
    cap_top, cap_bot = asc[1], asc[3]
    y = cy - (cap_top + cap_bot) / 2
    for c, w in zip(text, widths):
        d.text((x, y), c, font=f, fill=fill, features=features)
        x += w + track_em * size


def make(size_ml):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    serif = "CormorantGaramond[wght].ttf"
    sans = "HankenGrotesk[wght].ttf"
    # Wordmark: cap height ~0.040 units
    tracked(d, "OBSIDIAN", font(serif, round(0.062 * PPU), 560), zpx(0.975), 0.42)
    # Fine brass-free hairline (printed)
    y = zpx(0.915)
    d.rectangle([W / 2 - 0.035 * PPU, y, W / 2 + 0.035 * PPU, y + 3], fill=INK)
    tracked(d, "No. 01", font(serif, round(0.044 * PPU), 520), zpx(0.862), 0.08, features=["lnum"])
    tracked(d, "EAU DE PARFUM", font(sans, round(0.0205 * PPU), 520), zpx(0.800), 0.32)
    tracked(d, f"{size_ml} mL", font(sans, round(0.0205 * PPU), 520), zpx(0.300), 0.18)
    img.save(f"{OUT}/label_{size_ml}ml.png")
    print("wrote", f"{OUT}/label_{size_ml}ml.png", img.size)


if __name__ == "__main__":
    for s in (sys.argv[1:] or ["50", "100"]):
        make(s)
