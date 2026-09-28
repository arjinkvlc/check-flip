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
  guestShort: 'Guest', signupPitch: 'Sign up to earn XP and unlock looks',
  pEmailTitle: 'E-mail for password reset', pEmailPh: 'you@example.com', pEmailAdd: 'Add e-mail', pEmailChange: 'Change e-mail',
  pEmailSaved: 'Saved. You can now reset your password with this e-mail.',
  pEmailConfirm: e => `We sent a confirmation link to ${e}. The new address is used after you click it.`,
  outShort: 'out', resultNote: d => `Ranked by money + restaurant value at the end of day ${d}.`,
  netFallback: 'Game server unreachable, switched to the backup connection.'
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
  guestShort: 'Misafir', signupPitch: 'Kayıt ol, XP kazan, görünüm aç',
  pEmailTitle: 'Şifre sıfırlama e-postası', pEmailPh: 'sen@ornek.com', pEmailAdd: 'E-posta ekle', pEmailChange: 'E-postayı değiştir',
  pEmailSaved: 'Kaydedildi. Artık şifreni bu e-postayla sıfırlayabilirsin.',
  pEmailConfirm: e => `${e} adresine bir onay bağlantısı gönderdik. Tıkladıktan sonra yeni adres geçerli olur.`,
  outShort: 'elendi', resultNote: d => `${d}. gün sonunda para + mekân değerine göre sıralama.`,
  netFallback: 'Oyun sunucusuna ulaşılamadı, yedek bağlantıya geçildi.'
};
extendStrings({en, tr});
