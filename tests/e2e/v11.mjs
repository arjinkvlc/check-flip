import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import {handle, pool} from './mocksb.mjs';
const BASE = 'http://127.0.0.1:8787/?debug=1';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
await pool.query('delete from public.login_attempts; delete from auth.users;');
const browser = await chromium.launch(LAUNCH);
async function page(lang = 'en', w = 1200, h = 900) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, acceptDownloads: true});
  await ctx.addInitScript(l => { try { localStorage.setItem('hs-lang', l); } catch (e) {} }, lang);
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await p.route('https://cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({path: 'node_modules/@supabase/supabase-js/dist/umd/supabase.js', contentType: 'application/javascript'}));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto(BASE); return p;
}
const shot = (p, n) => p.screenshot({path: SHOTS + `v11-${n}.png`});
async function signup(p, name) {
  await p.waitForSelector('#acct .acctguest'); await p.click('[data-a=authSignup]');
  await p.fill('#auName', name); await p.fill('#auPw', 'hunter22'); await p.fill('#auPw2', 'hunter22'); await p.check('#auConsent');
  await p.click('form[data-form=signup] button[type=submit]'); await p.waitForSelector('#acctChip .chipbtn', {timeout: 8000});
}

// ---------- guest: version, music, leaderboard, solo modes, tips ----------
const G = await page();
ok((await G.textContent('#verTag')) .startsWith('v1.'), 'version shown in footer');
await G.click('#setBtn'); await G.click('[data-a=music]'); ok(await G.$eval('#musicBtn', e => !e.classList.contains('on')), 'music toggles off');
await G.click('[data-a=music]'); await G.click('[data-a=setClose]');
ok(await G.evaluate(() => !!document.querySelector('link[rel=manifest]') && !!document.querySelector('meta[property="og:image"]')), 'manifest + link preview tags');
await G.waitForTimeout(1200);
ok(await G.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'service worker registered');
await G.click('[data-a=solo]'); await G.click('[data-a=soloMode][data-m=quick]'); await G.click('[data-a=sstart]');
await G.waitForTimeout(1500); for (let i = 0; i < 4; i++) { await G.click('#center').catch(() => {}); await G.waitForTimeout(300); }
ok((await G.textContent('#cDay')).includes('/10'), 'quick mode has a 10-day limit: ' + (await G.textContent('#cDay')));
await G.waitForSelector('.tip', {timeout: 15000}).then(() => ok(true, 'first-game tip shown'), () => ok(false, 'first-game tip shown'));
await shot(G, 'tip');
const tip1 = await G.textContent('.tip'); await G.click('[data-a=tipok]'); await G.waitForTimeout(300);
ok(!(await G.$('.tip')) || (await G.textContent('.tip')) !== tip1, 'tip dismissed');
await G.click('[data-a=leave]'); await G.click('#askYes', {timeout: 1500}).catch(() => {});
await G.click('[data-a=solo]'); await G.click('[data-a=soloMode][data-m=teams]');
ok(await G.$eval('#soloCount [data-n="2"]', b => b.disabled), '2v2 forces 4 players');
await G.click('[data-a=sstart]'); await G.waitForTimeout(1500);
console.log('DBG', await G.evaluate(() => { const S = window.__cf.state(); return JSON.stringify([S && S.ph, S && S.pl.length, S && S.cfg.mode, document.querySelector('#game').hidden, document.querySelector('#solo').hidden, document.querySelector('#home').hidden]); })); await G.waitForTimeout(1500); const ptxt = await G.textContent('#players'); ok(ptxt.includes('Team A') && ptxt.includes('Team B'), 'teams shown in player list: ' + ptxt.slice(0, 120));
await G.evaluate(() => window.__cf.endGame()); await G.waitForTimeout(800); await G.click('#center').catch(() => {}); await G.waitForTimeout(1200);
ok((await G.textContent('#actions .win')).includes('&'), 'team winners announced: ' + (await G.textContent('#actions .win')));
const [dl] = await Promise.all([G.waitForEvent('download', {timeout: 10000}).catch(() => null), G.click('[data-a=share]')]);
ok(!!dl, 'share card generated (download fallback)');
if (dl) await dl.saveAs(SHOTS + 'v11-sharecard.png');
await shot(G, 'teams-over');

// ---------- accounts: friends, invites, quest, leaderboard, rematch ----------
const A = await page(), B = await page('tr', 390, 844);
await signup(A, 'Ann'); await signup(B, 'Ben');
ok((await A.textContent('#acct')).includes('Daily quest'), 'daily quest on home');
await A.click('[data-a=friends]'); await A.fill('#frName', 'ben'); await A.click('form[data-form=fradd] button');
await A.waitForSelector('#friendsBox .okmsg'); ok(true, 'friend request sent');
await B.evaluate(async () => (await import('/js/account.js')).pollSocial()); await B.waitForTimeout(500);
ok((await B.textContent('#acct')).includes('1'), 'incoming request badge');
await B.click('[data-a=friends]'); await B.click('[data-a=frAccept]'); await B.waitForTimeout(800);
ok((await B.textContent('#friendsBox')).includes('Ann'), 'request accepted, Ann in friend list');
await shot(B, 'friends-mobile');
await B.click('#friendsBox [data-a=viewp][data-u=Ann]'); await B.waitForSelector('#modal:not([hidden]) .stats'); await B.waitForTimeout(600);
ok((await B.textContent('#modalCard')).includes('Ann'), 'profile card opens'); await shot(B, 'profile-modal');
await B.click('[data-a=modalClose]'); await B.click('[data-a=profBack]');
// Ann opens a room and invites Ben
await A.click('[data-a=profBack]'); await A.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await A.evaluate(async () => (await import('/js/account.js')).pollSocial()); await A.waitForTimeout(500);
await A.waitForSelector('#inviteBox [data-a=invite]'); await A.click('#inviteBox [data-a=invite]'); await A.waitForTimeout(600);
ok((await A.textContent('#inviteBox')).includes('invited'), 'invite sent from lobby');
await B.evaluate(async () => (await import('/js/account.js')).pollSocial());
await B.waitForSelector('#toast:not([hidden])', {timeout: 5000}); await B.waitForTimeout(600); await shot(B, 'invite-toast');
await B.click('[data-a=invJoin]'); await B.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
ok(true, 'friend joined via invite without a code');
await A.selectOption('#modeSel', 'quick'); await A.waitForTimeout(500);
ok((await B.$eval('#modeSel', s => s.value)) === 'quick', 'mode setting synced to guest');
await A.click('[data-a=start]'); await B.waitForSelector('#game:not([hidden])', {timeout: 10000});
await A.evaluate(() => window.__cf.endGame()); await A.waitForTimeout(1500);
for (const p of [A, B]) { await p.click('#center').catch(() => {}); }
await B.waitForSelector('[data-a=rematch]', {timeout: 10000});
await B.click('[data-a=rematch]'); await A.waitForTimeout(600); await A.click('[data-a=rematch]');
await B.waitForFunction(() => /Gün 1|Day 1/.test(document.querySelector('#cDay').textContent) && !document.querySelector('[data-a=rematch]'), null, {timeout: 10000})
  .then(() => ok(true, 'rematch started a new game for both'), () => ok(false, 'rematch'));
// leaderboard with data
await pool.query("update public.profiles set xp = 900 where username = 'Ann'");
await A.click('[data-a=leave]'); await A.click('#askYes', {timeout: 1500}).catch(() => {}); await A.click('[data-a=leaders]'); await A.click('[data-a=lbTab][data-t=level]'); await A.waitForSelector('.lblist li');
ok((await A.textContent('.lblist')).includes('Ann'), 'all-time leaderboard lists players'); await shot(A, 'leaderboard');
await browser.close(); await pool.end();
