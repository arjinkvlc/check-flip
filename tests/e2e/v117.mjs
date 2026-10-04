import {LAUNCH, SHOTS} from './lib.mjs';
// v1.17: Shortcut / Go back 1–4, public belt card, offers from ¤5, venue draw at day start, screens that
// don't rebuild by themselves, Halloween: background layer, Settings switch, event card, event quests, admin preview
import {chromium} from 'playwright';
import {handle, pool} from './mocksb.mjs';
import {newState, addPlayer, act, land, give, useCard, CFG, BOARD} from '../../public/js/engine.js';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const BASE = 'http://127.0.0.1:8787/';
const q1 = async (sql, a) => (await pool.query(sql, a)).rows[0];

// ---- engine
{
  const seen = {kisa: new Set(), geri: new Set()};
  for (let n = 0; n < 400; n++) for (const k of ['kisa', 'geri']) {
    const S = newState(); addPlayer(S, 'a', 'A'); addPlayer(S, 'b', 'B'); S.ord = [0, 1]; S.ph = 'play';
    const at = BOARD.indexOf(k); S.pl[0].p = at; S.fx = {open: 1, path: [], msgs: []};
    land(S, 0, 2); const m = S.log.find(l => l && l.k === (k === 'kisa' ? 'shortcut' : 'goBack'));
    seen[k].add(m && m.p ? m.p.k : m && m.k2);
  }
  const vals = s => [...s].filter(x => x != null).sort().join(',');
  ok(vals(seen.kisa) === '1,2,3,4' && vals(seen.geri) === '1,2,3,4', `Shortcut / Go back move 1–4: ${vals(seen.kisa)} / ${vals(seen.geri)}`);
  const S = newState(); addPlayer(S, 'a', 'A'); addPlayer(S, 'b', 'B');
  give(S, 0, 'K', 1); give(S, 0, 'K');
  ok(S.pl[0].kv === 1 && S.pl[0].c.length === 2, 'belt from the square is public, belt from the deck is not');
  S.ph = 'feast'; S.ord = [0, 1]; S.tq = [0, 1]; S.ti = 0; S.fe = {w: 0, ku: 0, ke: 0, al: 0, v: 7, dl: 0, off: null};
  useCard(S, 0, 'K'); ok(S.pl[0].kv === 0 && S.pl[0].c.length === 1, 'playing a belt uses the public one first');
  ok(CFG.OFFER_MIN === 5, 'offers start at ¤5');
}

await pool.query("delete from public.event_progress; delete from public.admins; delete from auth.users;");
const browser = await chromium.launch(LAUNCH);
async function page(o = {}) {
  const ctx = await browser.newContext({viewport: {width: o.w || 1300, height: o.h || 850}, colorScheme: o.dark ? 'dark' : 'light', reducedMotion: o.reduce ? 'reduce' : 'no-preference'});
  await ctx.addInitScript(([l, th]) => { try { localStorage.setItem('hs-lang', l); localStorage.setItem('cp-tips', '{"off":true}'); localStorage.setItem('cf-theme', th); } catch (e) {} }, [o.lang || 'tr', o.dark ? 'dark' : 'light']);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  if (o.at) await p.clock.setFixedTime(new Date(o.at));
  await p.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await p.goto(BASE + (o.q || '')); await p.waitForTimeout(1000); return p;
}
const HW = '2026-10-20T12:00:00Z', BEFORE = '2026-10-04T12:00:00Z';
const theme = p => p.evaluate(() => ({ev: document.body.dataset.event || null, bats: document.querySelectorAll('#evbg .bat').length, eyes: document.querySelectorAll('#evbg .eyes').length}));

// ---- Halloween look (dark and light), only in the background layer
const D = await page({at: HW, dark: true});
let th = await theme(D);
ok(th.ev === 'halloween' && th.bats === 5 && th.eyes === 6, 'Halloween background during the event: ' + JSON.stringify(th));
ok(await D.evaluate(() => getComputedStyle(document.querySelector('#evbg')).position === 'fixed' && !document.querySelector('#board #evbg, .center #evbg')), 'decorations live in a fixed layer, not on the board');
ok(await D.isVisible('.evcard.halloween') && (await D.textContent('.evcard summary')).includes('Cadılar Bayramı'), 'event card on the home screen for guests');
await D.click('.evcard summary'); await D.waitForTimeout(200);
ok((await D.textContent('.evcard')).includes('giriş yap') && (await D.textContent('.evcard')).includes('Balkabağı'), 'guest card: sign-in hint and rewards');
await D.screenshot({path: SHOTS + 'v117-halloween-dark.png'});
ok(await D.evaluate(() => import('/js/music.js').then(m => m.Music.flavorNow)) === 'halloween', 'music switches to the Halloween variation');
await D.click('#setBtn'); await D.waitForTimeout(200);
ok((await D.getAttribute('#seasonBtn', 'aria-checked')) === 'true', 'Settings: Seasonal themes switch is on by default');
await D.click('#seasonBtn'); await D.waitForTimeout(300);
th = await theme(D); ok(!th.ev && !(await D.$('#evbg')), 'switch off removes the decorations');
ok(await D.evaluate(() => import('/js/music.js').then(m => m.Music.flavorNow)) === null, 'and the music variation');
await D.keyboard.press('Escape'); await D.reload(); await D.waitForTimeout(900);
ok(!(await theme(D)).ev, 'switch is remembered');
ok(await D.isVisible('.evcard'), 'event quests stay available with the switch off');
const L = await page({at: HW});
await L.screenshot({path: SHOTS + 'v117-halloween-light.png'});
ok((await theme(L)).ev === 'halloween', 'light theme has it too');
const N = await page({at: BEFORE});
ok(!(await theme(N)).ev && !(await N.$('.evcard')), 'nothing before 15 October');
const M = await page({at: HW, w: 390, h: 800, dark: true});
await M.screenshot({path: SHOTS + 'v117-halloween-phone.png'});
ok(await M.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no sideways scroll');

// ---- dinner venue: the spinning draw plays when the day starts, dinner just shows the venue
const G = await page();   // real clock: the dice and draw animations run on Date.now()
await G.click('[data-a=solo]'); await G.click('[data-a=soloN][data-n="2"]'); await G.click('[data-a=sstart]'); await G.waitForSelector('#game:not([hidden])');
let spinAtStart = false, spinAtDinner = false, dinner = false;
const t0 = Date.now();
const seenPops = new Set();
while (Date.now() - t0 < 150000 && !dinner) {
  const st = await G.evaluate(() => ({din: (document.querySelector('#cDin') || {}).textContent || '', pop: document.querySelector('#pop').hidden ? '' : document.querySelector('#pop').textContent}));
  if (/seçiliyor/.test(st.din)) spinAtStart = true;
  if (st.pop) seenPops.add(st.pop.slice(0, 40));
  if (/Akşam yemeği/.test(st.pop)) { dinner = true; if (/seçiliyor/.test(st.pop)) spinAtDinner = true; }
  if (/seçiliyor/.test(st.pop)) spinAtDinner = true;
  const b = await G.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])'); if (b) await b.click().catch(() => {});
  await G.waitForTimeout(120);
}
ok(spinAtStart, 'venue draw spins under the dice at the start of the day');
ok(dinner && !spinAtDinner, 'at dinner the venue card shows without spinning' + (dinner ? '' : ': ' + [...seenPops].join(' | ')));

// ---- signed in: event quests, items with dates, no needless rebuilds
const A = await page({at: HW});
await A.waitForSelector('#acct .acctguest'); await A.click('[data-a=authSignup]');
await A.fill('#auName', 'Pumpkin_Fan'); await A.fill('#auPw', 'hunter22'); await A.fill('#auPw2', 'hunter22'); await A.check('#auConsent');
await A.click('form[data-form=signup] button[type=submit]'); await A.waitForSelector('#acctChip .chipbtn', {timeout: 8000}); await A.waitForTimeout(1200);
const uid = (await q1("select id from public.profiles where username = 'Pumpkin_Fan'")).id;
// the server counts quests only on event days, and wins/deals only from verified online games
await pool.query("select public.event_credit($1, '2026-10-01Z', 9, 9, 9, 9, 9, 9)", [uid]);
ok(!(await q1('select 1 as x from public.event_progress where user_id = $1', [uid])), 'no event progress outside the event dates');
for (let k = 0; k < 8; k++) await pool.query("select public.event_credit($1, '2026-10-20Z', 1, 0, 0, 0, 0, 0)", [uid]);
const ach = (await pool.query('select key from public.achievements where user_id = $1', [uid])).rows.map(r => r.key);
ok(ach.includes('hw_dice') && !ach.includes('hw_board'), '8 games → pumpkin dice, not yet the board: ' + ach.join(','));
ok(!!(await q1("select 1 as x from public.cosmetics where kind = 'dice' and key = 'pumpkin' and req_ach = 'hw_dice'")), 'pumpkin dice in the catalog');
await A.reload(); await A.waitForTimeout(1500);
await A.click('.evcard summary'); await A.waitForTimeout(200);
ok((await A.textContent('.evcard summary')).includes('1/4') && (await A.$$('.evq li.done')).length === 1, 'event card shows the finished quest');
// background account updates don't rebuild the home screen (the open card stays open)
const b0 = await A.evaluate(() => window.__cfBuilds || 0);
await A.waitForTimeout(12000);
const b1 = await A.evaluate(() => window.__cfBuilds || 0);
ok(b1 - b0 <= 1, `home screen not rebuilt by background updates (${b1 - b0} rebuilds in 12 s)`);
ok(await A.evaluate(() => document.querySelector('.evcard').open), 'open event card stays open');
await A.click('[data-a=profile]'); await A.waitForTimeout(600);
await A.click('[data-a=profTab][data-t=event]'); await A.waitForTimeout(400);
ok((await A.textContent('#profileBox')).includes('Balkabağı') && await A.isVisible('#profileBox .evcard[open]'), 'profile Event tab');
await A.screenshot({path: SHOTS + 'v117-profile-event.png'});
await A.click('[data-a=profTab][data-t=dice]'); await A.waitForTimeout(400);
const item = await A.$('#profileBox .item[title]');
ok(!!item && /15 Eki/.test(await item.getAttribute('title')) && /kazanılabilir/.test(await item.getAttribute('title')), 'event item shows its dates on hover: ' + (item && await item.getAttribute('title')));
await A.click('[data-a=equip][data-key=pumpkin]'); await A.waitForTimeout(900);
ok(((await q1('select equipped from public.profiles where id = $1', [uid])).equipped || {}).dice === 'pumpkin', 'pumpkin dice can be equipped');
const p0 = await A.evaluate(() => window.__cfBuilds || 0); await A.waitForTimeout(7000);
ok(await A.evaluate(() => window.__cfBuilds || 0) - p0 <= 1, 'profile not rebuilt by background updates');

// ---- admin theme preview: only in the admin's browser, never awards anything
await pool.query('insert into public.admins (user_id) values ($1)', [uid]);
const P = await page({at: BEFORE});
await P.click('[data-a=authLogin]'); await P.fill('#auId', 'Pumpkin_Fan'); await P.fill('#auPw', 'hunter22');
await P.click('form[data-form=login] button[type=submit]'); await P.waitForSelector('#acctChip .chipbtn', {timeout: 8000}); await P.waitForTimeout(1000);
ok(!(await theme(P)).ev, 'admin: no theme before the event');
await P.click('#setBtn'); await P.click('#adminBtn'); await P.waitForTimeout(800);
await P.click('.admprev summary'); await P.click('[data-a=admPrev][data-k=halloween]'); await P.waitForTimeout(400);
ok((await theme(P)).ev === 'halloween', 'admin preview turns Halloween on');
ok(!(await P.$('[data-a=admPrev][disabled]')), 'all four themes can be previewed');
await P.screenshot({path: SHOTS + 'v117-admin-preview.png'});
for (const [ev, n, q] of [['newyear', 'Yılbaşı', 'hesap öde'], ['valentine', 'Sevgililer Günü', 'pazarlık'], ['easter', 'Paskalya', 'kart oyna']]) {
  await P.click(`[data-a=admPrev][data-k=${ev}]`); await P.waitForTimeout(300);
  const th = await theme(P), mus = await P.evaluate(() => import('/js/music.js').then(m => m.Music.flavorNow));
  await P.click('[data-a=profBack]'); await P.waitForTimeout(300); await P.click('.evcard summary'); await P.waitForTimeout(200);
  const card = await P.textContent('.evcard');
  ok(th.ev === ev && mus === ev && card.includes(n) && card.includes(q), `${n}: background, music and event card with its own quests`);
  await P.screenshot({path: SHOTS + `v117-${ev}.png`});
  await P.click('#setBtn'); await P.click('#adminBtn'); await P.waitForTimeout(500);
}
await pool.query("select public.event_credit($1, '2026-12-20Z', 1, 1, 0, 1, 0, 0) from generate_series(1, 25)", [uid]);
const ny = (await pool.query("select key from public.achievements where user_id = $1 and (key like 'ny_%' or key = 'newyear_2027')", [uid])).rows.map(r => r.key).sort().join(',');
ok(ny === 'newyear_2027,ny_avatar,ny_board,ny_bubble,ny_dice', 'New Year: all four quests give the "New Year 2027" title: ' + ny);
ok(!!(await q1("select 1 as x from public.cosmetics where kind = 'title' and key = 'newyear_2027'")), 'the yearly title can be equipped');
await P.click('[data-a=admPrev][data-k=halloween]'); await P.waitForTimeout(300);
await P.click('[data-a=profBack]'); await P.waitForTimeout(400);
ok(await P.isVisible('.evcard.halloween'), 'preview shows the event card');
const before = (await pool.query('select count(*)::int as n from public.achievements where user_id = $1', [uid])).rows[0].n;
const O = await page({at: BEFORE});
ok(!(await theme(O)).ev, 'other browsers don\'t see the preview');
await O.evaluate(() => localStorage.setItem('cf-evprev', 'halloween')); await O.reload(); await O.waitForTimeout(900);
ok(!(await theme(O)).ev, 'a non-admin can\'t turn the preview on');
await P.click('#setBtn'); await P.click('#adminBtn'); await P.waitForTimeout(500);
await P.click('[data-a=admPrev][data-k=""]'); await P.waitForTimeout(300);
ok(!(await theme(P)).ev, 'preview off');
ok((await pool.query('select count(*)::int as n from public.achievements where user_id = $1', [uid])).rows[0].n === before, 'preview awarded nothing');
await browser.close(); await pool.end();
