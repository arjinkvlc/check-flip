/**
 * Check Flip — shared bits for the browser tests (tests/e2e).
 *  - LAUNCH: Chromium launch options (CHROMIUM_PATH picks a ready-made browser, else Playwright's own)
 *  - SHOTS: folder for screenshots (tests/e2e/.shots, not committed)
 *  - stopServer(): stops the local Worker, for the tests that check what happens when the relay goes down
 */
import fs from 'fs';
import {execSync} from 'child_process';
export const LAUNCH = process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {};
export const SHOTS = process.env.E2E_SHOTS || new URL('./.shots/', import.meta.url).pathname;
fs.mkdirSync(SHOTS, {recursive: true});
export const PIDFILE = new URL('./.server.pid', import.meta.url).pathname;
export function stopServer() {
  try { const pid = +fs.readFileSync(PIDFILE, 'utf8'); process.kill(-pid, 'SIGTERM'); return; } catch (e) {}
  // started by hand (npx wrangler dev): stop it by name
  try { execSync("pkill -f 'wrangler.*dev'; pkill -f workerd", {stdio: 'ignore'}); } catch (e) {}
}
