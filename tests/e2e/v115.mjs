import {LAUNCH, SHOTS} from './lib.mjs';
// v1.15: five-step rules on the home screen, full rules on request, the in-game rules window; language landing pages
import {chromium} from 'playwright';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
const BASE = 'http://127.0.0.1:8787/';
const browser = await chromium.launch(LAUNCH);
async function page(lang, w = 1280, h = 900) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1.5});
  await ctx.addInitScript(l => { try { localStorage.setItem('hs-lang', l); localStorage.setItem('cp-tips', '{"off":true}'); } catch (e) {} }, lang);
  const p = await ctx.newPage(); p.on('pageerror', e => console.log(lang, 'PAGEERROR', e.message));
  await p.route(/supabase|fonts\./, r => r.abort());
  await p.goto(BASE); await p.waitForTimeout(600); return p;
}
for (const l of ['tr', 'en', 'es', 'pt', 'fr', 'de']) {
  const p = await page(l);
  const n = await p.$$eval('#rulesShort li', a => a.filter(li => li.getBoundingClientRect().height > 0).length);
  ok(n === 5, `${l}: five short steps shown on the home screen`);
  ok(!(await p.isVisible('#rulesList')), `${l}: full rules folded`);
  if (l === 'tr') {
    await p.locator('#rulesShort').scrollIntoViewIfNeeded(); await p.screenshot({path: SHOTS + 'v115-home.png', fullPage: true});
    await p.click('#rulesBox .rmore > summary'); await p.waitForTimeout(200);
    ok(await p.isVisible('#rulesList') && await p.isVisible('#seoAbout'), 'full rules and the about text open on request');
    ok((await p.textContent('#seoAbout')).split(/\s+/).length > 250, 'about text is the longer SEO version');
    await p.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); });
    await p.fill('#nm', 'Arjin'); await p.click('[data-a=create]'); await p.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
    await p.click('[data-a=addbot]'); await p.waitForTimeout(300); await p.click('[data-a=start]'); await p.waitForSelector('#game:not([hidden])');
    await p.waitForTimeout(2500); await p.click('#center').catch(() => {}); await p.waitForTimeout(800);
    ok(await p.isVisible('#rulesBtn'), 'rules button in the game bar');
    await p.click('#rulesBtn'); await p.waitForTimeout(200);
    ok(await p.isVisible('#rulesModal') && (await p.$$('#rulesShortG li')).length === 5, 'rules window opens with the five steps');
    ok(!(await p.isVisible('#rulesListG')) && !(await p.isVisible('#rulesLegend')), 'squares/cards and full rules folded in the window');
    await p.screenshot({path: SHOTS + 'v115-game-rules.png'});
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(!(await p.isVisible('#rulesModal')), 'Esc closes the rules window');
    await p.keyboard.press('e'); await p.waitForTimeout(300); ok(await p.evaluate(() => document.body.classList.contains('tablog')), 'keys still work after closing');
  }
  await p.context().close();
}
// phone width: nothing sticks out
const m = await page('de', 375, 760);
ok(await m.evaluate(() => document.documentElement.scrollWidth <= 375), 'phone: no sideways scroll');
await m.screenshot({path: SHOTS + 'v115-phone.png', fullPage: true});
// language landing pages
for (const u of ['es/juego-de-mesa-online-con-amigos', 'es/juego-tipo-monopoly-online', 'pt/jogo-de-tabuleiro-online-com-amigos', 'pt/jogo-parecido-com-banco-imobiliario-online',
  'fr/jeu-de-societe-en-ligne-entre-amis', 'fr/jeu-type-monopoly-en-ligne', 'de/online-brettspiel-mit-freunden', 'de/spiel-wie-monopoly-online', 'online-board-game-with-friends', 'tr/monopoly-benzeri-online-oyun']) {
  const r = await fetch(BASE + u); const h = await r.text();
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x => JSON.parse(x[1]));
  ok(r.ok && (h.match(/hreflang=/g) || []).length >= 7 && ld.flat().flatMap(j => j['@graph'] || [j]).some(j => j['@type'] === 'VideoGame'), `landing /${u}: 200, hreflang set, VideoGame data`);
}
await browser.close();
