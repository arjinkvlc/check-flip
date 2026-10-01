import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const SH = SHOTS; (await import('fs')).mkdirSync(SH, {recursive: true});
const browser = await chromium.launch(LAUNCH);
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
async function player(name, lang = 'tr', w = 1280, h = 860, theme) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1.5});
  await ctx.addInitScript(([l, th]) => { try { localStorage.setItem('hs-lang', l); if (th) localStorage.setItem('cf-theme', th); } catch (e) {} }, [lang, theme]);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(name, 'PAGEERROR', e.message));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.route(/supabase|fonts\./, r => r.abort());
  await p.goto('http://127.0.0.1:8787/'); await p.fill('#nm', name); return p;
}
const A = await player('Arjin');
await A.screenshot({path: SH + 'home.png'});
ok(await A.$$eval('#hRing .sqi', l => l.length) > 30, 'home board uses drawn icons');
await A.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); });
await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await A.click('[data-a=addbot]'); await A.waitForTimeout(400); await A.click('[data-a=start]');
await A.waitForSelector('#game:not([hidden])');
ok(await A.$$eval('#board .cell .sqi', l => l.length) === 36, 'board: 36 drawn icons (4 empty squares)');
// tip must stay put: sample it over a few seconds while the game runs
const seen = [];
for (let k = 0; k < 16; k++) { seen.push(await A.evaluate(() => { const t = document.querySelector('#actions .tip'); return t ? t.dataset.still + (t.classList.contains('still') ? '' : '*') : '-'; })); await A.waitForTimeout(250); }
console.log('tip samples', seen.join(' '));
await A.screenshot({path: SH + 'game.png'});
// E key opens events, C (online) chat
await A.click('#center').catch(() => {}); await A.keyboard.press('e'); await A.waitForTimeout(300);
ok(await A.evaluate(() => document.body.classList.contains('tablog')), 'E opens the Events tab');
await A.keyboard.press('c'); await A.waitForTimeout(400); await A.keyboard.press('Escape');
ok(await A.evaluate(() => !document.body.classList.contains('tablog')), 'C opens the chat tab');
const tabTxt = await A.evaluate(() => getComputedStyle(document.querySelector('.sidetabs .stab[data-t=log]'), '::after').content);
ok(tabTxt.includes('(E)'), 'Events tab shows (E): ' + tabTxt);
// quick messages menu
ok(await A.evaluate(() => getComputedStyle(document.querySelector('#quickChat')).display === 'none'), 'quick messages folded on desktop');
await A.click('.qcbtn'); await A.waitForTimeout(200);
const qn = await A.evaluate(() => [...document.querySelectorAll('#quickChat .qchip')].filter(b => b.getBoundingClientRect().height > 0).length);
ok(qn >= 6, 'quick message list opens with all ' + qn + ' lines');
await A.screenshot({path: SH + 'quickmenu.png'});
await A.click('#quickChat .qchip'); await A.waitForTimeout(300);
ok(await A.evaluate(() => !document.body.classList.contains('qcopen')), 'list closes after sending');
ok((await A.textContent('#chatList')).length > 5, 'quick message sent');
ok((await A.textContent('#roomChip')).includes('Oda'), 'private room chip keeps the code');
// play on a bit so the dinner marker and cards show
for (let k = 0; k < 40; k++) { await A.click('#center').catch(() => {}); const b = await A.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])'); if (b) await b.click().catch(() => {}); await A.waitForTimeout(350); }
await A.screenshot({path: SH + 'game2.png'});
await A.evaluate(() => document.documentElement.dataset.theme = 'dark'); await A.waitForTimeout(200);
await A.screenshot({path: SH + 'game-dark.png'});
// mobile: the quick row is still there, no menu button
const M = await player('Mobil', 'tr', 390, 800);
ok(await M.evaluate(() => getComputedStyle(document.querySelector('.qcbtn')).display === 'none'), 'phones keep the scrolling quick row');
await browser.close();
