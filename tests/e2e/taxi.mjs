import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({viewport: {width: 1300, height: 850}});
await ctx.addInitScript(() => { try { localStorage.setItem('hs-lang', 'en'); localStorage.setItem('cf-tips', 'off'); } catch (e) {} });
const G = await ctx.newPage(); G.on('pageerror', e => console.log('PAGEERROR', e.message));
await G.route(/supabase|fonts\.|jsdelivr/, r => r.abort());
await G.goto('http://127.0.0.1:8787/?debug=1'); await G.waitForTimeout(600);
await G.click('[data-a=solo]'); await G.click('[data-a=soloN][data-n="2"]'); await G.click('[data-a=sstart]'); await G.waitForTimeout(1200);
await G.evaluate(() => { const S = window.__cf.state(); S.dA = Array(24).fill('A6'); });
const cellOf = () => G.evaluate(() => { const tk = document.querySelector('.tok[data-i]'); const all = [...document.querySelectorAll('.tok')]; return all.map(t => t.closest('.cell') && t.closest('.cell').querySelector('.no') ? t.closest('.cell').querySelector('.no').textContent + ':' + t.dataset.i : '').join(','); });
let seen = false; const t0 = Date.now();
while (Date.now() - t0 < 150000 && !seen) {
  await G.evaluate(() => { const S = window.__cf.state(); if (S.dA.length < 3) S.dA = Array(24).fill('A6'); });
  const popTxt = await G.evaluate(() => { const p = document.querySelector('#pop'); return p && !p.hidden ? p.textContent : ''; });
  if (/taxi/i.test(popTxt)) {
    const a = await cellOf(); await G.waitForTimeout(3000); const b = await cellOf();
    console.log('at card:', a, ' after:', b); ok(a !== b, 'token moves 4 squares after the taxi card is shown'); seen = true; break;
  }
  const btn = await G.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])');
  if (btn && !popTxt) await btn.click().catch(() => {}); else if (popTxt && !/taxi/i.test(popTxt)) await G.click('#center').catch(() => {});
  await G.waitForTimeout(250);
}
ok(seen, 'taxi card came up');
await browser.close();
