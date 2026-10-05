"""Compose the canonical reference sheet and the 1200x630 OG image from render masters.

    /opt/bpyenv/bin/python source/scripts/compose.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
R = os.path.join(ROOT, "source", "renders")
FONTS = os.path.join(ROOT, "source", "fonts")
BG = (11, 12, 14)
TEXT = (242, 238, 231)
MUTED = (185, 178, 168)
ACCENT = (184, 146, 97)
LINE = (52, 51, 50)


def font(name, px, wght=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), px)
    if wght is not None:
        vals = []
        for a in f.get_variation_axes():
            n = a.get("name", b"")
            n = n.decode() if isinstance(n, bytes) else n
            vals.append(wght if n.lower().startswith("weight") else a["default"])
        f.set_variation_by_axes(vals)
    return f


SERIF = "CormorantGaramond[wght].ttf"
SANS = "HankenGrotesk[wght].ttf"


def lifted(path):
    """Load a render and lift pure black to the page background (same as build-media.mjs)."""
    im = Image.open(path).convert("RGB")
    r, g, b = im.split()
    r = r.point(lambda v: round(BG[0] + v * (255 - BG[0]) / 255))
    g = g.point(lambda v: round(BG[1] + v * (255 - BG[1]) / 255))
    b = b.point(lambda v: round(BG[2] + v * (255 - BG[2]) / 255))
    return Image.merge("RGB", (r, g, b))


def tracked(d, xy, text, f, fill, track=0.16, anchor_center=False):
    x, y = xy
    widths = [f.getlength(c) for c in text]
    total = sum(widths) + track * f.size * (len(text) - 1)
    if anchor_center:
        x -= total / 2
    for c, w in zip(text, widths):
        d.text((x, y), c, font=f, fill=fill)
        x += w + track * f.size
    return total


def reference_sheet():
    views = [
        ("ref_front.png", "Front"),
        ("ref_three_quarter.png", "Three-quarter"),
        ("ref_side.png", "Side"),
        ("ref_cap.png", "Cap detail"),
        ("ref_base.png", "Glass-base detail"),
    ]
    cell_w, cell_h = 720, 900
    pad, head, foot = 64, 220, 260
    W = pad * 2 + cell_w * 5 + 24 * 4
    H = head + cell_h + 70 + foot
    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    tracked(d, (pad, 64), "OBSIDIAN", font(SERIF, 64, 560), TEXT, 0.32)
    d.text((pad, 150), "No. 01 · Eau de Parfum — canonical product reference", font=font(SANS, 26, 450), fill=MUTED)
    tracked(d, (W - pad - 520, 80), "CONCEPT PROJECT BY 13:33", font(SANS, 20, 500), ACCENT, 0.16)
    for i, (f, label) in enumerate(views):
        x = pad + i * (cell_w + 24)
        im = lifted(os.path.join(R, f)).resize((cell_w, cell_h), Image.LANCZOS)
        sheet.paste(im, (x, head))
        tracked(d, (x, head + cell_h + 24), label.upper(), font(SANS, 18, 500), MUTED, 0.16)
    y = head + cell_h + 90
    d.line([(pad, y), (W - pad, y)], fill=LINE, width=1)
    spec = [
        ("Body", "1.00 w × 0.55 d × 1.45 h · corner radius 0.08"),
        ("Glass", "smoked, warm-tinted absorption · 0.05 walls · 0.20 thick base"),
        ("Neck", "0.10 h, glass"),
        ("Cap", "cylindrical, satin black · Ø 0.45 · 0.35 h incl. 0.022 warm-brass ring"),
        ("Total", "1.90 h"),
        ("Print", "OBSIDIAN / No. 01 / EAU DE PARFUM / 50 mL — deterministic texture, Cormorant Garamond + Hanken Grotesk"),
    ]
    fl, fv = font(SANS, 18, 600), font(SANS, 22, 400)
    for i, (k, v) in enumerate(spec):
        col, row = i % 2, i // 2
        x = pad + col * (W // 2)
        yy = y + 32 + row * 64
        tracked(d, (x, yy + 3), k.upper(), fl, ACCENT, 0.16)
        d.text((x + 120, yy), v, font=fv, fill=TEXT)
    out = os.path.join(ROOT, "portfolio", "reference", "obsidian-no01-reference-sheet.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out, quality=88, optimize=True, progressive=True)
    sheet.resize((W // 2, H // 2), Image.LANCZOS).save(out.replace(".jpg", "-small.jpg"), quality=86, optimize=True)
    print("wrote", out, sheet.size)


def og_image():
    hero = lifted(os.path.join(R, "hero_desktop.png"))
    # 1200x630 crop keeping the bottle right and the quiet left for type
    W, H = 1200, 630
    scale = H / 1440 * 1.08
    im = hero.resize((round(2560 * scale), round(1440 * scale)), Image.LANCZOS)
    left = round(im.width * 0.69 - W * 0.70)
    top = round(im.height * 0.53 - H * 0.53)
    og = im.crop((left, top, left + W, top + H))
    d = ImageDraw.Draw(og)
    tracked(d, (72, 150), "OBSIDIAN — NO. 01", font(SANS, 18, 520), ACCENT, 0.16)
    d.text((68, 190), "Leave an", font=font(SERIF, 92, 420), fill=TEXT)
    d.text((68, 282), "impression.", font=font(SERIF, 92, 420), fill=TEXT)
    d.text((72, 420), "A fragrance website concept by 13:33", font=font(SANS, 24, 420), fill=MUTED)
    d.text((72, 540), "Fictional brand · portfolio demonstration", font=font(SANS, 18, 420), fill=MUTED)
    out = os.path.join(ROOT, "public", "og-image.jpg")
    og.save(out, quality=86, optimize=True, progressive=True)
    print("wrote", out, og.size, os.path.getsize(out) // 1024, "KB")


if __name__ == "__main__":
    og_image()
    if all(os.path.exists(os.path.join(R, f)) for f in ("ref_front.png", "ref_three_quarter.png", "ref_side.png", "ref_cap.png", "ref_base.png")):
        reference_sheet()
    else:
        print("reference views not rendered yet")
