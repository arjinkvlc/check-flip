/**
 * Check Flip — runs the browser tests one after another against a local Worker (wrangler dev).
 *   node tests/e2e/run-all.mjs            all tests
 *   node tests/e2e/run-all.mjs v114 run   only these
 *   --no-setup                            skip preparing the database
 * Needs a Postgres (see setup-db.mjs) and Chromium (npx playwright install chromium, or CHROMIUM_PATH).
 * Exit code 1 when any test fails.
 */
import fs from 'fs';
import {spawn, spawnSync} from 'child_process';
import {PIDFILE} from './lib.mjs';
const HERE = new URL('./', import.meta.url).pathname, ROOT = new URL('../../', import.meta.url).pathname;
// order matters a little: run.mjs starts from an empty user table
const ALL = ['run', 'bots', 'mp', 'six', 'taxi', 'ts110', 'v11', 'v13', 'v14', 'v15', 'v16', 'v18', 'v110', 'v112', 'q112', 'v114', 'v114-hidden-card', 'v114-dice-sound', 'lang111', 'fallback', 'fallback2', 'v115'];
const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--'));
const list = only.length ? only : ALL;
const BASE = 'http://127.0.0.1:8787/';

// the Worker reads its local settings from .dev.vars; the tests point it at the Supabase stand-in on :8899
const devVars = ROOT + '.dev.vars';
if (!fs.existsSync(devVars)) fs.writeFileSync(devVars, `SUPABASE_URL=http://127.0.0.1:8899\nCHAT_SECRET=${process.env.E2E_CHAT_SECRET || 'e2e-local-chat-secret'}\n`);

// the database must know the same chat secret as the Worker
const sec = (fs.readFileSync(devVars, 'utf8').match(/^CHAT_SECRET=(.*)$/m) || [])[1];
if (sec) process.env.E2E_CHAT_SECRET = sec.trim();
if (!args.includes('--no-setup')) { const r = spawnSync('node', [HERE + 'setup-db.mjs'], {stdio: 'inherit'}); if (r.status) process.exit(1); }

const up = async () => { try { return (await fetch(BASE)).ok; } catch (e) { return false; } };
let server = null;
async function start() {
  if (await up()) return;
  const log = fs.openSync(HERE + '.shots/wrangler.log', 'a');
  server = spawn('npx', ['wrangler', 'dev', '--port', '8787', '--ip', '127.0.0.1'], {cwd: ROOT, detached: true, stdio: ['ignore', log, log], env: {...process.env, WRANGLER_SEND_METRICS: 'false'}});
  fs.writeFileSync(PIDFILE, String(server.pid));
  for (let i = 0; i < 120; i++) { if (await up()) return; await new Promise(r => setTimeout(r, 1000)); }
  throw new Error('wrangler dev did not start (see tests/e2e/.shots/wrangler.log)');
}
const stop = () => { try { if (server) process.kill(-server.pid, 'SIGTERM'); } catch (e) {} try { fs.unlinkSync(PIDFILE); } catch (e) {} };
process.on('exit', stop);

const results = [];
for (const name of list) {
  await start();
  const t0 = Date.now();
  console.log(`\n=== ${name}`);
  const once = () => spawnSync('node', [HERE + name + '.mjs'], {cwd: HERE, stdio: 'inherit', timeout: 6 * 60 * 1000}).status === 0;
  // a few tests depend on dice and card luck (e.g. a bot holding a card); one retry tells luck from a real failure
  let ok = once(), retried = false;
  if (!ok) { console.log(`--- ${name} failed, retrying once`); retried = true; await start(); ok = once(); }
  results.push({name, ok, retried, s: Math.round((Date.now() - t0) / 1000)});
}
stop();
console.log('\n' + results.map(r => `${r.ok ? 'pass' : 'FAIL'}  ${r.name} (${r.s} s)${r.retried ? (r.ok ? ', passed on retry' : ', failed twice') : ''}`).join('\n'));
const failed = results.filter(r => !r.ok).length;
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
