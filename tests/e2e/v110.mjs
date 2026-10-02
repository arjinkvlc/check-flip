import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
import http from 'node:http';
import {handle, pool} from './mocksb.mjs';
import * as E from '../../public/js/engine.js';
const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) process.exitCode = 1; };
// the Worker (wrangler dev, .dev.vars) asks this stand-in for my_status
const srv = http.createServer(async (rq, rs) => {
  let body = ''; for await (const ch of rq) body += ch;
  const fake = {url: () => 'http://127.0.0.1:8899' + rq.url, method: () => rq.method, postData: () => body || null, headers: () => Object.fromEntries(Object.entries(rq.headers))};
  const r = await handle(fake); rs.writeHead(r.status, Object.assign({'content-type': r.contentType || 'application/json'}, r.headers || {})); rs.end(r.body || '');
}).listen(8899);
await pool.query('delete from public.chat_reports; delete from public.sanctions; delete from public.metric_events; delete from public.admins; delete from auth.users;');

// ---- engine: tonight's venue is announced at the start of the day and used for dinner
{ const S = E.newState(); ['a', 'b'].forEach(id => E.addPlayer(S, id, id)); E.startGame(S);
  ok(S.dv != null && E.VENUES[S.dv], 'dinner venue drawn at day start (' + S.dv + ')');
  const dv = S.dv; S.ti = 0; E.feast(S); ok(S.fe.v === dv, 'dinner is at the announced venue'); }

const browser = await chromium.launch(LAUNCH);
const external = [];
async function page(opts = {}) {
  const ctx = await browser.newContext({viewport: {width: opts.w || 1300, height: opts.h || 850}});
  await ctx.addInitScript(() => { try { localStorage.setItem('hs-lang', 'tr'); localStorage.setItem('cf-tips', 'off'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('request', r => { const u = r.url(); if (!/^http:\/\/127\.0\.0\.1|^ws:|^data:|supabase\.co/.test(u)) external.push(u); });
  await p.route('https://dwygwflbzxrqworyikzw.supabase.co/**', async r => r.fulfill(await handle(r.request())));
  await p.goto('http://127.0.0.1:8787/?debug=1'); await p.waitForTimeout(700); return p;
}
async function signup(p, name) {
  await p.waitForSelector('#acct .acctguest'); await p.click('[data-a=authSignup]');
  await p.fill('#auName', name); await p.fill('#auPw', 'hunter22'); await p.fill('#auPw2', 'hunter22'); await p.check('#auConsent');
  await p.click('form[data-form=signup] button[type=submit]'); await p.waitForSelector('#acctChip .chipbtn', {timeout: 8000});
}

// ---- self-hosted fonts and libraries
const G = await page();
ok(await G.evaluate(() => !!window.supabase && !!window.mqtt), 'libraries load from our own site');
ok(await G.evaluate(() => document.fonts.check('800 20px "Baloo 2"') || [...document.fonts].some(f => f.family.includes('Baloo'))), 'fonts from our own site');
// ---- solo game: dinner venue shown, end of game buttons
await G.click('[data-a=solo]'); await G.click('[data-a=soloN][data-n="3"]'); await G.click('[data-a=sstart]'); await G.waitForSelector('#game:not([hidden])'); await G.waitForTimeout(600);
ok(await G.isVisible('#cDin') && (await G.textContent('#cDin')).includes('Bu akşamki yemek'), 'tonight\'s dinner shown in the centre: ' + await G.textContent('#cDin'));
ok(await G.$('.cell.dinner') != null, 'dinner venue marked on the board');
const gid1 = await G.evaluate(() => window.__cf.state().gid);
await G.evaluate(() => window.__cf.endGame());
// slower machines (GitHub runners) need more than a fixed 2.5 s for the end screen: wait for it, up to 15 s
const endOk = await G.waitForFunction(() => { const t = document.querySelector('#actions').textContent; return t.includes('Yeni oyuna başla') && t.includes('Menüye dön'); }, null, {timeout: 15000}).then(() => true, () => false);
ok(endOk, 'end of game: new game + back to menu' + (endOk ? '' : ': ' + (await G.textContent('#actions')).slice(0, 160)));
await G.click('#actions [data-a=restart]'); await G.waitForTimeout(800);
ok(await G.evaluate(g => { const s = window.__cf.state(); return s.gid && s.gid !== g && s.ph !== 'over'; }, gid1), 'new game with the same settings started');
await G.evaluate(() => window.__cf.endGame()); await G.waitForTimeout(2500);
await G.click('#actions [data-a=leave]'); await G.waitForTimeout(400);
ok(await G.isVisible('#home'), 'back to menu from the end screen');
ok(external.length === 0, 'no requests to other sites: ' + external.slice(0, 3).join(', '));

// ---- online room: signed chat, report, automatic ban, admin
const A = await page(), B = await page();
await signup(A, 'Anka'); await signup(B, 'Bulut');
await A.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await A.click('[data-a=create]'); await A.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
const code = (await A.textContent('#lobbyCode')).trim();
await B.evaluate(() => { if (document.querySelector('#roomPanel').hidden) document.querySelector('#tileFriends').click(); }); await B.fill('#code', code); await B.click('[data-a=join]'); await B.waitForSelector('#lobby:not([hidden])', {timeout: 15000});
await A.waitForTimeout(800);
const on = await (await fetch('http://127.0.0.1:8787/api/online')).json();
console.log('api/online', on);
await A.click('[data-a=start]'); await B.waitForSelector('#game:not([hidden])', {timeout: 10000}); await B.waitForTimeout(1200);
await B.evaluate(() => { const i = document.querySelector('#chatIn'); i.value = 'you are a fuck'; document.querySelector('#chatForm').requestSubmit(); });
await A.waitForSelector('#chatList li .repbtn', {timeout: 6000}).catch(() => {});
ok(await A.$('#chatList li .repbtn') != null, 'report button on a signed chat line');
await A.click('#chatList li .repbtn'); await A.click('#askYes'); await A.waitForTimeout(1500);
const sys = await A.textContent('#chatList');
ok(sys.includes('sohbet yasağı verildi'), 'blocked word → automatic chat ban');
const sn = (await pool.query("select s.kind, s.until > now() + interval '23 hours' as d1 from public.sanctions s join public.profiles p on p.id = s.user_id where p.username = 'Bulut'")).rows;
ok(sn.length === 1 && sn[0].kind === 'chat' && sn[0].d1, 'ban stored: chat 1 day');
// forged report is refused
const forged = await A.evaluate(async () => { const s = JSON.parse(localStorage.getItem('cp-auth')); const r = await fetch('https://dwygwflbzxrqworyikzw.supabase.co/rest/v1/rpc/report_chat', {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + s.access_token, apikey: 'x'}, body: JSON.stringify({p: {uid: '00000000-0000-0000-0000-000000000001', ts: Date.now(), room: 'ABCDE', text: 'fake', sig: 'deadbeef'}})}); return r.status; });
ok(forged >= 400, 'made-up report refused (' + forged + ')');
// B reconnects: the server knows about the ban, typing is locked
await B.reload(); await B.waitForTimeout(1500);
await B.click('[data-a=rejoin]').catch(() => {}); await B.waitForSelector('#game:not([hidden])', {timeout: 10000}).catch(() => {}); await B.waitForTimeout(2000);
ok(await B.evaluate(() => document.querySelector('#chatIn').disabled && !document.querySelector('#chatLock').hidden), 'banned player can\'t type: ' + await B.textContent('#chatLock'));
// admin
await pool.query("insert into public.admins (user_id) select id from public.profiles where username = 'Anka'");
await A.reload(); await A.waitForTimeout(1500);
await A.click('#setBtn'); ok(await A.isVisible('#adminBtn'), 'admin entry in settings');
await A.click('#adminBtn'); await A.waitForSelector('.admtable', {timeout: 6000}).catch(() => {});
const mt = await A.textContent('#adminBox');
ok(await A.$('.admtable') != null, 'admin numbers table');
await A.screenshot({path: SHOTS + 'v110-admin.png', fullPage: true});
await A.click('[data-a=admTab][data-t=reports]'); await A.click('[data-a=admStatus][data-s=auto]'); await A.waitForSelector('.admlist li', {timeout: 6000}).catch(() => {});
ok((await A.textContent('#adminBox')).includes('you are a fuck'), 'report visible to admin');
await A.screenshot({path: SHOTS + 'v110-reports.png', fullPage: true});
await A.click('[data-a=admTab][data-t=bans]'); await A.waitForSelector('[data-a=admLift]', {timeout: 6000});
await A.click('[data-a=admLift]'); await A.waitForTimeout(800);
ok((await pool.query('select count(*)::int n from public.sanctions where not lifted')).rows[0].n === 0, 'admin lifted the ban');
A.on('dialog', d => d.accept());
await A.fill('#admUser', 'Bulut'); await A.click('#admManual [data-a=admBan][data-k=account][data-d="7"]'); await A.waitForTimeout(800);
ok((await pool.query("select count(*)::int n from public.sanctions where kind = 'account' and not lifted")).rows[0].n === 1, 'admin gave a 7-day account ban');
await B.reload(); await B.waitForTimeout(2000);
ok(await B.isVisible('#askModal') && (await B.textContent('#askModal')).includes('askıya'), 'suspended account is told and signed out');
ok((await B.$('#acct .acctguest')) != null, 'suspended player is a guest now');
const me = (await pool.query("select kind, count(*)::int n from public.metric_events group by kind")).rows;
console.log('metrics', me);
ok(me.some(r => r.kind === 'visit') && me.some(r => r.kind === 'game_start') && me.some(r => r.kind === 'game_end'), 'visits and games counted');
await browser.close(); srv.close(); await pool.end();
