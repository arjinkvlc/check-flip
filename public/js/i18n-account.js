/**
 * Check Flip — texts for accounts, profile, achievements and cosmetics (English / Türkçe).
 * Registered into the main dictionary of js/i18n.js.
 */
import {extendStrings, M} from './i18n.js';
import {IRON} from './engine.js';

const en = {
  // home account panel
  aGuest: 'Playing as guest',
  aGuestNote: 'Create a free account to earn XP, level up and unlock achievements, avatar frames, board styles and chat bubbles.',
  aLogin: 'Log in', aSignup: 'Sign up', aLogout: 'Log out', aProfile: '🎨 Profile & looks',
  aLv: n => `Lv ${n}`, aXp: (x, next) => `${x} / ${next} XP`, aXpMax: x => `${x} XP · max level`,
  aLoading: 'Checking your account…', aNameLocked: 'You play under your username.',
  // auth screen
  aTabLogin: 'Log in', aTabSignup: 'Sign up',
  aUserOrEmail: 'Username or e-mail', aUsername: 'Username', aUsernameHint: '3–14 characters: letters, numbers or _',
  aPassword: 'Password', aPasswordHint: 'At least 6 characters',
  aEmailOpt: 'E-mail (optional)', aEmailHint: "Only used to reset your password. Without an e-mail, a forgotten password can't be recovered.",
  aForgot: 'Forgot your password?', aForgotTitle: 'Reset password',
  aForgotNote: "Enter the e-mail address on your account and we'll send you a reset link. Accounts without an e-mail can't be recovered.",
  aSendLink: 'Send reset link', aLinkSent: 'If an account uses this e-mail, a reset link is on its way. Check your inbox and spam folder.',
  aNewPwTitle: 'Set a new password', aNewPw: 'New password', aSave: 'Save', aPwChanged: "Password updated. You're logged in.",
  aBackToLogin: '← Back to log in', aAsGuest: 'Continue as guest', aNameFree: '✓ available', aNameUsed: '✗ taken',
  aWorking: 'Please wait…', aWelcome: n => `Welcome, ${n}!`, aShowPw: 'Show password',
  aConsent: 'I have read the <a href="privacy.html" target="_blank" rel="noopener">Privacy Notice</a> and agree that my data is processed as described there, including on servers outside Türkiye.',
  pDeleteTitle: 'Delete account', pDeleteNote: 'Deletes your account, XP, achievements, cosmetics and game results for good. This can’t be undone.',
  pDeleteBtn: 'Delete my account', pDeleteConfirm: n => `Type your username (${n}) to delete your account permanently:`, pDeleteMismatch: "The username didn't match, nothing was deleted.",
  privacyLink: 'Privacy Notice',
  aSignupNote: 'Your username is shown to other players. Guests can still play everything; they just don’t earn XP.',
  // errors
  aErrGeneric: 'Something went wrong. Please try again.', aErrTooMany: 'Too many attempts. Wait a few minutes and try again.',
  aErrLogin: 'Wrong username/e-mail or password.', aErrEmailTaken: 'This e-mail already has an account.',
  aErrNameTaken: 'This username is taken.', aErrName: 'Usernames are 3–14 characters: letters, numbers or _.',
  aErrPwShort: 'The password must be at least 6 characters.', aErrEmailInvalid: "That e-mail address doesn't look right.",
  aErrSignupOff: 'Sign-ups are currently closed.', aErrNet: "Couldn't reach the account server. Check your connection.",
  aErrLocked: "You haven't unlocked that yet.", aErrConfirm: 'Account created, but it needs e-mail confirmation first. Check your inbox.',
  aUnavailable: "Accounts are unavailable right now. You can still play as a guest.",
  // profile screen
  pTitle: 'Profile & looks', pBack: '← Back',
  pTabAvatar: 'Avatar', pTabFrames: 'Frames', pTabBoards: 'Boards', pTabBubbles: 'Chat bubbles', pTabTitles: 'Titles', pTabAch: 'Achievements', pTabStats: 'Stats',
  pEquip: 'Equip', pEquipped: '✓ Equipped', pLockedLv: n => `🔒 Level ${n}`, pLockedAch: a => `🔒 ${a}`,
  pAvatarNote: 'Your default avatar. It is picked for you when you join a table (if nobody else has it).',
  pFramesNote: 'Frames go around your avatar in the lobby, the player list and on the board. Everyone at the table sees them.',
  pBoardsNote: 'Board styles change the table in the middle of the board. Only you see your board style.',
  pBubblesNote: 'The style of your chat messages. Everyone in the room sees it.',
  pTitlesNote: 'Titles appear under your name. Earn more with achievements.',
  pAchNote: 'Achievements unlock titles, frames, board styles and chat bubbles.',
  pBotNote: '🤖 Games against bots give half XP but never count toward achievements (except level achievements). Wins and other achievements only come from online games, and they are confirmed when another player at the same table saves the same result.',
  pRewards: 'Unlocks:', pDone: '✓ Unlocked', pProgress: (a, b) => `${a} / ${b}`,
  pWins: 'Online wins', pGames: 'Online games', pBotGames: 'Bot games', pXpTotal: 'Total XP', pLevel: 'Level',
  pDeals: 'Checks passed on', pBelt: 'Belts tightened', pMember: 'Member since',
  pRecent: 'Recent games', pNoRecent: 'No games yet. Finish a game while logged in to see it here.',
  pPlace: (n, of) => `#${n} of ${of}`, pPending: 'waiting for confirmation', pNotCounted: 'not counted', pSolo: '🤖 bot game', pOnline: '🌐 online',
  pEmailOn: e => `Password reset e-mail: ${e}`, pEmailOff: "No e-mail on this account, so a forgotten password can't be recovered.",
  pPreview: 'Preview', pYou: 'You',
  // end of game
  rTitle: 'Your progress', rSaving: 'Saving your result…', rXp: n => `+${n} XP`,
  rPending: n => `+${n} XP more (plus your win and achievement progress) once another player at this table saves the same result.`,
  rVerified: 'Result confirmed by another player.',
  rLevelUp: n => `🎉 Level up! You're now level ${n}.`, rNewAch: 'Achievement unlocked', rNewItems: 'New unlocks',
  rShort: "Games shorter than 3 days or 4 minutes don't earn XP.",
  rLimit: 'XP limit reached for now: at most one counted game every 4 minutes and 12 per hour.',
  rDup: "This game's result was already saved.",
  rBot: '🤖 Bot game: half XP, and it doesn’t count toward achievements.',
  rGuest: 'Log in to earn XP and unlock achievements and cosmetics.', rErr: "Couldn't save your result.",
  rNotHot: "Same-device games don't earn XP.",
  lvTag: n => `Lv ${n}`,
  rulesAcc: '<b>Accounts (optional):</b> logged-in players earn XP and levels, unlock achievements, avatar frames, board styles and chat bubbles. <b>Bot games give half XP and don’t count toward achievements</b>; wins and achievements come from online games once another player at the table confirms the result. Games shorter than 3 days or 4 minutes don’t count.'
};

const tr = {
  aGuest: 'Misafir olarak oynuyorsun',
  aGuestNote: 'Ücretsiz hesap aç: XP kazan, seviye atla; başarımlar, avatar çerçeveleri, tahta desenleri ve sohbet balonları aç.',
  aLogin: 'Giriş yap', aSignup: 'Kayıt ol', aLogout: 'Çıkış', aProfile: '🎨 Profil ve görünüm',
  aLv: n => `Sv ${n}`, aXp: (x, next) => `${x} / ${next} XP`, aXpMax: x => `${x} XP · en yüksek seviye`,
  aLoading: 'Hesabın kontrol ediliyor…', aNameLocked: 'Kullanıcı adınla oynuyorsun.',
  aTabLogin: 'Giriş yap', aTabSignup: 'Kayıt ol',
  aUserOrEmail: 'Kullanıcı adı veya e-posta', aUsername: 'Kullanıcı adı', aUsernameHint: '3–14 karakter: harf, rakam veya _',
  aPassword: 'Şifre', aPasswordHint: 'En az 6 karakter',
  aEmailOpt: 'E-posta (isteğe bağlı)', aEmailHint: 'Yalnızca şifre sıfırlamak için kullanılır. E-posta eklemezsen unutulan şifre kurtarılamaz.',
  aForgot: 'Şifreni mi unuttun?', aForgotTitle: 'Şifre sıfırlama',
  aForgotNote: 'Hesabındaki e-posta adresini yaz, sıfırlama bağlantısı gönderelim. E-postası olmayan hesaplar kurtarılamaz.',
  aSendLink: 'Bağlantıyı gönder', aLinkSent: 'Bu e-postayla bir hesap varsa sıfırlama bağlantısı yolda. Gelen kutunu ve spam klasörünü kontrol et.',
  aNewPwTitle: 'Yeni şifre belirle', aNewPw: 'Yeni şifre', aSave: 'Kaydet', aPwChanged: 'Şifren güncellendi, giriş yaptın.',
  aBackToLogin: '← Girişe dön', aAsGuest: 'Misafir olarak devam et', aNameFree: '✓ uygun', aNameUsed: '✗ alınmış',
  aWorking: 'Lütfen bekle…', aWelcome: n => `Hoş geldin, ${n}!`, aShowPw: 'Şifreyi göster',
  aConsent: '<a href="privacy.html" target="_blank" rel="noopener">Gizlilik ve KVKK Aydınlatma Metni</a>’ni okudum; verilerimin, Türkiye dışındaki sunucularda işlenmesi dahil, metinde anlatıldığı şekilde işlenmesine açık rıza veriyorum.',
  pDeleteTitle: 'Hesabı sil', pDeleteNote: 'Hesabını, XP’ni, başarımlarını, görünümlerini ve oyun sonuçlarını kalıcı olarak siler. Geri alınamaz.',
  pDeleteBtn: 'Hesabımı sil', pDeleteConfirm: n => `Hesabını kalıcı olarak silmek için kullanıcı adını (${n}) yaz:`, pDeleteMismatch: 'Kullanıcı adı eşleşmedi, hiçbir şey silinmedi.',
  privacyLink: 'Gizlilik ve KVKK',
  aSignupNote: 'Kullanıcı adın diğer oyunculara görünür. Misafirler de her şeyi oynayabilir, sadece XP kazanmazlar.',
  aErrGeneric: 'Bir şeyler ters gitti. Tekrar dene.', aErrTooMany: 'Çok fazla deneme. Birkaç dakika bekleyip tekrar dene.',
  aErrLogin: 'Kullanıcı adı/e-posta veya şifre yanlış.', aErrEmailTaken: 'Bu e-postayla zaten bir hesap var.',
  aErrNameTaken: 'Bu kullanıcı adı alınmış.', aErrName: 'Kullanıcı adı 3–14 karakter olmalı: harf, rakam veya _.',
  aErrPwShort: 'Şifre en az 6 karakter olmalı.', aErrEmailInvalid: 'E-posta adresi geçerli görünmüyor.',
  aErrSignupOff: 'Kayıtlar şu an kapalı.', aErrNet: 'Hesap sunucusuna ulaşılamadı. Bağlantını kontrol et.',
  aErrLocked: 'Bunu henüz açmadın.', aErrConfirm: 'Hesap oluşturuldu ama önce e-posta onayı gerekiyor. Gelen kutunu kontrol et.',
  aUnavailable: 'Hesaplar şu an kullanılamıyor. Misafir olarak oynamaya devam edebilirsin.',
  pTitle: 'Profil ve görünüm', pBack: '← Geri',
  pTabAvatar: 'Avatar', pTabFrames: 'Çerçeveler', pTabBoards: 'Tahtalar', pTabBubbles: 'Sohbet balonları', pTabTitles: 'Unvanlar', pTabAch: 'Başarımlar', pTabStats: 'İstatistikler',
  pEquip: 'Kuşan', pEquipped: '✓ Kuşanıldı', pLockedLv: n => `🔒 Seviye ${n}`, pLockedAch: a => `🔒 ${a}`,
  pAvatarNote: 'Varsayılan avatarın. Bir masaya katıldığında (başkası almadıysa) otomatik seçilir.',
  pFramesNote: 'Çerçeve; lobide, oyuncu listesinde ve tahtada avatarının etrafında görünür. Masadaki herkes görür.',
  pBoardsNote: 'Tahta deseni, tahtanın ortasındaki masayı değiştirir. Tahta desenini sadece sen görürsün.',
  pBubblesNote: 'Sohbet mesajlarının stili. Odadaki herkes görür.',
  pTitlesNote: 'Unvanın adının altında görünür. Başarımlarla yenilerini açarsın.',
  pAchNote: 'Başarımlar unvan, çerçeve, tahta deseni ve sohbet balonu açar.',
  pBotNote: '🤖 Botlara karşı oyunlar yarım XP verir ama başarımlara sayılmaz (seviye başarımları hariç). Galibiyetler ve diğer başarımlar yalnızca çevrim içi oyunlardan gelir ve aynı masadaki başka bir oyuncu aynı sonucu kaydettiğinde onaylanır.',
  pRewards: 'Açtıkları:', pDone: '✓ Açıldı', pProgress: (a, b) => `${a} / ${b}`,
  pWins: 'Çevrim içi galibiyet', pGames: 'Çevrim içi oyun', pBotGames: 'Bot oyunu', pXpTotal: 'Toplam XP', pLevel: 'Seviye',
  pDeals: 'Devredilen hesap', pBelt: 'Kemer sıkma', pMember: 'Üyelik',
  pRecent: 'Son oyunlar', pNoRecent: 'Henüz oyun yok. Giriş yapmışken bir oyun bitir, burada görünsün.',
  pPlace: (n, of) => `${of} kişide ${n}.`, pPending: 'onay bekliyor', pNotCounted: 'sayılmadı', pSolo: '🤖 bot oyunu', pOnline: '🌐 çevrim içi',
  pEmailOn: e => `Şifre sıfırlama e-postası: ${e}`, pEmailOff: 'Bu hesapta e-posta yok; şifreni unutursan kurtarılamaz.',
  pPreview: 'Önizleme', pYou: 'Sen',
  rTitle: 'İlerlemen', rSaving: 'Sonucun kaydediliyor…', rXp: n => `+${n} XP`,
  rPending: n => `Masadaki başka bir oyuncu aynı sonucu kaydedince +${n} XP daha (ve galibiyet/başarım ilerlemen) eklenecek.`,
  rVerified: 'Sonuç başka bir oyuncu tarafından onaylandı.',
  rLevelUp: n => `🎉 Seviye atladın! Artık ${n}. seviyedesin.`, rNewAch: 'Başarım açıldı', rNewItems: 'Yeni açılanlar',
  rShort: '3 günden veya 4 dakikadan kısa oyunlar XP kazandırmaz.',
  rLimit: 'Şimdilik XP sınırına ulaştın: 4 dakikada en fazla bir, saatte en fazla 12 oyun sayılır.',
  rDup: 'Bu oyunun sonucu zaten kaydedilmiş.',
  rBot: '🤖 Bot oyunu: yarım XP, başarımlara sayılmaz.',
  rGuest: 'XP kazanmak, başarım ve görünüm açmak için giriş yap.', rErr: 'Sonucun kaydedilemedi.',
  rNotHot: 'Aynı cihazda oynanan oyunlar XP kazandırmaz.',
  lvTag: n => `Sv ${n}`,
  rulesAcc: '<b>Hesaplar (isteğe bağlı):</b> giriş yapan oyuncular XP ve seviye kazanır; başarım, avatar çerçevesi, tahta deseni ve sohbet balonu açar. <b>Bot oyunları yarım XP verir ve başarımlara sayılmaz</b>; galibiyet ve başarımlar, masadaki başka bir oyuncu sonucu onayladığında çevrim içi oyunlardan gelir. 3 günden veya 4 dakikadan kısa oyunlar sayılmaz.'
};

// item and achievement names: [name, description]
const NAMES = {
  en: {
    frame: {none: 'No frame', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond', neon: 'Neon', flame: 'Flame', royal: 'Royal'},
    board: {felt: 'Navy felt', wood: 'Oak table', terracotta: 'Terracotta', marble: 'Marble', night: 'Midnight', neon: 'Neon diner', ocean: 'Ocean'},
    bubble: {plain: 'Plain', receipt: 'Receipt', comic: 'Comic', neon: 'Neon', heart: 'Sweetheart', gold: 'Golden'},
    title: {rookie: 'Rookie'},
    ach: {
      first_bite: ['First Bite', 'Win an online game'],
      regular: ['Regular', 'Win 10 online games'],
      gourmet: ['Gourmet', 'Win 100 online games'],
      veteran: ['Veteran', 'Play 50 online games'],
      sous_chef: ['Sous Chef', 'Reach level 10'],
      head_chef: ['Head Chef', 'Reach level 50'],
      negotiator: ['Negotiator', 'Pass the check on with a deal 10 times'],
      belt_master: ['Belt Master', 'Use Tighten the Belt 20 times'],
      iron_stomach: ['Iron Stomach', () => `Pay a check of ${M(IRON)} or more and stay at the table`],
      tycoon: ['Tycoon', 'Own all 4 restaurants at ★★★ in one game']
    }
  },
  tr: {
    frame: {none: 'Çerçevesiz', bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', diamond: 'Elmas', neon: 'Neon', flame: 'Alev', royal: 'Kraliyet'},
    board: {felt: 'Lacivert çuha', wood: 'Meşe masa', terracotta: 'Terakota', marble: 'Mermer', night: 'Gece yarısı', neon: 'Neon lokanta', ocean: 'Okyanus'},
    bubble: {plain: 'Sade', receipt: 'Fiş', comic: 'Çizgi roman', neon: 'Neon', heart: 'Tatlı dil', gold: 'Altın'},
    title: {rookie: 'Çaylak'},
    ach: {
      first_bite: ['İlk Lokma', 'Bir çevrim içi oyun kazan'],
      regular: ['Müdavim', '10 çevrim içi oyun kazan'],
      gourmet: ['Gurme', '100 çevrim içi oyun kazan'],
      veteran: ['Emektar', '50 çevrim içi oyun oyna'],
      sous_chef: ['Kalfa', '10. seviyeye ulaş'],
      head_chef: ['Şef', '50. seviyeye ulaş'],
      negotiator: ['Pazarlıkçı', 'Pazarlıkla hesabı 10 kez başkasına devret'],
      belt_master: ['Kemer Ustası', 'Kemer Sıkma kartını 20 kez kullan'],
      iron_stomach: ['Demir Mide', () => `${M(IRON)} veya daha fazla tutan bir hesabı öde ve masada kal`],
      tycoon: ['Restoran Kralı', 'Tek oyunda 4 restoranın hepsine ★★★ seviyede sahip ol']
    }
  }
};
for (const l of ['en', 'tr']) {
  const N = NAMES[l], o = l === 'en' ? en : tr;
  o.itemName = (kind, key) => kind === 'title' ? (N.title[key] || (N.ach[key] || [key])[0]) : ((N[kind] || {})[key] || key);
  o.achName = key => (N.ach[key] || [key])[0];
  o.achDesc = key => { const d = (N.ach[key] || ['', ''])[1]; return typeof d === 'function' ? d() : d; };
}
extendStrings({en, tr});
