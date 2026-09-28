/**
 * Check Flip — accounts, progression and cosmetics (client side).
 *
 * Talks to Supabase (Auth + Postgres). Every write goes through the
 * SECURITY DEFINER functions in sql/schema.sql, which re-check everything;
 * the unlock rules below only drive the UI and must match the `cosmetics`
 * table there.
 *
 * If the Supabase library or configuration is missing, `ACC.enabled` stays
 * false and the game simply runs in guest mode.
 */
import {SUPABASE_URL, SUPABASE_KEY, PLACEHOLDER_EMAIL_DOMAIN} from './config.js';

/* ---------------- progression rules ---------------- */
// level L needs 6.5 × (L−1)² XP  (level 10 ≈ 530 XP, level 50 ≈ 15 600 XP) — same as public.level_of()
export const MAX_LEVEL = 99;
export const levelOf = xp => Math.min(MAX_LEVEL, Math.floor(Math.sqrt(Math.max(0, xp) / 6.5)) + 1);
export const xpFor = lv => Math.ceil(6.5 * (lv - 1) * (lv - 1));

// Achievements: `get` reads progress from the profile row.
export const ACHS = [
  {key: 'first_bite', icon: '🍽️', goal: 1, get: p => p.wins},
  {key: 'regular', icon: '🪑', goal: 10, get: p => p.wins},
  {key: 'gourmet', icon: '🏆', goal: 100, get: p => p.wins},
  {key: 'veteran', icon: '🎖️', goal: 50, get: p => p.games},
  {key: 'sous_chef', icon: '🔪', goal: 10, get: p => levelOf(p.xp), level: 1},
  {key: 'head_chef', icon: '👑', goal: 50, get: p => levelOf(p.xp), level: 1},
  {key: 'negotiator', icon: '🤝', goal: 10, get: p => +(p.stats && p.stats.deals) || 0},
  {key: 'belt_master', icon: '🪢', goal: 20, get: p => +(p.stats && p.stats.belt) || 0},
  {key: 'iron_stomach', icon: '🦾', goal: 1, get: p => +(p.stats && p.stats.iron) || 0},
  {key: 'tycoon', icon: '🏙️', goal: 1, get: p => +(p.stats && p.stats.tycoon) || 0}
];

// Cosmetics: lv = required level, ach = required achievement (mirror of public.cosmetics)
export const CATALOG = {
  avatar: [
    {key: 'waiter', lv: 1}, {key: 'waitress', lv: 1}, {key: 'student', lv: 1}, {key: 'foodie', lv: 1},
    {key: 'italian', lv: 5}, {key: 'doner', lv: 10}, {key: 'noodle', lv: 15}, {key: 'baker', lv: 25},
    {key: 'grandma', ach: 'first_bite'}, {key: 'critic', ach: 'regular'}
  ],
  frame: [
    {key: 'none', lv: 1}, {key: 'bronze', lv: 5}, {key: 'silver', lv: 15}, {key: 'gold', lv: 30}, {key: 'diamond', lv: 50},
    {key: 'neon', ach: 'negotiator'}, {key: 'flame', ach: 'gourmet'}, {key: 'royal', ach: 'tycoon'}
  ],
  board: [
    {key: 'felt', lv: 1}, {key: 'hearts', lv: 1}, {key: 'wood', lv: 3}, {key: 'feast', lv: 6}, {key: 'terracotta', lv: 10},
    {key: 'marble', lv: 15}, {key: 'sunset', lv: 20}, {key: 'night', lv: 25}, {key: 'chalk', lv: 30}, {key: 'neon', lv: 35},
    {key: 'ocean', ach: 'iron_stomach'}
  ],
  bubble: [
    {key: 'plain', lv: 1}, {key: 'receipt', lv: 4}, {key: 'comic', lv: 8}, {key: 'neon', lv: 25},
    {key: 'heart', ach: 'first_bite'}, {key: 'gold', ach: 'regular'}
  ],
  title: [{key: 'rookie', lv: 1}, ...ACHS.map(a => ({key: a.key, ach: a.key}))]
};
export const DEFAULTS = {frame: 'none', board: 'felt', bubble: 'plain', title: 'rookie'};
const known = (kind, key) => CATALOG[kind] && CATALOG[kind].some(c => c.key === key);
export const safeItem = (kind, key) => known(kind, key) ? key : DEFAULTS[kind];

/* ---------------- state ---------------- */
export const ACC = {
  enabled: false,     // library + config present
  ready: false,       // first session check finished
  user: null,         // Supabase auth user
  profile: null,      // row from public.profiles
  ach: new Set(),     // unlocked achievement keys
  recent: [],         // last game results
  recovery: false,    // opened from a password-reset link
  daily: null,        // {quest, done, resets_in}
  social: null        // {friends, incoming, outgoing, invites}
};
let sb = null;
const listeners = new Set();
const emit = () => listeners.forEach(f => { try { f(ACC); } catch (e) { console.error(e); } });
export const onAccount = f => { listeners.add(f); return () => listeners.delete(f); };

export const loggedIn = () => !!(ACC.user && ACC.profile);
export const level = () => ACC.profile ? levelOf(ACC.profile.xp) : 1;
export const hasRealEmail = () => !!(ACC.user && ACC.user.email && !ACC.user.email.endsWith('@' + PLACEHOLDER_EMAIL_DOMAIN));
export function unlocked(kind, key, lv = level(), ach = ACC.ach) {
  const c = CATALOG[kind] && CATALOG[kind].find(x => x.key === key); if (!c) return false;
  if (c.ach) return ach.has(c.ach);
  return lv >= (c.lv || 1);
}
export function equipped() {
  const e = (ACC.profile && ACC.profile.equipped) || {};
  const out = {};
  for (const k of Object.keys(DEFAULTS)) out[k] = e[k] && unlocked(k, e[k]) ? e[k] : DEFAULTS[k];
  out.avatar = typeof e.avatar === 'string' && unlocked('avatar', e.avatar) ? e.avatar : null;
  return out;
}
// What other players see about me (sent in the room's hello message)
export function publicCard() {
  if (!loggedIn()) return null;
  const e = equipped();
  return {u: ACC.profile.username, lv: level(), fr: e.frame, ti: e.title, bu: e.bubble};
}

/* ---------------- errors ---------------- */
// Maps Supabase / database errors to i18n keys (see js/i18n-account.js)
function errKey(e) {
  const m = String((e && (e.message || e.error_description || e.code)) || e || '').toLowerCase();
  if (!m) return 'aErrGeneric';
  if (m.includes('too_many_attempts') || m.includes('rate limit') || m.includes('over_request') || m.includes('429')) return 'aErrTooMany';
  if (m.includes('invalid login') || m.includes('invalid_credentials')) return 'aErrLogin';
  if (m.includes('already registered') || m.includes('user_already_exists') || m.includes('email_exists')) return 'aErrEmailTaken';
  if (m.includes('database error saving new user') || m.includes('duplicate key')) return 'aErrNameTaken';
  if (m.includes('password') && (m.includes('at least') || m.includes('short') || m.includes('weak'))) return 'aErrPwShort';
  if (m.includes('email') && (m.includes('invalid') || m.includes('valid'))) return 'aErrEmailInvalid';
  if (m.includes('signup') && m.includes('disabled')) return 'aErrSignupOff';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return 'aErrNet';
  if (m.includes('locked')) return 'aErrLocked';
  if (m.includes('no_such_user')) return 'aErrNoUser';
  if (m.includes('self')) return 'aErrSelf';
  if (m.includes('not_friends')) return 'aErrNotFriends';
  if (m.includes('too_many_friends')) return 'aErrTooManyFriends';
  return 'aErrGeneric';
}
const fail = e => { const k = errKey(e); const err = new Error(k); err.key = k; err.raw = e; return err; };

/* ---------------- setup ---------------- */
export async function initAccount() {
  const lib = typeof window !== 'undefined' && window.supabase;
  if (!SUPABASE_URL || !SUPABASE_KEY || !lib || typeof lib.createClient !== 'function') { ACC.ready = true; emit(); return; }
  try {
    sb = lib.createClient(SUPABASE_URL, SUPABASE_KEY, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'cp-auth'}});
  } catch (e) { console.error(e); ACC.ready = true; emit(); return; }
  ACC.enabled = true;
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') ACC.recovery = true;
    const u = session ? session.user : null;
    const changed = (u && u.id) !== (ACC.user && ACC.user.id);
    ACC.user = u;
    if (!u) { ACC.profile = null; ACC.ach = new Set(); ACC.recent = []; ACC.daily = null; ACC.social = null; emit(); return; }
    // don't await Supabase calls inside this callback (supabase-js deadlock note)
    if (changed || !ACC.profile) setTimeout(() => refreshProfile().catch(() => {}), 0); else emit();
  });
  try { const {data} = await sb.auth.getSession(); ACC.user = data && data.session ? data.session.user : null; } catch (e) {}
  if (ACC.user) { try { await refreshProfile(); } catch (e) {} }
  ACC.ready = true; emit();
}

export async function refreshProfile() {
  if (!sb || !ACC.user) return;
  const uid = ACC.user.id;
  const [p, a, r] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('achievements').select('key,unlocked_at').eq('user_id', uid),
    sb.from('game_results').select('game_id,mode,players,place,won,days,counted,verified,xp,xp_full,created_at').eq('user_id', uid).order('created_at', {ascending: false}).limit(8)
  ]);
  if (p.error) throw fail(p.error);
  ACC.profile = p.data || null;
  ACC.ach = new Set((a.data || []).map(x => x.key));
  ACC.recent = r.data || [];
  try { const d = await sb.rpc('my_daily'); if (!d.error) ACC.daily = d.data; } catch (e) {}
  emit();
}

/* ---------------- auth ---------------- */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,14}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function usernameAvailable(name) {
  if (!sb || !USERNAME_RE.test(name)) return false;
  const {data, error} = await sb.rpc('username_available', {p_username: name});
  if (error) throw fail(error);
  return !!data;
}

export async function signUp(username, password, email) {
  if (!sb) throw fail('disabled');
  username = String(username || '').trim(); email = String(email || '').trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw Object.assign(new Error('aErrName'), {key: 'aErrName'});
  if (String(password || '').length < 6) throw Object.assign(new Error('aErrPwShort'), {key: 'aErrPwShort'});
  if (email && !EMAIL_RE.test(email)) throw Object.assign(new Error('aErrEmailInvalid'), {key: 'aErrEmailInvalid'});
  if (!(await usernameAvailable(username))) throw Object.assign(new Error('aErrNameTaken'), {key: 'aErrNameTaken'});
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');
  const addr = email || `${username.toLowerCase()}.${rnd}@${PLACEHOLDER_EMAIL_DOMAIN}`;
  const {data, error} = await sb.auth.signUp({email: addr, password, options: {data: {username}, emailRedirectTo: location.origin + location.pathname}});
  if (error) throw fail(error);
  if (!data.session) {
    // "Confirm email" is ON in Supabase: the account exists but can't log in yet
    throw Object.assign(new Error('aErrConfirm'), {key: 'aErrConfirm'});
  }
  return data;
}

// Log in with a username or an e-mail address
export async function signIn(id, password) {
  if (!sb) throw fail('disabled');
  id = String(id || '').trim();
  let email = id;
  if (!id.includes('@')) {
    if (!USERNAME_RE.test(id)) throw Object.assign(new Error('aErrLogin'), {key: 'aErrLogin'});
    const {data, error} = await sb.rpc('login_email', {p_username: id, p_password: password});
    if (error) throw fail(error);
    if (!data) throw Object.assign(new Error('aErrLogin'), {key: 'aErrLogin'});
    email = data;
  }
  const {error} = await sb.auth.signInWithPassword({email, password});
  if (error) throw fail(error);
}

export async function sendReset(email) {
  if (!sb) throw fail('disabled');
  email = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw Object.assign(new Error('aErrEmailInvalid'), {key: 'aErrEmailInvalid'});
  const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname});
  if (error) throw fail(error);
}

export async function setNewPassword(pw) {
  if (!sb) throw fail('disabled');
  if (String(pw || '').length < 6) throw Object.assign(new Error('aErrPwShort'), {key: 'aErrPwShort'});
  const {error} = await sb.auth.updateUser({password: pw});
  if (error) throw fail(error);
  ACC.recovery = false; emit();
}

export async function signOut() {
  if (!sb) return;
  try { await sb.auth.signOut(); } catch (e) {}
  ACC.user = null; ACC.profile = null; ACC.ach = new Set(); ACC.recent = []; ACC.daily = null; ACC.social = null; emit();
}

// Permanently deletes the signed-in account and all of its data
export async function deleteAccount() {
  if (!sb || !loggedIn()) throw fail('not_authenticated');
  const {error} = await sb.rpc('delete_my_account');
  if (error) throw fail(error);
  await signOut();
}

/* ---------------- profile actions ---------------- */
export async function equip(patch) {
  if (!sb || !loggedIn()) throw fail('not_authenticated');
  const next = Object.assign({}, equipped(), patch);
  const {data, error} = await sb.rpc('set_equipped', {p: next});
  if (error) throw fail(error);
  ACC.profile.equipped = data || next; emit();
  return ACC.profile.equipped;
}

// payload: {game_id, mode, pid, order, won, days, duration, stats}
export async function submitResult(payload) {
  if (!sb || !loggedIn()) return null;
  const before = new Set(ACC.ach), lvBefore = level();
  const {data, error} = await sb.rpc('submit_result', {p: payload});
  if (error) throw fail(error);
  try { await refreshProfile(); } catch (e) {}
  const res = Object.assign({}, data || {});
  res.levelBefore = lvBefore; res.levelAfter = level();
  res.newAch = [...ACC.ach].filter(k => !before.has(k));
  return res;
}

/* ---------------- daily quest, leaderboards, friends, invites ---------------- */
export const QUESTS = ['play_online', 'win_any', 'deal', 'buy2', 'upgrade', 'cards3', 'survive10', 'payer'];

// kind: 'weekly' | 'level'
export async function leaderboard(kind) {
  if (!sb) throw fail('disabled');
  const {data, error} = await sb.rpc('leaderboard', {p_kind: kind, p_limit: 50});
  if (error) throw fail(error);
  return data || [];
}
export async function publicProfile(username) {
  if (!sb) throw fail('disabled');
  const {data, error} = await sb.rpc('public_profile', {p_username: username});
  if (error) throw fail(error);
  return data;
}
async function call(fn, args) {
  if (!sb || !loggedIn()) throw fail('not_authenticated');
  const {data, error} = await sb.rpc(fn, args || {});
  if (error) throw fail(error);
  return data;
}
export const friendAdd = name => call('friend_add', {p_username: name}).then(r => { pollSocial(); return r; });
export const friendRespond = (name, ok) => call('friend_respond', {p_username: name, p_accept: !!ok}).then(pollSocial);
export const friendRemove = name => call('friend_remove', {p_username: name}).then(pollSocial);
export const inviteFriend = (name, room) => call('invite_friend', {p_username: name, p_room: room});
export const inviteDismiss = id => call('invite_dismiss', {p_id: id}).then(pollSocial);

// friends, requests and invites; also keeps me "online" for friends. Polled every 20 s while logged in.
let lastSocial = '';
export async function pollSocial() {
  if (!sb || !loggedIn()) return;
  try {
    const data = await call('social');
    const key = JSON.stringify(data);
    if (key !== lastSocial) { lastSocial = key; ACC.social = data; emit(); }
  } catch (e) {}
}
setInterval(() => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') pollSocial(); }, 20000);
onAccount(() => { if (loggedIn() && !ACC.social) pollSocial(); });
