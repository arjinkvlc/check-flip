import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import {handle, pool} from './mocksb.mjs';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
await pool.query('delete from public.login_attempts; delete from public.season_medals; delete from auth.users;');
const browser = await chromium.launch(LAUNCH);
async function page(w = 1300, h = 850, lang = 'tr') {
  const ctx = await browser.newContext({viewport: {width: w, height: h}});
  await ctx.addInitScript(l => { try { localStorage.setItem('hs-lang', l); localStorage.setItem('cf-tips', 'off'); } catch (e) {} }, lang);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await p.route('https://cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({path: 'node_modules/@supabase/supabase-js/dist/umd/supabase.js', contentType: 'application/javascript'}));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.route(/fonts\./, r => r.abort());
  await p.goto('http://127.0.0.1:8787/?debug=1'); await p.waitForTimeout(700); return p;
}
const shot = (p, n) => p.screenshot({path: SHOTS + `v16-${n}.png`});
async function signup(p, name) {
  await p.waitForSelector('#acct .acctguest'); await p.click('[data-a=authSignup]');
  await p.fill('#auName', name); await p.fill('#auPw', 'hunter22'); await p.fill('#auPw2', 'hunter22'); await p.check('#auConsent');
  await p.click('form[data-form=signup] button[type=submit]'); await p.waitForSelector('#acctChip .chipbtn', {timeout: 8000});
}
// ---- seasons & medals
const A = await page();
await signup(A, 'Arjin');
for (const [u] of [['Nazli'], ['Mert'], ['Selin']]) await pool.query("insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, 'x', $2)", [u.toLowerCase() + '@x.io', JSON.stringify({username: u})]);
const ids = Object.fromEntries((await pool.query('select id, username from public.profiles')).rows.map(r => [r.username, r.id]));
let g = 0; const win = async (u, n) => { for (let k = 0; k < n; k++) await pool.query("insert into public.game_results (game_id, user_id, pid, mode, players, place, won, days, duration_s, counted, verified, xp) values ($1,$2,$3,'online',3,1,true,10,600,true,true,20)", ['g' + (g++), ids[u], 'p' + g]); };
await win('Arjin', 5); await win('Nazli', 3); await win('Mert', 1);
await A.click('[data-a=leaders]'); await A.waitForSelector('.lblist li'); await A.waitForTimeout(400);
ok((await A.$$('.lblist .medal.live')).length === 3, 'current top 3 show live medals');
ok((await A.textContent('.segtabs')).match(/Sezon \d/), 'season tab label'); await shot(A, 'season');
// pretend a month passed: season 1 closes, medals are handed out
await pool.query("create or replace function public.season_of(p_t timestamptz) returns integer language sql immutable set search_path = '' as $$ select (extract(year from p_t at time zone 'utc')::int - 2026) * 12 + extract(month from p_t at time zone 'utc')::int - 7 $$");
await pool.query("select * from public.leaderboard('season', 5)");
const md = (await pool.query('select m.season, m.place, p.username from public.season_medals m join public.profiles p on p.id = m.user_id order by place')).rows;
ok(md.length === 3 && md[0].username === 'Arjin' && md[1].username === 'Nazli' && md[2].username === 'Mert', 'medals awarded ' + JSON.stringify(md));
await pool.query("select * from public.leaderboard('season', 5)");
ok((await pool.query('select count(*)::int n from public.season_medals')).rows[0].n === 3, 'closing again adds nothing');
await pool.query("create or replace function public.season_of(p_t timestamptz) returns integer language sql immutable set search_path = '' as $$ select (extract(year from p_t at time zone 'utc')::int - 2026) * 12 + extract(month from p_t at time zone 'utc')::int - 8 $$");
await A.evaluate(async () => (await import('/js/account.js')).refreshProfile());
await A.click('#leaders [data-a=profBack]'); await A.click('#acctChip .chipbtn'); await A.waitForSelector('.profhero');
ok(!!(await A.$('.profhero .medal.m1')), 'gold medal on my profile'); await shot(A, 'profile-medal');
await A.click('#profile [data-a=profBack]');
// ---- solo: bot level, awards, shapes
await A.click('[data-a=solo]'); await A.click('[data-a=soloDiff][data-l=easy]');
ok(await A.$eval('#soloDiff [data-l=easy]', b => b.classList.contains('on')), 'easy selected');
await A.click('[data-a=sstart]'); await A.waitForTimeout(1500);
ok(await A.evaluate(() => window.__cf.state().pl.filter(q => q.bot).every(q => q.bd === 'easy')), 'bots are easy');
ok((await A.textContent('#players')).includes('Kolay'), 'bot level shown');
await A.evaluate(() => { const S = window.__cf.state(); S.pl[0].st.pm = 180; S.pl[1].st.d = 2; S.pl[1].st.mh = 9; });
await A.evaluate(() => window.__cf.endGame()); await A.waitForTimeout(1500);
for (let i = 0; i < 3; i++) { await A.click('#center').catch(() => {}); await A.waitForTimeout(600); }
await A.waitForSelector('.awards li', {timeout: 8000}); ok((await A.$$('.awards li')).length >= 2, 'awards shown: ' + (await A.textContent('.awards')).slice(0, 80));
await shot(A, 'awards');
await A.click('[data-a=leave]').catch(() => {});
// ---- online: kick, whatsapp, quick chat, mute, bot takeover
const B = await page(), C = await page();
await A.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
const code = (await A.textContent('#lobbyCode')).trim();
ok((await A.getAttribute('#waBtn', 'href')).includes('wa.me') && (await A.getAttribute('#waBtn', 'href')).includes(code), 'WhatsApp link has the room');
for (const [p, n] of [[B, 'Bob'], [C, 'Cem']]) { await p.fill('#nm', n); await p.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await p.fill('#code', code); await p.click('[data-a=join]'); await p.waitForSelector('#lobby:not([hidden])', {timeout: 15000}); }
await A.waitForFunction(() => document.querySelectorAll('#lobbyList li:not(.note)').length === 3, null, {timeout: 8000});
A.once('dialog', d => d.accept());
const cemId = await C.evaluate(() => window.__cf.state().pl.find(q => q.n === 'Cem').id);
await A.click(`[data-a=kick][data-id="${cemId}"]`);
await C.waitForSelector('#homeErr:not([hidden])', {timeout: 8000}); ok((await C.textContent('#homeErr')).includes('çıkardı'), 'kicked player told');
await C.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await C.fill('#code', code); await C.click('[data-a=join]');
await C.waitForSelector('#homeErr:not([hidden])', {timeout: 15000}); ok(true, 'kicked player can not rejoin');
await A.click('[data-a=start]'); await B.waitForSelector('#game:not([hidden])', {timeout: 10000});
await B.click('.qcbtn'); await B.click('.qchip[data-k=treat]'); await A.waitForTimeout(1000);
ok((await A.textContent('#chatList')).includes('Hesap sende'), 'quick message arrives');
await A.hover('#chatList li[data-pid]'); await A.click('#chatList li[data-pid] .mutebtn');
await B.fill('#chatIn', 'görüyor musun'); await B.press('#chatIn', 'Enter'); await A.waitForTimeout(1000);
ok(!(await A.textContent('#chatList')).includes('görüyor'), 'muted player hidden');
await shot(A, 'chat');
// Bob drops: the host lets a bot play for him
await B.close();
const t0 = Date.now(); let took = false;
while (Date.now() - t0 < 90000 && !took) {
  const btn = await A.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])'); if (btn) await btn.click().catch(() => {});
  await A.click('#center').catch(() => {}); await A.waitForTimeout(700);
  took = (await A.textContent('#log')).includes('bot oynuyor');
}
ok(took, 'bot takes over the dropped player');
ok((await A.textContent('#players')).includes('bot oynuyor'), 'tag shows bot is playing');
await browser.close(); await pool.end();
