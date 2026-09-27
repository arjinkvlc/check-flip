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
 */
import {DurableObject} from 'cloudflare:workers';

const ROOT = 'checkplease/v1/';           // topic prefix (kept from the game's former name)
const PUB_HUB = '_pub';                   // hub that lists public tables for quick play
const HUB_RE = /^([A-Z0-9]{5}|_pub)$/;
const MAX_FRAME = 96 * 1024;              // bytes per message (a full game state is ~10–20 KB)
const MAX_SUBS = 16;
const RATE_WINDOW = 10000, RATE_MAX = 80; // messages per socket per 10 s
const MAX_TTL = 12 * 3600;                // retained messages live at most 12 h

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
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket upgrade', {status: 426});
      const hub = url.searchParams.get('hub') || '';
      if (!HUB_RE.test(hub)) return new Response('Bad hub', {status: 400});
      if (!originOk(req, env)) return new Response('Forbidden', {status: 403});
      return env.HUB.get(env.HUB.idFromName(hub)).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(keepSupabaseAwake(env));
  }
};

// A tiny read through the public REST API counts as activity for Supabase.
async function keepSupabaseAwake(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return;
  const r = await fetch(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/cosmetics?select=key&limit=1', {
    headers: {apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + env.SUPABASE_KEY}
  });
  console.log('supabase keep-alive:', r.status);
}

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // keep-alive pings are answered by the runtime without waking this object
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/internal/pub') {         // forwarded from another hub (public table ads)
      const m = await req.json();
      await this.publish(m.topic, m.payload, m.retain, m.ttl);
      return new Response('ok');
    }
    const hub = url.searchParams.get('hub');
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({hub, subs: [], will: null, n: 0, t0: Date.now()});
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
      return;
    }
    if (m.t === 'sub' && Array.isArray(m.topics)) {
      const add = m.topics.filter(f => inHub(f, a.hub) && !a.subs.includes(f));
      a.subs = a.subs.concat(add).slice(0, MAX_SUBS);
      ws.serializeAttachment(a);
      // deliver retained messages that match the new filters
      const ret = await this.ctx.storage.list({prefix: 'r:'});
      for (const [k, v] of ret) {
        const topic = k.slice(2);
        if (v.e < now || !add.some(f => match(f, topic))) continue;
        try { ws.send(JSON.stringify({t: 'msg', topic, payload: v.p})); } catch (e) {}
      }
      return;
    }
    if (m.t === 'pub' && typeof m.topic === 'string' && typeof m.payload === 'string') {
      ws.serializeAttachment(a);
      if (inHub(m.topic, a.hub)) { await this.publish(m.topic, m.payload, m.retain, m.ttl); return; }
      // a room may advertise itself in the public-table list
      if (m.topic === ROOT + PUB_HUB + '/' + a.hub) { await this.forward(PUB_HUB, m); return; }
    }
  }

  async webSocketClose(ws) { await this.dropped(ws); }
  async webSocketError(ws) { await this.dropped(ws); }
  async dropped(ws) {
    const a = ws.deserializeAttachment();
    if (a && a.will) { const w = a.will; a.will = null; try { ws.serializeAttachment(a); } catch (e) {} await this.publish(w.topic, w.payload, w.retain, w.ttl); }
    try { ws.close(1000, 'bye'); } catch (e) {}
    // last player gone: take the room off the public-table list right away
    const hub = a && a.hub;
    if (hub && hub !== PUB_HUB && !this.ctx.getWebSockets().some(o => o !== ws && o.readyState === 1)) {
      await this.forward(PUB_HUB, {topic: ROOT + PUB_HUB + '/' + hub, payload: '', retain: true, ttl: 60});
    }
  }

  async forward(hub, m) {
    const stub = this.env.HUB.get(this.env.HUB.idFromName(hub));
    await stub.fetch('https://hub/internal/pub', {method: 'POST', body: JSON.stringify({topic: m.topic, payload: m.payload, retain: !!m.retain, ttl: m.ttl})});
  }

  async publish(topic, payload, retain, ttl) {
    if (retain) {
      if (payload === '') await this.ctx.storage.delete('r:' + topic);
      else {
        const e = Date.now() + clampTtl(ttl) * 1000;
        await this.ctx.storage.put('r:' + topic, {p: payload, e});
        const al = await this.ctx.storage.getAlarm();
        if (al == null || al > e) await this.ctx.storage.setAlarm(e);
      }
    }
    const msg = JSON.stringify({t: 'msg', topic, payload});
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.subs.some(f => match(f, topic))) { try { ws.send(msg); } catch (e) {} }
    }
  }

  // remove expired retained messages; schedule the next clean-up
  async alarm() {
    const now = Date.now(); let next = null;
    const ret = await this.ctx.storage.list({prefix: 'r:'});
    for (const [k, v] of ret) {
      if (v.e <= now) await this.ctx.storage.delete(k);
      else if (next == null || v.e < next) next = v.e;
    }
    if (next != null) await this.ctx.storage.setAlarm(next);
  }
}
