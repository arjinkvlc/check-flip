/**
 * Check Flip — connection to the game's own relay server (Cloudflare Worker + Durable Objects).
 *
 * HubClient exposes the small part of the mqtt.js client API the game uses
 * (on/once/removeListener, subscribe, publish with retain/expiry, last will,
 * automatic reconnect), so js/app.js can use this server first and fall back
 * to public MQTT brokers with the same code. See worker/index.js for the server.
 */
export const hubUrl = hub => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws?hub=' + encodeURIComponent(hub);
export const hubAvailable = () => /^https?:$/.test(location.protocol) && typeof WebSocket !== 'undefined';

export class HubClient {
  constructor(url, will, token) {
    this.kind = 'hub'; this.url = url; this.will = will || null; this.token = token || (() => null);
    this.options = {reconnectPeriod: 0}; this.connected = false; this.opened = false; this.ended = false;
    this.subs = new Set(); this.queue = []; this.h = {};
    this._open();
  }
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return this; }
  once(ev, fn) { const w = (...a) => { this.removeListener(ev, w); fn(...a); }; return this.on(ev, w); }
  removeListener(ev, fn) { this.h[ev] = (this.h[ev] || []).filter(f => f !== fn); return this; }
  emit(ev, ...a) { (this.h[ev] || []).slice().forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); }

  _open() {
    let ws; try { ws = new WebSocket(this.url); } catch (e) { setTimeout(() => this.emit('error', e), 0); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true; this.opened = true;
      const tk = this.token(); this._raw(tk ? {t: 'hello', will: this.will, tk} : {t: 'hello', will: this.will});
      if (this.subs.size) this._raw({t: 'sub', topics: [...this.subs]});
      const q = this.queue; this.queue = []; q.forEach(m => this._raw(m));
      clearInterval(this.pinger); this.pinger = setInterval(() => { try { ws.send('ping'); } catch (e) {} }, 25000);
      this.emit('connect');
    };
    ws.onmessage = ev => {
      if (ev.data === 'pong') return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m && m.t === 'msg') {
        const p = String(m.payload), meta = m.from ? {from: m.from, ts: m.ts, sig: m.sig} : null;
        this.emit('message', m.topic, {toString: () => p}, meta);
      } else if (m && (m.t === 'status' || m.t === 'chatban')) this.emit('status', m);
    };
    ws.onerror = () => {};
    ws.onclose = ev => {
      clearInterval(this.pinger);
      const was = this.connected; this.connected = false;
      if (!this.opened) { this.emit('error', new Error('connect failed')); return; }
      if (ev && ev.code === 4003) this.ended = true;   // suspended account: don't reconnect
      if (was) { this.emit('offline'); this.emit('close'); }
      if (!this.ended && this.options.reconnectPeriod) setTimeout(() => { if (!this.ended) this._open(); }, this.options.reconnectPeriod);
    };
  }
  _raw(m) { try { this.ws.send(JSON.stringify(m)); } catch (e) {} }
  _send(m) { if (this.connected) this._raw(m); else if (this.queue.length < 50) this.queue.push(m); }

  subscribe(topics) {
    const list = (Array.isArray(topics) ? topics : [topics]).filter(t => !this.subs.has(t));
    list.forEach(t => this.subs.add(t));
    if (list.length && this.connected) this._raw({t: 'sub', topics: list});
    return this;
  }
  publish(topic, payload, o) {
    const ttl = o && o.properties && o.properties.messageExpiryInterval;
    this._send({t: 'pub', topic, payload: String(payload), retain: !!(o && o.retain), ttl});
    return this;
  }
  end() { this.ended = true; clearInterval(this.pinger); try { this.ws.close(1000); } catch (e) {} return this; }
}

/**
 * MultiClient: one room over several connections at once (the own relay plus,
 * when needed, a public MQTT broker as backup). Used so a game keeps going when
 * the relay is unreachable in the middle of a match (for example when the free
 * daily quota runs out).
 *  - publish / subscribe go to every connection
 *  - the same message arriving over two connections is delivered once
 *  - presence (".../pres/<id>") is merged: a player is present if any
 *    connection says so; a connection's presence data is forgotten when it drops
 * It has the same small API as HubClient / mqtt.js, so app.js uses it unchanged.
 */
export class MultiClient {
  constructor(first) {
    this.kind = 'multi'; this.conns = []; this.h = {}; this.subs = [];
    this.seen = new Map(); this.presBy = new Map(); this.presOut = new Map(); this.wasUp = false;
    this.options = {}; this.add(first);
  }
  get connected() { return this.conns.some(c => c.connected); }
  // only the own relay: presence comes from the server, heartbeats can be rare
  get onlyHub() { return this.conns.every(c => c.kind === 'hub'); }
  get hubUp() { return this.conns.some(c => c.kind === 'hub' && c.connected); }
  get hasBackup() { return this.conns.some(c => c.kind !== 'hub'); }
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return this; }
  once(ev, fn) { const w = (...a) => { this.removeListener(ev, w); fn(...a); }; return this.on(ev, w); }
  removeListener(ev, fn) { this.h[ev] = (this.h[ev] || []).filter(f => f !== fn); return this; }
  emit(ev, ...a) { (this.h[ev] || []).slice().forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); }

  add(c) {
    const src = this.conns.length; this.conns.push(c);
    c.on('message', (tp, buf, meta) => this._in(src, tp, buf.toString(), meta));
    c.on('status', m => this.emit('status', m));
    c.on('connect', () => this._state());
    const down = () => { this._forget(src); this._state(); };
    c.on('offline', down); c.on('close', down);
    if (this.subs.length) c.subscribe(this.subs, {qos: 1});
    if (c.connected) this._state();
    return c;
  }
  _state() {
    const up = this.connected;
    if (up && !this.wasUp) this.emit('connect');
    if (!up && this.wasUp) { this.emit('offline'); this.emit('close'); }
    else if (up) this.emit('connect');
    this.wasUp = up;
  }
  _in(src, tp, s, meta) {
    const pi = tp.lastIndexOf('/pres/');
    if (pi >= 0 && tp.indexOf('/', pi + 6) < 0) {
      const m = this.presBy.get(tp) || new Map(); this.presBy.set(tp, m);
      if (s) m.set(src, s); else m.delete(src);
      return this._presEmit(tp);
    }
    const key = tp + '\n' + s, now = Date.now();
    if (this.seen.has(key) && now - this.seen.get(key) < 4000) return;
    this.seen.set(key, now);
    if (this.seen.size > 400) for (const [k, t] of this.seen) if (now - t > 4000) this.seen.delete(k);
    this.emit('message', tp, {toString: () => s}, meta || null);
  }
  _presEmit(tp) {
    const m = this.presBy.get(tp); const v = m && [...m.values()].some(x => x === '1') ? '1' : (m && m.size ? '0' : '');
    if (this.presOut.get(tp) === v) return; this.presOut.set(tp, v);
    if (v) this.emit('message', tp, {toString: () => v});
  }
  _forget(src) { for (const [tp, m] of this.presBy) if (m.delete(src)) this._presEmit(tp); }

  subscribe(topics, o) {
    const list = (Array.isArray(topics) ? topics : [topics]).filter(x => !this.subs.includes(x));
    this.subs.push(...list);
    if (list.length) this.conns.forEach(c => c.subscribe(list, o || {qos: 1}));
    return this;
  }
  publish(topic, payload, o) { this.conns.forEach(c => { try { c.publish(topic, payload, o); } catch (e) {} }); return this; }
  end(f) { this.conns.forEach(c => { try { c.end(f); } catch (e) {} }); return this; }
}
