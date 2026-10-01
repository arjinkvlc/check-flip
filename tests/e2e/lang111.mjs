import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const b = await chromium.launch(LAUNCH);
async function open(locale, pre) {
  const ctx = await b.newContext({locale, viewport: {width: 1300, height: 850}});
  if (pre) await ctx.addInitScript(pre);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route(/supabase/, r => r.abort()); await p.goto('http://127.0.0.1:8787/?debug=1'); await p.waitForTimeout(900); return p;
}
for (const [loc, want, word] of [['es-MX', 'es', 'Partida'], ['pt-BR', 'pt', 'Jogo'], ['fr-FR', 'fr', 'Partie'], ['de-DE', 'de', 'Spiel'], ['tr-TR', 'tr', 'Hızlı'], ['ja-JP', 'en', 'Quick']]) {
  const p = await open(loc);
  const l = await p.evaluate(() => document.documentElement.lang);
  ok(l === want, `${loc} browser → ${l}`);
  const txt = await p.textContent('#home');
  ok(txt.includes(word), `${want} home text: ${(await p.textContent('.bigplay b')).trim()}`);
  await p.close();
}
// English browser from Türkiye → Turkish (country cached as if Cloudflare said TR)
{ const p = await open('en-US', () => { try { localStorage.setItem('cf-cc', 'TR'); } catch (e) {} });
  ok(await p.evaluate(() => document.documentElement.lang) === 'tr', 'English browser in Türkiye → Turkish'); await p.close(); }
{ const p = await open('en-US', () => { try { localStorage.setItem('cf-cc', 'US'); } catch (e) {} });
  ok(await p.evaluate(() => document.documentElement.lang) === 'en', 'English browser in the US → English'); await p.close(); }
// switch language in Settings, play a few moves in German
const p = await open('en-US', () => { try { localStorage.setItem('cf-cc', 'US'); localStorage.setItem('cf-tips', 'off'); } catch (e) {} });
await p.click('#setBtn'); await p.selectOption('#setLangSel', 'de'); await p.waitForTimeout(600);
ok(await p.evaluate(() => document.documentElement.lang) === 'de' && (await p.textContent('#setModal')).includes('Sprache'), 'Settings list switches to German');
await p.click('[data-a=setClose]');
await p.click('[data-a=solo]'); await p.click('[data-a=soloN][data-n="3"]'); await p.click('[data-a=sstart]'); await p.waitForSelector('#game:not([hidden])');
for (let k = 0; k < 25; k++) { const btn = await p.$('#actions button.btn.primary:not([disabled]), #actions .choices button:not([disabled])'); if (btn) await btn.click().catch(() => {}); await p.waitForTimeout(300); }
const log = await p.textContent('#log');
ok(!/undefined|\[object|NaN/.test(log) && log.length > 50, 'German game log reads fine: ' + log.slice(0, 120).replace(/\s+/g, ' '));
await p.screenshot({path: SHOTS + 'de-game.png'});
await p.reload(); await p.waitForTimeout(900);
ok(await p.evaluate(() => document.documentElement.lang) === 'de', 'choice remembered after reload');
await b.close();
