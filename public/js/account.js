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
import {nameBlocked} from './filter.js';

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
  {key: 'tycoon', icon: '🏙️', goal: 1, get: p => +(p.stats && p.stats.tycoon) || 0},
  // v1.2
  {key: 'line_cook', icon: '🍳', goal: 25, get: p => levelOf(p.xp), level: 1},
  {key: 'executive_chef', icon: '🎩', goal: 75, get: p => levelOf(p.xp), level: 1},
  {key: 'marathon', icon: '🏃', goal: 200, get: p => p.games},
  {key: 'realtor', icon: '🏪', goal: 25, get: p => st(p, 'bought')},
  {key: 'renovator', icon: '🔨', goal: 15, get: p => st(p, 'upgrades')},
  {key: 'card_shark', icon: '🃏', goal: 50, get: p => st(p, 'cards')},
  {key: 'big_spender', icon: '💳', goal: 30, get: p => st(p, 'paid')},
  {key: 'deal_maker', icon: '💼', goal: 50, get: p => st(p, 'deals')},
  {key: 'survivor', icon: '⏳', goal: 20, get: p => st(p, 'best_days')},
  {key: 'team_player', icon: '👥', goal: 5, get: p => st(p, 'team_wins')},
  {key: 'speed_eater', icon: '⚡', goal: 5, get: p => st(p, 'quick_wins')},
  {key: 'social', icon: '💬', goal: 5, get: () => (ACC.social && ACC.social.friends || []).length},
  {key: 'quester', icon: '🎯', goal: 10, get: () => +(ACC.daily && ACC.daily.total) || 0},
  {key: 'devoted', icon: '📅', goal: 30, get: () => +(ACC.daily && ACC.daily.total) || 0},
  // v1.9: single-game feats, ranked games only
  {key: 'full_house', icon: '🏘️', goal: 1, get: p => st(p, 'full4')},
  {key: 'lap_legend', icon: '🔁', goal: 1, get: p => st(p, 'laps10')},
  {key: 'deep_pockets', icon: '💰', goal: 1, get: p => st(p, 'rich')}
];
function st(p, k) { return +(p.stats && p.stats[k]) || 0; }

// Cosmetics: lv = required level, ach = required achievement (mirror of public.cosmetics)
export const CATALOG = {
  avatar: [
    {key: 'waiter', lv: 1}, {key: 'waitress', lv: 1}, {key: 'student', lv: 1}, {key: 'foodie', lv: 1},
    {key: 'italian', lv: 5}, {key: 'doner', lv: 10}, {key: 'noodle', lv: 15}, {key: 'baker', lv: 25},
    {key: 'grandma', ach: 'first_bite'}, {key: 'critic', ach: 'regular'}, {key: 'barista', ach: 'quester'}, {key: 'sommelier', ach: 'marathon'}
  ],
  frame: [
    {key: 'none', lv: 1}, {key: 'bronze', lv: 5}, {key: 'silver', lv: 15}, {key: 'gold', lv: 30}, {key: 'diamond', lv: 50},
    {key: 'neon', ach: 'negotiator'}, {key: 'flame', ach: 'gourmet'}, {key: 'royal', ach: 'tycoon'},
    {key: 'ember', ach: 'line_cook'}, {key: 'crown', ach: 'executive_chef'}, {key: 'ivy', ach: 'renovator'}, {key: 'duo', ach: 'team_player'}, {key: 'star', ach: 'deal_maker'}
  ],
  board: [
    {key: 'felt', lv: 1}, {key: 'hearts', lv: 1}, {key: 'wood', lv: 3}, {key: 'feast', lv: 6}, {key: 'terracotta', lv: 10},
    {key: 'marble', lv: 15}, {key: 'sunset', lv: 20}, {key: 'night', lv: 25}, {key: 'chalk', lv: 30}, {key: 'neon', lv: 35},
    {key: 'ocean', ach: 'iron_stomach'}, {key: 'bistro', ach: 'realtor'}, {key: 'gold', ach: 'big_spender'}, {key: 'lavender', ach: 'devoted'}
  ],
  bubble: [
    {key: 'plain', lv: 1}, {key: 'receipt', lv: 4}, {key: 'comic', lv: 8}, {key: 'neon', lv: 25},
    {key: 'heart', ach: 'first_bite'}, {key: 'gold', ach: 'regular'},
    {key: 'suits', ach: 'card_shark'}, {key: 'zen', ach: 'survivor'}, {key: 'zoom', ach: 'speed_eater'}, {key: 'mint', ach: 'social'}
  ],
  title: [{key: 'rookie', lv: 1}, ...ACHS.map(a => ({key: a.key, ach: a.key}))],
  dice: [{key: 'classic', lv: 1}, {key: 'redwhite', lv: 3}, {key: 'bone', lv: 8}, {key: 'gingham', lv: 12}, {key: 'neon', lv: 18}, {key: 'marble', lv: 24}, {key: 'gold', lv: 32}, {key: 'chelsea', lv: 40}]
};
export const DEFAULTS = {frame: 'none', board: 'felt', bubble: 'plain', title: 'rookie', dice: 'classic'};
// how each title badge looks (colour / font / effect); the rarer the achievement, the fancier
const TITLE_STYLE = {
  rookie: 'plain',
  first_bite: 'green', regular: 'green', line_cook: 'green', social: 'green',
  veteran: 'blue', sous_chef: 'blue', negotiator: 'blue', team_player: 'blue', quester: 'blue',
  belt_master: 'red', big_spender: 'red', marathon: 'red',
  realtor: 'yellow', renovator: 'yellow', card_shark: 'yellow', deal_maker: 'yellow', survivor: 'yellow', devoted: 'yellow',
  gourmet: 'gold', head_chef: 'gold', executive_chef: 'gold',
  iron_stomach: 'neon', tycoon: 'royal', speed_eater: 'fire',
  full_house: 'yellow', lap_legend: 'red', deep_pockets: 'gold'
};
export const titleCls = key => ' tt-' + (TITLE_STYLE[key] || 'plain');
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
  social: null,       // {friends, incoming, outgoing, invites}
  medals: [],         // season medals [{season, place}]
  token: null,        // current access token (the game server uses it to know who is chatting)
  status: null,       // {chat_until, account_until, admin} from public.my_status
  banned: null        // set when the account is suspended: the end date ('infinity' = permanent)
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
  return {u: ACC.profile.username, lv: level(), fr: e.frame, ti: e.title, bu: e.bubble, di: e.dice};
}

/* ---------------- errors ---------------- */
// Maps Supabase / database errors to i18n keys (see js/i18n-account.js)
// Supabase Auth error codes → specific messages (https://supabase.com/docs/guides/auth/debugging/error-codes)
const AUTH_CODES = {
  same_password: 'aErrSamePw', weak_password: 'aErrPwWeak', otp_expired: 'aErrLinkExpired', flow_state_expired: 'aErrLinkExpired',
  flow_state_not_found: 'aErrLinkExpired', bad_jwt: 'aErrSession', session_not_found: 'aErrSession', session_expired: 'aErrSession',
  refresh_token_not_found: 'aErrSession', reauthentication_needed: 'aErrSession', no_authorization: 'aErrSession',
  invalid_credentials: 'aErrLogin', user_already_exists: 'aErrEmailTaken', email_exists: 'aErrEmailTaken',
  email_address_invalid: 'aErrEmailInvalid', email_address_not_authorized: 'aErrEmailInvalid', email_not_confirmed: 'aErrConfirm',
  username_blocked: 'aErrNameBlocked', signup_disabled: 'aErrSignupOff', email_provider_disabled: 'aErrSignupOff',
  over_email_send_rate_limit: 'aErrEmailRate', over_request_rate_limit: 'aErrTooMany', over_sms_send_rate_limit: 'aErrTooMany',
  user_banned: 'aErrBanned', request_timeout: 'aErrNet', unexpected_failure: 'aErrServer'
};
function errKey(e) {
  if (e && typeof e.code === 'string') {
    if (e.code === 'weak_password') {
      const r = (e.reasons || (e.weak_password && e.weak_password.reasons) || []).map(String);
      if (r.includes('pwned')) return 'aErrPwPwned';
      if (r.includes('characters')) return 'aErrPwChars';
      return 'aErrPwShort';
    }
    if (AUTH_CODES[e.code]) return AUTH_CODES[e.code];
  }
  const m = String((e && (e.message || e.error_description || e.code)) || e || '').toLowerCase();
  if (!m) return 'aErrGeneric';
  if (m.includes('should be different from the old password')) return 'aErrSamePw';
  if (m.includes('expired') || m.includes('invalid or has expired')) return 'aErrLinkExpired';
  if (m.includes('auth session missing')) return 'aErrSession';
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
const fail = e => { const k = errKey(e); const err = new Error(k); err.key = k; err.code = e && (e.code || e.status); err.raw = e; if (k === 'aErrGeneric') console.warn('unmapped error', e); return err; };
export const PW_MIN = 6, PW_MAX = 72;

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
    const u = session ? session.user : null; ACC.token = session ? session.access_token : null;
    const changed = (u && u.id) !== (ACC.user && ACC.user.id);
    ACC.user = u;
    if (!u) { ACC.profile = null; ACC.ach = new Set(); ACC.recent = []; ACC.daily = null; ACC.social = null; emit(); return; }
    // don't await Supabase calls inside this callback (supabase-js deadlock note)
    if (changed || !ACC.profile) setTimeout(() => refreshProfile().catch(() => {}), 0); else emit();
  });
  try { const {data} = await sb.auth.getSession(); ACC.user = data && data.session ? data.session.user : null; ACC.token = data && data.session ? data.session.access_token : null; } catch (e) {}
  logVisit();
  if (ACC.user) { try { await refreshProfile(); } catch (e) {} }
  ACC.ready = true; emit();
}

export async function refreshProfile() {
  if (!sb || !ACC.user) return;
  const uid = ACC.user.id;
  const [p, a, r, md] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('achievements').select('key,unlocked_at').eq('user_id', uid),
    sb.from('game_results').select('game_id,mode,players,place,won,days,counted,verified,xp,xp_full,created_at').eq('user_id', uid).order('created_at', {ascending: false}).limit(8),
    sb.from('season_medals').select('season,place').eq('user_id', uid).order('season', {ascending: false})
  ]);
  if (p.error) throw fail(p.error);
  ACC.profile = p.data || null;
  ACC.ach = new Set((a.data || []).map(x => x.key));
  ACC.recent = r.data || [];
  ACC.medals = (md && !md.error && md.data) || [];
  try { const d = await sb.rpc('my_daily'); if (!d.error) ACC.daily = d.data; } catch (e) {}
  try { const st = await sb.rpc('my_status'); if (!st.error) ACC.status = st.data; } catch (e) {}
  if (ACC.status && ACC.status.account_until) {   // suspended account: sign out, keep the date to show
    ACC.banned = ACC.status.account_until; await signOut(); return;
  }
  emit();
}

/* ---------------- auth ---------------- */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,14}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function checkPw(pw) {
  const n = String(pw || '').length;
  if (n < PW_MIN) throw Object.assign(new Error('aErrPwShort'), {key: 'aErrPwShort'});
  if (n > PW_MAX) throw Object.assign(new Error('aErrPwLong'), {key: 'aErrPwLong'});
}
export async function usernameAvailable(name) {
  if (!sb || !USERNAME_RE.test(name) || nameBlocked(name)) return false;
  const {data, error} = await sb.rpc('username_available', {p_username: name});
  if (error) throw fail(error);
  return !!data;
}

export async function signUp(username, password, email, captchaToken) {
  if (!sb) throw fail('disabled');
  username = String(username || '').trim(); email = String(email || '').trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw Object.assign(new Error('aErrName'), {key: 'aErrName'});
  if (nameBlocked(username)) throw Object.assign(new Error('aErrNameBlocked'), {key: 'aErrNameBlocked'});
  checkPw(password);
  if (email && !EMAIL_RE.test(email)) throw Object.assign(new Error('aErrEmailInvalid'), {key: 'aErrEmailInvalid'});
  if (!(await usernameAvailable(username))) throw Object.assign(new Error('aErrNameTaken'), {key: 'aErrNameTaken'});
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');
  const addr = email || `${username.toLowerCase()}.${rnd}@${PLACEHOLDER_EMAIL_DOMAIN}`;
  const {data, error} = await sb.auth.signUp({email: addr, password, options: {data: {username}, emailRedirectTo: location.origin + '/', captchaToken: captchaToken || undefined}});
  if (error) throw fail(error);
  if (!data.session) {
    // "Confirm email" is ON in Supabase: the account exists but can't log in yet
    throw Object.assign(new Error('aErrConfirm'), {key: 'aErrConfirm'});
  }
  return data;
}

// Log in with a username or an e-mail address
export async function signIn(id, password, captchaToken) {
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
  const {error} = await sb.auth.signInWithPassword({email, password, options: captchaToken ? {captchaToken} : undefined});
  if (error) throw fail(error);
}

export async function sendReset(email, captchaToken) {
  if (!sb) throw fail('disabled');
  email = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw Object.assign(new Error('aErrEmailInvalid'), {key: 'aErrEmailInvalid'});
  const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.origin + '/', captchaToken: captchaToken || undefined});
  if (error) throw fail(error);
}

export async function setNewPassword(pw) {
  if (!sb) throw fail('disabled');
  checkPw(pw);
  const {error} = await sb.auth.updateUser({password: pw});
  if (error) throw fail(error);
  ACC.recovery = false; emit();
}

// Adds or changes the e-mail on the account (used for password resets).
// Returns 'done' when the address is saved right away, 'confirm' when Supabase sent a confirmation link first.
export async function updateEmail(email) {
  if (!sb || !loggedIn()) throw fail('not_authenticated');
  email = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.endsWith('@' + PLACEHOLDER_EMAIL_DOMAIN)) throw Object.assign(new Error('aErrEmailInvalid'), {key: 'aErrEmailInvalid'});
  if (ACC.user && ACC.user.email === email) return 'done';
  const {data, error} = await sb.auth.updateUser({email}, {emailRedirectTo: location.origin + '/'});
  if (error) throw fail(error);
  if (data && data.user) ACC.user = data.user;
  emit();
  return ACC.user && ACC.user.email === email ? 'done' : 'confirm';
}

// Change the username (server allows it once every 7 days). Returns the date of the next allowed change.
export async function changeUsername(name) {
  if (!sb || !loggedIn()) throw fail('not_authenticated');
  name = String(name || '').trim();
  if (!USERNAME_RE.test(name)) throw Object.assign(new Error('aErrName'), {key: 'aErrName'});
  if (nameBlocked(name)) throw Object.assign(new Error('aErrNameBlocked'), {key: 'aErrNameBlocked'});
  const {data, error} = await sb.rpc('change_username', {p_new: name});
  if (error) {
    const m = String(error.message || '');
    const w = m.match(/username_wait (\S+)/); if (w) throw Object.assign(new Error('aErrNameWait'), {key: 'aErrNameWait', at: w[1]});
    if (m.includes('username_taken') || m.includes('duplicate key')) throw Object.assign(new Error('aErrNameTaken'), {key: 'aErrNameTaken'});
    if (m.includes('username_blocked')) throw Object.assign(new Error('aErrNameBlocked'), {key: 'aErrNameBlocked'});
    if (m.includes('username_invalid')) throw Object.assign(new Error('aErrName'), {key: 'aErrName'});
    throw fail(error);
  }
  await refreshProfile();
  return data;
}

export async function signOut() {
  if (!sb) return;
  try { await sb.auth.signOut(); } catch (e) {}
  ACC.user = null; ACC.profile = null; ACC.ach = new Set(); ACC.recent = []; ACC.daily = null; ACC.social = null; ACC.status = null; ACC.token = null; emit();
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
  const {data, error} = await sb.rpc('leaderboard', {p_kind: kind === 'weekly' ? 'season' : kind, p_limit: 50});
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

export const mySeason = n => call('my_season', {p_season: n});
export const friendMatches = () => call('friend_matches', {p_limit: 10});
// friends, requests and invites; also keeps me "online" for friends (online = seen in the last 2 minutes).
// Polled every 45 s on the menus, every 90 s during a game, never while the tab is hidden.
let lastSocial = '', socialAt = 0, inGame = () => false;
export const setSocialGameCheck = fn => { inGame = fn; };
export async function pollSocial() {
  if (!sb || !loggedIn()) return;
  socialAt = Date.now();
  try {
    const data = await call('social');
    const key = JSON.stringify(data);
    if (key !== lastSocial) { lastSocial = key; ACC.social = data; emit(); }
  } catch (e) {}
}
setInterval(() => { if (typeof document !== 'undefined' && document.visibilityState === 'visible' && Date.now() - socialAt >= (inGame() ? 90000 : 45000)) pollSocial(); }, 5000);
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - socialAt > 45000) pollSocial(); });
onAccount(() => { if (loggedIn() && !ACC.social) pollSocial(); });


/* ---------------- v1.10: metrics, chat reports, admin ---------------- */
// A random id for this browser (no personal data): counts visitors, games, and who comes back the next day / week.
function deviceId() {
  try {
    let d = localStorage.getItem('cf-dev');
    if (!/^[0-9a-f-]{36}$/.test(d || '')) { d = crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)); localStorage.setItem('cf-dev', d); }
    return d;
  } catch (e) { return null; }
}
export function logEvent(kind, mode) {
  const dev = deviceId(); if (!sb || !dev) return;
  sb.rpc('log_event', {p_device: dev, p_kind: kind, p_mode: mode || null}).then(() => {}, () => {});
}
function logVisit() {
  const day = new Date().toISOString().slice(0, 10);
  try { if (localStorage.getItem('cf-visit') === day) return; localStorage.setItem('cf-visit', day); } catch (e) {}
  logEvent('visit');
}
export const isAdmin = () => !!(ACC.status && ACC.status.admin);
export const reportChat = r => call('report_chat', {p: r});
export const adminMetrics = days => call('admin_metrics', {p_days: days || 14});
export const adminReports = status => call('admin_reports', {p_status: status || 'open', p_limit: 100});
export const adminSanctions = () => call('admin_sanctions');
export const adminSanction = (username, kind, days, report) => call('admin_sanction', {p_username: username, p_kind: kind, p_days: days, p_report: report || null, p_reason: null});
export const adminLift = id => call('admin_lift', {p_id: id});
export const adminDismiss = id => call('admin_dismiss', {p_id: id});
