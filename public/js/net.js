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
  constructor(url, will) {
    this.kind = 'hub'; this.url = url; this.will = will || null;
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
      this._raw({t: 'hello', will: this.will});
      if (this.subs.size) this._raw({t: 'sub', topics: [...this.subs]});
      const q = this.queue; this.queue = []; q.forEach(m => this._raw(m));
      clearInterval(this.pinger); this.pinger = setInterval(() => { try { ws.send('ping'); } catch (e) {} }, 25000);
      this.emit('connect');
    };
    ws.onmessage = ev => {
      if (ev.data === 'pong') return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m && m.t === 'msg') { const p = String(m.payload); this.emit('message', m.topic, {toString: () => p}); }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      clearInterval(this.pinger);
      const was = this.connected; this.connected = false;
      if (!this.opened) { this.emit('error', new Error('connect failed')); return; }
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
