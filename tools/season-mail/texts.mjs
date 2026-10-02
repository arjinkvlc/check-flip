/** Check Flip — the season e-mail in the six game languages. {n} = new season, {p} = finished season. */
const ORD_EN = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
export const MAIL = {
  en: {
    subject: n => `Season ${n} has started on Check Flip`,
    hi: u => `Hi ${u},`,
    over: p => `Season ${p} is over.`,
    place: (pl, w) => `You finished ${ORD_EN(pl)} with ${w} win${w === 1 ? '' : 's'}.`,
    medal: m => `You won the ${['', 'gold', 'silver', 'bronze'][m]} medal – it's on your profile now.`,
    start: n => `Season ${n} has just started and the leaderboard is empty again. Come and race for the top!`,
    cta: 'Play now',
    why: 'You get this e-mail because you turned on season e-mails in Check Flip.',
    unsub: 'Unsubscribe with one click'
  },
  tr: {
    subject: n => `Check Flip\u2019te Sezon ${n} başladı`,
    hi: u => `Merhaba ${u},`,
    over: p => `Sezon ${p} sona erdi.`,
    place: (pl, w) => `Sezonu ${pl}. sırada, ${w} galibiyetle tamamladın.`,
    medal: m => `${['', 'Altın', 'Gümüş', 'Bronz'][m]} madalya kazandın; artık profilinde duruyor.`,
    start: n => `Sezon ${n} az önce başladı ve sıralama yeniden sıfırlandı. Zirve için yarışa katıl!`,
    cta: 'Hemen oyna',
    why: 'Bu e-postayı, Check Flip’te sezon e-postalarını açtığın için alıyorsun.',
    unsub: 'Tek tıkla abonelikten çık'
  },
  es: {
    subject: n => `Empezó la temporada ${n} en Check Flip`,
    hi: u => `Hola, ${u}:`,
    over: p => `La temporada ${p} terminó.`,
    place: (pl, w) => `Terminaste en el puesto ${pl}.º con ${w} victoria${w === 1 ? '' : 's'}.`,
    medal: m => `Ganaste la medalla de ${['', 'oro', 'plata', 'bronce'][m]}: ya está en tu perfil.`,
    start: n => `La temporada ${n} acaba de empezar y la clasificación vuelve a estar vacía. ¡Ven a pelear por el primer puesto!`,
    cta: 'Jugar ahora',
    why: 'Recibes este correo porque activaste los correos de temporada en Check Flip.',
    unsub: 'Darte de baja con un clic'
  },
  pt: {
    subject: n => `A temporada ${n} começou no Check Flip`,
    hi: u => `Oi, ${u}!`,
    over: p => `A temporada ${p} terminou.`,
    place: (pl, w) => `Você terminou em ${pl}º lugar com ${w} vitória${w === 1 ? '' : 's'}.`,
    medal: m => `Você ganhou a medalha de ${['', 'ouro', 'prata', 'bronze'][m]} – ela já está no seu perfil.`,
    start: n => `A temporada ${n} acabou de começar e o ranking está zerado de novo. Venha disputar o topo!`,
    cta: 'Jogar agora',
    why: 'Você recebe este e-mail porque ativou os e-mails de temporada no Check Flip.',
    unsub: 'Cancelar com um clique'
  },
  fr: {
    subject: n => `La saison ${n} a commencé sur Check Flip`,
    hi: u => `Salut ${u},`,
    over: p => `La saison ${p} est terminée.`,
    place: (pl, w) => `Tu as fini ${pl === 1 ? '1er' : pl + 'e'} avec ${w} victoire${w > 1 ? 's' : ''}.`,
    medal: m => `Tu as gagné la médaille ${['', 'd’or', 'd’argent', 'de bronze'][m]} : elle est maintenant sur ton profil.`,
    start: n => `La saison ${n} vient de commencer et le classement repart de zéro. Viens viser la première place !`,
    cta: 'Jouer maintenant',
    why: 'Tu reçois cet e-mail parce que tu as activé les e-mails de saison dans Check Flip.',
    unsub: 'Se désabonner en un clic'
  },
  de: {
    subject: n => `Saison ${n} hat bei Check Flip begonnen`,
    hi: u => `Hallo ${u},`,
    over: p => `Saison ${p} ist vorbei.`,
    place: (pl, w) => `Du hast sie auf Platz ${pl} mit ${w} Sieg${w === 1 ? '' : 'en'} beendet.`,
    medal: m => `Du hast die ${['', 'Gold', 'Silber', 'Bronze'][m]}medaille gewonnen – sie ist jetzt in deinem Profil.`,
    start: n => `Saison ${n} hat gerade begonnen und die Rangliste ist wieder leer. Komm und kämpf um die Spitze!`,
    cta: 'Jetzt spielen',
    why: 'Du bekommst diese E-Mail, weil du in Check Flip die Saison-E-Mails eingeschaltet hast.',
    unsub: 'Mit einem Klick abmelden'
  }
};
