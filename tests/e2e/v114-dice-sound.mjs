import {LAUNCH, SHOTS, stopServer} from './lib.mjs';
import {chromium} from 'playwright';
const b = await chromium.launch(LAUNCH); const p = await b.newPage();
await p.route(/supabase|fonts\./, r => r.abort());
await p.goto('http://127.0.0.1:8787/');
console.log(await p.evaluate(async () => { const c = new AudioContext(); const out = []; for (const u of ['/assets/sfx/dice-roll.mp3', '/assets/sfx/dice-land.mp3']) { const r = await fetch(u); const buf = await c.decodeAudioData(await r.arrayBuffer()); out.push(u + ' ' + r.status + ' ' + buf.duration.toFixed(2) + 's'); } return out.join(' | '); }));
await b.close();
