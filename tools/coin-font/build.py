"""Builds the Check Flip coin: a colour font with one glyph for ¤ (U+00A4, the generic currency sign).
The game writes every amount as ¤<number>; the page loads this font for that one character only
(unicode-range), so the sign shows as a gold coin with a fork and spoon in any text, button or canvas.
Run: python3 tools/coin-font/build.py  (needs fonttools) -> prints the @font-face rule for style.css."""
import base64, io, math
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.colorLib.builder import buildCOLR, buildCPAL

UPM, ADV, CX, CY = 1000, 960, 480, 340
K = 0.5522847

def glyph(draw):
    tt = TTGlyphPen(None); pen = Cu2QuPen(tt, 1.0, reverse_direction=True); draw(pen); return tt.glyph()

def circle(pen, cx, cy, r, ry=None):
    ry = ry or r
    pen.moveTo((cx + r, cy))
    pen.curveTo((cx + r, cy + ry * K), (cx + r * K, cy + ry), (cx, cy + ry))
    pen.curveTo((cx - r * K, cy + ry), (cx - r, cy + ry * K), (cx - r, cy))
    pen.curveTo((cx - r, cy - ry * K), (cx - r * K, cy - ry), (cx, cy - ry))
    pen.curveTo((cx + r * K, cy - ry), (cx + r, cy - ry * K), (cx + r, cy))
    pen.closePath()

def rect(pen, x0, y0, x1, y1, rad=0):
    if not rad:
        pen.moveTo((x0, y0)); pen.lineTo((x1, y0)); pen.lineTo((x1, y1)); pen.lineTo((x0, y1)); pen.closePath(); return
    r = rad
    pen.moveTo((x0 + r, y0)); pen.lineTo((x1 - r, y0)); pen.curveTo((x1 - r + r * K, y0), (x1, y0 + r - r * K), (x1, y0 + r))
    pen.lineTo((x1, y1 - r)); pen.curveTo((x1, y1 - r + r * K), (x1 - r + r * K, y1), (x1 - r, y1))
    pen.lineTo((x0 + r, y1)); pen.curveTo((x0 + r - r * K, y1), (x0, y1 - r + r * K), (x0, y1 - r))
    pen.lineTo((x0, y0 + r)); pen.curveTo((x0, y0 + r - r * K), (x0 + r - r * K, y0), (x0 + r, y0)); pen.closePath()

R = 440
def rim(p): circle(p, CX, CY, R)
def face(p): circle(p, CX, CY, R - 58)
def shine(p): circle(p, CX - 235, CY + 185, 45, 80)
def cutlery(p):
    # fork (left): three tines, a bridge and a handle
    fx = CX - 105
    for dx in (-58, 0, 58):
        rect(p, fx + dx - 22, CY + 60, fx + dx + 22, CY + 270, 20)
    rect(p, fx - 80, CY + 10, fx + 80, CY + 100, 40)
    rect(p, fx - 30, CY - 280, fx + 30, CY + 40, 28)
    # spoon (right): oval bowl and a handle
    sx = CX + 115
    circle(p, sx, CY + 150, 85, 125)
    rect(p, sx - 30, CY - 280, sx + 30, CY + 60, 28)
names = ['.notdef', 'space', 'currency', 'c.rim', 'c.face', 'c.shine', 'c.cut']
fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(names)
fb.setupCharacterMap({0x20: 'space', 0xA4: 'currency'})
empty = glyph(lambda p: None)
fb.setupGlyf({'.notdef': empty, 'space': empty, 'currency': glyph(face), 'c.rim': glyph(rim), 'c.face': glyph(face), 'c.shine': glyph(shine), 'c.cut': glyph(cutlery)})
glyf = fb.font['glyf']
def lsb(n):
    g = glyf[n]; g.recalcBounds(glyf); return getattr(g, 'xMin', 0)
fb.setupHorizontalMetrics({n: (ADV if n != 'space' else 250, lsb(n)) for n in names})
fb.setupHorizontalHeader(ascent=900, descent=-200)
fb.setupNameTable({'familyName': 'CFCoin', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=900, sTypoDescender=-200, usWinAscent=900, usWinDescent=200)
fb.setupPost()
fb.font['CPAL'] = buildCPAL([[(0.66, 0.45, 0.02, 1.0), (0.99, 0.78, 0.18, 1.0), (1.0, 0.93, 0.6, 1.0), (0.55, 0.33, 0.0, 1.0)]])
fb.font['COLR'] = buildCOLR({'currency': [('c.rim', 0), ('c.face', 1), ('c.shine', 2), ('c.cut', 3)]}, version=0)
buf = io.BytesIO(); fb.font.flavor = 'woff'; fb.font.save(buf)
data = base64.b64encode(buf.getvalue()).decode()
print(f"@font-face{{font-family:CFCoin;src:url(data:font/woff;base64,{data}) format('woff');unicode-range:U+00A4;font-display:block}}")
