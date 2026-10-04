/**
 * Check Flip — names of items and achievements for the account screens.
 * The texts are in js/lang/<code>.js (account texts in U, item and achievement names in NAMES);
 * this file turns each language's NAMES into the itemName / achName / achDesc functions.
 */
import {extendStrings, onPack} from './i18n.js';

// item and achievement names per language: [name, description]
const NAMES = {}, EVN = {};
// v1.17: the "all four quests" achievement of each run of an event, e.g. halloween_2026 → "Halloween 2026"
const FINAL_RE = /^(halloween|newyear|valentine|easter)_(\d{4})$/;
function evFinal(l, key) { const m = FINAL_RE.exec(key || ''), E = EVN[l] || EVN.en; return m && E ? `${E.name(m[1])} ${m[2]}` : ''; }
// names in a language, falling back to English for anything a pack doesn't have
function nameFns(l) {
  const N = NAMES[l] || {}, E = NAMES.en, part = k => Object.assign({}, E[k], N[k] || {});
  const ach = part('ach'), title = part('title');
  return {
    itemName: (kind, key) => kind === 'title' ? (title[key] || (ach[key] ? ach[key][0] : evFinal(l, key) || key)) : (part(kind)[key] || key),
    achName: key => ach[key] ? ach[key][0] : evFinal(l, key) || key,
    achDesc: key => { if (!ach[key] && FINAL_RE.test(key)) return (EVN[l] || EVN.en).all(evFinal(l, key)); const d = (ach[key] || ['', ''])[1]; return typeof d === 'function' ? d() : d; }
  };
}
// every language (js/lang/*.js) brings its own NAMES; English and Turkish are already in, so this runs for them at once
onPack((l, pk) => { NAMES[l] = pk.NAMES || {}; if (pk.U && pk.U.evName) EVN[l] = {name: pk.U.evName, all: pk.U.evAllDesc}; extendStrings({[l]: nameFns(l)}); });
