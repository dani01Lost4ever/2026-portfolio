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

# 4. the icon: ink rounded square, the mark at 62% of the width, optically a touch above centre
def icon(size, radius_pct=0.2266, ink="#0B0B0C", letters="#F2EEE6", accent="#FF5A3C"):
    mw = size * 0.64
    s = mw / W
    mh = H * s
    ox, oy = (size - mw) / 2, (size - mh) / 2 - size * 0.015
    r = size * radius_pct
    body = f'<rect width="{size}" height="{size}" rx="{r:.1f}" fill="{ink}"/><g transform="translate({ox:.2f} {oy:.2f}) scale({s:.5f})">{mark(letters, accent)}</g>'
    return svg(body, size, size)

(out_dir / "icon-512.svg").write_text(icon(512), encoding="utf-8")
(out_dir / "favicon.svg").write_text(icon(64), encoding="utf-8")
# 5. the avatar: a disc
def avatar(size):
    mw = size * 0.58
    s = mw / W; mh = H * s
    ox, oy = (size - mw) / 2, (size - mh) / 2 - size * 0.015
    body = f'<circle cx="{size/2}" cy="{size/2}" r="{size/2}" fill="#0B0B0C"/><g transform="translate({ox:.2f} {oy:.2f}) scale({s:.5f})">{mark("#F2EEE6", "#FF5A3C")}</g>'
    return svg(body, size, size)
(out_dir / "avatar-512.svg").write_text(avatar(512), encoding="utf-8")
print("written:", sorted(p.name for p in out_dir.iterdir()))
