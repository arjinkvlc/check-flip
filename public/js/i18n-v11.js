/**
 * Check Flip — texts added in v1.1 (modes, rematch, sharing, guide, music, app install,
 * leaderboards, friends, invites, daily quest). English / Türkçe.
 */
import {extendStrings, M} from './i18n.js';

const QUESTS_EN = {
  play_online: 'Play an online game', win_any: 'Win a game', deal: 'Pass the check on with a deal',
  buy2: 'Buy 2 restaurants in one game', upgrade: 'Upgrade a restaurant', cards3: 'Play 3 cards in one game',
  survive10: 'Stay at the table for 10 days', payer: 'Pay a check and stay at the table'
};
const QUESTS_TR = {
  play_online: 'Bir çevrim içi oyun oyna', win_any: 'Bir oyun kazan', deal: 'Pazarlıkla hesabı başkasına devret',
  buy2: 'Bir oyunda 2 restoran satın al', upgrade: 'Bir restoranı yükselt', cards3: 'Bir oyunda 3 kart oyna',
  survive10: 'Masada 10 gün kal', payer: 'Bir hesabı öde ve masada kal'
};
const q = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => ['q_' + k, v]));

const en = {
  // modes
  modeLbl: 'Game mode', m_classic: 'Classic', m_quick: 'Quick', m_teams: '2v2 teams',
  mShort_classic: 'last one standing', mShort_quick: '10 days · ~15 min', mShort_teams: '4 players',
  mNote_classic: 'Last one at the table wins.',
  mNote_quick: '10 days with shorter turn timers; the richest player (money + restaurants) wins. About 15 minutes.',
  mNote_teams: 'Exactly 4 players (bots count). Seats 1 & 3 play against 2 & 4. Teammates cover each other’s checks; knock out both rivals to win.',
  teamsNeed4: '2v2 needs exactly 4 players (you can add bots).', teamA: 'Team A', teamB: 'Team B',
  teamWins: (a, b) => `${a} & ${b} win!`,
  rulesModes: '<b>Modes:</b> <b>Classic</b> (last one standing), <b>Quick</b> (10 days, shorter turns, richest wins) and <b>2v2</b> (seats 1 & 3 against 2 & 4; when you can’t pay a check your teammate covers the rest; eliminate both rivals to win).',
  // rematch + share
  rematchBtn: '🔁 Rematch', rematchUndo: '✓ Rematch (undo)', rematchNote: (r, n) => `${r}/${n} ready. The new game starts when everyone is in.`,
  rematchNow: 'Start now with the ready players',
  shareBtn: '📤 Share result', shareSaved: '✓ Image saved', shareWon: 'I won! 🏆', shareWeWon: 'We won! 🏆',
  sharePlace: (p, n) => `I finished #${p} of ${n}`, shareOver: 'Game over', shareSub: (d, n) => `Day ${d} · ${n} players`,
  shareTable: 'Final table', shareOut: 'out', shareText: url => `I just played Check Flip: dice, cards and who picks up the check. Play free: ${url}`,
  // guide
  tipOk: 'Got it', tipOff: 'Hide tips', tipsReset: '💡 Show the first-game tips again', tipsOn: '✓ Tips are back on',
  tip_hunger: 'Every day everyone gets <b>+1 hunger</b>. At the end of the day the next player in the <b>check order</b> (bottom of this panel) pays for everyone: <b>hunger × multiplier × ¤5</b> each. Stay hungry when others pay, eat light when it’s your turn to pay.',
  tip_roll: 'Your turn: <b>roll the dice</b>. Then you choose to move the sum or just one of the dice.',
  tip_move: 'Pick a move: the <b>highlighted squares</b> show where each choice lands. 💰 gives money, 🥨 lowers hunger, 🏋️ raises it.',
  tip_buy: 'A restaurant for sale! Owners get a <b>visit fee</b> when others land here and a <b>commission</b> when dinner is served here.',
  tip_home: 'Your own restaurant: <b>cash the register</b> now, or <b>upgrade</b> it for a bigger commission and register later.',
  tip_payer: 'The check is on you! Before paying you can <b>play a card</b> or <b>make one deal</b>: pay someone to take the check instead.',
  tip_deal: 'Someone offers you money to take their check. Accept only if the money covers <b>your</b> check (shown below).',
  tip_watch: 'Someone else pays tonight. Watch the <b>check order</b>: tomorrow it may be you, so plan your hunger.',
  // music + app
  music: 'Music on/off', installBtn: '📲 Install app',
  installIOS: 'On iPhone/iPad: tap the Share button in Safari, then "Add to Home Screen".',
  // leaderboards
  leadersBtn: '🏆 Leaderboard', lbTitle: 'Leaderboard', lbWeekly: 'This week', lbLevel: 'All time (level)',
  lbWeeklyNote: 'Online wins this week (ties are broken by XP). Resets every Monday 00:00 UTC.', lbWeekWins: n => `${n} ${n === 1 ? 'win' : 'wins'}`,
  lbLevelNote: 'Total XP and level of all players.', lbWeekXp: n => `${n} XP`, lbXp: n => `${n} XP`,
  lbEmpty: 'Nobody has played an online game this week yet. Be the first!', lbGuest: 'Log in to appear on the leaderboard.',
  // friends
  frBtn: '👥 Friends', frTitle: 'Friends', frNote: 'Add friends by username, see their profiles and invite them to your room.',
  frAddPh: 'Username', frAdd: 'Add friend', frIncoming: 'Friend requests', frAccept: 'Accept', frDecline: 'Decline',
  frOutgoing: 'Waiting for:', frCancel: 'cancel', frList: n => `Friends (${n})`, frNone: 'No friends yet. Add someone by their username.',
  frOnline: '● online', frOffline: 'offline', frRemove: 'Remove friend', frRemoveQ: u => `Remove ${u} from your friends?`,
  frNowFriends: u => `You and ${u} are now friends.`, frSent: u => `Friend request sent to ${u}.`, frIsFriend: '✓ friends', frRequested: 'request sent',
  pWinRate: 'Win rate', close: 'Close',
  // invites
  invMsg: from => `<b>${from}</b> invites you to a game`, invJoin: 'Join', invTitle: 'Invite friends',
  invBtn: 'Invite', invSent: '✓ invited', invNoFriends: 'Add friends (👥 on the home screen) to invite them here without sharing the code.',
  aErrNoUser: 'No player with that username.', aErrSelf: 'That’s you!', aErrNotFriends: 'You can only invite friends.', aErrTooManyFriends: 'Friend list is full.',
  // daily quest
  qTitle: 'Daily quest', qReward: '+30 XP', qDone: 'Done! +30 XP', qResets: (h, m) => `new quest in ${h}h ${m}m`,
  rQuest: qq => `🎯 Daily quest complete: ${qq} (+30 XP)`,
  ...q(QUESTS_EN)
};

const tr = {
  modeLbl: 'Oyun modu', m_classic: 'Klasik', m_quick: 'Hızlı', m_teams: '2v2 takım',
  mShort_classic: 'son kalan kazanır', mShort_quick: '10 gün · ~15 dk', mShort_teams: '4 oyuncu',
  mNote_classic: 'Masada son kalan kazanır.',
  mNote_quick: '10 gün, kısaltılmış süreler; en zengin (para + restoranlar) kazanır. Yaklaşık 15 dakika.',
  mNote_teams: 'Tam 4 oyuncu (botlar sayılır). 1. ve 3. sıradakiler, 2. ve 4. sıradakilere karşı oynar. Takım arkadaşları birbirinin hesabındaki eksiği kapatır; iki rakibi de masadan kaldıran kazanır.',
  teamsNeed4: '2v2 için tam 4 oyuncu gerekir (bot ekleyebilirsin).', teamA: 'A takımı', teamB: 'B takımı',
  teamWins: (a, b) => `${a} ve ${b} kazandı!`,
  rulesModes: '<b>Modlar:</b> <b>Klasik</b> (son kalan kazanır), <b>Hızlı</b> (10 gün, kısa süreler, en zengin kazanır) ve <b>2v2</b> (1. ve 3. sıra, 2. ve 4. sıraya karşı; hesabı ödeyemezsen eksiğini takım arkadaşın kapatır; iki rakibi de masadan kaldıran takım kazanır).',
  rematchBtn: '🔁 Rövanş', rematchUndo: '✓ Rövanş (geri al)', rematchNote: (r, n) => `${r}/${n} hazır. Herkes hazır olunca yeni oyun başlar.`,
  rematchNow: 'Hazır olanlarla hemen başlat',
  shareBtn: '📤 Sonucu paylaş', shareSaved: '✓ Görsel kaydedildi', shareWon: 'Kazandım! 🏆', shareWeWon: 'Kazandık! 🏆',
  sharePlace: (p, n) => `${n} kişide ${p}. oldum`, shareOver: 'Oyun bitti', shareSub: (d, n) => `${d}. gün · ${n} oyuncu`,
  shareTable: 'Son durum', shareOut: 'elendi', shareText: url => `Check Flip oynadım: zar, kart ve hesabı kim ödeyecek? Ücretsiz oyna: ${url}`,
  tipOk: 'Anladım', tipOff: 'İpuçlarını gizle', tipsReset: '💡 İlk oyun ipuçlarını tekrar göster', tipsOn: '✓ İpuçları tekrar açık',
  tip_hunger: 'Her gün herkesin açlığı <b>+1</b> artar. Gün sonunda <b>hesap sırasındaki</b> kişi (bu panelin altında) herkese ısmarlar: kişi başı <b>açlık × çarpan × ¤5</b>. Başkası öderken aç kal, sıra sana gelince az ye.',
  tip_roll: 'Sıra sende: <b>zar at</b>. Sonra iki zarın toplamı kadar mı, yoksa tek zar kadar mı ilerleyeceğini seçersin.',
  tip_move: 'Hamleni seç: <b>işaretli kareler</b> her seçeneğin nereye götürdüğünü gösterir. 💰 para verir, 🥨 açlığı düşürür, 🏋️ artırır.',
  tip_buy: 'Satılık restoran! Sahibi, başkaları buraya gelince <b>geçiş ücreti</b>, akşam yemeği burada yenince <b>komisyon</b> alır.',
  tip_home: 'Kendi restoranın: şimdi <b>kasayı topla</b> ya da ileride daha fazla komisyon ve kasa için <b>yükselt</b>.',
  tip_payer: 'Hesap sende! Ödemeden önce <b>kart oynayabilir</b> ya da bir kez <b>pazarlık</b> yapabilirsin: birine para verip hesabı ona devret.',
  tip_deal: 'Biri hesabını alman için para teklif ediyor. Para, <b>senin</b> ödeyeceğin hesabı (aşağıda) karşılıyorsa kabul et.',
  tip_watch: 'Bu akşam başkası ödüyor. <b>Hesap sırasını</b> izle: yarın sen olabilirsin, açlığını ona göre ayarla.',
  music: 'Müzik aç/kapat', installBtn: '📲 Uygulamayı yükle',
  installIOS: 'iPhone/iPad’de: Safari’de Paylaş düğmesine dokun, sonra "Ana Ekrana Ekle"yi seç.',
  leadersBtn: '🏆 Liderlik tablosu', lbTitle: 'Liderlik tablosu', lbWeekly: 'Bu hafta', lbLevel: 'Tüm zamanlar (seviye)',
  lbWeeklyNote: 'Bu haftaki çevrim içi galibiyetler (eşitlikte XP’ye bakılır). Her pazartesi 03:00’te (TSİ) sıfırlanır.', lbWeekWins: n => `${n} galibiyet`,
  lbLevelNote: 'Tüm oyuncuların toplam XP’si ve seviyesi.', lbWeekXp: n => `${n} XP`, lbXp: n => `${n} XP`,
  lbEmpty: 'Bu hafta henüz kimse çevrim içi oynamadı. İlk sen ol!', lbGuest: 'Tabloda yer almak için giriş yap.',
  frBtn: '👥 Arkadaşlar', frTitle: 'Arkadaşlar', frNote: 'Kullanıcı adıyla arkadaş ekle, profillerini gör, odana davet et.',
  frAddPh: 'Kullanıcı adı', frAdd: 'Arkadaş ekle', frIncoming: 'Arkadaşlık istekleri', frAccept: 'Kabul et', frDecline: 'Reddet',
  frOutgoing: 'Yanıt bekleniyor:', frCancel: 'iptal', frList: n => `Arkadaşlar (${n})`, frNone: 'Henüz arkadaşın yok. Kullanıcı adıyla birini ekle.',
  frOnline: '● çevrim içi', frOffline: 'çevrim dışı', frRemove: 'Arkadaşlıktan çıkar', frRemoveQ: u => `${u} arkadaş listenden çıkarılsın mı?`,
  frNowFriends: u => `${u} ile artık arkadaşsınız.`, frSent: u => `${u} kullanıcısına istek gönderildi.`, frIsFriend: '✓ arkadaş', frRequested: 'istek gönderildi',
  pWinRate: 'Kazanma oranı', close: 'Kapat',
  invMsg: from => `<b>${from}</b> seni bir oyuna davet ediyor`, invJoin: 'Katıl', invTitle: 'Arkadaşlarını davet et',
  invBtn: 'Davet et', invSent: '✓ davet edildi', invNoFriends: 'Kod paylaşmadan buraya davet etmek için arkadaş ekle (ana ekranda 👥).',
  aErrNoUser: 'Bu kullanıcı adında oyuncu yok.', aErrSelf: 'Bu sensin!', aErrNotFriends: 'Sadece arkadaşlarını davet edebilirsin.', aErrTooManyFriends: 'Arkadaş listen dolu.',
  qTitle: 'Günlük görev', qReward: '+30 XP', qDone: 'Tamamlandı! +30 XP', qResets: (h, m) => `yeni görev ${h} sa ${m} dk sonra`,
  rQuest: qq => `🎯 Günlük görev tamamlandı: ${qq} (+30 XP)`,
  ...q(QUESTS_TR)
};

extendStrings({en, tr});
export {M};
