// Minimal Supabase stand-in (Auth + PostgREST subset) backed by the real schema in a local Postgres.
import pg from 'pg';
pg.types.setTypeParser(1082, v => v);   // dates as 'YYYY-MM-DD', like the real REST API
// local default: a throwaway Postgres on a unix socket; CI sets PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE
export const pool = new pg.Pool({host: process.env.PGHOST || '/tmp/pgt', port: +(process.env.PGPORT || 5499), user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD, database: process.env.PGDATABASE || 'postgres'});
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub, email) => { const exp = Math.floor(Date.now() / 1000) + 3600; return `${b64({alg: 'HS256', typ: 'JWT'})}.${b64({sub, email, role: 'authenticated', aud: 'authenticated', exp, iat: exp - 3600, session_id: 's' + sub})}.sig`; };
const sessions = new Map(); // token -> uid
const userObj = r => ({id: r.id, aud: 'authenticated', role: 'authenticated', email: r.email, user_metadata: r.raw_user_meta_data || {}, app_metadata: {provider: 'email'}, created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString()});
function session(r) { const at = jwt(r.id, r.email); sessions.set(at, r.id); const rt = 'rt_' + r.id + '_' + Date.now(); sessions.set(rt, r.id); return {access_token: at, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: rt, user: userObj(r)}; }
const J = (status, body) => ({status, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: body == null ? '' : JSON.stringify(body)});
export const log = [];
export async function handle(req) {
  const u = new URL(req.url()), m = req.method(), path = u.pathname;
  if (m === 'OPTIONS') return {status: 204, headers: {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}};
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  const auth = (req.headers()['authorization'] || '').replace(/^Bearer /, '');
  const uid = sessions.get(auth) || null;
  log.push(`${m} ${path}${u.search}`);
  if (path === '/auth/v1/signup') {
    const ex = await pool.query('select 1 from auth.users where email=$1', [body.email]);
    if (ex.rowCount) return J(422, {code: 'user_already_exists', msg: 'User already registered', error_code: 'user_already_exists'});
    try {
      const r = await pool.query("insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, extensions.crypt($2, extensions.gen_salt('bf')), $3) returning *", [body.email, body.password, body.data || {}]);
      return J(200, session(r.rows[0]));
    } catch (e) { return J(500, {code: 'unexpected_failure', msg: 'Database error saving new user'}); }
  }
  if (path === '/auth/v1/token') {
    if (u.searchParams.get('grant_type') === 'password') {
      const r = await pool.query('select * from auth.users where email=$1 and encrypted_password = extensions.crypt($2, encrypted_password)', [body.email, body.password]);
      if (!r.rowCount) return J(400, {code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials'});
      return J(200, session(r.rows[0]));
    }
    const id = sessions.get(body.refresh_token); if (!id) return J(400, {msg: 'Invalid Refresh Token'});
    const r = await pool.query('select * from auth.users where id=$1', [id]); return J(200, session(r.rows[0]));
  }
  if (path === '/auth/v1/user' && m === 'PUT') {
    if (!uid) return J(401, {code: 'session_not_found', error_code: 'session_not_found', msg: 'Auth session missing!'});
    if (body.email) {
      const taken = await pool.query('select 1 from auth.users where email=$1 and id<>$2', [body.email, uid]);
      if (taken.rowCount) return J(422, {code: 'email_exists', error_code: 'email_exists', msg: 'A user with this email address has already been registered'});
      const r = await pool.query('update auth.users set email=$2 where id=$1 returning *', [uid, body.email]);
      return J(200, userObj(r.rows[0]));
    }
    const same = await pool.query('select 1 from auth.users where id=$1 and encrypted_password = extensions.crypt($2, encrypted_password)', [uid, body.password]);
    if (same.rowCount) return J(422, {code: 'same_password', error_code: 'same_password', msg: 'New password should be different from the old password.'});
    const r = await pool.query("update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')) where id=$1 returning *", [uid, body.password]);
    return J(200, userObj(r.rows[0]));
  }
  if (path === '/auth/v1/user') { if (!uid) return J(401, {msg: 'no'}); const r = await pool.query('select * from auth.users where id=$1', [uid]); return J(200, userObj(r.rows[0])); }
  if (path === '/auth/v1/logout') return {status: 204, headers: {'access-control-allow-origin': '*'}};
  if (path === '/auth/v1/recover') return J(200, {});
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query("select set_config('request.uid', $1, true)", [uid || '']);
    if (path.startsWith('/rest/v1/rpc/')) {
      const fn = path.slice(13); const keys = Object.keys(body || {});
      const tableFn = ['leaderboard', 'admin_metrics', 'admin_reports', 'admin_sanctions', 'admin_sources', 'admin_dropoff', 'admin_games', 'admin_errors', 'admin_feedback'].includes(fn);
      const sql = tableFn ? `select * from public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})` : `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as v`;
      const vals = keys.map(k => typeof body[k] === 'object' && body[k] !== null ? JSON.stringify(body[k]) : body[k]);
      try { const r = await c.query(sql, vals); await c.query('commit'); return J(200, tableFn ? r.rows : r.rows[0].v); }
      catch (e) { await c.query('rollback'); return J(400, {code: e.code, message: e.message, details: null, hint: null}); }
    }
    const table = path.slice(9);
    const where = []; const vals = []; let order = '', limit = '';
    for (const [k, v] of u.searchParams) {
      if (k === 'select') continue;
      if (k === 'order') { const [col, dir] = v.split('.'); order = ` order by ${col} ${dir === 'desc' ? 'desc' : 'asc'}`; continue; }
      if (k === 'limit') { limit = ` limit ${+v}`; continue; }
      if (v.startsWith('eq.')) { vals.push(v.slice(3)); where.push(`${k}::text = $${vals.length}`); }
    }
    // emulate RLS for game_results
    if (table === 'game_results') { vals.push(uid || '00000000-0000-0000-0000-000000000000'); where.push(`user_id::text = $${vals.length}`); }
    const r = await c.query(`select * from public.${table}${where.length ? ' where ' + where.join(' and ') : ''}${order}${limit}`, vals);
    await c.query('commit');
    const acc = req.headers()['accept'] || '';
    if (acc.includes('vnd.pgrst.object')) return r.rowCount === 1 ? J(200, r.rows[0]) : J(406, {code: 'PGRST116', message: 'not one row'});
    return J(200, r.rows);
  } catch (e) { try { await c.query('rollback'); } catch (x) {} return J(500, {message: String(e.message)}); }
  finally { c.release(); }
}
