/**
 * Check Flip — names of items and achievements for the account screens.
 * The texts are in js/lang/<code>.js (account texts in U, item and achievement names in NAMES);
 * this file turns each language's NAMES into the itemName / achName / achDesc functions.
 */
import {extendStrings, onPack} from './i18n.js';

// item and achievement names per language: [name, description]
const NAMES = {};
// names in a language, falling back to English for anything a pack doesn't have
function nameFns(l) {
  const N = NAMES[l] || {}, E = NAMES.en, part = k => Object.assign({}, E[k], N[k] || {});
  const ach = part('ach'), title = part('title');
  return {
    itemName: (kind, key) => kind === 'title' ? (title[key] || (ach[key] || [key])[0]) : (part(kind)[key] || key),
    achName: key => (ach[key] || [key])[0],
    achDesc: key => { const d = (ach[key] || ['', ''])[1]; return typeof d === 'function' ? d() : d; }
  };
}
// every language (js/lang/*.js) brings its own NAMES; English and Turkish are already in, so this runs for them at once
onPack((l, pk) => { NAMES[l] = pk.NAMES || {}; extendStrings({[l]: nameFns(l)}); });
