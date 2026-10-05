from PIL import Image, ImageDraw, ImageFont
import os
D = "/home/user/Obsidian/source/fonts"
serifs = [("CormorantGaramond[wght].ttf", 500), ("Cormorant[wght].ttf", 400), ("BodoniModa[opsz,wght].ttf", 400),
          ("Fraunces[SOFT,WONK,opsz,wght].ttf", 300), ("InstrumentSerif-Regular.ttf", None), ("Gloock-Regular.ttf", None),
          ("Italiana-Regular.ttf", None), ("PlayfairDisplay[wght].ttf", 400), ("Newsreader[opsz,wght].ttf", 300)]
W, rowh = 2000, 230
img = Image.new("RGB", (W, rowh * len(serifs) + 40), (11, 12, 14))
d = ImageDraw.Draw(img)
lab = ImageFont.truetype(f"{D}/Inter[opsz,wght].ttf", 20)
for i, (f, w) in enumerate(serifs):
    y = 20 + i * rowh
    def ft(sz):
        F = ImageFont.truetype(f"{D}/{f}", sz)
        if w:
            try:
                axes = F.get_variation_axes()
                vals = []
                for a in axes:
                    n = a.get("name", b"")
                    n = n.decode() if isinstance(n, bytes) else n
                    if n.lower().startswith("weight"): vals.append(w)
                    elif n.lower().startswith("optical"): vals.append(a["maximum"])
                    else: vals.append(a["default"])
                F.set_variation_by_axes(vals)
            except Exception as e: print(f, e)
        return F
    d.text((30, y), f, font=lab, fill=(185, 178, 168))
    # wordmark with tracking
    x = 30; F = ft(64)
    for ch in "OBSIDIAN":
        d.text((x, y + 40), ch, font=F, fill=(242, 238, 231)); x += F.getlength(ch) + 22
    d.text((760, y + 30), "Leave an impression.", font=ft(96), fill=(242, 238, 231))
    d.text((30, y + 140), "No. 01   EAU DE PARFUM   50 mL", font=ft(34), fill=(184, 146, 97))
img.save("/tmp/claude-0/-home-user-Obsidian/a89c0c98-50d5-571a-8682-f0bb20756822/scratchpad/serifs.png")
sans = ["InstrumentSans[wdth,wght].ttf", "Manrope[wght].ttf", "HankenGrotesk[wght].ttf", "Inter[opsz,wght].ttf"]
img = Image.new("RGB", (1400, 140 * len(sans)), (11, 12, 14)); d = ImageDraw.Draw(img)
for i, f in enumerate(sans):
    F = ImageFont.truetype(f"{D}/{f}", 18); G = ImageFont.truetype(f"{D}/{f}", 28)
    d.text((30, 20 + i*140), f, font=lab, fill=(185,178,168))
    d.text((30, 50 + i*140), "A fragrance concept in dark glass. Bergamot, iris and amber, imagined in contrast.", font=G, fill=(242,238,231))
    d.text((30, 95 + i*140), "THE FRAGRANCE    THE OBJECT    DISCOVER    ADD TO DEMO BAG    €140", font=F, fill=(185,178,168))
img.save("/tmp/claude-0/-home-user-Obsidian/a89c0c98-50d5-571a-8682-f0bb20756822/scratchpad/sans.png")
