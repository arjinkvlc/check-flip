/**
 * Check Flip — simple word filter for usernames, nicknames and chat.
 * Chat: bad words are replaced with *****. Names: a name containing one is refused.
 * The same lists are checked on the server for usernames (sql/schema.sql, public.name_blocked);
 * keep both in sync. This is a light filter, not a moderation system.
 */

// matched anywhere inside a word (long / unambiguous roots)
const ROOTS = [
  // English
  'nigger', 'nigga', 'niggr', 'faggot', 'fagot', 'hitler', 'retard', 'whore', 'slut', 'cunt', 'bitch', 'pussy',
  'penis', 'vagina', 'porn', 'fuck', 'shit', 'asshole', 'motherf', 'pedophil', 'pedofil', 'terrorist',
  'dildo', 'blowjob', 'handjob', 'cumshot', 'boob', 'tits', 'horny', 'milf', 'nude',
  // Türkçe (ş→s, ı→i, ç→c, ğ→g, ö→o, ü→u)
  'orospu', 'oruspu', 'orosbu', 'siktir', 'sikis', 'sikim', 'sikik', 'siker', 'sikeyim', 'sikey', 'amcik', 'aminak', 'aminakoy', 'gotunu', 'gotune', 'gotlek',
  'yarrak', 'yarak', 'dalyar', 'gotveren', 'gotver', 'ibne', 'pezevenk', 'pezeveng', 'kahpe', 'kaltak', 'serefsiz', 'gavat',
  'pust', 'tasak', 'tassak', 'surtuk', 'fahise', 'tecavuz', 'pornocu', 'yavsak', 'kevase', 'godos', 'dallama', 'hassiktir'
];
// matched only as a whole word (short roots that appear inside normal words)
const WORDS = ['sik', 'amk', 'aq', 'mk', 'oc', 'sex', 'seks', 'fag', 'dick', 'cock', 'rape', 'kkk', 'isis', 'nazi', 'bok'];

// one character → one character, so positions in the text stay the same
const MAP = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
  'ş': 's', 'ı': 'i', 'İ': 'i', 'ç': 'c', 'ğ': 'g', 'ö': 'o', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u'};
function norm(s) {
  let o = '';
  for (const ch of String(s)) { const l = ch.toLocaleLowerCase('en'); const m = MAP[ch] || MAP[l] || l; o += m.length === 1 ? m : m[0]; }
  return o;
}
// "fuuuck" and "f.u.c.k" still match: letters may repeat; in chat single separators between letters are allowed too
const esc = c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rootRe = (w, sep) => w.split('').map(esc).map(c => c + '+').join(sep ? '[\\s._\\-*]?' : '');
const RX_ROOT = new RegExp('(' + ROOTS.map(w => rootRe(w, true)).join('|') + ')', 'g');
const RX_WORD = new RegExp('(?<![a-z])(' + WORDS.map(w => rootRe(w, false)).join('|') + ')(?![a-z])', 'g');

/** true when a username / nickname contains a blocked word */
export function nameBlocked(name) {
  const n = norm(name);
  if (new RegExp(RX_ROOT.source).test(n.replace(/[^a-z]/g, ''))) return true;
  return new RegExp(RX_WORD.source).test(n.replace(/[^a-z]/g, ' '));
}

/** chat text with blocked words replaced by stars */
export function censor(text) {
  const src = String(text || ''); const n = norm(src);
  if (n.length !== [...src].length) return src;   // unexpected characters: leave as is
  const chars = [...src]; let hit = false;
  for (const re of [new RegExp(RX_ROOT.source, 'g'), new RegExp(RX_WORD.source, 'g')]) {
    let m; while ((m = re.exec(n))) { hit = true; for (let k = m.index; k < m.index + m[0].length; k++) if (!/\s/.test(chars[k])) chars[k] = '*'; if (!m[0].length) re.lastIndex++; }
  }
  return hit ? chars.join('') : src;
}
