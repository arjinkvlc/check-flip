/**
 * Check Flip — dil dosyası (English / Türkçe)
 * Arayüz metinleri, tahta ve kart içerikleri, oyun kaydı şablonları.
 * Oyun kaydı motor tarafından {k, p} (anahtar + parametre) olarak tutulur ve
 * her oyuncunun ekranında kendi seçtiği dile çevrilir.
 */
// Languages. English and Turkish are built in (this file and the i18n-*.js files); the others are
// packs in js/lang/<code>.js, loaded when chosen. A missing text falls back to English.
// Every new text must be added in ALL of these languages.
const LANGS = ['en', 'tr', 'es', 'pt', 'fr', 'de'];
const LANG_NAMES = {en: 'English', tr: 'Türkçe', es: 'Español', pt: 'Português (Brasil)', fr: 'Français', de: 'Deutsch'};
const LOCALES = {en: 'en-GB', tr: 'tr-TR', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE'};
const PACKS = ['es', 'pt', 'fr', 'de'];
let lang = 'en', geoCheck = false;
// First visit language, no permission needed: the saved choice; the /tr page → Turkish; the browser's
// language if we have it; a browser in English (or a language we don't have) visiting from Türkiye → Turkish
// (the country comes from Cloudflare, /api/geo); else English.
{ let s = null; try { s = localStorage.getItem('hs-lang'); } catch (e) {}
  if (LANGS.includes(s)) lang = s;
  else if (typeof location !== 'undefined' && /^\/tr(\/|$)/.test(location.pathname)) lang = 'tr';
  else if (typeof navigator !== 'undefined') {
    const want = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).map(x => String(x).slice(0, 2).toLowerCase());
    const hit = want.find(x => LANGS.includes(x)); if (hit) lang = hit;
    geoCheck = lang === 'en' && typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
  } }
async function geoLang() {
  if (!geoCheck) return;
  let cc = null; try { cc = localStorage.getItem('cf-cc'); } catch (e) {}
  if (!cc) {
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch('/api/geo', {signal: ctl.signal}); clearTimeout(to);
      if (r.ok) { cc = (await r.json()).c || 'XX'; try { localStorage.setItem('cf-cc', cc); } catch (e) {} }
    } catch (e) {}
  }
  if (cc === 'TR') lang = 'tr';
}

const getLang = () => lang;
const locale = () => LOCALES[lang] || 'en-GB';
const loaded = new Set(['en', 'tr']), packHooks = [];
// the text pack of a language: {C, U, LOG, TXT, NAMES}; other modules (account names) hook in with onPack
async function loadLang(l) {
  if (!PACKS.includes(l) || loaded.has(l)) return;
  const pk = (await import(`./lang/${l}.js`)).default;
  C[l] = pk.C || {}; U[l] = Object.assign(U[l] || {}, pk.U || {}); LOG[l] = pk.LOG || {}; TXT[l] = pk.TXT || {};
  loaded.add(l); packHooks.forEach(f => { try { f(l, pk); } catch (e) { console.error(e); } });
}
const onPack = f => { packHooks.push(f); };
// switch language (loads its pack first); resolves when the new texts are ready
async function setLang(l) {
  if (!LANGS.includes(l)) return;
  try { await loadLang(l); } catch (e) { console.error('language pack', l, e); return; }
  lang = l; try { localStorage.setItem('hs-lang', l); } catch (e) {} if (typeof document !== 'undefined') document.documentElement.lang = l;
}

const M = n => '¤' + n;
const MM = n => (n < 0 ? '−' : '') + '¤' + Math.abs(n);

/* ---------- content ---------- */
const C = {
  en: {
    sq: {
      start: ['Start', 'Full lap: +¤40, +2 hunger, multiplier +1'],
      half: ['Halfway', 'Passing: +¤20, +1 hunger'],
      kemer: ['Tighten the Belt', 'Get the card: when you pay, skip your own meal and share'],
      sans: ['Chance', 'Draw a Chance card'],
      olay: ['Event', 'Draw an Event card'],
      gelir: ['Payday', '+¤20'],
      fatura: ['Bills', '−¤15'],
      atis: ['Snack', '−2 hunger'],
      spor: ['Gym', '+2 hunger'],
      kisa: ['Shortcut', '3 squares forward'],
      geri: ['Go Back', '3 squares back'],
      mola: ['Coffee Break', 'You lose your next move'],
      mekan: ['Restaurant', 'Buy it for ¤40. Visitors pay you a fee (¤5 / ¤8 / ¤12). Each morning one of the 4 restaurants is announced for tonight’s dinner and its owner takes a commission (25%, upgradeable to 35% and 50%). Land on your own to cash the register or upgrade. Others can offer to buy it from you.'],
      bos: ['Empty', 'Nothing happens here']
    },
    venue: {pizza: 'Pizzeria', sushi: 'Sushi Bar', burger: 'Burger Joint', taco: 'Taqueria'},
    cards: {
      A0: ['Pay raise', '+¤30'], A1: ['Cash in an old jacket', '+¤10'], A2: ['Lottery win', '+¤50'], A3: ['Cracked phone screen', '−¤25'],
      A4: ['Parking ticket', '−¤20'], A5: ['Rent day', '−¤30'], A6: ['Hop in a taxi', '4 squares forward'], A7: ['Got lost', '3 squares back'],
      A8: ['Express lane', 'Go to the nearest Start or Halfway square and collect the bonus'], A9: ['Debt collected', 'Take ¤15 from a rival of your choice'],
      A10: ['Discount coupon', 'When you pay, the check is 25% off'], A11: ['Forgot your wallet', '−¤10'],
      A12: ['Tighten the Belt', "Kept in hand. When you pay, you don't eat: you skip your own share and keep your hunger"], A13: ['Tighten the Belt', "Kept in hand. When you pay, you don't eat: you skip your own share and keep your hunger"],
      B0: ['Skipped breakfast', '+2 hunger'], B1: ["Grandma's cookies", '−3 hunger'], B2: ['Marathon', '+3 hunger, −¤10'],
      B3: ['Upset stomach', 'Your hunger drops to 0'], B4: ['Street food smell', 'Everyone +1 hunger'], B5: ['Your birthday', 'Every rival pays you ¤10'],
      B6: ['Gossip', 'A rival of your choice misses 1 move'], B7: ['Cooking contest', 'The hungriest player gets +¤20'],
      B8: ['Free sample', "A rival's hunger −2"], B9: ['Hunger pangs', "A rival's hunger +2"],
      B10: ['Pass the check', "Hand today's check to the next player in line"], B11: ['Going Dutch', "When it's your turn to pay, everyone pays their own share"],
      K: ['Tighten the Belt', "When you pay, you don't eat: you skip your own share and keep your hunger"]
    },
    avatars: {waiter: 'Waiter', waitress: 'Waitress', student: 'Student', foodie: 'Food blogger', italian: 'Italian chef', doner: 'Döner master', noodle: 'Noodle chef', baker: 'Pastry chef', grandma: 'Grandma', critic: 'Food critic', barista: 'Barista', sommelier: 'Sommelier'},
    nicks: ['Hungry Wolf', 'Pizza Lover', 'Taco Boss', 'Noodle King', 'Burger Fan', 'Sushi Chef', 'Donut Hunter', 'Pasta Queen', 'Snack Attack', 'Big Appetite', 'Waffle Wizard', 'Curry Master', 'Pretzel Pro', 'Bagel Baron', 'Dumpling Duke', 'Ramen Rider', 'Nacho Ninja', 'Pancake Pal', 'Cheese Chaser', 'Fry Guy']
  },
  tr: {
    sq: {
      start: ['Başlangıç', 'Tam tur: +¤40, +2 açlık, çarpan +1'],
      half: ['Yarım Tur', 'Geçince +¤20, +1 açlık'],
      kemer: ['Kemer Sıkma', 'Kart kazanırsın: ısmarlarken yemez, payını ödemezsin'],
      sans: ['Şans', 'Şans kartı çek'],
      olay: ['Olay', 'Olay kartı çek'],
      gelir: ['Gelir', '+¤20'],
      fatura: ['Fatura', '−¤15'],
      atis: ['Atıştırmalık', '−2 açlık'],
      spor: ['Spor Salonu', '+2 açlık'],
      kisa: ['Kısayol', '3 kare ileri'],
      geri: ['Geri Git', '3 kare geri'],
      mola: ['Mola', 'Sonraki hamleni kaybedersin'],
      mekan: ['Mekân', "¤40'a satın alınır. Başkasının mekânına gelen sahibine geçiş ücreti öder (¤5 / ¤8 / ¤12). Her sabah akşam yemeğinin 4 mekândan hangisinde yeneceği açıklanır, o mekânın sahibi komisyon alır (%25, yükseltince %35 ve %50). Kendi mekânına gelen kasayı toplar ya da yükseltir. Sahibinden daha yüksek teklifle alınabilir."],
      bos: ['Boş kare', 'Burada bir şey olmaz']
    },
    venue: {pizza: 'Pizzacı', sushi: 'Suşi Bar', burger: 'Burgerci', taco: 'Tako Evi'},
    cards: {
      A0: ['Zam geldi', '+¤30'], A1: ['Eski cekette para', '+¤10'], A2: ['Piyango', '+¤50'], A3: ['Ekran kırıldı', '−¤25'],
      A4: ['Park cezası', '−¤20'], A5: ['Kira günü', '−¤30'], A6: ['Taksiye atla', '4 kare ileri'], A7: ['Yolu şaşırdın', '3 kare geri'],
      A8: ['Ekspres yol', 'En yakın Başlangıç ya da Yarım Tur karesine git, ödülü al'], A9: ['Borç tahsilatı', 'Seçtiğin rakipten ¤15 al'],
      A10: ['İndirim kuponu', 'Ismarlarken hesap %25 düşer'], A11: ['Cüzdanı unuttun', '−¤10'],
      A12: ['Kemer Sıkma', 'Elde tutulur. Ismarlarken sen yemezsin: kendi payını ödemezsin, açlığın korunur'], A13: ['Kemer Sıkma', 'Elde tutulur. Ismarlarken sen yemezsin: kendi payını ödemezsin, açlığın korunur'],
      B0: ['Kahvaltıyı atladın', '+2 açlık'], B1: ['Büyükannenin kurabiyeleri', '−3 açlık'], B2: ['Maraton', '+3 açlık, −¤10'],
      B3: ['Mide bozuldu', 'Açlığın 0 olur'], B4: ['Sokak yemeği kokusu', 'Herkese +1 açlık'], B5: ['Doğum günün', 'Her rakip sana ¤10 öder'],
      B6: ['Dedikodu', 'Seçtiğin rakip 1 hamle bekler'], B7: ['Yemek yarışması', 'En aç oyuncu +¤20 alır'],
      B8: ['İkram', 'Bir rakibin açlığı −2'], B9: ['Aç Gözlü', 'Bir rakibin açlığı +2'],
      B10: ['Hesabı Kaydır', 'Bugünkü ısmarlamayı sıradakine devret'], B11: ['Alman Usulü', 'Ismarlama sendeyken herkes kendi hesabını öder'],
      K: ['Kemer Sıkma', 'Ismarlarken sen yemezsin: kendi payını ödemezsin, açlığın korunur']
    },
    avatars: {waiter: 'Garson', waitress: 'Garson kız', student: 'Öğrenci', foodie: 'Yemek blogcusu', italian: 'İtalyan şef', doner: 'Dönerci usta', noodle: 'Erişte ustası', baker: 'Pastacı', grandma: 'Nine', critic: 'Yemek eleştirmeni', barista: 'Barista', sommelier: 'Şarap uzmanı'},
    nicks: ['Aç Kurt', 'Pizza Sever', 'Taco Patronu', 'Erişte Kralı', 'Burgerci', 'Suşi Ustası', 'Donut Avcısı', 'Makarnacı', 'Atıştırmacı', 'Obur', 'Waffle Ustası', 'Köri Ustası', 'Simitçi', 'Mantıcı', 'Köfteci', 'Tostçu', 'Nacho Ninja', 'Pankekçi', 'Peynirci', 'Patatesçi']
  }
};
const CL = part => (C[lang] && C[lang][part]) || C.en[part];
const sqName = kind => (CL('sq')[kind] || C.en.sq[kind])[0];
const sqDesc = kind => (CL('sq')[kind] || C.en.sq[kind])[1];
const venueName = key => CL('venue')[key] || C.en.venue[key] || key;
const cardName = c => (CL('cards')[c] || C.en.cards[c] || [c])[0];
const cardDesc = c => (CL('cards')[c] || C.en.cards[c] || ['', ''])[1];
const avatarLabel = k => CL('avatars')[k] || C.en.avatars[k] || k;
const nickList = () => CL('nicks');

/* ---------- UI strings ---------- */
const U = {
  en: {
    title: 'Check Flip',
    metaDesc: 'Roll the dice, draw cards, stay hungry and make your rivals pick up the check. A free 2–6 player browser game.',
    tagline: 'Flip the check. Make them pay.',
    lede: "Roll the dice, move around the board, draw cards. At the end of every day, whoever's turn it is buys dinner for the whole table, and hungry players are expensive. Can't pay the check? You're out. Last one at the table wins.",
    nickLabel: 'Your nickname', nickPh: n => `Nickname (leave empty for: ${n})`,
    quick: '⚡ Quick game', createPrivate: 'With friends: create a private room', codePh: 'CODE', join: 'Join',
    rejoin: c => `↩ Back to room ${c}`, codeAria: 'Room code',
    netOk: 'Quick game seats you at an open table. Create a private room to play with friends.',
    netFail: "The connection library couldn't load. You can still play on this device.",
    or: 'or', solo: '🤖 Single player', local: 'Same device',
    rulesTitle: 'How to play',
    rules: [
      'Starting money depends on the number of players: 2 players <b>¤100</b>, 3 players <b>¤150</b>, 4+ players <b>¤200</b> (the host can change it). Hunger starts at <b>0</b>. Turn order is decided by a dice roll.',
      '<b>One day:</b> everyone makes 2 moves. After rolling, you choose to move the <b>sum</b> of both dice or just <b>one</b> of them. Doubles roll again.',
      '<b>Restaurants</b> (Pizzeria, Sushi Bar, Burger Joint, Taqueria) cost ¤40. Landing on someone else\'s restaurant costs a small <b>visit fee</b> (★ ¤5, ★★ ¤8, ★★★ ¤12), and you may offer at least ¤10 above its last price; if the owner accepts, it changes hands.',
      'At the start of each day one of the 4 restaurants is drawn <b>for tonight’s dinner</b> (shown on the board). If it has an owner, they get 25% of the check. Land on your own restaurant to cash the register (★ +¤15, ★★ +¤20, ★★★ +¤25) or upgrade it: ★★ 35% (¤30), ★★★ 50% (¤45).',
      '<b>Negotiation:</b> the payer may make one offer: “I\'ll give you ¤X, you pay the check.”',
      'At the start of every day, everyone gets <b>+1 hunger</b> (max 10).',
      "At the end of the day, the next player in line buys dinner for everyone and eats too. The check: the sum of <b>hunger × multiplier × ¤5</b> for everyone at the table (payer included). Everyone who eats goes back to 0 hunger.",
      '<b>Full lap:</b> +¤40, +2 hunger, multiplier +1. <b>Halfway (square 20):</b> +¤20, +1 hunger.',
      'You have <b>30 seconds</b> to roll or decide and 45 seconds to pay; when time runs out, the game plays for you.',
      "Can't pay the check? You're out. With the optional day limit, the richest player (<b>money + restaurant value</b>) wins when time is up.",
      '<b>Quick game</b> seats you at an open table that starts at 4 players or when everyone is ready. In <b>Single player</b> you play against 1–3 bots.'
    ],
    decksA: 'Chance deck', decksB: 'Event deck', squares: 'Squares', restaurants: 'Restaurants', kept: 'kept',
    beltNote: sq => `<b>${sq}</b> (square 12, and 2 cards in the Chance deck): ${cardDescSafe('K')}. Kept in hand.`,
    localTitle: 'Same device', localNote: 'Pass the device around. 2–6 players. Tap the avatar button to pick an avatar for a player.',
    addPlayer: 'Add player', back: 'Back', startMoney: 'Starting money', dayLimit: 'Day limit', off: 'Off', nDays: n => `${n} days`, startGame: 'Start game',
    randomName: 'Empty = random name', removePlayer: 'Remove player', pickAvatar: 'Pick avatar', playerNameAria: n => `Player ${n} name`,
    autoMoney: m => `Auto: ${M(m)}`,
    soloTitle: '🤖 Single player', soloNote: 'Play against computer-controlled rivals.', tableSize: 'Table size', nPlayers: n => `${n} players`, youBots: k => `you + ${k} bot${k > 1 ? 's' : ''}`, yourAvatar: 'Your avatar',
    connecting: 'Connecting…', connectingNote: 'This may take a few seconds.', cancel: 'Cancel',
    roomCode: 'Room code', copy: '📋 Copy', copied: '✓ Copied', selectedCopy: 'Selected, copy it', copyInvite: 'Copy invite link', inviteCopied: 'Copied', noLateJoin: 'No new players can join once the game starts.',
    pickAvatarTitle: 'Pick your avatar', avatarNote: "Avatars taken by others can't be picked. Locked ones open with levels and achievements (log in to use them). Without an avatar, you play with a colored letter.",
    settings: 'Settings', auto: 'Auto', pubTable: 'Public table', ready: "I'm ready", readyUndo: "✓ Ready (undo)",
    pubNote: (n, max) => `${n}/${max} players. The table starts at ${max} players, or when at least 2 are seated and everyone is ready.`,
    moneyCustom: m => `Starting money ${M(m)}.`, moneyAuto: (n, m) => `Auto: ${M(m)} for ${n} players (2 players ¤100, 3 players ¤150, 4+ players ¤200)`,
    daysOn: d => `After ${d} days, the richest player wins`, daysOff: 'Off: last one standing wins',
    you: 'you', hostTag: 'host', readyTag: '✓ ready', waitingTag: 'waiting', seatsFree: n => `${n} seat${n > 1 ? 's' : ''} free`,
    need2: 'At least 2 players needed.', waitHost: 'Waiting for the host to start the game.',
    players: 'Players', reactAria: 'Send a reaction', sendEmoji: e => `Send ${e}`, events: 'Events', squaresCards: 'Squares and cards',
    chat: '💬 Chat', chatEmpty: 'No messages yet. Say hi to the table.', chatPh: 'Type a message…', send: 'Send', closeChat: 'Close chat', openChat: 'Open chat', showLog: 'Show events', sound: 'Sound on/off',
    leave: 'Leave', leaveLong: 'Leave game', langBtn: '🌐 TR', langAria: 'Türkçe',
    jCreatingPub: 'Setting up a new public table…', jCreating: 'Opening room…', jConnecting: 'Connecting to room…', jSearching: 'Looking for an open table…', jFound: (n, max) => `Table found (${n}/${max}), joining…`,
    eLib: "The connection library couldn't load. Check your internet connection.", eServer: e => `Couldn't reach the server: ${e}`, eServerPlain: "Couldn't reach the server.",
    eCode5: 'Room codes are 5 characters.', eNoRoom: 'No open room with this code. Check the code.', eStarted: "This room's game has already started. You can't join a game in progress.", eFull: 'The room is full.', eJoin: "Couldn't join the room.", eUnknown: 'unknown error',
    chipPub: 'Public table', chipRoom: 'Room',
    dayFeast: d => `Day ${d} · check time`, gameOver: 'Game over', dayMove: (d, lim, m) => `Day ${d}${lim ? '/' + lim : ''} · move ${m}/2`,
    sOff: 'disconnected · auto-playing', sWon: 'wins!', sPaying: 'is buying dinner', sDealThink: 'is thinking about the deal', sAgain: 'rolls again', sRoll: 'is about to roll',
    sMove: 'is choosing how far to move', sTarget: 'is picking a target', sBuy: 'is thinking about buying', sHome: 'is deciding at their restaurant', sOffer: 'is considering an offer', sReply: 'is answering an offer',
    sRolling: 'is rolling…', sMoving: n => `moves ${n} squares`,
    whom: 'Who?', hungerN: n => `hunger ${n}`, cancelBtn: 'Cancel',
    over: 'Game over', wins: n => `${n} wins!`, noWinner: 'No winner', resultDay: d => `RESULT · DAY ${d}`, worthNote: 'money + restaurant value',
    lastStanding: d => `The last one at the table at the end of day ${d}.`, again: 'Play again with the same players', hostRestarts: 'The host can start a new game.',
    yourTurn: 'Your turn', rollBtn: 'Roll 🎲', rollAgainBtn: 'Roll again 🎲', willRoll: n => `${n} is about to roll…`,
    squaresLbl: v => `${v} squares`, sumLbl: ' (sum)', moveQ: (a, b) => `Dice ${a} + ${b}: how far do you move?`, moveHint: 'You can also tap a highlighted square.',
    isChoosing: n => `${n} is choosing how far to move…`, isTargeting: n => `${n} is picking a target…`,
    forSale: 'For sale', buyNote: m => `For sale · ${M(m)}. Every day one of the 4 restaurants is picked for dinner; if the check is paid here, 25% of it goes to you.`,
    buyBtn: m => `Buy (${M(m)})`, pass: 'Pass', isBuying: (n, v) => `${n} is thinking about buying ${v}…`,
    ownHere: r => `This is your restaurant. Commission is currently ${r}%.`, collectBtn: 'Cash the register', upgradeBtn: s => `Upgrade ${s}`, upgradeSub: (m, r) => `Pay ${M(m)} · ${r}% commission`, maxLevel: 'This restaurant is fully upgraded.',
    isHome: n => `${n} is deciding at their restaurant…`,
    offerNote: (o, pr, mn) => `Owned by ${o}, last price ${M(pr)}. Offer at least ${M(mn)} to buy it. The owner decides.`, offerAria: 'Offer amount', offerBtn: 'Make offer', noOfferBtn: 'No offer, pass', isOffering: (n, v) => `${n} is considering an offer for ${v}…`,
    offerForYou: 'You have an offer', offerText: (b, m, pr) => `${b} offers <b>${M(m)}</b> for this restaurant (last price ${M(pr)}).`, sellBtn: m => `Sell (${M(m)})`, reject: 'Reject', isAnswering: n => `${n} is answering…`,
    receiptHd: d => `THE CHECK · DAY ${d}`, payer: 'Paying', venueLbl: 'Restaurant', ownerLbl: 'Owner', noOwner: 'none, no commission', own: ' (own)', nobodyAtTable: 'Nobody at the table',
    dutch: 'Going Dutch', dutchLine: 'everyone pays their own share', subtotal: 'Subtotal', coupon: 'Coupon −25%', total: 'TOTAL', inHand: 'Cash', commissionTo: n => `Commission → ${n}`, belt: 'Tighten the Belt', notEating: n => `${n} isn't eating`,
    dealForYou: 'Deal offer', dealQuote: (n, m) => `${n}: “I'll give you <b>${M(m)}</b>, you pay the check.”`, dealNet: (n, need, net) => `If you accept, the check you'll pay as ${n} is ${M(need)}. Net: ${MM(net)}`,
    accept: 'Accept', cantAfford: "You don't have enough money for this check.", isThinking: n => `${n} is thinking…`,
    checkIsYours: "It's on you", buying: n => `${n} is buying`, useCard: c => `Use ${c}`,
    dealOpen: '🤝 Offer to pass the check', oneShot: '(one chance)', toWhomAria: 'To whom', dealSend: 'Send offer', dealNote: 'If they accept, you give them this money and they pay the check. No deals after playing a card.', dealUsed: 'Negotiation already used.',
    cantPay: "Can't pay, leave the table", payBtn: 'Pay the check', waitCards: 'While you wait, you can play a Free sample or Hunger pangs card.',
    replyTime: 'Reply time', payTime: 'Time to pay', timeLbl: 'Time', sec: n => `${n}s`,
    billQueue: '🧾 Check order', today: 'today', tomorrow: 'tomorrow',
    offlineNote: n => `<b>${n}</b> got disconnected. Their moves are played automatically until they return.`, sending: 'Sending…', reconnecting: 'Connection lost, reconnecting…',
    sheetHandle: 'see the board', sheetOpen: 'open panel', sheetAria: 'Collapse or expand the panel',
    addBot: '🤖 Add a bot', removeBot: 'Remove bot', addBotNote: 'Bots play on the host’s device. Games with bots count as bot games: half XP, no achievements.',
    botTag: '🤖 bot', payTodayTag: '🧾 pays today', waitsTag: 'waiting', offTag: 'disconnected',
    value: (m, r) => `Value ${M(m)}, commission ${r}%`, hungerLbl: 'hunger', squareN: (p, n) => `📍 square ${p} · ${n}`,
    popChance: 'Chance card', popEvent: 'Event card', popSpecial: 'Special card', popPlayed: 'Card played', popSquare: p => `Square ${p}`, popInfo: 'Info',
    ownerIs: (n, m) => `Owner: ${n} · last price ${M(m)}`, forSaleM: m => `For sale · ${M(m)}`,
    exTarget: 'Picking a target', exBuy: 'Buy it?', exOffer: 'Can make an offer', exReply: n => `${n} will answer`, exAgain: 'Doubles, rolls again!',
    tapToContinue: 'tap to continue', dhunger: 'hunger', dmult: 'multiplier', dout: 'out',
    dinnerHd: d => `Dinner · Day ${d}`, pickingVenue: 'Picking the restaurant…', venueOwner: (n, r) => `Owner <b>${n}</b> · ${r}% of the check goes to them`, venueNoOwner: 'No owner, no commission', checkIs: n => `Check: <b>${n}</b>`,
    letterAvatar: 'Letter avatar', none: 'none', ownerTitle: n => `Owned by ${n}`,
    langName: 'English'
  },
  tr: {
    title: 'Check Flip',
    metaDesc: 'Zar at, kart çek, aç kal ve gün sonunda hesabı rakiplerine ödet. 2-6 kişilik ücretsiz tarayıcı oyunu.',
    tagline: 'Hesabı çevir, onlara ödet.',
    lede: 'Zar at, tahtada ilerle, kart çek. Her günün sonunda sırası gelen herkese yemek ısmarlar ve aç oyuncu pahalıya patlar. Hesabı ödeyemeyen masadan kalkar, son kalan kazanır.',
    nickLabel: 'Takma adın', nickPh: n => `Takma ad (boş bırakırsan: ${n})`,
    quick: '⚡ Hızlı oyun', createPrivate: 'Arkadaşlarınla: özel oda kur', codePh: 'KOD', join: 'Katıl',
    rejoin: c => `↩ ${c} odasına geri dön`, codeAria: 'Oda kodu',
    netOk: 'Hızlı oyun seni açık bir masaya oturtur. Arkadaşlarınla oynamak için özel oda kur.',
    netFail: 'Bağlantı kütüphanesi yüklenemedi. Aynı cihazda oynayabilirsin.',
    or: 'ya da', solo: '🤖 Tek kişilik', local: 'Aynı cihazda',
    rulesTitle: 'Nasıl oynanır?',
    rules: [
      'Başlangıç parası oyuncu sayısına göre: 2 kişi <b>¤100</b>, 3 kişi <b>¤150</b>, 4+ kişi <b>¤200</b> (oda sahibi değiştirebilir). Açlık <b>0</b>. Sıra başta zarla belirlenir.',
      '<b>Bir gün:</b> herkes 2 hamle yapar. Zarı attıktan sonra iki zarın <b>toplamı</b> kadar ya da zarlardan <b>yalnızca biri</b> kadar ilerlemeyi seçersin. Çift atan bir kez daha atar.',
      "<b>Mekânlar</b> (Pizzacı, Suşi Bar, Burgerci, Tako Evi) ¤40'a alınır. Başkasının mekânına gelen sahibine küçük bir <b>geçiş ücreti</b> öder (★ ¤5, ★★ ¤8, ★★★ ¤12) ve isterse en az son fiyatın ¤10 fazlasını teklif edebilir; sahibi kabul ederse mekân el değiştirir.",
      "Her günün başında o akşam yemeğin 4 mekândan <b>hangisinde</b> yeneceği çekilir (tahtada gösterilir). Mekânın sahibi varsa hesabın %25'ini alır. Kendi mekânına gelen ya kasayı toplar (★ +¤15, ★★ +¤20, ★★★ +¤25) ya da mekânı yükseltir: ★★ %35 (¤30), ★★★ %50 (¤45).",
      '<b>Pazarlık:</b> ısmarlayan bir kez “¤X veriyorum, hesabı sen öde” teklifi yapabilir.',
      'Her gün başında herkese <b>+1 açlık</b> eklenir (en fazla 10).',
      'Gün sonunda sıradaki oyuncu herkese ısmarlar ve kendisi de yer. Hesap: masadaki herkesin (ısmarlayan dahil) <b>açlık × çarpan × ¤5</b> toplamı. Yiyenlerin açlığı sıfırlanır.',
      '<b>Tam tur:</b> +¤40, +2 açlık, çarpan +1. <b>Yarım tur (20. kare):</b> +¤20, +1 açlık.',
      'Sırası gelenin zar atmak ya da seçim yapmak için <b>30 saniyesi</b>, hesabı ödemek için 45 saniyesi var; süre dolunca oyun onun yerine devam eder.',
      'Hesabı ödeyemeyen elenir. İsteğe bağlı gün sınırında süre dolunca en çok <b>para + mekân değeri</b> olan kazanır.',
      '<b>Hızlı oyun</b> seni açık bir masaya oturtur; masa 4 kişi olunca ya da herkes hazır deyince başlar. <b>Tek kişilik</b> modda 1–3 bota karşı oynarsın.'
    ],
    decksA: 'Şans destesi', decksB: 'Olay destesi', squares: 'Kareler', restaurants: 'Mekânlar', kept: 'saklanır',
    beltNote: sq => `<b>${sq}</b> (12. kare ve Şans destesinde 2 kart): ${cardDescSafe('K')}. Saklanır.`,
    localTitle: 'Aynı cihazda oyun', localNote: 'Cihazı elden ele geçirerek oynayın. 2–6 oyuncu. Avatar düğmesine dokunarak oyuncuya avatar seçebilirsin.',
    addPlayer: 'Oyuncu ekle', back: 'Geri', startMoney: 'Başlangıç parası', dayLimit: 'Gün sınırı', off: 'Kapalı', nDays: n => `${n} gün`, startGame: 'Oyunu başlat',
    randomName: 'Boşsa rastgele isim', removePlayer: 'Oyuncuyu kaldır', pickAvatar: 'Avatar seç', playerNameAria: n => `Oyuncu ${n} adı`,
    autoMoney: m => `Otomatik: ${M(m)}`,
    soloTitle: '🤖 Tek kişilik oyun', soloNote: 'Bilgisayarın yönettiği rakiplere karşı oyna.', tableSize: 'Masa kaç kişilik?', nPlayers: n => `${n} kişi`, youBots: k => `sen + ${k} bot`, yourAvatar: 'Avatarın',
    connecting: 'Bağlanılıyor…', connectingNote: 'Birkaç saniye sürebilir.', cancel: 'Vazgeç',
    roomCode: 'Oda kodu', copy: '📋 Kopyala', copied: '✓ Kopyalandı', selectedCopy: 'Seçildi, kopyala', copyInvite: 'Davet linkini kopyala', inviteCopied: 'Kopyalandı', noLateJoin: 'Oyun başlayınca yeni oyuncu alınmaz.',
    pickAvatarTitle: 'Avatarını seç', avatarNote: 'Başkasının seçtiği avatar alınamaz. Kilitli olanlar seviye ve başarımlarla açılır (kullanmak için giriş yap). Seçmezsen renkli harf avatarın kullanılır.',
    settings: 'Ayarlar', auto: 'Otomatik', pubTable: 'Açık masa', ready: 'Hazırım', readyUndo: '✓ Hazırım (geri al)',
    pubNote: (n, max) => `${n}/${max} oyuncu. Masa ${max} kişi olunca ya da en az 2 kişiyken herkes hazır deyince başlar.`,
    moneyCustom: m => `Başlangıç parası ${M(m)}.`, moneyAuto: (n, m) => `Otomatik: ${n} oyuncu için ${M(m)} (2 kişi ¤100, 3 kişi ¤150, 4+ kişi ¤200)`,
    daysOn: d => `${d} gün sonunda en zengin kazanır`, daysOff: 'Kapalı: son kalan kazanır',
    you: 'sen', hostTag: 'oda sahibi', readyTag: '✓ hazır', waitingTag: 'bekliyor', seatsFree: n => `${n} yer boş`,
    need2: 'En az 2 oyuncu gerekli.', waitHost: 'Oda sahibinin oyunu başlatması bekleniyor.',
    players: 'Oyuncular', reactAria: 'Tepki gönder', sendEmoji: e => `${e} gönder`, events: 'Olaylar', squaresCards: 'Kareler ve kartlar',
    chat: '💬 Sohbet', chatEmpty: 'Henüz mesaj yok. Masaya bir selam ver.', chatPh: 'Mesaj yaz…', send: 'Gönder', closeChat: 'Sohbeti kapat', openChat: 'Sohbeti aç', showLog: 'Olayları göster', sound: 'Sesi aç/kapat',
    leave: 'Çık', leaveLong: 'Oyundan çık', langBtn: '🌐 EN', langAria: 'English',
    jCreatingPub: 'Yeni açık masa kuruluyor…', jCreating: 'Oda açılıyor…', jConnecting: 'Odaya bağlanılıyor…', jSearching: 'Açık masa aranıyor…', jFound: (n, max) => `Masa bulundu (${n}/${max}), katılınıyor…`,
    eLib: 'Bağlantı kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.', eServer: e => `Sunucuya bağlanılamadı: ${e}`, eServerPlain: 'Sunucuya bağlanılamadı.',
    eCode5: 'Oda kodu 5 karakter.', eNoRoom: 'Bu kodla açık bir oda bulunamadı. Kodu kontrol et.', eStarted: 'Bu odada oyun başlamış. Başlamış oyuna katılınamaz.', eFull: 'Oda dolu.', eJoin: 'Odaya girilemedi.', eUnknown: 'bilinmeyen hata',
    chipPub: 'Açık masa', chipRoom: 'Oda',
    dayFeast: d => `Gün ${d} · hesap zamanı`, gameOver: 'Oyun bitti', dayMove: (d, lim, m) => `Gün ${d}${lim ? '/' + lim : ''} · ${m}/2. hamle`,
    sOff: 'bağlantısı koptu · otomatik oynanıyor', sWon: 'kazandı!', sPaying: 'herkese ısmarlıyor', sDealThink: 'pazarlık teklifini düşünüyor', sAgain: 'bir kez daha atacak', sRoll: 'zar atacak',
    sMove: 'kaç kare gideceğini seçiyor', sTarget: 'hedef seçiyor', sBuy: 'mekânı almayı düşünüyor', sHome: 'mekânında karar veriyor', sOffer: 'teklif düşünüyor', sReply: 'teklife cevap veriyor',
    sRolling: 'zar atıyor…', sMoving: n => `${n} kare ilerliyor`,
    whom: 'Kime?', hungerN: n => `açlık ${n}`, cancelBtn: 'Vazgeç',
    over: 'Oyun bitti', wins: n => `${n} kazandı!`, noWinner: 'Kazanan yok', resultDay: d => `SONUÇ · ${d}. GÜN`, worthNote: 'para + mekân değeri',
    lastStanding: d => `${d}. günün sonunda masada kalan son kişi.`, again: 'Aynı oyuncularla yeniden', hostRestarts: 'Oda sahibi yeni oyunu başlatabilir.',
    yourTurn: 'Sıra sende', rollBtn: 'Zar at 🎲', rollAgainBtn: 'Bir daha at 🎲', willRoll: n => `${n} zar atacak…`,
    squaresLbl: v => `${v} kare`, sumLbl: ' (toplam)', moveQ: (a, b) => `Zar ${a} + ${b}: kaç kare gideceksin?`, moveHint: 'Parlayan kareye dokunarak da seçebilirsin.',
    isChoosing: n => `${n} kaç kare gideceğini seçiyor…`, isTargeting: n => `${n} hedef seçiyor…`,
    forSale: 'Satılık', buyNote: m => `Satılık · ${M(m)}. Her gün akşam yemeği için 4 mekândan biri seçilir; hesap burada ödenirse hesabın %25'i sana gelir.`,
    buyBtn: m => `Satın al (${M(m)})`, pass: 'Geç', isBuying: (n, v) => `${n}, ${v} mekânını almayı düşünüyor…`,
    ownHere: r => `Kendi mekânındasın. Komisyon şu an %${r}.`, collectBtn: 'Kasayı topla', upgradeBtn: s => `Yükselt ${s}`, upgradeSub: (m, r) => `${M(m)} öde · komisyon %${r}`, maxLevel: 'Mekân en üst seviyede.',
    isHome: n => `${n} kendi mekânında karar veriyor…`,
    offerNote: (o, pr, mn) => `Sahibi ${o}, son fiyat ${M(pr)}. Satın almak için en az ${M(mn)} teklif et. Kabul edip etmemek sahibine kalmış.`, offerAria: 'Teklif tutarı', offerBtn: 'Teklif ver', noOfferBtn: 'Teklif yapma, geç', isOffering: (n, v) => `${n}, ${v} için teklif düşünüyor…`,
    offerForYou: 'Sana teklif var', offerText: (b, m, pr) => `${b} bu mekân için <b>${M(m)}</b> teklif ediyor (son fiyat ${M(pr)}).`, sellBtn: m => `Sat (${M(m)})`, reject: 'Reddet', isAnswering: n => `${n} cevap veriyor…`,
    receiptHd: d => `ADİSYON · GÜN ${d}`, payer: 'Ödeyen', venueLbl: 'Mekân', ownerLbl: 'Sahibi', noOwner: 'yok, komisyon yok', own: ' (kendi)', nobodyAtTable: 'Masada kimse yok',
    dutch: 'Alman usulü', dutchLine: 'herkes kendi payını öder', subtotal: 'Ara toplam', coupon: 'Kupon −%25', total: 'TOPLAM', inHand: 'Kasada', commissionTo: n => `Komisyon → ${n}`, belt: 'Kemer Sıkma', notEating: n => `${n} yemiyor`,
    dealForYou: 'Pazarlık teklifi', dealQuote: (n, m) => `${n}: “<b>${M(m)}</b> veriyorum, hesabı sen öde.”`, dealNet: (n, need, net) => `Kabul edersen ${n} olarak ödeyeceğin hesap ${M(need)}. Net: ${MM(net)}`,
    accept: 'Kabul et', cantAfford: 'Paran bu hesabı ödemeye yetmiyor.', isThinking: n => `${n} düşünüyor…`,
    checkIsYours: 'Hesap sende', buying: n => `${n} ısmarlıyor`, useCard: c => `${c} kullan`,
    dealOpen: '🤝 Hesabı devretmeyi teklif et', oneShot: '(tek hak)', toWhomAria: 'Kime', dealSend: 'Teklifi gönder', dealNote: 'Kabul ederse bu parayı ona verirsin, hesabı o öder. Kart oynadıktan sonra teklif yapılamaz.', dealUsed: 'Pazarlık hakkı kullanıldı.',
    cantPay: 'Ödeyemiyorum, masadan kalk', payBtn: 'Hesabı öde', waitCards: 'Beklerken elindeki İkram ya da Aç Gözlü kartını oynayabilirsin.',
    replyTime: 'Cevap süresi', payTime: 'Ödeme süresi', timeLbl: 'Süre', sec: n => `${n} sn`,
    billQueue: '🧾 Hesap sırası', today: 'bugün', tomorrow: 'yarın',
    offlineNote: n => `<b>${n}</b> bağlantısı koptu. Geri dönene kadar hamleleri otomatik yapılıyor.`, sending: 'Gönderiliyor…', reconnecting: 'Bağlantı koptu, yeniden bağlanılıyor…',
    sheetHandle: 'tahtayı gör', sheetOpen: 'paneli aç', sheetAria: 'Paneli küçült ya da büyüt',
    addBot: '🤖 Bot ekle', removeBot: 'Botu çıkar', addBotNote: 'Botları oda sahibinin cihazı oynatır. Bot olan oyunlar bot oyunu sayılır: yarım XP, başarım yok.',
    botTag: '🤖 bot', payTodayTag: '🧾 bugün hesap', waitsTag: 'bekliyor', offTag: 'bağlantı koptu',
    value: (m, r) => `Değer ${M(m)}, komisyon %${r}`, hungerLbl: 'açlık', squareN: (p, n) => `📍 ${p}. kare · ${n}`,
    popChance: 'Şans kartı', popEvent: 'Olay kartı', popSpecial: 'Özel kart', popPlayed: 'Kart oynandı', popSquare: p => `${p}. kare`, popInfo: 'Bilgi',
    ownerIs: (n, m) => `Sahibi: ${n} · son fiyat ${M(m)}`, forSaleM: m => `Satılık · ${M(m)}`,
    exTarget: 'Hedef seçilecek', exBuy: 'Satın almak ister mi?', exOffer: 'Teklif verebilir', exReply: n => `${n} cevap verecek`, exAgain: 'Çift attı, bir kez daha atacak!',
    tapToContinue: 'devam etmek için dokun', dhunger: 'açlık', dmult: 'çarpan', dout: 'elendi',
    dinnerHd: d => `Akşam yemeği · Gün ${d}`, pickingVenue: 'Mekân seçiliyor…', venueOwner: (n, r) => `Sahibi <b>${n}</b> · hesabın %${r}'i ona gidecek`, venueNoOwner: 'Sahibi yok, komisyon ödenmeyecek', checkIs: n => `Hesap: <b>${n}</b>`,
    letterAvatar: 'Harf avatar', none: 'yok', ownerTitle: n => `Sahibi ${n}`,
    langName: 'Türkçe'
  }
};
function cardDescSafe(c) { return cardDesc(c); }
function t(key, ...args) { const v = (U[lang] || U.en)[key] ?? U.en[key]; return typeof v === 'function' ? v(...args) : (v ?? key); }

/* ---------- game log & popup titles ---------- */
const V_ = v => venueName(v);
const LOG = {
  en: {
    lap: p => `${p.n} completed a lap: +${M(p.m)}, +${p.h} hunger, multiplier ×${p.x}`,
    half: p => `${p.n} passed halfway: +${M(p.m)}, +${p.h} hunger`,
    handFull: p => `${p.n}: hand is full, ${cardName(p.c)} discarded`,
    gotBelt: p => `${p.n} got a Tighten the Belt card`,
    payday: p => `${p.n}: Payday +${M(p.m)}`, bills: p => `${p.n}: Bills −${M(p.m)}`,
    snack: p => `${p.n}: Snack, hunger −2`, gym: p => `${p.n}: Gym, hunger +2`,
    shortcut: p => `${p.n}: Shortcut, 3 squares forward`, goBack: p => `${p.n}: 3 squares back`,
    coffee: p => `${p.n}: Coffee break, skips the next move`, empty: p => `${p.n}: empty square`,
    noCashVenue: p => `${p.n}: ${V_(p.v)} is for sale but they can't afford it`,
    rent: p => `${p.n} visited ${p.o}'s ${V_(p.v)}: −${M(p.m)} visit fee`,
    noCashOffer: p => `${p.n}: ${V_(p.v)} belongs to ${p.o}, not enough money for an offer`,
    drew: p => `${p.n} drew a card: ${cardName(p.c)}`,
    rolled: p => `${p.n} rolled ${p.a}+${p.b}${p.dbl ? ' (doubles)' : ''}`,
    again: p => `${p.n} rolled doubles and rolls again`, waits: p => `${p.n} sits this move out`,
    dayEnd: p => `Day ${p.d} is over. Dinner at ${V_(p.v)}. ${p.n} has the check`,
    dutch: () => 'Going Dutch: everyone paid their own share',
    paid: p => `${p.n} paid the check: ${M(p.m)}${p.v != null ? ' (' + V_(p.v) + ')' : ''}`,
    commission: p => `${p.n} earned ${V_(p.v)} commission (${p.r}%): +${M(p.m)}`,
    belt: p => `${p.n} tightened the belt and skipped the meal`,
    out: p => `${p.n} couldn't pay and is out`, won: p => `${p.n} wins!`, teamWon: p => `${p.a} & ${p.b} win!`, teamHelp: p => `${p.n} chipped in ${M(p.m)} for teammate ${p.t}`, nobody: () => 'Nobody is left at the table',
    daysOver: p => `Day ${p.d} reached. ${p.list.map(([n, w]) => n + ' ' + M(w)).join(' · ')}`,
    dayStart: p => `Day ${p.d} begins, everyone +1 hunger`,
    startMoney: p => `Everyone starts with ${M(p.m)}${p.days ? `, the game lasts ${p.days} days` : ''}`,
    order: p => `Turn order rolls: ${p.list.map(([n, r]) => n + ' ' + r).join(' › ')}`,
    cardOn: p => `${p.n} → ${p.t}: ${cardName(p.c)} (hunger ${p.d > 0 ? '+' : '−'}${Math.abs(p.d)})`,
    cardUse: p => `${p.n}: ${cardName(p.c)}${p.t ? `. ${p.t} has the check now` : ''}`,
    collected: p => `${p.n} collected ${M(p.m)} from ${p.t}`, gossip: p => `${p.t} got caught up in gossip and misses 1 move`,
    bought: p => `${p.n} bought ${V_(p.v)} for ${M(p.m)}`, notBought: p => `${p.n} passed on ${V_(p.v)}`,
    noOffer: p => `${p.n} made no offer for ${V_(p.v)}`, offered: p => `${p.n} offered ${p.o} ${M(p.m)} for ${V_(p.v)}`,
    sold: p => `${p.b} bought ${V_(p.v)} from ${p.o} for ${M(p.m)}`, notSold: p => `${p.o} refused to sell ${V_(p.v)}`,
    upgraded: p => `${p.n} upgraded ${V_(p.v)}: ${p.r}% commission`, collect: p => `${p.n} took ${M(p.m)} from the ${V_(p.v)} register`,
    dealOffer: p => `${p.n} offered ${p.t} ${M(p.m)} to take the check`, dealTook: p => `${p.t} took the check for ${M(p.m)}`, dealNo: p => `${p.t} rejected the deal`,
    joined: p => `${p.n} joined`, left: p => `${p.n} left the lobby`,
    created: p => p.pub ? `${p.n} opened a public table` : `${p.n} created the room`,
    hostLeft: p => `${p.o || 'The host'} dropped, ${p.n} is now running the room`, reconnected: p => `${p.n} reconnected`,
    timeout: p => `Time's up for ${p.n}, the game moved on`, offline: p => `${p.n} is offline, played automatically`,
    newLobby: () => 'Lobby reopened for a new game', freed: p => `${p.n}'s restaurants are for sale again`
  },
  tr: {
    lap: p => `${p.n} turu tamamladı: +${M(p.m)}, +${p.h} açlık, çarpan ×${p.x}`,
    half: p => `${p.n} yarım turda: +${M(p.m)}, +${p.h} açlık`,
    handFull: p => `${p.n}: el dolu, ${cardName(p.c)} yandı`,
    gotBelt: p => `${p.n} Kemer Sıkma kartı kazandı`,
    payday: p => `${p.n}: Gelir +${M(p.m)}`, bills: p => `${p.n}: Fatura −${M(p.m)}`,
    snack: p => `${p.n}: Atıştırmalık, açlık −2`, gym: p => `${p.n}: Spor salonu, açlık +2`,
    shortcut: p => `${p.n}: Kısayol, 3 kare ileri`, goBack: p => `${p.n}: 3 kare geri`,
    coffee: p => `${p.n}: Mola, sonraki hamlesi yok`, empty: p => `${p.n}: boş kare`,
    noCashVenue: p => `${p.n}: ${V_(p.v)} satılık ama parası yetmiyor`,
    rent: p => `${p.n}, ${p.o} oyuncusunun ${V_(p.v)} mekânına uğradı: −${M(p.m)} geçiş ücreti`,
    noCashOffer: p => `${p.n}: ${V_(p.v)} ${p.o} oyuncusunun, teklif için parası yetmiyor`,
    drew: p => `${p.n} kart çekti: ${cardName(p.c)}`,
    rolled: p => `${p.n} ${p.a}+${p.b} attı${p.dbl ? ' (çift)' : ''}`,
    again: p => `${p.n} çift attı, bir kez daha atacak`, waits: p => `${p.n} bu hamleyi bekliyor`,
    dayEnd: p => `Gün ${p.d} bitti. Akşam yemeği: ${V_(p.v)}. Hesap ${p.n} oyuncusunda`,
    dutch: () => 'Alman usulü: herkes kendi hesabını ödedi',
    paid: p => `${p.n} hesabı ödedi: ${M(p.m)}${p.v != null ? ' (' + V_(p.v) + ')' : ''}`,
    commission: p => `${p.n}, ${V_(p.v)} komisyonu aldı (%${p.r}): +${M(p.m)}`,
    belt: p => `${p.n} kemer sıktı, yemedi`,
    out: p => `${p.n} hesabı ödeyemedi ve elendi`, won: p => `${p.n} kazandı!`, teamWon: p => `${p.a} ve ${p.b} kazandı!`, teamHelp: p => `${p.n}, takım arkadaşı ${p.t} için ${M(p.m)} ekledi`, nobody: () => 'Masada kimse kalmadı',
    daysOver: p => `${p.d}. gün doldu. ${p.list.map(([n, w]) => n + ' ' + M(w)).join(' · ')}`,
    dayStart: p => `Gün ${p.d} başladı, herkese +1 açlık`,
    startMoney: p => `Herkes ${M(p.m)} ile başlıyor${p.days ? `, oyun ${p.days} gün sürecek` : ''}`,
    order: p => `Sıra zarları: ${p.list.map(([n, r]) => n + ' ' + r).join(' › ')}`,
    cardOn: p => `${p.n} → ${p.t}: ${cardName(p.c)} (açlık ${p.d > 0 ? '+' : '−'}${Math.abs(p.d)})`,
    cardUse: p => `${p.n}: ${cardName(p.c)}${p.t ? `. Hesap artık ${p.t} oyuncusunda` : ''}`,
    collected: p => `${p.n}, ${p.t} oyuncusundan ${M(p.m)} tahsil etti`, gossip: p => `${p.t} dedikoduya takıldı, 1 hamle bekleyecek`,
    bought: p => `${p.n}, ${V_(p.v)} mekânını ${M(p.m)}'a aldı`, notBought: p => `${p.n}, ${V_(p.v)} mekânını almadı`,
    noOffer: p => `${p.n} ${V_(p.v)} için teklif yapmadı`, offered: p => `${p.n}, ${V_(p.v)} için ${p.o} oyuncusuna ${M(p.m)} teklif etti`,
    sold: p => `${p.b}, ${V_(p.v)} mekânını ${p.o} oyuncusundan ${M(p.m)}'a aldı`, notSold: p => `${p.o}, ${V_(p.v)} mekânını satmadı`,
    upgraded: p => `${p.n}, ${V_(p.v)} mekânını yükseltti: komisyon %${p.r}`, collect: p => `${p.n}, ${V_(p.v)} kasasından ${M(p.m)} aldı`,
    dealOffer: p => `${p.n}, ${p.t} oyuncusuna ${M(p.m)} karşılığında hesabı devretmeyi teklif etti`, dealTook: p => `${p.t}, ${M(p.m)} karşılığında hesabı üstlendi`, dealNo: p => `${p.t} pazarlığı reddetti`,
    joined: p => `${p.n} katıldı`, left: p => `${p.n} lobiden ayrıldı`,
    created: p => p.pub ? `${p.n} açık masayı kurdu` : `${p.n} odayı kurdu`,
    hostLeft: p => `${p.o || 'Oda sahibi'} düştü, odayı ${p.n} yönetiyor`, reconnected: p => `${p.n} tekrar bağlandı`,
    timeout: p => `${p.n} için süre doldu, oyun devam etti`, offline: p => `${p.n} bağlı değil, otomatik oynandı`,
    newLobby: () => 'Yeni oyun için lobi açıldı', freed: p => `${p.n} oyuncusunun mekânları tekrar satışta`
  }
};
const TXT = {
  en: {
    tableSet: 'Table is set', gameStarts: "Let's eat!", venueBought: 'Restaurant bought', venueOffer: 'Restaurant offer', ownVenue: 'Your restaurant',
    deal: 'Negotiation', receipt: 'The check', billPaid: 'Check paid', offerRejected: 'Offer rejected', accepted: 'Accepted', rejected: 'Rejected',
    venue: p => venueIcon(p.v) + ' ' + V_(p.v), sold: p => `${V_(p.v)} changed hands`, dealQuote: p => `“I'll give you ${M(p.m)}, you pay the check”`,
    ownerNow: p => `Now owned by ${p.n} (${M(p.m)})`, offeredSub: p => `${p.n} offered ${p.o} ${M(p.m)}`, soldSub: p => `${p.b} bought it from ${p.o} for ${M(p.m)}`,
    notSoldSub: p => `${p.o} refused to sell ${V_(p.v)}`, upgradedSub: p => `Upgraded ${'★'.repeat(p.lv)} · commission is now ${p.r}%`, collectedSub: p => `Cashed the register: +${M(p.m)}`,
    arrow: p => `${p.a} → ${p.b}`, dealTookSub: p => `${p.t} got ${M(p.m)} and pays the check`, stillPays: p => `The check stays with ${p.n}`
  },
  tr: {
    tableSet: 'Masa kuruldu', gameStarts: 'Oyun başlıyor', venueBought: 'Mekân alındı', venueOffer: 'Mekân teklifi', ownVenue: 'Kendi mekânın',
    deal: 'Pazarlık', receipt: 'Adisyon', billPaid: 'Hesap ödendi', offerRejected: 'Teklif reddedildi', accepted: 'Kabul edildi', rejected: 'Reddedildi',
    venue: p => venueIcon(p.v) + ' ' + V_(p.v), sold: p => `${V_(p.v)} el değiştirdi`, dealQuote: p => `“${M(p.m)} veriyorum, hesabı sen öde”`,
    ownerNow: p => `Artık ${p.n} oyuncusunun (${M(p.m)})`, offeredSub: p => `${p.n}, ${p.o} oyuncusuna ${M(p.m)} teklif etti`, soldSub: p => `${p.b}, ${p.o} oyuncusundan ${M(p.m)}'a aldı`,
    notSoldSub: p => `${p.o}, ${V_(p.v)} mekânını satmadı`, upgradedSub: p => `Yükseltildi ${'★'.repeat(p.lv)} · komisyon artık %${p.r}`, collectedSub: p => `Kasayı topladı: +${M(p.m)}`,
    arrow: p => `${p.a} → ${p.b}`, dealTookSub: p => `${p.t} ${M(p.m)} aldı, hesabı o ödeyecek`, stillPays: p => `Hesap yine ${p.n} oyuncusunda`
  }
};
let venueIcon = v => '';
const setVenueIconFn = fn => { venueIcon = fn; };
// A log entry or popup text: {k, p} from the engine (older plain strings are shown as-is).
function tx(e) {
  if (e == null) return '';
  if (typeof e === 'string') return e;
  const f = (LOG[lang] || {})[e.k] || (TXT[lang] || {})[e.k] || LOG.en[e.k] || TXT.en[e.k] || (U[lang] || {})[e.k] || U.en[e.k];
  if (!f) return e.k;
  try { return typeof f === 'function' ? f(e.p || {}) : f; } catch (err) { return e.k; }
}

// lets other modules (js/i18n-account.js) add UI strings
function extendStrings(o) { for (const l in o) Object.assign(U[l] = U[l] || {}, o[l]); }
const venueIconOf = v => venueIcon(v);
// the first language (saved / browser) is loaded before the game draws its first screen
const i18nReady = geoLang().then(() => loadLang(lang)).catch(() => { lang = 'en'; });
// for tools/check-langs.mjs
const __I18N = {C, U, LOG, TXT};

export {LANGS, LANG_NAMES, PACKS, locale, loadLang, onPack, i18nReady, venueIconOf, __I18N, getLang, setLang, extendStrings, t, tx, M, MM, sqName, sqDesc, venueName, cardName, cardDesc, avatarLabel, nickList, setVenueIconFn};
