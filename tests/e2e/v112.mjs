import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const b = await chromium.launch(LAUNCH);
async function page(w = 1300) {
  const ctx = await b.newContext({viewport: {width: w, height: 850}, locale: 'tr-TR'});
  await ctx.addInitScript(() => { try { localStorage.setItem('hs-lang', 'tr'); localStorage.setItem('cf-tips', 'off'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route(/supabase/, r => r.abort()); await p.goto('http://127.0.0.1:8787/?debug=1'); await p.waitForTimeout(700); return p;
}
// ---- keyboard in a solo game
const K = await page();
await K.click('[data-a=solo]'); await K.click('[data-a=soloN][data-n="2"]'); await K.click('[data-a=sstart]'); await K.waitForSelector('#game:not([hidden])'); await K.waitForTimeout(800);
await K.waitForTimeout(2500); ok((await K.textContent('#actions')).includes('Boşluk'), 'keyboard hint shown');
let rolled = false, chose = false;
for (let k = 0; k < 40 && !(rolled && chose); k++) {
  const s = await K.evaluate(() => { const S = window.__cf.state(); const me = S.pl.findIndex(q => q.id === 'L0'); const a = document.querySelector('#actions'); return {my: S.cur === me || (S.tq && false), roll: !!a.querySelector('[data-a=roll]:not([disabled])'), ch: a.querySelectorAll('.choices button:not([disabled])').length, pop: !document.querySelector('#pop').hidden}; });
  if (s.pop) { const before = await K.evaluate(() => window.__cf.state().ev); await K.keyboard.press('Space'); await K.waitForTimeout(1500); rolled = rolled || (await K.evaluate(() => window.__cf.state().ev)) > before; continue; }
  if (s.roll) { const before = await K.evaluate(() => window.__cf.state().ev); await K.keyboard.press('Space'); await K.waitForTimeout(1500); rolled = rolled || (await K.evaluate(() => window.__cf.state().ev)) > before; continue; }
  if (s.ch) { ok(await K.evaluate(() => !!document.querySelector('#actions .choices .kn')), 'choices numbered'); const before = await K.evaluate(() => window.__cf.state().ev); await K.keyboard.press('1'); await K.waitForTimeout(1500); chose = chose || (await K.evaluate(() => window.__cf.state().ev)) > before; continue; }
  await K.waitForTimeout(500);
}
ok(rolled, 'Space rolls the dice'); ok(chose, 'number key picks a move');
// ---- quick play: waiting ring, bots after 30 s, no code join
const A = await page();
await A.click('[data-a=quick]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 20000});
ok(await A.isVisible('#pubWait') && (await A.textContent('#pubWait')).trim() === 'Oyuncular aranıyor…', 'waiting ring, no countdown: ' + (await A.textContent('#pubWait')).trim());
ok(!(await A.isVisible('#lobby .codebox')), 'no room code at a Quick play table');
const code = await A.evaluate(() => { const c = document.querySelector('#roomChip').textContent; return window.__cf.state() && [...document.querySelectorAll('*')].length && (window.__code || null); });
const pubCode = await A.evaluate(() => { try { return JSON.parse(localStorage.getItem('hs-last')).code; } catch (e) { return null; } });
const B = await page();
await B.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await B.fill('#code', pubCode); await B.click('[data-a=join]');
await B.waitForTimeout(4000);
ok((await B.textContent('#home')).includes('Hızlı oyun masası'), 'joining a Quick play table with its code is refused');
await A.waitForTimeout(31500);
const n1 = await A.evaluate(() => window.__cf.state().pl.filter(q => q.bot).length);
ok(n1 >= 1, 'first bot after 30 s (' + n1 + ')');
await A.screenshot({path: SHOTS + 'v112-wait.png'});
await A.waitForTimeout(13000);
const w = await A.evaluate(() => { const s = window.__cf.state(); return {ph: s.ph, n: s.pl.length}; });
ok(w.ph === 'lobby' && w.n === 4, 'full table waits for the player to be ready ' + JSON.stringify(w));
await A.click('#readyBtn'); await A.waitForTimeout(1500);
const st = await A.evaluate(() => { const s = window.__cf.state(); return {ph: s.ph, n: s.pl.length, bots: s.pl.filter(q => q.bot).length}; });
ok(st.ph !== 'lobby' && st.n === 4 && st.bots === 3, 'table filled with bots and started ' + JSON.stringify(st));
await b.close();
