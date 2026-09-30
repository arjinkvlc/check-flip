/** Check Flip — texts added in v1.9 (leave question, money after paying, ranked games). */
import {extendStrings} from './i18n.js';
extendStrings({
  en: {
    leaveQ: 'Leave the game?',
    leaveQOnline: "The game goes on without you and a bot plays your turns.",
    leaveQLocal: 'This game will end and can’t be continued.',
    leaveYes: 'Leave', stay: 'Stay',
    afterPay: 'Left after paying', shortBy: m => `short by ${m}`,
    pRankedNote: 'Single-game feats (Tycoon, Full House, Lap Legend, Deep Pockets) count only in ranked games: Quick play tables with 3 or more players (bots that fill empty seats count too).'
  },
  tr: {
    leaveQ: 'Oyundan çıkılsın mı?',
    leaveQOnline: 'Oyun sensiz devam eder, sıran geldiğinde bot oynar.',
    leaveQLocal: 'Bu oyun biter ve devam ettirilemez.',
    leaveYes: 'Çık', stay: 'Kal',
    afterPay: 'Ödedikten sonra kalan', shortBy: m => `${m} eksik`,
    pRankedNote: 'Tek oyunluk başarımlar (Restoran Kralı, Tam Kadro, Tur Canavarı, Cebi Dolu) yalnızca dereceli oyunlarda sayılır: en az 3 oyunculu Hızlı oyun masaları (boş koltuğa oturan botlar da sayılır).'
  }
});
