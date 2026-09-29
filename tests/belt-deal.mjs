// Tighten the Belt + deal: the belt user still skips dinner when the check is passed on (node tests/belt-deal.mjs)
import * as E from '../public/js/engine.js';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const S = E.newState(); ['a', 'b', 'c'].forEach(id => E.addPlayer(S, id, id.toUpperCase()));
E.startGame(S);
// jump to a feast with A paying
S.ph = 'play'; S.pl.forEach(q => { q.h = 4; q.x = 1; q.m = 200; }); S.ti = S.tq.indexOf(0); E.feast(S);
S.fe.w = 0; S.pl[0].c = ['K'];
const full = E.bill(S).tot;
ok(E.act(S, 'a', {t: 'use', c: 'K'}), 'A uses the belt');
const afterBelt = E.bill(S).tot; ok(afterBelt === full - 20, 'belt removes A from the bill (' + full + ' -> ' + afterBelt + ')');
ok(E.act(S, 'a', {t: 'deal', to: 1, amt: 10}), 'A can still offer a deal after the belt');
ok(E.bill(S, 1).tot === afterBelt, 'B would pay the same bill, A still not eating');
ok(E.act(S, 'b', {t: 'dealr', ok: 1}), 'B accepts');
ok(S.fe.w === 1 && E.bill(S).tot === afterBelt, 'B pays, A still not eating');
const mb = S.pl[1].m; ok(E.act(S, 'b', {t: 'pay'}), 'B pays');
ok(S.pl[1].m === mb - afterBelt, 'B paid ' + afterBelt);
ok(S.pl[0].h > S.pl[1].h && S.pl[1].h === S.pl[2].h, 'A kept hunger (belt), others reset');
ok(S.pl[0].st.mx >= 200 && S.pl[1].st.mx >= 200, 'peak money tracked');
