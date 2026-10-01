import json, sys, colorsys
INK = '#131a26'
def dark(h, f=.62):
    h = h.lstrip('#'); r, g, b = (int(h[i:i+2], 16)/255 for i in (0, 2, 4))
    hh, l, s = colorsys.rgb_to_hls(r, g, b); l = max(0, l*f)
    r, g, b = colorsys.hls_to_rgb(hh, l, min(1, s*1.05)); return '#%02x%02x%02x' % tuple(round(v*255) for v in (r, g, b))

class I:
    def __init__(s, style): s.st = style; s.out = []; s.defs = []
    def sw(s): return 2.4 if s.st == 'A' else 1.7
    def oc(s, fill): return INK if s.st == 'A' else ('#5a6474' if fill == 'none' else dark(fill))
    def shape(s, tag, fill, **a):
        a = {k.replace('_', '-'): v for k, v in a.items()}
        a.setdefault('stroke', s.oc(fill)); a.setdefault('stroke-width', s.sw()); a['stroke-linejoin'] = 'round'
        s.out.append(f'<{tag} fill="{fill}" ' + ' '.join(f'{k}="{v}"' for k, v in a.items()) + '/>')
    def path(s, d, fill, **a): s.shape('path', fill, d=d, **a)
    def circ(s, cx, cy, r, fill, **a): s.shape('circle', fill, cx=cx, cy=cy, r=r, **a)
    def rect(s, x, y, w, h, fill, rx=0, **a): s.shape('rect', fill, x=x, y=y, width=w, height=h, rx=rx, **a)
    def line(s, d, col=None, w=None, base=None, **a):
        col = col or (INK if s.st == 'A' else dark(base or '#888888', .45))
        a = ' '.join(f'{k.replace("_","-")}="{v}"' for k, v in a.items())
        s.out.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w or s.sw()}" stroke-linecap="round" stroke-linejoin="round" {a}/>')
    def tube(s, d, col, w):  # thick stroked shape with outline
        s.line(d, s.oc(col), w + 2*s.sw()); s.line(d, col, w)
    def raw(s, x): s.out.append(x)
    def svg(s): return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' + (('<defs>' + ''.join(s.defs) + '</defs>') if s.defs else '') + ''.join(s.out) + '</svg>'

def start(i):
    i.tube('M12 6 V43', '#8a94a6', 2.6)
    flag = 'M13 8 Q20 4.5 26 8 Q32 11.5 39 8 V26 Q32 29.5 26 26 Q20 22.5 13 26 Z'
    i.defs.append(f'<clipPath id="fl{i.st}"><path d="{flag}"/></clipPath>')
    i.path(flag, '#ffffff', stroke='none')
    sq = ''.join(f'<rect x="{13+c*6.5}" y="{3+r*6}" width="6.5" height="6" fill="{INK}"/>' for r in range(5) for c in range(4) if (r + c) % 2 == 0)
    i.raw(f'<g clip-path="url(#fl{i.st})"><g transform="skewY(-3)">{sq}</g></g>')
    i.path(flag, 'none')
def half(i):
    i.tube('M9 27 A15 15 0 0 1 37 22', '#3a7fc2', 5)
    i.path('M31 21 L43 19 L38 30 Z', '#3a7fc2')
    i.circ(24, 34, 8, '#f6c445'); i.circ(24, 34, 4.6, 'none', stroke=dark('#f6c445', .7), stroke_width=1.6)
def kemer(i):
    i.rect(3, 19, 42, 10, '#8a5a3a', rx=2.5)
    for x in (34, 39): i.circ(x, 24, 1.3, '#4a2e1c', stroke='none')
    i.rect(13, 14, 15, 20, '#f6c445', rx=3.5); i.rect(17, 18, 7, 12, '#8a5a3a', rx=1.5)
    i.line('M20.5 24 H31', '#d9d9d9' if i.st == 'B' else '#e8e8e8', 2.6)
def sans(i):
    i.raw('<g transform="rotate(-14 24 26)">'); i.rect(11, 9, 22, 31, '#e2483d', rx=4); i.raw('</g>')
    i.raw('<g transform="rotate(8 24 26)">'); i.rect(15, 8, 22, 31, '#ffffff', rx=4)
    i.line('M21.5 19 Q21.5 13.5 26 13.5 Q30.5 13.5 30.5 18 Q30.5 21.5 26.5 23 L26 27', '#e2483d', 3.4)
    i.circ(26, 32.5, 2, '#e2483d', stroke='none'); i.raw('</g>')
def olay(i):
    i.circ(24, 15.5, 3, '#c9d1dc')
    i.path('M8 34 A16 16 0 0 1 40 34 Z', '#e9eef4')
    i.line('M14 29 A10.5 10.5 0 0 1 20 21', '#ffffff', 2.4)
    i.rect(4, 33.5, 40, 5, '#c9d1dc', rx=2.5)
def gelir(i):
    g, e = '#f6c445', dark('#f6c445', .72)
    for y in (36, 31, 26):
        i.path(f'M5 {y} V{y+4} A9 3.4 0 0 0 23 {y+4} V{y} Z', e)
        i.raw(f'<ellipse cx="14" cy="{y}" rx="9" ry="3.4" fill="{g}" stroke="{i.oc(g)}" stroke-width="{i.sw()}"/>')
    i.circ(32, 22, 11, g); i.circ(32, 22, 7.4, 'none', stroke=e, stroke_width=1.6)
    i.circ(32, 22, 2.8, 'none', stroke=e, stroke_width=1.8)
    i.line('M28.5 18.5 L30 20 M35.5 18.5 L34 20 M28.5 25.5 L30 24 M35.5 25.5 L34 24', e, 1.8)
def fatura(i):
    i.path('M11 5 H37 V41 L33.75 38 L30.5 41 L27.25 38 L24 41 L20.75 38 L17.5 41 L14.25 38 L11 41 Z', '#ffffff')
    i.line('M16 12 H32 M16 17 H27 M16 22 H30', '#9aa3b2', 2)
    i.line('M16 30 H22', INK if i.st == 'A' else '#5a6474', 2.4); i.rect(25, 27.5, 8, 5, '#e2483d', rx=1.5, stroke='none')
def atis(i):
    d = 'M14 39 C18 33 24 30 29 25 C35 19 34 10 27 10 C21 10 21 18 24 22 C27 26 32 31 34 39 M24 22 C21 18 19 10 13 11 C8 12 8 19 12 23 C16 27 24 28 31 27'
    d = 'M16 41 C18 35 21 31.5 26 28 C31 24.5 39 24 39 16.5 C39 9.5 32 6.5 24 6.5 C16 6.5 9 9.5 9 16.5 C9 24 17 24.5 22 28 C27 31.5 30 35 32 41'
    i.tube(d, '#c06a2b', 5.2)
    for x, y in ((16, 9), (32, 9), (24, 6.8), (11, 20), (37, 20), (19, 36), (29, 36)): i.rect(x-1, y-.8, 2, 1.6, '#ffffff', rx=.5, stroke='none')
def spor(i):
    i.rect(9, 22, 30, 4, '#a7b1c2', rx=2)
    for x in (3, 39): i.rect(x, 17, 6, 14, '#3a7fc2', rx=2)
    for x in (8, 34): i.rect(x, 12, 6, 24, '#3a7fc2', rx=2)
def kisa(i):
    for x in (5, 23): i.path(f'M{x} 12 L{x+19} 24 L{x} 36 Z', '#1b9a86')
def geri(i):
    for x in (43, 25): i.path(f'M{x} 12 L{x-19} 24 L{x} 36 Z', '#e2483d')
def mola(i):
    i.line('M17 8 Q14 11 17 14 M24 6 Q21 9.5 24 13', '#9aa3b2', 2.2)
    i.raw(f'<ellipse cx="22" cy="41" rx="17" ry="3.4" fill="#e9eef4" stroke="{i.oc("#e9eef4")}" stroke-width="{i.sw()}"/>')
    i.tube('M34 23 Q42 23 42 28.5 Q42 34 33 34', '#ffffff', 3.2)
    i.path('M8 18 H36 V29 Q36 40 22 40 Q8 40 8 29 Z', '#ffffff')
    i.raw(f'<ellipse cx="22" cy="18" rx="14" ry="2.6" fill="#7a4a2f" stroke="{i.oc("#ffffff")}" stroke-width="{i.sw()}"/>')
def mekan(i):
    i.rect(8, 18, 32, 23, '#ffffff'); i.rect(20, 27, 8, 14, '#8b5cf6')
    i.rect(11, 23, 6, 6, '#cfe3f7', rx=1); i.rect(31, 23, 6, 6, '#cfe3f7', rx=1)
    sc = ''.join(f' L{6+k*6+3} 22 L{6+k*6+6} 18' if False else '' for k in range(6))
    i.path('M5 10 H43 V18 Q39.8 22 36.7 18 Q33.5 22 30.3 18 Q27.2 22 24 18 Q20.8 22 17.7 18 Q14.5 22 11.3 18 Q8.2 22 5 18 Z', '#8b5cf6')
    for k in (1, 3, 5): i.rect(5 + k*6.33, 10, 6.33, 9.5, '#ffffff', stroke='none')
    i.path('M5 10 H43 V18 Q39.8 22 36.7 18 Q33.5 22 30.3 18 Q27.2 22 24 18 Q20.8 22 17.7 18 Q14.5 22 11.3 18 Q8.2 22 5 18 Z', 'none', stroke=i.oc('#8b5cf6'))
def pizza(i):
    i.path('M10 15 Q24 8 38 15 L24 43 Z', '#f7c948')
    for x, y, r in ((19, 19, 3.1), (28.5, 19.5, 2.9), (23.5, 28.5, 2.8)): i.circ(x, y, r, '#d9433a', stroke_width=i.sw()*.7)
    i.path('M6 13 Q24 2 42 13 L39.5 18 Q24 9 8.5 18 Z', '#d98a3a')
def sushi(i):
    i.rect(7, 25, 34, 14, '#fbf7ee', rx=7)
    i.path('M5 25 Q8 13 24 13 Q40 13 43 23 Q41 28 24 28 Q9 28 5 25 Z', '#f58a5b')
    i.line('M13 17.5 Q16 21 15 26 M21 15 Q24 20 23 27 M30 15 Q33 20 32 27', '#fde3d3', 1.8)
    i.rect(20.5, 12, 7, 27.5, '#26332d', rx=1.5)
def burger(i):
    b = '#e9a24a'
    i.rect(8, 32, 32, 8, b, rx=3.5)
    i.rect(7, 25, 34, 7.5, '#7a4a2f', rx=3.5)
    i.path('M9 25 H39 L35 30 L31 26.5 L27 30 L23 26.5 L19 30 L15 26.5 L11 29.5 Z', '#ffc93c')
    i.path('M6 23 Q9 26.5 12 23 Q15 26.5 18 23 Q21 26.5 24 23 Q27 26.5 30 23 Q33 26.5 36 23 Q39 26.5 42 23 V21 H6 Z', '#6cc04a', stroke=dark('#6cc04a', .6) if i.st == 'B' else INK, stroke_width=i.sw()*.6)
    i.path('M7 21.5 Q7 8 24 8 Q41 8 41 21.5 Z', b)
    for x, y, r in ((17, 13, -20), (24, 11.5, 0), (31, 13, 20), (20.5, 17, -10), (28, 17, 10)): i.raw(f'<ellipse cx="{x}" cy="{y}" rx="1.4" ry=".8" fill="#fff6dd" transform="rotate({r} {x} {y})"/>')
def taco(i):
    i.path('M7 32 Q8 15 24 14 Q40 15 41 32 Z', '#6cc04a')
    for x, y in ((15, 21), (25, 17.5), (33, 22)): i.circ(x, y, 2.6, '#e2483d', stroke_width=i.sw()*.7)
    i.path('M4 36 Q5 21 24 21 Q43 21 44 36 Z', '#f2c14e')
    for x, y in ((13, 30), (20, 26), (28, 26.5), (35, 30), (24, 32)): i.circ(x, y, 1, dark('#f2c14e', .75), stroke='none')

ICONS = dict(start=start, half=half, kemer=kemer, sans=sans, olay=olay, gelir=gelir, fatura=fatura, atis=atis, spor=spor, kisa=kisa, geri=geri, mola=mola, mekan=mekan, pizza=pizza, sushi=sushi, burger=burger, taco=taco)
out = {}
for st in 'A':
    out[st] = {}
    for k, f in ICONS.items():
        i = I(st); f(i); out[st][k] = i.svg()
pass
print('ok', len(ICONS))

# v1.14: style A as an ES module, outlines follow currentColor (dark theme can lighten them)
A = {k: v.replace('stroke="#131a26"', 'stroke="currentColor"').replace('clip-path="url(#flA)"', 'clip-path="url(#cf-fl)"').replace('id="flA"', 'id="cf-fl"') for k, v in out['A'].items()}
js = ['/** Check Flip — board square icons (drawn for v1.14, outlines use currentColor). Source: tools/icons/gen.py */', 'export const SQI = {']
js += [f"  {k}: '{v}'," for k, v in A.items()]
js[-1] = js[-1].rstrip(',')
js += ['};', "export const ico = (k, cls) => SQI[k] ? `<span class=\"sqi${cls ? ' ' + cls : ''}\" aria-hidden=\"true\">${SQI[k]}</span>` : '';", '']
open('public/js/icons.js', 'w').write('\n'.join(js))
