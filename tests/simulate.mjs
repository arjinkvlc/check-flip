// Check Flip — engine simulation
// Plays hundreds of games with random-choice players, looks for stuck games and invalid states,
// reports game length and measures the single-player bot AI. Run: npm test  (or: node tests/simulate.mjs [games])
import {newState, addPlayer, act, actor, autoPick, rivals, HOLD, CFG, botDecide, botRescue, botSide, standings, winners, bill} from '../public/js/engine.js';

const GAMES = +(process.argv[2] || 300);
const R = Math.random;

function botStep(S) {
  const A = actor(S), id = S.pl[A].id, P = S.pend;
  if (S.ph === 'feast') {
    const f = S.fe;
    if (f.off) return act(S, id, {t: 'dealr', ok: R() < .5 ? 1 : 0});
    if (!f.dl && R() < .25) {
      const r = rivals(S, A);
      if (r.length && act(S, id, {t: 'deal', to: r[0], amt: Math.min(S.pl[A].m, 10 + 5 * Math.floor(R() * 4))})) return true;
    }
    for (const c of S.pl[f.w].c.slice()) if (HOLD[c] === 'feast' && R() < .5) act(S, id, {t: 'use', c});
    return act(S, id, {t: 'pay'});
  }
  if (!P) return act(S, id, {t: 'roll'});
  switch (P.k) {
    case 'move': return act(S, id, {t: 'mv', v: P.o[Math.floor(R() * P.o.length)]});
    case 'tgt': return act(S, id, {t: 'tgt', to: rivals(S, A)[0]});
    case 'home': return act(S, id, {t: 'home', up: R() < .5 ? 1 : 0});
    case 'buy': return act(S, id, {t: 'buy', yes: R() < .7 ? 1 : 0});
    case 'offer': { const o = S.own[P.p]; return act(S, id, {t: 'offer', amt: R() < .3 ? Math.min(S.pl[A].m, o.pr + 10) : 0}); }
    case 'ow': return act(S, id, {t: 'owr', ok: R() < .4 ? 1 : 0});
  }
  return false;
}

const stats = {g: 0, d: 0, b: 0, i: 0, t: 0};
function run(np, days = 0, mode = 'classic') {
  const lens = []; let errors = 0;
  for (let g = 0; g < GAMES; g++) {
    const S = newState(); S.host = 'p0'; S.cfg.days = days; S.cfg.mode = mode;
    for (let k = 0; k < np; k++) addPlayer(S, 'p' + k, 'P' + k);
    act(S, 'p0', {t: 'start'});
    let guard = 0;
    while (S.ph !== 'over' && guard++ < 20000) {
      if (R() < .05) for (const i of S.ord) {
        const q = S.pl[i], c = q.c.find(c => HOLD[c] === 'any');
        if (c) act(S, q.id, {t: 'use', c, to: rivals(S, i)[0]});
      }
      if (!botStep(S)) {
        const a = autoPick(S);
        if (!act(S, S.pl[actor(S)].id, a)) { errors++; console.error('stuck:', S.ph, JSON.stringify(S.pend)); break; }
      }
    }
    if (S.ph !== 'over') errors++; else lens.push(S.day);
    if (S.ph === 'over') {
      const st = standings(S);
      const w = winners(S);
      if (mode === 'teams' && S.win != null && (w.length !== 2 || S.pl[w[0]].tm !== S.pl[w[1]].tm || !w.includes(st[0]) || !w.includes(st[1]))) { errors++; console.error('bad team winners', w, st); }
      if (mode === 'quick' && S.day > 10) { errors++; console.error('quick game longer than 10 days'); }
      if (!st || st.length !== np || new Set(st).size !== np || (S.win != null && st[0] !== S.win) || !/^g[a-z0-9]{15}$/.test(S.gid)) { errors++; console.error('bad standings', st, S.win, S.gid); }
      stats.d += S.pl.reduce((a, q) => a + q.st.d, 0); stats.b += S.pl.reduce((a, q) => a + q.st.b, 0); stats.i += S.pl.filter(q => q.st.i).length; stats.t += S.pl.filter(q => q.st.t).length; stats.g++;
    }
    for (const q of S.pl) if (q.m < 0 || q.h < 0 || q.h > CFG.HMAX) { errors++; console.error('invalid player state', q); }
  }
  lens.sort((a, b) => a - b);
  const pct = p => lens[Math.min(lens.length - 1, Math.floor(lens.length * p))];
  console.log(`${np} players${mode !== 'classic' ? ` (${mode})` : ''}${days ? `, ${days}-day limit` : ''}: ${lens.length}/${GAMES} games finished, errors ${errors}, median days ${pct(.5)} (p10 ${pct(.1)}, p90 ${pct(.9)})`);
  return errors;
}

// Single-player bot AI: 1 smart bot against random-choice opponents
function botArena(np) {
  let wins = 0, errors = 0, done = 0;
  for (let g = 0; g < GAMES; g++) {
    const S = newState(); S.host = 'p0';
    for (let k = 0; k < np; k++) addPlayer(S, 'p' + k, 'P' + k, {bot: k === 0 ? 1 : 0});
    act(S, 'p0', {t: 'start'});
    let guard = 0;
    while (S.ph !== 'over' && guard++ < 20000) {
      const sa = botSide(S, 0); if (sa) act(S, 'p0', sa);
      const A = actor(S);
      const ok = A === 0 ? act(S, 'p0', botDecide(S, 0) || autoPick(S)) : botStep(S);
      if (!ok && !act(S, S.pl[actor(S)].id, autoPick(S))) { errors++; break; }
    }
    if (S.ph === 'over') { done++; if (S.win === 0) wins++; } else errors++;
  }
  console.log(`Bot AI, ${np}-player table (1 bot + ${np - 1} random player${np - 1 > 1 ? 's' : ''}): win rate ${Math.round(100 * wins / Math.max(1, done))}% (chance alone: ${Math.round(100 / np)}%), errors ${errors}`);
  return errors;
}

// v1.17: bots against bots (easy, normal, hard, hard). A bot must never pay a check it can't cover
// while holding a card that would lower or move it, and the levels must still differ.
function botTable() {
  const lv = ['easy', 'normal', 'hard', 'hard'], wins = [0, 0, 0, 0], used = [0, 0, 0, 0]; let errors = 0, done = 0, outWithCard = 0;
  for (let g = 0; g < GAMES; g++) {
    const S = newState(); S.host = 'p0';
    lv.forEach((l, k) => addPlayer(S, 'p' + k, 'P' + k, {bot: 1, bd: l}));
    act(S, 'p0', {t: 'start'});
    let guard = 0;
    while (S.ph !== 'over' && guard++ < 20000) {
      for (const i of S.ord) { const sa = botSide(S, i); if (sa && act(S, S.pl[i].id, sa)) used[i]++; }
      const A = actor(S); if (A < 0) break;
      const a = botDecide(S, A) || autoPick(S);
      if (a.t === 'pay' && botRescue(S, A)) outWithCard++;
      if (a.t === 'use') used[A]++;
      if (!act(S, S.pl[A].id, a) && !act(S, S.pl[A].id, autoPick(S))) { errors++; break; }
    }
    if (S.ph === 'over') { done++; if (S.win != null) wins[S.win]++; } else errors++;
  }
  const pc = k => Math.round(100 * wins[k] / Math.max(1, done));
  console.log(`Bots vs bots (easy, normal, hard, hard): wins ${pc(0)}% / ${pc(1)}% / ${pc(2)}% / ${pc(3)}%, cards played per game ${used.map(u => (u / GAMES).toFixed(2)).join(' / ')}, paid while holding a rescue card ${outWithCard}, errors ${errors}`);
  if (outWithCard) errors += outWithCard;
  if (used.some(u => u === 0)) { errors++; console.error('a bot level never played a card'); }
  if (pc(0) >= (pc(2) + pc(3)) / 2) { errors++; console.error('easy bots win as often as hard ones'); }
  return errors;
}
// v1.17: a bot that owns a venue and can't cover tonight's check accepts a low offer
function lowOffer() {
  const S = newState(); S.host = 'p0'; addPlayer(S, 'p0', 'A'); addPlayer(S, 'p1', 'B', {bot: 1, bd: 'hard'}); act(S, 'p0', {t: 'start'});
  S.ph = 'play'; S.fe = null; S.tq = [1, 0]; S.ti = 0; S.ord = [0, 1]; S.cur = 0; S.rd = 0;
  const p = 7; S.own[p] = {o: 1, pr: 40, lv: 1}; S.pl[1].m = 10; S.pl[0].h = 5; S.pl[1].h = 5;
  S.pend = {k: 'ow', i: 1, p, from: 0, amt: 20}; S.pl[0].m = 100;
  const a = botDecide(S, 1); const ok = a && a.t === 'owr' && a.ok === 1;
  S.pl[1].m = 300; const b = botDecide(S, 1); const no = b && b.t === 'owr' && b.ok === 0;
  console.log(`Low offer: broke bot accepts ${ok ? 'yes' : 'NO'}, rich bot refuses ${no ? 'yes' : 'NO'}`);
  return ok && no ? 0 : 1;
}

let total = 0;
total += botTable();
total += lowOffer();
for (const n of [2, 3, 4, 6]) total += run(n);
total += run(4, 20);
total += run(4, 0, 'quick');
total += run(4, 0, 'teams');
for (const n of [2, 4]) total += botArena(n);
console.log(`Achievement counters per game: deals ${(stats.d / stats.g).toFixed(2)}, belt uses ${(stats.b / stats.g).toFixed(2)}, iron-stomach players ${(stats.i / stats.g).toFixed(2)}, tycoon ${(stats.t / stats.g).toFixed(3)}`);
if (total) { console.error(`${total} errors found`); process.exit(1); }
console.log('All simulations passed.');
