/**
 * Check Flip — admin screen (only for accounts in public.admins; the database checks it on every call).
 *  - Numbers: visitors, new visitors, games by kind and how many new visitors came back after 1 and 7 days
 *  - Reports: reported chat lines (signed by the game server), with one-click chat / account bans
 *  - Bans: active sanctions, which can be lifted
 */
import {setHTML} from './patch.js';
import {EVENT_KEYS, THEMED, previewOf, setPreview} from './events.js';
import {ACC, isAdmin, adminMetrics, adminReports, adminSanctions, adminSanction, adminLift, adminDismiss, adminSources, adminDropoff, adminGames, adminErrors, adminFeedback, adminFeedbackStatus} from './account.js';
import {t, locale} from './i18n.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const AD = {tab: 'metrics', data: {}, busy: false, err: '', msg: '', status: 'open', fbStatus: 'new'};
let H = null;
export function initAdminUI(hooks) { H = hooks; }
const rerender = () => { if (H) H.render(); };
const when = v => {
  if (!v) return '';
  if (v === 'infinity') return t('banForever');
  return new Date(v).toLocaleString(locale(), {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
};
const pct = v => v == null ? '–' : v + '%';

async function load(tab, force) {
  if (AD.busy || (!force && AD.data[tab])) return;
  AD.busy = true; AD.err = '';
  try {
    if (tab === 'metrics') {
      // players connected to a table right now: the real number, also below the home screen's threshold of 5
      AD.online = await fetch('/api/online', {cache: 'no-store'}).then(r => r.json()).then(j => +j.n || 0).catch(() => null);
      AD.data.metrics = await adminMetrics(14);
      // v1.16: sources, where games stop, latest games (each may be missing if the database is older)
      [AD.data.sources, AD.data.dropoff, AD.data.games] = await Promise.all([adminSources(), adminDropoff(), adminGames()].map(p => p.catch(() => null)));
    }
    else if (tab === 'feedback') AD.data.feedback = await adminFeedback(AD.fbStatus);
    else if (tab === 'errors') AD.data.errors = await adminErrors();
    else if (tab === 'reports') AD.data.reports = await adminReports(AD.status);
    else AD.data.bans = await adminSanctions();
  } catch (e) { AD.err = (e && (e.key || e.message)) || 'error'; }
  AD.busy = false; rerender();
}

function metricsHTML(rows) {
  if (!rows) return `<p class="note">${esc(t('aLoading'))}</p>`;
  const tot = k => rows.reduce((s, r) => s + (r[k] || 0), 0);
  return `<div class="admsum">
      <div class="stat"><b>${AD.online == null ? '–' : AD.online}</b><small>${esc(t('admOnline'))}</small></div>
      <div class="stat"><b>${tot('visitors')}</b><small>${esc(t('admVisitors'))}</small></div>
      <div class="stat"><b>${tot('new_visitors')}</b><small>${esc(t('admNew'))}</small></div>
      <div class="stat"><b>${tot('games_started')}</b><small>${esc(t('admStarted'))}</small></div>
      <div class="stat"><b>${tot('games_finished')}</b><small>${esc(t('admFinished'))}</small></div></div>
    <p class="note">${esc(t('admOnlineNote'))} ${esc(t('admLast14'))}</p>
    <div class="admtable"><table><thead><tr><th>${esc(t('admDay'))}</th><th>${esc(t('admVisitors'))}</th><th>${esc(t('admNew'))}</th><th>${esc(t('admPlayers'))}</th>
      <th>${esc(t('admStarted'))}</th><th>${esc(t('admFinished'))}</th><th>${esc(t('admKinds'))}</th><th>D1</th><th>D7</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(String(r.day).slice(5))}</td><td>${r.visitors}</td><td>${r.new_visitors}</td><td>${r.players}</td><td>${r.games_started}</td><td>${r.games_finished}</td>
        <td class="kinds">${r.quick}/${r.room}/${r.solo}/${r.local}</td><td>${pct(r.d1)}</td><td>${pct(r.d7)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="note">${esc(t('admKindsNote'))} ${esc(t('admRetNote'))}</p>
    ${sourcesHTML(AD.data.sources)}${dropoffHTML(AD.data.dropoff)}${gamesHTML(AD.data.games)}`;
}
const kindName = k => ['quick', 'room', 'solo', 'local'].includes(k) ? t('admK_' + k) : (k || '?');
const pctOf = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
function sourcesHTML(rows) {
  if (!rows) return '';
  return `<h3 class="admh">${esc(t('admSourcesT'))}</h3>` + (rows.length ? `<div class="admtable"><table><thead><tr><th>${esc(t('admSrc'))}</th><th>${esc(t('admNew'))}</th>
      <th>${esc(t('admPlayed'))}</th><th>${esc(t('admFinished'))}</th><th>${esc(t('admBack1'))}</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.source)}</td><td>${r.new_visitors}</td><td>${r.played} <small>${pctOf(r.played, r.new_visitors)}</small></td>
        <td>${r.finished} <small>${pctOf(r.finished, r.new_visitors)}</small></td><td>${r.back1} <small>${pctOf(r.back1, r.new_visitors)}</small></td></tr>`).join('')}
    </tbody></table></div><p class="note">${esc(t('admSrcNote'))}</p>` : `<p class="note">${esc(t('admNoData'))}</p>`);
}
function dropoffHTML(rows) {
  if (!rows) return '';
  return `<h3 class="admh">${esc(t('admDropT'))}</h3>` + (rows.length ? `<div class="admtable"><table><thead><tr><th></th><th>${esc(t('admStarted'))}</th><th>${esc(t('admFinished'))}</th>
      <th>${esc(t('admQuit'))}</th><th>1</th><th>2</th><th>3</th><th>4–5</th><th>6–9</th><th>10+</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(kindName(r.mode))}</td><td>${r.started}</td><td>${r.finished} <small>${pctOf(r.finished, r.started)}</small></td>
        <td>${r.quit} <small>${pctOf(r.quit, r.started)}</small></td><td>${r.q1}</td><td>${r.q2}</td><td>${r.q3}</td><td>${r.q4_5}</td><td>${r.q6_9}</td><td>${r.q10}</td></tr>`).join('')}
    </tbody></table></div><p class="note">${esc(t('admQuitDays'))}</p>` : `<p class="note">${esc(t('admNoData'))}</p>`);
}
function gamesHTML(rows) {
  if (!rows) return '';
  return `<h3 class="admh">${esc(t('admGamesT'))}</h3>` + (rows.length ? `<div class="admtable"><table><thead><tr><th></th><th></th><th>${esc(t('admDevices'))}</th><th>${esc(t('admDayReached'))}</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(when(r.started_at))}</td><td>${esc(kindName(r.mode))}</td><td>${r.devices}</td><td>${r.day_reached == null ? '–' : r.day_reached}</td>
        <td>${esc(r.finished ? t('admStDone') : r.quit ? t('admStQuit') : t('admStOpen'))}</td></tr>`).join('')}
    </tbody></table></div>` : `<p class="note">${esc(t('admNoData'))}</p>`);
}
function feedbackHTML(rows) {
  const tabs = ['new', 'done', 'all'].map(s => `<button class="stab${AD.fbStatus === s ? ' on' : ''}" data-a="admFbStatus" data-s="${s}">${esc(t(s === 'new' ? 'admFbNew' : s === 'done' ? 'admFbDone' : 'admFbAll'))}</button>`).join('');
  if (!rows) return `<div class="segtabs">${tabs}</div><p class="note">${esc(t('aLoading'))}</p>`;
  const kn = k => t(k === 'bug' ? 'fbBug' : k === 'idea' ? 'fbIdea' : 'fbOther');
  return `<div class="segtabs">${tabs}</div>` + (rows.length ? `<ul class="admlist">${rows.map(r => `<li>
      <div class="admhead"><b>${esc(kn(r.kind))}</b><small>${esc(r.username || t('admGuest'))} · ${esc(when(r.created_at))} · ${esc(r.lang || '')} · v${esc(r.ver || '?')}</small></div>
      <blockquote>${esc(r.body)}</blockquote><small class="note">${esc(r.ua || '')}</small>
      <button class="linkbtn" data-a="admFbMark" data-id="${r.id}" data-s="${r.status === 'new' ? 'done' : 'new'}">${esc(t(r.status === 'new' ? 'admMarkDone' : 'admMarkNew'))}</button>
    </li>`).join('')}</ul>` : `<p class="note">${esc(t('admNoFeedback'))}</p>`);
}
function errorsHTML(rows) {
  if (!rows) return `<p class="note">${esc(t('aLoading'))}</p>`;
  return rows.length ? `<ul class="admlist">${rows.map(r => `<li>
      <div class="admhead"><b>${esc(r.msg)}</b><small>${r.n}× · ${r.devices} ${esc(t('admDevices'))} · ${esc(when(r.last_at))} · v${esc(r.ver || '?')}</small></div>
      <small class="note">${esc(r.place || '')}${r.phase ? ' · ' + esc(r.phase) : ''}</small><br><small class="note">${esc(r.ua || '')}</small>
    </li>`).join('')}</ul>` : `<p class="note">${esc(t('admNoErrors'))}</p>`;
}

const banBtns = (u, id) => `<div class="admbtns">
    <span>${esc(t('admChat'))}</span>${[1, 7, 30, 0].map(d => `<button class="btn small" data-a="admBan" data-u="${esc(u)}" data-k="chat" data-d="${d}" data-r="${id || ''}">${esc(d ? t('admDays', d) : t('banForever'))}</button>`).join('')}
    <span>${esc(t('admAccount'))}</span>${[1, 7, 30, 0].map(d => `<button class="btn small ghost" data-a="admBan" data-u="${esc(u)}" data-k="account" data-d="${d}" data-r="${id || ''}">${esc(d ? t('admDays', d) : t('banForever'))}</button>`).join('')}
  </div>`;

function reportsHTML(rows) {
  const tabs = ['open', 'auto', 'actioned', 'dismissed', 'all'].map(s => `<button class="stab${AD.status === s ? ' on' : ''}" data-a="admStatus" data-s="${s}">${esc(t('admSt_' + s))}</button>`).join('');
  if (!rows) return `<div class="segtabs">${tabs}</div><p class="note">${esc(t('aLoading'))}</p>`;
  return `<div class="segtabs">${tabs}</div>` + (rows.length ? `<ul class="admlist">${rows.map(r => `<li>
      <div class="admhead"><b>${esc(r.reported_name)}</b><small>${esc(t('admBy', r.reporter_name))} · ${esc(r.room)} · ${esc(when(r.said_at))}</small></div>
      <blockquote>${esc(r.message)}</blockquote>
      <small class="note">${esc(t('admCounts', r.reports_24h, r.past_sanctions))}${r.chat_until ? ' · ' + esc(t('admChatUntil', when(r.chat_until))) : ''}${r.account_until ? ' · ' + esc(t('admAccUntil', when(r.account_until))) : ''}${r.note ? ' · ' + esc(r.note) : ''}</small>
      ${r.status === 'open' || r.status === 'auto' ? banBtns(r.reported_name, r.id) + `<button class="linkbtn" data-a="admDismiss" data-id="${r.id}">${esc(t('admDismiss'))}</button>` : ''}
    </li>`).join('')}</ul>` : `<p class="note">${esc(t('admNoReports'))}</p>`);
}

function bansHTML(rows) {
  const form = `<div class="admform"><input id="admUser" maxlength="14" placeholder="${esc(t('aUsername'))}" autocomplete="off"></div>
    <div id="admManual">${banBtns('', '')}</div>`;
  if (!rows) return form + `<p class="note">${esc(t('aLoading'))}</p>`;
  return form + (rows.length ? `<ul class="admlist">${rows.map(r => `<li><div class="admhead"><b>${esc(r.username)}</b>
      <small>${esc(r.kind === 'chat' ? t('admChat') : t('admAccount'))} · ${esc(r.until ? t('admUntil', when(r.until)) : t('banForever'))} · ${esc(r.auto ? t('admAuto') : t('admManualTag'))}${r.reason ? ' · ' + esc(r.reason) : ''}</small></div>
      <button class="btn small ghost" data-a="admLift" data-id="${r.id}">${esc(t('admLift'))}</button></li>`).join('')}</ul>` : `<p class="note">${esc(t('admNoBans'))}</p>`);
}

// v1.17: theme preview for the admin's own browser (never awards anything; the server checks the dates)
function previewHTML() {
  const cur = previewOf() || '';
  const btn = (k, label, dis) => `<button class="stab${cur === k ? ' on' : ''}" data-a="admPrev" data-k="${k}" ${dis ? 'disabled' : ''}>${esc(label)}</button>`;
  return `<details class="admprev box"${cur ? ' open' : ''}><summary><b>${esc(t('admPrev'))}</b>${cur ? ` · ${esc(t('evName', cur))}` : ''}</summary><p class="note">${esc(t('admPrevNote'))}</p>
    <div class="segtabs">${btn('', t('admPrevOff'))}${EVENT_KEYS.map(k => btn(k, THEMED[k] ? t('evName', k) : t('admPrevSoon', t('evName', k)), !THEMED[k])).join('')}</div></details>`;
}
export function renderAdmin(el) {
  if (!isAdmin()) { setHTML(el, `<div class="box"><p class="note">${esc(t('admOnly'))}</p><button class="btn ghost" data-a="profBack">${esc(t('pBack'))}</button></div>`); return; }
  const tab = AD.tab; load(tab);
  const body = tab === 'metrics' ? metricsHTML(AD.data.metrics) : tab === 'reports' ? reportsHTML(AD.data.reports) : tab === 'feedback' ? feedbackHTML(AD.data.feedback) : tab === 'errors' ? errorsHTML(AD.data.errors) : bansHTML(AD.data.bans);
  setHTML(el, `<div class="scrhead"><button class="iconbtn backbtn" data-a="profBack" aria-label="${esc(t('pBack').replace(/^\W+/, ''))}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span>${esc(t('pBack').replace(/^\W+/, ''))}</span></button>
      <button class="btn small ghost" data-a="admRefresh">${esc(t('admRefresh'))}</button></div>
    <div class="scrtitle"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg><div><h1>${esc(t('adminTitle'))}</h1><p class="note">${esc(ACC.profile ? ACC.profile.username : '')}</p></div></div>
    <div class="segtabs"><button class="stab${tab === 'metrics' ? ' on' : ''}" data-a="admTab" data-t="metrics">${esc(t('admTabMetrics'))}</button>
      <button class="stab${tab === 'reports' ? ' on' : ''}" data-a="admTab" data-t="reports">${esc(t('admTabReports'))}</button>
      <button class="stab${tab === 'bans' ? ' on' : ''}" data-a="admTab" data-t="bans">${esc(t('admTabBans'))}</button>
      <button class="stab${tab === 'feedback' ? ' on' : ''}" data-a="admTab" data-t="feedback">${esc(t('admTabFeedback'))}</button>
      <button class="stab${tab === 'errors' ? ' on' : ''}" data-a="admTab" data-t="errors">${esc(t('admTabErrors'))}</button></div>
    ${previewHTML()}${AD.err ? `<p class="err">${esc(AD.err)}</p>` : ''}${AD.msg ? `<p class="okmsg">${esc(AD.msg)}</p>` : ''}
    <div class="box">${body}</div>`);
}

async function act(fn, done) {
  if (AD.busy) return; AD.busy = true; AD.err = ''; AD.msg = '';
  try { await fn(); AD.msg = done; } catch (e) { AD.err = (e && (e.key || e.message)) || 'error'; }
  AD.busy = false; AD.data = {}; rerender();
}

export function adminClick(a, b) {
  switch (a) {
    case 'admPrev': setPreview(b.dataset.k || null); rerender(); return true;
    case 'admTab': AD.tab = b.dataset.t; AD.msg = ''; AD.err = ''; rerender(); return true;
    case 'admRefresh': AD.data = {}; AD.msg = ''; rerender(); return true;
    case 'admStatus': AD.status = b.dataset.s; delete AD.data.reports; rerender(); return true;
    case 'admFbStatus': AD.fbStatus = b.dataset.s; delete AD.data.feedback; rerender(); return true;
    case 'admFbMark': act(() => adminFeedbackStatus(+b.dataset.id, b.dataset.s), t('admDone')); return true;
    case 'admBan': {
      const u = b.dataset.u || (document.getElementById('admUser') || {}).value || '';
      if (!/^[A-Za-z0-9_]{3,14}$/.test(u.trim())) { AD.err = t('aErrName'); rerender(); return true; }
      const d = +b.dataset.d || null, kind = b.dataset.k;
      if (!confirm(t('admBanQ', u.trim(), kind === 'chat' ? t('admChat') : t('admAccount'), d ? t('admDays', d) : t('banForever')))) return true;
      act(() => adminSanction(u.trim(), kind, d, b.dataset.r ? +b.dataset.r : null), t('admDone'));
      return true;
    }
    case 'admLift': act(() => adminLift(+b.dataset.id), t('admDone')); return true;
    case 'admDismiss': act(() => adminDismiss(+b.dataset.id), t('admDone')); return true;
  }
  return false;
}
