"""Builds the search landing pages in public/ (en, tr, es, pt, fr, de). Run: python3 tools/seo-pages/build.py
Each page answers one search ("online board game to play with friends", "Monopoly-like game online")
with real content, links back to the game and to the same topic in the other languages (hreflang).
Pages with the same `topic` are language versions of each other; the English one is x-default.
The VideoGame structured data is copied from public/index.html, so it stays the same as the home page."""
import json, html, os, re

SITE = 'https://checkflipgame.com'
PAGES = [
  dict(lang='en', path='online-board-game-with-friends', topic='friends',
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
  dict(lang='tr', path='tr/arkadaslarla-online-oyun', topic='friends',
       title='Arkadaşlarla Oynanacak Online Oyun – Ücretsiz, İndirmeden | Check Flip',
       desc='Arkadaşlarınla tarayıcıda ücretsiz online kutu oyunu: oda kodunu gönder, 2–6 kişi, telefondan ya da bilgisayardan, indirme ve üyelik yok. Zarlar, kartlar ve tek bir soru: Akşam yemeğinin hesabı kimde kalacak?',
       h1='Arkadaşlarla oynanacak ücretsiz online kutu oyunu',
       lead='Check Flip, 2–6 arkadaşla tarayıcıda oynanan bir kutu oyunudur: Biri oda kurar, kodu ya da linki gönderir, herkes telefondan veya bilgisayardan katılır. İndirme yok, üyelik yok.',
       sections=[
         ('Bir dakikada arkadaşlarla oyna', 'ol', [
           '<a href="/tr">checkflipgame.com/tr</a> adresini aç, <b>Arkadaşlarla</b> → <b>Oda kur</b>’a dokun.',
           '5 harfli oda kodunu ya da davet bağlantısını WhatsApp’tan, Discord’dan veya istediğin yerden gönder.',
           'Arkadaşların linki açar, takma ad ve avatar seçer. Oda sahibi <b>Başlat</b>’a basar.']),
         ('Neden grupla oynamaya uygun?', 'ul', [
           '<b>Herkes katılabilir</b>: Android, iPhone, Windows ya da Mac, güncel her tarayıcıda çalışır.',
           '<b>Kısa ve eğlenceli</b>: Hızlı oyun yaklaşık 15 dakika sürer; her akşam biri bütün masanın yemek hesabını öder; tartışacak konu hiç bitmez.',
           '<b>Pazarlık ve blöf</b>: hesabı ödeyecek kişi para teklif edip hesabı devredebilir, restoranlar sahibinden satın alınabilir, Kemer Sıkma ya da İndirim kuponu gibi kartlar hesabı değiştirir.',
           '<b>Sesli sohbete uygun</b>: sıralar net ve hızlı, Discord ya da görüntülü görüşme eşliğinde oynamak için ideal.',
           '<b>Biri düşerse oyun durmaz</b>: bağlantısı kopan oyuncunun sırasını o dönene kadar bot oynar.']),
         ('Oyun modları', 'ul', [
           '<b>Klasik</b>: masada kalan son kişi kazanır.',
           '<b>Hızlı</b>: 10 gün, en zengin olan kazanır.',
           '<b>2’ye 2</b>: iki kişilik takımlar; hesabı ödeyemezsen eksiğini takım arkadaşın kapatır.',
           'Şu an çevrim içi arkadaşın yok mu? Botlara karşı (kolay, normal, zor) oyna ya da <b>Hızlı oyun</b> ile açık bir masaya katıl.'])],
       faq=[
         ('Ücretsiz mi?', 'Evet. Check Flip tamamen ücretsizdir ve parayla avantaj satın alınamaz.'),
         ('Arkadaşlarımın hesap açması gerekiyor mu?', 'Hayır. Herkes yalnızca bir takma adla odaya katılabilir. Ücretsiz hesap XP, seviye, görünümler, arkadaş listesi ve aylık sezon sıralaması ekler.'),
         ('Kaç kişi oynayabilir?', 'Arkadaş odaları 2–6 kişilik. Boş koltuklara bot da ekleyebilirsin.'),
         ('Telefondan oynanabilir mi?', 'Evet. Oyun, bilgisayarlar kadar telefonlar için de tasarlandı; telefondaki ve bilgisayardaki oyuncular aynı masada oynayabilir.')],
       cta='Oda kur, linki gönder'),
  dict(lang='en', path='monopoly-alternative-online', topic='monopoly',
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
  dict(lang='tr', path='tr/monopoly-benzeri-online-oyun', topic='monopoly',
       title='Monopoly Benzeri Online Oyun: Hesap Kimde? | Check Flip',
       desc='Monopoly benzeri ama asıl soru başka: Akşam yemeğinin hesabı kimde kalacak? Zar, mekânlar, kartlar ve pazarlıkla arkadaşlarınla oynanan ücretsiz online oyun.',
       h1='Ücretsiz oynanan Monopoly benzeri online kutu oyunu',
       lead='Tahtada zar atıp ilerlemeyi, mekân satın almayı ve pazarlık yapmayı seviyorsan Check Flip sana tanıdık gelecek. Mülk oyunlarını eğlenceli kılan unsurları koruyor ve bunlara yeni bir boyut ekliyor: her akşam birisi bütün masanın yemek hesabını ödüyor.',
       sections=[
         ('Tanıdık gelecek özellikler', 'ul', [
           'İki zar at, 40 karelik tahtada ilerle.',
           'Restoran satın al; başkaları restoranına geldiğinde sana ücret öder. Restoranını yükseltebilirsin.',
           'Şans ve Olay kartları, gelir kareleri ve faturalar.',
           'Pazarlık: restoranı sahibinden satın al ya da hesabı devretmek için birine para teklif et.']),
         ('Farkları neler?', 'ul', [
           '<b>Ev yerine açlık</b>: her gün herkesin açlığı artar. Gün sonunda sıradaki oyuncu masadaki herkes için (kendisi dahil) <i>açlık × çarpan × 5</i> öder.',
           '<b>Bu akşamın restoranı</b>: her sabah akşam yemeğinin yeneceği restoran çekilir ve sahibi hesaptan komisyon alır; doğru zamanda doğru mekâna sahip olmak önemlidir.',
           '<b>Oyun uzayıp gitmez</b>: Hızlı mod 10 gün, yani yaklaşık 15 dakika sürer.',
           '<b>Tarayıcı için yapıldı</b>: 2–6 oyuncu telefondan ya da bilgisayardan linkle katılır; indirme ve üyelik yok.']),
         ('Nasıl oynanır?', 'ul', [
           'Arkadaşlarla özel odada (kodu ya da linki gönder).',
           'Hızlı oyun: başka oyuncularla açık bir masaya otur.',
           'Botlara karşı (kolaydan zora) ya da tek cihazda sırayla.'])],
       faq=[
         ('Check Flip resmi bir Monopoly oyunu mu?', 'Hayır. Check Flip özgün ve bağımsız bir oyundur. Monopoly, Hasbro’nun tescilli markasıdır ve Check Flip ile bir bağlantısı yoktur.'),
         ('Ücretsiz mi?', 'Evet, tamamen ücretsizdir; parayla avantaj satın alınamaz.'),
         ('Bir oyun ne kadar sürer?', 'Hızlı oyun yaklaşık 15 dakika sürer; Klasik oyun, hesabı ödeyebilen tek kişi kalana kadar devam eder.')],
       cta='Hemen oyna'),
  # ---- Spanish ----
  dict(lang='es', path='es/juego-de-mesa-online-con-amigos', topic='friends',
       title='Juego de mesa online con amigos: gratis y sin descargas | Check Flip',
       desc='Juego de mesa online gratis para jugar con amigos en el navegador: comparte el código de sala, de 2 a 6 jugadores, en teléfono o PC, sin descargas ni registro.',
       h1='Un juego de mesa online gratis para jugar con amigos',
       lead='Check Flip es un juego de mesa para 2 a 6 personas que se juega en el navegador: alguien crea una sala, manda el código o el enlace y los demás entran desde el teléfono o el PC. Sin descargas y sin registro.',
       sections=[
         ('Empieza a jugar en un minuto', 'ol', [
           'Abre <a href="/">checkflipgame.com</a> y toca <b>Con amigos</b> → <b>Crear una sala privada</b>.',
           'Comparte el código de sala de 5 caracteres o el enlace de invitación por WhatsApp, Discord o donde quieras.',
           'Tus amigos abren el enlace y eligen un apodo y un avatar. Cuando están todos, el anfitrión pulsa <b>Empezar partida</b>.']),
         ('Por qué funciona tan bien en grupo', 'ul', [
           '<b>Puede entrar cualquiera</b>: funciona en cualquier navegador actual, en Android, iPhone, Windows o Mac.',
           '<b>Partidas cortas y con mucho pique</b>: una partida en modo Rápido dura unos 15 minutos y cada noche alguien tiene que pagar la cena de toda la mesa, así que siempre hay algo que discutir.',
           '<b>Tratos y faroles</b>: quien paga puede ofrecer dinero para pasarle la cuenta a otro, los restaurantes se pueden comprar a sus dueños y cartas como Apretarse el Cinturón o Cupón de descuento cambian la cuenta.',
           '<b>Ideal con llamada de voz</b>: los turnos son claros y rápidos, perfecto para jugar mientras estás en Discord o en una videollamada.',
           '<b>Justo si alguien se desconecta</b>: un bot juega los turnos del jugador que pierde la conexión hasta que vuelve.']),
         ('Modos de juego', 'ul', [
           '<b>Clásico</b>: gana el último que queda en la mesa.',
           '<b>Rápido</b>: 10 días; gana el jugador más rico.',
           '<b>2 contra 2</b>: equipos de dos; si no puedes pagar, tu compañero cubre la diferencia.',
           '¿Ningún amigo conectado ahora? Juega contra bots (fácil, normal o difícil) o siéntate en una mesa pública con <b>Partida rápida</b>.'])],
       faq=[
         ('¿Es gratis?', 'Sí. Check Flip es totalmente gratis y no vende ventajas para ganar.'),
         ('¿Mis amigos necesitan una cuenta?', 'No. Cualquiera puede entrar en una sala solo con un apodo. Una cuenta gratis añade XP, niveles, objetos cosméticos, amigos y la clasificación de la temporada mensual.'),
         ('¿Cuántas personas pueden jugar?', 'Las salas con amigos admiten de 2 a 6 jugadores, y puedes añadir bots para llenar los asientos vacíos.'),
         ('¿Se puede jugar en el teléfono?', 'Sí. El juego está pensado tanto para el teléfono como para el PC, y en la misma mesa pueden jugar personas desde ambos.')],
       cta='Crea una sala y manda el enlace'),
  dict(lang='es', path='es/juego-tipo-monopoly-online', topic='monopoly',
       title='Juego tipo Monopoly online gratis con amigos | Check Flip',
       desc='¿Buscas un juego tipo Monopoly para jugar online con amigos? Check Flip es gratis en el navegador: dados, restaurantes, cartas, tratos y una cuenta que pagar.',
       h1='Un juego tipo Monopoly para jugar online gratis',
       lead='Si te gusta tirar los dados, recorrer un tablero, comprar propiedades y negociar, Check Flip te va a resultar familiar. Conserva lo que hace divertidos a los juegos de propiedades y le añade un giro: cada noche, alguien paga la cena de toda la mesa.',
       sections=[
         ('Lo que te va a sonar', 'ul', [
           'Tira dos dados y avanza por un tablero de 40 casillas.',
           'Compra restaurantes: los demás te pagan una tarifa cuando caen en ellos, y puedes mejorarlos.',
           'Cartas de Suerte y de Evento, casillas de cobro y facturas.',
           'Negociación: compra un restaurante a su dueño o paga a alguien para que se quede con la cuenta.']),
         ('Lo que cambia', 'ul', [
           '<b>Hambre en lugar de casas</b>: cada día todos tienen más hambre. Al final del día, el siguiente jugador del turno paga <i>hambre × multiplicador × 5</i> por cada uno de la mesa, él incluido.',
           '<b>El restaurante de esta noche</b>: cada mañana se sortea dónde será la cena, y el dueño de ese restaurante se lleva una comisión de la cuenta. Tener el sitio adecuado en el momento justo marca la diferencia.',
           '<b>Partidas con final a la vista</b>: el modo Rápido dura 10 días (unos 15 minutos), así que nunca se alarga durante horas.',
           '<b>Hecho para el navegador</b>: de 2 a 6 jugadores entran con un enlace desde el teléfono o el PC, sin descargas ni registro.']),
         ('Formas de jugar', 'ul', [
           'Con amigos en una sala privada (comparte el código o el enlace).',
           'Partida rápida: siéntate en una mesa pública con otros jugadores.',
           'Contra bots, de fácil a difícil, o pasando el teléfono de mano en mano en un solo dispositivo.'])],
       faq=[
         ('¿Check Flip es un juego oficial de Monopoly?', 'No. Check Flip es un juego original e independiente. Monopoly es una marca registrada de Hasbro, que no tiene ninguna relación con Check Flip.'),
         ('¿Es gratis?', 'Sí, totalmente gratis y sin ventajas de pago.'),
         ('¿Cuánto dura una partida?', 'Una partida en modo Rápido dura unos 15 minutos; en el Clásico se juega hasta que solo queda un jugador capaz de pagar.')],
       cta='Jugar ahora'),
  # ---- Portuguese (Brazil) ----
  dict(lang='pt', path='pt/jogo-de-tabuleiro-online-com-amigos', topic='friends',
       title='Jogo de tabuleiro online com amigos – grátis, sem download | Check Flip',
       desc='Jogue grátis um jogo de tabuleiro online com amigos no navegador: mande o código da sala, de 2 a 6 jogadores, no celular ou no PC, sem download nem cadastro.',
       h1='Um jogo de tabuleiro online grátis para jogar com os amigos',
       lead='Check Flip é um jogo de tabuleiro para 2 a 6 pessoas que roda no navegador: alguém cria uma sala, manda o código ou o link e a galera entra pelo celular ou pelo computador. Sem download e sem cadastro.',
       sections=[
         ('Comece a jogar em um minuto', 'ol', [
           'Abra <a href="/">checkflipgame.com</a> e toque em <b>Com amigos</b> → <b>Criar sala privada</b>.',
           'Mande o código da sala, de 5 caracteres, ou o link de convite pelo WhatsApp, Discord ou onde preferir.',
           'Seus amigos abrem o link e escolhem um apelido e um avatar. Quem criou a sala toca em <b>Começar</b>.']),
         ('Por que funciona tão bem em grupo', 'ul', [
           '<b>Todo mundo consegue entrar</b>: funciona em qualquer navegador atual, no Android, iPhone, Windows ou Mac.',
           '<b>Rápido e cheio de treta</b>: uma partida no modo Rápido dura uns 15 minutos e toda noite alguém tem que pagar o jantar da mesa inteira, então sempre tem o que discutir.',
           '<b>Acordos e blefes</b>: quem vai pagar pode oferecer dinheiro para passar a conta adiante, restaurantes podem ser comprados dos donos e cartas como Apertar o Cinto ou Cupom de desconto mudam a conta.',
           '<b>Combina com chamada de voz</b>: os turnos são claros e rápidos, ótimo para jogar com a galera no Discord ou numa chamada de vídeo.',
           '<b>Justo quando alguém cai</b>: se um jogador perde a conexão, um bot joga por ele até ele voltar.']),
         ('Modos de jogo', 'ul', [
           '<b>Clássico</b>: vence o último que sobrar na mesa.',
           '<b>Rápido</b>: 10 dias; vence o jogador mais rico.',
           '<b>2 contra 2</b>: duplas; se você não consegue pagar, seu parceiro cobre a diferença.',
           'Nenhum amigo online agora? Jogue contra bots (fácil, normal ou difícil) ou sente numa mesa pública com o <b>Jogo rápido</b>.'])],
       faq=[
         ('É grátis?', 'Sim. Check Flip é totalmente grátis e não vende vantagens para ganhar.'),
         ('Meus amigos precisam criar conta?', 'Não. Qualquer pessoa entra numa sala só com um apelido. Uma conta grátis adiciona XP, níveis, itens visuais, lista de amigos e o ranking mensal da temporada.'),
         ('Quantas pessoas podem jogar?', 'As salas com amigos aceitam de 2 a 6 jogadores, e dá para colocar bots nos lugares vazios.'),
         ('Dá para jogar no celular?', 'Sim. O jogo foi feito tanto para celular quanto para computador, e quem está no celular joga na mesma mesa de quem está no PC.')],
       cta='Crie uma sala e mande o link'),
  dict(lang='pt', path='pt/jogo-parecido-com-banco-imobiliario-online', topic='monopoly',
       title='Jogo parecido com Banco Imobiliário online e grátis | Check Flip',
       desc='Procura um jogo parecido com Banco Imobiliário (Monopoly) para jogar online com amigos? Check Flip é grátis no navegador: dados, restaurantes, cartas e acordos.',
       h1='Um jogo parecido com Banco Imobiliário para jogar online de graça',
       lead='Se você gosta de rolar os dados, dar voltas no tabuleiro, comprar propriedades e negociar, Check Flip vai parecer familiar. Ele mantém o que deixa os jogos de propriedades divertidos e acrescenta uma reviravolta: toda noite alguém paga o jantar da mesa inteira.',
       sections=[
         ('O que vai parecer familiar', 'ul', [
           'Role dois dados e ande por um tabuleiro de 40 casas.',
           'Compre restaurantes: os outros pagam uma taxa quando caem neles, e você pode melhorá-los.',
           'Cartas de Sorte e de Evento, casas de receita e contas a pagar.',
           'Negociação: compre um restaurante do dono ou pague alguém para ficar com a conta.']),
         ('O que muda', 'ul', [
           '<b>Fome no lugar de casas e hotéis</b>: todo dia a fome de todos aumenta. No fim do dia, o próximo jogador da vez paga <i>fome × multiplicador × 5</i> por cada um na mesa, ele incluído.',
           '<b>O restaurante da noite</b>: toda manhã é sorteado onde vai ser o jantar, e o dono desse restaurante leva uma comissão da conta. Ter o lugar certo na hora certa faz diferença.',
           '<b>Partidas com hora para acabar</b>: o modo Rápido tem 10 dias (uns 15 minutos), então nada de partida que se arrasta por horas.',
           '<b>Feito para o navegador</b>: de 2 a 6 jogadores entram com um link pelo celular ou computador, sem download nem cadastro.']),
         ('Jeitos de jogar', 'ul', [
           'Com amigos numa sala privada (mande o código ou o link).',
           'Jogo rápido: sente numa mesa pública com outros jogadores.',
           'Contra bots, do fácil ao difícil, ou passando o celular de mão em mão num só aparelho.'])],
       faq=[
         ('Check Flip é um jogo oficial de Banco Imobiliário ou Monopoly?', 'Não. Check Flip é um jogo original e independente. Banco Imobiliário é marca da Estrela e Monopoly é marca da Hasbro; nenhuma das duas tem relação com Check Flip.'),
         ('É grátis?', 'Sim, totalmente grátis e sem vantagens pagas.'),
         ('Quanto tempo dura uma partida?', 'Uma partida no modo Rápido dura uns 15 minutos; no Clássico, o jogo segue até sobrar só um jogador capaz de pagar.')],
       cta='Jogar agora'),
  # ---- French ----
  dict(lang='fr', path='fr/jeu-de-societe-en-ligne-entre-amis', topic='friends',
       title='Jeu de société en ligne entre amis, gratuit | Check Flip',
       desc='Un jeu de société gratuit à jouer en ligne entre amis dans le navigateur : envoie le code du salon, de 2 à 6 joueurs, sur téléphone ou PC, sans inscription.',
       h1='Un jeu de société gratuit à jouer en ligne entre amis',
       lead='Check Flip est un jeu de plateau pour 2 à 6 joueurs qui se joue dans le navigateur : quelqu’un crée un salon, envoie le code ou le lien, et tout le monde rejoint depuis son téléphone ou son ordinateur. Pas de téléchargement, pas d’inscription.',
       sections=[
         ('Lancer une partie entre amis en une minute', 'ol', [
           'Ouvre <a href="/">checkflipgame.com</a> et touche <b>Entre amis</b> → <b>Créer un salon privé</b>.',
           'Envoie le code du salon (5 caractères) ou le lien d’invitation sur WhatsApp, Discord ou ailleurs.',
           'Tes amis ouvrent le lien, choisissent un pseudo et un avatar. L’hôte appuie sur <b>Lancer la partie</b>.']),
         ('Pourquoi ça marche si bien en groupe', 'ul', [
           '<b>Tout le monde peut jouer</b> : ça tourne dans n’importe quel navigateur récent, sur Android, iPhone, Windows ou Mac.',
           '<b>Court et animé</b> : une partie en mode Rapide dure environ 15 minutes, et chaque soir quelqu’un doit régler l’addition de toute la table, alors il y a toujours de quoi se chamailler.',
           '<b>Marchés et bluff</b> : celui qui paie peut proposer de l’argent pour refiler l’addition, les restaurants s’achètent à leur propriétaire et des cartes comme Serrer la ceinture ou Bon de réduction changent la note.',
           '<b>Parfait en appel vocal</b> : les tours sont clairs et rapides, idéal pendant un appel Discord ou une visio.',
           '<b>Équitable si quelqu’un décroche</b> : un bot joue à la place d’un joueur déconnecté jusqu’à son retour.']),
         ('Modes de jeu', 'ul', [
           '<b>Classique</b> : le dernier joueur à table gagne.',
           '<b>Rapide</b> : 10 jours, le plus riche gagne.',
           '<b>2 contre 2</b> : équipes de deux ; si tu ne peux pas payer, ton coéquipier couvre la différence.',
           'Pas d’amis connectés ? Affronte des bots (facile, normal ou difficile) ou rejoins une table publique avec <b>Partie rapide</b>.'])],
       faq=[
         ('C’est gratuit ?', 'Oui. Check Flip est entièrement gratuit et ne vend aucun avantage pour gagner.'),
         ('Mes amis doivent-ils créer un compte ?', 'Non. Un pseudo suffit pour rejoindre un salon. Un compte gratuit ajoute l’XP, les niveaux, les cosmétiques, la liste d’amis et le classement de la saison mensuelle.'),
         ('Combien de joueurs peuvent jouer ?', 'Les salons entre amis accueillent de 2 à 6 joueurs, et tu peux ajouter des bots pour remplir les places libres.'),
         ('Peut-on jouer sur téléphone ?', 'Oui. Le jeu est pensé autant pour le téléphone que pour l’ordinateur, et les deux peuvent partager la même table.')],
       cta='Crée un salon et envoie le lien'),
  dict(lang='fr', path='fr/jeu-type-monopoly-en-ligne', topic='monopoly',
       title='Jeu type Monopoly en ligne, gratuit et entre amis | Check Flip',
       desc='Envie d’un jeu façon Monopoly à jouer en ligne entre amis ? Check Flip est gratuit dans le navigateur : dés, restaurants, cartes, marchés et une addition à payer.',
       h1='Un jeu façon Monopoly à jouer gratuitement en ligne',
       lead='Si tu aimes lancer les dés, faire le tour du plateau, acheter des propriétés et négocier, Check Flip va te sembler familier. Il garde ce qui rend les jeux de propriétés amusants et y ajoute une idée bien à lui : chaque soir, quelqu’un paie l’addition de toute la table.',
       sections=[
         ('Ce qui te sera familier', 'ul', [
           'Lance deux dés et avance sur un plateau de 40 cases.',
           'Achète des restaurants : les autres te paient un droit de passage quand ils s’y arrêtent, et tu peux les améliorer.',
           'Cartes Chance et Événement, cases de revenus et factures.',
           'Négociation : rachète un restaurant à son propriétaire ou paie quelqu’un pour qu’il prenne l’addition.']),
         ('Ce qui change', 'ul', [
           '<b>La faim plutôt que les maisons</b> : chaque jour, tout le monde a un peu plus faim. En fin de journée, le joueur suivant dans l’ordre paie <i>faim × multiplicateur × 5</i> pour chaque convive, lui compris.',
           '<b>Le restaurant du soir</b> : chaque matin, on tire au sort le restaurant du dîner, et son propriétaire touche une commission sur l’addition. Posséder le bon endroit au bon moment, ça compte.',
           '<b>Des parties qui ne s’éternisent pas</b> : le mode Rapide dure 10 jours (environ 15 minutes), loin des parties interminables.',
           '<b>Pensé pour le navigateur</b> : de 2 à 6 joueurs rejoignent avec un lien, sur téléphone ou ordinateur, sans téléchargement ni inscription.']),
         ('Comment jouer', 'ul', [
           'Entre amis, dans un salon privé (envoie le code ou le lien).',
           'Partie rapide : installe-toi à une table publique avec d’autres joueurs.',
           'Contre des bots, de facile à difficile, ou chacun son tour sur un seul appareil.'])],
       faq=[
         ('Check Flip est-il un jeu Monopoly officiel ?', 'Non. Check Flip est un jeu original et indépendant. Monopoly est une marque déposée de Hasbro, qui n’a aucun lien avec Check Flip.'),
         ('C’est gratuit ?', 'Oui, entièrement gratuit, sans avantages payants.'),
         ('Combien de temps dure une partie ?', 'Une partie en mode Rapide dure environ 15 minutes ; une partie Classique continue jusqu’à ce qu’il ne reste qu’un joueur capable de payer.')],
       cta='Jouer maintenant'),
  # ---- German ----
  dict(lang='de', path='de/online-brettspiel-mit-freunden', topic='friends',
       title='Online-Brettspiel mit Freunden – kostenlos, ohne Download | Check Flip',
       desc='Kostenloses Online-Brettspiel für dich und deine Freunde im Browser: Raumcode schicken, 2–6 Spieler, auf Handy oder PC, ohne Download und ohne Anmeldung.',
       h1='Ein kostenloses Online-Brettspiel für dich und deine Freunde',
       lead='Check Flip ist ein Brettspiel für 2 bis 6 Leute, das im Browser läuft: Einer erstellt einen Raum, schickt den Code oder Link, und alle steigen per Handy oder Computer ein. Kein Download, keine Anmeldung.',
       sections=[
         ('In einer Minute mit Freunden spielen', 'ol', [
           'Öffne <a href="/">checkflipgame.com</a> und tippe auf <b>Mit Freunden</b> → <b>Privaten Raum erstellen</b>.',
           'Schick den 5-stelligen Raumcode oder den Einladungslink per WhatsApp, Discord oder wo auch immer.',
           'Deine Freunde öffnen den Link und wählen Spitznamen und Avatar. Der Gastgeber tippt auf <b>Spiel starten</b>.']),
         ('Warum es in der Gruppe so gut funktioniert', 'ul', [
           '<b>Jeder kann mitmachen</b>: läuft in jedem aktuellen Browser, auf Android, iPhone, Windows oder Mac.',
           '<b>Kurz und turbulent</b>: Eine Partie im Modus Schnell dauert etwa 15 Minuten, und jeden Abend muss einer die Rechnung für den ganzen Tisch zahlen – Diskussionsstoff gibt es also immer.',
           '<b>Deals und Bluffs</b>: Wer zahlen muss, kann Geld bieten, um die Rechnung weiterzuschieben, Restaurants lassen sich ihren Besitzern abkaufen, und Karten wie Gürtel enger oder Rabattgutschein verändern die Rechnung.',
           '<b>Passt zum Voice-Chat</b>: Die Züge sind klar und schnell, ideal neben einem Discord- oder Videocall.',
           '<b>Fair, wenn jemand rausfliegt</b>: Verliert ein Spieler die Verbindung, spielt ein Bot für ihn weiter, bis er zurück ist.']),
         ('Spielmodi', 'ul', [
           '<b>Klassisch</b>: Wer zuletzt noch am Tisch sitzt, gewinnt.',
           '<b>Schnell</b>: 10 Tage, der Reichste gewinnt.',
           '<b>2 gegen 2</b>: Zweierteams; kannst du nicht zahlen, übernimmt dein Teampartner den Rest.',
           'Gerade keine Freunde online? Spiel gegen Bots (leicht, normal oder schwer) oder setz dich mit <b>Schnelles Spiel</b> an einen öffentlichen Tisch.'])],
       faq=[
         ('Ist das Spiel kostenlos?', 'Ja. Check Flip ist komplett kostenlos und verkauft keine Vorteile zum Gewinnen.'),
         ('Brauchen meine Freunde ein Konto?', 'Nein. Zum Beitreten reicht ein Spitzname. Ein kostenloses Konto bringt XP, Level, kosmetische Extras, eine Freundesliste und die monatliche Saison-Rangliste.'),
         ('Wie viele können mitspielen?', 'In Räumen mit Freunden spielen 2 bis 6 Personen; freie Plätze kannst du mit Bots auffüllen.'),
         ('Kann man auf dem Handy spielen?', 'Ja. Das Spiel ist fürs Handy genauso gemacht wie für den Computer, und Handy- und PC-Spieler können am selben Tisch sitzen.')],
       cta='Raum erstellen und Link schicken'),
  dict(lang='de', path='de/spiel-wie-monopoly-online', topic='monopoly',
       title='Spiel wie Monopoly online – kostenlos mit Freunden | Check Flip',
       desc='Ein Spiel wie Monopoly, online mit Freunden und kostenlos im Browser: Würfel, Restaurants, Karten, Deals – und eine Rechnung, die am Ende einer zahlen muss.',
       h1='Ein Spiel wie Monopoly, kostenlos online spielen',
       lead='Wenn du gern würfelst, über ein Spielbrett ziehst, Grundstücke kaufst und verhandelst, kommt dir Check Flip bekannt vor. Es behält, was Immobilienspiele so unterhaltsam macht, und bringt eine eigene Idee mit: Jeden Abend zahlt einer das Essen für den ganzen Tisch.',
       sections=[
         ('Was dir bekannt vorkommt', 'ul', [
           'Mit zwei Würfeln über ein Brett mit 40 Feldern ziehen.',
           'Restaurants kaufen: Wer darauf landet, zahlt dir eine Gebühr, und du kannst sie ausbauen.',
           'Glücks- und Ereigniskarten, Einkommensfelder und Rechnungen.',
           'Verhandeln: Kauf einem Besitzer sein Restaurant ab oder bezahl jemanden dafür, dass er die Rechnung übernimmt.']),
         ('Was anders ist', 'ul', [
           '<b>Hunger statt Häuser</b>: Jeden Tag werden alle hungriger. Am Tagesende zahlt der nächste Spieler in der Reihe <i>Hunger × Multiplikator × 5</i> für jeden am Tisch, sich selbst eingeschlossen.',
           '<b>Das Restaurant des Abends</b>: Jeden Morgen wird ausgelost, wo gegessen wird, und der Besitzer bekommt Provision von der Rechnung. Zur richtigen Zeit das richtige Lokal zu besitzen, zahlt sich aus.',
           '<b>Partien mit absehbarem Ende</b>: Der Modus Schnell dauert 10 Tage (etwa 15 Minuten) – keine Partien, die sich über Stunden ziehen.',
           '<b>Für den Browser gemacht</b>: 2 bis 6 Spieler steigen per Link über Handy oder Computer ein, ohne Download und ohne Anmeldung.']),
         ('So kannst du spielen', 'ul', [
           'Mit Freunden in einem privaten Raum (Code oder Link schicken).',
           'Schnelles Spiel: Setz dich mit anderen Spielern an einen öffentlichen Tisch.',
           'Gegen Bots von leicht bis schwer oder abwechselnd an einem Gerät.'])],
       faq=[
         ('Ist Check Flip ein offizielles Monopoly-Spiel?', 'Nein. Check Flip ist ein eigenständiges, unabhängiges Spiel. Monopoly ist eine Marke von Hasbro, die in keiner Verbindung zu Check Flip steht.'),
         ('Ist es kostenlos?', 'Ja, komplett kostenlos und ohne bezahlte Vorteile.'),
         ('Wie lange dauert eine Partie?', 'Eine Partie im Modus Schnell dauert etwa 15 Minuten; eine klassische Partie läuft, bis nur noch ein Spieler zahlen kann.')],
       cta='Jetzt spielen'),
]
UI = {'en': dict(back='← Back to the game', faq='Questions', more='More', home='/', privacy='Privacy', locale='en_US', html='en'),
      'tr': dict(back='← Oyuna dön', faq='Sık sorulan sorular', more='Diğer sayfalar', home='/tr', privacy='Gizlilik', locale='tr_TR', html='tr'),
      'es': dict(back='← Volver al juego', faq='Preguntas frecuentes', more='Más', home='/', privacy='Privacidad', locale='es_ES', html='es'),
      'pt': dict(back='← Voltar ao jogo', faq='Perguntas frequentes', more='Mais', home='/', privacy='Privacidade', locale='pt_BR', html='pt-BR'),
      'fr': dict(back='← Retour au jeu', faq='Questions fréquentes', more='Plus', home='/', privacy='Confidentialité', locale='fr_FR', html='fr'),
      'de': dict(back='← Zurück zum Spiel', faq='Häufige Fragen', more='Mehr', home='/', privacy='Datenschutz', locale='de_DE', html='de')}
LANGS = ['en', 'tr', 'es', 'pt', 'fr', 'de']
LANG_NAMES = {'en': 'English', 'tr': 'Türkçe', 'es': 'Español', 'pt': 'Português', 'fr': 'Français', 'de': 'Deutsch'}

here = os.path.dirname(os.path.abspath(__file__)); pub = os.path.join(here, '..', '..', 'public')

def home_videogame():
    """The VideoGame JSON-LD block from the home page (public/index.html), reused as is."""
    src = open(os.path.join(pub, 'index.html'), encoding='utf-8').read()
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S):
        data = json.loads(block)
        if isinstance(data, dict) and data.get('@type') == 'VideoGame': return data
    raise SystemExit('VideoGame JSON-LD not found in public/index.html')
VIDEOGAME = home_videogame()

def versions(p):
    """All language versions of this page's topic, in LANGS order: [(lang, absolute url, path)]."""
    vs = {o['lang']: o for o in PAGES if o['topic'] == p['topic']}
    return [(l, f"{SITE}/{vs[l]['path']}", vs[l]['path']) for l in LANGS if l in vs]

def page(p):
    L = UI[p['lang']]; url = f"{SITE}/{p['path']}"; vs = versions(p)
    x_default = next(u for l, u, _ in vs if l == 'en')
    alternates = ''.join(f'<link rel="alternate" hreflang="{l}" href="{u}">\n' for l, u, _ in vs) + f'<link rel="alternate" hreflang="x-default" href="{x_default}">'
    langnav = ''.join(f'<a href="/{path}" hreflang="{l}" lang="{UI[l]["html"]}">{LANG_NAMES[l]}</a>' for l, _, path in vs if l != p['lang'])
    ld = [VIDEOGAME,
          {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
             {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p['faq']]},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "Check Flip", "item": SITE + L['home']},
             {"@type": "ListItem", "position": 2, "name": p['h1'], "item": url}]}]
    secs = ''.join(f"<h2>{html.escape(h)}</h2><{tag}>{''.join(f'<li>{i}</li>' for i in items)}</{tag}>" for h, tag, items in p['sections'])
    faq = ''.join(f"<h3>{html.escape(q)}</h3><p>{html.escape(a)}</p>" for q, a in p['faq'])
    others = [o for o in PAGES if o['lang'] == p['lang'] and o['path'] != p['path']]
    more = ''.join(f'<li><a href="/{o["path"]}">{html.escape(o["h1"])}</a></li>' for o in others)
    return f"""<!doctype html>
<html lang="{L['html']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{html.escape(p['title'])}</title>
<meta name="description" content="{html.escape(p['desc'])}">
<link rel="canonical" href="{url}">
{alternates}
<meta property="og:type" content="article">
<meta property="og:locale" content="{L['locale']}">
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
    <nav class="langnav"><a href="{L['home']}">{L['back']}</a>{langnav}</nav>
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

for p in PAGES:
    out = os.path.join(pub, p['path'] + '.html'); os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(page(p))
    print('wrote', os.path.relpath(out, pub))
