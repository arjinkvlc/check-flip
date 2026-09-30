/**
 * Check Flip — texts added in v1.7 (season-over message, games with friends). English / Türkçe.
 */
import {extendStrings} from './i18n.js';

const en = {
  fmTitle: 'Recent games with friends', fmNone: 'No online games with your friends yet. Invite one from a private room!',
  fmWon: 'won', fmPlace: (p, n) => `${p}/${n}`,
  seTitle: n => `Season ${n} is over!`, sePlace: p => p === 1 ? 'You finished 1st 🏆' : `You finished ${p}${p === 2 ? 'nd' : p === 3 ? 'rd' : 'th'}`,
  seSub: (w, n) => `${w} ${w === 1 ? 'win' : 'wins'} · ${n} players took part`, seMedal: 'Your medal is now on your profile.',
  seNext: n => `Season ${n} has started: the board is back to zero.`, seOk: 'Nice!',
  pNameTitle: 'Username', pNameNote: 'You can change it once a week. Friends, leaderboards and your progress stay the same.',
  pNameWait: d => `You can change it again on ${d}.`, pNameBtn: 'Change', pNameSaved: n => `Your username is now ${n}.`,
  aErrNameWait: 'You changed your username less than a week ago.',
  settingsTitle: 'Settings', setMusic: 'Music', setLang: 'Language', setTheme: 'Theme', themeLight: 'Light', themeDark: 'Dark', setSound: 'Game sounds'
};
const tr = {
  fmTitle: 'Arkadaşlarla son oyunlar', fmNone: 'Henüz arkadaşlarınla çevrim içi oyun yok. Özel odadan birini davet et!',
  fmWon: 'kazandı', fmPlace: (p, n) => `${p}/${n}`,
  seTitle: n => `Sezon ${n} bitti!`, sePlace: p => p === 1 ? 'Birinci oldun 🏆' : `${p}. oldun`,
  seSub: (w, n) => `${w} galibiyet · ${n} oyuncu arasında`, seMedal: 'Madalyan artık profilinde.',
  seNext: n => `Sezon ${n} başladı: tablo sıfırlandı.`, seOk: 'Harika!',
  pNameTitle: 'Kullanıcı adı', pNameNote: 'Haftada bir değiştirebilirsin. Arkadaşların, sıralaman ve ilerlemen aynı kalır.',
  pNameWait: d => `Bir sonraki değişiklik: ${d}.`, pNameBtn: 'Değiştir', pNameSaved: n => `Kullanıcı adın artık ${n}.`,
  aErrNameWait: 'Kullanıcı adını bir haftadan kısa süre önce değiştirdin.',
  settingsTitle: 'Ayarlar', setMusic: 'Müzik', setLang: 'Dil', setTheme: 'Tema', themeLight: 'Açık', themeDark: 'Koyu', setSound: 'Oyun sesleri'
};
extendStrings({en, tr});
