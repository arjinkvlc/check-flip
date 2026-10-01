/**
 * Check Flip — prepares a Postgres database for the browser tests: the small part of Supabase the
 * schema needs (auth.users, auth.uid(), roles), then sql/schema.sql, then the chat secret the local
 * Worker signs chat lines with. Safe to run again. Connection: PGHOST / PGPORT / PGUSER / PGPASSWORD /
 * PGDATABASE (defaults: the throwaway local database on /tmp/pgt:5499).
 */
import fs from 'fs';
import {pool} from './mocksb.mjs';
const ROOT = new URL('../../', import.meta.url).pathname;
const SUPABASE_STUB = `
create schema if not exists extensions; create schema if not exists auth;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, encrypted_password text, raw_user_meta_data jsonb);
create or replace function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.uid', true), '')::uuid $f$;
`;
await pool.query(SUPABASE_STUB);
await pool.query(fs.readFileSync(ROOT + 'sql/schema.sql', 'utf8'));
const secret = process.env.E2E_CHAT_SECRET || 'e2e-local-chat-secret';
await pool.query("insert into public.app_settings (key, value) values ('chat_secret', $1) on conflict (key) do update set value = excluded.value", [secret]);
console.log('test database ready');
await pool.end();
