/**
 * Check Flip — social screens: friends, leaderboards, player profile cards,
 * game invites (toast) and the "invite friends" box in a private lobby.
 */
import {
  ACC, ACHS, titleCls, loggedIn, level, levelOf, xpFor, MAX_LEVEL, safeItem, leaderboard, publicProfile,
  friendAdd, friendRespond, friendRemove, inviteFriend, inviteDismiss, pollSocial, USERNAME_RE, onAccount, mySeason, friendMatches
} from './account.js';
import {frCls, medalHTML, medalsRow, seasonNow, seasonDaysLeft} from './account-ui.js';
import {t, getLang, locale} from './i18n.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let H = null;   // hooks from app.js
export const SU = {fm: null, fmAt: 0, lbKind: 'weekly', lb: {}, lbAt: {}, lbErr: '', fMsg: '', fErr: '', busy: false, invited: {}, hidden: {}};
export function initSocialUI(hooks) { H = hooks; }

// small round avatar with the player's equipped frame
function face(eq, name, big) {
  const e = eq || {}, av = e.avatar && H.AVATARS[e.avatar] ? H.avHTML(e.avatar) : esc((name || '?')[0].toUpperCase());
  return `<span class="pfav ${big ? 'big' : 'sm'}${frCls(safeItem('frame', e.frame))}">${av}</span>`;
}
const titleOf = eq => t('itemName', 'title', safeItem('title', (eq || {}).title));
const nameBtn = u => `<button class="linkbtn uname" data-a="viewp" data-u="${esc(u)}">${esc(u)}</button>`;

/* ---------------- leaderboards ---------------- */
async function loadBoard(kind, force) {
  if (!force && SU.lb[kind] && Date.now() - (SU.lbAt[kind] || 0) < 60000) return;
  try { SU.lb[kind] = await leaderboard(kind); SU.lbAt[kind] = Date.now(); SU.lbErr = ''; }
  catch (e) { SU.lbErr = t(e && e.key ? e.key : 'aErrGeneric'); }
  H.render();
}
export function renderLeaders(el) {
  const kind = SU.lbKind, rows = SU.lb[kind];
  if (!rows && !SU.lbErr) loadBoard(kind);
  const val = r => kind === 'weekly' ? t('lbWeekWins', r.week_wins) : t('lbXp', r.xp);
  const sn = rows && rows.length && rows[0].season ? rows[0].season : seasonNow();
  const list = rows ? (rows.length ? `<ol class="lblist">${rows.map(r => `<li class="${r.me ? 'me' : ''}">
      <span class="place p${r.pos}">${r.pos}</span>${face(r.equipped, r.username)}
      <span class="lbname">${nameBtn(r.username)}<small class="ptitle${titleCls(safeItem('title', (r.equipped || {}).title))}">${esc(titleOf(r.equipped))}</small></span>
      <span class="lvtag">${esc(t('aLv', r.level))}</span><span class="lbval">${esc(val(r))}</span>${kind === 'weekly' && r.pos <= 3 && r.week_wins > 0 ? medalHTML(sn, r.pos, true) : ''}</li>`).join('')}</ol>`
      : `<p class="note">${esc(t('lbEmpty'))}</p>`) : `<p class="note">${esc(SU.lbErr || t('aLoading'))}</p>`;
  el.innerHTML = `<div class="scrhead"><button class="iconbtn backbtn" data-a="profBack" aria-label="${esc(t('pBack').replace(/^\W+/, ''))}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span>${esc(t('pBack').replace(/^\W+/, ''))}</span></button></div>
    <div class="scrtitle"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg><div><h1>${esc(t('lbTitle'))}</h1>
      <p class="note">${esc(kind === 'weekly' ? t('lbSeasonNote', sn, seasonDaysLeft()) : t('lbLevelNote'))}</p></div></div>
    <div class="segtabs"><button class="stab${kind === 'weekly' ? ' on' : ''}" data-a="lbTab" data-t="weekly">${esc(t('lbSeason', sn))}</button>
      <button class="stab${kind === 'level' ? ' on' : ''}" data-a="lbTab" data-t="level">${esc(t('lbLevel'))}</button></div>
    <div class="box">${list}${!loggedIn() && ACC.enabled ? `<p class="note">${esc(t('lbGuest'))}</p>` : ''}</div>`;
}

/* ---------------- friends ---------------- */
export function renderFriends(el) {
  if (!loggedIn()) { el.innerHTML = `<div class="box"><p class="note">${esc(t('aLoading'))}</p><button class="btn ghost" data-a="profBack">${esc(t('pBack'))}</button></div>`; return; }
  const s = ACC.social || {friends: [], incoming: [], outgoing: []};
  // the list couldn't be loaded: say so (with the error code) instead of showing an empty list
  const loadErr = ACC.socialErr ? `<div class="box"><p class="err">${esc(t('frLoadErr', ACC.socialErr))}</p><button class="btn small" data-a="frRetry">${esc(t('frRetry'))}</button></div>` : '';
  const loading = !ACC.social && !ACC.socialErr;
  const inc = s.incoming.length ? `<div class="box"><h3>${esc(t('frIncoming'))}</h3><ul class="frlist">${s.incoming.map(u => `<li>${nameBtn(u)}<span class="spacer"></span>
      <button class="btn small primary" data-a="frAccept" data-u="${esc(u)}">${esc(t('frAccept'))}</button><button class="btn small ghost" data-a="frDecline" data-u="${esc(u)}">${esc(t('frDecline'))}</button></li>`).join('')}</ul></div>` : '';
  const out = s.outgoing.length ? `<p class="note">${esc(t('frOutgoing'))} ${s.outgoing.map(u => `${esc(u)} <button class="linkbtn" data-a="frCancel" data-u="${esc(u)}">${esc(t('frCancel'))}</button>`).join(' · ')}</p>` : '';
  const fl = s.friends.length ? `<ul class="frlist">${s.friends.map(f => `<li>${face(f.equipped, f.username)}<span class="frname">${nameBtn(f.username)}
      <small class="${f.online ? 'online' : 'note'}">${esc(f.online ? t('frOnline') : t('frOffline'))}</small></span><span class="lvtag">${esc(t('aLv', f.level))}</span>
      <button class="btn small ghost" data-a="frRemove" data-u="${esc(f.username)}" aria-label="${esc(t('frRemove'))}">✕</button></li>`).join('')}</ul>`
    : `<p class="note">${esc(loading ? t('aLoading') : t('frNone'))}</p>`;
  el.innerHTML = `<div class="scrhead"><button class="iconbtn backbtn" data-a="profBack" aria-label="${esc(t('pBack').replace(/^\W+/, ''))}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span>${esc(t('pBack').replace(/^\W+/, ''))}</span></button></div>
    <div class="scrtitle"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg><div><h1>${esc(t('frTitle'))}</h1><p class="note">${esc(t('frNote'))}</p></div></div>
    <div class="box"><form data-form="fradd" class="row"><input id="frName" maxlength="14" placeholder="${esc(t('frAddPh'))}" autocomplete="off" required>
      <button class="btn primary" type="submit" ${SU.busy ? 'disabled' : ''}>${esc(t('frAdd'))}</button></form>
      ${SU.fErr ? `<p class="err">${esc(SU.fErr)}</p>` : ''}${SU.fMsg ? `<p class="okmsg">${esc(SU.fMsg)}</p>` : ''}${out}</div>
    ${loadErr}${inc}<div class="box"><h3>${esc(t('frList', s.friends.length))}</h3>${fl}</div>${s.friends.length ? matchesHTML() : ''}`;
  if (s.friends.length && (!SU.fm || Date.now() - SU.fmAt > 60000)) loadMatches();
}
async function loadMatches() {
  SU.fmAt = Date.now();
  try { SU.fm = await friendMatches(); } catch (e) { SU.fm = SU.fm || []; }
  H.render();
}
function matchesHTML() {
  const list = SU.fm;
  const body = !list ? `<p class="note">${esc(t('aLoading'))}</p>` : !list.length ? `<p class="note">${esc(t('fmNone'))}</p>`
    : `<ul class="fmlist">${list.map(g => `<li><span class="fmres ${g.won ? 'won' : ''}">${esc(g.won ? t('fmWon') : t('fmPlace', g.place, g.players))}</span>
        <span class="fmwho">${(g.friends || []).map(f => `<span>${nameBtn(f.username)} <small>${esc(f.won ? t('fmWon') : t('fmPlace', f.place, g.players))}</small></span>`).join('')}</span>
        <small class="note">${esc(new Date(g.at).toLocaleString(locale(), {dateStyle: 'medium', timeStyle: 'short'}))}</small></li>`).join('')}</ul>`;
  return `<div class="box"><h3>${esc(t('fmTitle'))}</h3>${body}</div>`;
}

/* ---------------- season over message ---------------- */
// once per finished season: "Season 3 is over, you finished 2nd!"
let seasonChecked = false;
async function checkSeasonEnd() {
  if (seasonChecked || !loggedIn()) return; seasonChecked = true;
  const prev = seasonNow() - 1; if (prev < 1) return;
  const key = 'cf-season-' + ACC.profile.id; let seen = 0;
  try { seen = +localStorage.getItem(key) || 0; } catch (e) {}
  if (seen >= prev) return;
  let r = null; try { r = await mySeason(prev); } catch (e) { seasonChecked = false; return; }
  try { localStorage.setItem(key, String(prev)); } catch (e) {}
  if (!r || !r.pos) return;
  const m = document.getElementById('modal'), c = document.getElementById('modalCard'); if (!m || !c || !m.hidden) return;
  m.hidden = false;
  c.innerHTML = `<button class="btn small ghost mclose" data-a="modalClose" aria-label="${esc(t('close'))}">✕</button>
    <div class="seasonend">${r.pos <= 3 ? medalHTML(prev, r.pos) : '<span class="seasonpos">' + r.pos + '.</span>'}
    <h2>${esc(t('seTitle', prev))}</h2><p class="sebig">${esc(t('sePlace', r.pos))}</p>
    <p class="note">${esc(t('seSub', r.wins, r.players))}</p>${r.pos <= 3 ? `<p class="okmsg">${esc(t('seMedal'))}</p>` : ''}
    <p class="note">${esc(t('seNext', prev + 1))}</p>
    <div class="row mact"><button class="btn" data-a="leaders">${esc(t('lbTitle'))}</button><button class="btn primary" data-a="modalClose">${esc(t('seOk'))}</button></div></div>`;
}
onAccount(() => { if (loggedIn()) setTimeout(checkSeasonEnd, 800); });
async function doFriend(fn, okMsg) {
  if (SU.busy) return; SU.busy = true; SU.fErr = ''; SU.fMsg = ''; H.render();
  try { const r = await fn(); SU.fMsg = typeof okMsg === 'function' ? okMsg(r) : okMsg || ''; }
  catch (e) { SU.fErr = t(e && e.key ? e.key : 'aErrGeneric'); }
  SU.busy = false; H.render(); if (modalUser) openProfile(modalUser);
}

/* ---------------- profile card (modal) ---------------- */
let modalUser = null;
export async function openProfile(username) {
  modalUser = username;
  const m = document.getElementById('modal'), c = document.getElementById('modalCard');
  m.hidden = false; c.innerHTML = `<p class="note">${esc(t('aLoading'))}</p>`;
  let p = null; try { p = await publicProfile(username); } catch (e) {}
  if (modalUser !== username) return;
  if (!p) { c.innerHTML = `<p class="err">${esc(t('aErrNoUser'))}</p><button class="btn ghost" data-a="modalClose">${esc(t('close'))}</button>`; return; }
  const eq = p.equipped || {}, lv = p.level, a = xpFor(lv), b = xpFor(Math.min(MAX_LEVEL, lv + 1));
  const rate = p.games ? Math.round(p.wins / p.games * 100) : 0, st = p.stats || {};
  let act = '';
  if (loggedIn() && !p.me) {
    act = p.friend ? `<button class="btn small ghost" data-a="frRemove" data-u="${esc(p.username)}">${esc(t('frRemove'))}</button><span class="tag ok">${esc(t('frIsFriend'))}</span>`
      : p.incoming ? `<button class="btn small primary" data-a="frAccept" data-u="${esc(p.username)}">${esc(t('frAccept'))}</button>`
      : p.requested ? `<span class="tag">${esc(t('frRequested'))}</span>`
      : `<button class="btn small primary" data-a="frAddU" data-u="${esc(p.username)}">${esc(t('frAdd'))}</button>`;
  }
  const cell = (k, v) => `<div class="stat"><b>${esc(String(v))}</b><small>${esc(t(k))}</small></div>`;
  c.innerHTML = `<button class="btn small ghost mclose" data-a="modalClose" aria-label="${esc(t('close'))}">✕</button>
    <div class="profhead">${face(eq, p.username, true)}<div class="acctinfo"><div class="acctname"><b>${esc(p.username)}</b><span class="lvtag">${esc(t('aLv', lv))}</span>${p.admin ? `<span class="admbadge" title="${esc(t('adminBadgeT'))}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg>${esc(t('adminBadge'))}</span>` : ''}
      ${p.online ? `<span class="tag ok">${esc(t('frOnline'))}</span>` : ''}</div><span class="ptitle${titleCls(safeItem('title', eq.title))}">${esc(titleOf(eq))}</span>
      <div class="xpbar"><i style="width:${lv >= MAX_LEVEL ? 100 : ((p.xp - a) / (b - a) * 100).toFixed(1)}%"></i></div>${medalsRow(p.medals)}</div></div>
    <div class="stats">${cell('pWins', p.wins)}${cell('pGames', p.games)}${cell('pWinRate', rate + '%')}${cell('pBotGames', p.bot_games)}${cell('pDeals', st.deals || 0)}${cell('pMember', new Date(p.created_at).toLocaleDateString(locale()))}</div>
    <h3>${esc(t('pTabAch'))} · ${p.achievements.length}/${ACHS.length}</h3>
    <div class="achgrid">${ACHS.map(x => `<span class="ach${p.achievements.includes(x.key) ? ' got' : ''}" title="${esc(t('achName', x.key) + ': ' + t('achDesc', x.key))}">${x.icon}<small>${esc(t('achName', x.key))}</small></span>`).join('')}</div>
    ${act ? `<div class="row mact">${act}</div>` : ''}`;
}
export function closeProfile() { modalUser = null; const m = document.getElementById('modal'); m.hidden = true; document.getElementById('modalCard').innerHTML = ''; }

/* ---------------- invites ---------------- */
// toast for the newest invite (only when not already in a room)
export function updateToast() {
  const el = document.getElementById('toast'); if (!el || !H) return;
  const inv = loggedIn() && ACC.social && !H.inRoom() ? (ACC.social.invites || []).find(i => !SU.hidden[i.id]) : null;
  if (!inv) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `${face(inv.equipped, inv.from)}<span class="tmsg">${t('invMsg', esc(inv.from))}</span>
    <button class="btn small primary" data-a="invJoin" data-id="${inv.id}" data-room="${esc(inv.room)}">${esc(t('invJoin'))}</button>
    <button class="btn small ghost" data-a="invNo" data-id="${inv.id}" aria-label="${esc(t('close'))}">✕</button>`;
}
// "invite friends" box in a private room's lobby
export function renderInviteBox(el, room, show) {
  if (!show || !loggedIn() || !room) { el.hidden = true; return; }
  const fr = (ACC.social && ACC.social.friends) || [];
  el.hidden = false;
  const done = SU.invited[room] || {};
  el.innerHTML = `<h3>${esc(t('invTitle'))}</h3>` + (fr.length ? `<ul class="frlist">${fr.map(f => `<li>${face(f.equipped, f.username)}<span class="frname"><b>${esc(f.username)}</b>
      <small class="${f.online ? 'online' : 'note'}">${esc(f.online ? t('frOnline') : t('frOffline'))}</small></span>
      ${done[f.username] ? `<span class="tag ok">${esc(t('invSent'))}</span>` : `<button class="btn small" data-a="invite" data-u="${esc(f.username)}">${esc(t('invBtn'))}</button>`}</li>`).join('')}</ul>`
    : `<p class="note">${esc(t('invNoFriends'))}</p>`);
}

/* ---------------- events ---------------- */
export function socialClick(a, b) {
  switch (a) {
    case 'leaders': if (modalUser === null) { const mm = document.getElementById('modal'); if (mm && !mm.hidden) closeProfile(); } SU.lbErr = ''; H.go('leaders'); loadBoard(SU.lbKind, true); return true;
    case 'friends': SU.fErr = ''; SU.fMsg = ''; H.go('friends'); pollSocial(); return true;
    case 'frRetry': pollSocial(); return true;
    case 'lbTab': SU.lbKind = b.dataset.t; SU.lbErr = ''; H.render(); loadBoard(SU.lbKind); return true;
    case 'viewp': openProfile(b.dataset.u); return true;
    case 'modalClose': closeProfile(); return true;
    case 'frAccept': doFriend(() => friendRespond(b.dataset.u, true), t('frNowFriends', b.dataset.u)); return true;
    case 'frDecline': doFriend(() => friendRespond(b.dataset.u, false)); return true;
    case 'frCancel': doFriend(() => friendRemove(b.dataset.u)); return true;
    case 'frRemove': if (confirm(t('frRemoveQ', b.dataset.u))) doFriend(() => friendRemove(b.dataset.u)); return true;
    case 'frAddU': doFriend(() => friendAdd(b.dataset.u), r => r === 'friends' ? t('frNowFriends', b.dataset.u) : t('frSent', b.dataset.u)); return true;
    case 'invite': {
      const room = H.roomCode(), u = b.dataset.u; if (!room) return true;
      b.disabled = true;
      inviteFriend(u, room).then(() => { (SU.invited[room] = SU.invited[room] || {})[u] = 1; H.render(); })
        .catch(e => { b.disabled = false; b.textContent = t(e && e.key ? e.key : 'aErrGeneric'); });
      return true;
    }
    case 'invJoin': { const id = +b.dataset.id, room = b.dataset.room; SU.hidden[id] = 1; updateToast(); inviteDismiss(id).catch(() => {}); H.joinRoom(room); return true; }
    case 'invNo': { const id = +b.dataset.id; SU.hidden[id] = 1; updateToast(); inviteDismiss(id).catch(() => {}); return true; }
  }
  return false;
}
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('form[data-form="fradd"]'); if (!f) return;
  e.preventDefault(); const inp = document.getElementById('frName'); const u = (inp.value || '').trim();
  if (!USERNAME_RE.test(u)) { SU.fErr = t('aErrNoUser'); H.render(); return; }
  doFriend(() => friendAdd(u), r => r === 'friends' ? t('frNowFriends', u) : t('frSent', u));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalUser) closeProfile(); });
document.addEventListener('click', e => { if (e.target && e.target.id === 'modal') closeProfile(); });
