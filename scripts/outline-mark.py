"""Outline the db. monogram from Archivo 800 expanded into SVG paths, and write the logo files.

Usage: python scripts/outline-mark.py <Archivo[wdth,wght].ttf> <out dir>
The font is Google Fonts' variable Archivo (github.com/google/fonts, ofl/archivo). Needs fontTools.
Copy the results to public/ and the paths into src/lib/mark.ts.
"""
import json, sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

font_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
font = instancer.instantiateVariableFont(TTFont(font_path), {"wdth": 125, "wght": 800})
upem = font["head"].unitsPerEm
cmap = font.getBestCmap()
gs = font.getGlyphSet()
hmtx = font["hmtx"]

TRACK = -0.05  # em, as the canvas's letter-spacing
def glyph(ch):
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip(".")); gs[name].draw(pen)
    bp = BoundsPen(gs); gs[name].draw(bp)
    return {"d": pen.getCommands(), "adv": hmtx[name][0], "bounds": bp.bounds}

d, b, dot = glyph("d"), glyph("b"), glyph(".")
# pen x positions (font units), tracking applied after each letter
x_d = 0
x_b = x_d + d["adv"] + TRACK * upem
x_dot = x_b + b["adv"] + TRACK * upem
# tight box around the ink
xmin = min(x_d + d["bounds"][0], x_b + b["bounds"][0])
xmax = x_dot + dot["bounds"][2]
ymin = min(d["bounds"][1], b["bounds"][1], dot["bounds"][1])
ymax = max(d["bounds"][3], b["bounds"][3])
W, H = xmax - xmin, ymax - ymin
print(json.dumps({"upem": upem, "W": W, "H": H, "ratio": round(W / H, 4), "dotBounds": dot["bounds"], "xDot": x_dot}))

def path(g, x, fill):
    # font units are y-up; flip into SVG with a transform
    return f'<path transform="translate({x - xmin:.1f} {ymax:.1f}) scale(1 -1)" d="{g["d"]}" fill="{fill}"/>'

def mark(letters, accent):
    return path(d, x_d, letters) + path(b, x_b, letters) + path(dot, x_dot, accent)

def svg(body, w, h, extra=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}"{extra}>{body}</svg>\n'

# 1. the mark alone, ink letters and the hot dot, transparent
(out_dir / "db-ink.svg").write_text(svg(mark("#0B0B0C", "#FF5A3C"), W, H), encoding="utf-8")
# 2. the mark in paper, for dark grounds
(out_dir / "db-paper.svg").write_text(svg(mark("#F2EEE6", "#FF5A3C"), W, H), encoding="utf-8")
# 3. the mark in currentColor with the dot in hot: for inline use in the site
(out_dir / "db-current.svg").write_text(svg(mark("currentColor", "#FF5A3C"), W, H), encoding="utf-8")

# 4. the icon: F12 on the canvas, the whole square in the hot accent with the mark in ink (the system rounds it);
#    the favicon and the avatar are the same as a disc; a paper disc with the hot dot is the quiet alternative
HOT, INK, PAPER = "#FF5A3C", "#0B0B0C", "#F2EEE6"
def placed(size, share, letters, accent):
    mw = size * share
    s = mw / W
    mh = H * s
    ox, oy = (size - mw) / 2, (size - mh) / 2 - size * 0.015
    return f'<g transform="translate({ox:.2f} {oy:.2f}) scale({s:.5f})">{mark(letters, accent)}</g>'

def square(size, ground, letters, accent, radius_pct=0.0):
    r = f' rx="{size * radius_pct:.1f}"' if radius_pct else ''
    return svg(f'<rect width="{size}" height="{size}"{r} fill="{ground}"/>' + placed(size, 0.64, letters, accent), size, size)

def disc(size, ground, letters, accent):
    return svg(f'<circle cx="{size/2}" cy="{size/2}" r="{size/2}" fill="{ground}"/>' + placed(size, 0.6, letters, accent), size, size)

(out_dir / "icon-512.svg").write_text(square(512, HOT, INK, INK), encoding="utf-8")
(out_dir / "icon-ink-512.svg").write_text(square(512, INK, PAPER, HOT, 0.2266), encoding="utf-8")
(out_dir / "favicon.svg").write_text(disc(64, HOT, INK, INK), encoding="utf-8")
(out_dir / "avatar-512.svg").write_text(disc(512, HOT, INK, INK), encoding="utf-8")
(out_dir / "avatar-paper-512.svg").write_text(disc(512, PAPER, INK, HOT), encoding="utf-8")
print("written:", sorted(p.name for p in out_dir.iterdir()))
