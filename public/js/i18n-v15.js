/**
 * Check Flip — texts added in v1.5 (private hands, full-hand choice, dice skins, word filter). English / Türkçe.
 */
import {extendStrings, cardName} from './i18n.js';

const en = {
  hiddenCardT: 'A card for the hand', hiddenCardS: n => `${n} keeps it secret until it's played.`,
  exSwapMe: 'Your hand is full: choose which card to keep', exSwap: n => `${n}'s hand is full, choosing a card to keep`,
  sSwap: 'hand is full, choosing', swapQ: 'Your hand is full (2 cards). Keep the new card instead of one of yours, or let it go.',
  swapDrop: c => `Drop ${c}`, swapKeepNew: c => `and keep ${c}`, swapBurn: c => `Skip the new ${c}`, swapKeepOld: 'keep my hand as it is',
  isSwapping: n => `${n} has a full hand and is choosing which card to keep…`,
  swapped: p => `${p.n} dropped ${cardName(p.o)} for ${cardName(p.c)}`,
  drewH: p => `${p.n} drew a card for the hand`, handFullH: p => `${p.n}: hand is full, a card was let go`, swappedH: p => `${p.n} swapped a card in hand`,
  pTabDice: 'Dice', pDiceNote: 'Your dice are shown to everyone while you roll.',
  aErrNameBlocked: "That username isn't allowed. Please pick another one.",
  moreAria: 'More settings', aNameNo: 'not allowed'
};
const tr = {
  hiddenCardT: 'Gizli kart', hiddenCardS: n => `${n} bu kartı oynayana kadar gizli tutuyor.`,
  exSwapMe: 'Elin dolu: hangi kartı tutacağını seç', exSwap: n => `${n} oyuncusunun eli dolu, hangi kartı tutacağını seçiyor`,
  sSwap: 'eli dolu, kart seçiyor', swapQ: 'Elin dolu (2 kart). Yeni kartı eldekilerden birinin yerine al ya da bırak.',
  swapDrop: c => `${c} kartını bırak`, swapKeepNew: c => `${c} kartını al`, swapBurn: c => `Yeni kartı (${c}) alma`, swapKeepOld: 'Elim olduğu gibi kalsın',
  isSwapping: n => `${n} elinde yer açmak için kart seçiyor…`,
  swapped: p => `${p.n}, ${cardName(p.o)} yerine ${cardName(p.c)} aldı`,
  drewH: p => `${p.n} ele bir kart çekti`, handFullH: p => `${p.n}: eli dolu olduğu için bir kart bırakıldı`, swappedH: p => `${p.n} elindeki bir kartı değiştirdi`,
  pTabDice: 'Zarlar', pDiceNote: 'Seçtiğin zarları, zar atarken herkes görür.',
  aErrNameBlocked: 'Bu kullanıcı adına izin verilmiyor. Lütfen başka bir ad seç.',
  moreAria: 'Diğer ayarlar', aNameNo: 'izin verilmiyor'
};
extendStrings({en, tr});
