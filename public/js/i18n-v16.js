/**
 * Check Flip — texts added in v1.6 (bot levels, bot takeover, quick chat, mute / kick, awards, seasons, sharing, shapes). English / Türkçe.
 */
import {extendStrings, M} from './i18n.js';

const en = {
  botLvLbl: 'Bot level', botLvAria: 'Level of the next bot',
  bot_easy: 'Easy', bot_normal: 'Normal', bot_hard: 'Hard',
  botNote_easy: 'makes mistakes', botNote_normal: 'plays fair', botNote_hard: 'no mercy',
  botPlaysTag: '🤖 bot is playing', botTook: p => `${p.n} dropped off, a bot plays until they're back`, botLeft: p => `${p.n} is back and plays again`,
  kicked: p => `${p.n} was removed from the room`, kickAria: n => `Remove ${n} from the room`, kickQ: n => `Remove ${n} from the room? They can't come back to this room.`,
  eKicked: 'The host removed you from this room.',
  muteAria: n => `Mute ${n}`, mutedMsg: n => `${n} is muted. You won't see their messages or reactions.`, unmute: 'Undo',
  quickAria: 'Quick messages',
  qc_treat: "It's on you! 😋", qc_gg: 'Good game!', qc_nice: 'Nice move 👏', qc_luck: 'Lucky you! 🍀', qc_close: 'So close!', qc_belt: 'Tighten that belt 🪢', qc_hungry: "I'm starving 😭", qc_again: 'Rematch?',
  awardsHd: 'Awards',
  aw_pm: 'Biggest spender', aw_pm_v: v => `${M(v)} in checks`,
  aw_mh: 'Hungriest', aw_mh_v: v => `hunger ${v}`,
  aw_d: 'Deal maker', aw_d_v: v => `${v} ${v === 1 ? 'deal' : 'deals'}`,
  aw_b: 'Belt master', aw_b_v: v => `${v} belt${v === 1 ? '' : 's'}`,
  aw_by: 'Property tycoon', aw_by_v: v => `${v} restaurant${v === 1 ? '' : 's'}`,
  aw_cu: 'Card shark', aw_cu_v: v => `${v} card${v === 1 ? '' : 's'} played`,
  aw_up: 'Renovator', aw_up_v: v => `${v} upgrade${v === 1 ? '' : 's'}`,
  lbSeason: n => `Season ${n}`,
  lbSeasonNote: (n, d) => `Online wins in season ${n} (this month, ties by XP). Top 3 get a medal when it ends · ${d} day${d === 1 ? '' : 's'} left.`,
  medalTitle: (s, p) => `${['', 'Gold', 'Silver', 'Bronze'][p]} medal · finished season ${s} in ${['', '1st', '2nd', '3rd'][p]} place`, medalLive: (s, p) => `Season ${s}: ${['', '1st', '2nd', '3rd'][p]} on the leaderboard for now (the medal is given when the season ends)`,
  waText: c => `Join my Check Flip table! Room code: ${c}`, shareLink: 'Share',
  shapesAria: 'Shapes on tokens (colour-blind friendly)'
};
const tr = {
  botLvLbl: 'Bot seviyesi', botLvAria: 'Eklenecek botun seviyesi',
  bot_easy: 'Kolay', bot_normal: 'Normal', bot_hard: 'Zor',
  botNote_easy: 'hata yapar', botNote_normal: 'dengeli', botNote_hard: 'acımaz',
  botPlaysTag: '🤖 bot oynuyor', botTook: p => `${p.n} bağlantısını kaybetti, dönene kadar yerine bot oynuyor`, botLeft: p => `${p.n} geri döndü ve oyuna devam ediyor`,
  kicked: p => `${p.n} odadan çıkarıldı`, kickAria: n => `${n} oyuncusunu odadan çıkar`, kickQ: n => `${n} odadan çıkarılsın mı? Bu odaya geri giremez.`,
  eKicked: 'Oda sahibi seni bu odadan çıkardı.',
  muteAria: n => `${n} oyuncusunu sessize al`, mutedMsg: n => `${n} sessize alındı. Mesajlarını ve tepkilerini görmeyeceksin.`, unmute: 'Geri al',
  quickAria: 'Hazır mesajlar',
  qc_treat: 'Hesap sende! 😋', qc_gg: 'İyi oyundu!', qc_nice: 'Güzel hamle 👏', qc_luck: 'Şansa bak! 🍀', qc_close: 'Az kaldı!', qc_belt: 'Kemerleri sık 🪢', qc_hungry: 'Açlıktan öldüm 😭', qc_again: 'Rövanş?',
  awardsHd: 'Ödüller',
  aw_pm: 'Hesap kurbanı', aw_pm_v: v => `${M(v)} hesap ödedi`,
  aw_mh: 'En aç', aw_mh_v: v => `açlık ${v}`,
  aw_d: 'Pazarlıkçı', aw_d_v: v => `${v} anlaşma`,
  aw_b: 'Kemer ustası', aw_b_v: v => `${v} kez kemer sıktı`,
  aw_by: 'Emlak kralı', aw_by_v: v => `${v} mekân`,
  aw_cu: 'Kart ustası', aw_cu_v: v => `${v} kart oynadı`,
  aw_up: 'Dekoratör', aw_up_v: v => `${v} yükseltme`,
  lbSeason: n => `Sezon ${n}`,
  lbSeasonNote: (n, d) => `${n}. sezondaki çevrim içi galibiyetler (bu ay; eşitlikte XP’ye bakılır). Sezon sonunda ilk 3 oyuncu madalya kazanır · ${d} gün kaldı.`,
  medalTitle: (s, p) => `${['', 'Altın', 'Gümüş', 'Bronz'][p]} madalya · Sezon ${s} sıralamasını ${p}. sırada bitirdi`, medalLive: (s, p) => `Sezon ${s} sıralamasında şu an ${p}. sırada (madalya sezon bitince verilir)`,
  waText: c => `Check Flip masama gel! Oda kodu: ${c}`, shareLink: 'Paylaş',
  shapesAria: 'Piyonlarda şekiller (renk körlüğü için)'
};
extendStrings({en, tr});
