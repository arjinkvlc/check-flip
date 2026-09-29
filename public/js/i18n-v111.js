/** Check Flip — texts added in v1.11 (English / Türkçe; the other languages are in js/lang/*.js). */
import {extendStrings} from './i18n.js';
extendStrings({
  en: {bubblePreview: 'Your treat! 😋', adminBadge: 'Admin', adminBadgeT: 'Check Flip team', frLoadErr: c => `Couldn't load your friends (${c}).`, frRetry: 'Try again'},
  tr: {bubblePreview: 'Hesap sende! 😋', adminBadge: 'Yönetici', adminBadgeT: 'Check Flip ekibi', frLoadErr: c => `Arkadaş listen yüklenemedi (${c}).`, frRetry: 'Tekrar dene'}
});
