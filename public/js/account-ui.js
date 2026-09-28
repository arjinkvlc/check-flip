/**
 * Check Flip — account screens: home account panel, log in / sign up /
 * password reset, "Profile & looks" (avatar, frames, boards, chat bubbles,
 * titles, achievements, stats) and the end-of-game progress box.
 */
import {
  ACC, ACHS, CATALOG, DEFAULTS, MAX_LEVEL, levelOf, xpFor, loggedIn, level, equipped, unlocked, hasRealEmail,
  signIn, signUp, sendReset, setNewPassword, signOut, deleteAccount, equip, usernameAvailable, USERNAME_RE, onAccount
} from './account.js';
import {t, getLang} from './i18n.js';
import './i18n-account.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const frCls = fr => fr && fr !== 'none' && CATALOG.frame.some(c => c.key === fr) ? ' fr-' + fr : '';
export const bbCls = bu => bu && bu !== 'plain' && CATALOG.bubble.some(c => c.key === bu) ? ' bb-' + bu : '';

let H = null; // hooks from app.js: {go(screen), render(), AVATARS, avatarLabel}
export const AU = {tab: 'login', err: '', msg: '', busy: false, prof: 'avatar', nameOk: null};

export function initAccountUI(hooks) {
  H = hooks;
  onAccount(() => {
    applyBoard();
    if (ACC.recovery && AU.tab !== 'reset') { AU.tab = 'reset'; AU.err = ''; AU.msg = ''; H.go('auth'); return; }
    H.render();
  });
  applyBoard();
  // arrived from an expired or already used e-mail link (Supabase adds #error=…&error_code=… to the URL)
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get('error') || hp.get('error_code')) {
    const code = hp.get('error_code') || '';
    AU.tab = 'forgot'; AU.err = t(/expired|not_found/.test(code) || /expired/i.test(hp.get('error_description') || '') ? 'aErrLinkExpired' : 'aErrGeneric');
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => H.go('auth'), 0);
  }
}

// Board style is personal: applied to <body data-board="…">
export function applyBoard() {
  const b = loggedIn() ? equipped().board : DEFAULTS.board;
  if (document.body.dataset.board !== b) document.body.dataset.board = b;
}

const xpLine = p => {
  const lv = levelOf(p.xp);
  if (lv >= MAX_LEVEL) return {frac: 1, txt: t('aXpMax', p.xp)};
  const a = xpFor(lv), b = xpFor(lv + 1);
  return {frac: (p.xp - a) / (b - a), txt: t('aXp', p.xp, b)};
};
const avatarGlyph = () => { const e = equipped(); return e.avatar && H.AVATARS[e.avatar] ? H.avHTML(e.avatar) : esc((ACC.profile.username || '?')[0].toUpperCase()); };
const itemName = (kind, key) => t('itemName', kind, key);
const lockText = c => c.ach ? t('pLockedAch', t('achName', c.ach)) : t('pLockedLv', c.lv);

/* ---------------- home panel ---------------- */
export function renderAcctPanel(el, nickWrap) {
  if (!ACC.enabled) { el.hidden = true; nickWrap.hidden = false; return; }
  el.hidden = false;
  if (!ACC.ready) { el.innerHTML = `<p class="note">${esc(t('aLoading'))}</p>`; nickWrap.hidden = false; return; }
  if (!loggedIn()) {
    nickWrap.hidden = false;
    el.innerHTML = `<div class="acctguest scard"><span><b>${esc(t('aGuest'))}</b><small class="note">${esc(t('signupPitch'))}</small></span>
      <button class="btn small" data-a="authLogin">${esc(t('aLogin'))}</button><button class="btn small primary" data-a="authSignup">${esc(t('aSignup'))}</button></div>`;
    return;
  }
  nickWrap.hidden = true;
  const p = ACC.profile, e = equipped(), x = xpLine(p);
  el.innerHTML = `<div class="acctcard scard"><span class="pfav sm${frCls(e.frame)}">${avatarGlyph()}</span>
    <div class="acctinfo"><div class="acctname"><b>${esc(p.username)}</b><span class="lvtag">${esc(t('aLv', level()))}</span></div>
    <div class="xpbar" title="${esc(x.txt)}"><i style="width:${(x.frac * 100).toFixed(1)}%"></i></div><small class="note">${esc(x.txt)}</small></div></div>
    ${questHTML()}
    <button class="pill" data-a="profile">${esc(t('profileBtn'))}</button><button class="pill" data-a="friends">${esc(t('friendsShort'))}${friendBadge()}</button><button class="pill ghost" data-a="logout">${esc(t('aLogout'))}</button>
    ${AU.flash ? `<p class="okmsg" role="status">${esc(AU.flash === 'pw' ? t('aPwChanged') : t('aWelcome', p.username))}</p>` : ''}`;
}

// small account button in the header (avatar + name + level, or "Log in")
export function renderAcctChip(el) {
  if (!ACC.enabled || !ACC.ready) { el.hidden = true; return; }
  el.hidden = false;
  if (!loggedIn()) { el.hidden = true; el.innerHTML = ''; return; }
  const p = ACC.profile, e = equipped();
  el.innerHTML = `<button class="chipbtn me" data-a="profile" aria-label="${esc(t('profileBtn'))}"><span class="pfav sm${frCls(e.frame)}">${avatarGlyph()}</span><span class="cname"><b>${esc(p.username)}</b><small>${esc(t('aLv', level()))}</small></span>${friendBadge()}</button>`;
}

// today's quest (same for everyone, resets at 00:00 UTC)
function questHTML() {
  const d = ACC.daily; if (!d || !d.quest) return '';
  const h = Math.floor((d.resets_in || 0) / 3600), m = Math.floor(((d.resets_in || 0) % 3600) / 60);
  return `<div class="quest scard${d.done ? ' done' : ''}"><svg class="ic qi" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><div><b>${esc(t('qTitle'))}</b> · ${esc(t('q_' + d.quest))}
    <small class="note">${esc(d.done ? t('qDone') : t('qReward'))} · ${esc(t('qResets', h, m))}</small></div></div>`;
}
const friendBadge = () => { const n = ACC.social && ACC.social.incoming ? ACC.social.incoming.length : 0; return n ? ` <span class="nbadge">${n}</span>` : ''; };

/* ---------------- log in / sign up ---------------- */
export function renderAuth(el) {
  const tabs = AU.tab === 'login' || AU.tab === 'signup'
    ? `<div class="tabs"><button class="tab${AU.tab === 'login' ? ' on' : ''}" data-a="authTab" data-t="login">${esc(t('aTabLogin'))}</button><button class="tab${AU.tab === 'signup' ? ' on' : ''}" data-a="authTab" data-t="signup">${esc(t('aTabSignup'))}</button></div>` : '';
  const dis = AU.busy ? 'disabled' : '';
  let f = '';
  if (AU.tab === 'login') {
    f = `<form data-form="login" class="aform">
      <label for="auId">${esc(t('aUserOrEmail'))}</label><input id="auId" autocomplete="username" maxlength="120" required>
      <label for="auPw">${esc(t('aPassword'))}</label><input id="auPw" type="password" autocomplete="current-password" maxlength="72" required>
      <button class="btn primary big" type="submit" ${dis}>${esc(AU.busy ? t('aWorking') : t('aLogin'))}</button>
      <button class="linkbtn" type="button" data-a="authTab" data-t="forgot">${esc(t('aForgot'))}</button></form>`;
  } else if (AU.tab === 'signup') {
    f = `<form data-form="signup" class="aform">
      <label for="auName">${esc(t('aUsername'))} <span id="auNameChk" class="chk"></span></label><input id="auName" autocomplete="username" maxlength="14" pattern="[A-Za-z0-9_]{3,14}" required>
      <p class="note">${esc(t('aUsernameHint'))}</p>
      <label for="auPw">${esc(t('aPassword'))}</label><input id="auPw" type="password" autocomplete="new-password" maxlength="72" required>
      <p class="note">${esc(t('aPasswordHint'))}</p>
      <label for="auPw2">${esc(t('aPassword2'))}</label><input id="auPw2" type="password" autocomplete="new-password" maxlength="72" required>
      <label for="auEmail">${esc(t('aEmailOpt'))}</label><input id="auEmail" type="email" autocomplete="email" maxlength="120">
      <p class="note">${esc(t('aEmailHint'))}</p>
      <label class="consent"><input type="checkbox" id="auConsent" required><span>${t('aConsent')}</span></label>
      <button class="btn primary big" type="submit" ${dis}>${esc(AU.busy ? t('aWorking') : t('aSignup'))}</button>
      <p class="note">${esc(t('aSignupNote'))}</p></form>`;
  } else if (AU.tab === 'forgot') {
    f = `<h3>${esc(t('aForgotTitle'))}</h3><form data-form="forgot" class="aform"><p class="note">${esc(t('aForgotNote'))}</p>
      <label for="auFEmail">E-mail</label><input id="auFEmail" type="email" autocomplete="email" maxlength="120" required>
      <button class="btn primary" type="submit" ${dis}>${esc(AU.busy ? t('aWorking') : t('aSendLink'))}</button>
      <button class="linkbtn" type="button" data-a="authTab" data-t="login">${esc(t('aBackToLogin'))}</button></form>`;
  } else if (AU.tab === 'reset') {
    f = `<h3>${esc(t('aNewPwTitle'))}</h3><form data-form="reset" class="aform">
      <label for="auNewPw">${esc(t('aNewPw'))}</label><input id="auNewPw" type="password" autocomplete="new-password" maxlength="72" required>
      <p class="note">${esc(t('aPasswordHint'))}</p>
      <label for="auNewPw2">${esc(t('aNewPw2'))}</label><input id="auNewPw2" type="password" autocomplete="new-password" maxlength="72" required>
      <button class="btn primary" type="submit" ${dis}>${esc(AU.busy ? t('aWorking') : t('aSave'))}</button></form>`;
  }
  el.innerHTML = tabs + (AU.err ? `<p class="err" role="alert">${esc(AU.err)}</p>` : '') + (AU.msg ? `<p class="okmsg" role="status">${esc(AU.msg)}</p>` : '') + f +
    `<button class="btn ghost small" data-a="authGuest">${esc(AU.tab === 'reset' ? t('pBack') : t('aAsGuest'))}</button>`;
  if (!ACC.enabled) el.innerHTML = `<p class="err">${esc(t('aUnavailable'))}</p><button class="btn ghost" data-a="authGuest">${esc(t('aAsGuest'))}</button>`;
}

const val = id => { const e = document.getElementById(id); return e ? e.value : ''; };
async function runForm(kind) {
  if (AU.busy) return;
  const keep = {auId: val('auId'), auName: val('auName'), auEmail: val('auEmail'), auFEmail: val('auFEmail')};
  const cb = document.getElementById('auConsent'); keep.consent = !!(cb && cb.checked);
  const pw = val('auPw'), npw = val('auNewPw');
  // the two password boxes must match (sign-up and reset)
  if ((kind === 'signup' && pw !== val('auPw2')) || (kind === 'reset' && npw !== val('auNewPw2'))) { AU.err = t('aErrPwMatch'); rerenderAuth(keep); return; }
  AU.busy = true; AU.err = ''; AU.msg = ''; rerenderAuth(keep);
  try {
    if (kind === 'login') { await signIn(keep.auId, pw); done('welcome'); return; }
    if (kind === 'signup') { await signUp(keep.auName, pw, keep.auEmail); done('welcome'); return; }
    if (kind === 'forgot') { await sendReset(keep.auFEmail); AU.msg = t('aLinkSent'); }
    if (kind === 'reset') { await setNewPassword(npw); done('pw'); return; }
  } catch (e) { AU.err = errText(e); if (e && e.key === 'aErrLinkExpired' && kind === 'reset') AU.tab = 'forgot'; }
  AU.busy = false; rerenderAuth(keep);
}
let flashTimer = null;
function done(kind) { AU.busy = false; AU.err = ''; AU.msg = ''; AU.flash = kind; clearTimeout(flashTimer); flashTimer = setTimeout(() => { AU.flash = null; H.render(); }, 5000); H.go('home'); }
function rerenderAuth(keep) {
  const el = document.getElementById('authBox'); if (!el) return; renderAuth(el);
  for (const id in keep || {}) { const e = document.getElementById(id); if (e && keep[id]) e.value = keep[id]; }
  const cb = document.getElementById('auConsent'); if (cb && keep && keep.consent) cb.checked = true;
}
let nameTimer = null, nameSeq = 0;
function checkName() {
  const el = document.getElementById('auNameChk'), v = val('auName'); if (!el) return;
  clearTimeout(nameTimer); el.textContent = ''; el.className = 'chk';
  if (!USERNAME_RE.test(v)) return;
  const my = ++nameSeq;
  nameTimer = setTimeout(async () => {
    let ok = null; try { ok = await usernameAvailable(v); } catch (e) {}
    if (my !== nameSeq || ok == null) return;
    el.textContent = ok ? t('aNameFree') : t('aNameUsed'); el.className = 'chk ' + (ok ? 'ok' : 'bad');
  }, 450);
}

// readable message for an error from account.js (unknown errors show their code for support)
export function errText(e) {
  const k = e && e.key ? e.key : 'aErrGeneric';
  return k === 'aErrGeneric' && e && e.code ? t('aErrGenericCode', e.code) : t(k);
}

/* ---------------- profile & looks ---------------- */
const TABS = ['avatar', 'frame', 'board', 'bubble', 'title', 'ach', 'stats'];
const TAB_LABEL = {avatar: 'pTabAvatar', frame: 'pTabFrames', board: 'pTabBoards', bubble: 'pTabBubbles', title: 'pTabTitles', ach: 'pTabAch', stats: 'pTabStats'};
const TAB_NOTE = {avatar: 'pAvatarNote', frame: 'pFramesNote', board: 'pBoardsNote', bubble: 'pBubblesNote', title: 'pTitlesNote', ach: 'pAchNote'};

function preview(kind, key) {
  if (kind === 'frame') return `<span class="pfav big${frCls(key)}">${avatarGlyph()}</span>`;
  if (kind === 'board') return `<span class="bprev" data-board="${key}"><i></i></span>`;
  if (kind === 'bubble') return `<span class="ctb${bbCls(key)}">${esc(getLang() === 'tr' ? 'Hesap sende! 😋' : 'Your treat! 😋')}</span>`;
  return `<span class="ptitle big">${esc(itemName('title', key))}</span>`;
}

export function renderProfile(el) {
  if (!loggedIn()) { el.innerHTML = `<div class="box"><p class="note">${esc(t('aLoading'))}</p><button class="btn ghost" data-a="profBack">${esc(t('pBack'))}</button></div>`; return; }
  const p = ACC.profile, e = equipped(), x = xpLine(p), lv = level(), tab = AU.prof;
  let body = '';
  if (tab === 'avatar') {
    body = `<div class="avgrid big"><button class="avbtn none${!e.avatar ? ' on' : ''}" data-a="pav" data-k="">Aa<small>${esc(t('none'))}</small></button>${CATALOG.avatar.map(c => {
      const ok = unlocked('avatar', c.key), on = e.avatar === c.key;
      return `<button class="avbtn${on ? ' on' : ''}${ok ? '' : ' locked'}" data-a="pav" data-k="${c.key}" ${ok && !AU.busy ? '' : 'disabled'}>${H.avHTML(c.key)}<small>${esc(ok ? H.avatarLabel(c.key) : lockText(c))}</small></button>`;
    }).join('')}</div>`;
  } else if (CATALOG[tab]) {
    body = `<div class="items">${CATALOG[tab].map(c => {
      const ok = unlocked(tab, c.key), on = e[tab] === c.key;
      return `<div class="item${on ? ' on' : ''}${ok ? '' : ' locked'}"><div class="iprev">${preview(tab, c.key)}</div><b>${esc(itemName(tab, c.key))}</b>
        ${on ? `<span class="tag ok">${esc(t('pEquipped'))}</span>` : ok ? `<button class="btn small" data-a="equip" data-kind="${tab}" data-key="${c.key}" ${AU.busy ? 'disabled' : ''}>${esc(t('pEquip'))}</button>` : `<small class="lock">${esc(lockText(c))}</small>`}</div>`;
    }).join('')}</div>`;
  } else if (tab === 'ach') {
    body = `<p class="botnote">${esc(t('pBotNote'))}</p><ul class="achlist">${ACHS.map(a => {
      const have = ACC.ach.has(a.key), cur = Math.min(a.goal, a.get(p) || 0);
      const rewards = ['avatar', 'frame', 'board', 'bubble'].flatMap(k => CATALOG[k].filter(c => c.ach === a.key).map(c => k === 'avatar' ? H.avatarLabel(c.key) : itemName(k, c.key)));
      rewards.push(itemName('title', a.key));
      return `<li class="${have ? 'got' : ''}"><span class="aicon">${a.icon}</span><div class="ainfo"><b>${esc(t('achName', a.key))}</b><small>${esc(t('achDesc', a.key))}</small>
        <div class="xpbar"><i style="width:${(cur / a.goal * 100).toFixed(1)}%"></i></div>
        <small class="note">${have ? esc(t('pDone')) : esc(t('pProgress', cur, a.goal))} · ${esc(t('pRewards'))} ${esc(rewards.join(', '))}</small></div></li>`;
    }).join('')}</ul>`;
  } else if (tab === 'stats') {
    const st = p.stats || {}, since = new Date(p.created_at);
    const cell = (k, v) => `<div class="stat"><b>${esc(String(v))}</b><small>${esc(t(k))}</small></div>`;
    body = `<div class="stats">${cell('pLevel', lv)}${cell('pXpTotal', p.xp)}${cell('pWins', p.wins)}${cell('pGames', p.games)}${cell('pBotGames', p.bot_games)}${cell('pDeals', st.deals || 0)}${cell('pBelt', st.belt || 0)}${cell('pMember', isNaN(since) ? '–' : since.toLocaleDateString(getLang()))}</div>
      <p class="note">${hasRealEmail() ? esc(t('pEmailOn', ACC.user.email)) : esc(t('pEmailOff'))}</p>
      <h3>${esc(t('pRecent'))}</h3>${ACC.recent.length ? `<ul class="recent">${ACC.recent.map(r => `<li><span>${esc(r.mode === 'solo' ? t('pSolo') : t('pOnline'))}</span><span>${r.won ? '🏆 ' : ''}${esc(t('pPlace', r.place, r.players))}</span><span>${!r.counted ? esc(t('pNotCounted')) : `+${r.xp} XP${r.mode === 'online' && !r.verified ? ' · ' + esc(t('pPending')) : ''}`}</span><small>${esc(new Date(r.created_at).toLocaleString(getLang(), {dateStyle: 'short', timeStyle: 'short'}))}</small></li>`).join('')}</ul>` : `<p class="note">${esc(t('pNoRecent'))}</p>`}
      <p class="botnote">${esc(t('pBotNote'))}</p>
      <div class="danger"><b>${esc(t('pDeleteTitle'))}</b><p class="note">${esc(t('pDeleteNote'))}</p>
      <button class="btn small ghost dangerbtn" data-a="delAccount" ${AU.busy ? 'disabled' : ''}>${esc(t('pDeleteBtn'))}</button>
      <p class="note"><a href="privacy.html" target="_blank" rel="noopener">${esc(t('privacyLink'))}</a></p></div>`;
  }
  el.innerHTML = `<div class="box profhead"><span class="pfav big${frCls(e.frame)}">${avatarGlyph()}</span>
      <div class="acctinfo"><div class="acctname"><b>${esc(p.username)}</b><span class="lvtag">${esc(t('aLv', lv))}</span></div><small class="ptitle">${esc(itemName('title', e.title))}</small>
      <div class="xpbar"><i style="width:${(x.frac * 100).toFixed(1)}%"></i></div><small class="note">${esc(x.txt)}</small></div>
      <button class="btn small ghost" data-a="profBack">${esc(t('pBack'))}</button></div>
    <div class="tabs scroll">${TABS.map(k => `<button class="tab${tab === k ? ' on' : ''}" data-a="profTab" data-t="${k}">${esc(t(TAB_LABEL[k]))}</button>`).join('')}</div>
    <div class="box">${TAB_NOTE[tab] ? `<p class="note">${esc(t(TAB_NOTE[tab]))}</p>` : ''}${AU.err ? `<p class="err">${esc(AU.err)}</p>` : ''}${body}</div>`;
}

async function doEquip(patch) {
  if (AU.busy) return; AU.busy = true; AU.err = ''; H.render();
  try { await equip(patch); } catch (e) { AU.err = errText(e); }
  AU.busy = false; H.render();
}

/* ---------------- end of game ---------------- */
// r = {st: 'saving'|'done'|'err'|'guest'|'hot', res, solo}
export function resultHTML(r) {
  if (!r || !ACC.enabled) return '';
  if (r.st === 'hot') return '';
  if (r.st === 'guest') return `<div class="xpbox"><p class="note">${esc(t('rGuest'))}</p></div>`;
  if (r.st === 'saving') return `<div class="xpbox"><h3>${esc(t('rTitle'))}</h3><p class="note">${esc(t('rSaving'))}</p></div>`;
  if (r.st === 'err') return `<div class="xpbox"><h3>${esc(t('rTitle'))}</h3><p class="err">${esc(t('rErr'))}</p></div>`;
  const res = r.res || {}; let h = `<div class="xpbox"><h3>${esc(t('rTitle'))}</h3>`;
  if (res.duplicate) h += `<p class="note">${esc(t('rDup'))}</p>`;
  else if (!res.counted) h += `<p class="note">${esc(t(res.reason === 'limit' ? 'rLimit' : 'rShort'))}</p>`;
  else {
    h += `<div class="xpgain">${esc(t('rXp', res.xp_gained || 0))}</div>`;
    if (loggedIn()) { const x = xpLine(ACC.profile); h += `<div class="xpbar"><i style="width:${(x.frac * 100).toFixed(1)}%"></i></div><small class="note">${esc(t('aLv', level()))} · ${esc(x.txt)}</small>`; }
    if (r.solo) h += `<p class="note">${esc(t('rBot'))}</p>`;
    else if (res.xp_pending > 0) h += `<p class="note">${esc(t('rPending', res.xp_pending))}</p>`;
    else if (res.verified) h += `<p class="note">${esc(t('rVerified'))}</p>`;
    if (res.quest) h += `<p class="okmsg">${esc(t('rQuest', t('q_' + res.quest)))}</p>`;
    if (res.levelAfter > res.levelBefore) h += `<p class="okmsg">${esc(t('rLevelUp', res.levelAfter))}</p>`;
    const na = res.newAch || [];
    if (na.length) h += `<div class="newach"><b>${esc(t('rNewAch'))}</b>${na.map(k => { const a = ACHS.find(x => x.key === k); return `<span>${a ? a.icon : '⭐'} ${esc(t('achName', k))}</span>`; }).join('')}</div>`;
    const items = [];
    for (const kind of ['avatar', 'frame', 'board', 'bubble', 'title']) for (const c of CATALOG[kind]) {
      if (c.ach ? na.includes(c.ach) : (c.lv > res.levelBefore && c.lv <= res.levelAfter)) items.push(kind === 'avatar' ? H.avatarLabel(c.key) : itemName(kind, c.key));
    }
    if (items.length) h += `<p class="note"><b>${esc(t('rNewItems'))}:</b> ${esc(items.join(', '))}</p>`;
  }
  return h + '</div>';
}

/* ---------------- events ---------------- */
// returns true when the click was an account action
export function accountClick(a, b) {
  switch (a) {
    case 'authLogin': case 'authSignup': AU.tab = a === 'authLogin' ? 'login' : 'signup'; AU.err = ''; AU.msg = ''; H.go('auth'); return true;
    case 'authTab': AU.tab = b.dataset.t; AU.err = ''; AU.msg = ''; H.render(); return true;
    case 'authGuest': ACC.recovery = false; AU.err = ''; AU.msg = ''; H.go('home'); return true;
    case 'logout': signOut(); return true;
    case 'profile': if (loggedIn()) { AU.err = ''; H.go('profile'); } return true;
    case 'profBack': AU.err = ''; H.go('home'); return true;
    case 'profTab': AU.prof = b.dataset.t; AU.err = ''; H.render(); return true;
    case 'equip': doEquip({[b.dataset.kind]: b.dataset.key}); return true;
    case 'pav': doEquip({avatar: b.dataset.k || null}); return true;
    case 'delAccount': {
      const name = ACC.profile && ACC.profile.username; if (!name) return true;
      const typed = prompt(t('pDeleteConfirm', name));
      if (typed == null) return true;
      if (typed.trim().toLowerCase() !== name.toLowerCase()) { AU.err = t('pDeleteMismatch'); H.render(); return true; }
      AU.busy = true; AU.err = ''; H.render();
      deleteAccount().then(() => { AU.busy = false; AU.flash = null; H.go('home'); })
        .catch(e => { AU.busy = false; AU.err = errText(e); H.render(); });
      return true;
    }
  }
  return false;
}
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault(); runForm(f.dataset.form);
});
document.addEventListener('input', e => { if (e.target && e.target.id === 'auName') checkName(); });
