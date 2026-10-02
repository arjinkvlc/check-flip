/**
 * Check Flip — Cloudflare Worker
 *
 *  - Serves the static game from ./public (static asset requests are free and don't run this code).
 *  - /ws?hub=<ROOM|_pub>: WebSocket relay for multiplayer, one Durable Object per room.
 *    It speaks a tiny publish/subscribe protocol that mirrors the MQTT features the
 *    game uses (topics, "+" wildcard, retained messages with expiry, last will),
 *    so the client can fall back to public MQTT brokers with the same logic.
 *  - A daily cron pings Supabase so a free project isn't paused for inactivity.
 *
 * Protocol (JSON text frames)
 *   client → server  {t:'hello', will:{topic,payload,retain,ttl}}   last will, sent on connect
 *                    {t:'sub', topics:[filter…]}                      subscribe (+ gets retained)
 *                    {t:'pub', topic, payload, retain, ttl}          publish (retain + '' = delete)
 *                    'ping'                                           → 'pong' (answered without waking the object)
 *   server → client  {t:'msg', topic, payload}
 *
 * Retained messages live in memory and are written to storage sparingly (the free plan
 * allows 100,000 storage writes a day): the game state at most every 60 s per room plus
 * when the last player leaves, presence right away, public-table ads (_pub) never.
 * A player who reconnects asks the others for the latest state ('sync'), so a slightly
 * older copy in storage after the object slept is corrected at once.
 */
import {DurableObject} from 'cloudflare:workers';
import {SEO} from '../public/js/seo-text.js';

const ROOT = 'checkplease/v1/';           // topic prefix (kept from the game's former name)
const PUB_HUB = '_pub';                   // hub that lists public tables for quick play
const HUB_RE = /^([A-Z0-9]{5}|_pub)$/;
const MAX_FRAME = 96 * 1024;              // bytes per message (a full game state is ~10–20 KB)
const MAX_SUBS = 16;
const RATE_WINDOW = 10000, RATE_MAX = 80; // messages per socket per 10 s
const MAX_TTL = 12 * 3600;                // retained messages live at most 12 h
const STATE_SAVE_MS = 60000;              // game state: write to storage at most every 60 s (players re-send it on reconnect)
const COUNT_HUB = '_count';               // keeps the number of players online (memory only)
const ROOM_MAX_SOCKETS = 16;              // a table holds at most 6 players (+ a few reconnecting tabs)

const hubOf = topic => typeof topic === 'string' && topic.startsWith(ROOT) ? topic.slice(ROOT.length).split('/')[0] : null;
const match = (filter, topic) => {
  const f = filter.split('/'), t = topic.split('/');
  if (f.length !== t.length) return false;
  return f.every((p, i) => p === '+' || p === t[i]);
};
const inHub = (topic, hub) => typeof topic === 'string' && topic.length <= 200 && topic.startsWith(ROOT + hub + '/');
const clampTtl = s => Math.max(1, Math.min(MAX_TTL, Math.floor(+s) || MAX_TTL));

function originOk(req, env) {
  const origin = req.headers.get('Origin');
  if (!origin) return true;                                   // non-browser clients
  let host; try { host = new URL(origin).hostname; } catch (e) { return false; }
  if (host === new URL(req.url).hostname || host === 'localhost' || host === '127.0.0.1') return true;
  return String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean).includes(host);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket upgrade', {status: 426});
      const hub = url.searchParams.get('hub') || '';
      if (!HUB_RE.test(hub)) return new Response('Bad hub', {status: 400});
      if (!originOk(req, env)) return new Response('Forbidden', {status: 403});
      return env.HUB.get(env.HUB.idFromName(hub)).fetch(req);
    }
    if (url.pathname === '/api/online') return online(req, env, ctx);
    // v1.16: one-click unsubscribe from the season e-mails (mail apps POST here; a click opens the page)
    if (url.pathname === '/api/unsubscribe') return unsubscribe(req, env, url);
    // the visitor's country (from Cloudflare, no permission needed): picks Turkish for visitors from Türkiye
    if (url.pathname === '/api/geo') return new Response(JSON.stringify({c: (req.cf && req.cf.country) || null}), {headers: {'Content-Type': 'application/json', 'Cache-Control': 'private, no-store'}});
    if (url.pathname === '/tr/') return Response.redirect(url.origin + '/tr' + url.search, 301);
    if (url.pathname === '/tr') return turkishPage(req, env, url);
    return env.ASSETS.fetch(req);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(keepSupabaseAwake(env));
  }
};

// List-Unsubscribe target: POST = one-click unsubscribe (RFC 8058), GET = the page that does the same and says so
async function unsubscribe(req, env, url) {
  const t = url.searchParams.get('t') || '', l = url.searchParams.get('l') || 'en';
  if (req.method === 'POST') {
    if (!/^[0-9a-f-]{36}$/i.test(t)) return new Response('bad token', {status: 400});
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/email_unsubscribe', {method: 'POST',
      headers: {'Content-Type': 'application/json', apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + env.SUPABASE_KEY}, body: JSON.stringify({p_token: t})}).catch(() => null);
    return new Response(r && r.ok ? 'unsubscribed' : 'try again later', {status: r && r.ok ? 200 : 502});
  }
  return Response.redirect(`${url.origin}/unsubscribe?t=${encodeURIComponent(t)}&l=${encodeURIComponent(l)}`, 302);
}

// Players online right now (people connected to a table). Cached for 30 s so the home screen costs little.
async function online(req, env, ctx) {
  const key = new Request(new URL('/api/online', req.url).toString()), cache = caches.default;
  let res = await cache.match(key);
  if (!res) {
    const n = await env.HUB.get(env.HUB.idFromName(COUNT_HUB)).fetch('https://hub/internal/online').then(r => r.json()).catch(() => ({n: 0}));
    res = new Response(JSON.stringify({n: n.n || 0}), {headers: {'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30'}});
    ctx.waitUntil(cache.put(key, res.clone()));
  }
  return res;
}

// /tr: the same page with the Turkish title, description and "What is Check Flip?" text already
// in the HTML, so search engines index a Turkish version without running JavaScript.
async function turkishPage(req, env, url) {
  const res = await env.ASSETS.fetch(new Request(url.origin + '/', req));
  if (!res.ok || !(res.headers.get('Content-Type') || '').includes('text/html')) return res;
  const T = SEO.tr, page = 'https://checkflipgame.com/tr';
  const attr = (name, value) => ({element(el) { el.setAttribute(name, value); }});
  const out = new HTMLRewriter()
    .on('html', attr('lang', 'tr'))
    .on('head', {element(el) { el.prepend('<base href="/">', {html: true}); }})
    .on('title', {element(el) { el.setInnerContent(T.title); }})
    .on('meta[name="description"]', attr('content', T.desc))
    .on('link[rel="canonical"]', attr('href', page))
    .on('meta[property="og:url"]', attr('content', page))
    .on('meta[property="og:title"]', attr('content', T.title))
    .on('meta[name="twitter:title"]', attr('content', T.title))
    .on('meta[property="og:description"]', attr('content', T.desc))
    .on('meta[name="twitter:description"]', attr('content', T.desc))
    .on('meta[property="og:locale"]', attr('content', 'tr_TR'))
    .on('meta[property="og:locale:alternate"]', attr('content', 'en_US'))
    .on('#seoH1', {element(el) { el.setInnerContent(T.h1); }})
    .on('#seoAbout', {element(el) { el.setInnerContent(T.about, {html: true}); }})
    .transform(res);
  const h = new Headers(out.headers); h.set('Content-Language', 'tr'); h.delete('ETag');
  return new Response(out.body, {status: 200, headers: h});
}

// Daily: runs the database upkeep (season medals, old game rows); this also counts as activity,
// so a free Supabase project isn't paused. Falls back to a tiny read on older databases.
async function keepSupabaseAwake(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return;
  const base = env.SUPABASE_URL.replace(/\/$/, ''), headers = {apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + env.SUPABASE_KEY, 'Content-Type': 'application/json'};
  let r = await fetch(base + '/rest/v1/rpc/daily_upkeep', {method: 'POST', headers, body: '{}'});
  console.log('supabase upkeep:', r.status, r.ok ? await r.text() : '');
  if (!r.ok) { r = await fetch(base + '/rest/v1/cosmetics?select=key&limit=1', {headers}); console.log('supabase keep-alive:', r.status); }
}

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // keep-alive pings are answered by the runtime without waking this object
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.mem = null;          // topic -> {p, e}: retained messages (loaded from storage when the object wakes up)
    this.savedAt = new Map(); // topic -> last write to storage
    this.dirty = new Set();   // retained topics newer in memory than in storage
  }

  async load() {
    if (this.mem) return;
    const mem = new Map(), ret = await this.ctx.storage.list({prefix: 'r:'});
    for (const [k, v] of ret) mem.set(k.slice(2), v);
    if (!this.mem) this.mem = mem;
  }
  // 'now' = write at once, 'later' = at most every STATE_SAVE_MS, 'never' = memory only
  policy(topic) {
    if (hubOf(topic) === PUB_HUB) return 'never';
    return topic.endsWith('/state') ? 'later' : 'now';
  }
  async save(topic, v) {
    await this.ctx.storage.put('r:' + topic, v);
    this.savedAt.set(topic, Date.now()); this.dirty.delete(topic);
    const al = await this.ctx.storage.getAlarm();
    if (al == null || al > v.e) await this.ctx.storage.setAlarm(v.e);
  }
  async flush() { for (const t of [...this.dirty]) { const v = this.mem && this.mem.get(t); if (v) await this.save(t, v); else this.dirty.delete(t); } }

  async fetch(req) {
    const url = new URL(req.url);
    // players-online counter (the '_count' object): rooms report their number of connections; the totals
    // are kept in memory and saved at most every 30 s (one storage write), so they survive the object sleeping
    if (url.pathname === '/internal/count') {
      const m = await req.json(); await this.loadCounts();
      if (m.n > 0) this.counts.set(m.hub, {n: Math.min(m.n, ROOM_MAX_SOCKETS), t: Date.now()}); else this.counts.delete(m.hub);
      if (!this.countSaveSet) { this.countSaveSet = true; const al = await this.ctx.storage.getAlarm(); if (al == null) await this.ctx.storage.setAlarm(Date.now() + 30000); }
      return new Response('ok');
    }
    if (url.pathname === '/internal/online') {
      await this.loadCounts();
      let n = 0; const old = Date.now() - 3 * 3600 * 1000;   // forget rooms not heard from for 3 hours
      for (const [h, v] of this.counts) { if (v.t < old) this.counts.delete(h); else n += v.n; }
      return new Response(JSON.stringify({n}));
    }
    if (url.pathname === '/internal/pub') {         // forwarded from another hub (public table ads)
      const m = await req.json();
      await this.publish(m.topic, m.payload, m.retain, m.ttl);
      return new Response('ok');
    }
    const hub = url.searchParams.get('hub');
    if (hub !== PUB_HUB && this.ctx.getWebSockets().length >= ROOM_MAX_SOCKETS) return new Response('Room is full', {status: 429});
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({hub, subs: [], will: null, n: 0, t0: Date.now()});
    if (hub !== PUB_HUB) await this.reportCount(hub);
    return new Response(null, {status: 101, webSocket: client});
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > MAX_FRAME) { ws.close(1009, 'message too big'); return; }
    const a = ws.deserializeAttachment(); if (!a) return;
    const now = Date.now();
    if (now - a.t0 > RATE_WINDOW) { a.t0 = now; a.n = 0; }
    if (++a.n > RATE_MAX) { ws.close(1008, 'rate limit'); return; }
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'hello') {
      const w = m.will;
      a.will = w && inHub(w.topic, a.hub) && typeof w.payload === 'string' && w.payload.length < 64
        ? {topic: w.topic, payload: w.payload, retain: !!w.retain, ttl: clampTtl(w.ttl)} : null;
      if (a.will) {
        // same player reconnecting: retire the old socket without firing its will
        for (const o of this.ctx.getWebSockets()) {
          if (o === ws) continue;
          const b = o.deserializeAttachment();
          if (b && b.will && b.will.topic === a.will.topic) { b.will = null; o.serializeAttachment(b); try { o.close(1000, 'replaced'); } catch (e) {} }
        }
      }
      ws.serializeAttachment(a);
      // signed-in player: the server learns who they are (for chat reports) and whether they are banned
      if (typeof m.tk === 'string' && m.tk.length < 4096 && this.env.SUPABASE_URL) await this.identify(ws, m.tk);
      return;
    }
    if (m.t === 'sub' && Array.isArray(m.topics)) {
      const add = m.topics.filter(f => inHub(f, a.hub) && !a.subs.includes(f));
      a.subs = a.subs.concat(add).slice(0, MAX_SUBS);
      ws.serializeAttachment(a);
      // deliver retained messages that match the new filters
      await this.load();
      for (const [topic, v] of this.mem) {
        if (v.e < now) { this.mem.delete(topic); continue; }
        if (!add.some(f => match(f, topic))) continue;
        try { ws.send(JSON.stringify({t: 'msg', topic, payload: v.p})); } catch (e) {}
      }
      return;
    }
    if (m.t === 'pub' && typeof m.topic === 'string' && typeof m.payload === 'string') {
      ws.serializeAttachment(a);
      if (inHub(m.topic, a.hub)) {
        if (m.topic === ROOT + a.hub + '/chat') return this.chat(ws, a, m, now);
        await this.publish(m.topic, m.payload, m.retain, m.ttl); return;
      }
      // a room may advertise itself in the public-table list
      if (m.topic === ROOT + PUB_HUB + '/' + a.hub) { await this.forward(PUB_HUB, m); return; }
    }
  }

  // Asks Supabase (with the player's own token) who they are and whether they are banned.
  async identify(ws, token) {
    let st = null;
    try {
      const r = await fetch(this.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/my_status', {method: 'POST', body: '{}',
        headers: {apikey: this.env.SUPABASE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'}});
      if (r.ok) st = await r.json();
    } catch (e) {}
    if (!st || !st.uid) return;
    const ms = v => v == null ? 0 : v === 'infinity' ? 8.64e15 : Date.parse(v) || 0;
    const a = ws.deserializeAttachment(); if (!a) return;   // read again: other messages may have changed it meanwhile
    a.uid = st.uid; a.cu = ms(st.chat_until); a.au = ms(st.account_until); a.sc = Date.now();
    (this.tokens = this.tokens || new Map()).set(ws, token);   // memory only: used to re-check a ban now and then
    try { ws.serializeAttachment(a); } catch (e) {}
    try { ws.send(JSON.stringify({t: 'status', chatUntil: a.cu || null, accountUntil: a.au || null})); } catch (e) {}
    if (a.au > Date.now()) { try { ws.close(4003, 'account banned'); } catch (e) {} }
  }

  // Chat line: blocked while the sender has a chat ban (ready-made lines still go through); lines from
  // signed-in players carry who sent them and a signature, so they can be reported (see public.report_chat).
  async chat(ws, a, m, now) {
    let c; try { c = JSON.parse(m.payload); } catch (e) { return; }
    const free = c && typeof c.t === 'string' && !c.q;
    // a ban given during the game takes effect within a minute
    const tk = this.tokens && this.tokens.get(ws);
    if (free && a.uid && tk && now - (a.sc || 0) > 60000) { await this.identify(ws, tk); a = ws.deserializeAttachment() || a; if (ws.readyState !== 1) return; }
    if (free && a.cu > now) { try { ws.send(JSON.stringify({t: 'chatban', until: a.cu})); } catch (e) {} return; }
    const meta = {};
    if (a.uid) {
      meta.from = a.uid;
      if (free && this.env.CHAT_SECRET) { meta.ts = now; meta.sig = await this.sign(`${a.hub}|${a.uid}|${now}|${c.t}`); }
    }
    await this.publish(m.topic, m.payload, false, 0, meta);
  }
  async sign(text) {
    if (!this.hkey) this.hkey = await crypto.subtle.importKey('raw', new TextEncoder().encode(this.env.CHAT_SECRET), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', this.hkey, new TextEncoder().encode(text));
    return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async webSocketClose(ws) { if (this.tokens) this.tokens.delete(ws); await this.dropped(ws); }
  async webSocketError(ws) { await this.dropped(ws); }
  async dropped(ws) {
    const a = ws.deserializeAttachment();
    if (a && a.will) { const w = a.will; a.will = null; try { ws.serializeAttachment(a); } catch (e) {} await this.publish(w.topic, w.payload, w.retain, w.ttl); }
    try { ws.close(1000, 'bye'); } catch (e) {}
    if (a && a.hub && a.hub !== PUB_HUB) await this.reportCount(a.hub, ws);
    // last player gone: take the room off the public-table list right away
    const hub = a && a.hub;
    if (hub && hub !== PUB_HUB && !this.ctx.getWebSockets().some(o => o !== ws && o.readyState === 1)) {
      await this.flush();
      await this.forward(PUB_HUB, {topic: ROOT + PUB_HUB + '/' + hub, payload: '', retain: true, ttl: 60});
    }
  }

  async reportCount(hub, gone) {
    const n = this.ctx.getWebSockets().filter(o => o !== gone && o.readyState <= 1).length;
    if (n === this.lastCount) return; this.lastCount = n;
    try { await this.env.HUB.get(this.env.HUB.idFromName(COUNT_HUB)).fetch('https://hub/internal/count', {method: 'POST', body: JSON.stringify({hub, n})}); } catch (e) {}
  }

  async forward(hub, m) {
    const stub = this.env.HUB.get(this.env.HUB.idFromName(hub));
    await stub.fetch('https://hub/internal/pub', {method: 'POST', body: JSON.stringify({topic: m.topic, payload: m.payload, retain: !!m.retain, ttl: m.ttl})});
  }

  async publish(topic, payload, retain, ttl, meta) {
    if (retain) {
      await this.load();
      const pol = this.policy(topic);
      if (payload === '') {
        const had = this.mem.delete(topic); this.dirty.delete(topic); this.savedAt.delete(topic);
        if (pol !== 'never' && had) await this.ctx.storage.delete('r:' + topic);
      } else {
        const v = {p: payload, e: Date.now() + clampTtl(ttl) * 1000};
        this.mem.set(topic, v);
        if (pol === 'now' || (pol === 'later' && Date.now() - (this.savedAt.get(topic) || 0) >= STATE_SAVE_MS)) await this.save(topic, v);
        else if (pol === 'later') this.dirty.add(topic);
      }
    }
    const msg = JSON.stringify(Object.assign({t: 'msg', topic, payload}, meta || {}));
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.subs.some(f => match(f, topic))) { try { ws.send(msg); } catch (e) {} }
    }
  }

  async loadCounts() {
    if (this.counts) return;
    const saved = await this.ctx.storage.get('counts');
    this.counts = new Map(saved ? Object.entries(saved) : []); this.isCount = true;
  }

  // remove expired retained messages; schedule the next clean-up
  async alarm() {
    if (this.isCount || (await this.ctx.storage.get('counts')) !== undefined) {   // the players-online counter: save the totals
      if (this.counts) await this.ctx.storage.put('counts', Object.fromEntries(this.counts));
      this.countSaveSet = false; return;
    }
    const now = Date.now(); let next = null;
    if (this.mem) for (const [t, v] of this.mem) if (v.e <= now) { this.mem.delete(t); this.dirty.delete(t); }
    const ret = await this.ctx.storage.list({prefix: 'r:'});
    for (const [k, v] of ret) {
      if (v.e <= now) await this.ctx.storage.delete(k);
      else if (next == null || v.e < next) next = v.e;
    }
    if (next != null) await this.ctx.storage.setAlarm(next);
  }
}
