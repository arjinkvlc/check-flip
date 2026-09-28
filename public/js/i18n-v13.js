/**
 * Check Flip — texts added in v1.3 (new home screen, light/dark theme, side tabs). English / Türkçe.
 */
import {extendStrings} from './i18n.js';

const en = {
  heroQ: "Who's stuck with the check tonight?",
  quickTitle: 'Quick game', quickSub: 'Sit at an open table and play right away',
  tFriends: 'With friends', tFriendsSub: 'Create a room or join with a code',
  tBots: 'Against bots', tBotsSub: 'Single player, half XP',
  tLocal: 'Same device', tLocalSub: 'Take turns on one screen',
  createPrivate: 'Create a private room',
  installShort: 'Install app',
  themeAria: 'Light / dark theme',
  recHd: 'CHECK', rec1: 'Lentil soup', rec2: 'Pizza ×3', rec3: 'Tiramisu', recTot: 'TOTAL',
  profileBtn: 'Profile', friendsShort: 'Friends', questShort: 'Daily quest',
  guestShort: 'Guest', signupPitch: 'Sign up to earn XP and unlock looks'
};
const tr = {
  heroQ: 'Bu akşam hesap kimde kalacak?',
  quickTitle: 'Hızlı oyun', quickSub: 'Boş bir masaya otur, hemen başla',
  tFriends: 'Arkadaşlarla', tFriendsSub: 'Oda kur ya da kodla katıl',
  tBots: 'Botlara karşı', tBotsSub: 'Tek kişilik, yarım XP',
  tLocal: 'Aynı cihaz', tLocalSub: 'Sırayla tek ekranda',
  createPrivate: 'Özel oda kur',
  installShort: 'Uygulamayı yükle',
  themeAria: 'Açık / koyu tema',
  recHd: 'HESAP', rec1: 'Mercimek', rec2: 'Lahmacun ×3', rec3: 'Künefe', recTot: 'TOPLAM',
  profileBtn: 'Profil', friendsShort: 'Arkadaşlar', questShort: 'Günlük görev',
  guestShort: 'Misafir', signupPitch: 'Kayıt ol, XP kazan, görünüm aç'
};
extendStrings({en, tr});
