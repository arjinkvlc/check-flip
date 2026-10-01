import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import {handle, pool} from './mocksb.mjs';
const BASE = 'http://127.0.0.1:8787/?debug=1';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch(LAUNCH);
async function page(theme, lang = 'tr', w = 1440, h = 900) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, colorScheme: theme});
  await ctx.addInitScript(l => { try { localStorage.setItem('hs-lang', l); } catch (e) {} }, lang);
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console.error', m.text()); });
  await p.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await p.route('https://cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({path: 'node_modules/@supabase/supabase-js/dist/umd/supabase.js', contentType: 'application/javascript'}));
  await p.route('https://cdn.jsdelivr.net/npm/mqtt**', r => r.fulfill({path: 'node_modules/mqtt/dist/mqtt.min.js', contentType: 'application/javascript'}));
  await p.goto(BASE); await p.waitForTimeout(1500); return p;
}
const shot = (p, n) => p.screenshot({path: SHOTS + `v13-${n}.png`});
for (const th of ['light', 'dark']) {
  const p = await page(th);
  ok(await p.evaluate(() => document.documentElement.dataset.theme) === th, 'theme follows system: ' + th);
  await shot(p, `home-${th}`);
  await p.click('[data-a=friendsPlay]'); await p.waitForTimeout(300); ok(await p.isVisible('#btnCreate'), 'room panel opens');
  await p.click('[data-a=solo]'); await p.click('[data-a=sstart]'); await p.waitForTimeout(2500);
  for (let i = 0; i < 3; i++) { await p.click('#center').catch(() => {}); await p.waitForTimeout(700); }
  await shot(p, `game-${th}`);
  const m = await p.evaluate(async () => (await import('/js/music.js')).Music.current);
  ok(m === 'game', 'music scene in game: ' + m);
  await p.click('[data-a=leave]').catch(() => {}); await p.click('#askYes', {timeout: 1500}).catch(() => {}); await p.waitForTimeout(500);
  const m2 = await p.evaluate(async () => (await import('/js/music.js')).Music.current);
  ok(m2 === 'menu', 'music scene back on menu: ' + m2);
  const ph = await page(th, 'tr', 390, 844);
  await shot(ph, `phone-home-${th}`);
  await ph.click('[data-a=solo]'); await ph.click('[data-a=sstart]'); await ph.waitForTimeout(2500);
  for (let i = 0; i < 3; i++) { await ph.click('#center').catch(() => {}); await ph.waitForTimeout(700); }
  await shot(ph, `phone-game-${th}`);
}
// toggle persists
const q = await page('light');
await q.click('#setBtn'); await q.click('[data-a=setTheme][data-t=dark]'); ok(await q.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'toggle to dark');
await q.reload(); await q.waitForTimeout(800); ok(await q.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme remembered after reload');
await browser.close(); await pool.end();
