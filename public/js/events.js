/**
 * Check Flip — seasonal events (v1.17).
 *  - dates: Halloween 15 Oct – 15 Nov, New Year 1 Dec – 31 Jan, Valentine's 1 – 28/29 Feb,
 *    Easter 3 weeks before to 1 week after (Western) Easter Sunday; never two at once (Easter gives way).
 *    The server checks the same dates (public.current_event) before counting event quests.
 *  - the theme (page background layer, music variation) shows during an event unless the player
 *    turned "Seasonal themes" off in Settings; an admin can preview any theme in their own browser.
 *  - decorations live only in a fixed layer behind the whole app (#evbg), never on the board or cards.
 */
import {THEMES} from './event-art.js';
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
const LS_ON = 'cf-season', LS_PREV = 'cf-evprev';

export const EVENT_KEYS = ['halloween', 'newyear', 'valentine', 'easter'];
// events whose theme is drawn already (the others follow in later releases)
export const THEMED = {halloween: 1, newyear: 1, valentine: 1, easter: 1};

// Western Easter Sunday (anonymous Gregorian algorithm), as a UTC date
export function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, mo - 1, da));
}
const md = d => (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
const DAY = 864e5;
// which event is on at time `d` (UTC date, like the server); null = none
export function eventAt(d = new Date()) {
  const x = md(d);
  if (x >= 1015 && x <= 1115) return 'halloween';
  if (x >= 1201 || x <= 131) return 'newyear';
  if (x >= 201 && x <= 229) return 'valentine';
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), e = easterSunday(d.getUTCFullYear()).getTime();
  if (day >= e - 21 * DAY && day <= e + 7 * DAY) return 'easter';
  return null;
}
// first and last day of the event running (or next running) around `d`
export function eventRange(ev, d = new Date()) {
  const y = d.getUTCFullYear(), U = (yy, m, dd) => new Date(Date.UTC(yy, m - 1, dd));
  if (ev === 'halloween') return [U(y, 10, 15), U(y, 11, 15)];
  if (ev === 'newyear') return md(d) <= 131 ? [U(y - 1, 12, 1), U(y, 1, 31)] : [U(y, 12, 1), U(y + 1, 1, 31)];
  if (ev === 'valentine') return [U(y, 2, 1), new Date(Date.UTC(y, 2, 1) - DAY)];
  if (ev === 'easter') { const e = easterSunday(y).getTime(); return [new Date(e - 21 * DAY), new Date(e + 7 * DAY)]; }
  return null;
}
// "15 Oct – 15 Nov" in the player's language (Easter moves every year, so the caller says "during the Easter period")
export function rangeText(ev, locale, d = new Date()) {
  const r = eventRange(ev, d); if (!r) return '';
  try { const f = new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'short', timeZone: 'UTC'}); return `${f.format(r[0])} – ${f.format(r[1])}`; }
  catch (e) { return ''; }
}

/* ---- what this browser shows ---- */
export const seasonOn = () => lsGet(LS_ON) !== '0';
export function setSeasonOn(on) { lsSet(LS_ON, on ? '1' : '0'); apply(); }
export const previewOf = () => { const p = lsGet(LS_PREV); return p && THEMED[p] ? p : null; };
export function setPreview(ev) { lsSet(LS_PREV, ev && THEMED[ev] ? ev : null); apply(); }
let allowPreview = () => false;   // set by the app: only admins can preview
export const setPreviewGate = f => { allowPreview = f; apply(); };
// the event whose look is on screen now (null = normal look)
export function themeNow() {
  if (allowPreview() && previewOf()) return previewOf();
  const ev = eventAt(); return ev && THEMED[ev] && seasonOn() ? ev : null;
}
// event shown on the home card / profile tab: the real one, or the admin's preview
export const eventNow = () => (allowPreview() && previewOf()) || eventAt();

let onChange = () => {};
export const onTheme = f => { onChange = f; };
let shownEv = undefined;
export function apply() {
  if (typeof document === 'undefined' || !document.body) return;
  const ev = themeNow(); if (ev === shownEv) return; shownEv = ev;
  let bg = document.getElementById('evbg'), st = document.getElementById('evstyle');
  if (!ev) { if (bg) bg.remove(); if (st) st.remove(); delete document.body.dataset.event; onChange(null); return; }
  if (!st) { st = document.createElement('style'); st.id = 'evstyle'; document.head.appendChild(st); }
  st.textContent = THEMES[ev].style();
  if (!bg) { bg = document.createElement('div'); bg.id = 'evbg'; bg.setAttribute('aria-hidden', 'true'); document.body.prepend(bg); }
  bg.innerHTML = THEMES[ev].html; bg.dataset.ev = ev;
  document.body.dataset.event = ev; onChange(ev);
}
// an event can start or end while the page is open
if (typeof document !== 'undefined') setInterval(() => apply(), 30 * 60 * 1000);
