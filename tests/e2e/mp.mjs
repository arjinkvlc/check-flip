import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const BASE = 'http://127.0.0.1:8787/';
const browser = await chromium.launch(LAUNCH);
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
async function player(name) {
  const ctx = await browser.newContext({viewport: {width: 1200, height: 900}});
  await ctx.addInitScript(() => { try { localStorage.setItem('hs-lang', 'en'); } catch (e) {} });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log(name, 'PAGEERROR', e.message));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.route('https://cdn.jsdelivr.net/npm/@supabase/**', r => r.abort());
  await p.route(/fonts\./, r => r.abort());
  let hubMsgs = 0; p.on('websocket', ws => { if (ws.url().includes('/ws?hub=')) ws.on('framesent', () => hubMsgs++); });
  p.hubCount = () => hubMsgs;
  await p.goto(BASE); await p.fill('#nm', name);
  return p;
}
const A = await player('Alice'), B = await player('Bob');
// private room
await A.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
const code = (await A.textContent('#lobbyCode')).trim(); ok(/^[A-Z0-9]{5}$/.test(code), 'room created on own server: ' + code);
await B.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await B.fill('#code', code); await B.click('[data-a=join]'); await B.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await A.waitForFunction(() => document.querySelectorAll('#lobbyList li:not(.note)').length === 2, null, {timeout: 10000});
ok(true, 'second player joined the room');
await B.click('#lobbyAv [data-k=student]'); await A.waitForTimeout(800);
ok(await A.evaluate(() => document.querySelector('#lobbyList').innerHTML.includes('avatars/student.svg')), 'avatar choice relayed to host');
await A.click('[data-a=start]'); await B.waitForSelector('#game:not([hidden])', {timeout: 10000}); ok(true, 'game started on both');
// chat
await B.click('[data-a=stab][data-t=chat]').catch(() => {}); await B.fill('#chatIn', 'hello from bob'); await B.press('#chatIn', 'Enter');
await A.waitForFunction(() => document.querySelector('#chatList').textContent.includes('hello from bob'), null, {timeout: 8000}); ok(true, 'chat relayed');
// play a few turns: whoever's turn it is clicks the first enabled action button
async function step() {
  for (const p of [A, B]) {
    await p.click('#center').catch(() => {});
    const btn = await p.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])');
    if (btn) { await btn.click().catch(() => {}); return true; }
  }
  return false;
}
for (let k = 0; k < 14; k++) { await step(); await A.waitForTimeout(900); }
let dayA = '', dayB = '';
for (let k = 0; k < 16 && (!dayA || dayA !== dayB); k++) { await A.click('#center').catch(() => {}); await B.click('#center').catch(() => {}); await A.waitForTimeout(700); dayA = await A.textContent('#cDay'); dayB = await B.textContent('#cDay'); }
ok(dayA === dayB, `both see the same state (${dayA} / ${dayB})`);
// host leaves → Bob takes over
await A.close();
await B.waitForFunction(() => document.querySelector('#log').textContent.includes('is now running the room'), null, {timeout: 20000}).then(() => ok(true, 'host migration after host left'), () => ok(false, 'host migration'));
console.log('frames sent by Bob to the relay:', B.hubCount());
// quick play: two new players meet at a public table
const C = await player('Cara'), D = await player('Dan');
await C.click('[data-a=quick]'); await C.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await C.waitForTimeout(1000);
await D.click('[data-a=quick]'); await D.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
const cc = (await C.textContent('#roomChip')), dc = (await D.textContent('#roomChip'));
ok(cc === dc, `quick play matched players at the same table (${cc} / ${dc})`);
await D.screenshot({path: SHOTS + 'mp-quick.png'});
await browser.close();
