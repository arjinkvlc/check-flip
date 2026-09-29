/**
 * Check Flip — end-of-game share card: draws a 1080×1080 image of the result
 * (headline, standings with avatars) and opens the system share sheet, or
 * downloads the image where sharing files isn't supported.
 */
import {standings, winners, isTeams} from './engine.js';
import {t, M} from './i18n.js';

const SIZE = 1080, SITE = 'checkflipgame.com';
const COLORS = ['#e2483d', '#3a7fc2', '#f0ad2c', '#1b9a86', '#8b5cf6', '#f07c2a'];
const img = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function fit(c, text, max, font) { let s = parseInt(font, 10); const rest = font.replace(/^\d+px/, ''); do { c.font = s + 'px' + rest; s -= 2; } while (c.measureText(text).width > max && s > 12); }

export async function drawCard(V, me) {
  try { await Promise.all([document.fonts.load('800 64px "Baloo 2"'), document.fonts.load('700 30px "Figtree"'), document.fonts.load('30px CFCoin', '¤')]); } catch (e) {}
  const cv = document.createElement('canvas'); cv.width = cv.height = SIZE; const c = cv.getContext('2d');
  // table felt
  const g = c.createRadialGradient(540, 380, 60, 540, 540, 820); g.addColorStop(0, '#2c5568'); g.addColorStop(.65, '#1e3a4c'); g.addColorStop(1, '#122735');
  c.fillStyle = g; c.fillRect(0, 0, SIZE, SIZE);
  c.fillStyle = 'rgba(255,255,255,.06)'; for (let x = 12; x < SIZE; x += 26) for (let y = 12; y < SIZE; y += 26) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
  // header
  const logo = await img('assets/logo.svg'); if (logo) c.drawImage(logo, 70, 58, 96, 96);
  c.fillStyle = '#ffffff'; c.font = '800 64px CFCoin, "Baloo 2", sans-serif'; c.textBaseline = 'middle'; c.fillText('Check Flip', 186, 110);
  // headline
  const win = winners(V), mine = win.includes(me), st = standings(V) || [], place = st.indexOf(me) + 1;
  const head = mine ? (isTeams(V) ? t('shareWeWon') : t('shareWon')) : me >= 0 ? t('sharePlace', place, V.pl.length) : t('shareOver');
  c.fillStyle = mine ? '#ffd166' : '#ffffff'; fit(c, head, 940, '800 84px CFCoin, "Baloo 2", sans-serif'); c.fillText(head, 70, 238);
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '700 34px CFCoin, "Figtree", sans-serif';
  c.fillText(t('shareSub', V.day, V.pl.length) + (isTeams(V) ? ' · 2v2' : ''), 72, 305);
  // receipt with standings
  const rows = st.slice(0, 6), top = 360, rh = 88, h = 70 + rows.length * rh;
  c.save(); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 30; c.shadowOffsetY = 12; c.fillStyle = '#f7f3e6'; roundRect(c, 70, top, 940, h, 26); c.fill(); c.restore();
  c.fillStyle = '#6f7a86'; c.font = '600 26px CFCoin, "IBM Plex Mono", monospace'; c.fillText(t('shareTable').toUpperCase(), 110, top + 42);
  for (let k = 0; k < rows.length; k++) {
    const i = rows[k], q = V.pl[i], y = top + 70 + k * rh + rh / 2, col = COLORS[i % COLORS.length];
    if (k) { c.strokeStyle = 'rgba(0,0,0,.12)'; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(110, y - rh / 2); c.lineTo(970, y - rh / 2); c.stroke(); c.setLineDash([]); }
    c.fillStyle = win.includes(i) ? '#c98a00' : '#26313d'; c.font = '800 40px CFCoin, "Baloo 2", sans-serif'; c.fillText(win.includes(i) ? '🏆' : '#' + (k + 1), 110, y + 2);
    // avatar
    c.save(); c.beginPath(); c.arc(232, y, 32, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 5; c.strokeStyle = col; c.stroke(); c.clip();
    const av = q.av ? await img('assets/avatars/' + q.av + '.svg') : null;
    if (av) c.drawImage(av, 200, y - 32, 64, 64); else { c.fillStyle = '#fff'; c.font = '800 34px CFCoin, "Baloo 2", sans-serif'; c.textAlign = 'center'; c.fillText((q.n || '?')[0].toUpperCase(), 232, y + 2); c.textAlign = 'left'; }
    c.restore();
    c.fillStyle = '#131a26'; fit(c, q.n + (i === me ? '  ←' : ''), 470, '700 38px CFCoin, "Figtree", sans-serif'); c.fillText(q.n + (i === me ? '  ←' : ''), 285, y + 2);
    c.textAlign = 'right'; c.fillStyle = q.a ? '#131a26' : '#9c2a22'; c.font = '800 38px CFCoin, "Baloo 2", sans-serif';
    c.fillText(q.a ? M(q.m) : t('shareOut'), 970, y + 2); c.textAlign = 'left';
  }
  // footer
  c.fillStyle = '#ffffff'; c.font = '800 44px CFCoin, "Baloo 2", sans-serif'; c.textAlign = 'center';
  c.fillText(t('tagline'), 540, SIZE - 118);
  c.fillStyle = '#ffd166'; c.font = '700 34px CFCoin, "Figtree", sans-serif'; c.fillText('▶ ' + SITE, 540, SIZE - 64);
  c.textAlign = 'left';
  return cv;
}

// returns 'shared' | 'downloaded' | 'cancelled'
export async function shareResult(V, me) {
  const cv = await drawCard(V, me);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const file = new File([blob], 'check-flip-result.png', {type: 'image/png'});
  const text = t('shareText', 'https://' + SITE);
  try {
    if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], text}); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try { await navigator.clipboard.writeText(text); } catch (e) {}
  return 'downloaded';
}
