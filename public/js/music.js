/**
 * Check Flip — background music, generated live with WebAudio (no audio files).
 * Two scenes:
 *  - 'menu': a light, sneaky tiptoe tune (someone quietly slipping away before the check arrives):
 *    pizzicato bass, soft off-beat chords, a staccato clarinet-like melody and a brushed hi-hat.
 *  - 'game': the calm lounge / elevator loop (slow pads, soft bass, a few bells).
 * Switching scenes cross-fades at the next bar. On/off is remembered.
 * v1.17: seasonal flavours of the same tunes: Halloween (slower, darker chords, organ, a tolling bell), New Year
 * (major key, celesta, sleigh bells), Valentine's Day (slower, soft flute, harp and strings), Easter (major key,
 * quicker, flute and birdsong).
 */
const LS = 'cp-music';
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

/* ---- game scene: calm lounge ---- */
const G_BEAT = 60 / 64, G_BAR = G_BEAT * 4;
const G_CHORDS = [
  {root: 41, notes: [57, 60, 64, 67]},   // Fmaj9
  {root: 40, notes: [55, 59, 62, 67]},   // Em7
  {root: 38, notes: [53, 57, 60, 64]},   // Dm9
  {root: 43, notes: [53, 59, 62, 64]}    // G13sus
];
const BELLS = [72, 74, 76, 79, 81, 84];
// Halloween: same roots and rhythm, darker chords (Fm9, Em7♭5, Dm9, G7♭9) and minor-pentatonic bells
const G_CHORDS_HW = [
  {root: 41, notes: [56, 60, 63, 67]}, {root: 40, notes: [55, 58, 62, 67]}, {root: 38, notes: [53, 57, 60, 64]}, {root: 43, notes: [53, 59, 62, 68]}
];
const BELLS_HW = [72, 75, 77, 79, 82, 84];
let flavor = null;   // null, 'halloween', 'newyear', 'valentine' or 'easter'
const FLAVORS = {halloween: 1, newyear: 1, valentine: 1, easter: 1};
const BPM = {halloween: 90, valentine: 92, easter: 112};
// New Year and Easter play the menu tune in D major (F → F♯, B♭ → B)
const maj = m => flavor === 'newyear' || flavor === 'easter' ? (m % 12 === 5 || m % 12 === 10 ? m + 1 : m) : m;

/* ---- menu scene: sneaky tiptoe in D minor, 8 bars of eighths (null = rest) ---- */
const M_BPM = 104, M_E = 60 / M_BPM / 2;
const mE = () => BPM[flavor] ? 60 / BPM[flavor] / 2 : M_E, mBar = () => mE() * 8;
const M_ROOTS = [38, 38, 34, 33, 38, 38, 31, 33];               // Dm Dm Bb A7 Dm Dm Gm A7
const M_CHORDS = [[62, 65, 69], [62, 65, 69], [62, 65, 70], [61, 64, 67], [62, 65, 69], [62, 65, 69], [62, 67, 70], [61, 64, 67]];
const M_MEL = [
  [69, null, 70, null, 69, null, 68, 69],
  [null, 65, null, 69, null, 74, null, null],
  [70, null, 69, null, 67, null, 65, null],
  [64, null, 61, null, 64, 67, 69, null],
  [69, null, 70, null, 69, null, 68, 69],
  [null, 74, null, 73, null, 74, 77, null],
  [79, null, 77, null, 74, null, 70, null],
  [69, null, 68, null, 67, 65, 64, 61]
];

let ctx = null, master = null, dry = null, wet = null, lpN = null, rvN = null, noise = null, timer = null, nextBar = 0, barNo = 0;
let scene = 'menu', want = 'menu', switching = false;
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
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = .3;
  const rv = reverb(2.4);
  rv.connect(lp); lp.connect(master); master.connect(ctx.destination);
  lpN = lp; rvN = rv; newBus();
  const n = ctx.createBuffer(1, ctx.sampleRate * .2, ctx.sampleRate), d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noise = n;
  return true;
}
const out = (g, w = true) => { g.connect(dry); if (w) g.connect(wet); };
// each scene plays through its own pair of gains; on a switch the old pair is faded out and cut off,
// so long notes of the old scene (pads, reverb tails) can't ring on under the new one (v1.14 fix)
function newBus() {
  dry = ctx.createGain(); dry.gain.value = .75; wet = ctx.createGain(); wet.gain.value = .4;
  dry.connect(lpN); wet.connect(rvN);
}
function dropBus() {
  if (!dry) return;
  const d = dry, w = wet, t = ctx.currentTime;
  for (const g of [d, w]) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + .5); }
  setTimeout(() => { try { d.disconnect(); w.disconnect(); } catch (e) {} }, 700);
  newBus();
}

/* ---- instruments ---- */
function pad(t, m, dur, vel) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 1.1); g.gain.setTargetAtTime(0.0001, t + dur - .6, .5);
  for (const [type, det, amp] of [['sine', -4, 1], ['triangle', 5, .35]]) {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = hz(m); o.detune.value = det; og.gain.value = amp;
    o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 1.5);
  }
  out(g);
}
function softBass(t, m, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(m);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.22, t + .08); g.gain.setTargetAtTime(0.0001, t + dur * .7, .35);
  o.connect(g); g.connect(dry); o.start(t); o.stop(t + dur + 1);
}
function bell(t, m, vel = .06) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  for (const [mul, amp] of [[1, 1], [2.76, .12]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(m) * mul; og.gain.value = amp; o.connect(og); og.connect(g); o.start(t); o.stop(t + 2.5); }
  out(g);
}
// plucked string: short triangle with a quick decay through a closing filter
function pluck(t, m, vel, len = .28) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = hz(m);
  f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(300, t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + .006); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f); f.connect(g); out(g, false); o.start(t); o.stop(t + len + .05);
}
// clarinet-ish staccato lead: filtered square with a touch of vibrato
function reed(t, m, len, vel = .05) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'square'; o.frequency.value = hz(m);
  lfo.frequency.value = 5.2; lg.gain.value = 4; lfo.connect(lg); lg.connect(o.detune);
  f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = .8;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + .02); g.gain.setTargetAtTime(0.0001, t + len * .6, .05);
  o.connect(f); f.connect(g); out(g); o.start(t); lfo.start(t); o.stop(t + len + .3); lfo.stop(t + len + .3);
}
// Halloween: a breathy church organ (two detuned saws an octave apart, slow tremolo)
function organ(t, m, len, vel = .035) {
  const f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  f.type = 'lowpass'; f.frequency.value = 1300; f.Q.value = .5;
  lfo.frequency.value = 4.2; lg.gain.value = vel * .25; lfo.connect(lg); lg.connect(g.gain);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + .04); g.gain.setTargetAtTime(0.0001, t + len * .8, .08);
  for (const [mul, det] of [[1, -6], [2, 5]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m) * mul; o.detune.value = det; o.connect(f); o.start(t); o.stop(t + len + .5); }
  f.connect(g); out(g); lfo.start(t); lfo.stop(t + len + .5);
}
// New Year: sleigh bells (a shaken burst of tiny jingles)
function sleigh(t, vel = .02) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 7500; f.Q.value = 1.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + .12);
  s.connect(f); f.connect(g); g.connect(dry); s.start(t); s.stop(t + .15);
  for (let k = 0; k < 2; k++) { const o = ctx.createOscillator(), og = ctx.createGain(), tt = t + k * .02; o.type = 'sine'; o.frequency.value = 3800 + Math.random() * 1600;
    og.gain.setValueAtTime(vel * .5, tt); og.gain.exponentialRampToValueAtTime(0.0001, tt + .08); o.connect(og); og.connect(dry); o.start(tt); o.stop(tt + .1); }
}
// Valentine's Day / Easter: a soft flute (sine with a breath of noise and a gentle vibrato)
function flute(t, m, len, vel = .04) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'sine'; o.frequency.value = hz(m); lfo.frequency.value = 5; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.detune);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + .05); g.gain.setTargetAtTime(0.0001, t + len * .7, .07);
  o.connect(g); out(g); o.start(t); lfo.start(t); o.stop(t + len + .4); lfo.stop(t + len + .4);
}
// Easter: a little bird (two quick rising whistles)
function chirp(t) {
  for (let k = 0; k < 2; k++) { const o = ctx.createOscillator(), g = ctx.createGain(), tt = t + k * .11, f0 = 2600 + Math.random() * 500;
    o.type = 'sine'; o.frequency.setValueAtTime(f0, tt); o.frequency.exponentialRampToValueAtTime(f0 * 1.35, tt + .07);
    g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(.018, tt + .01); g.gain.exponentialRampToValueAtTime(0.0001, tt + .08);
    o.connect(g); out(g); o.start(tt); o.stop(tt + .1); }
}
function brush(t, vel = .018) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; f.type = 'highpass'; f.frequency.value = 6500;
  g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .07);
  s.connect(f); f.connect(g); g.connect(dry); s.start(t); s.stop(t + .1);
}

/* ---- bars ---- */
function gameBar(t0, n) {
  const hw = flavor === 'halloween', c = (hw ? G_CHORDS_HW : G_CHORDS)[n % G_CHORDS.length];
  if (hw && n % 4 === 0) bell(t0, 48, .05);   // a far-off tolling bell
  if (flavor === 'newyear') for (let b = 0; b < 4; b++) sleigh(t0 + G_BEAT * b, b % 2 ? .012 : .02);
  if (flavor === 'valentine') c.notes.concat(c.notes.map(m => m + 12)).forEach((m, i) => pluck(t0 + i * G_BEAT / 2, m + 12, .035, .9));   // harp
  if (flavor === 'easter' && n % 3 === 1) chirp(t0 + G_BEAT * (1.5 + Math.random()));
  c.notes.forEach((m, i) => pad(t0 + i * .05, m, G_BAR + .4, .035));
  softBass(t0, c.root, G_BEAT * 1.8); softBass(t0 + G_BEAT * 2, c.root + 7, G_BEAT * 1.6);
  if (n % 2 === 1) {
    const k = 1 + Math.floor(Math.random() * 2);
    for (let j = 0; j < k; j++) { const B = hw ? BELLS_HW : BELLS; bell(t0 + G_BEAT * (1 + j * 1.5 + Math.random() * .3), B[Math.floor(Math.random() * B.length)]); }
  }
}
function menuBar(t0, n) {
  const k = n % 8, pass = Math.floor(n / 8) % 2, root = M_ROOTS[k], E = mE(), hw = flavor === 'halloween';
  const at = j => t0 + j * E + (j % 2 ? E * .16 : 0);           // light swing
  if (hw && k % 4 === 0) bell(t0, root + 12, .045);   // Halloween: a bell tolls every four bars
  if (flavor === 'valentine') M_CHORDS[k].forEach(m => pad(t0, m - 12, E * 8 + .3, .016));   // warm strings underneath
  if (flavor === 'easter' && k % 4 === 2) chirp(t0 + E * 3);
  // pizzicato bass: root / fifth on the beats, a chromatic walk-up into the next bar
  const R = maj(root) === root ? root : root + 1;
  [0, 2, 4, 6].forEach((j, x) => pluck(at(j), (x % 2 ? R + 7 : R) + (x === 3 && k % 4 === 3 ? 6 : 0), .2));
  // soft off-beat chord stabs (the "tiptoe")
  [1, 3, 5, 7].forEach(j => M_CHORDS[k].forEach(m => pluck(at(j), maj(m), flavor === 'valentine' ? .022 : .035, .16)));
  // melody: clarinet on the first pass, plucked with a bell on the second
  const lead = hw ? organ : flavor === 'newyear' ? (t, m) => bell(t, m + 12, .05) : flavor === 'valentine' || flavor === 'easter' ? (t, m, l) => flute(t, m + 12, l) : reed;
  M_MEL[k].forEach((m, j) => { if (m == null) return; m = maj(m); if (pass === 0) lead(at(j), m, E * .8); else { pluck(at(j), m + 12, .07, .3); if (j === 0) bell(at(j), m + 12, .025); } });
  // brushed hat on the off-beats
  [1, 3, 5, 7].forEach(j => flavor === 'newyear' ? sleigh(at(j), .014) : flavor === 'valentine' ? null : brush(at(j)));
}

function tick() {
  if (!ctx) return;
  const len = scene === 'menu' ? mBar() : G_BAR;
  while (nextBar < ctx.currentTime + 1.2) {
    if (want !== scene && !switching) { crossTo(want); return; }
    (scene === 'menu' ? menuBar : gameBar)(nextBar, barNo++); nextBar += len;
  }
}
const VOL = () => scene === 'menu' ? .42 : .5;
function crossTo(sc) {
  switching = true;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(0.0001, t, .35);
  setTimeout(() => {
    scene = sc; barNo = 0; switching = false;
    dropBus();
    if (!timer) return;
    nextBar = ctx.currentTime + .15;
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(VOL(), ctx.currentTime, 1.2);
    tick();
  }, 1300);
}

function start() {
  if (!on || !setup()) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (timer) return;
  scene = want; barNo = 0; switching = false;
  nextBar = ctx.currentTime + .1;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(VOL(), ctx.currentTime, 1.5);
  tick(); timer = setInterval(tick, 300);
}
function stop() {
  if (!ctx || !timer) return;
  clearInterval(timer); timer = null; switching = false;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.0001, ctx.currentTime, .25);
  setTimeout(() => { if (!timer) dropBus(); }, 600);   // notes already scheduled must not come back on the next start
}

export const Music = {
  get on() { return on; },
  get current() { return want; },
  toggle() { on = !on; try { localStorage.setItem(LS, on ? '1' : '0'); } catch (e) {} if (on) start(); else stop(); return on; },
  // 'menu' or 'game'; switches at the next bar with a short cross-fade
  scene(sc) { if (sc !== 'menu' && sc !== 'game') return; want = sc; },
  // seasonal variation of both tunes (null = the usual one); takes effect from the next bar
  flavor(ev) { flavor = FLAVORS[ev] ? ev : null; },
  get flavorNow() { return flavor; },
  start, stop
};

// browsers only allow audio after a user gesture
const kick = () => { if (on) start(); };
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', kick, {passive: true});
  document.addEventListener('keydown', kick);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (on && ctx) start(); });
}
