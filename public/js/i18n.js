/**
 * Check Flip — languages: the language list, first-visit detection, loading, t() / tx() and helpers.
 * The texts themselves (board and card contents, UI strings, game log templates, item names) live in
 * js/lang/<code>.js, one file per language. The game log is kept by the engine as {k, p} (key + params)
 * and every player sees it in their own language.
 */
// Languages. Every language is a file in js/lang/<code>.js ({C, U, LOG, TXT, NAMES}). English and Turkish are
// imported here (English is the fallback for every missing text); the others (PACKS) are loaded when chosen.
// Every new text must be added to ALL of these files (tools/check-langs.mjs checks them against English).
import EN from './lang/en.js';
import TR from './lang/tr.js';
const LANGS = ['en', 'tr', 'es', 'pt', 'fr', 'de'];
const LANG_NAMES = {en: 'English', tr: 'Türkçe', es: 'Español', pt: 'Português (Brasil)', fr: 'Français', de: 'Deutsch'};
const LOCALES = {en: 'en-GB', tr: 'tr-TR', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE'};
const PACKS = ['es', 'pt', 'fr', 'de'];
let lang = 'en', geoCheck = false;
// First visit language, no permission needed: the saved choice; the /tr page → Turkish; the browser's
// language if we have it; a browser in English (or a language we don't have) visiting from Türkiye → Turkish
// (the country comes from Cloudflare, /api/geo); else English.
{ let s = null; try { s = localStorage.getItem('hs-lang'); } catch (e) {}
  if (LANGS.includes(s)) lang = s;
  else if (typeof location !== 'undefined' && /^\/tr(\/|$)/.test(location.pathname)) lang = 'tr';
  else if (typeof navigator !== 'undefined') {
    const want = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).map(x => String(x).slice(0, 2).toLowerCase());
    const hit = want.find(x => LANGS.includes(x)); if (hit) lang = hit;
    geoCheck = lang === 'en' && typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
  } }
async function geoLang() {
  if (!geoCheck) return;
  let cc = null; try { cc = localStorage.getItem('cf-cc'); } catch (e) {}
  if (!cc) {
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch('/api/geo', {signal: ctl.signal}); clearTimeout(to);
      if (r.ok) { cc = (await r.json()).c || 'XX'; try { localStorage.setItem('cf-cc', cc); } catch (e) {} }
    } catch (e) {}
  }
  if (cc === 'TR') lang = 'tr';
}

const getLang = () => lang;
const locale = () => LOCALES[lang] || 'en-GB';
const C = {}, U = {}, LOG = {}, TXT = {};
const loaded = new Set(), packs = {}, packHooks = [];
// add a language's texts: {C, U, LOG, TXT, NAMES}; other modules (account names) hook in with onPack
function install(l, pk) {
  C[l] = pk.C || {}; U[l] = Object.assign(U[l] || {}, pk.U || {}); LOG[l] = pk.LOG || {}; TXT[l] = pk.TXT || {};
  packs[l] = pk; loaded.add(l); packHooks.forEach(f => { try { f(l, pk); } catch (e) { console.error(e); } });
}
async function loadLang(l) {
  if (!PACKS.includes(l) || loaded.has(l)) return;
  install(l, (await import(`./lang/${l}.js`)).default);
}
// a hook also runs at once for the languages already in (English and Turkish)
const onPack = f => { packHooks.push(f); for (const l of loaded) { try { f(l, packs[l]); } catch (e) { console.error(e); } } };
// switch language (loads its pack first); resolves when the new texts are ready
async function setLang(l) {
  if (!LANGS.includes(l)) return;
  try { await loadLang(l); } catch (e) { console.error('language pack', l, e); return; }
  lang = l; try { localStorage.setItem('hs-lang', l); } catch (e) {} if (typeof document !== 'undefined') document.documentElement.lang = l;
}

const M = n => '¤' + n;
const MM = n => (n < 0 ? '−' : '') + '¤' + Math.abs(n);

install('en', EN); install('tr', TR);

const CL = part => (C[lang] && C[lang][part]) || C.en[part];
const sqName = kind => (CL('sq')[kind] || C.en.sq[kind])[0];
const sqDesc = kind => (CL('sq')[kind] || C.en.sq[kind])[1];
const venueName = key => CL('venue')[key] || C.en.venue[key] || key;
const cardName = c => (CL('cards')[c] || C.en.cards[c] || [c])[0];
const cardDesc = c => (CL('cards')[c] || C.en.cards[c] || ['', ''])[1];
const avatarLabel = k => CL('avatars')[k] || C.en.avatars[k] || k;
const nickList = () => CL('nicks');

function t(key, ...args) { const v = (U[lang] || U.en)[key] ?? U.en[key]; return typeof v === 'function' ? v(...args) : (v ?? key); }

let venueIcon = v => '';
const setVenueIconFn = fn => { venueIcon = fn; };
// A log entry or popup text: {k, p} from the engine (older plain strings are shown as-is).
function tx(e) {
  if (e == null) return '';
  if (typeof e === 'string') return e;
  const f = (LOG[lang] || {})[e.k] || (TXT[lang] || {})[e.k] || LOG.en[e.k] || TXT.en[e.k] || (U[lang] || {})[e.k] || U.en[e.k];
  if (!f) return e.k;
  try { return typeof f === 'function' ? f(e.p || {}) : f; } catch (err) { return e.k; }
}

// lets other modules (js/i18n-account.js) add UI strings
function extendStrings(o) { for (const l in o) Object.assign(U[l] = U[l] || {}, o[l]); }
const venueIconOf = v => venueIcon(v);
// the first language (saved / browser) is loaded before the game draws its first screen
const i18nReady = geoLang().then(() => loadLang(lang)).catch(() => { lang = 'en'; });
// for tools/check-langs.mjs
const __I18N = {C, U, LOG, TXT};

export {LANGS, LANG_NAMES, PACKS, locale, loadLang, onPack, i18nReady, venueIconOf, __I18N, getLang, setLang, extendStrings, t, tx, M, MM, sqName, sqDesc, venueName, cardName, cardDesc, avatarLabel, nickList, setVenueIconFn};
