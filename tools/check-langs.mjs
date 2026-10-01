// Checks every language file (public/js/lang/*.js) against English (lang/en.js): missing or extra texts,
// functions with a different number of arguments, and texts that throw. Run: node tools/check-langs.mjs
globalThis.localStorage = {getItem: () => 'en', setItem() {}};
const base = new URL('../public/js/', import.meta.url);
const I = await import(new URL('i18n.js', base));   // i18n.js first: it imports lang/en.js and lang/tr.js (circular import)
const EN = (await import(new URL('lang/en.js', base))).default;
const {C, U, LOG, TXT} = EN;
const P = new Proxy({}, {get: (o, k) => k === Symbol.toPrimitive ? () => 'X' : k === 'length' ? 1 : k === 'map' ? f => ['X'].map(f) : 'X'});
let problems = 0;
const say = m => { problems++; console.log('  ' + m); };
function compare(name, en, xx) {
  for (const k of Object.keys(en)) {
    if (!(k in xx)) { say(`${name}.${k}: missing`); continue; }
    const a = en[k], b = xx[k];
    if (typeof a === 'function') {
      if (typeof b !== 'function' && a.length > 0) { say(`${name}.${k}: should be a function`); continue; }
      if (typeof b === 'function' && b.length !== a.length) say(`${name}.${k}: takes ${b.length} arguments, English takes ${a.length}`);
      let ok = true; try { a(P, P, P, P); } catch (e) { ok = false; }
      if (ok && typeof b === 'function') { try { const r = b(P, P, P, P); if (typeof r !== 'string') say(`${name}.${k}: doesn't return text`); } catch (e) { say(`${name}.${k}: throws ${e.message}`); } }
    } else if (Array.isArray(a)) {
      if (!Array.isArray(b)) say(`${name}.${k}: should be a list`);
      else if (k !== 'nicks' && b.length !== a.length) say(`${name}.${k}: ${b.length} items, English has ${a.length}`);
      else if (k !== 'nicks') a.forEach((x, i) => { if (typeof x === 'function' && typeof b[i] !== 'function') say(`${name}.${k}[${i}]: should be a function`); });
    } else if (a && typeof a === 'object') {
      if (!b || typeof b !== 'object') say(`${name}.${k}: should be an object`); else compare(`${name}.${k}`, a, b);
    } else if (typeof b !== 'string') say(`${name}.${k}: should be text`);
  }
  for (const k of Object.keys(xx)) if (!(k in en)) say(`${name}.${k}: not in English (typo?)`);
}
const NAMES_EN = EN.NAMES;
for (const l of I.LANGS.filter(l => l !== 'en')) {
  console.log(`[${l}] ${I.LANG_NAMES[l]}`);
  let pk; try { pk = (await import(new URL(`lang/${l}.js`, base))).default; } catch (e) { say('pack missing or broken: ' + e.message); continue; }
  compare('C', C, pk.C || {}); compare('U', U, pk.U || {}); compare('LOG', LOG, pk.LOG || {}); compare('TXT', TXT, pk.TXT || {});
  const NE = pk.NAMES || {};
  for (const kind of ['frame', 'dice', 'board', 'bubble', 'title', 'ach']) if (!NE[kind]) say(`NAMES.${kind}: missing`);
  else if (kind !== 'title') for (const k of Object.keys(NAMES_EN[kind])) if (!(k in NE[kind])) say(`NAMES.${kind}.${k}: missing`);
}
console.log(problems ? `${problems} problem(s)` : 'All languages complete.');
process.exitCode = problems ? 1 : 0;
