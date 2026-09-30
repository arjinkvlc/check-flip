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
  mode        text not null check (mode in ('online', 'solo', 'quick')),
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

-- Daily quests: one reward per user per UTC day
create table if not exists public.quest_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null,
  quest   text not null,
  primary key (user_id, day)
);

-- Friends: requests, accepted friendships (stored in both directions), game invites
create table if not exists public.friend_requests (
  from_id    uuid not null references public.profiles (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);
create table if not exists public.friends (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  friend_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);
create table if not exists public.invites (
  id         bigint generated always as identity primary key,
  from_id    uuid not null references public.profiles (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  room       text not null check (room ~ '^[A-Z0-9]{5}$'),
  created_at timestamptz not null default now()
);
create index if not exists invites_to on public.invites (to_id, created_at desc);
alter table public.profiles add column if not exists last_seen timestamptz;

-- Cosmetic catalog: the single source of truth for unlock rules.
-- (Names and visuals live in the client; keys must match js/account.js.)
create table if not exists public.cosmetics (
  key        text not null,
  kind       text not null check (kind in ('avatar', 'frame', 'board', 'bubble', 'title', 'dice')),
  req_level  integer not null default 1,
  req_ach    text,
  sort       integer not null default 0,
  primary key (kind, key)
);

-- (older installs: allow the 'avatar' kind)
alter table public.cosmetics drop constraint if exists cosmetics_kind_check;
alter table public.cosmetics add constraint cosmetics_kind_check check (kind in ('avatar', 'frame', 'board', 'bubble', 'title', 'dice'));

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
  ('avatar', 'waiter',    1, null,           0),
  ('avatar', 'waitress',  1, null,           1),
  ('avatar', 'student',   1, null,           2),
  ('avatar', 'foodie',    1, null,           3),
  ('avatar', 'italian',   5, null,           4),
  ('avatar', 'doner',    10, null,           5),
  ('avatar', 'noodle',   15, null,           6),
  ('avatar', 'baker',    25, null,           7),
  ('avatar', 'grandma',   1, 'first_bite',   8),
  ('avatar', 'critic',    1, 'regular',      9),
  ('avatar', 'barista',   1, 'quester',     10),
  ('avatar', 'sommelier', 1, 'marathon',    11),
  ('frame',  'none',      1, null,           0),
  ('frame',  'bronze',    5, null,           1),
  ('frame',  'silver',   15, null,           2),
  ('frame',  'gold',     30, null,           3),
  ('frame',  'diamond',  50, null,           4),
  ('frame',  'neon',      1, 'negotiator',   5),
  ('frame',  'flame',     1, 'gourmet',      6),
  ('frame',  'royal',     1, 'tycoon',       7),
  ('frame',  'ember',     1, 'line_cook',    8),
  ('frame',  'crown',     1, 'executive_chef', 9),
  ('frame',  'ivy',       1, 'renovator',   10),
  ('frame',  'duo',       1, 'team_player', 11),
  ('frame',  'star',      1, 'deal_maker',  12),
  ('board',  'felt',      1, null,           0),
  ('board',  'hearts',    1, null,           1),
  ('board',  'wood',      3, null,           2),
  ('board',  'feast',     6, null,           3),
  ('board',  'terracotta',10, null,          4),
  ('board',  'marble',   15, null,           5),
  ('board',  'sunset',   20, null,           6),
  ('board',  'night',    25, null,           7),
  ('board',  'chalk',    30, null,           8),
  ('board',  'neon',     35, null,           9),
  ('board',  'ocean',     1, 'iron_stomach', 10),
  ('board',  'bistro',    1, 'realtor',     11),
  ('board',  'gold',      1, 'big_spender', 12),
  ('board',  'lavender',  1, 'devoted',     13),
  ('bubble', 'plain',     1, null,           0),
  ('bubble', 'receipt',   4, null,           1),
  ('bubble', 'comic',     8, null,           2),
  ('bubble', 'neon',     25, null,           3),
  ('bubble', 'heart',     1, 'first_bite',   4),
  ('bubble', 'gold',      1, 'regular',      5),
  ('bubble', 'suits',     1, 'card_shark',   6),
  ('bubble', 'zen',       1, 'survivor',     7),
  ('bubble', 'zoom',      1, 'speed_eater',  8),
  ('bubble', 'mint',      1, 'social',       9),
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
  ('title',  'head_chef', 1, 'head_chef',   10),
  ('title',  'line_cook', 1, 'line_cook',   11),
  ('title',  'executive_chef', 1, 'executive_chef', 12),
  ('title',  'realtor',   1, 'realtor',     13),
  ('title',  'renovator', 1, 'renovator',   14),
  ('title',  'card_shark',1, 'card_shark',  15),
  ('title',  'big_spender',1,'big_spender', 16),
  ('title',  'survivor',  1, 'survivor',    17),
  ('title',  'team_player',1,'team_player', 18),
  ('title',  'speed_eater',1,'speed_eater', 19),
  ('title',  'deal_maker',1, 'deal_maker',  20),
  ('title',  'marathon',  1, 'marathon',    21),
  ('title',  'social',    1, 'social',      22),
  ('title',  'quester',   1, 'quester',     23),
  ('title',  'devoted',   1, 'devoted',     24),
  ('title',  'full_house',1, 'full_house',  25),
  ('title',  'lap_legend',1, 'lap_legend',  26),
  ('title',  'deep_pockets',1,'deep_pockets',27),
  ('dice',   'classic',   1, null,           0),
  ('dice',   'redwhite',  3, null,           1),
  ('dice',   'bone',      8, null,           2),
  ('dice',   'gingham',  12, null,           3),
  ('dice',   'neon',     18, null,           4),
  ('dice',   'marble',   24, null,           5),
  ('dice',   'gold',     32, null,           6),
  ('dice',   'chelsea',  40, null,           7)
on conflict (kind, key) do update set req_level = excluded.req_level, req_ach = excluded.req_ach, sort = excluded.sort;

-- ---------------------------------------------------------------------
-- Row Level Security: read-only for clients, writes only via functions
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.achievements   enable row level security;
alter table public.game_results   enable row level security;
alter table public.cosmetics      enable row level security;
alter table public.login_attempts enable row level security;
alter table public.quest_claims   enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends        enable row level security;
alter table public.invites        enable row level security;
-- quest_claims, friend_requests, friends, invites: no policies → only reachable through the functions below

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
revoke all on public.login_attempts, public.quest_claims, public.friend_requests, public.friends, public.invites from anon, authenticated;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
-- Level curve: level L needs 6.5 × (L−1)² XP (level 10 ≈ 530 XP, level 50 ≈ 15 600 XP)
create or replace function public.level_of(p_xp integer)
returns integer language sql immutable as $$
  select least(99, floor(sqrt(greatest(p_xp, 0) / 6.5))::int + 1);
$$;

-- Word filter for usernames (same lists as public/js/filter.js; keep them in sync).
-- roots: anywhere in the name (letters may repeat), words: only as a whole part of the name.
create or replace function public.name_blocked(p text)
returns boolean language sql immutable set search_path = '' as $$
  with n as (select translate(lower(coalesce(p, '')), '0134578', 'oieastb') as s),
  pat as (select r, (select string_agg(ch || '+', '') from regexp_split_to_table(r, '') ch) as rx from unnest(array['nigger', 'nigga', 'niggr', 'faggot', 'fagot', 'hitler', 'retard', 'whore', 'slut', 'cunt', 'bitch', 'pussy', 'penis', 'vagina', 'porn', 'fuck', 'shit', 'asshole', 'motherf', 'pedophil', 'pedofil', 'terrorist', 'dildo', 'blowjob', 'handjob', 'cumshot', 'boob', 'tits', 'horny', 'milf', 'nude', 'orospu', 'oruspu', 'orosbu', 'siktir', 'sikis', 'sikim', 'sikik', 'siker', 'sikeyim', 'sikey', 'amcik', 'aminak', 'aminakoy', 'gotunu', 'gotune', 'gotlek', 'yarrak', 'yarak', 'dalyar', 'gotveren', 'gotver', 'ibne', 'pezevenk', 'pezeveng', 'kahpe', 'kaltak', 'serefsiz', 'gavat', 'pust', 'tasak', 'tassak', 'surtuk', 'fahise', 'tecavuz', 'pornocu', 'yavsak', 'kevase', 'godos', 'dallama', 'hassiktir']) r),
  wpat as (select w, (select string_agg(ch || '+', '') from regexp_split_to_table(w, '') ch) as rx from unnest(array['sik', 'amk', 'aq', 'mk', 'oc', 'sex', 'seks', 'fag', 'dick', 'cock', 'rape', 'kkk', 'isis', 'nazi', 'bok']) w)
  select exists (select 1 from pat, n where regexp_replace(n.s, '[^a-z]', '', 'g') ~ pat.rx)
      or exists (select 1 from wpat, n where regexp_replace(n.s, '[^a-z]', ' ', 'g') ~ ('(^|[^a-z])' || wpat.rx || '([^a-z]|$)'));
$$;

-- New auth user → profile row (username comes from sign-up metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.name_blocked(new.raw_user_meta_data ->> 'username') then raise exception 'username_blocked'; end if;
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
     and not public.name_blocked(p_username)
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
  perform public.metric_rollup();
  delete from public.metric_events where day < (now() at time zone 'utc')::date - 14;
  delete from public.metric_devices where last_day < (now() at time zone 'utc')::date - 90;
  delete from public.chat_reports where created_at < now() - interval '180 days';
  return null;
end $$;

-- Award achievements whose conditions are now met; returns the new keys.
create or replace function public.check_achievements(p_user uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles%rowtype; lv int; new_keys text[] := '{}'; k text; qn int; fn int;
  st jsonb;
begin
  select * into p from public.profiles where id = p_user;
  if not found then return new_keys; end if;
  lv := public.level_of(p.xp); st := p.stats;
  select count(*) into qn from public.quest_claims where user_id = p_user;
  select count(*) into fn from public.friends where user_id = p_user;
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
    case when coalesce((p.stats ->> 'iron')::int, 0)   >= 1  then 'iron_stomach' end,
    -- v1.2
    case when lv >= 25 then 'line_cook' end,
    case when lv >= 75 then 'executive_chef' end,
    case when coalesce((st ->> 'bought')::int, 0)     >= 25  then 'realtor' end,
    case when coalesce((st ->> 'upgrades')::int, 0)   >= 15  then 'renovator' end,
    case when coalesce((st ->> 'cards')::int, 0)      >= 50  then 'card_shark' end,
    case when coalesce((st ->> 'paid')::int, 0)       >= 30  then 'big_spender' end,
    case when coalesce((st ->> 'best_days')::int, 0)  >= 20  then 'survivor' end,
    case when coalesce((st ->> 'team_wins')::int, 0)  >= 5   then 'team_player' end,
    case when coalesce((st ->> 'quick_wins')::int, 0) >= 5   then 'speed_eater' end,
    case when coalesce((st ->> 'deals')::int, 0)      >= 50  then 'deal_maker' end,
    case when p.games >= 200 then 'marathon' end,
    case when fn >= 5  then 'social' end,
    case when qn >= 10 then 'quester' end,
    case when qn >= 30 then 'devoted' end,
    -- v1.9: single-game feats, counted only in ranked games (public quick-play tables, 3+ people, no bots)
    case when coalesce((st ->> 'full4')::int, 0)  >= 1 then 'full_house' end,
    case when coalesce((st ->> 'laps10')::int, 0) >= 1 then 'lap_legend' end,
    case when coalesce((st ->> 'rich')::int, 0)   >= 1 then 'deep_pockets' end
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
    stats = stats || jsonb_build_object(
      'deals',    coalesce((stats ->> 'deals')::int, 0)    + coalesce((r.stats ->> 'deals')::int, 0),
      'belt',     coalesce((stats ->> 'belt')::int, 0)     + coalesce((r.stats ->> 'belt')::int, 0),
      'tycoon',   coalesce((stats ->> 'tycoon')::int, 0)   + coalesce((r.stats ->> 'tycoon')::int, 0),
      'iron',     coalesce((stats ->> 'iron')::int, 0)     + coalesce((r.stats ->> 'iron')::int, 0),
      'bought',   coalesce((stats ->> 'bought')::int, 0)   + coalesce((r.stats ->> 'bought')::int, 0),
      'upgrades', coalesce((stats ->> 'upgrades')::int, 0) + coalesce((r.stats ->> 'upgrades')::int, 0),
      'cards',    coalesce((stats ->> 'cards')::int, 0)    + coalesce((r.stats ->> 'cards')::int, 0),
      'paid',     coalesce((stats ->> 'paid')::int, 0)     + coalesce((r.stats ->> 'paid')::int, 0),
      'best_days', greatest(coalesce((stats ->> 'best_days')::int, 0), coalesce((r.stats ->> 'survived')::int, 0)),
      'team_wins',  coalesce((stats ->> 'team_wins')::int, 0)  + case when r.won and coalesce((r.stats ->> 'teams')::int, 0) = 1 then 1 else 0 end,
      'quick_wins', coalesce((stats ->> 'quick_wins')::int, 0) + case when r.won and coalesce((r.stats ->> 'quick')::int, 0) = 1 then 1 else 0 end,
      'full4',  coalesce((stats ->> 'full4')::int, 0)  + coalesce((r.stats ->> 'full4')::int, 0),
      'laps10', coalesce((stats ->> 'laps10')::int, 0) + coalesce((r.stats ->> 'laps10')::int, 0),
      'rich',   coalesce((stats ->> 'rich')::int, 0)   + coalesce((r.stats ->> 'rich')::int, 0))
  where id = p_user;
  update public.game_results set verified = true, xp = xp_full where game_id = p_game and user_id = p_user;
  perform public.check_achievements(p_user);
end $$;

-- ---------------------------------------------------------------------
-- submit_result: called by each signed-in player at the end of a game
-- p = {game_id, mode:'online'|'solo', pid, order:[seat ids, winners first],
--      winners:[seat ids] (optional; 2 in team games), won, days, duration,
--      stats:{deals, belt, tycoon, iron, bonus, bought, upgrades, cards, paid, survived, laps, top_money, top_venues},
--      ranked}
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
  v_ranked boolean := false;
  v_winners jsonb := p -> 'winners'; v_nw int; v_eff int; v_q text; v_met boolean; v_qdone text := null; v_s jsonb := coalesce(p -> 'stats', '{}'::jsonb);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform public.guard_not_banned();
  if v_gid is null or v_gid !~ '^[A-Za-z0-9_-]{6,40}$' then raise exception 'bad_game_id'; end if;
  if v_mode is null or v_mode not in ('online', 'solo', 'quick') then raise exception 'bad_mode'; end if;
  if v_pid is null or v_pid !~ '^[A-Za-z0-9_-]{1,20}$' then raise exception 'bad_pid'; end if;
  if v_order is null or jsonb_typeof(v_order) <> 'array' then raise exception 'bad_order'; end if;
  v_players := jsonb_array_length(v_order);
  if v_players not between 2 and 6 then raise exception 'bad_order'; end if;
  if (select count(distinct x) from jsonb_array_elements_text(v_order) x) <> v_players then raise exception 'bad_order'; end if;
  select i::int into v_place from jsonb_array_elements_text(v_order) with ordinality as e(x, i) where x = v_pid;
  if v_place is null then raise exception 'bad_pid'; end if;
  -- winners must be the first seats of the order (1, or 2 teammates)
  if v_winners is null or jsonb_typeof(v_winners) <> 'array' or jsonb_array_length(v_winners) = 0 then v_winners := jsonb_build_array(v_order -> 0); end if;
  v_nw := jsonb_array_length(v_winners);
  if v_nw > 2 or v_nw * 2 > v_players then raise exception 'bad_winners'; end if;
  for i in 0 .. v_nw - 1 loop
    if v_winners ->> i is distinct from v_order ->> i then raise exception 'bad_winners'; end if;
  end loop;
  v_won := v_won and v_winners ? v_pid;
  v_eff := case when v_won then 1 else v_place end;
  -- ranked: public quick-play table with 3+ people (bot games come in as 'solo'); every player of the game must report it
  -- (it's part of the digest), so one changed client can't turn a private room into a ranked game
  v_ranked := v_mode in ('online', 'quick') and v_players >= 3 and coalesce((p ->> 'ranked')::boolean, false);
  v_digest := md5(v_gid || '|' || v_order::text || '|' || v_winners::text || '|' || v_days || case when v_ranked then '|ranked' else '' end);

  perform pg_advisory_xact_lock(hashtext(v_gid));
  select xp into v_before from public.profiles where id = v_uid;
  if not found then raise exception 'no_profile'; end if;

  -- per-game stats, clamped to sane ranges
  v_stats := jsonb_build_object(
    'deals',  least(greatest(coalesce((p -> 'stats' ->> 'deals')::int, 0), 0), 6),
    'belt',   least(greatest(coalesce((p -> 'stats' ->> 'belt')::int, 0), 0), 6),
    'tycoon', case when v_ranked and coalesce((p -> 'stats' ->> 'tycoon')::boolean, false) then 1 else 0 end,
    'full4',  case when v_ranked and coalesce((p -> 'stats' ->> 'top_venues')::int, 0) >= 4 then 1 else 0 end,
    'laps10', case when v_ranked and coalesce((p -> 'stats' ->> 'laps')::int, 0) >= 10 then 1 else 0 end,
    'rich',   case when v_ranked and coalesce((p -> 'stats' ->> 'top_money')::int, 0) >= 1000 then 1 else 0 end,
    'iron',   case when coalesce((p -> 'stats' ->> 'iron')::boolean, false) then 1 else 0 end,
    'bought',   least(greatest(coalesce((p -> 'stats' ->> 'bought')::int, 0), 0), 4),
    'upgrades', least(greatest(coalesce((p -> 'stats' ->> 'upgrades')::int, 0), 0), 8),
    'cards',    least(greatest(coalesce((p -> 'stats' ->> 'cards')::int, 0), 0), 15),
    'paid',     least(greatest(coalesce((p -> 'stats' ->> 'paid')::int, 0), 0), least(v_days, 40)),
    'survived', least(greatest(coalesce((p -> 'stats' ->> 'survived')::int, 0), 0), v_days),
    'teams', case when p ->> 'gmode' = 'teams' then 1 else 0 end,
    'quick', case when p ->> 'gmode' = 'quick' then 1 else 0 end);

  -- anti-abuse: short games and result flooding don't count
  -- (max 12 counted results per hour, and at least 4 minutes between two counted results)
  select count(*) into v_recent from public.game_results
   where user_id = v_uid and counted and created_at > now() - interval '1 hour';
  v_counted := v_days >= 3 and v_dur >= 240 and v_recent < 12
    and not exists (select 1 from public.game_results
                     where user_id = v_uid and counted and created_at > now() - interval '4 minutes');

  v_full := case when v_counted then least(150,
              20 + (v_players - v_eff) * 10 + case when v_won then 50 else 0 end
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

  if v_mode = 'quick' then
    -- v1.12: Quick play table where bots filled the empty seats and this was the only person: full XP, wins,
    -- stats and achievements right away (nobody else can confirm the result); counts for the season leaderboard too
    update public.profiles set games = games + 1 where id = v_uid;
    perform public.apply_verified(v_gid, v_uid);
    v_verified := true;
  elsif v_mode = 'solo' then
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
  -- daily quest: +30 XP once per UTC day when this game meets today's goal
  v_q := public.daily_quest();
  v_met := case v_q
       when 'play_online' then v_mode in ('online', 'quick')
       when 'win_any'     then v_won
       when 'deal'        then coalesce((v_s ->> 'deals')::int, 0) >= 1
       when 'buy2'        then coalesce((v_s ->> 'bought')::int, 0) >= 2
       when 'upgrade'     then coalesce((v_s ->> 'upgrades')::int, 0) >= 1
       when 'cards3'      then coalesce((v_s ->> 'cards')::int, 0) >= 3
       when 'survive10'   then coalesce((v_s ->> 'survived')::int, 0) >= 10
       when 'payer'       then coalesce((v_s ->> 'paid')::int, 0) >= 1
       else false end;
  if v_met and not exists (select 1 from public.quest_claims where user_id = v_uid and day = (now() at time zone 'utc')::date) then
    insert into public.quest_claims (user_id, day, quest) values (v_uid, (now() at time zone 'utc')::date, v_q);
    update public.profiles set xp = xp + 30 where id = v_uid;
    perform public.check_achievements(v_uid);
    v_qdone := v_q;
  end if;

  -- achievements unlocked by this call (now() is the transaction start time)
  select coalesce(array_agg(key), '{}') into v_new from public.achievements
   where user_id = v_uid and unlocked_at = now();

  select xp into v_after from public.profiles where id = v_uid;
  return jsonb_build_object('counted', true, 'verified', v_verified, 'xp_gained', v_after - v_before, 'quest', v_qdone,
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
  foreach k in array array['avatar', 'frame', 'board', 'bubble', 'title', 'dice'] loop
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
  update public.profiles set equipped = v_out where id = v_uid;
  return v_out;
end $$;

-- ---------------------------------------------------------------------
-- Daily quest: the same quest for everyone, changes at 00:00 UTC
-- ---------------------------------------------------------------------
create or replace function public.daily_quest(p_day date default null)
returns text language sql stable set search_path = '' as $$
  select (array['play_online', 'win_any', 'deal', 'buy2', 'upgrade', 'cards3', 'survive10', 'payer'])
         [1 + ((coalesce(p_day, (now() at time zone 'utc')::date) - date '2026-01-01') % 8)];
$$;

create or replace function public.my_daily()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'quest', public.daily_quest(),
    'done', exists (select 1 from public.quest_claims where user_id = auth.uid() and day = (now() at time zone 'utc')::date),
    'total', (select count(*) from public.quest_claims where user_id = auth.uid()),
    'resets_in', extract(epoch from (date_trunc('day', now() at time zone 'utc') + interval '1 day') - (now() at time zone 'utc'))::int);
$$;

-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- Seasons: one calendar month (UTC) each; season 1 = September 2026.
-- The top 3 of a season (most verified online wins, then season XP) get a medal.
-- ---------------------------------------------------------------------
create table if not exists public.season_medals (
  season     integer not null,
  place      integer not null check (place between 1 and 3),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  wins       integer not null default 0,
  xp         integer not null default 0,
  awarded_at timestamptz not null default now(),
  primary key (season, place)
);
create index if not exists season_medals_user_idx on public.season_medals (user_id);
alter table public.season_medals enable row level security;
drop policy if exists season_medals_read on public.season_medals;
create policy season_medals_read on public.season_medals for select using (true);
grant select on public.season_medals to anon, authenticated;
revoke insert, update, delete on public.season_medals from anon, authenticated;

create or replace function public.season_of(p_t timestamptz)
returns integer language sql immutable set search_path = '' as $$
  select (extract(year from p_t at time zone 'utc')::int - 2026) * 12 + extract(month from p_t at time zone 'utc')::int - 8;
$$;
create or replace function public.season_start(p_season integer)
returns timestamptz language sql immutable set search_path = '' as $$
  select make_timestamptz(2026, 9, 1, 0, 0, 0, 'UTC') + make_interval(months => p_season - 1);
$$;

-- season standings (wins, XP from games + quests) for one season
create or replace function public.season_table(p_season integer)
returns table (user_id uuid, swins int, sxp int) language sql stable security definer set search_path = '' as $$
  with w as (
    select r.user_id, sum(r.xp)::int as gxp,
           (count(*) filter (where r.won and r.verified and r.mode in ('online', 'quick')))::int as ww
      from public.game_results r
     where r.created_at >= public.season_start(p_season) and r.created_at < public.season_start(p_season + 1)
     group by r.user_id
  ), q as (
    select c.user_id, count(*)::int * 30 as qxp from public.quest_claims c
     where c.day >= (public.season_start(p_season) at time zone 'utc')::date and c.day < (public.season_start(p_season + 1) at time zone 'utc')::date
     group by c.user_id
  )
  select coalesce(w.user_id, q.user_id), coalesce(w.ww, 0), coalesce(w.gxp, 0) + coalesce(q.qxp, 0)
    from w full join q on q.user_id = w.user_id;
$$;

-- hand out medals for every finished season that doesn't have them yet (idempotent; called lazily)
create or replace function public.close_seasons()
returns void language plpgsql security definer set search_path = '' as $$
declare s int; v_now int := public.season_of(now());
begin
  for s in 1 .. v_now - 1 loop
    if exists (select 1 from public.season_medals m where m.season = s) then continue; end if;
    insert into public.season_medals (season, place, user_id, wins, xp)
    select s, x.pos, x.user_id, x.swins, x.sxp from (
      select t.user_id, t.swins, t.sxp, row_number() over (order by t.swins desc, t.sxp desc, p.username) as pos
        from public.season_table(s) t join public.profiles p on p.id = t.user_id
       where t.swins > 0
    ) x where x.pos <= 3
    on conflict do nothing;
  end loop;
end $$;

-- Leaderboards: 'season' = this month's wins (then season XP), 'level' = all-time XP ('weekly' = old name of 'season')
drop function if exists public.leaderboard(text, int);
create or replace function public.leaderboard(p_kind text, p_limit int default 50)
returns table (pos bigint, username text, level int, xp int, week_xp int, week_wins int, wins int, games int, equipped jsonb, me boolean, season int)
language plpgsql volatile security definer set search_path = '' as $$
declare v_season int := public.season_of(now()); v_s boolean := p_kind in ('season', 'weekly');
begin
  perform public.close_seasons();
  return query
  with t as (
    select p.id, p.username, p.xp, p.wins, p.games, p.equipped, coalesce(st.sxp, 0) as sx, coalesce(st.swins, 0) as sw
      from public.profiles p left join public.season_table(v_season) st on st.user_id = p.id
  ), ranked as (
    select row_number() over (order by case when v_s then t.sw else 0 end desc,
                                       case when v_s then t.sx else t.xp end desc, t.xp desc, t.username) as rpos, t.*
      from t where not v_s or t.sx > 0 or t.sw > 0
  )
  select r.rpos, r.username, public.level_of(r.xp), r.xp, r.sx, r.sw, r.wins, r.games, r.equipped, r.id = auth.uid(), v_season
    from ranked r
   where r.rpos <= least(greatest(coalesce(p_limit, 50), 1), 100) or r.id = auth.uid()
   order by r.rpos;
end $$;

-- my place in a finished season (for the "Season N is over, you finished 2nd!" message)
create or replace function public.my_season(p_season integer)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(x) from (
    select r.pos, r.swins as wins, r.total as players, p_season as season from (
      select t.user_id, t.swins, count(*) over () as total,
             row_number() over (order by t.swins desc, t.sxp desc, p.username) as pos
        from public.season_table(p_season) t join public.profiles p on p.id = t.user_id
       where t.swins > 0 or t.sxp > 0
    ) r where r.user_id = auth.uid()
  ) x;
$$;

-- recent online games I played together with friends (newest first)
create or replace function public.friend_matches(p_limit integer default 10)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(g order by g.at desc), '[]'::jsonb) from (
    select m.game_id, m.created_at as at, m.players, m.place, m.won,
           (select jsonb_agg(jsonb_build_object('username', p.username, 'place', o.place, 'won', o.won) order by o.place)
              from public.game_results o join public.profiles p on p.id = o.user_id
             where o.game_id = m.game_id and o.user_id in (select f.friend_id from public.friends f where f.user_id = auth.uid())) as friends
      from public.game_results m
     where m.user_id = auth.uid() and m.mode = 'online'
       and exists (select 1 from public.game_results o join public.friends f on f.friend_id = o.user_id and f.user_id = auth.uid() where o.game_id = m.game_id)
     order by m.created_at desc
     limit least(greatest(coalesce(p_limit, 10), 1), 30)
  ) g;
$$;

-- Daily upkeep (called by the Worker's cron): hand out season medals, drop old detail rows.
-- Profiles keep their totals (level, wins, games, stats) and achievements; only per-game rows older than 180 days go.
create or replace function public.daily_upkeep()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  perform public.close_seasons();
  delete from public.game_results where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  delete from public.login_attempts where at < now() - interval '1 day';
  return jsonb_build_object('ok', true, 'results_removed', n);
end $$;

create index if not exists game_results_created on public.game_results (created_at);

-- Change username: at most once every 7 days; same rules as sign-up (format, word filter, unique).
alter table public.profiles add column if not exists name_changed_at timestamptz;
create or replace function public.change_username(p_new text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_last timestamptz; v_old text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  p_new := trim(coalesce(p_new, ''));
  if p_new !~ '^[A-Za-z0-9_]{3,14}$' then raise exception 'username_invalid'; end if;
  if public.name_blocked(p_new) then raise exception 'username_blocked'; end if;
  select name_changed_at, username into v_last, v_old from public.profiles where id = v_uid for update;
  if v_old = p_new then return jsonb_build_object('username', v_old, 'next', v_last + interval '7 days'); end if;
  if v_last is not null and v_last > now() - interval '7 days' then
    raise exception 'username_wait %', to_char(v_last + interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;
  if lower(v_old) <> lower(p_new) and exists (select 1 from public.profiles where lower(username) = lower(p_new)) then raise exception 'username_taken'; end if;
  update public.profiles set username = p_new, name_changed_at = now() where id = v_uid;
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', p_new) where id = v_uid;
  return jsonb_build_object('username', p_new, 'next', now() + interval '7 days');
end $$;

-- ---------------------------------------------------------------------
-- Public profile card (what friends and other players can see)
-- ---------------------------------------------------------------------
create or replace function public.public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles%rowtype; v_me uuid := auth.uid();
begin
  select * into p from public.profiles where lower(username) = lower(p_username);
  if not found then return null; end if;
  return jsonb_build_object(
    'username', p.username, 'level', public.level_of(p.xp), 'xp', p.xp, 'wins', p.wins, 'games', p.games,
    'bot_games', p.bot_games, 'stats', p.stats, 'equipped', p.equipped, 'created_at', p.created_at,
    'online', coalesce(p.last_seen > now() - interval '2 minutes', false),
    'achievements', coalesce((select jsonb_agg(a.key order by a.unlocked_at) from public.achievements a where a.user_id = p.id), '[]'::jsonb),
    'medals', coalesce((select jsonb_agg(jsonb_build_object('season', m.season, 'place', m.place) order by m.season desc) from public.season_medals m where m.user_id = p.id), '[]'::jsonb),
    'me', p.id = v_me, 'admin', public.is_admin(p.id),
    'friend', exists (select 1 from public.friends f where f.user_id = v_me and f.friend_id = p.id),
    'requested', exists (select 1 from public.friend_requests r where r.from_id = v_me and r.to_id = p.id),
    'incoming', exists (select 1 from public.friend_requests r where r.from_id = p.id and r.to_id = v_me));
end $$;

-- ---------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------
-- send a request (or accept theirs if they already asked). Returns 'requested' | 'friends'
create or replace function public.friend_add(p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_to uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  perform public.guard_not_banned();
  select id into v_to from public.profiles where lower(username) = lower(p_username);
  if v_to is null then raise exception 'no_such_user'; end if;
  if v_to = v_me then raise exception 'self'; end if;
  if exists (select 1 from public.friends where user_id = v_me and friend_id = v_to) then return 'friends'; end if;
  if (select count(*) from public.friends where user_id = v_me) >= 200 then raise exception 'too_many_friends'; end if;
  if exists (select 1 from public.friend_requests where from_id = v_to and to_id = v_me) then
    delete from public.friend_requests where (from_id = v_to and to_id = v_me) or (from_id = v_me and to_id = v_to);
    insert into public.friends (user_id, friend_id) values (v_me, v_to), (v_to, v_me) on conflict do nothing;
    perform public.check_achievements(v_me); perform public.check_achievements(v_to);
    return 'friends';
  end if;
  if (select count(*) from public.friend_requests where from_id = v_me and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too_many_attempts';
  end if;
  insert into public.friend_requests (from_id, to_id) values (v_me, v_to) on conflict do nothing;
  return 'requested';
end $$;

create or replace function public.friend_respond(p_username text, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_from uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select id into v_from from public.profiles where lower(username) = lower(p_username);
  if v_from is null then return; end if;
  delete from public.friend_requests where from_id = v_from and to_id = v_me;
  if found and p_accept then
    insert into public.friends (user_id, friend_id) values (v_me, v_from), (v_from, v_me) on conflict do nothing;
    perform public.check_achievements(v_me); perform public.check_achievements(v_from);
  end if;
end $$;

-- remove a friend, or cancel a request I sent
create or replace function public.friend_remove(p_username text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_o uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select id into v_o from public.profiles where lower(username) = lower(p_username);
  if v_o is null then return; end if;
  delete from public.friends where (user_id = v_me and friend_id = v_o) or (user_id = v_o and friend_id = v_me);
  delete from public.friend_requests where from_id = v_me and to_id = v_o;
end $$;

-- friends, requests and fresh game invites in one call; also marks me as online
create or replace function public.social()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  update public.profiles set last_seen = now() where id = v_me;
  delete from public.invites where created_at < now() - interval '10 minutes';
  return jsonb_build_object(
    'friends', coalesce((select jsonb_agg(jsonb_build_object('username', p.username, 'level', public.level_of(p.xp), 'equipped', jsonb_build_object('avatar', p.equipped -> 'avatar', 'frame', p.equipped -> 'frame'),
                  'online', coalesce(p.last_seen > now() - interval '2 minutes', false)) order by coalesce(p.last_seen > now() - interval '2 minutes', false) desc, lower(p.username))
                from public.friends f join public.profiles p on p.id = f.friend_id where f.user_id = v_me), '[]'::jsonb),
    'incoming', coalesce((select jsonb_agg(p.username order by r.created_at) from public.friend_requests r join public.profiles p on p.id = r.from_id where r.to_id = v_me), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(p.username order by r.created_at) from public.friend_requests r join public.profiles p on p.id = r.to_id where r.from_id = v_me), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'from', p.username, 'room', i.room, 'equipped', jsonb_build_object('avatar', p.equipped -> 'avatar', 'frame', p.equipped -> 'frame')) order by i.created_at desc)
                from public.invites i join public.profiles p on p.id = i.from_id where i.to_id = v_me), '[]'::jsonb));
end $$;

-- invite a friend to my room (no code typing needed on their side)
create or replace function public.invite_friend(p_username text, p_room text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_to uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  if p_room !~ '^[A-Z0-9]{5}$' then raise exception 'bad_room'; end if;
  select f.friend_id into v_to from public.friends f join public.profiles p on p.id = f.friend_id
   where f.user_id = v_me and lower(p.username) = lower(p_username);
  if v_to is null then raise exception 'not_friends'; end if;
  if (select count(*) from public.invites where from_id = v_me and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'too_many_attempts';
  end if;
  delete from public.invites where from_id = v_me and to_id = v_to;
  insert into public.invites (from_id, to_id, room) values (v_me, v_to, p_room);
end $$;

create or replace function public.invite_dismiss(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  delete from public.invites where id = p_id and to_id = auth.uid();
$$;

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

-- =====================================================================
-- v1.10: anonymous game metrics, chat reports and sanctions, admin tools
-- =====================================================================

-- v1.12: results of Quick play games where bots filled the table ('quick')
alter table public.game_results drop constraint if exists game_results_mode_check;
alter table public.game_results add constraint game_results_mode_check check (mode in ('online', 'solo', 'quick'));

-- Admins: add yourself once in the SQL editor:
--   insert into public.admins (user_id) select id from public.profiles where username = 'YOUR_NAME';
create table if not exists public.admins (user_id uuid primary key references public.profiles (id) on delete cascade);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (select 1 from public.admins where user_id = p_user) $$;

-- Settings only the database functions read (the chat-signing secret; written by the GitHub Action)
create table if not exists public.app_settings (key text primary key, value text not null);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

-- ---- metrics: a random device id (no personal data), per day ----
create table if not exists public.metric_events (
  id         bigint generated always as identity primary key,
  day        date not null default (now() at time zone 'utc')::date,
  device     uuid not null,
  kind       text not null check (kind in ('visit', 'game_start', 'game_end')),
  mode       text check (mode in ('quick', 'room', 'solo', 'local')),
  created_at timestamptz not null default now()
);
create unique index if not exists metric_events_visit on public.metric_events (day, device) where kind = 'visit';
create index if not exists metric_events_day on public.metric_events (day, kind);
create index if not exists metric_events_device on public.metric_events (device, day);
alter table public.metric_events enable row level security;
revoke all on public.metric_events from anon, authenticated;

-- v1.11: small tables instead of keeping every raw event (raw events are kept 14 days)
create table if not exists public.metric_devices (
  device    uuid primary key,
  first_day date not null,
  last_day  date not null,
  back1     boolean not null default false,
  back7     boolean not null default false
);
create index if not exists metric_devices_first on public.metric_devices (first_day);
create index if not exists metric_devices_last on public.metric_devices (last_day);
alter table public.metric_devices enable row level security;
revoke all on public.metric_devices from anon, authenticated;
create table if not exists public.metric_daily (
  day date primary key, visitors int not null default 0, new_visitors int not null default 0, players int not null default 0,
  games_started int not null default 0, games_finished int not null default 0,
  quick int not null default 0, room int not null default 0, solo int not null default 0, local int not null default 0,
  d1 numeric, d7 numeric
);
alter table public.metric_daily enable row level security;
revoke all on public.metric_daily from anon, authenticated;

-- devices seen before v1.11 (safe to re-run)
insert into public.metric_devices (device, first_day, last_day, back1, back7)
  select e.device, min(e.day), max(e.day),
    bool_or(e.day = f.first_day + 1), bool_or(e.day = f.first_day + 7)
    from public.metric_events e join (select device, min(day) first_day from public.metric_events where kind = 'visit' group by device) f using (device)
   where e.kind = 'visit' group by e.device
  on conflict (device) do nothing;

-- one day's numbers: from the raw events (last 14 days) and the device table
create or replace function public.metric_day(p_day date)
returns public.metric_daily language sql stable security definer set search_path = '' as $$
  select p_day,
    (select count(*)::int from public.metric_events e where e.day = p_day and e.kind = 'visit'),
    (select count(*)::int from public.metric_devices d where d.first_day = p_day),
    (select count(distinct e.device)::int from public.metric_events e where e.day = p_day and e.kind = 'game_start'),
    (select count(*)::int from public.metric_events e where e.day = p_day and e.kind = 'game_start'),
    (select count(*)::int from public.metric_events e where e.day = p_day and e.kind = 'game_end'),
    (select count(*)::int from public.metric_events e where e.day = p_day and e.kind = 'game_start' and e.mode = 'quick'),
    (select count(*)::int from public.metric_events e where e.day = p_day and e.kind = 'game_start' and e.mode = 'room'),
    (select count(*)::int from public.metric_events e where e.day = p_day and e.kind = 'game_start' and e.mode = 'solo'),
    (select count(*)::int from public.metric_events e where e.day = p_day and e.kind = 'game_start' and e.mode = 'local'),
    (select case when count(*) = 0 or p_day + 1 > (now() at time zone 'utc')::date then null else round(100.0 * count(*) filter (where d.back1) / count(*), 1) end
       from public.metric_devices d where d.first_day = p_day),
    (select case when count(*) = 0 or p_day + 7 > (now() at time zone 'utc')::date then null else round(100.0 * count(*) filter (where d.back7) / count(*), 1) end
       from public.metric_devices d where d.first_day = p_day)
$$;
-- save finished days (called by daily_upkeep); D1 / D7 of the last 8 days are updated as they become known
create or replace function public.metric_rollup()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare d date;
begin
  for d in select generate_series((now() at time zone 'utc')::date - 8, (now() at time zone 'utc')::date - 1, interval '1 day')::date loop
    if exists (select 1 from public.metric_daily m where m.day = d) then
      update public.metric_daily m set d1 = x.d1, d7 = x.d7 from public.metric_day(d) x where m.day = d;
    elsif exists (select 1 from public.metric_events e where e.day = d) then
      insert into public.metric_daily select * from public.metric_day(d);
    end if;
  end loop;
end $$;

create or replace function public.log_event(p_device uuid, p_kind text, p_mode text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_day date := (now() at time zone 'utc')::date; v_n int;
begin
  if p_device is null or p_kind not in ('visit', 'game_start', 'game_end') then return; end if;
  if p_mode is not null and p_mode not in ('quick', 'room', 'solo', 'local') then p_mode := null; end if;
  if p_kind = 'visit' then
    insert into public.metric_events (day, device, kind) values (v_day, p_device, 'visit') on conflict do nothing;
    -- first / last day per device, and whether it came back 1 and 7 days after the first visit
    insert into public.metric_devices as d (device, first_day, last_day) values (p_device, v_day, v_day)
      on conflict (device) do update set last_day = v_day,
        back1 = d.back1 or v_day = d.first_day + 1, back7 = d.back7 or v_day = d.first_day + 7;
    return;
  end if;
  select count(*) into v_n from public.metric_events where day = v_day and device = p_device;
  if v_n >= 200 then return; end if;   -- flood guard
  insert into public.metric_events (day, device, kind, mode) values (v_day, p_device, p_kind, p_mode);
end $$;

-- Daily numbers for the admin screen: visitors, new visitors, games, and how many came back 1 and 7 days later
create or replace function public.admin_metrics(p_days int default 14)
returns table (day date, visitors int, new_visitors int, players int, games_started int, games_finished int,
               quick int, room int, solo int, local int, d1 numeric, d7 numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_today date := (now() at time zone 'utc')::date;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  -- today live; earlier days from the saved rows (or live while they are still in the last 14 days)
  return query
  select x.* from generate_series(v_today - (least(greatest(p_days, 1), 120) - 1), v_today, interval '1 day') g(dd)
    cross join lateral (
      select * from public.metric_daily m where m.day = g.dd::date and g.dd::date < v_today
      union all
      select * from public.metric_day(g.dd::date) where not exists (select 1 from public.metric_daily m where m.day = g.dd::date and g.dd::date < v_today)
    ) x
  order by 1 desc;
end $$;

-- ---- chat reports and sanctions ----
create table if not exists public.sanctions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('chat', 'account')),
  until      timestamptz,                -- null = permanent
  reason     text,
  auto       boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  lifted     boolean not null default false
);
create index if not exists sanctions_user on public.sanctions (user_id, kind);
alter table public.sanctions enable row level security;
revoke all on public.sanctions from anon, authenticated;

create table if not exists public.chat_reports (
  id          bigint generated always as identity primary key,
  reported    uuid not null references public.profiles (id) on delete cascade,
  reporter    uuid not null references public.profiles (id) on delete cascade,
  room        text not null,
  message     text not null,
  said_at     timestamptz not null,
  status      text not null default 'open' check (status in ('open', 'auto', 'actioned', 'dismissed')),
  note        text,
  created_at  timestamptz not null default now(),
  unique (reporter, reported, said_at)
);
create index if not exists chat_reports_status on public.chat_reports (status, created_at desc);
create index if not exists chat_reports_reported on public.chat_reports (reported, created_at desc);
alter table public.chat_reports enable row level security;
revoke all on public.chat_reports from anon, authenticated;

-- end of the active sanction of a kind: null = none, 'infinity' = permanent
create or replace function public.sanction_until(p_user uuid, p_kind text)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select case when bool_or(until is null) then 'infinity'::timestamptz else max(until) end
    from public.sanctions where user_id = p_user and kind = p_kind and not lifted and (until is null or until > now())
$$;
create or replace function public.account_banned(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$ select public.sanction_until(p_user, 'account') is not null $$;

-- what the signed-in player is blocked from (the game server asks this on connect)
create or replace function public.my_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('uid', auth.uid(),
    'chat_until', public.sanction_until(auth.uid(), 'chat'),
    'account_until', public.sanction_until(auth.uid(), 'account'),
    'admin', public.is_admin())
$$;

-- automatic ladder: chat 1 day → 7 days → 30 days → permanent (+ account 7 days) → account permanent
create or replace function public.auto_sanction(p_user uuid, p_reason text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare n int; v text;
begin
  if public.sanction_until(p_user, 'chat') is not null then return null; end if;   -- already serving one
  select count(*) into n from public.sanctions where user_id = p_user and not lifted;
  if n = 0 then insert into public.sanctions (user_id, kind, until, reason, auto) values (p_user, 'chat', now() + interval '1 day', p_reason, true); v := 'chat_1d';
  elsif n = 1 then insert into public.sanctions (user_id, kind, until, reason, auto) values (p_user, 'chat', now() + interval '7 days', p_reason, true); v := 'chat_7d';
  elsif n = 2 then insert into public.sanctions (user_id, kind, until, reason, auto) values (p_user, 'chat', now() + interval '30 days', p_reason, true); v := 'chat_30d';
  elsif n = 3 then
    insert into public.sanctions (user_id, kind, until, reason, auto) values (p_user, 'chat', null, p_reason, true), (p_user, 'account', now() + interval '7 days', p_reason, true); v := 'chat_perm_account_7d';
  else insert into public.sanctions (user_id, kind, until, reason, auto) values (p_user, 'account', null, p_reason, true); v := 'account_perm';
  end if;
  return v;
end $$;

-- Report a chat line. The game server signs every chat line it relays (room|sender|time|text) with a secret
-- only it and this database know, so a report can't be made up; unsigned lines can't be reported.
-- Automatic action: a line with a blocked word, or 3 different reporters within 24 hours.
create or replace function public.report_chat(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid(); v_to uuid; v_room text := p ->> 'room'; v_text text := p ->> 'text';
  v_ts bigint; v_sig text := p ->> 'sig'; v_key text; v_at timestamptz; v_id bigint; v_n int; v_act text := null;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  begin v_to := (p ->> 'uid')::uuid; v_ts := (p ->> 'ts')::bigint; exception when others then raise exception 'bad_report'; end;
  if v_to is null or v_ts is null or v_room is null or v_text is null or v_sig is null or length(v_text) > 400 or v_room !~ '^[A-Z0-9]{5}$' then raise exception 'bad_report'; end if;
  if v_to = v_me then raise exception 'bad_report'; end if;
  select value into v_key from public.app_settings where key = 'chat_secret';
  if v_key is null then raise exception 'reports_off'; end if;
  if encode(extensions.hmac(v_room || '|' || v_to::text || '|' || v_ts::text || '|' || v_text, v_key, 'sha256'), 'hex') <> v_sig then raise exception 'bad_signature'; end if;
  v_at := to_timestamp(v_ts / 1000.0);
  if v_at < now() - interval '24 hours' or v_at > now() + interval '5 minutes' then raise exception 'too_old'; end if;
  if (select count(*) from public.chat_reports where reporter = v_me and created_at > now() - interval '1 day') >= 30 then raise exception 'too_many'; end if;
  insert into public.chat_reports (reported, reporter, room, message, said_at) values (v_to, v_me, v_room, v_text, v_at)
    on conflict do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if public.name_blocked(v_text) then
    v_act := public.auto_sanction(v_to, 'blocked word');
  else
    select count(distinct reporter) into v_n from public.chat_reports where reported = v_to and status in ('open', 'auto') and created_at > now() - interval '24 hours';
    if v_n >= 3 then v_act := public.auto_sanction(v_to, 'reported by ' || v_n || ' players'); end if;
  end if;
  if v_act is not null then
    update public.chat_reports set status = 'auto', note = v_act where reported = v_to and status = 'open';
  end if;
  return jsonb_build_object('ok', true, 'action', v_act);
end $$;

-- ---- admin tools ----
create or replace function public.admin_reports(p_status text default 'open', p_limit int default 100)
returns table (id bigint, reported uuid, reported_name text, reporter_name text, room text, message text, said_at timestamptz,
               status text, note text, created_at timestamptz, reports_24h int, past_sanctions int, chat_until timestamptz, account_until timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select r.id, r.reported, a.username, b.username, r.room, r.message, r.said_at, r.status, r.note, r.created_at,
      (select count(*)::int from public.chat_reports x where x.reported = r.reported and x.created_at > now() - interval '24 hours'),
      (select count(*)::int from public.sanctions s where s.user_id = r.reported and not s.lifted),
      public.sanction_until(r.reported, 'chat'), public.sanction_until(r.reported, 'account')
    from public.chat_reports r join public.profiles a on a.id = r.reported join public.profiles b on b.id = r.reporter
   where p_status = 'all' or r.status = p_status
   order by r.created_at desc limit least(greatest(p_limit, 1), 500);
end $$;

create or replace function public.admin_sanctions()
returns table (id bigint, user_id uuid, username text, kind text, until timestamptz, reason text, auto boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select s.id, s.user_id, p.username, s.kind, s.until, s.reason, s.auto, s.created_at
    from public.sanctions s join public.profiles p on p.id = s.user_id
   where not s.lifted and (s.until is null or s.until > now()) order by s.created_at desc limit 300;
end $$;

-- p_days: 1, 7, 30 or null (permanent); p_user or p_username
create or replace function public.admin_sanction(p_username text, p_kind text, p_days int, p_report bigint default null, p_reason text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_to uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_kind not in ('chat', 'account') or (p_days is not null and p_days not between 1 and 3650) then raise exception 'bad_sanction'; end if;
  select id into v_to from public.profiles where lower(username) = lower(p_username);
  if v_to is null then raise exception 'no_such_user'; end if;
  insert into public.sanctions (user_id, kind, until, reason, created_by)
    values (v_to, p_kind, case when p_days is null then null else now() + make_interval(days => p_days) end, coalesce(p_reason, 'admin'), auth.uid());
  update public.chat_reports set status = 'actioned', note = p_kind || ' ' || coalesce(p_days::text || 'd', 'permanent')
   where reported = v_to and status in ('open', 'auto') and (p_report is null or id = p_report or status = 'open');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_lift(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.sanctions set lifted = true where id = p_id;
end $$;

create or replace function public.admin_dismiss(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.chat_reports set status = 'dismissed' where id = p_id;
end $$;

-- banned accounts can't save results or add friends
create or replace function public.guard_not_banned()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is not null and public.account_banned(auth.uid()) then raise exception 'account_banned'; end if;
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
revoke execute on function public.my_daily(), public.social(), public.friend_add(text), public.friend_respond(text, boolean),
  public.friend_remove(text), public.invite_friend(text, text), public.invite_dismiss(bigint) from public, anon;
grant execute on function public.my_daily(), public.social(), public.friend_add(text), public.friend_respond(text, boolean),
  public.friend_remove(text), public.invite_friend(text, text), public.invite_dismiss(bigint) to authenticated;
grant execute on function public.daily_quest(date), public.leaderboard(text, int), public.public_profile(text) to anon, authenticated;
grant execute on function public.close_seasons(), public.season_of(timestamptz), public.season_start(integer) to anon, authenticated;
revoke execute on function public.season_table(integer) from public, anon, authenticated;
revoke execute on function public.my_season(integer), public.friend_matches(integer) from public, anon;
grant execute on function public.my_season(integer), public.friend_matches(integer) to authenticated;
grant execute on function public.daily_upkeep() to anon, authenticated;
revoke execute on function public.change_username(text) from public, anon;
grant execute on function public.change_username(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
-- v1.10
revoke execute on function public.metric_day(date), public.metric_rollup() from public, anon, authenticated;
revoke execute on function public.is_admin(uuid), public.log_event(uuid, text, text), public.admin_metrics(int), public.sanction_until(uuid, text),
  public.account_banned(uuid), public.my_status(), public.auto_sanction(uuid, text), public.report_chat(jsonb), public.admin_reports(text, int),
  public.admin_sanctions(), public.admin_sanction(text, text, int, bigint, text), public.admin_lift(bigint), public.admin_dismiss(bigint),
  public.guard_not_banned() from public, anon, authenticated;
grant execute on function public.log_event(uuid, text, text) to anon, authenticated;
grant execute on function public.my_status(), public.report_chat(jsonb), public.admin_metrics(int), public.admin_reports(text, int),
  public.admin_sanctions(), public.admin_sanction(text, text, int, bigint, text), public.admin_lift(bigint), public.admin_dismiss(bigint) to authenticated;

-- ---------------------------------------------------------------------
-- Backfill: award achievements that are already earned (safe to re-run)
-- ---------------------------------------------------------------------
do $$ begin perform public.check_achievements(id) from public.profiles; end $$;
