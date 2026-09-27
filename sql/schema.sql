-- =====================================================================
-- Check Flip — accounts, progression and cosmetics (Supabase / Postgres)
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: objects are created with IF NOT EXISTS / OR REPLACE.
--
-- Security model
--   * Passwords are handled by Supabase Auth (bcrypt); never stored here.
--   * Clients can only READ tables; every write goes through the
--     SECURITY DEFINER functions below, which validate the input.
--   * Game results: duplicate submissions are ignored, XP per game is
--     capped, short games don't count, and multiplayer results only get
--     full XP / wins / achievements when another player of the same game
--     submits the same final standings (cross-check by digest).
--   * Bot (solo) games give half XP and never count toward achievements
--     other than level-based ones.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null check (username ~ '^[A-Za-z0-9_]{3,14}$'),
  created_at  timestamptz not null default now(),
  xp          integer not null default 0 check (xp >= 0),
  games       integer not null default 0,   -- counted multiplayer games
  wins        integer not null default 0,   -- verified multiplayer wins
  bot_games   integer not null default 0,
  stats       jsonb   not null default '{}'::jsonb,  -- cumulative verified counters
  equipped    jsonb   not null default '{}'::jsonb   -- {frame, board, bubble, title, avatar}
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

create table if not exists public.achievements (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  key         text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists public.game_results (
  game_id     text not null,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  pid         text not null,                  -- seat id inside the game
  mode        text not null check (mode in ('online', 'solo')),
  players     integer not null,
  place       integer not null,
  won         boolean not null default false,
  days        integer not null,
  duration_s  integer not null,
  digest      text,
  stats       jsonb not null default '{}'::jsonb,
  counted     boolean not null default false,
  verified    boolean not null default false,
  xp_full     integer not null default 0,
  xp          integer not null default 0,     -- XP granted so far
  created_at  timestamptz not null default now(),
  primary key (game_id, user_id)
);
create unique index if not exists game_results_seat on public.game_results (game_id, pid);
create index if not exists game_results_user_time on public.game_results (user_id, created_at desc);

-- Cosmetic catalog: the single source of truth for unlock rules.
-- (Names and visuals live in the client; keys must match js/account.js.)
create table if not exists public.cosmetics (
  key        text not null,
  kind       text not null check (kind in ('frame', 'board', 'bubble', 'title')),
  req_level  integer not null default 1,
  req_ach    text,
  sort       integer not null default 0,
  primary key (kind, key)
);

-- Failed login attempts (username login throttle)
create table if not exists public.login_attempts (
  username_l text not null,
  at         timestamptz not null default now()
);
create index if not exists login_attempts_idx on public.login_attempts (username_l, at desc);

-- ---------------------------------------------------------------------
-- Catalog seed
-- ---------------------------------------------------------------------
insert into public.cosmetics (kind, key, req_level, req_ach, sort) values
  ('frame',  'none',      1, null,           0),
  ('frame',  'bronze',    5, null,           1),
  ('frame',  'silver',   15, null,           2),
  ('frame',  'gold',     30, null,           3),
  ('frame',  'diamond',  50, null,           4),
  ('frame',  'neon',      1, 'negotiator',   5),
  ('frame',  'flame',     1, 'gourmet',      6),
  ('frame',  'royal',     1, 'tycoon',       7),
  ('board',  'felt',      1, null,           0),
  ('board',  'wood',      3, null,           1),
  ('board',  'terracotta',6, null,           2),
  ('board',  'marble',   10, null,           3),
  ('board',  'night',    20, null,           4),
  ('board',  'neon',     35, null,           5),
  ('board',  'ocean',     1, 'iron_stomach', 6),
  ('bubble', 'plain',     1, null,           0),
  ('bubble', 'receipt',   4, null,           1),
  ('bubble', 'comic',     8, null,           2),
  ('bubble', 'neon',     25, null,           3),
  ('bubble', 'heart',     1, 'first_bite',   4),
  ('bubble', 'gold',      1, 'regular',      5),
  ('title',  'rookie',    1, null,           0),
  ('title',  'first_bite',1, 'first_bite',   1),
  ('title',  'sous_chef', 1, 'sous_chef',    2),
  ('title',  'regular',   1, 'regular',      3),
  ('title',  'veteran',   1, 'veteran',      4),
  ('title',  'negotiator',1, 'negotiator',   5),
  ('title',  'belt_master',1,'belt_master',  6),
  ('title',  'iron_stomach',1,'iron_stomach',7),
  ('title',  'tycoon',    1, 'tycoon',       8),
  ('title',  'gourmet',   1, 'gourmet',      9),
  ('title',  'head_chef', 1, 'head_chef',   10)
on conflict (kind, key) do update set req_level = excluded.req_level, req_ach = excluded.req_ach, sort = excluded.sort;

-- ---------------------------------------------------------------------
-- Row Level Security: read-only for clients, writes only via functions
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.achievements   enable row level security;
alter table public.game_results   enable row level security;
alter table public.cosmetics      enable row level security;
alter table public.login_attempts enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements for select using (true);
drop policy if exists results_read_own on public.game_results;
create policy results_read_own on public.game_results for select using (auth.uid() = user_id);
drop policy if exists cosmetics_read on public.cosmetics;
create policy cosmetics_read on public.cosmetics for select using (true);
-- login_attempts: no policies → no client access at all

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.achievements, public.cosmetics to anon, authenticated;
grant select on public.game_results to authenticated;
revoke insert, update, delete on public.profiles, public.achievements, public.game_results, public.cosmetics from anon, authenticated;
revoke all on public.login_attempts from anon, authenticated;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
-- Level curve: level L needs 6.5 × (L−1)² XP (level 10 ≈ 530 XP, level 50 ≈ 15 600 XP)
create or replace function public.level_of(p_xp integer)
returns integer language sql immutable as $$
  select least(99, floor(sqrt(greatest(p_xp, 0) / 6.5))::int + 1);
$$;

-- New auth user → profile row (username comes from sign-up metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_username ~ '^[A-Za-z0-9_]{3,14}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;

-- Username login: returns the account's auth e-mail ONLY when the password
-- is correct, so e-mail addresses can't be looked up by username.
-- Throttled to 5 failed attempts per username per 15 minutes.
create or replace function public.login_email(p_username text, p_password text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_email text; v_hash text; v_fails int;
begin
  if p_username is null or p_password is null then return null; end if;
  select count(*) into v_fails from public.login_attempts
   where username_l = lower(p_username) and at > now() - interval '15 minutes';
  if v_fails >= 5 then raise exception 'too_many_attempts'; end if;

  select u.email, u.encrypted_password into v_email, v_hash
    from public.profiles p join auth.users u on u.id = p.id
   where lower(p.username) = lower(p_username);

  if v_hash is not null and v_hash = extensions.crypt(p_password, v_hash) then
    delete from public.login_attempts where username_l = lower(p_username);
    return v_email;
  end if;
  insert into public.login_attempts (username_l) values (lower(p_username));
  delete from public.login_attempts where at < now() - interval '1 day';
  return null;
end $$;

-- Award achievements whose conditions are now met; returns the new keys.
create or replace function public.check_achievements(p_user uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles%rowtype; lv int; new_keys text[] := '{}'; k text;
begin
  select * into p from public.profiles where id = p_user;
  if not found then return new_keys; end if;
  lv := public.level_of(p.xp);
  foreach k in array array[
    case when p.wins  >= 1   then 'first_bite' end,
    case when p.wins  >= 10  then 'regular' end,
    case when p.wins  >= 100 then 'gourmet' end,
    case when p.games >= 50  then 'veteran' end,
    case when lv >= 10 then 'sous_chef' end,
    case when lv >= 50 then 'head_chef' end,
    case when coalesce((p.stats ->> 'deals')::int, 0)  >= 10 then 'negotiator' end,
    case when coalesce((p.stats ->> 'belt')::int, 0)   >= 20 then 'belt_master' end,
    case when coalesce((p.stats ->> 'tycoon')::int, 0) >= 1  then 'tycoon' end,
    case when coalesce((p.stats ->> 'iron')::int, 0)   >= 1  then 'iron_stomach' end
  ] loop
    if k is not null then
      insert into public.achievements (user_id, key) values (p_user, k) on conflict do nothing;
      if found then new_keys := new_keys || k; end if;
    end if;
  end loop;
  return new_keys;
end $$;

-- Any change to XP, wins, games or stats re-checks achievements, including
-- manual edits in the Table Editor.
create or replace function public.profiles_achievements()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.xp, new.wins, new.games, new.stats) is distinct from (old.xp, old.wins, old.games, old.stats) then
    perform public.check_achievements(new.id);
  end if;
  return null;
end $$;
drop trigger if exists profiles_achievements on public.profiles;
create trigger profiles_achievements after update on public.profiles
  for each row execute function public.profiles_achievements();

-- Grant the rest of a result's XP plus wins/stats once it is verified.
create or replace function public.apply_verified(p_game text, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.game_results%rowtype;
begin
  select * into r from public.game_results where game_id = p_game and user_id = p_user for update;
  if not found or r.verified or not r.counted then return; end if;
  update public.profiles set
    xp    = xp + (r.xp_full - r.xp),
    wins  = wins + case when r.won then 1 else 0 end,
    stats = jsonb_build_object(
      'deals',  coalesce((stats ->> 'deals')::int, 0)  + coalesce((r.stats ->> 'deals')::int, 0),
      'belt',   coalesce((stats ->> 'belt')::int, 0)   + coalesce((r.stats ->> 'belt')::int, 0),
      'tycoon', coalesce((stats ->> 'tycoon')::int, 0) + coalesce((r.stats ->> 'tycoon')::int, 0),
      'iron',   coalesce((stats ->> 'iron')::int, 0)   + coalesce((r.stats ->> 'iron')::int, 0))
  where id = p_user;
  update public.game_results set verified = true, xp = xp_full where game_id = p_game and user_id = p_user;
  perform public.check_achievements(p_user);
end $$;

-- ---------------------------------------------------------------------
-- submit_result: called by each signed-in player at the end of a game
-- p = {game_id, mode:'online'|'solo', pid, order:[seat ids, winner first],
--      won, days, duration, stats:{deals, belt, tycoon, iron, bonus}}
-- Place and player count are derived from `order`; the digest of the final
-- standings is computed here, so players can't pick their own.
-- ---------------------------------------------------------------------
create or replace function public.submit_result(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_gid text := p ->> 'game_id';
  v_mode text := p ->> 'mode';
  v_pid text := p ->> 'pid';
  v_order jsonb := p -> 'order';
  v_players int; v_place int;
  v_won boolean := coalesce((p ->> 'won')::boolean, false);
  v_days int := least(greatest(coalesce((p ->> 'days')::int, 0), 0), 999);
  v_dur int := least(greatest(coalesce((p ->> 'duration')::int, 0), 0), 86400);
  v_digest text;
  v_stats jsonb; v_counted boolean; v_full int; v_now int := 0;
  v_recent int; v_verified boolean := false; v_before int; v_after int; v_new text[] := '{}'; o record;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_gid is null or v_gid !~ '^[A-Za-z0-9_-]{6,40}$' then raise exception 'bad_game_id'; end if;
  if v_mode is null or v_mode not in ('online', 'solo') then raise exception 'bad_mode'; end if;
  if v_pid is null or v_pid !~ '^[A-Za-z0-9_-]{1,20}$' then raise exception 'bad_pid'; end if;
  if v_order is null or jsonb_typeof(v_order) <> 'array' then raise exception 'bad_order'; end if;
  v_players := jsonb_array_length(v_order);
  if v_players not between 2 and 6 then raise exception 'bad_order'; end if;
  if (select count(distinct x) from jsonb_array_elements_text(v_order) x) <> v_players then raise exception 'bad_order'; end if;
  select i::int into v_place from jsonb_array_elements_text(v_order) with ordinality as e(x, i) where x = v_pid;
  if v_place is null then raise exception 'bad_pid'; end if;
  if v_won and v_place <> 1 then v_won := false; end if;
  v_digest := md5(v_gid || '|' || v_order::text || '|' || v_days);

  perform pg_advisory_xact_lock(hashtext(v_gid));
  select xp into v_before from public.profiles where id = v_uid;
  if not found then raise exception 'no_profile'; end if;

  -- per-game stats, clamped to sane ranges
  v_stats := jsonb_build_object(
    'deals',  least(greatest(coalesce((p -> 'stats' ->> 'deals')::int, 0), 0), 6),
    'belt',   least(greatest(coalesce((p -> 'stats' ->> 'belt')::int, 0), 0), 6),
    'tycoon', case when coalesce((p -> 'stats' ->> 'tycoon')::boolean, false) then 1 else 0 end,
    'iron',   case when coalesce((p -> 'stats' ->> 'iron')::boolean, false) then 1 else 0 end);

  -- anti-abuse: short games and result flooding don't count
  -- (max 12 counted results per hour, and at least 4 minutes between two counted results)
  select count(*) into v_recent from public.game_results
   where user_id = v_uid and counted and created_at > now() - interval '1 hour';
  v_counted := v_days >= 3 and v_dur >= 240 and v_recent < 12
    and not exists (select 1 from public.game_results
                     where user_id = v_uid and counted and created_at > now() - interval '4 minutes');

  v_full := case when v_counted then least(150,
              20 + (v_players - v_place) * 10 + case when v_won then 50 else 0 end
              + least(greatest(coalesce((p -> 'stats' ->> 'bonus')::int, 0), 0), 20))
            else 0 end;
  if v_mode = 'solo' then v_full := round(v_full * 0.5); end if;

  insert into public.game_results (game_id, user_id, pid, mode, players, place, won, days, duration_s, digest, stats, counted, xp_full)
  values (v_gid, v_uid, v_pid, v_mode, v_players, v_place, v_won, v_days, v_dur, v_digest, v_stats, v_counted, v_full)
  on conflict do nothing;
  if not found then
    return jsonb_build_object('duplicate', true);
  end if;

  if not v_counted then
    return jsonb_build_object('counted', false, 'reason', case when v_days < 3 or v_dur < 240 then 'short' else 'limit' end, 'xp_gained', 0, 'xp', v_before, 'level', public.level_of(v_before), 'new_achievements', '[]'::jsonb);
  end if;

  if v_mode = 'solo' then
    -- bot games: XP only, no wins/stats; level achievements may still unlock
    update public.profiles set xp = xp + v_full, bot_games = bot_games + 1 where id = v_uid;
    update public.game_results set xp = v_full, verified = true where game_id = v_gid and user_id = v_uid;
    v_verified := true;
  else
    -- participation XP right away
    v_now := least(20, v_full);
    update public.profiles set xp = xp + v_now, games = games + 1 where id = v_uid;
    update public.game_results set xp = v_now where game_id = v_gid and user_id = v_uid;
    -- cross-check: another player of this game reported the same final standings?
    if v_digest is not null and exists (
         select 1 from public.game_results
          where game_id = v_gid and user_id <> v_uid and digest = v_digest and counted) then
      v_verified := true;
      for o in select user_id from public.game_results
                where game_id = v_gid and digest = v_digest and counted and not verified loop
        perform public.apply_verified(v_gid, o.user_id);
      end loop;
    end if;
  end if;
  -- achievements unlocked by this call (now() is the transaction start time)
  select coalesce(array_agg(key), '{}') into v_new from public.achievements
   where user_id = v_uid and unlocked_at = now();

  select xp into v_after from public.profiles where id = v_uid;
  return jsonb_build_object('counted', true, 'verified', v_verified, 'xp_gained', v_after - v_before,
                            'xp_pending', case when v_verified then 0 else v_full - v_now end,
                            'xp', v_after, 'level', public.level_of(v_after), 'new_achievements', to_jsonb(v_new));
end $$;

-- ---------------------------------------------------------------------
-- set_equipped: only unlocked cosmetics can be equipped
-- p = {frame, board, bubble, title, avatar}
-- ---------------------------------------------------------------------
create or replace function public.set_equipped(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_lv int; v_out jsonb := '{}'::jsonb; k text; v text; c public.cosmetics%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select public.level_of(xp) into v_lv from public.profiles where id = v_uid;
  foreach k in array array['frame', 'board', 'bubble', 'title'] loop
    v := p ->> k;
    if v is not null and v <> '' then
      select * into c from public.cosmetics where kind = k and key = v;
      if not found then raise exception 'unknown_item %', v; end if;
      if c.req_level > v_lv then raise exception 'locked %', v; end if;
      if c.req_ach is not null and not exists (select 1 from public.achievements where user_id = v_uid and key = c.req_ach) then
        raise exception 'locked %', v;
      end if;
      v_out := v_out || jsonb_build_object(k, v);
    end if;
  end loop;
  v := p ->> 'avatar';
  if v is not null and v ~ '^[a-z0-9]{1,12}$' then v_out := v_out || jsonb_build_object('avatar', v); end if;
  update public.profiles set equipped = v_out where id = v_uid;
  return v_out;
end $$;

-- ---------------------------------------------------------------------
-- delete_my_account: the signed-in user deletes their account and all its
-- data (profile, achievements and results cascade from auth.users)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.profiles_achievements() from public, anon, authenticated;
revoke execute on function public.check_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.apply_verified(text, uuid) from public, anon, authenticated;
revoke execute on function public.submit_result(jsonb) from public, anon;
revoke execute on function public.set_equipped(jsonb) from public, anon;
grant execute on function public.level_of(integer) to anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.login_email(text, text) to anon, authenticated;
grant execute on function public.submit_result(jsonb) to authenticated;
grant execute on function public.set_equipped(jsonb) to authenticated;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------
-- Backfill: award achievements that are already earned (safe to re-run)
-- ---------------------------------------------------------------------
do $$ begin perform public.check_achievements(id) from public.profiles; end $$;
