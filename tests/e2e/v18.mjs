import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const browser = await chromium.launch(LAUNCH);
async function open(path, locale) {
  const ctx = await browser.newContext({locale, viewport: {width: 1300, height: 850}});
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.route(/supabase|jsdelivr|fonts\./, r => r.abort());
  await p.goto('http://127.0.0.1:8787' + path); await p.waitForTimeout(900); return p;
}
let p = await open('/tr', 'en-US');
ok(await p.evaluate(() => document.documentElement.lang) === 'tr', '/tr opens in Turkish');
ok((await p.title()).includes('Kutu Oyunu'), 'Turkish title');
ok(await p.evaluate(() => !!document.querySelector('.bigplay') && getComputedStyle(document.querySelector('link[rel=stylesheet][href*=style]') ? document.body : document.body).fontFamily.length > 0), 'page renders');
ok(await p.evaluate(() => [...document.styleSheets].some(s => (s.href || '').endsWith('/css/style.css'))), 'styles load from /tr');
ok((await p.textContent('#seoAbout')).includes('Check Flip nedir'), 'about text Turkish');
p = await open('/', 'en-US');
ok(await p.evaluate(() => document.documentElement.lang) === 'en', '/ English for English browser');
ok((await p.textContent('#seoAbout')).includes('What is Check Flip'), 'about text English');
p = await open('/', 'tr-TR');
ok(await p.evaluate(() => document.documentElement.lang) === 'tr', '/ Turkish for Turkish browser');
ok((await p.evaluate(() => document.querySelector('meta[name=description]').content)).startsWith('Tarayıcıda'), 'meta description follows language');
await p.click('[data-a=rules]').catch(() => {}); await p.waitForTimeout(300);
await p.screenshot({path: SHOTS + 'v18-rules.png', fullPage: true});
await browser.close();
