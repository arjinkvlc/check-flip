/**
 * Check Flip — game engine (pure JavaScript, no DOM, no language).
 * Used by js/app.js in the browser and by tests/simulate.mjs in Node.
 * All balance values (money, hunger, rent, commission…) are the constants at the top.
 * Log entries and popup texts are stored as {k, p} (key + params) and translated in js/i18n.js.
 */
/* ================= config ================= */
// by restaurant level (★ / ★★ / ★★★): commission, upgrade cost, visit fee, cash from the register
const COMS = [0, .25, .35, .5], UPC = {1: 30, 2: 45}, RENT = [0, 5, 8, 12], COLLECT = [0, 15, 20, 25];
const CFG = {UNIT: 5, VPRICE: 40, LAP_M: 40, LAP_H: 2, HALF_M: 20, HALF_H: 1, HMAX: 10, HAND: 2, MAXP: 6, PUBMAX: 4};
const N = 40, HALF = 20, IRON = 300;
const autoMoney = n => n <= 2 ? 100 : n === 3 ? 150 : 200;
const LIM = {def: 30000, feast: 45000, reply: 20000};
// game modes: quick = 10-day limit and shorter timers; teams = 2 vs 2 (seats 1+3 against 2+4), shared wallet at the check
const MODES = {classic: {t: 1}, quick: {t: .67, days: 10}, teams: {t: 1, n: 4}};
const modeOf = S => (S && S.cfg && MODES[S.cfg.mode]) ? S.cfg.mode : 'classic';
const isTeams = S => modeOf(S) === 'teams';
// turn time limits for a state (ms)
const limits = S => { const k = MODES[modeOf(S)].t; return {def: Math.round(LIM.def * k), feast: Math.round(LIM.feast * k), reply: Math.round(LIM.reply * k)}; };
const COLORS = ['#e2483d', '#3a7fc2', '#f0ad2c', '#1b9a86', '#8b5cf6', '#f07c2a'];
// board position -> restaurant key
const VENUES = {7: 'pizza', 17: 'sushi', 27: 'burger', 37: 'taco'};
const VICON = {pizza: '🍕', sushi: '🍣', burger: '🍔', taco: '🌮'};
const KICON = {start: '🏁', half: '🌗', kemer: '🪢', sans: '🎲', olay: '🍽️', gelir: '💰', fatura: '🧾', atis: '🥨', spor: '🏋️', kisa: '⏩', geri: '⏪', mola: '☕', mekan: '🏪', bos: ''};
// v1.5 layout: both halves hold the same mix, a restaurant every 10 squares, no two alike side by side.
// One Tighten the Belt square; the other belt is a card in the Chance deck (A12, A13).
const BOARD = ['start', 'bos', 'sans', 'gelir', 'atis', 'olay', 'fatura', 'mekan', 'sans', 'spor',
  'kisa', 'olay', 'kemer', 'bos', 'gelir', 'sans', 'fatura', 'mekan', 'olay', 'atis',
  'half', 'bos', 'sans', 'gelir', 'olay', 'fatura', 'spor', 'mekan', 'sans', 'olay',
  'mola', 'bos', 'atis', 'olay', 'gelir', 'sans', 'geri', 'mekan', 'fatura', 'atis'];
const CARD_IDS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11'];
const HOLD = {A10: 'feast', B8: 'any', B9: 'any', B10: 'feast', B11: 'feast', K: 'feast'};
// cards that go to the hand (A12 = the Tighten the Belt card from the Chance deck, held as K)
const KEEP = c => !!HOLD[c] || c === 'A12' || c === 'A13';
const handCard = c => c === 'A12' || c === 'A13' ? 'K' : c;
// how much a bot wants to keep a card (higher = keep)
const CARD_VALUE = {K: 6, B10: 5, B11: 4, A10: 4, B9: 2, B8: 2};
// avatar keys → illustrations in public/assets/avatars/<key>.svg (unlock rules in js/account.js)
const AVATARS = {waiter: 1, waitress: 1, student: 1, foodie: 1, italian: 1, doner: 1, noodle: 1, baker: 1, grandma: 1, critic: 1, barista: 1, sommelier: 1};
const EMOJIS = ['😂', '😭', '😡', '😱', '👏', '😋'];
const cellIcon = p => BOARD[p] === 'mekan' ? VICON[VENUES[p]] : KICON[BOARD[p]];
const venueIconAt = p => VICON[VENUES[p]] || '';

const gameId = () => { const c = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = 'g'; const r = globalThis.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(15)) : Array.from({length: 15}, () => Math.floor(Math.random() * 1e9)); for (const x of r) s += c[x % c.length]; return s; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d6 = () => 1 + Math.floor(Math.random() * 6);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clean = n => String(n || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯]/g, '').trim().slice(0, 14);
function uniqName(S, nm, pool) {
  if (!S.pl.some(q => q.n === nm)) return nm;
  const free = (pool || []).filter(n => !S.pl.some(q => q.n === n));
  if ((pool || []).includes(nm) && free.length) return free[Math.floor(Math.random() * free.length)];
  for (let k = 2; ; k++) { const t = nm.slice(0, 11) + ' ' + k; if (!S.pl.some(q => q.n === t)) return t; }
}
const avTaken = (S, key, exceptId) => S.pl.some(q => q.av === key && q.id !== exceptId);
function setAvatar(S, id, key) {
  const q = S.pl.find(x => x.id === id); if (!q) return false;
  if (key == null || key === '') { q.av = null; return true; }
  if (!AVATARS[key] || avTaken(S, key, id)) return false;
  q.av = key; return true;
}

/* ================= engine ================= */
function newState() { return {v: 7, cfg: {start: null, days: 0, mode: 'classic'}, rm: {}, pub: 0, rdy: {}, ep: 0, rev: 0, tk: 0, ph: 'lobby', host: null, pl: [], ord: [], tq: [], ti: 0, cur: -1, rd: 0, dbl: 0, bn: 0, day: 0, dA: [], dB: [], pend: null, fe: null, dice: null, own: {}, ev: 0, fx: null, log: [], seq: {}, win: null, end: null}; }
// st: per-game counters for achievements and daily quests
//   d: checks passed on with a deal, b: Tighten the Belt used, i: paid a big check and stayed, t: owned all restaurants at ★★★,
//   by: restaurants bought, up: upgrades, cu: cards played, pd: checks paid, pm: money paid for checks, mh: highest hunger
const newStats = () => ({d: 0, b: 0, i: 0, t: 0, by: 0, up: 0, cu: 0, pd: 0, pm: 0, mh: 0});
function addPlayer(S, id, n, extra) { S.pl.push(Object.assign({id, n, p: 0, m: 200, h: 0, x: 1, c: [], a: 1, s: 0, av: null, bot: 0, tm: null, st: newStats()}, extra || {})); }
const stat = (Q, k, v) => { if (!Q.st) Q.st = newStats(); Q.st[k] = v == null ? (Q.st[k] || 0) + 1 : v; };
const tycoonCheck = (S, i) => { if (Object.keys(VENUES).every(p => S.own[p] && S.own[p].o === i && (S.own[p].lv || 1) === 3)) stat(S.pl[i], 't', 1); };
// log entry: {k: key, p: params}; quiet entries are not repeated in the popup
function L(S, k, p, quiet) { const e = {k, p: p || {}}; S.log.push(e); if (S.log.length > 30) S.log.shift(); if (!quiet && S.fx && S.fx.open && S.fx.msgs.length < 8) S.fx.msgs.push(e); }
const tt = (k, p) => ({k, p: p || {}});
const mover = S => S.ord[S.cur];
const pay = (Q, a) => { const v = Math.min(Q.m, a); Q.m -= v; return v; };
const hun = (Q, d) => { Q.h = clamp(Q.h + d, 0, CFG.HMAX); if (Q.st && Q.h > (Q.st.mh || 0)) Q.st.mh = Q.h; };
// opponents still at the table (teammates are not rivals)
const rivals = (S, i) => S.ord.filter(j => j !== i && !(isTeams(S) && S.pl[j].tm === S.pl[i].tm));
const mateOf = (S, i) => { if (!isTeams(S)) return null; const k = S.ord.find(j => j !== i && S.pl[j].tm === S.pl[i].tm); return k == null ? null : k; };
// pay an amount; in team games the teammate covers what's missing. false = can't pay
function cover(S, j, amt) {
  const Q = S.pl[j]; if (Q.m >= amt) { Q.m -= amt; return true; }
  const k = mateOf(S, j); if (k == null) return false; const M = S.pl[k];
  if (Q.m + M.m < amt) return false;
  const need = amt - Q.m; Q.m = 0; M.m -= need; L(S, 'teamHelp', {n: M.n, t: Q.n, m: need}); return true;
}
const step = (S, p) => { if (S.fx && S.fx.open) S.fx.path.push(p); };
// the client shows the card / square first, then animates this extra move
const split = S => { if (S.fx && S.fx.open && S.fx.split == null) S.fx.split = S.fx.path.length; };
function fwd(S, i, n) {
  const Q = S.pl[i];
  for (let k = 0; k < n; k++) {
    Q.p = (Q.p + 1) % N; step(S, Q.p);
    if (Q.p === 0) { Q.m += CFG.LAP_M; hun(Q, CFG.LAP_H); Q.x++; L(S, 'lap', {n: Q.n, m: CFG.LAP_M, h: CFG.LAP_H, x: Q.x}); }
    else if (Q.p === HALF) { Q.m += CFG.HALF_M; hun(Q, CFG.HALF_H); L(S, 'half', {n: Q.n, m: CFG.HALF_M, h: CFG.HALF_H}); }
  }
}
function back(S, i, n) { const Q = S.pl[i]; for (let k = 0; k < n; k++) { Q.p = (Q.p - 1 + N) % N; step(S, Q.p); } }
// a card for the hand; when the hand is full the player chooses what to drop (returns true = waiting for that choice)
function give(S, i, c) {
  const Q = S.pl[i];
  if (Q.c.length >= CFG.HAND) { S.pend = {k: 'swap', i, c}; return true; }
  Q.c.push(c); return false;
}
function draw(S, d) {
  const k = 'd' + d;
  if (!S[k].length) { const held = new Set(S.pl.flatMap(q => q.c)); S[k] = shuffle(CARD_IDS.filter(id => id[0] === d && !held.has(id))); }
  return S[k].pop();
}
function worth(S, i) { let w = S.pl[i].m; for (const k in S.own) if (S.own[k].o === i) w += S.own[k].pr; return w; }
function land(S, i, dep) {
  const Q = S.pl[i]; if (S.fx) S.fx.sq = Q.p;
  switch (BOARD[Q.p]) {
    case 'kemer': L(S, 'gotBelt', {n: Q.n}); return give(S, i, 'K');
    case 'sans': return card(S, i, draw(S, 'A'), dep);
    case 'olay': return card(S, i, draw(S, 'B'), dep);
    case 'gelir': Q.m += 20; L(S, 'payday', {n: Q.n, m: 20}, 1); break;
    case 'fatura': L(S, 'bills', {n: Q.n, m: pay(Q, 15)}, 1); break;
    case 'atis': hun(Q, -2); L(S, 'snack', {n: Q.n}, 1); break;
    case 'spor': hun(Q, 2); L(S, 'gym', {n: Q.n}, 1); break;
    case 'kisa': L(S, 'shortcut', {n: Q.n}); split(S); fwd(S, i, 3); if (dep < 2) return land(S, i, dep + 1); break;
    case 'geri': L(S, 'goBack', {n: Q.n}); split(S); back(S, i, 3); if (dep < 2) return land(S, i, dep + 1); break;
    case 'mola': Q.s++; L(S, 'coffee', {n: Q.n}, 1); break;
    case 'mekan': {
      const o = S.own[Q.p], v = VENUES[Q.p];
      if (!o) { if (Q.m >= CFG.VPRICE) { S.pend = {k: 'buy', i, p: Q.p}; return true; } L(S, 'noCashVenue', {n: Q.n, v}); break; }
      if (o.o === i) { S.pend = {k: 'home', i, p: Q.p}; return true; }
      { const O = S.pl[o.o]; if (O.a) { const r = pay(Q, RENT[o.lv || 1]); O.m += r; if (r) L(S, 'rent', {n: Q.n, o: O.n, v, m: r}); } }
      if (Q.m >= o.pr + 10) { S.pend = {k: 'offer', i, p: Q.p}; return true; }
      L(S, 'noCashOffer', {n: Q.n, v, o: S.pl[o.o].n}); break;
    }
    case 'bos': L(S, 'empty', {n: Q.n}, 1); break;
  }
  return false;
}
function card(S, i, c, dep) {
  const Q = S.pl[i]; if (S.fx) S.fx.card = c; L(S, 'drew', {n: Q.n, c}, 1);
  switch (c) {
    case 'A0': Q.m += 30; break; case 'A1': Q.m += 10; break; case 'A2': Q.m += 50; break;
    case 'A3': pay(Q, 25); break; case 'A4': pay(Q, 20); break; case 'A5': pay(Q, 30); break; case 'A11': pay(Q, 10); break;
    case 'A6': split(S); fwd(S, i, 4); if (dep < 2) return land(S, i, dep + 1); break;
    case 'A7': split(S); back(S, i, 3); if (dep < 2) return land(S, i, dep + 1); break;
    case 'A8': { const d0 = (N - Q.p) % N || N, dh = (HALF - Q.p + N) % N || N; split(S); fwd(S, i, Math.min(d0, dh)); break; }
    case 'A9': case 'B6': if (rivals(S, i).length) { S.pend = {k: 'tgt', i, c}; return true; } break;
    case 'B0': hun(Q, 2); break; case 'B1': hun(Q, -3); break; case 'B2': hun(Q, 3); pay(Q, 10); break; case 'B3': Q.h = 0; break;
    case 'B4': S.ord.forEach(j => hun(S.pl[j], 1)); break;
    case 'B5': { let t = 0; rivals(S, i).forEach(j => t += pay(S.pl[j], 10)); Q.m += t; break; }
    case 'B7': { const mx = Math.max(...S.ord.map(j => S.pl[j].h)); S.ord.filter(j => S.pl[j].h === mx).forEach(j => { S.pl[j].m += 20; }); break; }
    case 'A12': case 'A13': return give(S, i, 'K');
    default: return give(S, i, c);
  }
  return false;
}
function doRoll(S) {
  const i = mover(S), Q = S.pl[i]; const a = d6(), b = d6(); S.dice = [a, b]; S.fx.d = [a, b]; S.bn = 0;
  const dbl = a === b; S.dbl = dbl ? S.dbl + 1 : 0; L(S, 'rolled', {n: Q.n, a, b, dbl: dbl ? 1 : 0}, 1);
  S.pend = {k: 'move', i, o: [...new Set([a + b, a, b])]};
}
function after(S) {
  const Q = S.pl[mover(S)], d = S.dice;
  if (d && d[0] === d[1] && S.dbl > 0 && S.dbl < 3 && Q.s === 0) { S.bn = 1; L(S, 'again', {n: Q.n}); return; }
  next(S);
}
function next(S) {
  S.dbl = 0; S.bn = 0;
  for (let g = 0; g < 60; g++) {
    S.cur++;
    if (S.cur >= S.ord.length) { S.cur = 0; S.rd++; if (S.rd >= 2) { feast(S); return; } }
    const Q = S.pl[mover(S)]; if (Q.s > 0) { Q.s--; L(S, 'waits', {n: Q.n}); continue; }
    return;
  }
}
const ownedBy = (S, i) => Object.keys(S.own).filter(k => S.own[k].o === i).map(Number);
function feast(S) {
  S.ph = 'feast'; S.pend = null; const w = S.tq[S.ti];
  const vs = Object.keys(VENUES).map(Number); const v = vs[Math.floor(Math.random() * vs.length)];
  S.fe = {w, ku: 0, ke: 0, al: 0, v, dl: 0, off: null}; if (S.fx) S.fx.venue = v;
  L(S, 'dayEnd', {d: S.day, v: VENUES[v], n: S.pl[w].n});
}
function bill(S, wo) {
  const f = S.fe, alt = wo != null && wo !== f.w, w = alt ? wo : f.w, ven = f.v != null && S.own[f.v] ? f.v : null, u = CFG.UNIT, rate = ven != null ? COMS[S.own[ven].lv || 1] : 0;
  const ke = alt ? 0 : f.ke, ku = alt ? 0 : f.ku;
  const eat = S.ord.filter(j => j !== w || !ke).map(j => { const q = S.pl[j]; return {j, h: q.h, x: q.x, v: q.h * q.x * u}; });
  if (f.al && !alt) return {al: 1, u, ven, rate, lines: eat.map(l => l.j === w && ku ? Object.assign({}, l, {v: Math.round(l.v * .75), ku: 1}) : l)};
  const sum = eat.reduce((s, l) => s + l.v, 0);
  return {al: 0, u, ven, rate, lines: eat, sum, tot: ku ? Math.round(sum * .75) : sum};
}
const canTake = (S, to, amt) => S.pl[to].m + amt >= bill(S, to).tot;
function elim(S, j) {
  S.pl[j].a = 0; S.pl[j].od = S.day; (S.outs = S.outs || []).push(j); S.ord.splice(S.ord.indexOf(j), 1); const k = S.tq.indexOf(j); S.tq.splice(k, 1); if (k < S.ti) S.ti--;
  const vs = ownedBy(S, j); vs.forEach(p => delete S.own[p]); if (vs.length) L(S, 'freed', {n: S.pl[j].n});
}
function payFeast(S) {
  const f = S.fe, w = f.w, W = S.pl[w], b = bill(S), out = []; let paid = 0;
  if (b.al) { b.lines.forEach(l => { if (cover(S, l.j, l.v)) paid += l.v; else { S.pl[l.j].m = 0; out.push(l.j); } }); L(S, 'dutch'); }
  else if (!cover(S, w, b.tot)) { W.m = 0; out.push(w); }
  else { paid = b.tot; stat(W, 'pd'); stat(W, 'pm', (W.st && W.st.pm || 0) + b.tot); if (b.tot >= IRON) stat(W, 'i', 1); L(S, 'paid', {n: W.n, m: b.tot, v: b.ven != null ? VENUES[b.ven] : null}); }
  if (b.ven != null && paid > 0) {
    const o = S.own[b.ven], O = S.pl[o.o];
    if (O.a && !out.includes(o.o)) { const c = Math.round(paid * b.rate); O.m += c; L(S, 'commission', {n: O.n, v: VENUES[b.ven], r: Math.round(b.rate * 100), m: c}); }
  }
  S.ord.forEach(j => { if (j !== w || !f.ke) S.pl[j].h = 0; });
  if (f.ke) L(S, 'belt', {n: W.n});
  const tOut = out.includes(w);
  out.forEach(j => { L(S, 'out', {n: S.pl[j].n}); elim(S, j); });
  if (isTeams(S) ? new Set(S.ord.map(j => S.pl[j].tm)).size <= 1 : S.ord.length <= 1) {
    S.ph = 'over'; S.win = S.ord.length ? S.ord[0] : null; S.fe = null; S.end = 'last';
    if (S.win == null) L(S, 'nobody'); else announce(S);
    return;
  }
  if (!tOut) S.ti++; S.ti %= S.tq.length;
  if (S.cfg && S.cfg.days && S.day >= S.cfg.days) {
    S.ph = 'over'; S.fe = null; S.end = 'days';
    const sc = S.ord.map(j => ({j, w: worth(S, j)})).sort((a, b) => b.w - a.w); S.win = sc[0].j;
    if (isTeams(S)) {   // team with more money + restaurant value wins
      const tw = [0, 1].map(t => S.ord.filter(j => S.pl[j].tm === t).reduce((s, j) => s + worth(S, j), 0));
      const wt = tw[1] > tw[0] ? 1 : 0; S.win = sc.find(o => S.pl[o.j].tm === wt).j;
    }
    L(S, 'daysOver', {d: S.cfg.days, list: sc.map(o => [S.pl[o.j].n, o.w])}); announce(S); return;
  }
  startDay(S);
}
function announce(S) {
  if (isTeams(S)) { S.wt = S.pl[S.win].tm; const t = S.pl.filter(q => q.tm === S.wt).map(q => q.n); L(S, 'teamWon', {a: t[0], b: t[1] || ''}); }
  else L(S, 'won', {n: S.pl[S.win].n});
}
function startDay(S) {
  S.day++; S.ph = 'play'; S.fe = null; S.pend = null; S.rd = 0; S.cur = -1; S.dbl = 0;
  S.ord.forEach(j => hun(S.pl[j], 1)); L(S, 'dayStart', {d: S.day}); next(S);
}
function rank(ids, rolls) {
  const r = ids.map(i => { const v = d6() + d6(); rolls[i] = v; return {i, v}; }); r.sort((a, b) => b.v - a.v);
  const out = []; let k = 0;
  while (k < r.length) { let e = k; while (e < r.length && r[e].v === r[k].v) e++; const g = r.slice(k, e).map(o => o.i); if (g.length > 1) out.push(...rank(g, rolls)); else out.push(g[0]); k = e; }
  return out;
}
function startGame(S) {
  S.gid = gameId(); S.t0 = Date.now(); S.outs = []; S.rm = {}; S.wt = null;
  const md = MODES[modeOf(S)]; if (md.days) S.cfg.days = md.days;
  S.pl.forEach((q, i) => { q.tm = isTeams(S) ? i % 2 : null; });
  const m = (S.cfg && S.cfg.start) || autoMoney(S.pl.length); S.pl.forEach(q => { q.m = m; });
  L(S, 'startMoney', {m, days: S.cfg && S.cfg.days || 0});
  const rolls = {}; const o = rank(S.pl.map((_, i) => i), rolls); S.ord = o; S.tq = o.slice(); S.ti = 0; S.day = 0;
  L(S, 'order', {list: o.map(i => [S.pl[i].n, rolls[i]])}); startDay(S);
}
function useCard(S, i, c, to) {
  const Q = S.pl[i], k = Q.c.indexOf(c); if (k < 0) return false;
  if (HOLD[c] === 'any') {
    if (S.ph !== 'play' && S.ph !== 'feast') return false; if (!S.ord.includes(to) || to === i) return false;
    const d = c === 'B8' ? -2 : 2; Q.c.splice(k, 1); stat(Q, 'cu'); hun(S.pl[to], d); L(S, 'cardOn', {n: Q.n, t: S.pl[to].n, c, d}); return true;
  }
  if (S.ph !== 'feast' || S.fe.w !== i || S.fe.off) return false; const f = S.fe;
  if (c === 'A10') { if (f.ku) return false; f.ku = 1; }
  else if (c === 'K') { if (f.ke) return false; f.ke = 1; }
  else if (c === 'B11') { if (f.al) return false; f.al = 1; }
  else if (c === 'B10') { const n = S.tq.length; if (n < 2) return false; const a = S.ti, b = (S.ti + 1) % n; [S.tq[a], S.tq[b]] = [S.tq[b], S.tq[a]]; f.w = S.tq[a]; f.ku = 0; f.ke = 0; f.al = 0; }
  if (c === 'K') stat(Q, 'b');
  stat(Q, 'cu');
  Q.c.splice(k, 1); L(S, 'cardUse', {n: Q.n, c, t: c === 'B10' ? S.pl[f.w].n : null}); return true;
}
function actInner(S, i, pid, a) {
  const P = S.pend, fx = S.fx;
  switch (a.t) {
    case 'start': if (S.ph !== 'lobby' || pid !== S.host || S.pl.length < 2 || (isTeams(S) && S.pl.length !== 4)) return false; fx.title = tt('gameStarts'); fx.head = tt('tableSet'); startGame(S); return true;
    case 'roll': if (S.ph !== 'play' || P || mover(S) !== i) return false; doRoll(S); return true;
    case 'mv': {
      if (S.ph !== 'play' || !P || P.k !== 'move' || P.i !== i) return false; const v = +a.v; if (!P.o.includes(v)) return false;
      S.pend = null; fwd(S, i, v); if (!land(S, i, 0)) after(S); return true;
    }
    case 'tgt': {
      if (S.ph !== 'play' || !P || P.k !== 'tgt' || P.i !== i) return false; const to = +a.to; if (!rivals(S, i).includes(to)) return false;
      const c = P.c, T = S.pl[to], Q = S.pl[i]; S.pend = null; fx.card = c;
      if (c === 'A9') { const v = pay(T, 15); Q.m += v; L(S, 'collected', {n: Q.n, t: T.n, m: v}); }
      else { T.s++; L(S, 'gossip', {t: T.n}); }
      after(S); return true;
    }
    case 'buy': {
      if (S.ph !== 'play' || !P || P.k !== 'buy' || P.i !== i) return false; const Q = S.pl[i], v = VENUES[P.p]; S.pend = null;
      if (a.yes && Q.m >= CFG.VPRICE && !S.own[P.p]) {
        Q.m -= CFG.VPRICE; S.own[P.p] = {o: i, pr: CFG.VPRICE, lv: 1};
        fx.head = tt('venueBought'); fx.title = tt('venue', {v}); fx.sub = tt('ownerNow', {n: Q.n, m: CFG.VPRICE}); L(S, 'bought', {n: Q.n, v, m: CFG.VPRICE}); stat(Q, 'by'); tycoonCheck(S, i);
      } else { fx.quiet = 1; L(S, 'notBought', {n: Q.n, v}, 1); }
      after(S); return true;
    }
    case 'offer': {
      if (S.ph !== 'play' || !P || P.k !== 'offer' || P.i !== i) return false; const o = S.own[P.p], Q = S.pl[i], amt = Math.round(+a.amt || 0), v = VENUES[P.p];
      if (!amt) { S.pend = null; fx.quiet = 1; L(S, 'noOffer', {n: Q.n, v}, 1); after(S); return true; }
      if (!o || amt < o.pr + 10 || amt > Q.m) return false;
      S.pend = {k: 'ow', i: o.o, p: P.p, from: i, amt};
      fx.head = tt('venueOffer'); fx.title = tt('venue', {v}); fx.sub = tt('offeredSub', {n: Q.n, o: S.pl[o.o].n, m: amt});
      L(S, 'offered', {n: Q.n, o: S.pl[o.o].n, v, m: amt}, 1); return true;
    }
    case 'owr': {
      if (S.ph !== 'play' || !P || P.k !== 'ow' || P.i !== i) return false; const B = S.pl[P.from], O = S.pl[i], o = S.own[P.p], v = VENUES[P.p]; S.pend = null; fx.head = tt('venueOffer');
      if (a.ok && o && o.o === i && B.m >= P.amt) {
        B.m -= P.amt; O.m += P.amt; S.own[P.p] = {o: P.from, pr: P.amt, lv: o.lv || 1};
        fx.title = tt('sold', {v}); fx.sub = tt('soldSub', {b: B.n, o: O.n, m: P.amt}); L(S, 'sold', {b: B.n, o: O.n, v, m: P.amt}, 1); tycoonCheck(S, P.from);
      } else { fx.title = tt('offerRejected'); fx.sub = tt('notSoldSub', {o: O.n, v}); L(S, 'notSold', {o: O.n, v}, 1); }
      after(S); return true;
    }
    case 'swap': {
      if (S.ph !== 'play' || !P || P.k !== 'swap' || P.i !== i) return false; const Q = S.pl[i]; S.pend = null;
      if (a.drop === 'new' || a.drop == null) L(S, 'handFull', {n: Q.n, c: P.c});
      else { const k = +a.drop; if (!(k >= 0 && k < Q.c.length)) return false; const o = Q.c[k]; Q.c[k] = P.c; L(S, 'swapped', {n: Q.n, c: P.c, o}); }
      fx.quiet = 1; after(S); return true;
    }
    case 'use': if (!S.pl[i].a) return false; fx.card = String(a.c); return useCard(S, i, String(a.c), +a.to);
    case 'home': {
      if (S.ph !== 'play' || !P || P.k !== 'home' || P.i !== i) return false; const Q = S.pl[i], o = S.own[P.p], v = VENUES[P.p]; S.pend = null; const lv = o.lv || 1;
      fx.head = tt('ownVenue'); fx.title = tt('venue', {v});
      if (a.up && lv < 3 && Q.m >= UPC[lv]) {
        Q.m -= UPC[lv]; o.lv = lv + 1; o.pr += UPC[lv]; const r = Math.round(COMS[o.lv] * 100);
        fx.sub = tt('upgradedSub', {lv: o.lv, r}); L(S, 'upgraded', {n: Q.n, v, r}); stat(Q, 'up'); tycoonCheck(S, i);
      } else { const m = COLLECT[lv]; Q.m += m; fx.sub = tt('collectedSub', {m}); L(S, 'collect', {n: Q.n, v, m}, 1); }
      after(S); return true;
    }
    case 'deal': {
      const f = S.fe; if (S.ph !== 'feast' || f.w !== i || f.off || f.dl || f.ku || f.ke || f.al) return false; const to = +a.to, amt = Math.round(+a.amt || 0);
      if (!rivals(S, i).includes(to) || amt < 0 || amt > S.pl[i].m) return false;
      f.dl = 1; f.off = {to, amt}; fx.head = tt('deal'); fx.title = tt('dealQuote', {m: amt}); fx.sub = tt('arrow', {a: S.pl[i].n, b: S.pl[to].n});
      L(S, 'dealOffer', {n: S.pl[i].n, t: S.pl[to].n, m: amt}, 1); return true;
    }
    case 'dealr': {
      const f = S.fe; if (S.ph !== 'feast' || !f.off || f.off.to !== i) return false; const {to, amt} = f.off, W = S.pl[f.w], T = S.pl[to]; f.off = null; fx.head = tt('deal');
      if (a.ok && W.m >= amt && canTake(S, to, amt)) {
        W.m -= amt; T.m += amt; f.w = to; stat(W, 'd');
        fx.title = tt('accepted'); fx.sub = tt('dealTookSub', {t: T.n, m: amt}); L(S, 'dealTook', {t: T.n, m: amt}, 1);
      } else { fx.title = tt('rejected'); fx.sub = tt('stillPays', {n: W.n}); L(S, 'dealNo', {t: T.n}, 1); }
      return true;
    }
    case 'pay': if (S.ph !== 'feast' || S.fe.w !== i || S.fe.off) return false; fx.title = tt('billPaid'); fx.head = tt('receipt'); fx.bill = 1; payFeast(S); return true;
  }
  return false;
}
function act(S, pid, a) {
  const i = S.pl.findIndex(q => q.id === pid); if (i < 0 || !a) return false;
  const snap = JSON.stringify(S);
  S.ev++; S.fx = {id: S.ev, i, t: a.t, d: null, path: [], card: null, sq: null, msgs: [], open: 1};
  const ok = actInner(S, i, pid, a);
  if (!ok) { Object.assign(S, JSON.parse(snap)); return false; }
  if (a.t !== 'use') S.tk = (S.tk || 0) + 1;
  S.fx.open = 0; return true;
}
// Final standings (player indices, winner first): survivors by net worth, then eliminated players, last out first.
function standings(S) {
  if (!S || S.ph !== 'over') return null;
  const win = new Set(winners(S));
  const alive = S.ord.slice().sort((a, b) => (b === S.win) - (a === S.win) || worth(S, b) - worth(S, a));
  const outs = (S.outs || []).slice().reverse().filter(j => !alive.includes(j));
  const rest = S.pl.map((_, i) => i).filter(i => !alive.includes(i) && !outs.includes(i));
  const all = [...alive, ...outs, ...rest];
  return [...all.filter(j => win.has(j)), ...all.filter(j => !win.has(j))];
}
// winning players (both teammates in a team game)
function winners(S) {
  if (!S || S.ph !== 'over' || S.win == null) return [];
  if (isTeams(S)) { const wt = S.wt != null ? S.wt : S.pl[S.win].tm; return S.pl.map((q, i) => i).filter(i => S.pl[i].tm === wt); }
  return [S.win];
}
function actor(V) { if (!V) return -1; if (V.ph === 'play') return V.pend ? V.pend.i : mover(V); if (V.ph === 'feast') return V.fe.off ? V.fe.off.to : V.fe.w; return -1; }
function autoPick(S) {
  const A = actor(S); if (A < 0) return null; const P = S.pend;
  if (S.ph === 'feast') return S.fe.off ? {t: 'dealr', ok: 0} : {t: 'pay'};
  if (!P) return {t: 'roll'};
  switch (P.k) {
    case 'move': return {t: 'mv', v: P.o[0]};
    case 'tgt': { const r = rivals(S, A); return {t: 'tgt', to: r[Math.floor(Math.random() * r.length)]}; }
    case 'swap': return {t: 'swap', drop: 'new'};
    case 'home': return {t: 'home', up: 0}; case 'buy': return {t: 'buy', yes: 0}; case 'offer': return {t: 'offer', amt: 0}; case 'ow': return {t: 'owr', ok: 0};
  }
  return null;
}
function checkStart(S) { if (S.pub && S.ph === 'lobby' && S.pl.length >= 2 && (S.pl.length >= CFG.PUBMAX || S.pl.every(q => S.rdy[q.id]))) act(S, S.host, {t: 'start'}); }

/* ================= bot AI (single player) ================= */
// Simple, rule-abiding decisions: scores target squares, manages the check and deals by money.
function sqScore(S, i, from, v) {
  const Q = S.pl[i]; let sc = 0; const payToday = S.tq[S.ti] === i;
  for (let k = 1; k <= v; k++) { const p = (from + k) % N; if (p === 0) sc += CFG.LAP_M + (payToday ? -6 : 8); else if (p === HALF) sc += CFG.HALF_M; }
  const t = (from + v) % N;
  switch (BOARD[t]) {
    case 'gelir': sc += 20; break; case 'fatura': sc -= 15; break; case 'sans': sc += 4; break; case 'olay': sc += 3; break;
    case 'atis': sc += payToday ? 12 : -8; break; case 'spor': sc += payToday ? -10 : 10; break;
    case 'kemer': sc += Q.c.length < CFG.HAND ? 18 : 0; break; case 'mola': sc -= 10; break; case 'kisa': sc += 3; break; case 'geri': sc -= 3; break;
    case 'mekan': { const o = S.own[t]; if (!o) sc += Q.m >= CFG.VPRICE + 50 ? 14 : 0; else if (o.o === i) sc += COLLECT[o.lv || 1]; else sc -= RENT[o.lv || 1]; break; }
  }
  return sc + Math.random() * 3;
}
// Bot difficulty: 'easy' often makes a random choice, 'normal' sometimes, 'hard' never.
const BOT_NOISE = {easy: .75, normal: .45, hard: 0};
function botDecide(S, i, lv) {
  const best = botBest(S, i); const q = S.pl[i], noise = BOT_NOISE[lv || q.bd || 'hard'] || 0;
  if (!best || !noise || Math.random() >= noise) return best;
  return botRandom(S, i) || best;
}
// a legal but careless choice
function botRandom(S, i) {
  const Q = S.pl[i], P = S.pend, pick = a => a[Math.floor(Math.random() * a.length)], coin = () => Math.random() < .5 ? 1 : 0;
  if (S.ph === 'feast') { if (S.fe.off) return S.fe.off.to === i ? {t: 'dealr', ok: canTake(S, i, S.fe.off.amt) ? coin() : 0} : null; return S.fe.w === i ? {t: 'pay'} : null; }
  if (S.ph !== 'play') return null;
  if (!P) return mover(S) === i ? {t: 'roll'} : null;
  if (P.i !== i) return null;
  switch (P.k) {
    case 'move': return {t: 'mv', v: pick(P.o)};
    case 'tgt': { const r = rivals(S, i); return r.length ? {t: 'tgt', to: pick(r)} : null; }
    case 'buy': return {t: 'buy', yes: coin()};
    case 'offer': return {t: 'offer', amt: 0};
    case 'ow': return {t: 'owr', ok: coin()};
    case 'home': { const lv = (S.own[P.p] && S.own[P.p].lv) || 1; return {t: 'home', up: lv < 3 && Q.m >= UPC[lv] ? coin() : 0}; }
    case 'swap': return {t: 'swap', drop: Math.random() < .34 ? 'new' : Math.floor(Math.random() * Q.c.length)};
  }
  return null;
}
function botBest(S, i) {
  const Q = S.pl[i], P = S.pend; const rich = rivals(S, i).sort((a, b) => S.pl[b].m - S.pl[a].m);
  if (S.ph === 'feast') {
    const f = S.fe;
    if (f.off) { if (f.off.to !== i) return null; const need = bill(S, i).tot, amt = f.off.amt; return {t: 'dealr', ok: canTake(S, i, amt) && (amt >= need || (amt >= need * .8 && Q.m > need * 3)) ? 1 : 0}; }
    if (f.w !== i) return null;
    const b = bill(S), own = b.lines.find(l => l.j === i);
    for (const c of Q.c) {
      if (c === 'A10' && !f.ku && !b.al && b.tot >= 30) return {t: 'use', c};
      if (c === 'K' && !f.ke && own && own.v >= 15) return {t: 'use', c};
      if (c === 'B11' && !f.al && !f.ku && own && b.tot >= 30 && own.v < b.tot * .4) return {t: 'use', c};
      if (c === 'B10' && b.tot > Q.m * .5 && S.tq.length > 1) return {t: 'use', c};
      if (c === 'B8') { const t = S.ord.filter(j => j !== i).sort((a, z) => S.pl[z].h * S.pl[z].x - S.pl[a].h * S.pl[a].x)[0]; if (t != null && S.pl[t].h >= 2) return {t: 'use', c, to: t}; }
    }
    if (!f.dl && !f.ku && !f.ke && !f.al && b.tot >= Math.max(25, Q.m * .35)) {
      const amt = Math.min(Q.m, Math.round(b.tot * .45 / 5) * 5); const to = rich.find(j => canTake(S, j, amt));
      if (to != null && amt > 0) return {t: 'deal', to, amt};
    }
    return {t: 'pay'};
  }
  if (S.ph !== 'play') return null;
  if (!P) return mover(S) === i ? {t: 'roll'} : null;
  if (P.i !== i) return null;
  switch (P.k) {
    case 'move': { let best = P.o[0], bs = -1e9; for (const v of P.o) { const sc = sqScore(S, i, Q.p, v); if (sc > bs) { bs = sc; best = v; } } return {t: 'mv', v: best}; }
    case 'tgt': return {t: 'tgt', to: rich[0]};
    case 'swap': { let k = -1, lo = CARD_VALUE[P.c] || 0; Q.c.forEach((c, j) => { const v = CARD_VALUE[c] || 0; if (v < lo) { lo = v; k = j; } }); return {t: 'swap', drop: k < 0 ? 'new' : k}; }
    case 'buy': return {t: 'buy', yes: Q.m - CFG.VPRICE >= 50 ? 1 : 0};
    case 'offer': { const o = S.own[P.p], a = o.pr + 10; return {t: 'offer', amt: Q.m - a >= 90 && Math.random() < .35 ? a : 0}; }
    case 'ow': return {t: 'owr', ok: P.amt >= S.own[P.p].pr * 1.6 || Q.m < 40 ? 1 : 0};
    case 'home': { const o = S.own[P.p], lv = o.lv || 1; return {t: 'home', up: lv < 3 && Q.m - UPC[lv] >= 70 ? 1 : 0}; }
  }
  return null;
}
// A card a bot may play when it's not its turn: Hunger pangs to grow someone else's check.
function botSide(S, i) {
  const Q = S.pl[i]; if (S.ph !== 'feast' || S.fe.off || S.fe.w === i || !Q.a || !Q.c.includes('B9')) return null;
  if (isTeams(S) && S.pl[S.fe.w].tm === Q.tm) return null;   // don't make a teammate's check bigger
  const cand = rivals(S, i).filter(j => j !== S.fe.w).sort((a, b) => S.pl[b].x - S.pl[a].x);
  return {t: 'use', c: 'B9', to: cand.length ? cand[0] : S.fe.w};
}

export {
  COMS, UPC, RENT, COLLECT, CFG, N, HALF, IRON, autoMoney, LIM, MODES, modeOf, isTeams, limits, mateOf, COLORS, VENUES, VICON, KICON, BOARD, CARD_IDS, HOLD, KEEP, handCard, AVATARS, EMOJIS,
  cellIcon, venueIconAt, clamp, d6, shuffle, clean, uniqName, avTaken, setAvatar,
  newState, addPlayer, L, mover, pay, hun, rivals, fwd, back, give, draw, worth, land, card, doRoll, after, next,
  ownedBy, feast, bill, canTake, elim, payFeast, startDay, rank, startGame, useCard, actInner, act, actor, autoPick, checkStart,
  sqScore, botDecide, botRandom, botSide, standings, winners, gameId, BOT_NOISE
};
