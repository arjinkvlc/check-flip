/**
 * Check Flip — first-game guide: short tips shown once each, at the moment they matter.
 * Seen tips are remembered in this browser; "Hide tips" turns them off, the rules
 * section can turn them back on.
 */
import {actor} from './engine.js';
import {t} from './i18n.js';
import {ico} from './icons.js';
// square emojis in tip texts → the drawn board icons
const SQ_EMO = {'💰': 'gelir', '🥨': 'atis', '🏋️': 'spor', '🏋': 'spor'};
const withIcons = h => h.replace(/💰|🥨|🏋️|🏋/g, e => ico(SQ_EMO[e], 'in'));

const LS = 'cp-tips';
let st = {seen: {}, off: false};
try { st = Object.assign(st, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// which tip fits this moment for player index `me`? (null = none)
export function tipFor(V, me) {
  if (st.off || !V || me < 0 || (V.ph !== 'play' && V.ph !== 'feast')) return null;
  const A = actor(V), P = V.pend, f = V.fe;
  const rules = [
    ['hunger', V.ph === 'play' && V.day === 1],
    ['roll', V.ph === 'play' && !P && A === me],
    ['move', V.ph === 'play' && P && P.k === 'move' && P.i === me],
    ['buy', V.ph === 'play' && P && P.k === 'buy' && P.i === me],
    ['home', V.ph === 'play' && P && P.k === 'home' && P.i === me],
    ['payer', V.ph === 'feast' && f && f.w === me && !f.off],
    ['deal', V.ph === 'feast' && f && f.off && f.off.to === me],
    ['watch', V.ph === 'feast' && f && f.w !== me && !f.off]
  ];
  for (const [k, ok] of rules) if (ok && !st.seen[k]) return k;
  return null;
}
export function tipHTML(k) {
  return `<div class="tip" role="note" data-still="tip-${esc(k)}"><span class="tipi">💡</span><div class="tipt">${withIcons(t('tip_' + k))}</div>
    <div class="tipb"><button class="btn small" data-a="tipok" data-k="${esc(k)}">${esc(t('tipOk'))}</button><button class="linkbtn" data-a="tipoff">${esc(t('tipOff'))}</button></div></div>`;
}
export const tipSeen = k => { st.seen[k] = 1; save(); };
export const tipsOff = () => { st.off = true; save(); };
export const tipsReset = () => { st = {seen: {}, off: false}; save(); };
