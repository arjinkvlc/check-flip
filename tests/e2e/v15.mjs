import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import {handle, pool} from './mocksb.mjs';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
await pool.query('delete from public.login_attempts; delete from auth.users;');
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
const shot = (p, n) => p.screenshot({path: SHOTS + `v15-${n}.png`});
// ---- username filter
const A = await page();
await A.click('[data-a=authSignup]'); await A.fill('#auName', 'H1tler'); await A.waitForTimeout(300);
ok((await A.textContent('#auNameChk')).includes('izin'), 'blocked name flagged while typing');
await A.fill('#auPw', 'hunter22'); await A.fill('#auPw2', 'hunter22'); await A.check('#auConsent'); await A.click('form[data-form=signup] button[type=submit]');
await A.waitForSelector('#authBox .err'); ok((await A.textContent('#authBox .err')).includes('izin verilmiyor'), 'blocked name refused on sign-up');
// server refuses too (bypassing the client check)
const srv = await A.evaluate(async () => { const r = await fetch('https://dwygwflbzxrqworyikzw.supabase.co/rest/v1/rpc/username_available', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({p_username: 'orospu1'})}); return r.json(); });
ok(srv === false, 'server says blocked name is not available');
await A.fill('#auName', 'Arjin'); await A.fill('#auPw', 'hunter22'); await A.fill('#auPw2', 'hunter22'); if (!(await A.isChecked('#auConsent'))) await A.check('#auConsent'); await A.click('form[data-form=signup] button[type=submit]'); await A.waitForSelector('#acctChip .chipbtn', {timeout: 8000});
await pool.query("update public.profiles set xp = 12000 where username = 'Arjin'");
await A.evaluate(async () => (await import('/js/account.js')).refreshProfile());
await A.click('#acctChip .chipbtn'); await A.click('[data-a=profTab][data-t=dice]'); await A.waitForTimeout(300);
ok((await A.$$('.dprev')).length === 12, 'dice skins listed (8 + 4 event dice)'); await shot(A, 'dice-tab');
await A.click('[data-a=equip][data-kind=dice][data-key=chelsea]'); await A.waitForTimeout(600);
ok(await A.evaluate(async () => (await import('/js/account.js')).equipped().dice) === 'chelsea', 'chelsea dice equipped');
await A.click('#profile [data-a=profBack]');
// ---- solo: dice skin, hidden bot hands, full hand choice
await A.click('[data-a=solo]'); await A.click('[data-a=soloN][data-n="3"]'); await A.click('[data-a=sstart]'); await A.waitForTimeout(1500);
await A.evaluate(() => { const S = window.__cf.state(); S.pl.forEach((q, i) => { if (q.bot) q.c = ['B8', 'A10']; }); });
let hid = 0, swapped = false, seenChelsea = false; const t0 = Date.now();
while (Date.now() - t0 < 160000 && !swapped) {
  await A.evaluate(() => { const S = window.__cf.state(); const me = S.pl.findIndex(q => !q.bot); if (S.pl[me].c.length < 2 && !S.pend) S.pl[me].c = ['B8', 'A10']; if (S.dA.length < 4) S.dA = Array(20).fill('A12'); });
  hid = Math.max(hid, (await A.$$('#players .card.hid')).length);
  if (await A.evaluate(() => { const S = window.__cf.state(); return S.ph === 'play' && !S.pl[S.ord[S.cur]].bot && document.querySelector('#dice').dataset.skin === 'chelsea'; })) seenChelsea = true;
  const sw = await A.$('.swapbox [data-a=swap][data-drop="0"]');
  if (sw) { await shot(A, 'swap'); await sw.click(); await A.waitForTimeout(800); const c = await A.evaluate(() => { const S = window.__cf.state(); return S.pl.find(q => !q.bot).c; }); ok(c.length === 2 && c[0] !== 'B8', 'full hand: dropped the first card for the new one ' + JSON.stringify(c)); swapped = true; break; }
  const pop = await A.evaluate(() => { const p = document.querySelector('#pop'); return p && !p.hidden; });
  const btn = await A.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])');
  if (pop) await A.click('#center').catch(() => {}); else if (btn) await btn.click().catch(() => {});
  await A.waitForTimeout(300);
}
ok(swapped, 'full-hand choice shown');
const skins = await A.evaluate(() => document.querySelector('#dice').dataset.skin); ok(seenChelsea, 'my turn shows my chelsea dice'); await shot(A, 'game-dice');
ok(hid >= 2, 'bot hands shown as ? (' + hid + ')');
await A.click('[data-a=leave]').catch(() => {}); await A.click('#askYes', {timeout: 1500}).catch(() => {});
// ---- chat censor between two players
const B = await page();
await A.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
const code = (await A.textContent('#lobbyCode')).trim();
await B.fill('#nm', 'Siktir_Git');
await B.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await B.fill('#code', code); await B.click('[data-a=join]'); await B.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await A.waitForTimeout(800); ok(!(await A.textContent('#lobbyList')).toLowerCase().includes('siktir'), 'blocked nickname replaced');
await A.click('[data-a=start]'); await B.waitForSelector('#game:not([hidden])', {timeout: 10000});
await B.fill('#chatIn', 'amk bu ne zar, siktir'); await B.press('#chatIn', 'Enter'); await A.waitForTimeout(1200);
const ct = await A.textContent('#chatList'); ok(ct.includes('***') && !ct.includes('siktir'), 'chat censored: ' + ct.slice(-40));
// ---- phone: leave button + settings menu
const M = await page(390, 844);
await M.click('[data-a=solo]'); await M.click('[data-a=sstart]'); await M.waitForTimeout(1500);
const lb = await M.$eval('#leaveBtn', e => { const r = e.getBoundingClientRect(); return {vis: r.width > 0 && r.right <= innerWidth + 1, right: r.right}; });
ok(lb.vis, 'leave button visible on phone ' + JSON.stringify(lb));
ok(await M.isVisible('#setBtn'), 'settings button in header');
await M.click('#setBtn'); await M.waitForTimeout(300); ok(await M.isVisible('#musicBtn') && await M.isVisible('#setLangSel'), 'settings open'); await shot(M, 'phone-menu');
await M.click('[data-a=setClose]'); await M.waitForTimeout(300); ok(!(await M.isVisible('#musicBtn')), 'settings close');
await browser.close(); await pool.end();
