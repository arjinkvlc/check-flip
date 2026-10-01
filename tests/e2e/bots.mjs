import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const browser = await chromium.launch(LAUNCH);
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
async function player(name, w = 1200, h = 900) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}});
  await ctx.addInitScript(() => { try { localStorage.setItem('hs-lang', 'en'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(name, 'PAGEERROR', e.message));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.route(/supabase|fonts\./, r => r.abort());
  await p.goto('http://127.0.0.1:8787/'); await p.fill('#nm', name); return p;
}
const A = await player('Alice'), B = await player('Bob');
await A.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
const code = (await A.textContent('#lobbyCode')).trim();
await A.click('#lobbyAv [data-k=waitress]'); await A.waitForTimeout(300);
ok(await A.$('#lobbyAv [data-k=italian][disabled]') != null, 'locked avatar not selectable as guest');
await A.click('[data-a=addbot]'); await A.waitForTimeout(400); await A.click('[data-a=addbot]'); await A.waitForTimeout(400);
ok((await A.$$('#lobbyList .rmbot')).length === 2, 'host added two bots');
await A.click('.rmbot'); await A.waitForTimeout(400);
ok((await A.$$('#lobbyList .rmbot')).length === 1, 'host removed a bot');
await B.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await B.fill('#code', code); await B.click('[data-a=join]'); await B.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await B.waitForFunction(() => document.querySelectorAll('#lobbyList li:not(.note)').length === 3, null, {timeout: 8000});
ok(!(await B.$('[data-a=addbot]')), 'only the host can add bots');
await A.screenshot({path: SHOTS + 'bots-lobby.png', fullPage: true});
await A.click('[data-a=start]'); await B.waitForSelector('#game:not([hidden])', {timeout: 10000});
const botName = await A.evaluate(() => [...document.querySelectorAll('#players li')].find(li => li.textContent.includes('bot'))?.querySelector('.pn')?.textContent);
async function step() { for (const p of [A, B]) { await p.click('#center').catch(() => {}); const btn = await p.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])'); if (btn) { await btn.click().catch(() => {}); return; } } }
for (let k = 0; k < 30; k++) { await step(); await A.waitForTimeout(700); }
const log = await B.textContent('#log');
ok(botName && log.includes(botName), 'bot is playing in the online room (' + botName + ')');
ok(!(await B.textContent('#players')).includes('disconnected'), 'bot not shown as disconnected');
await B.screenshot({path: SHOTS + 'bots-game.png'});
await browser.close();
