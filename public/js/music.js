/**
 * Check Flip — light background music, generated live with WebAudio (no audio files).
 * A relaxed "restaurant jazz" loop: soft electric-piano chords, a walking bass,
 * a brushed shaker and an occasional vibraphone melody. On/off is remembered.
 */
const LS = 'cp-music';
const BPM = 92, BEAT = 60 / BPM, BAR = BEAT * 4, SWING = .62;
// ii–V–I–vi style progression in F (MIDI note numbers)
const CHORDS = [
  {root: 41, notes: [53, 57, 60, 64]},   // Fmaj7
  {root: 38, notes: [50, 53, 57, 60]},   // Dm7
  {root: 43, notes: [55, 58, 62, 65]},   // Gm7
  {root: 36, notes: [52, 55, 58, 60]},   // C7
  {root: 45, notes: [57, 60, 64, 67]},   // Am7
  {root: 38, notes: [50, 54, 57, 60]},   // D7
  {root: 43, notes: [55, 58, 62, 65]},   // Gm7
  {root: 36, notes: [52, 55, 58, 64]}    // C7(13)
];
const SCALE = [65, 67, 69, 72, 74, 77, 79, 81];   // F major pentatonic-ish, melody range
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

let ctx = null, master = null, timer = null, nextBar = 0, barNo = 0, noise = null;
let on = true;
try { on = localStorage.getItem(LS) !== '0'; } catch (e) {}

function setup() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.0001;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
  master.connect(lp); lp.connect(ctx.destination);
  // one second of white noise for the shaker
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

function epiano(t, m, dur, vel) {
  const f = hz(m), g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [mul, amp, type] of [[1, 1, 'sine'], [2, .18, 'sine'], [3.01, .06, 'triangle']]) {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f * mul; og.gain.value = amp;
    o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + .05);
  }
  g.connect(master);
}
function bass(t, m, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = hz(m);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
}
function shaker(t, vel) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; f.type = 'highpass'; f.frequency.value = 7000;
  g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .07);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * .5, .09);
}
function vibes(t, m) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'sine'; o.frequency.value = hz(m); lfo.frequency.value = 5.5; lg.gain.value = .25;
  lfo.connect(lg); lg.connect(g.gain);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.32, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  o.connect(g); g.connect(master); o.start(t); lfo.start(t); o.stop(t + 1.7); lfo.stop(t + 1.7);
}

function scheduleBar(t0, n) {
  const c = CHORDS[n % CHORDS.length], nxt = CHORDS[(n + 1) % CHORDS.length];
  const sw = k => t0 + BEAT * (Math.floor(k) + (k % 1 ? SWING : 0));   // swung eighth notes
  // chords: beat 1 and the "and" of 2
  c.notes.forEach((m, i) => { epiano(sw(0) + i * .012, m, BEAT * 1.6, .11); epiano(sw(1.5) + i * .01, m, BEAT * 1.2, .07); });
  // walking bass: root, fifth, third-ish, approach to next root
  [c.root, c.root + 7, c.root + 4 + (n % 2 ? -1 : 0), nxt.root + (nxt.root > c.root ? -1 : 1)].forEach((m, k) => bass(sw(k), m, BEAT * .9));
  // shaker on the off-beats
  for (let k = 0; k < 4; k++) { shaker(sw(k + .5), .05); if (k % 2) shaker(sw(k), .03); }
  // a little melody every other bar
  if (n % 2 === 1) {
    const pick = () => SCALE[Math.floor(Math.random() * SCALE.length)];
    [0, 1.5, 2.5].forEach(k => { if (Math.random() < .75) vibes(sw(k), pick()); });
  }
}

function tick() {
  if (!ctx) return;
  while (nextBar < ctx.currentTime + 1.2) { scheduleBar(nextBar, barNo++); nextBar += BAR; }
}

function start() {
  if (!on || !setup()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (timer) return;
  nextBar = ctx.currentTime + .1;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(.32, ctx.currentTime, .8);
  tick(); timer = setInterval(tick, 300);
}
function stop() {
  if (!ctx || !timer) return;
  clearInterval(timer); timer = null;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.0001, ctx.currentTime, .25);
}

export const Music = {
  get on() { return on; },
  toggle() { on = !on; try { localStorage.setItem(LS, on ? '1' : '0'); } catch (e) {} if (on) start(); else stop(); return on; },
  start, stop
};

// browsers only allow audio after a user gesture
const kick = () => { if (on) start(); };
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', kick, {passive: true});
  document.addEventListener('keydown', kick);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (on && ctx) start(); });
}
