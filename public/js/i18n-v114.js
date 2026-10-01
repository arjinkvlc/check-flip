/** Check Flip — texts added in v1.14 (English / Türkçe; the other languages are in js/lang/*.js). */
import {extendStrings} from './i18n.js';
extendStrings({
  en: {
    admOnline: 'At tables now',
    admOnlineNote: '“At tables now” is the real number of people connected to a table (the home screen shows it only from 5).'
  },
  tr: {
    admOnline: 'Şu an masalarda',
    admOnlineNote: '“Şu an masalarda”, bir masaya bağlı olan kişilerin gerçek sayısıdır (ana ekranda yalnızca 5 ve üstünde görünür).'
  }
});
