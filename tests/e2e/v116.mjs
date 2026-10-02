import {LAUNCH, SHOTS} from './lib.mjs';
// v1.16: info cards with a timer, where visitors come from, quits, browser errors, feedback, season e-mail consent
import {chromium} from 'playwright';
import http from 'node:http';
import {handle, pool} from './mocksb.mjs';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const BASE = 'http://127.0.0.1:8787/';
// the Worker's /api/unsubscribe calls "Supabase" here (.dev.vars points SUPABASE_URL at :8899)
const srv = http.createServer(async (rq, rs) => {
  let body = ''; for await (const ch of rq) body += ch;
  const fake = {url: () => 'http://127.0.0.1:8899' + rq.url, method: () => rq.method, postData: () => body || null, headers: () => Object.fromEntries(Object.entries(rq.headers))};
  const r = await handle(fake); rs.writeHead(r.status, Object.assign({'content-type': r.contentType || 'application/json'}, r.headers || {})); rs.end(r.body || '');
}).listen(8899);
await pool.query('delete from public.metric_events; delete from public.metric_devices; delete from public.client_errors; delete from public.feedback; delete from public.admins; delete from auth.users;');
const browser = await chromium.launch(LAUNCH);
async function page(o = {}) {
  const ctx = await browser.newContext({viewport: {width: o.w || 1300, height: o.h || 850}});
  await ctx.addInitScript(l => { try { localStorage.setItem('hs-lang', l); localStorage.setItem('cp-tips', '{"off":true}'); } catch (e) {} }, o.lang || 'tr');
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await p.goto(BASE + (o.q || ''), o.referer ? {referer: o.referer} : {}); await p.waitForTimeout(900); return p;
}
const dev = p => p.evaluate(() => localStorage.getItem('cf-dev'));
const q1 = async (sql, a) => (await pool.query(sql, a)).rows[0];

// ---- where visitors come from
const R1 = await page({q: '?utm_source=reddit'}), R2 = await page({referer: 'https://www.technopat.net/sosyal/konu/abc/'}), R3 = await page();
await R1.waitForTimeout(800);
const src = async p => (await q1('select source from public.metric_devices where device = $1', [await dev(p)]) || {}).source;
ok(await src(R1) === 'reddit', 'utm_source → reddit');
ok(await src(R2) === 'technopat', 'forum referrer → technopat');
ok(await src(R3) === 'direct', 'no referrer → direct');

// ---- info cards: timer bar, buttons work while a card is up, tap closes, a quit is counted
const G = R3;
await G.click('[data-a=solo]'); await G.click('[data-a=soloN][data-n="2"]'); await G.click('[data-a=sstart]'); await G.waitForSelector('#game:not([hidden])');
let bar = false, usable = false, longest = 0, since = null, key = null;
const t0 = Date.now();
while (Date.now() - t0 < 45000 && !(bar && usable)) {
  const st = await G.evaluate(() => ({k: document.querySelector('#pop').textContent.slice(0, 60), up: !document.querySelector('#pop').hidden, bar: !!document.querySelector('#pop .popbar i'),
    btn: !!document.querySelector('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])')}));
  if (st.up) { bar = bar || st.bar; if (st.k !== key) { key = st.k; since = Date.now(); } longest = Math.max(longest, Date.now() - since); if (st.btn) usable = true; } else key = null;
  if (st.btn && !st.up) { const b = await G.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])'); if (b) await b.click().catch(() => {}); }
  await G.waitForTimeout(150);
}
ok(bar, 'info card shows a timer bar');
ok(usable, 'buttons work while a card is still up');
ok(longest <= 8600, 'no card stays longer than 8 s: ' + longest);
await G.click('[data-a=leave]'); await G.waitForTimeout(400);
const yes = await G.$('#askYes'); if (yes && await yes.isVisible()) await yes.click();
await G.waitForTimeout(1200);
const quit = await q1("select info from public.metric_events where kind = 'game_quit' and device = $1", [await dev(G)]);
ok(!!quit && quit.info >= 1, 'leaving a running game is counted with the game day: ' + JSON.stringify(quit));
const gs = await q1("select game from public.metric_events where kind = 'game_start' and device = $1", [await dev(G)]);
ok(!!(gs && gs.game) && !!quit, 'game start carries the game id: ' + (gs && gs.game));

// ---- browser errors
await G.evaluate(() => import('/js/account.js').then(m => m.reportClientError('test boom', '/js/app.js:1:1', 'home')));
await G.waitForTimeout(800);
ok(!!(await q1("select 1 as x from public.client_errors where msg = 'test boom'")), 'browser error stored');

// ---- feedback from Settings
await G.click('#setBtn'); await G.click('#fbBox summary');
await G.click('[data-a=fbSend]'); ok((await G.textContent('#fbMsg')).includes('birkaç kelime'), 'empty feedback refused');
await G.selectOption('#fbKind', 'idea'); await G.fill('#fbText', 'Kartlar biraz daha uzun kalsın'); await G.click('[data-a=fbSend]'); await G.waitForTimeout(900);
ok((await G.textContent('#fbMsg')).includes('Teşekkürler'), 'feedback sent');
ok(!!(await q1("select 1 as x from public.feedback where kind = 'idea' and body like 'Kartlar%'")), 'feedback stored');
await G.screenshot({path: SHOTS + 'v116-feedback.png'});
await G.keyboard.press('Escape');

// ---- sign-up with the season e-mail box, Settings switch, unsubscribe link
const A = await page({lang: 'de'});
await A.waitForSelector('#acct .acctguest'); await A.click('[data-a=authSignup]');
ok(!(await A.isChecked('#auNews')), 'season e-mail box is unticked by default');
await A.fill('#auName', 'Mail_Fan'); await A.fill('#auPw', 'hunter22'); await A.fill('#auPw2', 'hunter22'); await A.fill('#auEmail', 'fan@mail.io');
await A.check('#auNews'); await A.check('#auConsent'); await A.click('form[data-form=signup] button[type=submit]'); await A.waitForSelector('#acctChip .chipbtn', {timeout: 8000});
await A.waitForTimeout(1200);
let pr = await q1("select e.lang, e.opt_in, e.token from public.email_prefs e join public.profiles p on p.id = e.user_id where p.username = 'Mail_Fan'");
ok(pr && pr.opt_in && pr.lang === 'de', 'consent and language saved at sign-up: ' + JSON.stringify(pr && {lang: pr.lang, opt_in: pr.opt_in}));
await A.click('#setBtn'); await A.waitForTimeout(300);
ok(await A.isVisible('#mailRow') && (await A.getAttribute('#mailBtn', 'aria-checked')) === 'true', 'Settings shows the e-mail switch on');
await A.click('#mailBtn'); await A.waitForTimeout(800);
pr = await q1("select e.opt_in from public.email_prefs e join public.profiles p on p.id = e.user_id where p.username = 'Mail_Fan'");
ok(pr && !pr.opt_in, 'switch turns e-mails off');
await A.click('#mailBtn'); await A.waitForTimeout(800);
await A.screenshot({path: SHOTS + 'v116-settings.png'});
await A.keyboard.press('Escape');
// language change is remembered for the e-mail
await A.evaluate(() => { const s = document.querySelector('#setLangSel'); s.value = 'fr'; s.dispatchEvent(new Event('change')); }); await A.waitForTimeout(1200);
pr = await q1("select e.lang, e.opt_in, e.token from public.email_prefs e join public.profiles p on p.id = e.user_id where p.username = 'Mail_Fan'");
ok(pr.lang === 'fr' && pr.opt_in, 'new game language saved for e-mails');
// one-click (mail app POST) and the page
const oc = await fetch(`${BASE}api/unsubscribe?t=${pr.token}&l=fr`, {method: 'POST'});
ok(oc.status === 200 && !(await q1("select opt_in from public.email_prefs where token = $1", [pr.token])).opt_in, 'one-click unsubscribe (POST) works');
await pool.query('update public.email_prefs set opt_in = true where token = $1', [pr.token]);
const U = await page({lang: 'fr'});
await U.goto(`${BASE}unsubscribe?t=${pr.token}&l=fr`); await U.waitForTimeout(1200);
ok((await U.textContent('#msg')).includes('C’est fait') && !(await q1("select opt_in from public.email_prefs where token = $1", [pr.token])).opt_in, 'unsubscribe page works (French)');
await U.screenshot({path: SHOTS + 'v116-unsub.png'});
// a player without an e-mail doesn't see the switch
const B = await page();
await B.waitForSelector('#acct .acctguest'); await B.click('[data-a=authSignup]');
await B.fill('#auName', 'No_Mail'); await B.fill('#auPw', 'hunter22'); await B.fill('#auPw2', 'hunter22'); await B.check('#auNews'); await B.check('#auConsent');
await B.click('form[data-form=signup] button[type=submit]'); await B.waitForSelector('#acctChip .chipbtn', {timeout: 8000}); await B.waitForTimeout(1000);
await B.click('#setBtn'); await B.waitForTimeout(300);
ok(!(await B.isVisible('#mailRow')), 'no e-mail → no switch');
ok(!(await q1("select e.opt_in from public.email_prefs e join public.profiles p on p.id = e.user_id where p.username = 'No_Mail'")).opt_in, 'no e-mail → no consent stored even if ticked');
const ml = await pool.query('select username from public.season_mail_list(public.season_of(now()) - 1)');
ok(!ml.rows.some(r => r.username === 'No_Mail'), 'season list skips accounts without e-mail');

// ---- admin screens
await pool.query("insert into public.admins (user_id) select id from public.profiles where username = 'Mail_Fan'");
await A.reload(); await A.waitForTimeout(1500);
await A.click('#setBtn'); await A.click('#adminBtn'); await A.waitForSelector('.admsum', {timeout: 8000}); await A.waitForTimeout(800);
const txt = await A.textContent('#adminBox');
ok(/reddit/.test(txt) && /technopat/.test(txt), 'admin: sources table');
ok(/10\+/.test(txt), 'admin: drop-off table');
await A.screenshot({path: SHOTS + 'v116-admin.png', fullPage: true});
await A.click('[data-a=admTab][data-t=feedback]'); await A.waitForTimeout(800);
ok((await A.textContent('#adminBox')).includes('Kartlar biraz'), 'admin: feedback list');
await A.click('[data-a=admFbMark]'); await A.waitForTimeout(800);
ok(!!(await q1("select 1 as x from public.feedback where status = 'done'")), 'admin: feedback marked done');
await A.click('[data-a=admTab][data-t=errors]'); await A.waitForTimeout(800);
ok((await A.textContent('#adminBox')).includes('test boom'), 'admin: error list');
await browser.close(); srv.close(); await pool.end();
