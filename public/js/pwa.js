/**
 * Check Flip — installable app (PWA): registers the service worker (offline cache)
 * and keeps the browser's install prompt so the home screen can offer "Install app".
 */
import {VERSION} from './version.js';

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach(f => { try { f(); } catch (e) {} });

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
// true when we can show our own install button (Chrome/Edge/Android), or an iOS hint
export const canInstall = () => !isStandalone() && (!!deferred || isIOS());
export const onInstallChange = f => listeners.add(f);

export async function install() {
  if (deferred) {
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) {}
    deferred = null; notify();
    return 'prompted';
  }
  return isIOS() ? 'ios' : 'unavailable';
}

const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if ('serviceWorker' in navigator && secure) addEventListener('load', () => { navigator.serviceWorker.register('/sw.js?v=' + VERSION).catch(() => {}); });
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; notify(); });
addEventListener('appinstalled', () => { deferred = null; notify(); });
