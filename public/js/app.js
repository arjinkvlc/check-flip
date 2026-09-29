/**
 * Check Flip — application layer:
 *  - multiplayer over MQTT (WebSocket, public broker)
 *  - animation queue, turn timer, bots (single player)
 *  - rendering, events, chat, emoji reactions, language switch
 */
import {
  COMS, UPC, COLLECT, CFG, N, autoMoney, LIM, COLORS, VENUES, VICON, KICON, BOARD, CARD_IDS, HOLD, KEEP, AVATARS, EMOJIS,
  cellIcon, venueIconAt, clamp, d6, shuffle, clean, uniqName, setAvatar,
  newState, addPlayer, L, rivals, worth, ownedBy, bill, act, actor, autoPick, checkStart, botDecide, botSide, standings, winners, isTeams, limits, modeOf
} from './engine.js';
import {SFX} from './sound.js';
import {nameBlocked, censor} from './filter.js';
import {HubClient, MultiClient, hubUrl, hubAvailable} from './net.js';
import './i18n-v11.js';
import './i18n-v13.js';
import './i18n-v15.js';
import './i18n-v16.js';
import './i18n-v17.js';
import './i18n-v18.js';
import './i18n-v19.js';
import './i18n-v110.js';
import './i18n-v111.js';
import {renderAdmin, adminClick, initAdminUI} from './admin-ui.js';
import {Music} from './music.js';
import {VERSION} from './version.js';
import {tipFor, tipHTML, tipSeen, tipsOff, tipsReset} from './tips.js';
import {shareResult} from './share.js';
import {initSocialUI, renderFriends, renderLeaders, renderInviteBox, updateToast, socialClick} from './social-ui.js';
import {canInstall, install, isIOS, onInstallChange} from './pwa.js';
import {ACC, initAccount, loggedIn, equipped, publicCard, submitResult, safeItem, unlocked, CATALOG, titleCls, setSocialGameCheck, onAccount, logEvent, reportChat, isAdmin} from './account.js';
import {initAccountUI, renderAcctPanel, renderAcctChip, renderAuth, renderProfile, resultHTML, accountClick, frCls, bbCls, AU} from './account-ui.js';
import {LANGS, LANG_NAMES, locale, i18nReady, getLang, setLang, t, tx, M, MM, sqName, sqDesc, venueName, cardName, cardDesc, avatarLabel, nickList, setVenueIconFn} from './i18n.js';
// the chosen language's texts must be ready before the first screen is drawn
await i18nReady;

setVenueIconFn(key => VICON[key] || '');
const $ = s => document.querySelector(s);
const rid = n => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(n)); for (const x of r) s += c[x % c.length]; return s; };
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const cellName = p => BOARD[p] === 'mekan' ? venueName(VENUES[p]) : sqName(BOARD[p]);
const cellDesc = p => sqDesc(BOARD[p]);
const vname = p => venueName(VENUES[p]);
const vfull = p => venueIconAt(p) + ' ' + vname(p);
const pct = r => Math.round(r * 100);

/* ================= networking (MQTT) ================= */
let S = null, mode = null, code = null, me = {pid: null, nm: ''}, mq = null, lost = false;
let lostAt = 0, fbBusy = false, fbDone = false;
let myN = 0, sentAt = 0, present = new Set(), lastHb = 0, joinedAt = 0;
const pres = new Map();
const ui = {muted: new Set(), screen: 'home', names: ['', ''], sel: null, err: '', quick: 0, joinMsg: ''};
// 'hub' = the game's own relay (Cloudflare Worker); public MQTT brokers are the fallback
const BROKERS = ['hub', 'wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
// local testing only: ?brokers=ws://127.0.0.1:8883&mqttv=4 swaps the public backup brokers for a local one
const DEVQ = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? new URLSearchParams(location.search) : null;
if (DEVQ && DEVQ.get('brokers')) BROKERS.splice(1, BROKERS.length - 1, ...DEVQ.get('brokers').split(','));
// topic prefix kept from the game's former name so running rooms stay compatible
const ROOT = 'checkplease/v1/', PUB = ROOT + '_pub/';
const T = x => ROOT + code + '/' + x;
const mqttOk = () => typeof window.mqtt !== 'undefined' && typeof window.mqtt.connect === 'function';
const netOk = () => hubAvailable() || mqttOk();
const isHost = () => mode === 'local' || (S && S.host === me.pid);
let solo = false; const hot = () => mode === 'local' && !solo;
// public profile card a player shows to the table: {u: username, lv, fr: frame, ti: title, bu: chat bubble}
function cleanCard(c) {
  if (!c || typeof c !== 'object' || typeof c.u !== 'string') return null;
  return {u: clean(c.u), lv: clamp(Math.floor(+c.lv) || 1, 1, 99), fr: safeItem('frame', c.fr), ti: safeItem('title', c.ti), bu: safeItem('bubble', c.bu), di: safeItem('dice', c.di)};
}
const myAvatarPref = () => { if (!loggedIn()) return null; const a = equipped().avatar; return a && AVATARS[a] ? a : null; };
// avatar illustration (public/assets/avatars/<key>.svg)
const avHTML = k => `<img class="avimg" src="assets/avatars/${k}.svg" alt="" draggable="false">`;
// can *I* pick this avatar? (locked ones need a level or an achievement)
const avOpen = k => unlocked('avatar', k);
const errMsg = e => (e && (e.message || e.type)) || t('eUnknown');
const newer = (a, b) => !b || (a.ep || 0) > (b.ep || 0) || ((a.ep || 0) === (b.ep || 0) && a.rev > b.rev);
const EXP = {messageExpiryInterval: 43200};
let myNick = '';
const pickNick = () => { const l = nickList(); myNick = l[Math.floor(Math.random() * l.length)]; };

function openBroker(ix, will) {
  return new Promise((res, rej) => {
    let c; const o = {clientId: 'cp_' + (me.pid || rid(8)) + '_' + rid(4), keepalive: 15, reconnectPeriod: 0, connectTimeout: 7000, protocolVersion: DEVQ && DEVQ.get('mqttv') === '4' ? 4 : 5, clean: true};
    if (will !== false && code) o.will = {topic: T('pres/' + me.pid), payload: '0', qos: 1, retain: true, properties: EXP};
    try {
      if (BROKERS[ix] === 'hub') {
        if (!hubAvailable()) throw new Error('no hub');
        c = new HubClient(hubUrl(code || '_pub'), o.will ? {topic: o.will.topic, payload: '0', retain: true, ttl: EXP.messageExpiryInterval} : null, () => code && loggedIn() ? ACC.token : null);
      } else {
        if (!mqttOk()) throw new Error('no mqtt');
        c = mqtt.connect(BROKERS[ix], o);
      }
    } catch (e) { rej(e); return; }
    let done = false; const fail = e => { if (done) return; done = true; clearTimeout(to); try { c.end(true); } catch (x) {} rej(e || new Error('connect failed')); };
    const to = setTimeout(() => fail(new Error('timeout')), 8000);
    c.once('connect', () => { if (done) return; done = true; clearTimeout(to); c.options.reconnectPeriod = 2000; res(c); });
    c.once('error', fail);
  });
}
function probeState(c, ms) {
  return new Promise(res => {
    let done = false; const top = T('state');
    const h = (tp, buf) => { if (tp !== top || done) return; done = true; c.removeListener('message', h); let m = null; try { m = JSON.parse(buf.toString()); } catch (e) {} res(m && typeof m === 'object' ? m : null); };
    c.on('message', h); c.subscribe(top, {qos: 1}); setTimeout(() => { if (!done) { done = true; c.removeListener('message', h); res(null); } }, ms);
  });
}
function listPub(c, ms) {
  return new Promise(res => {
    const out = {};
    const h = (tp, buf) => { if (!tp.startsWith(PUB)) return; const cd = tp.slice(PUB.length); const s = buf.toString(); if (!s) { delete out[cd]; return; }
      try { const m = JSON.parse(s); if (m && typeof m.n === 'number') out[cd] = {code: cd, n: m.n, t: +m.t || 0, m: m.m === 'quick' ? 'quick' : 'classic'}; } catch (e) {} };
    c.on('message', h); c.subscribe(PUB + '+', {qos: 1}); setTimeout(() => { c.removeListener('message', h); res(Object.values(out)); }, ms);
  });
}
function wire(c0) {
  const c = c0.kind === 'multi' ? c0 : new MultiClient(c0);
  mq = c; lost = false; lostAt = 0; fbDone = false; ui.fbAt = 0; joinedAt = Date.now(); lastHb = Date.now();
  c.on('message', (tp, buf, meta) => { if (!tp.startsWith(T(''))) return; const s = buf.toString(); if (!s) return; let m; try { m = JSON.parse(s); } catch (e) { return; } onMsg(tp.slice(T('').length), m, meta); });
  c.on('status', st => { const u = st.t === 'chatban' ? st.until : st.chatUntil; ui.chatBan = u && u > Date.now() ? u : 0; if (st.t === 'chatban') addSys(t('chatBannedMsg', banDate(u))); updChat(); });
  c.on('connect', () => { lost = false; lostAt = 0; c.publish(T('pres/' + me.pid), '1', {qos: 1, retain: true, properties: EXP}); lastHb = Date.now(); render(); });
  c.on('offline', () => { if (mode === 'online') { if (!lost) lostAt = Date.now(); lost = true; render(); } });
  c.on('close', () => { if (mode === 'online' && !lost) { lostAt = Date.now(); lost = true; render(); } });
  c.subscribe([T('state'), T('in'), T('hb'), T('react'), T('chat'), T('pres/+'), T('dm/' + me.pid)], {qos: 1});
  c.publish(T('pres/' + me.pid), '1', {qos: 1, retain: true, properties: EXP});
  lsSet('hs-last', JSON.stringify({code, t: Date.now()}));
}
function onMsg(sub, m, meta) {
  if (sub === 'state') { if (!m || typeof m !== 'object' || !Array.isArray(m.pl)) return; if (S && !newer(m, S)) return; S = m; if (S.host !== me.pid) lastHb = Date.now(); afterState(); return; }
  if (sub === 'in') {
    // someone (re)joined: share my copy of the table and my presence, in case the server's copy is older
    if (m && m.k === 'sync' && m.pid !== me.pid && mq && S) { const cl = mq; setTimeout(() => { if (mq !== cl || !S) return; cl.publish(T('state'), JSON.stringify(S), {qos: 1, retain: true, properties: EXP}); cl.publish(T('pres/' + me.pid), '1', {qos: 1, retain: true, properties: EXP}); }, 150 + Math.random() * 450); return; }
    if (isHost()) hostHandle(m); return;
  }
  if (sub === 'chat') {
    if (!m || typeof m.pid !== 'string' || m.pid === me.pid || ui.muted.has(m.pid)) return; const qk = QUICK.includes(m.q) ? m.q : null; if (!qk && typeof m.t !== 'string') return;
    // public tables: typed messages only from signed-in players (the server vouches for them); ready-made lines from everyone
    if (!qk && S && S.pub && !(meta && meta.from)) return;
    addChat(m.pid, m.n, qk ? t('qc_' + qk) : m.t, false, !qk && meta && meta.sig ? {uid: meta.from, ts: meta.ts, sig: meta.sig, text: m.t, room: code} : null); return;
  }
  if (sub === 'react') { if (!m || !EMOJIS.includes(m.e) || m.pid === me.pid || !shown || ui.muted.has(m.pid)) return; const i = shown.pl.findIndex(q => q.id === m.pid); if (i >= 0) showReact(i, m.e); return; }
  if (sub === 'hb') { if (m && S && m.pid === S.host) lastHb = Date.now(); return; }
  if (sub === 'dm/' + me.pid) { if (m && m.k === 'deny') { if (m.m === 'kicked') { ui.quick = 0; failJoin(t('eKicked'), false); } else failJoin(t(m.m === 'full' ? 'eFull' : m.m === 'started' ? 'eStarted' : 'eJoin'), true); } return; }
  if (sub.startsWith('pres/')) {
    const pid = sub.slice(5); pres.set(pid, m === 1); refreshPresent();
    if (isHost() && S && S.ph === 'lobby' && m !== 1 && pid !== S.host && S.pl.some(q => q.id === pid)) {
      const q = S.pl.find(x => x.id === pid); S.pl = S.pl.filter(x => x.id !== pid); delete S.rdy[pid]; L(S, 'left', {n: q.n}); checkStart(S); commit();
    } else render();
  }
}
// bots (run by the host) count as present
const here = q => !!q && (q.bot || present.has(q.id));
function refreshPresent() { present = new Set([...pres].filter(([, v]) => v).map(([k]) => k)); if (mode === 'online' && me.pid) present.add(me.pid); }
function afterState() {
  const mi = S.pl.findIndex(q => q.id === me.pid);
  if (ui.screen === 'joining') {
    if (mi < 0) {
      if (S.ph !== 'lobby') { failJoin(t('eStarted'), true); return; }
      if (S.pl.length >= (S.pub ? CFG.PUBMAX : CFG.MAXP)) { failJoin(t('eFull'), true); return; }
    } else ui.screen = 'game';
  }
  if (isHost()) lastHb = Date.now();
  sync();
}
function publish() { if (mode !== 'online' || !isHost() || !mq) return; S.rev++; mq.publish(T('state'), JSON.stringify(S), {qos: 1, retain: true, properties: EXP}); advert(); }
function advert() {
  if (!mq || !S || !S.pub || !isHost()) return;
  if (S.ph === 'lobby' && S.pl.length < CFG.PUBMAX) mq.publish(PUB + code, JSON.stringify({n: S.pl.length, t: Date.now(), m: modeOf(S)}), {qos: 1, retain: true, properties: {messageExpiryInterval: 60}});
  else mq.publish(PUB + code, '', {qos: 1, retain: true});
}
function commit() { publish(); sync(); }
function hostHandle(m) {
  if (!S || !m || typeof m !== 'object') return;
  const pid = typeof m.pid === 'string' ? m.pid.slice(0, 20) : null; if (!pid) return;
  if (m.k === 'hello') {
    if (!S.pl.some(q => q.id === pid)) {
      const deny = r => mq.publish(T('dm/' + pid), JSON.stringify({k: 'deny', m: r}), {qos: 1});
      if (S.ban && S.ban[pid]) return deny('kicked');
      if (S.ph !== 'lobby') return deny('started');
      if (S.pl.length >= (S.pub ? CFG.PUBMAX : CFG.MAXP)) return deny('full');
      const rn = clean(m.nm), pool = nickList(); const nm = uniqName(S, rn && !nameBlocked(rn) ? rn : pool[Math.floor(Math.random() * pool.length)], pool); addPlayer(S, pid, nm, {pf: cleanCard(m.pf)}); if (typeof m.av === 'string') setAvatar(S, pid, m.av);
      L(S, 'joined', {n: nm}); checkStart(S); commit();
    } else { const q = S.pl.find(x => x.id === pid); q.pf = cleanCard(m.pf) || q.pf || null; if (S.ph !== 'lobby' && q.a) L(S, 'reconnected', {n: q.n}, 1); commit(); }
    return;
  }
  if (m.k === 'av') { if (S.ph !== 'lobby') return; setAvatar(S, pid, typeof m.a === 'string' ? m.a : null); commit(); return; }
  if (m.k === 'rm') { if (S.ph !== 'over' || !S.pl.some(q => q.id === pid)) return; S.rm = S.rm || {}; S.rm[pid] = m.v ? 1 : 0; commit(); checkRematch(); return; }
  if (m.k === 'ready') { if (S.ph !== 'lobby' || !S.pl.some(q => q.id === pid)) return; S.rdy[pid] = m.v ? 1 : 0; checkStart(S); commit(); return; }
  if (m.k === 'act') {
    if (!S.pl.some(q => q.id === pid)) return; const n = +(m.act && m.act.n); if (!(n > (S.seq[pid] || 0))) return;
    S.seq[pid] = n; act(S, pid, m.act); commit();
  }
}
// Host heartbeat. On the own relay, presence comes from the server (last will),
// so heartbeats are rare there; public brokers need them every 2 s.
let hbAt = 0;
setInterval(() => {
  if (mode !== 'online' || !mq || !S) return;
  const hub = mq.onlyHub;
  if (isHost()) { if (Date.now() - hbAt >= (hub ? 15000 : 1900)) { hbAt = Date.now(); mq.publish(T('hb'), JSON.stringify({pid: me.pid, t: Date.now()}), {qos: 0}); } return; }
  if (Date.now() - joinedAt < 9000 || ui.screen === 'joining') return;
  const hostGone = Date.now() - lastHb > (hub ? 40000 : 9000) || pres.get(S.host) === false;
  if (!hostGone) return;
  const cand = S.pl.find(q => q.a && present.has(q.id) && q.id !== S.host) || S.pl.find(q => present.has(q.id) && q.id !== S.host);
  if (cand && cand.id === me.pid) {
    const old = S.pl.find(q => q.id === S.host); S.host = me.pid; S.ep = (S.ep || 0) + 1;
    if (S.ph === 'lobby' && old) S.pl = S.pl.filter(q => q !== old);
    L(S, 'hostLeft', {o: old ? old.n : '', n: me.nm}); lastHb = Date.now(); commit();
  }
}, 2000);
setInterval(() => { if (mode === 'online' && S && S.pub && isHost() && S.ph === 'lobby') advert(); }, 20000);

// Backup connection during a game. If the own relay can't be reached (e.g. its free daily
// quota ran out) or a player at the table drops off it, everyone also joins the room on a
// public MQTT broker; messages then go over both, so nobody is cut off.
setInterval(() => {
  if (mode !== 'online' || !mq || !S || S.ph === 'lobby' || fbBusy || mq.hasBackup || !mqttOk()) return;
  const ownLost = !mq.hubUp && lostAt && Date.now() - lostAt > 8000;
  const otherLost = S.pl.some(q => !q.bot && q.a && q.id !== me.pid && pres.get(q.id) === false);
  if (ownLost || otherLost) addBackup(ownLost);
}, 2000);
async function addBackup(ownLost) {
  fbBusy = true; const room = code, cl = mq;
  for (let ix = 1; ix < BROKERS.length; ix++) {
    let c; try { c = await openBroker(ix); } catch (e) { continue; }
    if (mode !== 'online' || code !== room || mq !== cl) { try { c.end(true); } catch (e) {} fbBusy = false; return; }
    mq.add(c);
    mq.publish(T('pres/' + me.pid), '1', {qos: 1, retain: true, properties: EXP});
    if (isHost()) publish();
    if (ownLost && !fbDone) { fbDone = true; ui.fbAt = Date.now(); setTimeout(render, 8100); }
    render();
    break;
  }
  fbBusy = false;
}

const homeMode = () => ui.hmode === 'quick' ? 'quick' : 'classic';
function myName() { if (loggedIn()) return clean(ACC.profile.username); let typed = clean($('#nm').value); if (typed && nameBlocked(typed)) { typed = ''; $('#nm').value = ''; } if (typed) lsSet('hs-nm', typed); return typed || myNick; }
async function createRoom(pub, ix0) {
  if (!netOk()) { showErr(t('eLib')); return; }
  const nm = myName();
  mode = 'online'; me = {pid: rid(10), nm}; code = rid(5); ui.screen = 'joining'; ui.joinMsg = pub ? 'jCreatingPub' : 'jCreating'; render();
  let c = null, last = null; for (let ix = ix0 || 0; ix < BROKERS.length && !c; ix++) { try { c = await openBroker(ix); } catch (e) { last = e; } }
  if (!c) { reset(); showErr(t('eServer', errMsg(last))); return; }
  lsSet('hs-pid-' + code, me.pid);
  S = newState(); S.host = me.pid; S.pub = pub ? 1 : 0; S.cfg.mode = homeMode(); addPlayer(S, me.pid, nm, {pf: publicCard(), av: myAvatarPref()}); L(S, 'created', {n: nm, pub: pub ? 1 : 0});
  wire(c); ui.screen = 'game'; commit();
}
async function joinRoom(forced) {
  if (!netOk()) { showErr(t('eLib')); return; }
  const cd = (forced || $('#code').value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cd.length !== 5) { showErr(t('eCode5')); return; }
  const nm = myName(); code = cd; me = {pid: lsGet('hs-pid-' + cd) || rid(10), nm}; lsSet('hs-pid-' + cd, me.pid); mode = 'online';
  ui.screen = 'joining'; if (!ui.quick) ui.joinMsg = 'jConnecting'; render();
  for (let ix = 0; ix < BROKERS.length; ix++) {
    let c; try { c = await openBroker(ix); } catch (e) { continue; }
    if (mode !== 'online') { try { c.end(true); } catch (e) {} return; }
    const st = await probeState(c, 3500);
    if (!st) { try { c.end(true); } catch (e) {} continue; }
    S = null; wire(c); onMsg('state', st);
    mq.publish(T('in'), JSON.stringify({k: 'sync', pid: me.pid}), {qos: 1});
    if (mode === 'online' && S && !isHost()) mq.publish(T('in'), JSON.stringify({k: 'hello', pid: me.pid, nm, pf: publicCard(), av: myAvatarPref()}), {qos: 1});
    // nobody let us in (e.g. the host already left): give up, or look for another table
    const myCode = code; setTimeout(() => { if (mode === 'online' && code === myCode && ui.screen === 'joining') failJoin(t('eJoin'), true); }, 10000);
    return;
  }
  failJoin(t('eNoRoom'), true);
}
async function quickPlay() {
  if (!netOk()) { showErr(t('eLib')); return; }
  const nm = myName(); ui.quick = (ui.quick || 0) + 1;
  mode = 'online'; me = {pid: rid(10), nm}; code = null; ui.screen = 'joining'; ui.joinMsg = 'jSearching'; render();
  for (let ix = 0; ix < BROKERS.length; ix++) {
    let c; try { c = await openBroker(ix, false); } catch (e) { continue; }
    const list = await listPub(c, 1800); try { c.end(true); } catch (e) {}
    if (mode !== 'online') return;
    const cand = list.filter(r => r.n >= 1 && r.n < CFG.PUBMAX && Math.abs(Date.now() - r.t) < 600000 && r.m === homeMode()).sort((a, b) => b.n - a.n);
    if (cand.length && ui.quick <= 3) { ui.joinMsg = ['jFound', cand[0].n, CFG.PUBMAX]; render(); return joinRoom(cand[0].code); }
    return createRoom(true, ix);
  }
  reset(); showErr(t('eServerPlain'));
}
function teardown() {
  if (mq) {
    try { if (isHost() && S && S.pub && S.ph === 'lobby' && S.pl.length <= 1) mq.publish(PUB + code, '', {qos: 1, retain: true}); mq.publish(T('pres/' + me.pid), '0', {qos: 1, retain: true, properties: EXP}); } catch (e) {}
    const c = mq; setTimeout(() => { try { c.end(true); } catch (e) {} }, 300);
  }
  mq = null; lost = false; pres.clear(); present = new Set();
}
function failJoin(msg, retryQuick) { const q = ui.quick; teardown(); if (retryQuick && q && q < 3) { S = null; shown = null; animQ.length = 0; code = null; quickPlay(); return; } reset(); showErr(msg); }
function reset() { ui.result = null; clearChat(); solo = false; clearTimeout(botTimer); botTimer = null; S = null; shown = null; animQ.length = 0; mode = null; code = null; ui.screen = 'home'; ui.sel = null; ui.quick = 0; myN = 0; render(); }
function leave() { try { localStorage.removeItem('hs-last'); } catch (e) {} teardown(); reset(); }
function showErr(m) { ui.err = m; ui.screen = 'home'; render(); }

function send(a, i) {
  if (!S || animating) return; const pid = S.pl[i] ? S.pl[i].id : me.pid; ui.sel = null;
  if (mode === 'local') { if (act(S, pid, a)) sync(); else render(); return; }
  if (isHost()) { if (act(S, pid, a)) commit(); else render(); return; }
  if (!mq || lost) { render(); return; }
  myN = Math.max(myN, S.seq[me.pid] || 0) + 1; sentAt = Date.now();
  mq.publish(T('in'), JSON.stringify({k: 'act', pid: me.pid, act: Object.assign({}, a, {n: myN})}), {qos: 1}); render();
}
function setReady(v) {
  if (!S || S.ph !== 'lobby') return;
  if (isHost()) { S.rdy[me.pid] = v ? 1 : 0; checkStart(S); commit(); }
  else if (mq) { mq.publish(T('in'), JSON.stringify({k: 'ready', pid: me.pid, v: v ? 1 : 0}), {qos: 1}); S.rdy[me.pid] = v ? 1 : 0; render(); }
}
const busy = () => mode === 'online' && S && !isHost() && myN > (S.seq[me.pid] || 0) && Date.now() - sentAt < 6000;
setInterval(() => { if (mode === 'online' && S && ui.screen === 'game' && !animating) render(); }, 1500);
// New game with the same table. Online: players who asked for a rematch (plus the host and bots)
// start right away; if the table no longer fits the mode, everyone goes back to the lobby.
function restart() {
  const o = S, n = newState(); n.cfg = Object.assign({start: null, days: 0, mode: 'classic'}, o.cfg); n.pub = 0; n.rev = o.rev; n.ep = o.ep; n.ev = o.ev; n.host = o.host; n.seq = o.seq;
  if (modeOf(o) === 'quick') n.cfg.days = 0;
  const keep = mode === 'local' ? o.pl : o.pl.filter(q => q.bot || q.id === o.host || (present.has(q.id) && o.rm && o.rm[q.id]));
  keep.forEach(q => addPlayer(n, q.id, q.n, {av: q.av, bot: q.bot, pf: q.pf || null})); S = n; ui.sel = null;
  if (mode === 'local') { act(S, S.host, {t: 'start'}); sync(); return; }
  if (!act(S, S.host, {t: 'start'})) L(S, 'newLobby');
  commit();
}
const rematchNeed = V => V.pl.filter(q => !q.bot && present.has(q.id));
const rematchReady = V => rematchNeed(V).filter(q => V.rm && V.rm[q.id]);
function checkRematch() { if (S && S.ph === 'over' && isHost() && rematchNeed(S).length && rematchReady(S).length === rematchNeed(S).length) restart(); }
function setRematch(v) {
  if (!S || S.ph !== 'over') return;
  if (isHost()) { S.rm = S.rm || {}; S.rm[me.pid] = v ? 1 : 0; commit(); checkRematch(); }
  else if (mq) { mq.publish(T('in'), JSON.stringify({k: 'rm', pid: me.pid, v: v ? 1 : 0}), {qos: 1}); S.rm = S.rm || {}; S.rm[me.pid] = v ? 1 : 0; render(); }
}
/* ---- end of game: save the result to the player's account ---- */
const submitted = new Set();
function maybeSubmit(V) {
  if (!V || V.ph !== 'over' || !V.gid || submitted.has(V.gid)) return;
  const mi = myIdx(V); if (hot() || mi < 0) return;
  submitted.add(V.gid);
  if (!ACC.enabled) return;
  // games with bots (single player, or bots added to a room) count as bot games
  const isSolo = mode === 'local' || V.pl.some(q => q.bot), gid = V.gid;
  if (!loggedIn()) { ui.result = {gid, st: 'guest', solo: isSolo}; return; }
  const q = V.pl[mi], st = q.st || {};
  const payload = {
    game_id: gid, mode: isSolo ? 'solo' : 'online', pid: me.pid, order: standings(V).map(i => V.pl[i].id),
    winners: winners(V).map(i => V.pl[i].id), won: winners(V).includes(mi), gmode: modeOf(V),
    days: V.day, duration: Math.max(0, Math.round((Date.now() - (V.t0 || Date.now())) / 1000)),
    stats: {deals: st.d || 0, belt: st.b || 0, iron: !!st.i, tycoon: !!st.t, bonus: Math.min(20, q.a ? V.day : (q.od || 0)),
      bought: st.by || 0, upgrades: st.up || 0, cards: st.cu || 0, paid: st.pd || 0, survived: q.a ? V.day : (q.od || 0),
      laps: st.lp || 0, top_money: st.mx || 0, top_venues: st.mv || 0},
    // ranked: a public quick-play table with at least 3 people and no bots; only these count for the single-game feats
    ranked: !isSolo && !!V.pub && V.pl.length >= 3
  };
  ui.result = {gid, st: 'saving', solo: isSolo};
  const done = r => { ui.result = r; if (!animating && shown && shown.ph === 'over') render(); };
  submitResult(payload).then(res => done({gid, st: 'done', res, solo: isSolo})).catch(e => { console.warn('result not saved', e && e.raw || e); done({gid, st: 'err', solo: isSolo}); });
}
const inviteLink = () => location.origin + location.pathname + '?room=' + code;

/* ================= animation queue ================= */
let shown = null, animating = false, skip = false, override = {};
const animQ = [];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let waiters = [];
const wait = ms => skip ? Promise.resolve() : new Promise(r => { const tm = setTimeout(r, reduce ? Math.min(ms, 250) : ms); waiters.push(() => { clearTimeout(tm); r(); }); });
function skipNow() { skip = true; const w = waiters; waiters = []; w.forEach(f => f()); }
function sync() { if (!S) return; maybeSubmit(S); trackGame(S); animQ.push(clone(S)); pump(); }
// anonymous counts: a game started / finished on this device, by kind
function trackGame(V) {
  if (!V.gid || V.ph === 'lobby' || myIdx(V) < 0) return;
  const kind = mode === 'local' ? (solo ? 'solo' : 'local') : V.pub ? 'quick' : 'room';
  const seen = k => { try { const v = localStorage.getItem('cf-tg' + k); if (v === V.gid) return true; localStorage.setItem('cf-tg' + k, V.gid); } catch (e) {} return false; };   // once per game, also after a reload
  if (ui.trackStart !== V.gid) { ui.trackStart = V.gid; if (!seen('s')) logEvent('game_start', kind); }
  if (V.ph === 'over' && ui.trackEnd !== V.gid) { ui.trackEnd = V.gid; if (!seen('e')) logEvent('game_end', kind); }
}
async function pump() {
  if (animating) return; animating = true;
  while (animQ.length) {
    const nx = animQ.shift();
    if (shown && nx.fx && (!shown.fx || nx.fx.id !== shown.fx.id) && animQ.length < 4 && ui.screen === 'game') { try { await play(shown, nx); } catch (e) { console.error(e); } }
    const prev = shown; shown = nx; override = {}; if (prev) botReact(prev, nx); if (prev && nx.ph === 'lobby' && nx.pl.length > prev.pl.length) SFX.play('join');
    const last = !animQ.length; if (last) animating = false; render(prev); if (last) break;
  }
  animating = false; botTick();
}
/* ---- bots (single player) ---- */
let botTimer = null;
const BOT_LVS = ['easy', 'normal', 'hard'];
const botLv = () => BOT_LVS.includes(ui.botLv) ? ui.botLv : 'normal';
const botTagHTML = q => `<span class="tag">${esc(t('botTag'))}${q.bd ? ' · ' + esc(t('bot_' + q.bd)) : ''}</span>`;
const BOT_WAIT = 2700;   // ms a bot "thinks" before each move (slow enough to follow)
// Bots are played by whoever runs the rules: the local device, or the host of an online room.
const runsBots = () => (mode === 'local' && solo) || (mode === 'online' && isHost() && !!mq);
const botDone = () => { if (mode === 'local') sync(); else commit(); };
function botTick() {
  if (!runsBots() || !S || animating || botTimer) return; if (S.ph !== 'play' && S.ph !== 'feast') return;
  for (const j of S.ord) {
    if (!S.pl[j].bot) continue; const sa = botSide(S, j);
    if (sa && Math.random() < ({easy: .15, normal: .4}[S.pl[j].bd] || .6)) { botTimer = setTimeout(() => { botTimer = null; if (runsBots() && !animating && S && act(S, S.pl[j].id, sa)) botDone(); botTick(); }, BOT_WAIT); return; }
  }
  const A = actor(S); if (A < 0 || !S.pl[A].bot) return;
  botTimer = setTimeout(() => {
    botTimer = null; if (!S || !runsBots() || animating || actor(S) !== A) { botTick(); return; }
    const a = botDecide(S, A) || autoPick(S); if (!a || !act(S, S.pl[A].id, a)) { const f = autoPick(S); if (f) act(S, S.pl[A].id, f); } botDone();
  }, BOT_WAIT + Math.random() * 700);
}
// host: add or remove a bot in a private room's lobby
function addBot() {
  if (!S || !isHost() || S.ph !== 'lobby' || S.pub || S.pl.length >= CFG.MAXP) return;
  const used = new Set(S.pl.map(q => q.n));
  const pool = shuffle(nickList().filter(n => !used.has(n)));
  const avs = shuffle(Object.keys(AVATARS).filter(k => !S.pl.some(q => q.av === k)));
  const id = 'bot' + rid(6), nm = uniqName(S, pool[0] || 'Bot', nickList());
  addPlayer(S, id, nm, {bot: 1, bd: botLv(), av: avs[0] || null}); L(S, 'joined', {n: nm}); commit();
}
function kickPlayer(id) {
  if (!S || !isHost() || S.ph !== 'lobby' || id === me.pid) return; const q = S.pl.find(x => x.id === id && !x.bot); if (!q) return;
  S.ban = S.ban || {}; S.ban[id] = 1; S.pl = S.pl.filter(x => x !== q); delete S.rdy[id]; L(S, 'kicked', {n: q.n});
  mq.publish(T('dm/' + id), JSON.stringify({k: 'deny', m: 'kicked'}), {qos: 1}); commit();
}
function removeBot(id) {
  if (!S || !isHost() || S.ph !== 'lobby') return; const q = S.pl.find(x => x.id === id && x.bot); if (!q) return;
  S.pl = S.pl.filter(x => x !== q); L(S, 'left', {n: q.n}); commit();
}
function botReact(prev, nx) {
  if (!solo || !nx.fx) return; const i = nx.fx.i, q = nx.pl[i], o = prev.pl[i]; if (!q || !q.bot || !o) return;
  const dm = q.m - o.m;
  if (dm <= -15 && Math.random() < .35) setTimeout(() => showReact(i, Math.random() < .5 ? '😭' : '😡'), 300);
  else if (dm >= 25 && Math.random() < .35) setTimeout(() => showReact(i, Math.random() < .5 ? '😂' : '👏'), 300);
}
const PIPS = {1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]};
const diceSkin = (V, i) => { const q = V && i >= 0 ? V.pl[i] : null; if (!q) return 'classic'; if (q.id === me.pid && loggedIn()) return equipped().dice; return q.pf && q.pf.di ? q.pf.di : 'classic'; };
const skinDice = (V, i) => { $('#dice').dataset.skin = diceSkin(V, i); };
function setDice(a, b) { const ds = document.querySelectorAll('#dice .die'); [a, b].forEach((n, k) => { const on = PIPS[n] || []; ds[k].innerHTML = Array.from({length: 9}, (_, j) => `<span class="${on.includes(j) ? 'pip' : ''}"></span>`).join(''); }); }
async function play(prev, nx) {
  const fx = nx.fx; skip = false; waiters = []; setAVM(nx);
  const base = prev.ph === 'lobby' ? nx : prev; render(null, base);
  const dice = $('#dice');
  if (fx.d) {
    $('#cWho').innerHTML = `${dot(fx.i)}<span>${esc(nx.pl[fx.i].n)}</span>`; $('#cSub').textContent = t('sRolling'); skinDice(nx, fx.i);
    dice.classList.remove('dbl', 'landed'); dice.classList.add('rolling');
    const end = Date.now() + (reduce ? 300 : 1300);
    SFX.play('roll'); while (Date.now() < end && !skip) { setDice(d6(), d6()); await wait(80); }
    dice.classList.remove('rolling'); setDice(fx.d[0], fx.d[1]); void dice.offsetWidth; dice.classList.add('landed');
    SFX.play('land'); if (fx.d[0] === fx.d[1]) dice.classList.add('dbl');
    await wait(300);
  }
  // a card or square can move the token again (taxi, got lost, shortcut, go back): show that part after the card
  const path = fx.path || [], cut = fx.split != null && fx.split < path.length ? fx.split : path.length;
  const hop = async steps => {
    for (const p of steps) { override[fx.i] = p; drawTokens(base); const tk = document.querySelector(`.tok[data-i="${fx.i}"]`); if (tk) tk.classList.add('hop'); SFX.play('step'); await wait(210); }
    if (!steps.length) return;
    const c = cells[steps[steps.length - 1]]; c.classList.remove('land'); void c.offsetWidth; c.classList.add('land');
    await wait(250);
  };
  await hop(path.slice(0, cut));
  const rest = path.slice(cut);
  const html = popHTML(prev, nx, fx);
  if (html) {
    const pop = $('#pop'); pop.innerHTML = html; pop.hidden = false; outcomeSound(prev, nx, fx);
    let ms = fx.card ? 5000 : fx.bill ? 5000 : path.length ? 3800 : 3200;
    if (rest.length) { await wait(1600); await hop(rest); ms = Math.max(1200, ms - 1600 - rest.length * 210); }
    await wait(ms); pop.hidden = true; pop.innerHTML = '';
  } else {
    await hop(rest);
    if (!fx.quiet && fx.t !== 'roll') outcomeSound(prev, nx, fx);
  }
  if (fx.venue != null && nx.ph === 'feast') await venueReveal(nx, fx.venue);
}
async function venueReveal(V, v) {
  const pop = $('#pop'); const ks = Object.keys(VENUES).map(Number); pop.hidden = false;
  const cardHtml = (p, fin) => {
    const o = V.own[p];
    return `<div class="popcard" style="--hc:#7a4fa8"><div class="pophead">${esc(t('dinnerHd', V.day))}</div><div class="popbody">
    <div class="poptitle">${esc(vfull(p))}</div>${fin ? `<div class="popsub">${o ? t('venueOwner', esc(V.pl[o.o].n), pct(COMS[o.lv || 1])) : esc(t('venueNoOwner'))}</div>
    <div class="popsub">${t('checkIs', esc(V.pl[V.fe.w].n))}</div><div class="popskip">${esc(t('tapToContinue'))}</div>` : `<div class="popsub">${esc(t('pickingVenue'))}</div>`}</div></div>`;
  };
  let k = 0; const end = Date.now() + (reduce ? 200 : 1400);
  while (Date.now() < end && !skip) { const p = ks[k++ % ks.length]; pop.innerHTML = cardHtml(p, false); cells.forEach((c, j) => c.classList.toggle('pick', j === p)); SFX.play('tick'); await wait(140); }
  pop.innerHTML = cardHtml(v, true); cells.forEach((c, j) => c.classList.toggle('pick', j === v)); SFX.play('pay');
  await wait(3200); pop.hidden = true; pop.innerHTML = ''; cells.forEach(c => c.classList.remove('pick'));
}
function outcomeSound(prev, nx, fx) {
  if (nx.ph === 'over' && prev.ph !== 'over') return SFX.play('win');
  if (nx.pl.some((q, i) => prev.pl[i] && prev.pl[i].a && !q.a)) return SFX.play('out');
  if (fx.bill) return SFX.play('pay');
  if (fx.t === 'start') return SFX.play('start');
  if (['deal', 'dealr', 'offer', 'owr'].includes(fx.t)) return SFX.play('deal');
  if (fx.card) SFX.play('card');
  const i = fx.i, a = prev.pl[i], b = nx.pl[i]; if (!a || !b) return;
  const sc = (b.m - a.m) + (b.h - a.h) * 6 + (b.x - a.x) * 30 + (b.c.length > a.c.length ? 15 : 0) - (b.s > a.s ? 15 : 0)
    + (Object.keys(nx.own).filter(k => nx.own[k].o === i).length - Object.keys(prev.own || {}).filter(k => prev.own[k].o === i).length) * 40;
  setTimeout(() => SFX.play(sc > 0 ? 'good' : sc < 0 ? 'bad' : 'neutral'), fx.card ? 160 : 0);
}
function deltas(prev, nx) {
  const rows = [];
  nx.pl.forEach((q, i) => {
    const o = prev.pl[i]; if (!o) return; const dm = q.m - o.m, dh = q.h - o.h, dx = q.x - o.x;
    const parts = [];
    if (dm) parts.push(`<span class="dv ${dm > 0 ? 'pos' : 'neg'}">${dm > 0 ? '+' : '−'}${M(Math.abs(dm))}</span>`);
    if (dh) parts.push(`<span class="dv hun">${t('dhunger')} ${dh > 0 ? '+' : '−'}${Math.abs(dh)}</span>`);
    if (dx) parts.push(`<span class="dv mul">${t('dmult')} ×${q.x}</span>`);
    if (o.a && !q.a) parts.push(`<span class="dv neg">${t('dout')}</span>`);
    if (parts.length) rows.push(`<div class="drow">${dot(i)}<span>${esc(q.n)}</span>${parts.join('')}</div>`);
  });
  return rows;
}
const POP_KEYS = ['lap', 'half', 'out', 'won', 'teamWon', 'teamHelp', 'dayStart', 'order', 'paid', 'belt', 'handFull', 'waits', 'commission', 'freed', 'daysOver', 'rent', 'gotBelt', 'dutch', 'startMoney'];
function popHTML(prev, nx, fx) {
  if (fx.quiet || fx.t === 'roll') return ''; const dr = deltas(prev, nx); let head, hc, title, sub;
  if (fx.card) {
    const c = fx.card; const deck = c[0] === 'A' ? t('popChance') : c[0] === 'B' ? t('popEvent') : t('popSpecial');
    hc = c[0] === 'A' ? '#b87808' : c[0] === 'B' ? 'var(--teal)' : 'var(--tomato)'; head = fx.t === 'use' ? t('popPlayed') : deck; title = cardName(c); sub = cardDesc(c);
    if (fx.t !== 'use' && KEEP(c) && !canSee(nx, fx.i)) { title = t('hiddenCardT'); sub = t('hiddenCardS', nx.pl[fx.i].n); }
  } else if (fx.title) {
    head = fx.head ? tx(fx.head) : t('popInfo');
    hc = fx.bill ? 'var(--tomato)' : ['deal', 'dealr'].includes(fx.t) ? '#6b4bc4' : ['buy', 'offer', 'owr', 'home'].includes(fx.t) ? '#7a4fa8' : 'var(--ink)';
    title = tx(fx.title); sub = fx.sub ? tx(fx.sub) : '';
  } else if (fx.sq != null) {
    const k = BOARD[fx.sq]; head = t('popSquare', fx.sq); title = (cellIcon(fx.sq) ? cellIcon(fx.sq) + ' ' : '') + cellName(fx.sq);
    if (k === 'mekan') { hc = '#7a4fa8'; const o = nx.own[fx.sq]; sub = o ? t('ownerIs', nx.pl[o.o].n, o.pr) : t('forSaleM', CFG.VPRICE); }
    else { hc = k === 'bos' ? '#6f7a86' : 'var(--ink)'; sub = cellDesc(fx.sq); }
  } else return '';
  const extra = []; const P = nx.pend;
  if (P && P.k === 'tgt' && P.i === fx.i) extra.push(t('exTarget'));
  if (P && P.k === 'swap' && P.i === fx.i) extra.push(canSee(nx, P.i) ? t('exSwapMe') : t('exSwap', nx.pl[P.i].n));
  if (P && (P.k === 'buy' || P.k === 'offer') && P.i === fx.i) extra.push(P.k === 'buy' ? t('exBuy') : t('exOffer'));
  if (P && P.k === 'ow') extra.push(t('exReply', nx.pl[P.i].n));
  if (nx.fe && nx.fe.off) extra.push(t('exReply', nx.pl[nx.fe.off.to].n));
  if (nx.bn) extra.push(t('exAgain'));
  const msgs = fx.msgs.filter(m => m && typeof m === 'object' && POP_KEYS.includes(m.k)).slice(-4).map(m => tx(maskE(nx, m)));
  return `<div class="popcard" style="--hc:${hc}"><div class="pophead">${esc(head)}</div><div class="popbody">
    <div class="poptitle">${esc(title)}</div>${sub ? `<div class="popsub">${esc(sub)}</div>` : ''}
    ${dr.length ? `<div class="deltas">${dr.join('')}</div>` : ''}
    ${extra.length ? `<div class="popsub"><b>${esc(extra.join(' · '))}</b></div>` : ''}
    ${msgs.length ? `<ul class="popmsgs">${msgs.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
    <div class="popskip">${esc(t('tapToContinue'))}</div></div></div>`;
}
$('#center').addEventListener('click', () => { if (animating) skipNow(); });

/* ================= turn timer ================= */
let turnKey = '', turnAt = 0, lastTickSec = -1;
function curKey(V) { if (!V || (V.ph !== 'play' && V.ph !== 'feast')) return ''; const A = actor(V); if (A < 0) return ''; return `${V.tk || 0}|${V.ph}|${A}`; }
const limitOf = V => { const l = limits(V); return !V ? l.def : V.ph === 'feast' ? (V.fe && V.fe.off ? l.reply : l.feast) : V.pend && V.pend.k === 'ow' ? l.reply : l.def; };
const timerFrac = () => turnKey && curKey(shown) === turnKey ? Math.max(0, limitOf(shown) - (Date.now() - turnAt)) / limitOf(shown) : 1;
function trackTurn() {
  if (animating || ui.screen !== 'game' || !shown) return; const k = curKey(shown);
  if (k !== turnKey) {
    const pk = turnKey; turnKey = k; turnAt = Date.now(); lastTickSec = -1;
    if (k) { const A = actor(shown); const newActor = !pk || pk.split('|')[2] !== String(A) || pk.split('|')[1] !== shown.ph; if (newActor && (hot() || mine(shown, A))) SFX.play('turn'); }
  }
}
function autoAct(why) {
  if (!S || animating) return; const A = actor(S); if (A < 0) return; const q = S.pl[A], pid = q.id;
  // a player who dropped off is played by a (normal) bot until they're back; a timeout just passes
  let a2 = why === 'off' ? botDecide(S, A, 'normal') || autoPick(S) : autoPick(S); if (!a2) return;
  let ok = act(S, pid, a2); if (!ok && why === 'off') { a2 = autoPick(S); ok = !!a2 && act(S, pid, a2); }
  if (ok) {
    if (why === 'off') { if (!q.ai) { S.pl[A].ai = 1; L(S, 'botTook', {n: q.n}); } }
    else L(S, 'timeout', {n: q.n}, 1);
    if (mode === 'local') sync(); else commit();
  }
}
setInterval(() => {
  if (ui.screen !== 'game' || !shown) return; trackTurn();
  const on = !!turnKey && !animating; const lim = limitOf(shown), left = Math.max(0, lim - (Date.now() - turnAt)), frac = left / lim;
  document.querySelectorAll('.timer,.ctimer').forEach(el => { el.hidden = !on; el.classList.toggle('warn', frac < .5 && frac >= .2); el.classList.toggle('crit', frac < .2); const i = el.querySelector('i'); if (i) i.style.width = (frac * 100).toFixed(1) + '%'; });
  const sec = Math.ceil(left / 1000); const ts = $('#tsec'); if (ts) ts.textContent = on ? t('sec', sec) : '';
  if (on && sec <= 5 && sec > 0 && sec !== lastTickSec) { lastTickSec = sec; const A = actor(shown); if (hot() || mine(shown, A)) SFX.play('tick'); }
  if (isHost() && mode === 'online' && S && !animating && S.pl.some(q => q.ai && here(q))) { S.pl.forEach(q => { if (q.ai && here(q)) { q.ai = 0; L(S, 'botLeft', {n: q.n}); } }); commit(); }
  if (on && isHost()) {
    const A = actor(shown), off = mode === 'online' && A >= 0 && !here(shown.pl[A]);
    if (off && Date.now() - turnAt > 3500) autoAct('off'); else if (Date.now() - turnAt > lim + (mode === 'online' ? 1500 : 0)) autoAct();
  }
}, 200);

/* ================= rendering ================= */
const cells = [];
function rc(p) { if (p <= 10) return [11, 11 - p]; if (p <= 20) return [11 - (p - 10), 1]; if (p <= 30) return [1, 1 + (p - 20)]; return [1 + (p - 30), 11]; }
(function buildBoard() {
  const b = $('#board');
  for (let p = 0; p < N; p++) {
    const k = BOARD[p], [r, c] = rc(p); const el = document.createElement('div');
    el.className = 'cell k-' + k; el.style.gridRow = r; el.style.gridColumn = c;
    el.innerHTML = `<span class="no">${p}</span>${cellIcon(p) ? `<span class="ic" aria-hidden="true">${cellIcon(p)}</span><span class="lb"></span>` : ''}${k === 'mekan' ? '<span class="own"></span>' : ''}<div class="toks"></div>`;
    b.appendChild(el); cells.push(el);
  }
})();
// home screen picture: the same board around the table (icons only)
(function buildHomeBoard() {
  const ring = $('#hRing'); if (!ring) return;
  ring.innerHTML = BOARD.map((k, p) => { const [r, c] = rc(p); const ic = cellIcon(p);
    return `<i class="hc k-${k}" style="grid-row:${r};grid-column:${c}">${ic ? `<span>${ic}</span>` : ''}</i>`; }).join('');
})();
function labelBoard() {
  cells.forEach((el, p) => { el.title = `${p} · ${cellName(p)}: ${cellDesc(p)}`; const lb = el.querySelector('.lb'); if (lb) lb.textContent = cellName(p); });
  const seen = new Set(); const kl = BOARD.filter(k => !seen.has(k) && seen.add(k));
  const kinds = `<div><h4>${esc(t('squares'))}</h4><ol style="list-style:none;padding:0">${kl.map(k => `<li>${KICON[k] || '⬜'} <b>${esc(sqName(k))}</b> · ${esc(sqDesc(k))}</li>`).join('')}<li>${esc(t('restaurants'))}: ${Object.keys(VENUES).map(p => esc(vfull(+p))).join(', ')}</li></ol></div>`;
  const list = d => CARD_IDS.filter(k => k[0] === d && k !== 'A13').map(k => `<li><b>${esc(cardName(k))}${k === 'A12' ? ' ×2' : ''}</b>: ${esc(cardDesc(k))}${KEEP(k) ? `<span class="keep">${esc(t('kept'))}</span>` : ''}</li>`).join('');
  const decks = `<div><h4>${esc(t('decksA'))}</h4><ol>${list('A')}</ol></div><div><h4>${esc(t('decksB'))}</h4><ol>${list('B')}</ol><p class="note" style="margin-top:8px">${t('beltNote', esc(cardName('K')))}</p></div>`;
  $('#legend').innerHTML = kinds + decks; $('#cardLists').innerHTML = kinds + decks;
}
function applyStatic() {
  document.documentElement.lang = getLang();
  document.title = t('title'); const md = document.querySelector('meta[name=description]'); if (md) md.content = t('metaDesc');
  document.querySelectorAll('[data-i]').forEach(el => { el.textContent = t(el.dataset.i); });
  document.querySelectorAll('[data-ih]').forEach(el => { el.innerHTML = t(el.dataset.ih); });
  document.querySelectorAll('[data-ip]').forEach(el => { el.placeholder = t(el.dataset.ip); });
  document.querySelectorAll('[data-ia]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.ia)); });
  $('#rulesList').innerHTML = t('rules').concat([t('rulesModes')], ACC.enabled ? [t('rulesAcc')] : []).map(r => `<li>${r}</li>`).join('');
  document.querySelectorAll('.optOff').forEach(o => { o.textContent = t('off'); });
  document.querySelectorAll('.optDays').forEach(o => { o.textContent = t('nDays', +o.value); });
  document.querySelectorAll('.optMode').forEach(o => { o.textContent = t('m_' + o.dataset.m); });
  document.querySelectorAll('#soloMode button').forEach(b => { b.innerHTML = `${esc(t('m_' + b.dataset.m))}<small>${esc(t('mShort_' + b.dataset.m))}</small>`; });
  $('#verTag').textContent = 'v' + VERSION;
  document.querySelectorAll('#soloCount button').forEach(b => { const n = +b.dataset.n; b.innerHTML = `${esc(t('nPlayers', n))}<small>${esc(t('youBots', n - 1))}</small>`; });
  $('#rxlist').innerHTML = EMOJIS.map(e => `<button data-a="rx" data-e="${e}" aria-label="${esc(t('sendEmoji', e))}">${e}</button>`).join('');
  $('#nm').placeholder = t('nickPh', myNick);
  const cl = $('#chatList'); const em = cl && cl.querySelector('.chatempty'); if (em) em.textContent = t('chatEmpty');
  labelBoard();
}

function show(id) {
  for (const s of ['home', 'auth', 'profile', 'friends', 'leaders', 'admin', 'local', 'solo', 'joining', 'lobby', 'game']) $('#' + s).hidden = s !== id;
  document.body.classList.toggle('ingame', id === 'game'); $('#logBtn').hidden = id !== 'game'; if (id !== 'game') document.body.classList.remove('showlog');
  if (id === 'home' && typeof showOnline === 'function') showOnline();
}
function setAppH() { document.documentElement.style.setProperty('--app-h', (window.visualViewport ? Math.round(visualViewport.height) : innerHeight) + 'px'); }
setAppH(); addEventListener('resize', () => { setAppH(); requestAnimationFrame(fitSheet); }); addEventListener('orientationchange', () => setTimeout(setAppH, 300)); if (window.visualViewport) visualViewport.addEventListener('resize', setAppH);
const mobileQ = matchMedia('(max-width:759px)');
let sheetKey = '';
function fitSheet() {
  const b = document.body;
  if (!mobileQ.matches || !b.classList.contains('ingame') || !shown || (shown.ph !== 'play' && shown.ph !== 'feast' && shown.ph !== 'over')) { b.classList.remove('sheet', 'sheetmin'); return; }
  const actEl = $('#actions'), gw = document.querySelector('.gamewrap'), bw = document.querySelector('.boardwrap'); if (!actEl || !gw || !bw) return;
  const slot = gw.getBoundingClientRect().bottom - bw.getBoundingClientRect().bottom - 5;
  const hd = b.classList.contains('sheet') ? (actEl.querySelector('.sheethandle') || {}).offsetHeight || 0 : 0;
  const on = actEl.scrollHeight - hd > slot + 6;
  if (on !== b.classList.contains('sheet')) { b.classList.toggle('sheet', on); if (!on) b.classList.remove('sheetmin'); }
  const k = curKey(shown) + '|' + (ui.sel ? 1 : 0); if (k !== sheetKey) { sheetKey = k; b.classList.remove('sheetmin'); }
}
const reacts = {}; let lastReact = 0;
/* ---- chat ---- */
let unread = 0, chatInView = false, lastChat = 0;
const chatOpen = () => mobileQ.matches ? document.body.classList.contains('showchat') : chatInView;
function setTab(tb) { document.body.classList.toggle('tablog', tb === 'log'); if (tb === 'chat') { unread = 0; const l = $('#chatList'); requestAnimationFrame(() => { l.scrollTop = l.scrollHeight; }); } updChat(); }
function setTheme(th, save = true) {
  document.documentElement.dataset.theme = th; if (save) lsSet('cf-theme', th);
  const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = th === 'dark' ? '#0f141d' : '#eef0f4';
}
function clearChat() { unread = 0; const l = $('#chatList'); if (l) l.innerHTML = `<li class="chatempty">${esc(t('chatEmpty'))}</li>`; updChat(); }
// ready-made chat lines (sent as a key, shown in each player's own language)
const QUICK = ['treat', 'gg', 'nice', 'luck', 'close', 'belt', 'hungry', 'again'];
function sendQuick(k) {
  if (!QUICK.includes(k) || !mq || mode !== 'online' || Date.now() - lastChat < 800) return; lastChat = Date.now();
  addChat(me.pid, me.nm, t('qc_' + k), true); mq.publish(T('chat'), JSON.stringify({pid: me.pid, n: me.nm, q: k, t: t('qc_' + k), ts: Date.now()}), {qos: 1});
}
// typed chat is off for guests at public tables and during a chat ban (ready-made lines still work)
const chatLocked = () => (ui.chatBan && ui.chatBan > Date.now()) || (mode === 'online' && S && S.pub && !loggedIn());
const banDate = ms => !ms || ms > 8e15 || ms === Infinity ? t('banForever') : new Date(ms).toLocaleString(locale(), {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
function addSys(text) { const ul = $('#chatList'); if (!ul) return; const em = ul.querySelector('.chatempty'); if (em) em.remove(); const li = document.createElement('li'); li.className = 'sys'; li.innerHTML = `<span>${esc(text)}</span>`; ul.appendChild(li); ul.scrollTop = ul.scrollHeight; }
function chatLockUI() {
  const lk = $('#chatLock'), inp = $('#chatIn'), btn = $('#chatForm button'); if (!lk || !inp) return;
  const ban = ui.chatBan && ui.chatBan > Date.now(), guest = !ban && mode === 'online' && S && S.pub && !loggedIn();
  lk.hidden = !(ban || guest); lk.textContent = ban ? t('chatBannedMsg', banDate(ui.chatBan)) : guest ? t('chatGuestPub') : '';
  inp.disabled = ban || guest; btn.disabled = ban || guest;
}
function renderQuick() { const el = $('#quickChat'); if (el && el.dataset.lang !== getLang()) { el.dataset.lang = getLang(); el.innerHTML = QUICK.map(k => `<button type="button" class="qchip" data-a="quick1" data-k="${k}">${esc(t('qc_' + k))}</button>`).join(''); } }
function mutePlayer(pid, on) {
  if (on) ui.muted.add(pid); else ui.muted.delete(pid);
  document.querySelectorAll(`#chatList li[data-pid="${CSS.escape(pid)}"]`).forEach(li => li.hidden = on);
  const V = shown || S; const q = V && V.pl.find(x => x.id === pid);
  if (on) { const ul = $('#chatList'); const li = document.createElement('li'); li.className = 'sys'; li.innerHTML = `<span>${esc(t('mutedMsg', q ? q.n : '?'))}</span><button class="linkbtn" data-a="unmute" data-pid="${esc(pid)}">${esc(t('unmute'))}</button>`; ul.appendChild(li); ul.scrollTop = ul.scrollHeight; }
  render();
}
function addChat(pid, nm, text, own, rep) {
  const V = shown || S; const i = V ? V.pl.findIndex(q => q.id === pid) : -1; const name = i >= 0 ? V.pl[i].n : (clean(nm) || '?');
  const tt = censor(String(text).replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯]/g, ' ').trim().slice(0, 200)); if (!tt) return;
  const ul = $('#chatList'); const em = ul.querySelector('.chatempty'); if (em) em.remove();
  const li = document.createElement('li'); if (own) li.className = 'own'; li.dataset.pid = pid;
  const bu = own ? (loggedIn() ? equipped().bubble : null) : (i >= 0 && V.pl[i].pf ? V.pl[i].pf.bu : null);
  li.innerHTML = `<span class="dot" style="--c:${i >= 0 ? colOf(i) : '#888'}"></span><b>${esc(name)}</b><span class="ct${bbCls(bu)}">${esc(tt)}</span>${rep && loggedIn() ? `<button class="mutebtn repbtn" data-a="report" aria-label="${esc(t('reportAria', name))}" title="${esc(t('reportAria', name))}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/></svg></button>` : ''}${own ? '' : `<button class="mutebtn" data-a="mute" data-pid="${esc(pid)}" aria-label="${esc(t('muteAria', name))}" title="${esc(t('muteAria', name))}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg></button>`}`;
  if (rep) li._rep = rep;
  const atBottom = ul.scrollHeight - ul.scrollTop - ul.clientHeight < 40; ul.appendChild(li); while (ul.children.length > 80) ul.firstChild.remove();
  if (atBottom || own) ul.scrollTop = ul.scrollHeight;
  if (!own && !chatOpen()) { unread++; SFX.play('pop'); } updChat();
}
function updChat() {
  const on = mode === 'online' && ui.screen === 'game'; const box = $('#chatbox'), fab = $('#chatFab');
  box.hidden = !on; if (!on) document.body.classList.remove('showchat');
  if (chatOpen()) unread = 0;
  fab.hidden = true; $('#chatHdr').hidden = !on;
  if (on) { renderQuick(); chatLockUI(); }
  $('#sideTabs').hidden = !on; document.body.classList.toggle('chaton', on); if (!on) document.body.classList.remove('tablog');
  document.querySelectorAll('.stab').forEach(x => x.classList.toggle('on', (x.dataset.t === 'log') === document.body.classList.contains('tablog')));
  for (const id of ['#chatBadge', '#chatBadge2', '#chatBadge3']) { const bd = $(id); bd.hidden = !unread; bd.textContent = unread > 9 ? '9+' : String(unread); }
}
new IntersectionObserver(es => { chatInView = es[0].isIntersecting; updChat(); }, {threshold: .25}).observe($('#chatbox'));
mobileQ.addEventListener ? mobileQ.addEventListener('change', updChat) : mobileQ.addListener(updChat);
$('#chatForm').addEventListener('submit', e => {
  e.preventDefault(); const inp = $('#chatIn'); const tt = inp.value.trim().slice(0, 200); if (!tt || !mq || mode !== 'online' || chatLocked()) return;
  if (Date.now() - lastChat < 800) return; lastChat = Date.now(); inp.value = '';
  addChat(me.pid, me.nm, tt, true); mq.publish(T('chat'), JSON.stringify({pid: me.pid, n: me.nm, t: tt, ts: Date.now()}), {qos: 1});
});
function showReact(i, e) {
  reacts[i] = {e, until: Date.now() + 3500}; SFX.play('pop');
  const V = shown;
  if (V && V.pl[i]) { const c = cells[override[i] != null ? override[i] : V.pl[i].p]; if (c) { const b = document.createElement('div'); b.className = 'bubble'; b.textContent = e; b.style.setProperty('--c', colOf(i)); c.appendChild(b); setTimeout(() => b.remove(), 3300); } }
  if (!animating && shown && shown.ph !== 'lobby') render(); setTimeout(() => { if (!animating && shown && ui.screen === 'game') render(); }, 3600);
}
function sendReact(e) {
  if (!EMOJIS.includes(e) || !shown || Date.now() - lastReact < 1200) return; lastReact = Date.now();
  if (hot()) { const A = actor(shown); showReact(A >= 0 ? A : 0, e); return; }
  const i = myIdx(shown); if (i < 0) return; showReact(i, e);
  if (!solo && mq) mq.publish(T('react'), JSON.stringify({pid: me.pid, e}), {qos: 0});
}
const colOf = i => COLORS[i % COLORS.length];
const teamTag = tm => `<span class="tag team t${tm}">${esc(t(tm ? 'teamB' : 'teamA'))}</span>`;
let AVM = [], FRM = [];

const dot = i => AVM[i] && AVATARS[AVM[i]] ? `<span class="dot av${frCls(FRM[i])}" style="--c:${colOf(i)}">${avHTML(AVM[i])}</span>` : `<span class="dot${frCls(FRM[i])}" style="--c:${colOf(i)}"></span>`;
const setAVM = V => { AVM = V && V.pl ? V.pl.map(q => q.av) : []; FRM = V && V.pl ? V.pl.map(q => q.pf && q.pf.fr) : []; };
// level + title shown next to a logged-in player's name
const pfTag = q => q && q.pf ? `<span class="lvtag">${esc(t('lvTag', q.pf.lv))}</span>` : '';
const pfTitle = q => q && q.pf && q.pf.ti ? `<small class="ptitle${titleCls(q.pf.ti)}">${esc(t('itemName', 'title', q.pf.ti))}</small>` : '';
const myIdx = V => V ? V.pl.findIndex(q => q.id === me.pid) : -1;
const mine = (V, i) => hot() || i === myIdx(V);
// cards in hand are private: others see "?" (everyone sees everything on a shared screen or after the game)
const canSee = (V, i) => hot() || !V || V.ph === 'over' || i === myIdx(V);
const seeName = (V, n) => hot() || !V || V.ph === 'over' || (V.pl[myIdx(V)] || {}).n === n;
const HIDE_K = {drew: 'drewH', handFull: 'handFullH', swapped: 'swappedH'};
const maskE = (V, e) => e && HIDE_K[e.k] && e.p && KEEP(e.p.c) && !seeName(V, e.p.n) ? {k: HIDE_K[e.k], p: {n: e.p.n}} : e;

function keepInputs(root, fn) {
  const vals = {}, open = {}; const ae = document.activeElement; const focusId = ae && root.contains(ae) ? ae.id : null;
  root.querySelectorAll('input[id],select[id]').forEach(el => { if (el.dataset.touched) vals[el.id] = el.value; });
  root.querySelectorAll('details[id]').forEach(el => { open[el.id] = el.open; });
  fn();
  for (const id in vals) { const el = document.getElementById(id); if (el) { el.value = vals[id]; el.dataset.touched = '1'; } }
  for (const id in open) { const el = document.getElementById(id); if (el) el.open = open[id]; }
  if (focusId) { const el = document.getElementById(focusId); if (el) el.focus(); }
}
document.addEventListener('input', e => { if (e.target.id) e.target.dataset.touched = '1'; });

function render(prev, forceV) {
  $('#roomChip').hidden = !(mode === 'online' && code);
  if (code) $('#roomChip').innerHTML = `${esc(S && S.pub ? t('chipPub') : t('chipRoom'))} <b>${esc(code)}</b>`;
  $('#leaveBtn').hidden = !mode; updChat(); $('#sndBtn').classList.toggle('on', SFX.on); $('#sndBtn').setAttribute('aria-checked', String(SFX.on)); $('#gameCredit').hidden = true;
  $('#musicBtn').classList.toggle('on', Music.on); $('#musicBtn').setAttribute('aria-checked', String(Music.on));
  { const sel = $('#setLangSel'); if (sel && sel.value !== getLang()) sel.value = getLang(); }
  document.querySelectorAll('[data-a=setTheme]').forEach(b => b.classList.toggle('on', b.dataset.t === (document.documentElement.dataset.theme || 'light')));
  renderAcctChip($('#acctChip')); $('#logoutBtn').hidden = !(loggedIn() && ui.screen === 'home'); $('#logoutBtn').title = t('aLogout');
  Music.scene(ui.screen === 'game' && shown && shown.ph !== 'lobby' ? 'game' : 'menu');
  if (ui.screen === 'home') { show('home'); renderHome(); return; }
  updateToast();
  if (ui.screen === 'friends') { show('friends'); renderFriends($('#friendsBox')); return; }
  if (ui.screen === 'leaders') { show('leaders'); renderLeaders($('#leadersBox')); return; }
  if (ui.screen === 'admin') { show('admin'); renderAdmin($('#adminBox')); return; }
  if (ui.screen === 'auth') { show('auth'); renderAuth($('#authBox')); return; }
  if (ui.screen === 'profile') { show('profile'); renderProfile($('#profileBox')); return; }
  if (ui.screen === 'local') { show('local'); renderLocal(); return; }
  if (ui.screen === 'solo') { show('solo'); renderSolo(); return; }
  if (ui.screen === 'joining') { show('joining'); const jm = ui.joinMsg; $('#joinMsg').textContent = Array.isArray(jm) ? t(...jm) : t(jm || 'connecting'); return; }
  const V = forceV || shown;
  if (!V) { show('joining'); return; }
  if (V.ph === 'lobby') { show('lobby'); renderLobby(V); return; }
  show('game'); renderGame(V, prev); if (!animating) trackTurn();
}

function renderHome() {
  const ok = netOk();
  renderAcctPanel($('#acct'), $('#nickWrap'));
  $('#installBtn').hidden = !canInstall();
  $('#btnCreate').disabled = !ok; $('#btnJoin').disabled = !ok; $('#btnQuick').disabled = !ok;
  document.querySelectorAll('#homeMode button').forEach(b => { const on = b.dataset.m === homeMode(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.innerHTML = `${esc(t('m_' + b.dataset.m))}<small>${esc(t('mShort_' + b.dataset.m))}</small>`; });
  $('#roomPanel').hidden = !ui.roomOpen; $('#tileFriends').setAttribute('aria-expanded', String(!!ui.roomOpen)); $('#tileFriends').classList.toggle('on', !!ui.roomOpen);
  $('#netNote').textContent = ok ? t('netOk') : t('netFail');
  { let l = null; try { l = JSON.parse(lsGet('hs-last') || 'null'); } catch (e) {} const rb = $('#btnRejoin'); const okL = ok && l && l.code && Date.now() - l.t < 12 * 3600e3; rb.hidden = !okL; if (okL) rb.textContent = t('rejoin', l.code); }
  $('#homeErr').hidden = !ui.err; $('#homeErr').textContent = ui.err || '';
}
function renderSolo() {
  ui.soloMode = ui.soloMode || 'classic'; if (ui.soloMode === 'teams') ui.soloN = 4;
  document.querySelectorAll('#soloMode button').forEach(b => b.classList.toggle('on', b.dataset.m === ui.soloMode));
  document.querySelectorAll('#soloDiff button').forEach(b => { b.classList.toggle('on', b.dataset.l === botLv()); b.innerHTML = `${esc(t('bot_' + b.dataset.l))}<small>${esc(t('botNote_' + b.dataset.l))}</small>`; });
  ui.soloN = ui.soloN || 3; document.querySelectorAll('#soloCount button').forEach(b => { b.classList.toggle('on', +b.dataset.n === ui.soloN); b.disabled = ui.soloMode === 'teams' && +b.dataset.n !== 4; });
  $('#soloDays').disabled = ui.soloMode === 'quick'; if (ui.soloMode === 'quick') $('#soloDays').value = '10';
  $('#soloAv').innerHTML = avGrid({}, ui.soloAv || null, 'sav'); const el = $('#soloMoney'); el.placeholder = M(autoMoney(ui.soloN)); $('#soloMoneyNote').textContent = el.value ? '' : t('autoMoney', autoMoney(ui.soloN));
}
function readLocal() { ui.names = ui.names.map((_, k) => { const el = $('#ln' + k); return el ? el.value : ui.names[k]; }); }
function showLocalErr(m) { render(); $('#localModeNote').textContent = m; $('#localModeNote').classList.add('err'); }
function renderLocal() {
  ui.lav = ui.lav || [];
  { const md = $('#localMode').value || 'classic', ln = $('#localModeNote'); ln.classList.remove('err'); ln.textContent = t('mNote_' + md);
    $('#localDays').disabled = md === 'quick'; if (md === 'quick') $('#localDays').value = '10'; }
  { const n = ui.names.length, el = $('#localMoney'); el.placeholder = M(autoMoney(n)); $('#localMoneyNote').textContent = el.value ? '' : t('autoMoney', autoMoney(n)); }
  keepInputs($('#localNames'), () => {
    $('#localNames').innerHTML = ui.names.map((n, k) => `<div class="localrow"><button class="avmini" data-a="lav" data-k="${k}" style="--c:${colOf(k)}" aria-label="${esc(t('pickAvatar'))}">${ui.lav[k] ? avHTML(ui.lav[k]) : '<span class="dot" style="--c:' + colOf(k) + '"></span>'}</button><input id="ln${k}" maxlength="14" value="${esc(n)}" placeholder="${esc(t('randomName'))}" aria-label="${esc(t('playerNameAria', k + 1))}">${ui.names.length > 2 ? `<button class="btn small ghost" data-a="delp" data-k="${k}" aria-label="${esc(t('removePlayer'))}">✕</button>` : ''}</div>`).join('');
  });
  document.querySelector('[data-a="addp"]').disabled = ui.names.length >= CFG.MAXP;
}
function avGrid(takenBy, mineKey, action) {
  return `<button class="avbtn none${!mineKey ? ' on' : ''}" data-a="${action}" data-k="" title="${esc(t('letterAvatar'))}">Aa<small>${esc(t('none'))}</small></button>` +
    Object.keys(AVATARS).map(k => {
      const tk = takenBy[k], on = k === mineKey, lbl = esc(avatarLabel(k)), open = avOpen(k), taken = tk != null && !on;
      const c = CATALOG.avatar.find(x => x.key === k) || {};
      const lock = open ? '' : (c.ach ? t('pLockedAch', t('achName', c.ach)) : t('pLockedLv', c.lv));
      return `<button class="avbtn${on ? ' on' : ''}${open ? '' : ' locked'}" data-a="${action}" data-k="${k}" ${taken || !open ? 'disabled' : ''} title="${esc(open ? avatarLabel(k) : lock)}"${taken ? ` style="--tc:${colOf(tk)}"` : ''}>${avHTML(k)}<small>${open ? lbl : esc(lock)}</small>${taken ? '<i class="avtk"></i>' : ''}</button>`;
    }).join('');
}
function renderLobby(V) {
  setAVM(V);
  { const tb = {}; V.pl.forEach((q, i) => { if (q.av && q.id !== me.pid) tb[q.av] = i; }); const mp = V.pl.find(q => q.id === me.pid); $('#lobbyAv').innerHTML = avGrid(tb, mp && mp.av, 'av'); }
  $('#lobbyCode').textContent = code || ''; $('#inviteTxt').textContent = code ? inviteLink() : '';
  if (code) { $('#waBtn').href = 'https://wa.me/?text=' + encodeURIComponent(t('waText', code) + '\n' + inviteLink()); $('#nshareBtn').hidden = !navigator.share; }
  const pub = !!V.pub, host = isHost();
  $('#cfgBox').hidden = pub; $('#pubBox').hidden = !pub;
  if (!pub) {
    const inp = $('#startMoney'), cur = (V.cfg && V.cfg.start) || '';
    inp.disabled = !host; $('#autoMoneyBtn').hidden = !host;
    if (document.activeElement !== inp) inp.value = cur; inp.placeholder = M(autoMoney(V.pl.length));
    $('#moneyNote').textContent = cur ? t('moneyCustom', cur) : t('moneyAuto', V.pl.length, autoMoney(V.pl.length));
    const md = modeOf(V), msel = $('#modeSel'); msel.disabled = !host; if (document.activeElement !== msel) msel.value = md;
    $('#modeNote').textContent = t('mNote_' + md);
    const ds = $('#daysSel'); ds.disabled = !host || md === 'quick'; if (document.activeElement !== ds) ds.value = String(md === 'quick' ? 10 : (V.cfg && V.cfg.days) || 0);
    $('#daysNote').textContent = md === 'quick' ? t('daysOn', 10) : V.cfg && V.cfg.days ? t('daysOn', V.cfg.days) : t('daysOff');
  } else {
    const mr = !!V.rdy[me.pid]; const rb = $('#readyBtn'); rb.textContent = mr ? t('readyUndo') : t('ready'); rb.classList.toggle('primary', !mr);
    $('#pubNote').textContent = t('pubNote', V.pl.length, CFG.PUBMAX);
  }
  const max = pub ? CFG.PUBMAX : CFG.MAXP;
  $('#lobbyList').innerHTML = V.pl.map((q, i) => `<li>${dot(i)}<span class="pnw"><span class="pn${q.pf ? ' link' : ''}"${q.pf ? ` data-a="viewp" data-u="${esc(q.pf.u)}"` : ''}>${esc(q.n)}</span>${pfTitle(q)}</span>${isTeams(V) && i < 4 ? teamTag(i % 2) : ''}${pfTag(q)}${q.id === me.pid ? `<span class="tag">${esc(t('you'))}</span>` : ''}${q.id === V.host ? `<span class="tag">${esc(t('hostTag'))}</span>` : ''}${q.bot ? `${botTagHTML(q)}${host && !pub ? `<button class="btn small ghost rmbot" data-a="rmbot" data-id="${esc(q.id)}" aria-label="${esc(t('removeBot'))}">✕</button>` : ''}` : host && q.id !== me.pid && mode === 'online' ? `<button class="btn small ghost rmbot" data-a="kick" data-id="${esc(q.id)}" aria-label="${esc(t('kickAria', q.n))}" title="${esc(t('kickAria', q.n))}">✕</button>` : ''}${pub ? (V.rdy[q.id] ? `<span class="tag ok">${esc(t('readyTag'))}</span>` : `<span class="tag">${esc(t('waitingTag'))}</span>`) : ''}</li>`).join('') +
    (V.pl.length < max ? `<li class="note" style="justify-content:center">${esc(t('seatsFree', max - V.pl.length))}</li>` : '');
  renderInviteBox($('#inviteBox'), code, mode === 'online' && !pub);
  $('#lobbyAct').innerHTML = pub ? '' : host
    ? `${V.pl.length < max ? `<div class="botrow"><div class="row"><button class="btn" data-a="addbot">${esc(t('addBot'))}</button><select id="botLvSel" aria-label="${esc(t('botLvAria'))}">${BOT_LVS.map(l => `<option value="${l}"${l === botLv() ? ' selected' : ''}>${esc(t('bot_' + l))}</option>`).join('')}</select></div><p class="note">${esc(t('addBotNote'))}</p></div>` : ''}<button class="btn primary big" data-a="start" ${V.pl.length < 2 || (isTeams(V) && V.pl.length !== 4) ? 'disabled' : ''}>${esc(t('startGame'))}</button>${V.pl.length < 2 ? `<p class="note" style="text-align:center;margin-top:8px">${esc(t('need2'))}</p>` : isTeams(V) && V.pl.length !== 4 ? `<p class="note" style="text-align:center;margin-top:8px">${esc(t('teamsNeed4'))}</p>` : ''}`
    : `<p class="note" style="text-align:center">${esc(t('waitHost'))}</p>`;
}

function drawTokens(V) {
  setAVM(V); const at = Array.from({length: N}, () => []);
  const A = animating && shown && shown.fx && override && Object.keys(override).length ? +Object.keys(override)[0] : actor(V); const mi = mode === 'online' ? myIdx(V) : -1;
  V.pl.forEach((q, i) => { if (q.a) at[override[i] != null ? override[i] : q.p].push(i); });
  cells.forEach((el, p) => {
    const ids = at[p].slice().sort((x, y) => (x === A) - (y === A));
    el.querySelector('.toks').innerHTML = ids.map(i => { const av = V.pl[i].av && AVATARS[V.pl[i].av] ? avHTML(V.pl[i].av) : '';
      return `<span class="tok${av ? ' avt' : ''}${frCls(FRM[i])}${i === A ? ' act' : ''}${i === mi ? ' me' : ''}" data-i="${i}" style="--c:${colOf(i)};${i === 2 && !av ? 'color:#16202b' : ''}" title="${esc(V.pl[i].n)}">${av || esc((V.pl[i].n || '?')[0].toUpperCase())}</span>`; }).join('');
    const here = A >= 0 && ids.includes(A); el.classList.toggle('here', here); if (here) el.style.setProperty('--hcol', colOf(A));
  });
}
function drawCells(V, targets) {
  cells.forEach((el, p) => {
    el.classList.toggle('feastv', V.ph === 'feast' && V.fe && V.fe.v === p);
    el.classList.toggle('dinner', V.ph === 'play' && V.dv === p);
    if (BOARD[p] === 'mekan') { const o = V.own && V.own[p]; el.classList.toggle('owned', !!o); el.style.setProperty('--oc', o ? colOf(o.o) : 'transparent');
      const b = el.querySelector('.own'); b.textContent = o ? '★'.repeat(o.lv || 1) : M(CFG.VPRICE); b.title = o ? t('ownerTitle', V.pl[o.o].n) : t('forSale'); }
    const tg = targets && targets[p];
    el.classList.toggle('target', !!tg);
    if (tg) { el.dataset.a = 'mv'; el.dataset.v = tg; el.setAttribute('role', 'button'); el.tabIndex = 0; } else { delete el.dataset.a; delete el.dataset.v; el.removeAttribute('role'); el.removeAttribute('tabindex'); }
  });
}
function billQueue(V) {
  if (!V.tq.length) return ''; const n = Math.min(3, V.tq.length); const items = [];
  for (let k = 0; k < n; k++) { const j = V.tq[(V.ti + k) % V.tq.length]; items.push(`<span class="bq">${dot(j)}${esc(V.pl[j].n)}${k === 0 ? ` <em>${esc(t('today'))}</em>` : k === 1 ? ` <em>${esc(t('tomorrow'))}</em>` : ''}</span>`); }
  return `<div class="billq"><span class="bql">${esc(t('billQueue'))}</span>${items.join('<span class="sep">›</span>')}</div>`;
}

// fun end-of-game awards from the per-game counters
const AWARDS = [['pm', 'aw_pm', '🧾'], ['mh', 'aw_mh', '😋'], ['d', 'aw_d', '🤝'], ['b', 'aw_b', '🪢'], ['by', 'aw_by', '🏪'], ['cu', 'aw_cu', '🃏'], ['up', 'aw_up', '⭐']];
function awardsHTML(V) {
  const out = [];
  for (const [k, key, ic] of AWARDS) {
    const val = j => +((V.pl[j].st || {})[k]) || 0; const all = V.pl.map((_, j) => j), best = Math.max(0, ...all.map(val));
    if (!best) continue; const who = all.filter(j => val(j) === best); if (who.length > 2) continue;
    out.push(`<li><span class="awi">${ic}</span><span class="awt"><b>${esc(t(key))}</b><small>${who.map(j => esc(V.pl[j].n)).join(' & ')} · ${esc(t(key + '_v', best))}</small></span></li>`);
    if (out.length >= 4) break;
  }
  return out.length ? `<div class="awards"><h3>${esc(t('awardsHd'))}</h3><ul>${out.join('')}</ul></div>` : '';
}
function winText(V) {
  if (V.win == null) return t('noWinner');
  if (isTeams(V)) { const w = winners(V).map(i => V.pl[i].n); return t('teamWins', w[0], w[1] || ''); }
  return t('wins', V.pl[V.win].n);
}
// end of the game: a new game of the same kind (quick play → another quick table, a room → same room,
// bots / one device → same players and settings), then back to the menu
function rematchHTML(V) {
  const menu = `<button class="btn ghost" data-a="leave">${esc(t('backToMenu'))}</button>`;
  if (mode === 'local') return `<div class="endbtns"><button class="btn primary big" data-a="restart">${esc(t('newGameBtn'))}</button>${menu}</div>`;
  if (V.pub) return `<div class="endbtns"><button class="btn primary big" data-a="quickagain">${esc(t('newGameBtn'))}</button>${menu}</div>`;
  const need = rematchNeed(V), ready = rematchReady(V), mineOn = !!(V.rm && V.rm[me.pid]);
  return `<div class="endbtns rematch"><button class="btn ${mineOn ? '' : 'primary'} big" data-a="rematch">${esc(mineOn ? t('rematchUndo') : t('newGameBtn'))}</button>
    <p class="note">${esc(t('newGameNote', ready.length, need.length))}</p>
    ${isHost() && ready.some(q => q.id !== me.pid) ? `<button class="btn small" data-a="restart">${esc(t('rematchNow'))}</button>` : ''}${menu}</div>`;
}
function renderGame(V, prev) {
  setAVM(V);
  const A = actor(V), lock = animating || busy() || lost, dis = lock ? 'disabled' : '';
  drawTokens(V);
  let targets = null; const P = V.pend;
  if (!lock && V.ph === 'play' && P && P.k === 'move' && mine(V, P.i)) { targets = {}; const pos = V.pl[P.i].p; P.o.forEach(v => { targets[(pos + v) % N] = v; }); }
  drawCells(V, targets);
  const d = V.dice;
  if (!animating) { skinDice(V, V.ph === 'play' ? V.ord[V.cur] : -1); setDice(d ? d[0] : 1, d ? d[1] : 1); $('#dice').classList.toggle('dbl', !!(d && d[0] === d[1])); }
  const din = $('#cDin'); din.hidden = !(V.ph === 'play' && V.dv != null && VENUES[V.dv]); if (!din.hidden) din.textContent = t('dinnerTonight', vfull(V.dv));
  $('#cDay').textContent = V.ph === 'feast' ? t('dayFeast', V.day) : V.ph === 'over' ? t('gameOver') : t('dayMove', V.day, V.cfg && V.cfg.days, Math.min(V.rd + 1, 2));
  const whoI = V.ph === 'over' ? V.win : A;
  if (!animating) {
    $('#cWho').innerHTML = whoI != null && whoI >= 0 ? `${dot(whoI)}<span>${esc(V.pl[whoI].n)}</span>` : '';
    const off = mode === 'online' && whoI >= 0 && V.ph !== 'over' && !here(V.pl[whoI]);
    $('#cSub').textContent = off ? t('sOff') : V.ph === 'over' ? t('sWon') : V.ph === 'feast' ? (V.fe.off ? t('sDealThink') : t('sPaying')) :
      !P ? (V.bn ? t('sAgain') : t('sRoll')) : P.k === 'move' ? t('sMove') : P.k === 'tgt' ? t('sTarget') : P.k === 'swap' ? t('sSwap') : P.k === 'buy' ? t('sBuy') : P.k === 'home' ? t('sHome') : P.k === 'offer' ? t('sOffer') : t('sReply');
  }

  const Q = A >= 0 ? V.pl[A] : null; let h = '';
  const nm = x => esc(V.pl[x].n);
  if (ui.sel && !lock) {
    const {i, c} = ui.sel;
    h = `<h3>${esc(cardName(c))}</h3><p class="status">${esc(cardDesc(c))}. ${esc(t('whom'))}</p><div class="targets">${rivals(V, i).map(j => `<button class="btn" data-a="usetgt" data-to="${j}">${dot(j)}${nm(j)} · ${esc(t('hungerN', V.pl[j].h))}</button>`).join('')}<button class="btn ghost" data-a="cancel">${esc(t('cancelBtn'))}</button></div>`;
  } else if (V.ph === 'over') {
    const ws = new Set(winners(V)), days = V.end === 'days';
    const rows = standings(V).map((j, k) => `<li class="${ws.has(j) ? 'w' : ''}${V.pl[j].a ? '' : ' out'}"><span class="place p${k + 1}">${k + 1}</span>${dot(j)}<span class="sn">${nm(j)}</span><span class="sv">${V.pl[j].a || days ? M(days ? worth(V, j) : V.pl[j].m) : esc(t('outShort'))}</span></li>`).join('');
    h = `<div class="overhead"><svg class="ic trophy" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg><div><small>${esc(t('over'))}</small><div class="win">${esc(winText(V))}</div></div></div>
      <ol class="standings">${rows}</ol>${awardsHTML(V)}
      <p class="note">${esc(days ? t('resultNote', V.cfg.days) : t('lastStanding', V.day))}</p>
      ${ui.result && ui.result.gid === V.gid ? resultHTML(ui.result) : ''}
      <button class="btn small ghost sharebtn" data-a="share">${esc(t('shareBtn'))}</button>
      ${rematchHTML(V)}`;
  } else if (V.ph === 'play') {
    const you = mine(V, A), who = you && !hot() ? esc(t('yourTurn')) : esc(Q.n);
    h = `<div class="turnhead">${dot(A)}<span>${who}</span></div>`;
    if (!P) h += you ? `<button class="btn primary big" data-a="roll" ${dis}>${esc(V.bn ? t('rollAgainBtn') : t('rollBtn'))}</button>` : `<p class="status">${esc(t('willRoll', Q.n))}</p>`;
    else if (P.k === 'move') {
      const pos = V.pl[P.i].p; const lbl = v => `${esc(t('squaresLbl', v))}${P.o.length > 1 && v === V.dice[0] + V.dice[1] ? `<small class="tp">${esc(t('sumLbl'))}</small>` : ''}`;
      h += you ? `<p class="status">${esc(t('moveQ', V.dice[0], V.dice[1]))}</p><p class="note mhint">${esc(t('moveHint'))}</p><div class="choices">${P.o.map(v => { const tg = (pos + v) % N;
        return `<button class="btn choice" data-a="mv" data-v="${v}" ${dis}><b>${lbl(v)}</b><span>${cellIcon(tg) || '⬜'} ${esc(cellName(tg))}${BOARD[tg] === 'mekan' && V.own[tg] ? ' · ' + nm(V.own[tg].o) : ''}</span></button>`; }).join('')}</div>`
        : `<p class="status">${esc(t('isChoosing', Q.n))}</p>`;
    } else if (P.k === 'tgt') {
      h += you ? `<p class="status">${esc(cardName(P.c))}: ${esc(cardDesc(P.c))}</p><div class="targets">${rivals(V, A).map(j => `<button class="btn" data-a="tgt" data-to="${j}" ${dis}>${dot(j)}${nm(j)}</button>`).join('')}</div>` : `<p class="status">${esc(t('isTargeting', Q.n))}</p>`;
    } else if (P.k === 'swap') {
      h += you ? `<div class="swapbox"><p class="status">${esc(t('swapQ'))}</p><div class="swapnew"><span class="card newc">${esc(cardName(P.c))}</span><small>${esc(cardDesc(P.c))}</small></div>
        <div class="choices">${Q.c.map((c, k) => `<button class="btn choice" data-a="swap" data-drop="${k}" ${dis}><b>${esc(t('swapDrop', cardName(c)))}</b><span>${esc(t('swapKeepNew', cardName(P.c)))}</span></button>`).join('')}
        <button class="btn choice ghost" data-a="swap" data-drop="new" ${dis}><b>${esc(t('swapBurn', cardName(P.c)))}</b><span>${esc(t('swapKeepOld'))}</span></button></div></div>`
        : `<p class="status">${esc(t('isSwapping', Q.n))}</p>`;
    } else if (P.k === 'buy') {
      h += you ? `<div class="venuebox"><div class="vt">${esc(vfull(P.p))}</div><p class="note">${esc(t('buyNote', CFG.VPRICE))}</p>
        <div class="row"><button class="btn primary" data-a="buy" data-yes="1" ${dis}>${esc(t('buyBtn', CFG.VPRICE))}</button><button class="btn ghost" data-a="buy" data-yes="0" ${dis}>${esc(t('pass'))}</button></div></div>`
        : `<p class="status">${esc(t('isBuying', Q.n, vname(P.p)))}</p>`;
    } else if (P.k === 'home') {
      const o = V.own[P.p], lv = o.lv || 1, cost = UPC[lv];
      h += you ? `<div class="venuebox"><div class="vt">${esc(vfull(P.p))} <span class="stars">${'★'.repeat(lv)}${'☆'.repeat(3 - lv)}</span></div><p class="note">${esc(t('ownHere', pct(COMS[lv])))}</p>
        <div class="choices"><button class="btn choice" data-a="home" data-up="0" ${dis}><b>${esc(t('collectBtn'))}</b><span>+${M(COLLECT[lv])}</span></button>
        ${lv < 3 ? `<button class="btn choice" data-a="home" data-up="1" ${Q.m >= cost && !lock ? '' : 'disabled'}><b>${esc(t('upgradeBtn', '★'.repeat(lv + 1)))}</b><span>${esc(t('upgradeSub', cost, pct(COMS[lv + 1])))}</span></button>` : `<p class="note">${esc(t('maxLevel'))}</p>`}</div></div>`
        : `<p class="status">${esc(t('isHome', Q.n))}</p>`;
    } else if (P.k === 'offer') {
      const o = V.own[P.p], mn = o.pr + 10;
      h += you ? `<div class="venuebox"><div class="vt">${esc(vfull(P.p))}</div><p class="note">${esc(t('offerNote', V.pl[o.o].n, o.pr, mn))}</p>
        <div class="row"><input id="offerAmt" type="number" min="${mn}" max="${Q.m}" step="5" value="${mn}" inputmode="numeric" aria-label="${esc(t('offerAria'))}"><button class="btn primary" data-a="offer" ${dis}>${esc(t('offerBtn'))}</button></div>
        <button class="btn ghost small" data-a="offer" data-skip="1" ${dis}>${esc(t('noOfferBtn'))}</button></div>`
        : `<p class="status">${esc(t('isOffering', Q.n, vname(P.p)))}</p>`;
    } else if (P.k === 'ow') {
      const B = V.pl[P.from];
      h = `<div class="turnhead">${dot(P.i)}<span>${mine(V, P.i) && !hot() ? esc(t('offerForYou')) : nm(P.i)}</span></div><div class="venuebox"><div class="vt">${esc(vfull(P.p))}</div>
        <p class="status">${t('offerText', esc(B.n), P.amt, V.own[P.p].pr)}</p>
        ${mine(V, P.i) ? `<div class="row"><button class="btn primary" data-a="owr" data-ok="1" ${dis}>${esc(t('sellBtn', P.amt))}</button><button class="btn ghost" data-a="owr" data-ok="0" ${dis}>${esc(t('reject'))}</button></div>` : `<p class="note">${esc(t('isAnswering', V.pl[P.i].n))}</p>`}</div>`;
    }
  } else if (V.ph === 'feast') {
    const f = V.fe, W = V.pl[f.w], b = bill(V);
    let r = `<div class="receipt"><div class="hd">${esc(t('receiptHd', V.day))}</div><div class="ln"><span>${esc(t('payer'))}</span><span>${esc(W.n)}</span></div><div class="ln"><span>${esc(t('venueLbl'))}</span><span>${esc(vfull(f.v))}</span></div><div class="ln"><span>${esc(t('ownerLbl'))}</span><span>${b.ven != null ? nm(V.own[b.ven].o) + ' · ' + pct(b.rate) + '%' : esc(t('noOwner'))}</span></div><hr>`;
    r += b.lines.map(l => `<div class="ln"><span>${nm(l.j)}${l.j === f.w ? esc(t('own')) : ''}</span><span>${l.h}×${l.x}×${M(b.u)} = ${M(l.v)}${l.ku ? '*' : ''}</span></div>`).join('') || `<div class="ln"><span>${esc(t('nobodyAtTable'))}</span><span>${M(0)}</span></div>`;
    r += '<hr>';
    const back = b.ven != null && V.own[b.ven].o === f.w ? b.rate : 0;   // the payer's own venue gives commission back
    const owes = b.al ? ((b.lines.find(l => l.j === f.w) || {}).v || 0) : b.tot, left = W.m - owes + (owes <= W.m ? Math.round((b.al ? b.lines.reduce((s, l) => s + (V.pl[l.j].m >= l.v ? l.v : 0), 0) : owes) * back) : 0);
    const leftLn = `<div class="ln left${left < 0 ? ' neg' : ''}"><span>${esc(t('afterPay'))}</span><span>${left < 0 ? esc(t('shortBy', M(-left))) : M(left)}</span></div>`;
    if (b.al) r += `<div class="ln fx"><span>${esc(t('dutch'))}</span><span>${esc(t('dutchLine'))}</span></div><div class="ln"><span>${esc(t('inHand'))}</span><span>${M(W.m)}</span></div>` + leftLn;
    else {
      if (f.ku) r += `<div class="ln"><span>${esc(t('subtotal'))}</span><span>${M(b.sum)}</span></div><div class="ln fx"><span>${esc(t('coupon'))}</span><span>−${M(b.sum - b.tot)}</span></div>`;
      r += `<div class="ln tot"><span>${esc(t('total'))}</span><span>${M(b.tot)}</span></div><div class="ln"><span>${esc(t('inHand'))}</span><span>${M(W.m)}</span></div>`;
      if (b.ven != null) r += `<div class="ln fx"><span>${esc(t('commissionTo', V.pl[V.own[b.ven].o].n))}</span><span>+${M(Math.round(b.tot * b.rate))}</span></div>`;
      r += leftLn;
    }
    if (f.ke) r += `<div class="ln fx"><span>${esc(t('belt'))}</span><span>${esc(t('notEating', W.n))}</span></div>`;
    r += '</div>';
    if (f.off) {
      const Tt = V.pl[f.off.to], need = bill(V, f.off.to).tot, can = Tt.m + f.off.amt >= need;
      h = `<div class="turnhead">${dot(f.off.to)}<span>${mine(V, f.off.to) && !hot() ? esc(t('dealForYou')) : esc(Tt.n)}</span></div>
        <div class="dealbox"><p class="status">${t('dealQuote', esc(W.n), f.off.amt)}</p><p class="note">${esc(t('dealNet', Tt.n, need, f.off.amt - need))}</p>
        ${mine(V, f.off.to) ? `<div class="row"><button class="btn primary" data-a="dealr" data-ok="1" ${can && !lock ? '' : 'disabled'}>${esc(t('accept'))}</button><button class="btn ghost" data-a="dealr" data-ok="0" ${dis}>${esc(t('reject'))}</button></div>${can ? '' : `<p class="err">${esc(t('cantAfford'))}</p>`}` : `<p class="note">${esc(t('isThinking', Tt.n))}</p>`}</div>${r}`;
    } else {
      h = `<div class="turnhead">${dot(f.w)}<span>${mine(V, f.w) && !hot() ? esc(t('checkIsYours')) : esc(t('buying', W.n))}</span></div>`;
      if (mine(V, f.w)) {
        h += r;
        const fc = W.c.filter(c => HOLD[c] === 'feast');
        if (fc.length) h += `<div class="targets">${fc.map(c => `<button class="btn small" data-a="use" data-i="${f.w}" data-c="${c}" ${dis} title="${esc(cardDesc(c))}">${esc(t('useCard', cardName(c)))}</button>`).join('')}</div>`;
        if (!f.dl && !f.al && rivals(V, f.w).length) h += `<details class="dealopen" id="dealBox"><summary>${esc(t('dealOpen'))} <em>${esc(t('oneShot'))}</em></summary>
          <div class="row"><select id="dealTo" aria-label="${esc(t('toWhomAria'))}">${rivals(V, f.w).map(j => `<option value="${j}">${nm(j)} · ${M(V.pl[j].m)}</option>`).join('')}</select><input id="dealAmt" type="number" min="0" max="${W.m}" step="5" value="${Math.min(W.m, Math.max(0, Math.round(b.tot / 2 / 5) * 5))}" inputmode="numeric" aria-label="${esc(t('offerAria'))}"></div>
          <button class="btn" data-a="deal" ${dis}>${esc(t('dealSend'))}</button><p class="note">${esc(t('dealNote'))}</p></details>`;
        else if (f.dl) h += `<p class="note">${esc(t('dealUsed'))}</p>`;
        h += `<button class="btn primary big" data-a="pay" ${dis}>${esc(!b.al && W.m < b.tot ? t('cantPay') : t('payBtn'))}</button>`;
      } else h += r + `<p class="note">${esc(t('waitCards'))}</p>`;
    }
  }
  // first-game guide
  if (!hot() && !ui.sel && !lock) { const tk = tipFor(V, myIdx(V)); if (tk) h = tipHTML(tk) + h; }
  if ((V.ph === 'play' || V.ph === 'feast') && !ui.sel) {
    const tf = timerFrac(); const lbl = V.ph === 'feast' ? (V.fe.off ? t('replyTime') : t('payTime')) : P && P.k === 'ow' ? t('replyTime') : t('timeLbl');
    h = `<div class="tline"><span>${esc(lbl)}</span><span id="tsec">${animating ? '' : esc(t('sec', Math.ceil(tf * limitOf(V) / 1000)))}</span></div><div class="timer${tf < .2 ? ' crit' : tf < .5 ? ' warn' : ''}"${animating ? ' hidden' : ''}><i style="width:${(tf * 100).toFixed(1)}%"></i></div>` + h;
  }
  if (V.ph === 'play' || V.ph === 'feast') h += billQueue(V);
  if (mode === 'online' && !ui.sel && A >= 0 && (V.ph === 'play' || V.ph === 'feast') && V.pl[A].id !== me.pid && !here(V.pl[A])) h += `<p class="note">${t('offlineNote', nm(A))}</p>`;
  if (busy()) h += `<p class="note">${esc(t('sending'))}</p>`;
  if (lost) h = `<p class="status">${esc(t('reconnecting'))}</p>` + h;
  else if (ui.fbAt && Date.now() - ui.fbAt < 8000) h = `<p class="okmsg" role="status">${esc(t('netFallback'))}</p>` + h;
  keepInputs($('#actions'), () => { $('#actions').innerHTML = `<button class="sheethandle" data-a="sheetmin" aria-label="${esc(t('sheetAria'))}"><span></span><em data-open="${esc(t('sheetOpen'))}">${esc(t('sheetHandle'))}</em></button>` + h; });
  requestAnimationFrame(fitSheet);

  const mi = myIdx(V);
  $('#players').innerHTML = V.ord.concat(V.pl.map((_, i) => i).filter(i => !V.pl[i].a)).map(i => {
    const q = V.pl[i], o = prev && prev.pl[i];
    const meter = Array.from({length: CFG.HMAX}, (_, k) => `<i class="${k < q.h ? 'on' : ''}${k < q.h && q.h >= 7 ? ' hi' : ''}"></i>`).join('');
    const canUse = q.a && mine(V, i) && !lock && (V.ph === 'play' || V.ph === 'feast');
    const hand = !canSee(V, i) ? q.c.map(() => `<span class="card hid" title="${esc(t('hiddenCardT'))}">?</span>`).join('') : q.c.map(c => { const any = HOLD[c] === 'any', ok = canUse && (any ? rivals(V, i).length > 0 : V.ph === 'feast' && V.fe.w === i && !V.fe.off);
      const cls = 'card' + (any ? '' : ' feastc'), tl = esc(cardDesc(c));
      return ok ? `<button class="${cls}" data-a="${any ? 'sel' : 'use'}" data-i="${i}" data-c="${c}" title="${tl}">${esc(cardName(c))}</button>` : `<span class="${cls}" title="${tl}">${esc(cardName(c))}</span>`; }).join('');
    const vs = ownedBy(V, i).map(p => `<span class="card venue" title="${esc(t('value', V.own[p].pr, pct(COMS[V.own[p].lv || 1])))}">${esc(vfull(p))} ${'★'.repeat(V.own[p].lv || 1)}</span>`).join('');
    const fl = k => o && o[k] !== q[k] ? ' flash' : '';
    const tags = [isTeams(V) && q.tm != null ? teamTag(q.tm) : '', i === mi && !hot() ? `<span class="tag">${esc(t('you'))}</span>` : '', q.bot ? botTagHTML(q) : q.ai && mode === 'online' && !here(q) ? `<span class="tag">${esc(t('botPlaysTag'))}</span>` : '', V.tq[V.ti] === i && V.ph !== 'over' ? `<span class="tag bill">${esc(t('payTodayTag'))}</span>` : '', q.s ? `<span class="tag">${esc(t('waitsTag'))}</span>` : '',
      mode === 'online' && !here(q) ? `<span class="tag off">${esc(t('offTag'))}</span>` : ''].join('');
    const rx = reacts[i] && reacts[i].until > Date.now() ? `<span class="rxb">${reacts[i].e}</span>` : '';
    return `<li class="${i === A && V.ph !== 'over' ? 'turn' : ''}${q.a ? '' : ' out'}" style="--c:${colOf(i)}">${rx}
      <div class="phead">${dot(i)}<span class="pn">${esc(q.n)}</span>${pfTag(q)}</div>${pfTitle(q)}${tags ? `<div class="tags">${tags}</div>` : ''}
      <div class="pstats"><span class="money${fl('m')}">${M(q.m)}</span><span class="mult${fl('x')}">×${q.x}</span></div>
      <div class="hrow${fl('h')}"><span class="meter" aria-label="${esc(t('hungerN', q.h))}">${meter}</span><span>${esc(t('hungerN', q.h))}</span></div>
      ${q.a ? `<div class="ploc">${esc(t('squareN', q.p, (cellIcon(q.p) || '⬜') + ' ' + cellName(q.p)))}</div>` : ''}
      ${vs ? `<div class="hand">${vs}</div>` : ''}${hand ? `<div class="hand">${hand}</div>` : ''}</li>`;
  }).join('');
  $('#log').innerHTML = V.log.slice().reverse().map(e => `<li>${esc(tx(maskE(V, e)))}</li>`).join('');
}

/* ================= events ================= */
const cfgNum = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? clamp(Math.round(n / 10) * 10, 20, 2000) : null; };
function startLocalGame(isSolo) {
  mode = 'local'; solo = isSolo; code = null; S = newState(); S.host = 'L0';
  if (isSolo) {
    const nm = myName(); me = {pid: 'L0', nm};
    addPlayer(S, 'L0', nm, {av: ui.soloAv || null, pf: publicCard()});
    const pool = shuffle(nickList().filter(x => x !== nm)); const avs = shuffle(Object.keys(AVATARS).filter(k => k !== ui.soloAv));
    for (let k = 1; k < (ui.soloN || 3); k++) addPlayer(S, 'B' + k, uniqName(S, pool[k], nickList()), {bot: 1, bd: botLv(), av: avs[k]});
    S.cfg.start = cfgNum($('#soloMoney').value); S.cfg.days = +$('#soloDays').value || 0; S.cfg.mode = ui.soloMode || 'classic';
  } else {
    readLocal(); me = {pid: 'L0', nm: ''};
    const pool = shuffle(nickList().slice()); ui.names.forEach((n, k) => addPlayer(S, 'L' + k, uniqName(S, (clean(n) && !nameBlocked(clean(n)) ? clean(n) : '') || pool[k], nickList()), {av: (ui.lav || [])[k] || null}));
    S.cfg.start = cfgNum($('#localMoney').value); S.cfg.days = +$('#localDays').value || 0; S.cfg.mode = $('#localMode').value || 'classic';
    if (S.cfg.mode === 'teams' && S.pl.length !== 4) { mode = null; S = null; ui.screen = 'local'; showLocalErr(t('teamsNeed4')); return; }
  }
  shown = clone(S); ui.screen = 'game'; act(S, 'L0', {t: 'start'}); sync();
}
function copyText(txt, btn, okLabel, resetLabel, selectEl) {
  const f = () => { const r = document.createRange(); r.selectNodeContents(selectEl); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r); btn.textContent = t('selectedCopy'); };
  try { navigator.clipboard.writeText(txt).then(() => { btn.textContent = okLabel; if (resetLabel) setTimeout(() => { btn.textContent = resetLabel; }, 1800); }, f); } catch (err) { f(); }
}
// close the small settings menu (phones) when tapping elsewhere
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a;
  if (accountClick(a, b) || socialClick(a, b) || adminClick(a, b)) { SFX.play('click'); return; }
  if (['create', 'join', 'quick', 'local', 'solo', 'lstart', 'sstart', 'leave', 'addp', 'delp', 'copy', 'copycode', 'rejoin', 'start', 'restart', 'sel', 'cancel', 'autoMoney', 'ready', 'lang'].includes(a)) SFX.play(['create', 'join', 'quick', 'local', 'solo'].includes(a) ? 'menu' : 'click');
  switch (a) {
    case 'hmode': ui.hmode = b.dataset.m; lsSet('cf-hmode', ui.hmode); render(); break;
    case 'friendsPlay': ui.roomOpen = !ui.roomOpen; render(); if (ui.roomOpen) setTimeout(() => $('#code').focus(), 30); break;
    case 'howto': { const d = $('#rulesBox'); d.open = true; d.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}); break; }
    case 'settings': $('#adminBtn').hidden = !isAdmin(); $('#setModal').hidden = false; render(); break;
    case 'admin': $('#setModal').hidden = true; ui.screen = 'admin'; render(); break;
    case 'setClose': $('#setModal').hidden = true; break;
    case 'setLang': if (b.dataset.l !== getLang()) changeLang(b.dataset.l); break;
    case 'setTheme': setTheme(b.dataset.t); render(); break;
    case 'stab': setTab(b.dataset.t); break;
    case 'lang': changeLang(getLang() === 'en' ? 'tr' : 'en'); break;
    case 'create': ui.err = ''; ui.quick = 0; createRoom(false); break;
    case 'quick': ui.err = ''; ui.quick = 0; quickPlay(); break;
    case 'quickagain': leave(); ui.err = ''; ui.quick = 0; quickPlay(); break;
    case 'join': ui.err = ''; ui.quick = 0; joinRoom(); break;
    case 'rejoin': { ui.err = ''; ui.quick = 0; let l = null; try { l = JSON.parse(lsGet('hs-last') || 'null'); } catch (err) {} if (l && l.code) { $('#code').value = l.code; joinRoom(l.code); } break; }
    case 'local': ui.err = ''; ui.screen = 'local'; render(); break;
    case 'solo': ui.err = ''; ui.screen = 'solo'; if (!ui.soloMode) ui.soloMode = homeMode(); if (ui.soloAv === undefined) ui.soloAv = myAvatarPref(); render(); break;
    case 'soloN': ui.soloN = +b.dataset.n; render(); break;
    case 'soloMode': ui.soloMode = b.dataset.m; if (ui.soloMode !== 'quick' && $('#soloDays').value === '10') $('#soloDays').value = '0'; render(); break;
    case 'rematch': setRematch(!(S && S.rm && S.rm[me.pid])); break;
    case 'sav': ui.soloAv = b.dataset.k || null; render(); break;
    case 'lav': { readLocal(); ui.lav = ui.lav || []; const k = +b.dataset.k, keys = [null, ...Object.keys(AVATARS)]; const used = new Set(ui.lav.filter((x, j) => x && j !== k));
      let idx = keys.indexOf(ui.lav[k] || null); for (let n = 0; n < keys.length; n++) { idx = (idx + 1) % keys.length; if (!keys[idx] || (!used.has(keys[idx]) && avOpen(keys[idx]))) break; } ui.lav[k] = keys[idx]; render(); break; }
    case 'av': { const key = b.dataset.k || null; if (!S || S.ph !== 'lobby') break; if (isHost()) { if (setAvatar(S, me.pid, key)) commit(); } else if (mq) mq.publish(T('in'), JSON.stringify({k: 'av', pid: me.pid, a: key}), {qos: 1}); break; }
    case 'sstart': startLocalGame(true); break;
    case 'lstart': startLocalGame(false); break;
    case 'addp': readLocal(); if (ui.names.length < CFG.MAXP) ui.names.push(''); render(); break;
    case 'delp': readLocal(); ui.names.splice(+b.dataset.k, 1); (ui.lav || []).splice(+b.dataset.k, 1); render(); break;
    case 'report': {
      const li = b.closest('li'), r = li && li._rep; if (!r) break;
      askUser(t('reportQ'), t('reportQText', li.querySelector('b').textContent), t('reportYes'), t('cancel')).then(async y => {
        if (!y) return;
        try { const res = await reportChat(r); b.remove(); addSys(res && res.action ? t('reportActed') : t('reportSent')); }
        catch (e) { addSys(t('reportFail')); }
      });
      break; }
    case 'leave': {
      const inGame = S && S.ph !== 'over' && S.ph !== 'lobby' && !$('#game').hidden;
      if (!inGame) { leave(); break; }
      askUser(t('leaveQ'), t(mode === 'online' ? 'leaveQOnline' : 'leaveQLocal'), t('leaveYes'), t('stay')).then(y => { if (y) leave(); });
      break; }
    case 'copycode': copyText(code || '', b, t('copied'), t('copy'), $('#lobbyCode')); break;
    case 'copy': copyText(inviteLink(), b, t('inviteCopied'), null, $('#inviteTxt')); break;
    case 'ready': setReady(!(S && S.rdy[me.pid])); break;
    case 'addbot': { const sel = $('#botLvSel'); if (sel) { ui.botLv = sel.value; lsSet('cf-botlv', ui.botLv); } addBot(); break; }
    case 'kick': { const q = S && S.pl.find(x => x.id === b.dataset.id); if (q && confirm(t('kickQ', q.n))) kickPlayer(b.dataset.id); break; }
    case 'soloDiff': ui.botLv = b.dataset.l; lsSet('cf-botlv', ui.botLv); render(); break;
    case 'quick1': sendQuick(b.dataset.k); break;
    case 'nshare': navigator.share && navigator.share({title: 'Check Flip', text: t('waText', code), url: inviteLink()}).catch(() => {}); break;
    case 'mute': mutePlayer(b.dataset.pid, true); break;
    case 'unmute': mutePlayer(b.dataset.pid, false); b.closest('li') && b.closest('li').remove(); break;
    case 'rmbot': removeBot(b.dataset.id); break;
    case 'start': send({t: 'start'}, myIdx(S)); break;
    case 'roll': send({t: 'roll'}, actor(S)); break;
    case 'mv': send({t: 'mv', v: +b.dataset.v}, actor(S)); break;
    case 'tgt': send({t: 'tgt', to: +b.dataset.to}, actor(S)); break;
    case 'swap': send({t: 'swap', drop: b.dataset.drop === 'new' ? 'new' : +b.dataset.drop}, actor(S)); break;
    case 'buy': send({t: 'buy', yes: b.dataset.yes === '1' ? 1 : 0}, actor(S)); break;
    case 'offer': { const v = b.dataset.skip ? 0 : Math.round(+($('#offerAmt') || {}).value || 0); send({t: 'offer', amt: v}, actor(S)); break; }
    case 'owr': send({t: 'owr', ok: b.dataset.ok === '1' ? 1 : 0}, actor(S)); break;
    case 'home': send({t: 'home', up: b.dataset.up === '1' ? 1 : 0}, actor(S)); break;
    case 'deal': send({t: 'deal', to: +$('#dealTo').value, amt: Math.round(+$('#dealAmt').value || 0)}, actor(S)); break;
    case 'dealr': send({t: 'dealr', ok: b.dataset.ok === '1' ? 1 : 0}, actor(S)); break;
    case 'pay': send({t: 'pay'}, actor(S)); break;
    case 'use': send({t: 'use', c: b.dataset.c}, +b.dataset.i); break;
    case 'sel': ui.sel = {i: +b.dataset.i, c: b.dataset.c}; render(); break;
    case 'usetgt': { const s = ui.sel; if (s) send({t: 'use', c: s.c, to: +b.dataset.to}, s.i); break; }
    case 'cancel': ui.sel = null; render(); break;
    case 'snd': SFX.toggle(); render(); if (SFX.on) SFX.play('click'); break;
    case 'music': Music.toggle(); render(); break;
    case 'share': { const V = shown || S; if (!V) break; b.disabled = true; shareResult(V, hot() ? -1 : myIdx(V)).then(r => { b.disabled = false; if (r === 'downloaded') b.textContent = t('shareSaved'); }).catch(() => { b.disabled = false; }); break; }
    case 'tipok': tipSeen(b.dataset.k); render(); break;
    case 'tipoff': tipsOff(); render(); break;
    case 'tipsreset': tipsReset(); b.textContent = t('tipsOn'); break;
    case 'install': install().then(r => { if (r === 'ios') alert(t('installIOS')); render(); }); break;
    case 'sheetmin': document.body.classList.toggle('sheetmin'); break;
    case 'log': document.body.classList.remove('showchat'); document.body.classList.toggle('showlog'); updChat(); break;
    case 'chatopen':
      if (mobileQ.matches) { document.body.classList.remove('showlog'); document.body.classList.add('showchat'); updChat(); const l = $('#chatList'); l.scrollTop = l.scrollHeight; setTimeout(() => $('#chatIn').focus(), 50); }
      else { setTab('chat'); $('#chatbox').scrollIntoView({behavior: 'smooth', block: 'nearest'}); setTimeout(() => $('#chatIn').focus({preventScroll: true}), 300); }
      break;
    case 'chatclose': document.body.classList.remove('showchat'); updChat(); break;
    case 'rxopen': { const l = $('#rxlist'); l.hidden = !l.hidden; b.setAttribute('aria-expanded', String(!l.hidden)); break; }
    case 'rx': sendReact(b.dataset.e); $('#rxlist').hidden = true; document.querySelector('.rxbtn').setAttribute('aria-expanded', 'false'); break;
    case 'restart': restart(); break;
    case 'autoMoney': if (S && isHost() && S.ph === 'lobby') { S.cfg.start = null; $('#startMoney').value = ''; if (mode === 'local') sync(); else commit(); } break;
  }
});
document.addEventListener('keydown', e => {
  const el = document.activeElement;
  if ((e.key === 'Enter' || e.key === ' ') && el && el.classList && el.classList.contains('target')) { e.preventDefault(); el.click(); return; }
  if ((e.key === ' ' || e.key === 'Enter') && animating && ui.screen === 'game' && !/INPUT|BUTTON|SELECT/.test(el.tagName)) { e.preventDefault(); skipNow(); }
});
$('#startMoney').addEventListener('change', e => { if (!S || !isHost() || S.ph !== 'lobby') return; S.cfg.start = cfgNum(e.target.value); if (mode === 'local') sync(); else commit(); });
$('#modeSel').addEventListener('change', e => { if (!S || !isHost() || S.ph !== 'lobby') return; S.cfg.mode = e.target.value; if (mode === 'local') sync(); else commit(); });
$('#localMode').addEventListener('change', () => renderLocal());
$('#daysSel').addEventListener('change', e => { if (!S || !isHost() || S.ph !== 'lobby') return; S.cfg.days = +e.target.value || 0; if (mode === 'local') sync(); else commit(); });
$('#localMoney').addEventListener('input', () => renderLocal());
$('#soloMoney').addEventListener('input', () => renderSolo());

pickNick();
$('#nm').value = lsGet('hs-nm') || '';
$('#code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnJoin').click(); });
{ const qs = new URLSearchParams(location.search); const qp = qs.get('room') || qs.get('oda'); if (qp) { $('#code').value = qp.toUpperCase().slice(0, 5); ui.roomOpen = true; } }
setSocialGameCheck(() => ui.screen === 'game' && !!shown && shown.ph !== 'lobby' && shown.ph !== 'over');
ui.hmode = lsGet('cf-hmode') || 'classic'; ui.botLv = lsGet('cf-botlv') || 'normal'; setTheme(document.documentElement.dataset.theme || 'light', false);
const uiHooks = {
  go: sc => { ui.screen = sc; render(); },
  render: () => { updateToast(); if (['home', 'auth', 'profile', 'friends', 'leaders', 'admin'].includes(ui.screen) || (shown && (shown.ph === 'over' || shown.ph === 'lobby'))) render(); },
  AVATARS, avatarLabel, avHTML,
  inRoom: () => !!mode, roomCode: () => code,
  joinRoom: room => { if (mode) return; ui.err = ''; ui.quick = 0; $('#code').value = room; joinRoom(room); }
};
initAccountUI(uiHooks); initSocialUI(uiHooks); initAdminUI(uiHooks); onInstallChange(() => render());
applyStatic();
setDice(1, 1);
render();
initAccount().then(() => { applyStatic(); render(); });
// local testing only: http://localhost:8787/?debug=1 exposes a few internals
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]debug=1/.test(location.search)) {
  window.__cf = {state: () => S, endGame: () => { if (!S || !isHost()) return; S.ph = 'over'; S.win = 0; S.end = 'last'; S.fe = null; S.pend = null; if (mode === 'local') sync(); else commit(); }};
}
// "N people playing now" on the home screen (hidden while the number is small)
var ONLINE_MIN = 5, onlineN = 0;   // var: the first render runs before this line
async function pollOnline() {
  if (document.hidden || ui.screen !== 'home') return;
  try { const r = await fetch('/api/online', {cache: 'no-store'}); if (r.ok) onlineN = +(await r.json()).n || 0; } catch (e) {}
  showOnline();
}
function showOnline() { const el = $('#onlineNow'); if (!el) return; el.hidden = !(onlineN >= (ONLINE_MIN || 5)); if (!el.hidden) el.querySelector('span').textContent = t('onlineNow', onlineN); }
setInterval(pollOnline, 60000); document.addEventListener('visibilitychange', pollOnline); setTimeout(pollOnline, 800);
// suspended account: tell once, the account was signed out
onAccount(() => { if (ACC.banned && ui.bannedShown !== ACC.banned) { ui.bannedShown = ACC.banned; const ms = ACC.banned === 'infinity' ? Infinity : Date.parse(ACC.banned); askUser(t('accountBannedT'), t('accountBanned', banDate(ms)), t('ok'), t('close')); } });
// language switch (Settings): loads the language's texts if needed, then redraws everything
async function changeLang(l) {
  await setLang(l); pickNick(); applyStatic(); render();
}
{ const sel = $('#setLangSel'); if (sel) { sel.innerHTML = LANGS.map(l => `<option value="${l}" lang="${l}">${LANG_NAMES[l]}</option>`).join(''); sel.value = getLang(); sel.addEventListener('change', () => changeLang(sel.value)); } }
// yes / no question in the page's own style
function askUser(title, text, yes, no) {
  const m = $('#askModal'); $('#askTitle').textContent = title; $('#askText').textContent = text || ''; $('#askText').hidden = !text;
  $('#askYes').textContent = yes; $('#askNo').textContent = no; m.hidden = false; setTimeout(() => $('#askNo').focus(), 30);
  return new Promise(res => {
    const done = v => { m.hidden = true; m.onclick = null; document.removeEventListener('keydown', key, true); res(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    document.addEventListener('keydown', key, true);
    m.onclick = e => { if (e.target === m || e.target.id === 'askNo') done(false); else if (e.target.id === 'askYes') done(true); };
  });
}
// leaving the page in the middle of an online game asks the browser to confirm
addEventListener('beforeunload', e => { if (mode === 'online' && S && S.ph !== 'over' && S.ph !== 'lobby' && !$('#game').hidden) { e.preventDefault(); e.returnValue = ''; } });
// settings panel: close on the backdrop or Escape
document.addEventListener('click', e => { if (e.target && e.target.id === 'setModal') $('#setModal').hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#setModal').hidden) $('#setModal').hidden = true; });
