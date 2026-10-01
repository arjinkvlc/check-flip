import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import {execSync} from 'child_process';
import Aedes from 'aedes';
import {createServer} from 'aedes-server-factory';
const aedes = await Aedes.createBroker ? await Aedes.createBroker() : new Aedes();
const srv = createServer(aedes, {ws: true}); await new Promise(r => srv.listen(8883, r));
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const BASE = 'http://127.0.0.1:8787/?debug=1&brokers=ws://127.0.0.1:8883&mqttv=4';
const browser = await chromium.launch(LAUNCH);
let cut = false; const socks = [];
async function player(name) {
  const ctx = await browser.newContext({viewport: {width: 1300, height: 850}});
  if (name === 'Bob') await ctx.routeWebSocket(/\/ws\?hub=/, ws => { if (cut) { ws.close(); return; } ws.connectToServer(); socks.push(ws); });
  await ctx.addInitScript(() => { try { localStorage.setItem('hs-lang', 'en'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(name, 'PAGEERROR', e.message));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.route(/supabase|fonts\./, r => r.abort());
  await p.goto(BASE); await p.fill('#nm', name); return p;
}
const A = await player('Alice'), B = await player('Bob');
await A.evaluate(() => document.querySelector('#tileFriends').click()); await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
const code = (await A.textContent('#lobbyCode')).trim();
await B.evaluate(() => document.querySelector('#tileFriends').click()); await B.fill('#code', code); await B.click('[data-a=join]'); await B.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await A.waitForFunction(() => document.querySelectorAll('#lobbyList li:not(.note)').length === 2, null, {timeout: 8000});
await A.click('[data-a=start]'); await B.waitForSelector('#game:not([hidden])', {timeout: 10000});
async function step() { for (const p of [A, B]) { await p.click('#center').catch(() => {}); const b = await p.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])'); if (b) { await b.click().catch(() => {}); return; } } }
for (let k = 0; k < 6; k++) { await step(); await A.waitForTimeout(600); }
const rev0 = await B.evaluate(() => window.__cf.state().rev);
console.log('rev before relay goes down', rev0);
cut = true; socks.forEach(w => { try { w.close(); } catch (e) {} });
await A.waitForTimeout(14000);
ok(await A.evaluate(() => !!window.__cf), 'host still on relay');
const txt = await B.textContent('#actions'); console.log('B actions:', txt.slice(0, 90));
for (let k = 0; k < 16; k++) { await step(); await A.waitForTimeout(700); }
const rev1 = await B.evaluate(() => window.__cf.state().rev), revA = await A.evaluate(() => window.__cf.state().rev);
ok(rev1 > rev0 + 3 && rev1 === revA, `game continues over the backup (rev ${rev0} -> ${rev1}, host ${revA})`);
await B.fill('#chatIn', 'still here'); await B.press('#chatIn', 'Enter'); await A.waitForTimeout(1500);
ok((await A.textContent('#chatList')).includes('still here'), 'chat works over the backup');
ok(!(await A.textContent('#actions')).includes('Reconnecting') && !(await B.textContent('#actions')).includes('Reconnecting'), 'no one stuck on reconnecting');
await browser.close(); srv.close(); aedes.close();
