import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({viewport: {width: 1280, height: 860}, deviceScaleFactor: 1.5});
await ctx.addInitScript(() => { try { localStorage.setItem('hs-lang', 'tr'); localStorage.setItem('cp-tips', '{"off":true}'); } catch (e) {} });
const p = await ctx.newPage();
await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
await p.route(/supabase|fonts\./, r => r.abort());
await p.goto('http://127.0.0.1:8787/'); await p.fill('#nm', 'Arjin');
await p.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); });
await p.click('[data-a=create]'); await p.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
for (let i = 0; i < 3; i++) { await p.click('[data-a=addbot]'); await p.waitForTimeout(300); }
await p.click('[data-a=start]'); await p.waitForSelector('#game:not([hidden])');
let found = false;
for (let k = 0; k < 400 && !found; k++) { await p.click('#center').catch(() => {}); const b = await p.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled]), #actions .targets button:not([disabled])'); if (b) await b.click().catch(() => {}); await p.waitForTimeout(200); found = !!(await p.$('#players .card.hid .sqi')); }
console.log(found ? 'ok: hidden card shows the card icon' : 'FAIL: no hidden card seen'); if (!found) process.exitCode = 1;
await p.screenshot({path: SHOTS + 'hidden.png'});
await p.evaluate(() => document.documentElement.dataset.theme = 'dark'); await p.waitForTimeout(200);
await p.screenshot({path: SHOTS + 'hidden-dark.png'});
await browser.close();
