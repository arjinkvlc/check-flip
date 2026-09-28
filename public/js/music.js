/**
 * Check Flip — light background music, generated live with WebAudio (no audio files).
 * A calm lounge / elevator-music loop: slow pad chords, a soft bass, a few bell
 * notes and a gentle reverb. On/off is remembered.
 */
const LS = 'cp-music';
// calm "lounge / elevator" style: slow tempo, soft pads, gentle bass, a few bell notes, lots of room
const BPM = 64, BEAT = 60 / BPM, BAR = BEAT * 4;
const CHORDS = [
  {root: 41, notes: [57, 60, 64, 67]},   // Fmaj9 (A C E G)
  {root: 40, notes: [55, 59, 62, 67]},   // Em7   (G B D G)
  {root: 38, notes: [53, 57, 60, 64]},   // Dm9   (F A C E)
  {root: 43, notes: [53, 59, 62, 64]}    // G13sus-ish (F B D E)
];
const BELLS = [72, 74, 76, 79, 81, 84];   // C major pentatonic, high and soft
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

let ctx = null, master = null, dry = null, wet = null, timer = null, nextBar = 0, barNo = 0;
let on = true;
try { on = localStorage.getItem(LS) !== '0'; } catch (e) {}

function reverb(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const cv = ctx.createConvolver(); cv.buffer = ir; return cv;
}
function setup() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.0001;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = .3;
  dry = ctx.createGain(); dry.gain.value = .75;
  wet = ctx.createGain(); wet.gain.value = .45;
  const rv = reverb(2.8);
  dry.connect(lp); wet.connect(rv); rv.connect(lp); lp.connect(master); master.connect(ctx.destination);
  return true;
}
const out = g => { g.connect(dry); g.connect(wet); };

// soft pad voice: slow swell and fade, two slightly detuned oscillators
function pad(t, m, dur, vel) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 1.1); g.gain.setTargetAtTime(0.0001, t + dur - .6, .5);
  for (const [type, det, amp] of [['sine', -4, 1], ['triangle', 5, .35]]) {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = hz(m); o.detune.value = det; og.gain.value = amp;
    o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 1.5);
  }
  out(g);
}
function bass(t, m, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(m);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.22, t + .08); g.gain.setTargetAtTime(0.0001, t + dur * .7, .35);
  o.connect(g); g.connect(dry); o.start(t); o.stop(t + dur + 1);
}
function bell(t, m) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  for (const [mul, amp] of [[1, 1], [2.76, .12]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(m) * mul; og.gain.value = amp; o.connect(og); og.connect(g); o.start(t); o.stop(t + 2.5); }
  out(g);
}

function scheduleBar(t0, n) {
  const c = CHORDS[n % CHORDS.length];
  c.notes.forEach((m, i) => pad(t0 + i * .05, m, BAR + .4, .035));
  bass(t0, c.root, BEAT * 1.8); bass(t0 + BEAT * 2, c.root + 7, BEAT * 1.6);
  // a couple of quiet bell notes every other bar
  if (n % 2 === 1) {
    const k = 1 + Math.floor(Math.random() * 2);
    for (let j = 0; j < k; j++) bell(t0 + BEAT * (1 + j * 1.5 + Math.random() * .3), BELLS[Math.floor(Math.random() * BELLS.length)]);
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
  master.gain.setTargetAtTime(.5, ctx.currentTime, 1.5);
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
