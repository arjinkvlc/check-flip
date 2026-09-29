"""Builds the search landing pages in public/ (English + Turkish). Run: python3 tools/seo-pages/build.py
Each page answers one search ("online board game to play with friends", "Monopoly-like game online")
with real content, links back to the game and to its other-language twin (hreflang)."""
import json, html, os

SITE = 'https://checkflipgame.com'
PAGES = [
  dict(lang='en', path='online-board-game-with-friends', twin='tr/arkadaslarla-online-oyun',
       title='Online Board Game to Play with Friends – Free, No Download | Check Flip',
       desc='Play a free online board game with friends in your browser: send a room code, 2–6 players, phone or computer, no download or sign-up. Dice, cards and who pays the dinner check.',
       h1='A free online board game to play with friends',
       lead='Check Flip is a board game you play in the browser with 2–6 friends: one person makes a room, sends the code or link, and everyone joins from a phone or computer. No download, no sign-up.',
       sections=[
         ('How to play with friends in one minute', 'ol', [
           'Open <a href="/">checkflipgame.com</a> and tap <b>With friends</b> → <b>Create a room</b>.',
           'Send the 5-letter room code or the invite link on WhatsApp, Discord or anywhere.',
           'Friends open the link, pick a nickname and an avatar. The host presses <b>Start</b>.']),
         ('Why it works well for a group', 'ul', [
           '<b>Everyone can join</b>: it runs in any modern browser, on Android, iPhone, Windows or Mac.',
           '<b>Short and loud</b>: a Quick game takes about 15 minutes; every evening someone has to pay the whole table’s dinner check, so there is always something to argue about.',
           '<b>Deals and bluffs</b>: the payer may offer money to pass the check on, restaurants can be bought from their owners, and cards like Tighten the Belt or Discount coupon change the bill.',
           '<b>Voice-call friendly</b>: turns are clear and quick, which makes it a good game next to a Discord or video call.',
           '<b>Fair when someone drops</b>: a bot plays the turns of a player who loses connection until they are back.']),
         ('Game modes', 'ul', [
           '<b>Classic</b>: the last player at the table wins.',
           '<b>Quick</b>: 10 days, the richest player wins.',
           '<b>2 vs 2</b>: teams of two; if you can’t pay, your teammate covers the difference.',
           'No friends online right now? Play against bots (easy, normal or hard) or join a public table with <b>Quick play</b>.'])],
       faq=[
         ('Is it free?', 'Yes. Check Flip is completely free and has no pay-to-win items.'),
         ('Do my friends need an account?', 'No. Anyone can join a room with just a nickname. A free account adds XP, levels, cosmetics, friends and the monthly season leaderboard.'),
         ('How many players can play?', 'Rooms with friends take 2 to 6 players. You can also add bots to fill empty seats.'),
         ('Can we play on phones?', 'Yes. The game is made for phones as much as for computers, and phone and computer players can share a table.')],
       cta='Create a room and send the link'),
  dict(lang='tr', path='tr/arkadaslarla-online-oyun', twin='online-board-game-with-friends',
       title='Arkadaşlarla Oynanacak Online Oyun – Ücretsiz, İndirmeden | Check Flip',
       desc='Arkadaşlarınla tarayıcıda ücretsiz online kutu oyunu: oda kodunu gönder, 2–6 kişi, telefondan ya da bilgisayardan, indirme ve üyelik yok. Zar, kart ve akşam yemeğinin hesabı kimde kalacak?',
       h1='Arkadaşlarla oynanacak ücretsiz online kutu oyunu',
       lead='Check Flip, 2–6 arkadaşla tarayıcıda oynanan bir kutu oyunu: biri oda kurar, kodu ya da linki gönderir, herkes telefondan veya bilgisayardan katılır. İndirme yok, üyelik yok.',
       sections=[
         ('Bir dakikada arkadaşlarla oyna', 'ol', [
           '<a href="/tr">checkflipgame.com/tr</a> adresini aç, <b>Arkadaşlarla</b> → <b>Oda kur</b>’a dokun.',
           '5 harfli oda kodunu ya da davet linkini WhatsApp’tan, Discord’dan veya istediğin yerden gönder.',
           'Arkadaşların linki açar, takma ad ve avatar seçer. Oda sahibi <b>Başlat</b>’a basar.']),
         ('Neden grupla oynamaya uygun', 'ul', [
           '<b>Herkes katılabilir</b>: Android, iPhone, Windows ya da Mac, güncel her tarayıcıda çalışır.',
           '<b>Kısa ve eğlenceli</b>: Hızlı oyun yaklaşık 15 dakika sürer; her akşam birisi bütün masanın yemek hesabını öder, yani tartışacak bir şey hep vardır.',
           '<b>Pazarlık ve blöf</b>: hesabı ödeyecek kişi para teklif edip hesabı devredebilir, restoranlar sahibinden satın alınabilir, Kemer Sıkma ya da İndirim kuponu gibi kartlar hesabı değiştirir.',
           '<b>Sesli sohbete uygun</b>: sıralar net ve hızlı, Discord ya da görüntülü görüşme eşliğinde oynamak için birebir.',
           '<b>Biri düşerse oyun durmaz</b>: bağlantısı kopan oyuncunun sırasını o dönene kadar bot oynar.']),
         ('Oyun modları', 'ul', [
           '<b>Klasik</b>: masada kalan son kişi kazanır.',
           '<b>Hızlı</b>: 10 gün, en zengin olan kazanır.',
           '<b>2’ye 2</b>: iki kişilik takımlar; hesabı ödeyemezsen eksiğini takım arkadaşın kapatır.',
           'Şu an çevrim içi arkadaşın yok mu? Botlara karşı (kolay, normal, zor) oyna ya da <b>Hızlı oyun</b> ile açık bir masaya katıl.'])],
       faq=[
         ('Ücretsiz mi?', 'Evet. Check Flip tamamen ücretsiz ve parayla avantaj satın alınan bir şey yok.'),
         ('Arkadaşlarımın hesap açması gerekiyor mu?', 'Hayır. Herkes sadece takma adla odaya katılabilir. Ücretsiz hesap XP, seviye, görünümler, arkadaş listesi ve aylık sezon sıralaması ekler.'),
         ('Kaç kişi oynayabilir?', 'Arkadaş odaları 2–6 kişilik. Boş koltuklara bot da ekleyebilirsin.'),
         ('Telefondan oynanır mı?', 'Evet. Oyun telefon için de tasarlandı; telefondaki ve bilgisayardaki oyuncular aynı masada oynayabilir.')],
       cta='Oda kur, linki gönder'),
  dict(lang='en', path='monopoly-alternative-online', twin='tr/monopoly-benzeri-online-oyun',
       title='A Monopoly-Like Board Game to Play Online Free – Check Flip',
       desc='Looking for a Monopoly-like game to play online with friends? Check Flip is a free browser board game with dice, a board of restaurants, cards and deals – and a dinner check someone has to pay.',
       h1='A Monopoly-like board game you can play online for free',
       lead='If you like rolling dice around a board, buying places and making deals, Check Flip will feel familiar. It keeps the parts that make property games fun and adds a twist: every evening, someone pays the whole table’s dinner check.',
       sections=[
         ('What feels familiar', 'ul', [
           'Roll two dice and move around a 40-square board.',
           'Buy restaurants; other players pay you a fee when they land on them, and you can upgrade them.',
           'Chance and Event cards, payday squares and bills.',
           'Negotiation: buy a restaurant from its owner or pay someone to take over the check.']),
         ('What is different', 'ul', [
           '<b>Hunger instead of houses</b>: every player gets hungrier each day. At the end of the day the next player in line pays <i>hunger × multiplier × 5</i> for everyone at the table, themselves included.',
           '<b>Tonight’s restaurant</b>: each morning one restaurant is drawn for dinner, and its owner earns a commission from the check, so owning the right place at the right time matters.',
           '<b>Games end on time</b>: the Quick mode is 10 days (about 15 minutes), so it never drags on for hours.',
           '<b>Made for the browser</b>: 2–6 players join with a link from a phone or computer; no download, no sign-up.']),
         ('Ways to play', 'ul', [
           'With friends in a private room (send the code or link).',
           'Quick play: sit down at a public table with other players.',
           'Against bots, easy to hard, or pass-and-play on one device.'])],
       faq=[
         ('Is Check Flip an official Monopoly game?', 'No. Check Flip is an original, independent game. Monopoly is a trademark of Hasbro, which has no connection to Check Flip.'),
         ('Is it free?', 'Yes, completely free, with no pay-to-win items.'),
         ('How long does a game take?', 'A Quick game takes about 15 minutes; a Classic game lasts until only one player can still pay.')],
       cta='Play now'),
  dict(lang='tr', path='tr/monopoly-benzeri-online-oyun', twin='monopoly-alternative-online',
       title='Monopoly Benzeri Online Oyun – Ücretsiz, Arkadaşlarla | Check Flip',
       desc='Arkadaşlarınla oynayacak Monopoly benzeri online bir oyun mu arıyorsun? Check Flip; zar, restoranlarla dolu bir tahta, kartlar ve pazarlık içeren ücretsiz bir tarayıcı oyunu. Ve bir de ödenmesi gereken akşam yemeği hesabı var.',
       h1='Ücretsiz oynanan Monopoly benzeri online kutu oyunu',
       lead='Tahtada zar atıp ilerlemeyi, mekân satın almayı ve pazarlık yapmayı seviyorsan Check Flip sana tanıdık gelecek. Mülk oyunlarını eğlenceli yapan kısmı koruyor ve bir fark ekliyor: her akşam birisi bütün masanın yemek hesabını ödüyor.',
       sections=[
         ('Tanıdık gelecekler', 'ul', [
           'İki zar at, 40 karelik tahtada ilerle.',
           'Restoran satın al; başkaları üzerine gelince sana ücret öder, restoranını yükseltebilirsin.',
           'Şans ve Olay kartları, gelir kareleri ve faturalar.',
           'Pazarlık: restoranı sahibinden satın al ya da hesabı devretmek için birine para teklif et.']),
         ('Farkı ne', 'ul', [
           '<b>Ev yerine açlık</b>: her gün herkesin açlığı artar. Gün sonunda sıradaki oyuncu masadaki herkes için (kendisi dahil) <i>açlık × çarpan × 5</i> öder.',
           '<b>Bu akşamın restoranı</b>: her sabah akşam yemeğinin yeneceği restoran çekilir ve sahibi hesaptan komisyon alır; doğru zamanda doğru mekâna sahip olmak önemlidir.',
           '<b>Oyun uzamaz</b>: Hızlı mod 10 gün (yaklaşık 15 dakika) sürer, saatlerce sürüp gitmez.',
           '<b>Tarayıcı için yapıldı</b>: 2–6 oyuncu telefondan ya da bilgisayardan linkle katılır; indirme ve üyelik yok.']),
         ('Nasıl oynanır', 'ul', [
           'Arkadaşlarla özel odada (kodu ya da linki gönder).',
           'Hızlı oyun: başka oyuncularla açık bir masaya otur.',
           'Botlara karşı (kolaydan zora) ya da tek cihazda sırayla.'])],
       faq=[
         ('Check Flip resmi bir Monopoly oyunu mu?', 'Hayır. Check Flip özgün ve bağımsız bir oyundur. Monopoly, Hasbro’nun tescilli markasıdır ve Check Flip ile bir bağlantısı yoktur.'),
         ('Ücretsiz mi?', 'Evet, tamamen ücretsiz; parayla avantaj satın alınan bir şey yok.'),
         ('Bir oyun ne kadar sürer?', 'Hızlı oyun yaklaşık 15 dakika sürer; Klasik oyun, hesabı ödeyebilen tek kişi kalana kadar devam eder.')],
       cta='Hemen oyna'),
]
UI = {'en': dict(back='← Back to the game', faq='Questions', more='More', other='Türkçe', home='/', privacy='Privacy'),
      'tr': dict(back='← Oyuna dön', faq='Sık sorulanlar', more='Diğer sayfalar', other='English', home='/tr', privacy='Gizlilik')}

def page(p):
    L = UI[p['lang']]; url = f"{SITE}/{p['path']}"; twin = f"{SITE}/{p['twin']}"
    en_url, tr_url = (url, twin) if p['lang'] == 'en' else (twin, url)
    ld = [{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
             {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p['faq']]},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "Check Flip", "item": SITE + L['home']},
             {"@type": "ListItem", "position": 2, "name": p['h1'], "item": url}]}]
    secs = ''.join(f"<h2>{html.escape(h)}</h2><{tag}>{''.join(f'<li>{i}</li>' for i in items)}</{tag}>" for h, tag, items in p['sections'])
    faq = ''.join(f"<h3>{html.escape(q)}</h3><p>{html.escape(a)}</p>" for q, a in p['faq'])
    others = [o for o in PAGES if o['lang'] == p['lang'] and o['path'] != p['path']]
    more = ''.join(f'<li><a href="/{o["path"]}">{html.escape(o["h1"])}</a></li>' for o in others)
    return f"""<!doctype html>
<html lang="{p['lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{html.escape(p['title'])}</title>
<meta name="description" content="{html.escape(p['desc'])}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{en_url}">
<link rel="alternate" hreflang="tr" href="{tr_url}">
<link rel="alternate" hreflang="x-default" href="{en_url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Check Flip">
<meta property="og:title" content="{html.escape(p['title'])}">
<meta property="og:description" content="{html.escape(p['desc'])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
<link rel="stylesheet" href="/vendor/fonts/fonts.css">
<link rel="stylesheet" href="/css/style.css">
<script>try{{var th=localStorage.getItem("cf-theme");if(!th)th=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=th;}}catch(e){{}}</script>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>
  .doc{{max-width:760px;margin:0 auto;display:grid;gap:14px}}
  .doc h1{{font-family:var(--display);font-size:clamp(30px,6vw,42px);line-height:1.05;margin:8px 0 0;color:var(--tomato)}}
  .doc h2{{font-size:20px;margin:14px 0 0}} .doc h3{{font-size:16px;margin:8px 0 0}}
  .doc p,.doc li{{font-size:16px;line-height:1.6;margin:0}}
  .doc ul,.doc ol{{margin:0;padding-left:22px;display:grid;gap:6px}}
  .doc a{{color:var(--sky);font-weight:700}}
  .doc .lead{{font-size:18px}}
  .doc .cta{{justify-self:start;text-decoration:none;color:#fff}}
  .langnav{{display:flex;gap:14px;flex-wrap:wrap}}
</style>
</head>
<body>
<div class="app">
  <header class="top"><a class="logo" href="{L['home']}" style="text-decoration:none"><img class="logo-svg" src="/assets/logo.svg" alt=""><span>Check Flip</span></a></header>
  <main class="doc">
    <nav class="langnav"><a href="{L['home']}">{L['back']}</a><a href="/{p['twin']}" hreflang="{'tr' if p['lang'] == 'en' else 'en'}">{L['other']}</a></nav>
    <article class="box">
      <h1>{html.escape(p['h1'])}</h1>
      <p class="lead">{html.escape(p['lead'])}</p>
      <a class="btn primary big cta" href="{L['home']}">{html.escape(p['cta'])}</a>
      {secs}
      <h2>{L['faq']}</h2>{faq}
      <a class="btn primary big cta" href="{L['home']}">{html.escape(p['cta'])}</a>
    </article>
    <nav class="box"><h2>{L['more']}</h2><ul>{more}<li><a href="/privacy">{L['privacy']}</a></li></ul></nav>
    <footer class="credit"><a href="https://github.com/arjinkvlc" target="_blank" rel="noopener noreferrer">Developed by @arjinkvlc</a></footer>
  </main>
</div>
</body>
</html>
"""

here = os.path.dirname(os.path.abspath(__file__)); pub = os.path.join(here, '..', '..', 'public')
for p in PAGES:
    out = os.path.join(pub, p['path'] + '.html'); os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(page(p))
    print('wrote', os.path.relpath(out, pub))
