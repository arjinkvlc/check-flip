import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import {handle, pool, log} from './mocksb.mjs';
import fs from 'fs';
const OUT = SHOTS; fs.mkdirSync(OUT, {recursive: true});
const BASE = 'http://127.0.0.1:8787/';
await pool.query('delete from public.login_attempts; delete from auth.users;');
const browser = await chromium.launch(LAUNCH);
async function newPage(w = 1200, h = 900, lang = 'en') {
  const ctx = await browser.newContext({viewport: {width: w, height: h}});
  await ctx.addInitScript(l => { try { localStorage.setItem('hs-lang', l); } catch (e) {} }, lang);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console.' + m.type(), m.text()); });
  await page.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({path: 'node_modules/@supabase/supabase-js/dist/umd/supabase.js', contentType: 'application/javascript'}));
  await page.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.route(/^wss?:/, r => r.abort());
  return page;
}
const shot = (p, n) => p.screenshot({path: `${OUT}/${n}.png`});
const txt = async (p, sel) => (await p.textContent(sel)) || '';
const assert = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('ok:', m); };

const p = await newPage();
await p.goto(BASE); await p.waitForSelector('#acct .acctguest');
await shot(p, '01-home-guest');
assert((await p.isVisible('#nickWrap')), 'guest sees nickname field');
assert((await txt(p, '#rulesList')).includes('Games with bots (single player or bots added to a room) give half XP'), 'rules mention bot XP rule');
// sign up without email
await p.click('[data-a=authSignup]');
await p.fill('#auName', 'Arjin'); await p.waitForTimeout(700);
assert((await txt(p, '#auNameChk')).includes('available'), 'username availability check');
await p.fill('#auPw', 'hunter22'); await p.fill('#auPw2', 'hunter22'); await p.check('#auConsent');
await shot(p, '02-signup');
await p.click('form[data-form=signup] button[type=submit]');
await p.waitForSelector('#acctChip .chipbtn', {timeout: 8000});
await p.waitForTimeout(300);
assert((await txt(p, '#acctChip')).includes('Arjin'), 'logged in after sign-up, name shown');
assert(!(await p.isVisible('#nickWrap')), 'nickname hidden when logged in');
await shot(p, '03-home-loggedin');
// logout + wrong password + login by username (different case)
await p.click('[data-a=logout]'); await p.waitForSelector('#acct .acctguest');
await p.click('[data-a=authLogin]'); await p.fill('#auId', 'arjin'); await p.fill('#auPw', 'wrong!!');
await p.click('form[data-form=login] button[type=submit]'); await p.waitForSelector('#authBox .err');
assert((await txt(p, '#authBox .err')).includes('Wrong'), 'wrong password error');
await p.fill('#auPw', 'hunter22'); await p.click('form[data-form=login] button[type=submit]');
await p.waitForSelector('#acctChip .chipbtn', {timeout: 8000}); assert(true, 'login with username works');
// duplicate username
await p.click('[data-a=logout]'); await p.waitForSelector('#acct .acctguest');
await p.click('[data-a=authSignup]'); await p.fill('#auName', 'ARJIN'); await p.fill('#auPw', 'hunter22'); await p.fill('#auPw2', 'hunter22'); await p.check('#auConsent'); await p.click('form[data-form=signup] button[type=submit]');
await p.waitForSelector('#authBox .err'); assert((await txt(p, '#authBox .err')).includes('taken'), 'duplicate username rejected');
// second account with email
await p.fill('#auName', 'Bob_2'); await p.fill('#auPw', 'hunter22'); await p.fill('#auEmail', 'bob@mail.io'); await p.fill('#auPw2', 'hunter22'); await p.check('#auConsent');
await p.click('form[data-form=signup] button[type=submit]'); await p.waitForSelector('#acctChip .chipbtn', {timeout: 8000});
await p.click('[data-a=logout]'); await p.waitForSelector('#acct .acctguest');
await p.click('[data-a=authLogin]'); await p.fill('#auId', 'arjin'); await p.fill('#auPw', 'hunter22'); await p.click('form[data-form=login] button[type=submit]');
await p.waitForSelector('#acctChip .chipbtn');

// profile screen
await p.click('[data-a=profile]'); await p.waitForSelector('#profileBox .profhero');
await p.waitForTimeout(800); await shot(p, '04-profile-avatar');
await p.click('[data-a=profTab][data-t=avatar]'); await p.click('[data-a=pav][data-k=waiter]'); await p.waitForTimeout(500);
for (const tab of ['frame', 'board', 'bubble', 'title', 'ach', 'stats']) { await p.click(`[data-a=profTab][data-t=${tab}]`); await p.waitForTimeout(150); await shot(p, '05-profile-' + tab); }
assert((await txt(p, '#profileBox')).includes('Bot games'), 'stats tab has bot note');
// give XP and a win-based achievement straight in the DB, then equip
await pool.query("update public.profiles set xp = 2000 where lower(username)='arjin'");
await pool.query("insert into public.achievements (user_id, key) select id, 'first_bite' from public.profiles where lower(username)='arjin'");
await p.click('[data-a=profBack]'); await p.click('[data-a=profile]');
await p.evaluate(async () => { const m = await import('/js/account.js'); await m.refreshProfile(); });
await p.click('[data-a=profTab][data-t=frame]'); await p.click('[data-a=equip][data-key=silver]'); await p.waitForTimeout(400);
assert((await txt(p, '#profileBox')).includes('Equipped'), 'frame equipped');
const lockedBtn = await p.$('[data-a=equip][data-key=diamond]'); assert(!lockedBtn, 'diamond locked (no equip button)');
await p.click('[data-a=profTab][data-t=board]'); await p.click('[data-a=equip][data-key=marble]'); await p.waitForTimeout(400);
assert(await p.evaluate(() => document.body.dataset.board) === 'marble', 'board style applied to body');
await p.click('[data-a=profTab][data-t=bubble]'); await p.click('[data-a=equip][data-key=heart]'); await p.waitForTimeout(400);
await p.click('[data-a=profTab][data-t=title]'); await p.click('[data-a=equip][data-key=first_bite]'); await p.waitForTimeout(400);
await shot(p, '06-profile-title-equipped');
// server refuses locked item even if client tries
const refused = await p.evaluate(async () => { const m = await import('/js/account.js'); try { await m.equip({frame: 'diamond'}); return 'accepted'; } catch (e) { return e.key; } });
assert(refused === 'aErrLocked', 'server rejects locked item: ' + refused);

// solo game shows frame, title, level, board style
await p.click('[data-a=profBack]'); await p.click('[data-a=solo]');
await shot(p, '07-solo-setup');
assert(await p.evaluate(() => !!document.querySelector('#soloAv .avbtn.on[data-k=waiter]')), 'default avatar preselected');
await p.click('[data-a=sstart]'); await p.waitForTimeout(2500);
await p.click('#center').catch(() => {}); await p.waitForTimeout(800);
await shot(p, '08-solo-game');
assert((await txt(p, '#players')).includes('First Bite'), 'title shown in player list');
assert(await p.evaluate(() => !!document.querySelector('.tok.fr-silver')), 'frame on token');

// result submission through the real RPC: simulate a finished game with the engine
const res = await p.evaluate(async () => {
  const E = await import('/js/engine.js'); const A = await import('/js/account.js');
  const S = E.newState(); S.host = 'L0'; E.addPlayer(S, 'L0', 'Arjin'); E.addPlayer(S, 'B1', 'Bot', {bot: 1}); E.addPlayer(S, 'B2', 'Bot2', {bot: 1});
  E.act(S, 'L0', {t: 'start'}); let g = 0; while (S.ph !== 'over' && g++ < 20000) { const i = E.actor(S); E.act(S, S.pl[i].id, E.botDecide(S, i) || E.autoPick(S)) || E.act(S, S.pl[i].id, E.autoPick(S)); }
  const mi = 0, q = S.pl[0];
  return await A.submitResult({game_id: S.gid, mode: 'solo', pid: 'L0', order: E.standings(S).map(i => S.pl[i].id), won: S.win === mi, days: S.day, duration: 600, stats: {deals: q.st.d, belt: q.st.b, iron: !!q.st.i, tycoon: !!q.st.t, bonus: Math.min(20, S.day)}});
});
console.log('solo submit ->', JSON.stringify(res));
assert(res && res.counted && res.verified && res.xp_gained > 0, 'solo result counted with XP');
const html = await p.evaluate(async r => { const U = await import('/js/account-ui.js'); return U.resultHTML({st: 'done', res: r, solo: true}); }, res);
assert(html.includes('Game with bots'), 'result box explains bot rule');
const prof = (await pool.query("select xp, wins, bot_games from public.profiles where lower(username)='arjin'")).rows[0];
assert(prof.wins === 0 && prof.bot_games === 1, 'bot game did not add wins: ' + JSON.stringify(prof));

// TR language on profile
const p2 = await newPage(390, 844, 'tr');
await p2.goto(BASE); await p2.waitForSelector('#acct');
await p2.waitForTimeout(500); await shot(p2, '09-mobile-tr-guest');
await p2.click('[data-a=authLogin]'); await p2.fill('#auId', 'bob@mail.io'); await p2.fill('#auPw', 'hunter22'); await p2.click('form[data-form=login] button[type=submit]');
await p2.waitForSelector('#acctChip .chipbtn'); await shot(p2, '10-mobile-tr-home');
await p2.click('[data-a=profile]'); await p2.click('[data-a=profTab][data-t=ach]'); await p2.waitForTimeout(200); await shot(p2, '11-mobile-tr-ach');
// cross-verification between the two accounts
await pool.query("update public.game_results set created_at = now() - interval '10 minutes'");
const gid = 'gE2Etestgame0001';
const order = ['pArjin', 'pBob'];
const r1 = await p.evaluate(async ([gid, order]) => (await import('/js/account.js')).submitResult({game_id: gid, mode: 'online', pid: 'pArjin', order, won: true, days: 12, duration: 900, stats: {deals: 1, bonus: 12}}), [gid, order]).catch(e => 'ERR ' + e.message);
console.log('online A ->', JSON.stringify(r1));
const r2 = await p2.evaluate(async ([gid, order]) => (await import('/js/account.js')).submitResult({game_id: gid, mode: 'online', pid: 'pBob', order, won: false, days: 12, duration: 900, stats: {bonus: 12}}), [gid, order]);
console.log('online B ->', JSON.stringify(r2));
assert(r1.limit === undefined, 'A submitted');
const rows = (await pool.query("select p.username, r.counted, r.verified, r.xp, r.xp_full from public.game_results r join public.profiles p on p.id=r.user_id where game_id=$1", [gid])).rows;
console.log(rows);
const pa = (await pool.query("select wins from public.profiles where lower(username)='arjin'")).rows[0];
console.log('arjin wins', pa);
// account deletion (Bob)
p2.on('dialog', d => d.accept('bob_2'));
await p2.click('[data-a=profTab][data-t=stats]'); await shot(p2, '12-mobile-tr-stats');
await p2.click('[data-a=delAccount]'); await p2.waitForSelector('#acct .acctguest', {timeout: 8000});
const left = (await pool.query("select count(*)::int n from public.profiles where lower(username)='bob_2'")).rows[0].n;
const leftRes = (await pool.query("select count(*)::int n from public.game_results where pid='pBob'")).rows[0].n;
assert(left === 0 && leftRes === 0, 'account deletion removed profile and results');
await browser.close(); await pool.end();
console.log(log.filter(l => l.includes('rpc')).length, 'rpc calls');
