import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import {handle, pool} from './mocksb.mjs';
const BASE = 'http://127.0.0.1:8787/?debug=1';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
await pool.query('delete from public.login_attempts; delete from auth.users;');
const browser = await chromium.launch(LAUNCH);
async function page(theme = 'light', lang = 'tr', w = 1440, h = 900) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, colorScheme: theme});
  await ctx.addInitScript(l => { try { localStorage.setItem('hs-lang', l); } catch (e) {} }, lang);
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await p.route('https://cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({path: 'node_modules/@supabase/supabase-js/dist/umd/supabase.js', contentType: 'application/javascript'}));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto(BASE); await p.waitForTimeout(800); return p;
}
const shot = (p, n) => p.screenshot({path: SHOTS + `v14-${n}.png`});
async function signup(p, name) {
  await p.waitForSelector('#acct .acctguest'); await p.click('[data-a=authSignup]');
  await p.fill('#auName', name); await p.fill('#auPw', 'hunter22'); await p.fill('#auPw2', 'hunter22'); await p.check('#auConsent');
  await p.click('form[data-form=signup] button[type=submit]'); await p.waitForSelector('#acctChip .chipbtn', {timeout: 8000});
}
for (const th of ['light', 'dark']) {
  const P = await page(th);
  const nm = th === 'light' ? 'Arjin' : 'Nazli';
  await signup(P, nm);
  ok(await P.isVisible('#logoutBtn'), 'logout button in header');
  ok(!(await P.$('#acct [data-a=logout]')), 'no logout pill in the strip');
  await pool.query(`update public.profiles set xp = 4000 where username = '${nm}'`);
  await pool.query(`insert into public.achievements (user_id, key) select id, k from public.profiles, unnest(array['gourmet','tycoon','iron_stomach','first_bite','veteran','belt_master','realtor','speed_eater']) k where username = '${nm}'`);
  await P.evaluate(async () => (await import('/js/account.js')).refreshProfile());
  await P.click('#acctChip .chipbtn'); await P.waitForSelector('.profhero');
  ok(await P.$eval('.segtabs .stab.on', b => b.dataset.t) === 'stats', 'profile opens on stats');
  ok(await P.$eval('.segtabs .stab', b => b.dataset.t) === 'stats', 'stats tab is first');
  await P.fill('#pEmail', 'bad@x'); await P.click('form[data-form=email] button'); await P.waitForTimeout(300);
  ok(!!(await P.$('.emailbox .err')), 'invalid e-mail rejected');
  await P.fill('#pEmail', nm.toLowerCase() + '@mail.io'); await P.click('form[data-form=email] button'); await P.waitForSelector('.emailbox .okmsg', {timeout: 5000});
  const em = (await pool.query(`select u.email from auth.users u join public.profiles p on p.id=u.id where p.username='${nm}'`)).rows[0].email;
  ok(em === nm.toLowerCase() + '@mail.io', 'e-mail saved: ' + em);
  await shot(P, 'profile-' + th);
  await P.click('[data-a=profTab][data-t=title]'); await P.waitForTimeout(300); await shot(P, 'titles-' + th);
  await P.click('[data-a=equip][data-kind=title][data-key=gourmet]'); await P.waitForTimeout(500);
  ok(await P.$eval('.profhero .ptitle', e => e.classList.contains('tt-gold')), 'equipped gold title in header');
  // log out and back in with the new e-mail
  if (th === 'light') {
    await P.click('#profile [data-a=profBack]'); await P.click('#logoutBtn'); await P.waitForSelector('#acct .acctguest');
    await P.click('[data-a=authLogin]'); await P.fill('#auId', 'arjin@mail.io'); await P.fill('#auPw', 'hunter22'); await P.click('form[data-form=login] button[type=submit]');
    await P.waitForSelector('#acctChip .chipbtn', {timeout: 8000}); ok(true, 'login with the new e-mail');
  } else await P.click('#profile [data-a=profBack]');
  await P.click('[data-a=leaders]'); await P.click('[data-a=lbTab][data-t=level]'); await P.waitForSelector('.lblist li'); await P.waitForTimeout(300); await shot(P, 'leaders-' + th);
  await P.click('#leaders [data-a=profBack]'); await P.click('[data-a=friends]'); await P.waitForTimeout(500); await shot(P, 'friends-' + th);
  await P.click('#friends [data-a=profBack]');
  await P.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await P.click('[data-a=create]'); await P.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
  await P.click('[data-a=addbot]'); await P.waitForTimeout(300); await P.click('[data-a=addbot]'); await P.waitForTimeout(500); await shot(P, 'lobby-' + th);
  await P.click('[data-a=start]'); await P.waitForTimeout(1500);
  await P.evaluate(() => window.__cf.endGame()); await P.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) { await P.click('#center').catch(() => {}); await P.waitForTimeout(600); }
  await P.waitForSelector('.standings li', {timeout: 8000}); ok((await P.$$('.standings li')).length === 3, 'standings list on game over');
  await P.waitForTimeout(1500); await shot(P, 'over-' + th);
}
const M = await page('light', 'tr', 390, 844);
await M.click('[data-a=authLogin]'); await M.fill('#auId', 'Arjin'); await M.fill('#auPw', 'hunter22'); await M.click('form[data-form=login] button[type=submit]');
await M.waitForSelector('#acctChip .chipbtn'); await M.click('#acctChip .chipbtn'); await M.waitForSelector('.profhero'); await M.waitForTimeout(400); await shot(M, 'profile-phone');
await browser.close(); await pool.end();
