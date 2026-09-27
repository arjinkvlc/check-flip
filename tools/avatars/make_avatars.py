#!/usr/bin/env python3
"""Generates the game's original avatar illustrations (public/assets/avatars/*.svg).

Flat, round "badge" portraits built from shared parts (head, hair, hats,
mustaches, clothes) so they look like one family. Run:
    python3 tools/avatars/make_avatars.py
"""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'avatars')
INK = '#2b2530'


def darker(hexc, k=0.82):
    h = hexc.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return '#%02x%02x%02x' % (int(r * k), int(g * k), int(b * k))


# ---------------------------------------------------------------- parts
def body(color, collar=None, v=False):
    s = f'<path d="M8 104 C10 84 28 75 50 75 C72 75 90 84 92 104 Z" fill="{color}"/>'
    s += f'<path d="M8 104 C10 84 28 75 50 75 C72 75 90 84 92 104 Z" fill="none" stroke="{darker(color, .75)}" stroke-width="1.2" opacity=".5"/>'
    if v:
        s += f'<path d="M40 76 L50 90 L60 76 Z" fill="{collar or darker(color)}"/>'
    return s


def neck(skin):
    return f'<path d="M42 60 L42 74 Q50 80 58 74 L58 60 Z" fill="{darker(skin, .88)}"/>'


def head(skin, jaw=21):
    sh = darker(skin, .9)
    return (f'<ellipse cx="31" cy="50" rx="4.6" ry="5.6" fill="{sh}"/><ellipse cx="69" cy="50" rx="4.6" ry="5.6" fill="{sh}"/>'
            f'<ellipse cx="50" cy="48" rx="19" ry="{jaw}" fill="{skin}"/>')


def face(skin, mood='smile', lashes=False, brows='#3a2a22', blush=True):
    s = ''
    if blush:
        s += '<ellipse cx="40" cy="56" rx="3.8" ry="2.3" fill="#ff8a7a" opacity=".32"/><ellipse cx="60" cy="56" rx="3.8" ry="2.3" fill="#ff8a7a" opacity=".32"/>'
    # eyes
    for x in (43, 57):
        s += f'<ellipse cx="{x}" cy="49" rx="2.3" ry="2.9" fill="{INK}"/><circle cx="{x + .8}" cy="48" r=".8" fill="#fff"/>'
        if lashes:
            d = -1 if x < 50 else 1
            s += f'<path d="M{x + 2 * d} 46.6 l{1.6 * d} -1.4" stroke="{INK}" stroke-width="1.1" stroke-linecap="round"/>'
    if brows:
        s += f'<path d="M39.5 43.5 Q43 41.6 46.5 43" stroke="{brows}" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
        s += f'<path d="M53.5 43 Q57 41.6 60.5 43.5" stroke="{brows}" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
    s += f'<path d="M49 51.5 Q48 55 50.5 55.2" stroke="{darker(skin, .75)}" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    if mood == 'smile':
        s += f'<path d="M44.5 59 Q50 64.5 55.5 59" stroke="{INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
    elif mood == 'grin':
        s += f'<path d="M44 58.5 Q50 66 56 58.5 Z" fill="{INK}"/><path d="M45.8 59.4 Q50 61 54.2 59.4 L54 60.6 Q50 61.8 46 60.6 Z" fill="#fff"/>'
    elif mood == 'smirk':
        s += f'<path d="M45 60 Q51 62.5 56 58" stroke="{INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
    elif mood == 'lips':
        s += '<path d="M45.5 59 Q50 63.5 54.5 59 Q50 60.3 45.5 59 Z" fill="#c9455a"/>'
    return s


def glasses(color=INK, sun=False):
    fill = '#2b2530' if sun else 'rgba(255,255,255,.18)'
    return (f'<rect x="37" y="45" width="11" height="8" rx="3.5" fill="{fill}" stroke="{color}" stroke-width="1.8"/>'
            f'<rect x="52" y="45" width="11" height="8" rx="3.5" fill="{fill}" stroke="{color}" stroke-width="1.8"/>'
            f'<path d="M48 48.5 Q50 47.2 52 48.5" stroke="{color}" stroke-width="1.6" fill="none"/>')


def toque(color='#ffffff', band='#e9e6ee', tall=1.0):
    h = 16 * tall
    y0 = 31
    top = y0 - h
    sh = darker(color, .9)
    return (f'<path d="M34 {y0} L34 {y0 - 7} L66 {y0 - 7} L66 {y0} Z" fill="{band}"/>'
            f'<circle cx="37" cy="{top + 8}" r="9" fill="{color}"/><circle cx="50" cy="{top + 3}" r="11" fill="{color}"/><circle cx="63" cy="{top + 8}" r="9" fill="{color}"/>'
            f'<path d="M30 {top + 10} Q50 {top + 20} 70 {top + 10} L66 {y0 - 7} L34 {y0 - 7} Z" fill="{color}"/>'
            f'<path d="M36 {top + 12} Q40 {top + 18} 42 {y0 - 8}" stroke="{sh}" stroke-width="1.4" fill="none"/>'
            f'<path d="M58 {top + 12} Q60 {top + 18} 58 {y0 - 8}" stroke="{sh}" stroke-width="1.4" fill="none"/>')


def mustache(kind, color):
    if kind == 'handlebar':   # "pala bıyık"
        return (f'<path d="M50 56.5 C46 53.5 40 54 36 57 C32 60 29 58.5 29.5 55 C30 58 33 58 36.5 55.2 C41 51.8 47 52.6 50 54.6 '
                f'C53 52.6 59 51.8 63.5 55.2 C67 58 70 58 70.5 55 C71 58.5 68 60 64 57 C60 54 54 53.5 50 56.5 Z" fill="{color}"/>')
    if kind == 'curl':        # Italian
        return (f'<path d="M50 56 C47 54 42 54 39.5 56.5 C37.5 58.5 35 58 35 55.8 C36.2 57 37.6 56.4 39 54.6 C42 51.6 47 52.4 50 54.2 '
                f'C53 52.4 58 51.6 61 54.6 C62.4 56.4 63.8 57 65 55.8 C65 58 62.5 58.5 60.5 56.5 C58 54 53 54 50 56 Z" fill="{color}"/>')
    return ''


def badge(bg, inner):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            f'<defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath>'
            f'<radialGradient id="g" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="{bg}"/><stop offset="1" stop-color="{darker(bg, .8)}"/></radialGradient></defs>'
            f'<g clip-path="url(#c)"><rect width="100" height="100" fill="url(#g)"/>{inner}</g></svg>')


def chef_jacket(color='#ffffff', buttons='#2b2530', scarf=None):
    s = body(color)
    s += f'<path d="M50 76 L50 104" stroke="{darker(color, .85)}" stroke-width="1.2"/>'
    for y in (86, 95):
        s += f'<circle cx="44" cy="{y}" r="1.6" fill="{buttons}"/><circle cx="56" cy="{y}" r="1.6" fill="{buttons}"/>'
    if scarf:
        s += (f'<path d="M38 74 Q50 82 62 74 L60 80 Q50 86 40 80 Z" fill="{scarf}"/>'
              f'<path d="M49 80 L44 92 L50 89 L55 93 L52 80 Z" fill="{darker(scarf, .85)}"/>')
    else:
        s += f'<path d="M40 75 L50 82 L60 75" stroke="{darker(color, .8)}" stroke-width="2" fill="none"/>'
    return s


# ---------------------------------------------------------------- avatars
def waiter():
    skin = '#f2c7a0'; hair = '#3b2a20'
    s = body('#23262f', v=True, collar='#ffffff')
    s += '<path d="M44 80 L50 84 L56 80 L56 86 L50 83 L44 86 Z" fill="#d23c3c"/>'  # bow tie
    s += neck(skin) + head(skin)
    s += f'<path d="M31 45 C30 30 40 24 51 24 C63 24 71 31 69 45 C66 36 60 33 50 34 C43 34 36 36 31 45 Z" fill="{hair}"/>'
    s += f'<path d="M50 34 C54 30 60 29 64 32" stroke="{darker(hair, .7)}" stroke-width="1.4" fill="none"/>'
    s += face(skin, 'smile')
    return badge('#8fb8e8', s)


def waitress():
    skin = '#f5d0b0'; hair = '#b0522c'
    s = f'<path d="M66 40 C80 44 82 64 74 76 C72 64 70 54 64 48 Z" fill="{hair}"/>'  # ponytail
    s += body('#2f6f8f')
    s += '<path d="M36 80 L64 80 L66 104 L34 104 Z" fill="#fff"/><path d="M36 80 L64 80" stroke="#e0dde6" stroke-width="2"/>'  # apron
    s += neck(skin) + head(skin)
    s += f'<path d="M30 48 C28 30 40 23 51 23 C63 23 72 31 70 48 C67 38 60 33 50 33 C45 38 38 41 30 48 Z" fill="{hair}"/>'
    s += '<circle cx="67" cy="38" r="3.2" fill="#ffd166"/>'  # hair tie
    s += face(skin, 'smile', lashes=True, brows=darker(hair, .7))
    return badge('#f4b6c2', s)


def student():
    skin = '#c98e62'; hair = '#1e1a1d'
    s = body('#f0a33a')
    s += '<path d="M40 76 Q50 84 60 76" stroke="#d98a24" stroke-width="3" fill="none"/>'  # hoodie collar
    s += '<path d="M44 82 L44 94 M56 82 L56 94" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'  # strings
    s += neck(skin) + head(skin)
    s += f'<path d="M31 44 C31 33 40 28 50 28 C60 28 69 33 69 44 C63 39 56 38 50 38 C44 38 37 39 31 44 Z" fill="{hair}"/>'
    # backwards cap
    s += '<path d="M30 40 C30 24 42 18 50 18 C60 18 70 24 70 40 C60 34 40 34 30 40 Z" fill="#3a7fc2"/>'
    s += '<path d="M24 41 C26 36 32 35 36 37 L34 41 Z" fill="#2c6399"/><circle cx="50" cy="19.5" r="2" fill="#2c6399"/>'
    s += face(skin, 'grin')
    return badge('#9ad3c8', s)


def foodie():
    skin = '#f1c9a5'; hair = '#2d2438'
    s = f'<path d="M28 50 C22 70 30 84 38 86 L38 60 Z M72 50 C78 70 70 84 62 86 L62 60 Z" fill="{hair}"/>'  # long hair back
    s += body('#8b5cf6')
    s += neck(skin) + head(skin)
    s += f'<path d="M29 52 C26 30 40 22 51 22 C64 22 74 30 71 52 C69 42 64 36 58 33 C50 38 38 40 29 52 Z" fill="{hair}"/>'
    s += face(skin, 'lips', lashes=True, brows=hair)
    s += glasses('#d23c3c')
    return badge('#ffd98a', s)


def italian():
    skin = '#efc09a'; hair = '#2e2420'
    s = chef_jacket(scarf='#d23c3c')
    s += neck(skin) + head(skin)
    s += f'<path d="M31 44 C31 36 36 33 40 33 L38 42 Z M69 44 C69 36 64 33 60 33 L62 42 Z" fill="{hair}"/>'  # sideburns
    s += toque()
    s += face(skin, 'smile', brows=hair)
    s += mustache('curl', hair)
    return badge('#9fd39a', s)


def doner():
    skin = '#d9a27a'; hair = '#1f1a18'
    s = body('#ffffff')
    s += '<path d="M30 84 L70 84 L72 104 L28 104 Z" fill="#e2483d"/><path d="M30 84 L70 84" stroke="#b3342b" stroke-width="2"/>'  # red apron
    s += neck(skin) + head(skin, 22)
    # white kitchen cap (kep)
    s += '<path d="M30 38 C30 26 40 21 50 21 C60 21 70 26 70 38 Z" fill="#ffffff"/><path d="M30 38 L70 38 L70 42 L30 42 Z" fill="#e2e0e8"/>'
    s += face(skin, 'grin', brows=hair)
    s += f'<path d="M38.5 42.5 Q43 39.6 47 42.2 M53 42.2 Q57 39.6 61.5 42.5" stroke="{hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'  # bushy brows
    s += mustache('handlebar', hair)
    return badge('#f6c065', s)


def noodle():
    skin = '#f3d2ae'; hair = '#1c1a22'
    s = body('#1f4e79')
    s += '<path d="M38 75 L50 88 L62 75" stroke="#fff" stroke-width="3" fill="none"/>'  # kimono-like collar
    s += '<path d="M38 75 L50 88" stroke="#d23c3c" stroke-width="1.4"/>'
    s += neck(skin) + head(skin)
    s += f'<path d="M32 46 C32 38 38 34 44 34 L40 44 Z M68 46 C68 38 62 34 56 34 L60 44 Z" fill="{hair}"/>'
    # wide conical straw hat
    s += ('<path d="M6 42 L50 12 L94 42 Q50 50 6 42 Z" fill="#e7c36a"/>'
          '<path d="M6 42 Q50 50 94 42 Q50 46 6 42 Z" fill="#c9a34e"/>'
          '<path d="M50 12 L28 43 M50 12 L40 45 M50 12 L60 45 M50 12 L72 43" stroke="#c9a34e" stroke-width="1.2"/>'
          '<path d="M34 44 Q50 48 66 44" stroke="#8a5a2b" stroke-width="2.4" fill="none"/>')
    s += face(skin, 'smile', brows=hair)
    return badge('#ff9f80', s)


def baker():
    skin = '#8d5a3b'; hair = '#1b1412'
    s = f'<path d="M28 46 C20 62 26 78 34 80 L36 56 Z M72 46 C80 62 74 78 66 80 L64 56 Z" fill="{hair}"/>'  # curls back
    s += chef_jacket('#fff5f8', buttons='#e76f98')
    s += neck(skin) + head(skin)
    s += f'<circle cx="31" cy="44" r="5" fill="{hair}"/><circle cx="69" cy="44" r="5" fill="{hair}"/>'
    s += toque('#ffe3ee', band='#ffc2d6', tall=.8)
    s += face(skin, 'smile', lashes=True, brows=hair)
    s += '<circle cx="66" cy="60" r="2.2" fill="#ffffff" opacity=".85"/>'  # flour dot
    return badge('#c7b6f2', s)


def grandma():
    skin = '#f0c8a8'; hair = '#d9dbe3'
    s = body('#7a4fa8')
    s += '<path d="M34 82 L66 82 L68 104 L32 104 Z" fill="#f7f3e6"/>'
    s += '<path d="M34 90 L66 90 M34 97 L66 97" stroke="#e2483d" stroke-width="1.6" opacity=".7"/>'  # apron stripes
    s += f'<circle cx="50" cy="25" r="9" fill="{hair}"/><path d="M44 22 Q50 18 56 22" stroke="#b8bcc8" stroke-width="1.2" fill="none"/>'  # bun
    s += neck(skin) + head(skin)
    s += f'<path d="M30 48 C28 31 40 27 50 27 C62 27 72 31 70 48 C66 38 58 35 50 35 C42 35 34 38 30 48 Z" fill="{hair}"/>'
    s += '<path d="M40 30 Q46 33 50 31 M52 31 Q57 33 62 31" stroke="#b8bcc8" stroke-width="1" fill="none"/>'
    s += face(skin, 'smile', brows='#9a9aa6')
    s += glasses('#9b6a2a')
    s += '<path d="M40 61 Q42 62 43 60.5 M57 60.5 Q58 62 60 61" stroke="#c9967a" stroke-width="1" fill="none"/>'  # smile lines
    return badge('#ffcf9e', s)


def critic():
    skin = '#f6d5bb'; hair = '#111013'
    s = f'<path d="M29 46 C24 60 28 72 33 74 L36 54 Z M71 46 C76 60 72 72 67 74 L64 54 Z" fill="{hair}"/>'  # bob
    s += body('#26262e', v=True, collar='#f0ad2c')
    s += neck(skin) + head(skin)
    s += f'<path d="M29 52 C27 34 38 27 50 27 C62 27 73 34 71 52 C68 42 60 36 50 36 C42 36 33 42 29 52 Z" fill="{hair}"/>'
    s += '<path d="M26 34 C28 22 44 18 56 20 C68 22 76 28 72 34 C62 30 40 30 26 34 Z" fill="#d23c3c"/><circle cx="52" cy="19" r="2" fill="#a92c2c"/>'  # beret
    s += face(skin, 'smirk', brows=hair, blush=False)
    s += glasses(sun=True)
    return badge('#9fb6c9', s)


AVATARS = {
    'waiter': waiter, 'waitress': waitress, 'student': student, 'foodie': foodie,
    'italian': italian, 'doner': doner, 'noodle': noodle, 'baker': baker, 'grandma': grandma, 'critic': critic,
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for k, fn in AVATARS.items():
        with open(os.path.join(OUT, k + '.svg'), 'w') as f:
            f.write(fn())
    print('wrote', len(AVATARS), 'avatars to', os.path.normpath(OUT))
