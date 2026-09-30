/** Check Flip — texts added in v1.12 (English / Türkçe; the other languages are in js/lang/*.js). */
import {extendStrings} from './i18n.js';
extendStrings({
  en: {
    pubSearching: 'Looking for players…',
    ePubOnly: 'This is a Quick play table: it can only be joined with Quick play, not with a code or a link.',
    kbdHint: '<kbd>Space</kbd> roll / continue · <kbd>1</kbd>–<kbd>9</kbd> choose · <kbd>C</kbd> chat',
    kbdHelp: 'Keyboard: <kbd>Space</kbd> roll, continue or the main button · <kbd>1</kbd>–<kbd>9</kbd> pick a choice · <kbd>C</kbd> chat · <kbd>Esc</kbd> leave the chat box'
  },
  tr: {
    pubSearching: 'Oyuncular aranıyor…',
    ePubOnly: 'Bu bir Hızlı oyun masası: kodla ya da bağlantıyla değil, yalnızca Hızlı oyun ile katılınabilir.',
    kbdHint: '<kbd>Boşluk</kbd> zar at / devam · <kbd>1</kbd>–<kbd>9</kbd> seç · <kbd>C</kbd> sohbet',
    kbdHelp: 'Klavye: <kbd>Boşluk</kbd> zar at, devam et ya da ana düğme · <kbd>1</kbd>–<kbd>9</kbd> seçenek seç · <kbd>C</kbd> sohbet · <kbd>Esc</kbd> sohbet kutusundan çık'
  }
});
