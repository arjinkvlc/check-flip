<p align="center">
  <img src="public/assets/logo.svg" width="96" alt="Check Flip logo">
</p>

<h1 align="center">Check Flip</h1>

<p align="center">
  <b>Flip the check. Make them pay.</b><br>
  A free, install-free multiplayer browser board game for 2–6 players about dice, cards and who picks up the check.<br>
  Play with friends, join a quick game, or play solo against bots.
</p>

<p align="center">
  <a href="https://checkflipgame.com"><b>▶ Play at checkflipgame.com</b></a>
  &nbsp;·&nbsp; English / Türkçe
</p>

![Game screen](public/assets/screenshot-desktop.png)

## About the game

It looks like Monopoly, but the goal isn't to get rich. It's to **stay hungry and make others pay for dinner**. At the end of every day, the next player in line buys dinner for the whole table. The check grows with each player's hunger and multiplier. Whoever can't pay leaves the table, and the last one standing wins.

### Rules

- **Starting money** depends on the player count: 2 players $100, 3 players $150, 4+ players $200. The host can change it. Everyone starts with 0 hunger, and turn order is decided by a dice roll.
- **One day:** Everyone makes 2 moves. After rolling, you choose to move the sum of both dice or just one of them. Doubles roll again.
- Every day starts with **+1 hunger** for everyone (max 10).
- **Full lap:** +$40, +2 hunger, multiplier +1. **Halfway:** +$20, +1 hunger.
- **The check:** The next player in line pays `hunger × multiplier × $5` for everyone at the table, themselves included. Everyone who eats goes back to 0 hunger.
- **Restaurants** (🍕 Pizzeria, 🍣 Sushi Bar, 🍔 Burger Joint, 🌮 Taqueria):
  - Buy one for $40.
  - Landing on someone else's restaurant costs a visit fee ($5 / $8 / $12). You may then offer to buy it for more; if the owner accepts, it changes hands.
  - Landing on your own lets you cash the register (+$15) or upgrade it.
  - Dinner is served at one of the 4 restaurants **at random**. If it has an owner, they take a commission from the check: ★ 25%, ★★ 35%, ★★★ 50%.
- **Negotiation:** The payer gets one offer: "I'll give you $X, you pay the check."
- **Cards:**
  - Chance and Event decks.
  - Some cards are kept in hand (max 2): Free sample, Hunger pangs, Discount coupon, Pass the check, Going Dutch.
  - Tighten the Belt (squares 12 and 32) lets the payer skip their own meal and share.
- **Timer:** 30 seconds to decide, 45 seconds to pay. If time runs out or a player disconnects, the game plays for them.
- **Day limit (optional):** When time is up, the richest player (*money + restaurant value*) wins.
- **Accounts (optional):** Logged-in players earn XP and unlock achievements and cosmetics. **Bot games give half XP and don't count toward achievements** (except level achievements). Wins and other achievements come from online games once another player at the same table confirms the result. Games shorter than 3 days or 4 minutes don't count.

### Features

- **Game modes:**
  - Private room: join with a 5-character code or an invite link.
  - Quick game: random matchmaking. The table starts at 4 players, or when everyone is ready.
  - Single player: 2, 3 or 4-player tables against bots.
  - Same device: pass the phone around.
- **Accounts and progression (optional):**
  - Sign up with a username and password. The e-mail is optional and only used for password resets. Guests can still play everything.
  - XP and levels (1–99). Level 10 takes about 530 XP, level 50 about 15,600 XP.
  - 10 achievements, each unlocking a title and some a cosmetic (see below).
  - **Profile & looks** screen with tabs: Avatar, Frames, Boards, Chat bubbles, Titles, Achievements, Stats.
  - Avatar frames and titles are shown to everyone at the table; chat bubbles to everyone in the room; board styles only to you.
- **Two languages:** English by default, Turkish via the 🌐 button. In online games each player sees the game log in their own language.
- **Avatars:** Pick an avatar (cook, waiter, traveler, grandma…) in the pre-game screen. An avatar taken by one player can't be picked by another. Players without one get a colored letter token.
- **Bots:** They score target squares, time their hunger around the check order, buy and upgrade restaurants, and use cards and negotiation. In simulations they win about 90% of games against random players.
- **Connection resilience:** A dropped player rejoins with the same link. If the host drops, another player takes over the room.
- **Privacy:** A bilingual privacy notice (KVKK / GDPR), consent at sign-up and self-service account deletion.
- **Social:** Chat and emoji reactions.
- **Look and sound:** Dice and token animations, sound effects synthesized with WebAudio (no audio files).
- **Mobile:** On phones the game fits one screen. Large content (the check, offers) opens in a bottom sheet.

### Progression

**XP per counted game:** 20 for playing + 10 per player you finished ahead of + 50 for a win + up to 20 for days survived, capped at 150. Bot games give half.

| Achievement | Goal | Unlocks |
|---|---|---|
| 🍽️ First Bite | Win an online game | Title, *Sweetheart* chat bubble |
| 🪑 Regular | Win 10 online games | Title, *Golden* chat bubble |
| 🏆 Gourmet | Win 100 online games | Title, *Flame* frame |
| 🎖️ Veteran | Play 50 online games | Title |
| 🔪 Sous Chef | Reach level 10 | Title |
| 👑 Head Chef | Reach level 50 | Title |
| 🤝 Negotiator | Pass the check on with a deal 10 times | Title, *Neon* frame |
| 🪢 Belt Master | Use Tighten the Belt 20 times | Title |
| 🦾 Iron Stomach | Pay a check of $300+ and stay at the table | Title, *Ocean* board |
| 🏙️ Tycoon | Own all 4 restaurants at ★★★ in one game | Title, *Royal* frame |

**Level unlocks:** frames Bronze (5), Silver (15), Gold (30), Diamond (50) · boards Oak (3), Terracotta (6), Marble (10), Midnight (20), Neon diner (35) · chat bubbles Receipt (4), Comic (8), Neon (25).

## How it works

```
                 checkflipgame.com  (one Cloudflare Worker)
 ┌────────────┐  static files ──────────────► public/  (free, no Worker run)
 │  Browser   │  /ws?hub=ROOM ─────────────► Durable Object "Hub" per room
 │  (game)    │                               relays moves, chat, presence
 └─────┬──────┘                               └─ fallback: public MQTT brokers
       │ accounts, XP, achievements
       ▼
   Supabase (Auth + Postgres, sql/schema.sql)   ◄── daily keep-alive cron
```

- **The game runs in the browser.** The host's browser applies the rules (`public/js/engine.js`) and shares the game state. If the host drops, another player takes over.
- **Multiplayer relay:** each room is a Cloudflare **Durable Object** (`worker/index.js`). It relays messages between the players of a room, keeps the latest game state for 12 hours so players can reconnect, and notices when a player disconnects. It uses the WebSocket Hibernation API, so idle rooms cost nothing.
- **Fallback:** if the relay can't be reached (or the free daily quota is used up), the game automatically connects through public MQTT brokers (EMQX, HiveMQ, Mosquitto) with the same logic.
- **Quick game:** open public tables are listed in a separate `_pub` hub; a table disappears from the list when it fills up, starts or everyone leaves.
- **Accounts:** Supabase Auth + Postgres. Clients can only read; every write goes through validated database functions (see [Security](#security)).
- **Keep-alive:** a daily cron trigger in the same Worker makes a small read from Supabase, so the free project isn't paused after a week without activity.

### Project structure

```
.
├── public/                 # the game (served as static files)
│   ├── index.html
│   ├── privacy.html        # privacy notice (KVKK / GDPR), English + Turkish
│   ├── css/style.css
│   ├── assets/             # logo, screenshot
│   └── js/
│       ├── engine.js       # rules, balance values, bot AI (no DOM; runs in Node too)
│       ├── app.js          # networking, animation, UI, chat
│       ├── net.js          # client for the Cloudflare relay (mqtt.js-compatible subset)
│       ├── account.js      # Supabase client: auth, XP/levels, achievements, cosmetics
│       ├── account-ui.js   # log in / sign up / reset, Profile & looks, end-of-game progress
│       ├── i18n.js         # English + Turkish game texts
│       ├── i18n-account.js # English + Turkish account texts
│       ├── config.js       # Supabase URL + publishable key (public values)
│       └── sound.js        # WebAudio sound effects
├── worker/index.js         # Cloudflare Worker: static site, room relay (Durable Object), cron
├── wrangler.jsonc          # Worker configuration
├── sql/schema.sql          # Supabase database: tables, security rules, functions
├── tests/simulate.mjs      # engine simulation (hundreds of bot games)
└── tools/netlify-redirect/ # optional: redirect an old Netlify address to the new domain
```

### Free-tier limits (Cloudflare Workers free plan)

| | Free per day | What it means here |
|---|---|---|
| Static files | unlimited | Loading the game never counts. |
| Worker requests | 100,000 | One per player connection. |
| Durable Object requests | 100,000 | WebSocket messages count 20:1, i.e. ~2 million game messages. |
| Durable Object duration | 13,000 GB-s | About **29 room-hours of active play per day** (≈ 55 half-hour games). Idle rooms hibernate. |

When a limit is reached, new connections fall back to the public MQTT brokers until the quota resets (00:00 UTC). If the game outgrows this, the Workers Paid plan costs $5/month.

## Deploying

### 1. Supabase (accounts)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query:** paste all of `sql/schema.sql` and **Run**. Run it again after every update of the file; it's safe to re-run.
3. **Authentication → Sign In / Providers → Email:** keep the Email provider on and turn **Confirm email off** (accounts without an e-mail can't confirm one).
4. **Authentication → URL Configuration:** *Site URL* `https://checkflipgame.com`; add `https://checkflipgame.com` and `https://www.checkflipgame.com` to *Redirect URLs* (password-reset links return there).
5. **Password-reset e-mails:** the built-in mailer only delivers to your own team's addresses and a few mails per hour. For real players, add a custom SMTP server under **Authentication → Emails → SMTP Settings** (e.g. Resend or Brevo free tiers).
6. Put the *Project URL* and *publishable key* (Project Settings → API Keys) into `public/js/config.js` and into `vars` in `wrangler.jsonc`.

Never put the **secret / service_role key** or the database password anywhere in this repository.

### 2. Cloudflare (hosting + relay)

1. Push this repository to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → connect GitHub and pick the repo.
   - Project name: `check-flip` (must match `name` in `wrangler.jsonc`)
   - Build command: *leave empty* · Deploy command: `npx wrangler deploy`
3. **Deploy.** The game appears at `check-flip.<your-subdomain>.workers.dev`. Every push to `main` deploys again.
4. Worker → **Settings → Domains & Routes → Add → Custom domain:** add `checkflipgame.com` and `www.checkflipgame.com`. If the domain has older A/CNAME records (e.g. for Netlify), delete them first.
5. **E-mail for the privacy notice:** Cloudflare → your domain → **Email → Email Routing** → create `contact@checkflipgame.com` and forward it to your personal inbox (free).

### 3. Moving away from an old host (optional)

To keep old links working, deploy the two files in `tools/netlify-redirect/` to the old Netlify site (drag the folder onto the site's *Deploys* page). Every old link then redirects to `checkflipgame.com`.

## Running locally

```bash
npm install
npm run dev        # Worker + relay + site at http://localhost:8787
npm test           # engine simulation
```

`npm start` serves only the static files (no relay); multiplayer then uses the public MQTT fallback. ES modules don't load over `file://`, so always use a local server.

## Tests

`npm test` plays hundreds of 2–6 player games with random-choice players and checks for stuck games and invalid states, pits the bot AI against random players, and checks the final standings used for account results:

```
4 players: 300/300 games finished, errors 0, median days 19 (p10 16, p90 23)
Bot AI, 4-player table (1 bot + 3 random players): win rate 92% (chance alone: 25%), errors 0
All simulations passed.
```

Run it after changing balance values (the constants at the top of `public/js/engine.js`).

## Security

- Passwords are handled by Supabase Auth (bcrypt); the browser only has the *publishable* key.
- Tables are **read-only** for clients (Row Level Security). Writes go through `SECURITY DEFINER` functions in `sql/schema.sql`:
  - `submit_result`: ignores duplicate submissions, caps XP per game, doesn't count games shorter than 3 days or 4 minutes, and allows at most one counted game per 4 minutes and 12 per hour. Place and a digest of the final standings are computed on the server.
  - **Cross-check:** an online result first gives participation XP only; the rest of the XP, the win and achievement progress are granted when another player of the same table submits the same final standings.
  - Achievements are awarded by a database trigger whenever XP, wins, games or stats change.
  - `set_equipped` refuses cosmetics that aren't unlocked. `login_email` allows username login without revealing e-mails and is throttled. `delete_my_account` deletes the caller's account and all its data.
- The relay only lets a connection publish and subscribe inside its own room, limits message size and rate, and only accepts browser connections from the game's own domain (plus `ALLOWED_ORIGINS`).
- Anti-cheat is "trust + limits": the rules run in the host's browser, so a determined cheater with two accounts could fake a game; the limits keep the effect small.

## Privacy

`public/privacy.html` is the privacy notice (KVKK and GDPR, English and Turkish). Sign-up requires accepting it, and players can delete their account in *Profile & looks → Stats*. No tracking or advertising cookies are used; only local storage needed for the game (language, nickname, session). If ads are added later, a consent banner (CMP) is required for visitors from the EU/UK.

## Adding a language

Game texts live in `public/js/i18n.js`, account texts in `public/js/i18n-account.js`. Add a language key next to `en` and `tr` in each dictionary, add it to `LANGS`, and extend the language button in `public/js/app.js`.

## History

The game started as “Hesaplar Senden”, became “Hesap Kimde?”, then “Check, Please!”, and is now **Check Flip**. A few internal identifiers (the relay topic prefix `checkplease/v1/` and the placeholder e-mail domain) keep the old name on purpose so existing rooms and accounts keep working.

## Author

Design and development: [@arjinkvlc](https://github.com/arjinkvlc)
