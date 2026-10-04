/**
 * Check Flip — page-background layers of the seasonal events (v1.17).
 * Each theme gives `style()` (its pictures for the light and the dark theme, as data URIs) and `html`
 * (the pieces placed in #evbg). Layout and animation classes are in css/style.css.
 * Everything is drawn here in the same flat style as the avatars and board icons; no outside images.
 */
const enc = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
const SVG = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body}</svg>`;
// light and dark variants: v(':root', L) + v(':root[data-theme="dark"]', D)
const both = (fn, L, D) => fn(':root', L) + '\n' + fn(':root[data-theme="dark"]', D);
// fixed pseudo-random numbers, so every visit looks the same
const rnd = seed => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
// points along a hanging string (two sagging spans across the top), in % of the width and px from the top
function catenary(n, sag) {
  const out = [];
  for (const [x0, x1] of [[0, 50], [50, 100]]) for (let k = 1; k <= n; k++) {
    const t = k / (n + 1), x = x0 + (x1 - x0) * t, y = 6 + 4 * sag * t * (1 - t);
    out.push([x, y]);
  }
  return out;
}
const WIRE = (c, sag) => SVG('0 0 1000 60', `<path d="M0 6 Q250 ${6 + 2 * sag} 500 6 Q750 ${6 + 2 * sag} 1000 6" fill="none" stroke="${c}" stroke-width="2"/>`, ' preserveAspectRatio="none"');

/* =============== Halloween =============== */
const WEB = c => SVG('0 0 200 200', `<g fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round"><path d="M0 0 L200 0 M0 0 L0 200 M0 0 L190 70 M0 0 L150 130 M0 0 L110 170 M0 0 L70 192"/><path d="M34 0 Q33 12 32 12 Q27 18 26 26 Q18 27 12 32 Q12 33 0 34"/><path d="M76 0 Q70 26 64 24 Q60 40 52 46 Q46 56 36 58 Q30 66 22 66 Q26 72 0 76"/><path d="M124 0 Q114 40 104 38 Q98 62 86 70 Q78 86 64 90 Q56 104 40 106 Q40 116 0 124"/><path d="M172 0 Q160 54 146 54 Q138 84 122 94 Q110 118 90 124 Q80 142 58 146 Q56 160 0 172"/></g>`);
const SPIDER = c => SVG('0 0 30 30', `<g stroke="${c}" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M15 15 L5 9 M15 15 L4 15 M15 15 L5 21 M15 15 L25 9 M15 15 L26 15 M15 15 L25 21"/></g><ellipse cx="15" cy="15" rx="5" ry="6" fill="${c}"/><circle cx="13.3" cy="12.5" r="1" fill="#ffd75a"/><circle cx="16.7" cy="12.5" r="1" fill="#ffd75a"/>`);
const BAT = c => SVG('0 0 60 30', `<path d="M30 12 Q27 6 30 5 Q31 8 32 5 Q35 6 32 12 Q40 4 50 6 Q46 10 47 14 Q42 12 40 16 Q36 13 33 17 L30 22 L27 17 Q24 13 20 16 Q18 12 13 14 Q14 10 10 6 Q20 4 28 12 Z" fill="${c}"/>`);
const GRAVES = (c1, c2) => SVG('0 0 1600 160', `<path d="M0 110 Q200 70 420 100 T860 96 T1300 92 T1600 100 L1600 160 L0 160 Z" fill="${c2}"/><path d="M0 130 Q260 96 520 124 T1040 120 T1600 126 L1600 160 L0 160 Z" fill="${c1}"/><g fill="${c1}"><path d="M180 128 L180 98 Q192 84 204 98 L204 128 Z"/><rect x="186" y="104" width="12" height="3" fill="${c2}"/><path d="M240 130 L240 108 Q250 98 260 108 L260 130 Z"/><path d="M1180 124 L1180 92 Q1194 76 1208 92 L1208 124 Z"/><path d="M1226 126 L1226 104 Q1236 94 1246 104 L1246 126 Z"/><path d="M640 128 L646 40 L652 128 Z M646 70 L620 52 M646 62 L676 44 M646 90 L626 80 M646 84 L670 74" stroke="${c1}" stroke-width="5" stroke-linecap="round"/><path d="M1420 126 L1425 56 L1430 126 Z M1425 80 L1404 66 M1425 74 L1450 60" stroke="${c1}" stroke-width="4" stroke-linecap="round"/><path d="M880 128 L880 116 L930 116 L930 128 M886 116 L886 108 M898 116 L898 106 M910 116 L910 108 M922 116 L922 106" stroke="${c1}" stroke-width="3"/></g>`, ' preserveAspectRatio="none"');
const halloween = {
  style: () => both((s, L) => `${s} #evbg .web{background-image:${enc(WEB(L.web))}} ${s} #evbg .thread{background:${L.web}} ${s} #evbg .thread i{background-image:${enc(SPIDER(L.spider))}}
    ${s} #evbg .bat{background-image:${enc(BAT(L.bat))}} ${s} #evbg .hills{background-image:${enc(GRAVES(L.h1, L.h2))}}`,
  {web: 'rgba(80,60,120,.22)', spider: '#5d4a7e', bat: '#6e5a92', h1: '#d9d2e6', h2: '#e6e0ee'},
  {web: 'rgba(225,215,255,.30)', spider: '#0c0812', bat: '#0c0812', h1: '#120b1d', h2: '#1f1530'}),
  html: `<div class="moon"></div><div class="web tl"></div><div class="web tr"></div><div class="web bl"></div>
  <div class="thread" style="left:9vw;height:120px"><i></i></div><div class="thread" style="right:14vw;height:170px;animation-delay:-2s"><i></i></div>
  ${[[12, 18, 1], [28, 26, .7], [8, 34, .8], [20, 12, .6], [36, 30, .9]].map(([top, d, s], k) => `<div class="bat" style="top:${top}vh;--d:${d}s;--s:${s};animation-delay:-${k * 5}s"></div>`).join('')}
  ${[[3, 62, 5], [95, 55, 7.5], [2, 88, 9], [97, 84, 6.5], [50, 93, 8], [30, 95, 11]].map(([x, y, b], k) => `<div class="eyes" style="left:calc(${x}vw - 13px);top:${y}vh;--b:${b}s;animation-delay:-${k * 1.7}s"><i></i><i></i></div>`).join('')}
  <div class="hills"></div>`
};

/* =============== New Year: string lights, pine sprigs with ornaments, snow, a snowy village =============== */
function pineSprig(needle, orn) {
  let g = `<path d="M-4 -4 Q70 30 168 62" fill="none" stroke="#5b3b22" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 0; i < 16; i++) {
    const t = i / 15, x = -4 + 172 * t, y = -4 + 66 * t - 18 * t * (1 - t), l = 26 - 10 * t;
    g += `<path d="M${x} ${y} l${-l * .55} ${l * .8} M${x} ${y} l${l * .75} ${-l * .55} M${x} ${y} l${l * .2} ${l * .9}" stroke="${needle}" stroke-width="3.4" stroke-linecap="round"/>`;
  }
  [[52, 22, 26, orn[0]], [104, 44, 34, orn[1]], [146, 56, 22, orn[2]]].forEach(([x, y, d, c]) => {
    g += `<path d="M${x} ${y} L${x} ${y + d}" stroke="#c9b37a" stroke-width="1.2"/><rect x="${x - 3}" y="${y + d - 2}" width="6" height="4" rx="1" fill="#d8c48a"/>
      <circle cx="${x}" cy="${y + d + 9}" r="9" fill="${c}"/><circle cx="${x - 3}" cy="${y + d + 6}" r="2.6" fill="#fff" opacity=".55"/>`;
  });
  return SVG('0 0 200 120', g);
}
const VILLAGE = (snow, snow2, tree, house, win) => {
  const tr = (x, h) => `<path d="M${x} ${132 - h} L${x - h * .32} ${132 - h * .55} L${x - h * .2} ${132 - h * .55} L${x - h * .4} ${132 - h * .15} L${x + h * .4} ${132 - h * .15} L${x + h * .2} ${132 - h * .55} L${x + h * .32} ${132 - h * .55} Z" fill="${tree}"/><path d="M${x} ${132 - h} L${x - h * .12} ${132 - h * .82} L${x + h * .12} ${132 - h * .82} Z" fill="${snow}"/>`;
  return SVG('0 0 1600 160', `<path d="M0 112 Q220 80 460 104 T940 98 T1380 94 T1600 104 L1600 160 L0 160 Z" fill="${snow2}"/>
    ${[[90, 70], [140, 52], [1300, 64], [1350, 84], [1410, 56], [700, 46]].map(([x, h]) => tr(x, h)).join('')}
    <g><path d="M1000 132 L1000 100 L1030 80 L1060 100 L1060 132 Z" fill="${house}"/><path d="M994 102 L1030 76 L1066 102 L1060 104 L1030 84 L1000 104 Z" fill="${snow}"/>
    <rect x="1010" y="108" width="14" height="12" fill="${win}"/><rect x="1036" y="108" width="14" height="12" fill="${win}"/><rect x="1040" y="84" width="8" height="12" fill="${house}"/></g>
    <path d="M0 132 Q260 104 520 126 T1040 122 T1600 128 L1600 160 L0 160 Z" fill="${snow}"/>`, ' preserveAspectRatio="none"');
};
const BULBS = ['#ff4d5e', '#ffd34d', '#4dd17a', '#4db8ff', '#ff8a3d', '#c77dff'];
const newyear = {
  style: () => both((s, L) => `${s} #evbg .wire{background-image:${enc(WIRE(L.wire, 22))}} ${s} #evbg .sprig{background-image:${enc(pineSprig(L.needle, L.orn))}}
    ${s} #evbg .hills{background-image:${enc(VILLAGE(L.snow, L.snow2, L.tree, L.house, L.win))}}`,
  {wire: '#5c6b80', needle: '#5f8f74', orn: ['#e0525e', '#e6b84a', '#5aa0d8'], snow: '#ffffff', snow2: '#eef3f9', tree: '#8fb1a0', house: '#b9a690', win: '#ffd987'},
  {wire: '#2a3550', needle: '#1f5a43', orn: ['#d93a48', '#e8b23a', '#3d8fd1'], snow: '#cfdcee', snow2: '#9fb2cc', tree: '#0f2d24', house: '#3a2a20', win: '#ffcf6b'}),
  html: (() => {
    const r = rnd(7);
    const bulbs = catenary(7, 22).map(([x, y], k) => `<i class="bulb" style="left:${x}%;top:${y}px;--bc:${BULBS[k % BULBS.length]};animation-delay:-${(r() * 3).toFixed(2)}s"></i>`).join('');
    const flakes = Array.from({length: 36}, () => `<i class="flake" style="left:${(r() * 100).toFixed(1)}vw;--sz:${(3 + r() * 4).toFixed(1)}px;--d:${(9 + r() * 10).toFixed(1)}s;animation-delay:-${(r() * 18).toFixed(1)}s"></i>`).join('');
    const stars = Array.from({length: 22}, () => `<i class="star" style="left:${(r() * 100).toFixed(1)}vw;top:${(8 + r() * 50).toFixed(1)}vh;animation-delay:-${(r() * 4).toFixed(1)}s"></i>`).join('');
    return `${stars}<div class="wire">${bulbs}</div><div class="sprig tr"></div>${flakes}<div class="hills"></div>`;
  })()
};

/* =============== Valentine's Day: rose vines, a heart garland, floating hearts, sparkles, rose bushes =============== */
// a rose: five round outer petals, a darker heart and a light swirl
const ROSE = (x, y, r, c, d) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${(Math.cos(a * Math.PI / 180) * r * .5).toFixed(1)}" cy="${(Math.sin(a * Math.PI / 180) * r * .5).toFixed(1)}" r="${(r * .58).toFixed(1)}" fill="${c}"/>`).join('')}<circle r="${(r * .55).toFixed(1)}" fill="${d}"/><path d="M${-r * .25} 0 a${r * .25} ${r * .25} 0 1 1 ${r * .3} ${r * .2}" fill="none" stroke="${c}" stroke-width="${(r * .14).toFixed(1)}" stroke-linecap="round"/></g>`;
const LEAF = (x, y, a, c) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="4.2" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`;
const ROSEVINE = (stem, leaf, rose, dark) => SVG('0 0 200 200', `<path d="M-4 -4 Q60 20 90 60 T170 120 M30 8 Q20 50 40 90 T30 170" fill="none" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>
  ${[[40, 14, 20], [76, 40, 60], [118, 82, 15], [150, 104, 70], [24, 44, -60], [36, 98, 40], [28, 140, -50]].map(([x, y, a]) => LEAF(x, y, a, leaf)).join('')}
  ${ROSE(60, 26, 13, rose, dark)}${ROSE(132, 96, 11, rose, dark)}${ROSE(34, 120, 12, rose, dark)}${ROSE(98, 64, 8, rose, dark)}`);
const HEART = c => SVG('0 0 24 22', `<path d="M12 21 C-6 9 3 -4 12 5 C21 -4 30 9 12 21 Z" fill="${c}"/>`);
const BUSHES = (g1, g2, rose) => {
  const r = rnd(3); let dots = '';
  for (let k = 0; k < 46; k++) { const x = r() * 1600, y = 108 + r() * 34; dots += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(3 + r() * 3).toFixed(1)}" fill="${rose}"/>`; }
  return SVG('0 0 1600 160', `<path d="M0 118 Q60 90 120 112 Q180 84 250 110 Q320 88 390 114 Q470 92 540 116 Q620 94 700 118 Q780 96 860 116 Q940 92 1020 114 Q1100 90 1180 112 Q1260 88 1340 110 Q1420 90 1500 112 Q1560 96 1600 108 L1600 160 L0 160 Z" fill="${g2}"/>
    <path d="M0 134 Q90 112 180 130 Q280 110 380 132 Q480 114 580 134 Q680 116 780 134 Q880 114 980 132 Q1080 112 1180 132 Q1280 114 1380 132 Q1480 116 1600 130 L1600 160 L0 160 Z" fill="${g1}"/>${dots}`, ' preserveAspectRatio="none"');
};
const valentine = {
  style: () => both((s, L) => `${s} #evbg .wire{background-image:${enc(WIRE(L.wire, 18))}} ${s} #evbg .vine{background-image:${enc(ROSEVINE(L.stem, L.leaf, L.rose, L.dark))}}
    ${s} #evbg .hang,${s} #evbg .fheart{background-image:${enc(HEART(L.heart))}} ${s} #evbg .hang.b{background-image:${enc(HEART(L.heart2))}}
    ${s} #evbg .hills{background-image:${enc(BUSHES(L.g1, L.g2, L.rose))}}`,
  {wire: '#c99aae', stem: '#7f9a74', leaf: '#93b585', rose: '#e8607f', dark: '#b13a5a', heart: '#f08aa8', heart2: '#ffffff', g1: '#e9d5dd', g2: '#f1e2e8'},
  {wire: '#6a3248', stem: '#2f4a2c', leaf: '#3c6436', rose: '#d6335e', dark: '#8f1738', heart: '#ff5c8a', heart2: '#ffd1de', g1: '#1d0b14', g2: '#2c1020'}),
  html: (() => {
    const r = rnd(11);
    const hang = catenary(6, 18).map(([x, y], k) => `<i class="hang${k % 2 ? ' b' : ''}" style="left:${x}%;top:${y}px;animation-delay:-${(r() * 3).toFixed(2)}s"></i>`).join('');
    const hearts = Array.from({length: 14}, () => `<i class="fheart" style="left:${(r() * 100).toFixed(1)}vw;--sz:${(12 + r() * 14).toFixed(0)}px;--d:${(12 + r() * 10).toFixed(1)}s;animation-delay:-${(r() * 20).toFixed(1)}s"></i>`).join('');
    const sparks = Array.from({length: 12}, () => `<i class="spark" style="left:${(r() * 100).toFixed(1)}vw;top:${(10 + r() * 70).toFixed(1)}vh;animation-delay:-${(r() * 4).toFixed(1)}s"></i>`).join('');
    return `${sparks}<div class="wire">${hang}</div><div class="vine tl"></div><div class="vine tr"></div>${hearts}<div class="hills"></div>`;
  })()
};

/* =============== Easter: blossom branches, falling petals, butterflies, eggs in the grass, a peeking bunny =============== */
const FLOWER = (x, y, r, p, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="${-r * .9}" rx="${r * .55}" ry="${r * .8}" fill="${p}" transform="rotate(${a})"/>`).join('')}<circle r="${r * .38}" fill="${c}"/></g>`;
const BLOSSOM = (branch, petal, center) => SVG('0 0 200 200', `<path d="M-4 -2 Q60 30 100 40 Q140 50 180 90 M60 22 Q70 60 60 100 M110 44 Q130 20 160 18" fill="none" stroke="${branch}" stroke-width="4.5" stroke-linecap="round"/>
  ${[[34, 14, 10], [80, 34, 12], [120, 50, 9], [170, 82, 11], [62, 70, 10], [58, 104, 8], [150, 20, 10]].map(([x, y, r]) => FLOWER(x, y, r, petal, center)).join('')}
  ${[[100, 30], [138, 64], [70, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${petal}"/>`).join('')}`);
const PETAL = c => SVG('0 0 20 14', `<ellipse cx="10" cy="7" rx="9" ry="5" fill="${c}"/>`);
const BFLY = (a, b) => SVG('0 0 40 30', `<path d="M20 15 C10 0 0 4 4 13 C0 22 12 28 20 17 C28 28 40 22 36 13 C40 4 30 0 20 15 Z" fill="${a}"/><path d="M20 15 C14 7 8 8 9 13 C8 18 15 20 20 17 C25 20 32 18 31 13 C32 8 26 7 20 15 Z" fill="${b}"/><rect x="19" y="8" width="2" height="15" rx="1" fill="#3d2b1f"/>`);
const EGG = (x, y, w, c1, c2, kind) => {
  const h = w * 1.3, id = `e${Math.round(x)}`;
  const deco = kind === 0 ? `<path d="M${-w / 2} 0 L${-w / 4} ${-h * .12} L0 0 L${w / 4} ${-h * .12} L${w / 2} 0" fill="none" stroke="${c2}" stroke-width="${w * .12}"/><path d="M${-w / 2} ${h * .2} L${w / 2} ${h * .2}" stroke="${c2}" stroke-width="${w * .1}"/>`
    : kind === 1 ? [[-.2, -.2], [.18, -.05], [-.05, .2], [.22, .25], [-.25, .12]].map(([a, b]) => `<circle cx="${a * w}" cy="${b * h}" r="${w * .09}" fill="${c2}"/>`).join('')
      : `<path d="M${-w / 2} ${-h * .15} L${w / 2} ${-h * .15} M${-w / 2} ${h * .12} L${w / 2} ${h * .12}" stroke="${c2}" stroke-width="${w * .14}"/>`;
  return `<g transform="translate(${x} ${y})"><clipPath id="${id}"><ellipse rx="${w / 2}" ry="${h / 2}"/></clipPath><ellipse rx="${w / 2}" ry="${h / 2}" fill="${c1}"/><g clip-path="url(#${id})">${deco}</g></g>`;
};
const MEADOW = (g1, g2, eggs, bunny) => SVG('0 0 1600 160', `<path d="M0 108 Q220 78 460 100 T940 96 T1380 90 T1600 100 L1600 160 L0 160 Z" fill="${g2}"/>
  <g><ellipse cx="1452" cy="88" rx="7" ry="22" fill="${bunny[0]}" transform="rotate(-12 1452 88)"/><ellipse cx="1474" cy="86" rx="7" ry="22" fill="${bunny[0]}" transform="rotate(10 1474 86)"/>
  <ellipse cx="1452" cy="88" rx="3" ry="15" fill="${bunny[1]}" transform="rotate(-12 1452 88)"/><ellipse cx="1474" cy="86" rx="3" ry="15" fill="${bunny[1]}" transform="rotate(10 1474 86)"/>
  <circle cx="1463" cy="116" r="17" fill="${bunny[0]}"/><circle cx="1457" cy="112" r="2.2" fill="#2b2230"/><circle cx="1469" cy="112" r="2.2" fill="#2b2230"/><ellipse cx="1463" cy="119" rx="2.6" ry="2" fill="${bunny[1]}"/></g>
  ${[[220, 118, 34, 0, 0], [268, 126, 26, 1, 1], [760, 120, 30, 2, 2], [1100, 122, 30, 3, 0], [1146, 128, 22, 0, 1], [470, 126, 24, 1, 2]].map(([x, y, w, c, k]) => EGG(x, y, w, eggs[c][0], eggs[c][1], k)).join('')}
  ${[[380, 0], [920, 1], [1260, 2]].map(([x, c]) => `<path d="M${x} 136 L${x} 104" stroke="#4f8a3c" stroke-width="3"/><path d="M${x - 9} 104 Q${x - 9} 90 ${x - 4} 92 L${x} 98 L${x + 4} 92 Q${x + 9} 90 ${x + 9} 104 Q${x} 112 ${x - 9} 104 Z" fill="${eggs[c][0]}"/>`).join('')}
  <path d="M0 134 Q260 110 520 128 T1040 124 T1600 130 L1600 160 L0 160 Z" fill="${g1}"/>`, ' preserveAspectRatio="none"');
const easter = {
  style: () => both((s, L) => `${s} #evbg .blossom{background-image:${enc(BLOSSOM(L.branch, L.petal, L.center))}} ${s} #evbg .petal{background-image:${enc(PETAL(L.petal))}}
    ${s} #evbg .bfly i{background-image:${enc(BFLY(L.b1, L.b2))}} ${s} #evbg .bfly.b i{background-image:${enc(BFLY(L.b3, L.b2))}}
    ${s} #evbg .hills{background-image:${enc(MEADOW(L.g1, L.g2, L.eggs, L.bunny))}}`,
  {branch: '#8a6a52', petal: '#f6b9cb', center: '#f2c94c', b1: '#f4a259', b2: '#ffe7a3', b3: '#8fb8ff', g1: '#a9d394', g2: '#c7e5b4',
    eggs: [['#ffd1dc', '#ff8fab'], ['#cde7ff', '#7fb2f0'], ['#fff1b3', '#f2c14e'], ['#e0d2ff', '#a58bea']], bunny: ['#ffffff', '#f6b9cb']},
  {branch: '#4a3628', petal: '#d98aa3', center: '#d9a93a', b1: '#e08a3f', b2: '#f2d27a', b3: '#6f98e0', g1: '#163a22', g2: '#1f4a2c',
    eggs: [['#d98aa3', '#a85575'], ['#7fa9d6', '#4f79a8'], ['#d9c27a', '#a88d3a'], ['#a996d9', '#7a64b5']], bunny: ['#d7d2c8', '#b88a9a']}),
  html: (() => {
    const r = rnd(5);
    const petals = Array.from({length: 18}, () => `<i class="petal" style="left:${(r() * 100).toFixed(1)}vw;--sz:${(9 + r() * 7).toFixed(0)}px;--d:${(11 + r() * 9).toFixed(1)}s;animation-delay:-${(r() * 20).toFixed(1)}s"></i>`).join('');
    const bflies = [[18, 22, 1], [34, 30, .8], [12, 26, .9], [42, 34, .7]].map(([top, d, s], k) => `<div class="bfly${k % 2 ? ' b' : ''}" style="top:${top}vh;--d:${d}s;--s:${s};animation-delay:-${k * 7}s"><i></i></div>`).join('');
    const flies = Array.from({length: 12}, () => `<i class="ffly" style="left:${(r() * 100).toFixed(1)}vw;top:${(30 + r() * 55).toFixed(1)}vh;animation-delay:-${(r() * 6).toFixed(1)}s"></i>`).join('');
    return `<div class="sun"></div>${flies}<div class="blossom tl"></div><div class="blossom tr"></div>${petals}${bflies}<div class="hills"></div>`;
  })()
};

export const THEMES = {halloween, newyear, valentine, easter};
