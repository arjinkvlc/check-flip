import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import {handle, pool} from './mocksb.mjs';
const browser = await chromium.launch(LAUNCH);
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
async function player(name, theme = 'light', w = 1440, h = 900) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, colorScheme: theme});
  await ctx.addInitScript(() => { try { localStorage.setItem('hs-lang', 'en'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(name, 'PAGEERROR', e.message));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.route('https://cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({path: 'node_modules/@supabase/supabase-js/dist/umd/supabase.js', contentType: 'application/javascript'}));
  await p.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await p.goto('http://127.0.0.1:8787/'); await p.waitForTimeout(800); return p;
}
await pool.query('delete from public.login_attempts; delete from auth.users;');
const A = await player('Alice', 'dark'), B = await player('Bob');
// Alice signs up so the header chip shows
await A.click('[data-a=authSignup]'); await A.fill('#auName', 'Alice'); await A.fill('#auPw', 'hunter22'); await A.fill('#auPw2', 'hunter22'); await A.check('#auConsent');
await A.click('form[data-form=signup] button[type=submit]'); await A.waitForSelector('#acctChip .chipbtn', {timeout: 8000}); await A.waitForTimeout(600);
ok(!(await A.$('#acct .acctcard')), 'no duplicate account card on home');
ok(!(await A.$('[data-a=howto]')) && !(await A.$('#acct [data-a=profile]')), 'profile / how-to pills removed');
ok(!!(await A.$('#acctChip .xpbar')), 'header chip has xp bar');
await A.screenshot({path: SHOTS + 'six-home.png'});
await B.fill('#nm', 'Bob');
await A.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
const code = (await A.textContent('#lobbyCode')).trim();
for (let i = 0; i < 4; i++) { await A.click('[data-a=addbot]'); await A.waitForTimeout(300); }
await B.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await B.fill('#code', code); await B.click('[data-a=join]'); await B.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await B.waitForFunction(() => document.querySelectorAll('#lobbyList li:not(.note)').length === 6, null, {timeout: 8000});
await A.click('[data-a=start]'); await B.waitForSelector('#game:not([hidden])', {timeout: 10000});
await A.waitForTimeout(800);
ok(await B.isVisible('#chatIn'), 'chat open by default');
ok(!(await B.isVisible('#log')), 'events hidden by default');
ok(!(await B.isVisible('#chatFab')), 'no round chat button on desktop');
ok(!(await B.isVisible('#gameCredit')), 'no credit footer in game');
await B.fill('#chatIn', 'hi all'); await B.press('#chatIn', 'Enter'); await A.waitForTimeout(800);
for (let k = 0; k < 8; k++) { for (const p of [A, B]) await p.click('#center').catch(() => {}); await A.waitForTimeout(500); }
for (const p of [A, B]) await p.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); }); await A.screenshot({path: SHOTS + 'six-game-dark.png'}); await B.screenshot({path: SHOTS + 'six-game-light.png'});
await B.click('[data-a=stab][data-t=log]'); ok(await B.isVisible('#log') && !(await B.isVisible('#chatIn')), 'events tab switches');
const bx = await B.$eval('.cell .ic', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
console.log('cell icon box', bx);
await browser.close(); await pool.end();
