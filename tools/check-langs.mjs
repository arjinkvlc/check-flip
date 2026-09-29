// Checks the language packs (public/js/lang/*.js) against English: missing or extra texts,
// functions with a different number of arguments, and texts that throw. Run: node tools/check-langs.mjs
globalThis.localStorage = {getItem: () => 'en', setItem() {}};
const base = new URL('../public/js/', import.meta.url);
const I = await import(new URL('i18n.js', base));
for (const f of ['i18n-account.js', 'i18n-v11.js', 'i18n-v13.js', 'i18n-v15.js', 'i18n-v16.js', 'i18n-v17.js', 'i18n-v18.js', 'i18n-v19.js', 'i18n-v110.js', 'i18n-v111.js'])
  await import(new URL(f, base));
const {C, U, LOG, TXT} = I.__I18N;
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
// names of items and achievements (i18n-account.js keeps NAMES private; compare through itemName/achName)
for (const l of I.PACKS) {
  console.log(`[${l}] ${I.LANG_NAMES[l]}`);
  let pk; try { pk = (await import(new URL(`lang/${l}.js`, base))).default; } catch (e) { say('pack missing or broken: ' + e.message); continue; }
  const UE = Object.fromEntries(Object.entries(U.en).filter(([k]) => !['itemName', 'achName', 'achDesc'].includes(k)));   // made by code (i18n-account.js onPack)
  compare('C', C.en, pk.C || {}); compare('U', UE, pk.U || {}); compare('LOG', LOG.en, pk.LOG || {}); compare('TXT', TXT.en, pk.TXT || {});
  const NE = pk.NAMES || {};
  for (const kind of ['frame', 'dice', 'board', 'bubble', 'title', 'ach']) if (!NE[kind]) say(`NAMES.${kind}: missing`);
}
console.log(problems ? `${problems} problem(s)` : 'All language packs complete.');
process.exitCode = problems ? 1 : 0;
