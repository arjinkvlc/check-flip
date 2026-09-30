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

- **Money** is the game's own coin (¤, a gold coin with a fork and spoon).
- **Starting money** depends on the player count: 2 players ¤100, 3 players ¤150, 4+ players ¤200. The host can change it. Everyone starts with 0 hunger, and turn order is decided by a dice roll.
- **One day:** Everyone makes 2 moves. After rolling, you choose to move the sum of both dice or just one of them. Doubles roll again.
- Every day starts with **+1 hunger** for everyone (max 10).
- **Full lap:** +¤40, +2 hunger, multiplier +1. **Halfway:** +¤20, +1 hunger.
- **The check:** The next player in line pays `hunger × multiplier × ¤5` for everyone at the table, themselves included. Everyone who eats goes back to 0 hunger.
- **Restaurants** (🍕 Pizzeria, 🍣 Sushi Bar, 🍔 Burger Joint, 🌮 Taqueria):
  - Buy one for ¤40.
  - Landing on someone else's restaurant costs a visit fee (¤5 / ¤8 / ¤12). You may then offer to buy it for more; if the owner accepts, it changes hands.
  - Landing on your own lets you cash the register (★ +¤15, ★★ +¤20, ★★★ +¤25) or upgrade it.
  - At the start of each day one of the 4 restaurants is drawn for **tonight's dinner** and shown on the board. If it has an owner, they take a commission from the check: ★ 25%, ★★ 35%, ★★★ 50%.
- **Negotiation:** The payer gets one offer: "I'll give you $X, you pay the check."
- **Cards:**
  - Chance and Event decks.
  - Some cards are kept in hand (max 2): Free sample, Hunger pangs, Discount coupon, Pass the check, Going Dutch, Tighten the Belt. Only you see your cards; the others see "?". With a full hand you choose: drop one of yours or skip the new card.
  - Tighten the Belt (square 12, plus 2 cards in the Chance deck) lets the payer skip their own meal and share.
- **Timer:** 30 seconds to decide, 45 seconds to pay. If time runs out or a player disconnects, the game plays for them.
- **Day limit (optional):** When time is up, the richest player (*money + restaurant value*) wins.
- **Accounts (optional):** Logged-in players earn XP and unlock achievements and cosmetics. **Games with bots (single player, or bots added to a room) give half XP and don't count toward achievements** (except level achievements). Wins and other achievements come from online games once another player at the same table confirms the result. Games shorter than 3 days or 4 minutes don't count.

### Features

- **Game modes:**
  - Private room: join with a 5-character code or an invite link. The host can add bots to fill empty seats.
  - Quick game: random matchmaking; if nobody comes, bots take the empty seats. The game starts when everyone at the table is ready.
  - Single player: 2, 3 or 4-player tables against bots.
  - **Modes:** Classic (last one standing), **Quick** (10 days, shorter turn timers, richest wins, ~15 minutes) and **2v2 teams** (seats 1 & 3 against 2 & 4; teammates cover each other's checks; knock out both rivals to win).
  - **Rematch:** everyone taps *Rematch* and a new game starts with the same settings.
  - Same device: pass the phone around.
- **Accounts and progression (optional):**
  - Sign up with a username and password. The e-mail is optional and only used for password resets. Guests can still play everything.
  - XP and levels (1–99). Level 10 takes about 530 XP, level 50 about 15,600 XP.
  - 27 achievements, each unlocking a title and most a cosmetic (see below).
  - **Profile & looks** screen with tabs: Avatar, Frames, Boards, Chat bubbles, Titles, Achievements, Stats.
  - Avatar frames and titles are shown to everyone at the table; chat bubbles to everyone in the room; board styles only to you.
- **Social (with an account):**
  - **Friends:** add by username, accept requests, see profile cards (level, wins, win rate, achievements).
  - **Invites:** invite friends to your private room with one tap; they get a *Join* pop-up, no code needed.
  - **Settings:** the gear icon opens language, light / dark theme, music and game sounds.
  - **Leaderboards and seasons:** each season is one calendar month (UTC; season 1 = September 2026). The season board ranks online wins (ties by XP); when a season ends, its top 3 get a gold / silver / bronze medal with the season number on their profile. Medals are handed out by the database the first time the board is opened in the new month. There is also an all-time level board.
  - **Daily quest:** one small goal per day for everyone (+30 XP).
- **Share your result:** a result card image for WhatsApp, Instagram etc. (or a download on desktop).
- **First-game guide:** short tips appear once, at the moment they matter; they can be hidden or shown again.
- **Installable app (PWA):** "Install app" on Android/desktop, "Add to Home Screen" on iPhone; loads fast and single player works offline.
- **Music:** two tracks generated in the browser: a light, sneaky tiptoe tune on the menus and a calm lounge loop during play. They cross-fade when a game starts or ends. Music and game sounds are switched separately in Settings.
- **Light and dark theme:** switch it in Settings (gear icon). The first visit follows the device setting, after that your choice is remembered.
- **Link previews:** invite links show the game's image and title in chat apps.
- **Six languages:** English, Türkçe, Español, Português (Brasil), Français and Deutsch, chosen in Settings. The first visit opens in the browser's language when we have it; an English (or unknown-language) browser visiting from Türkiye gets Turkish (country from Cloudflare, no location permission); otherwise English. In online games each player sees the game log in their own language.
- **Avatars:** 12 original illustrated characters (waiter, waitress, student, food blogger, Italian chef, döner master, noodle chef, pastry chef, grandma, food critic, barista, sommelier). Four are open from the start, the rest unlock with levels and achievements. An avatar taken by one player can't be picked by another; players without one get a colored letter token. The illustrations are generated by `tools/avatars/make_avatars.py`.
- **Bots:** They score target squares, time their hunger around the check order, buy and upgrade restaurants, and use cards and negotiation. In simulations they win about 90% of games against random players.
- **Connection resilience:** A dropped player rejoins with the same link. If the host drops, another player takes over the room.
- **Privacy:** A bilingual privacy notice (KVKK / GDPR), consent at sign-up and self-service account deletion.
- **Social:** Chat and emoji reactions.
- **Look and sound:** Dice and token animations, sound effects synthesized with WebAudio (no audio files).
- **Mobile:** On phones the game fits one screen. Large content (the check, offers) opens in a bottom sheet.

### Progression

**XP per counted game:** 20 for playing + 10 per player you finished ahead of + 50 for a win + up to 20 for days survived, capped at 150. Games with bots give half.

| Achievement | Goal | Unlocks |
|---|---|---|
| 🍽️ First Bite | Win an online game | Title, *Grandma* avatar, *Sweetheart* chat bubble |
| 🪑 Regular | Win 10 online games | Title, *Food critic* avatar, *Golden* chat bubble |
| 🏆 Gourmet | Win 100 online games | Title, *Flame* frame |
| 🎖️ Veteran | Play 50 online games | Title |
| 🔪 Sous Chef | Reach level 10 | Title |
| 👑 Head Chef | Reach level 50 | Title |
| 🤝 Negotiator | Pass the check on with a deal 10 times | Title, *Neon* frame |
| 🪢 Belt Master | Use Tighten the Belt 20 times | Title |
| 🦾 Iron Stomach | Pay a check of ¤300+ and stay at the table | Title, *Ocean* board |
| 🏙️ Tycoon | Own all 4 restaurants at ★★★ in one ranked game | Title, *Royal* frame |
| 🍳 Line Cook | Reach level 25 | Title, *Ember* frame |
| 🎩 Executive Chef | Reach level 75 | Title, *Crown* frame |
| 🏃 Marathoner | Play 200 online games | Title, *Sommelier* avatar |
| 🏪 Restaurateur | Buy 25 restaurants | Title, *Bistro awning* board |
| 🔨 Renovator | Upgrade restaurants 15 times | Title, *Ivy* frame |
| 🃏 Card Shark | Play 50 cards | Title, *Card suits* chat bubble |
| 💳 Big Spender | Pay 30 checks | Title, *Gold leaf* board |
| 💼 Deal Maker | Pass the check on with a deal 50 times | Title, *Starry* frame |
| ⏳ Survivor | Stay at the table for 20 days in one game | Title, *Zen* chat bubble |
| 👥 Team Player | Win 5 2v2 games | Title, *Duo* frame |
| ⚡ Speed Eater | Win 5 Quick games | Title, *Zoom* chat bubble |
| 💬 Social Butterfly | Have 5 friends | Title, *Mint* chat bubble |
| 🎯 Quester | Complete 10 daily quests | Title, *Barista* avatar |
| 📅 Regular Guest | Complete 30 daily quests | Title, *Lavender* board |
| 🏘️ Full House | Own all 4 restaurants at the same time in one ranked game | Title |
| 🔁 Lap Legend | Complete 10 full laps in one ranked game | Title |
| 💰 Deep Pockets | Have ¤1000 at once in one ranked game | Title |

Game-based counters (restaurants, cards, checks, deals, days, mode wins) only grow from online games confirmed by another player; games with bots never count. **Single-game feats** (Tycoon, Full House, Lap Legend, Deep Pockets) count only in **ranked games**: Quick play tables with 3 or more people and no bots. Every player of the game reports whether it was ranked and the reports must match, so friends can't farm them in a private room.

**Level unlocks:** avatars Italian chef (5), Döner master (10), Noodle chef (15), Pastry chef (25) · frames Bronze (5), Silver (15), Gold (30), Diamond (50) · boards Navy felt and Sweet hearts (start), Oak (3), Feast (6), Terracotta (10), Marble (15), Sunset (20), Midnight (25), Chalkboard menu (30), Neon diner (35) · chat bubbles Receipt (4), Comic (8), Neon (25).

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
- **Fallback:** if the relay can't be reached (or the free daily quota is used up), the game automatically connects through public MQTT brokers (EMQX, HiveMQ, Mosquitto) with the same logic. This also works in the middle of a game: when the relay drops, players add a backup connection to a public broker and messages go over both until the game ends.
- **Quick game:** open public tables are listed in a separate `_pub` hub; a table disappears from the list when it fills up, starts or everyone leaves.
- **Accounts:** Supabase Auth + Postgres. Clients can only read; every write goes through validated database functions (see [Security](#security)).
- **Keep-alive:** a daily cron trigger in the same Worker makes a small read from Supabase, so the free project isn't paused after a week without activity.

### Project structure

```
.
├── public/                 # the game (served as static files)
│   ├── index.html
│   ├── privacy.html        # privacy notice (KVKK / GDPR), English + Turkish
│   ├── sw.js               # service worker (offline cache)
│   ├── manifest.webmanifest
│   ├── css/style.css
│   ├── assets/             # logo, screenshot, og.png (link preview), icons/ (app icons), avatars/
│   └── js/
│       ├── engine.js       # rules, balance values, bot AI (no DOM; runs in Node too)
│       ├── app.js          # networking, animation, UI, chat
│       ├── net.js          # client for the Cloudflare relay (mqtt.js-compatible subset)
│       ├── account.js      # Supabase client: auth, XP/levels, achievements, cosmetics
│       ├── account-ui.js   # log in / sign up / reset, Profile & looks, end-of-game progress
│       ├── i18n.js         # English + Turkish game texts, language list and loading
│       ├── lang/           # language packs: es.js, pt.js, fr.js, de.js (loaded when chosen)
│       ├── i18n-account.js # English + Turkish account texts
│       ├── config.js       # Supabase URL + publishable key (public values)
│       ├── sound.js        # WebAudio sound effects
│       ├── music.js        # generated background music (menu + game tracks)
│       ├── social-ui.js    # friends, leaderboards, profile cards, invites
│       ├── tips.js         # first-game guide
│       ├── share.js        # result card image
│       ├── pwa.js          # install prompt + service worker registration
│       ├── i18n-v11.js     # texts added in v1.1
│       ├── i18n-v13.js     # texts added in v1.3 (home screen, theme)
│       ├── i18n-v15.js     # texts added in v1.5 (private hands, dice, filter)
│       ├── i18n-v16.js     # texts added in v1.6 (bots, chat, awards, seasons)
│       ├── i18n-v17.js     # texts added in v1.7 (settings, username, seasons, friends)
│       ├── i18n-v110.js    # texts added in v1.10 (dinner venue, new game, chat reports, admin)
│       ├── admin-ui.js     # admin screen: numbers, chat reports, bans
│       ├── i18n-v19.js     # texts added in v1.9 (leave question, money after paying, ranked games)
│       ├── i18n-v18.js     # texts added in v1.8 (page title and description per language)
│       ├── seo-text.js     # search engine texts (title, description, "What is Check Flip?"), also used by the Worker for /tr
│       ├── filter.js       # word filter for names and chat (same lists as public.name_blocked in SQL)
│       └── version.js      # version number (shown in the footer)
├── worker/index.js         # Cloudflare Worker: static site, Turkish page (/tr), room relay (Durable Object), cron
├── wrangler.jsonc          # Worker configuration
├── sql/schema.sql          # Supabase database: tables, security rules, functions
├── tests/simulate.mjs      # engine simulation (hundreds of bot games)
├── tests/belt-deal.mjs     # Tighten the Belt + passing the check on
├── public/vendor/          # fonts and libraries served from the site itself (Fontsource fonts, mqtt.js, supabase-js)
├── tools/seo-pages/        # builds the search landing pages (public/*.html, public/tr/*.html)
├── tools/coin-font/        # builds the coin sign (a one-glyph colour font, embedded in style.css)
├── tools/avatars/          # generator for the avatar illustrations (Python, no dependencies)
├── tools/email-templates/  # password-reset e-mail for Supabase
└── tools/netlify-redirect/ # optional: redirect an old Netlify address to the new domain
```

### Free-tier limits (Cloudflare Workers free plan)

| | Free per day | What it means here |
|---|---|---|
| Static files | unlimited | Loading the game never counts. |
| Worker requests | 100,000 | One per player connection. |
| Durable Object requests | 100,000 | WebSocket messages count 20:1, i.e. ~2 million game messages. |
| Durable Object duration | 13,000 GB-s | About **29 room-hours of active play per day** (≈ 55 half-hour games). Idle rooms hibernate. |

When a limit is reached, new rooms and running games fall back to the public MQTT brokers until the quota resets (00:00 UTC). If the game outgrows this, the Workers Paid plan costs $5/month.

## Deploying

### 1. Supabase (accounts)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Database schema:** paste all of `sql/schema.sql` into **SQL Editor → New query** and **Run** (safe to re-run). To apply future changes automatically, add the GitHub secret below; the *Apply database schema* workflow (`.github/workflows/db-schema.yml`) then runs the file whenever it changes on `main`:
   - Supabase → **Connect** (top bar) → **Session pooler** → copy the URI and put your database password in place of `[YOUR-PASSWORD]` (forgot it? **Project Settings → Database → Reset database password**). Use the pooler: GitHub's runners can't reach the direct connection, which is IPv6-only on the free plan.
   - GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**: name `SUPABASE_DB_URL`, value = that URI.
   - Run it once by hand: **Actions → Apply database schema → Run workflow**.
3. **Authentication → Sign In / Providers → Email:** keep the Email provider on and turn **Confirm email off** (accounts without an e-mail can't confirm one).
4. **Authentication → URL Configuration:** *Site URL* `https://checkflipgame.com`; add `https://checkflipgame.com` and `https://www.checkflipgame.com` to *Redirect URLs* (password-reset links return there).
5. **Password-reset e-mails:** the built-in mailer only delivers to your own team's addresses and a few mails per hour. For real players, use a custom SMTP server, e.g. [Resend](https://resend.com) (free: 3,000 e-mails/month):
   - Resend → **Domains → Add domain** `checkflipgame.com` and add the DNS records it shows (Resend can add them to Cloudflare automatically). They live on the `send.` subdomain, so they don't clash with Email Routing.
   - Resend → **API Keys → Create** (permission: *Sending access*).
   - Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**: sender `noreply@checkflipgame.com`, name `Check Flip`, host `smtp.resend.com`, port `465`, username `resend`, password = the API key.
   - Optional: paste `tools/email-templates/reset-password.html` into **Emails → Templates → Reset Password** for a bilingual e-mail.
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

### 3. Search and statistics (optional)

- **Google Search Console:** add a *Domain* property for `checkflipgame.com` and verify it with the TXT record Google shows (DNS → Records in Cloudflare, or Google's automatic Cloudflare verification). Then submit `https://checkflipgame.com/sitemap.xml`. `public/robots.txt` and `public/sitemap.xml` are included.
- **Bing Webmaster Tools** (also feeds DuckDuckGo, Yahoo and Ecosia): sign in at bing.com/webmasters → **Import from Google Search Console**, or add the site and verify with the DNS record. Submit the same sitemap.
- **Two languages for search:** `/` is the English page and `/tr` the Turkish one (the Worker serves the same page with Turkish title, description and text in the HTML). Both are linked with `hreflang` and listed in the sitemap. After a release, use **URL Inspection → Request indexing** for both addresses.
- **Cloudflare Web Analytics:** Cloudflare → **Analytics & Logs → Web Analytics → Add a site** → `checkflipgame.com` → automatic setup. Cookieless, so no consent banner is needed; it's listed in the privacy notice.

### 4. Safety: rate limit, bots, captcha, chat reports (recommended)

- **Rate limit for game connections** (Cloudflare free plan has one rule): Cloudflare → your domain → **Security → WAF → Rate limiting rules → Create rule**. *If* URI Path equals `/ws`, *when rate exceeds* 20 requests per 10 seconds, *with the same* IP, *then* Block for 10 seconds. Scripts opening thousands of connections can then no longer use up the daily quota.
- **Bot Fight Mode:** Cloudflare → **Security → Bots → Bot Fight Mode: On**.
- **Captcha on log in / sign up / password reset (Turnstile, free):** Cloudflare → **Turnstile → Add widget** (hostname `checkflipgame.com`, mode *Managed*). Put the **site key** into `TURNSTILE_SITE_KEY` in `public/js/config.js` and deploy. Then in Supabase → **Authentication → Attack Protection → Enable Captcha protection**, provider *Turnstile*, paste the **secret key**. (Deploy the site key first: once Supabase requires a captcha, logins without one fail.)
- **Chat reports:** make a long random value (for example in PowerShell: `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`) and save the same value twice: as a Worker secret named `CHAT_SECRET` (Cloudflare → Workers → check-flip → **Settings → Variables and Secrets → Add → Secret**) and as a GitHub repository secret named `CHAT_SECRET`. Then run the *Apply database schema* workflow once (Actions → Run workflow). Without it the game works, but the report button doesn't appear.
- **Admin:** in the Supabase SQL editor run `insert into public.admins (user_id) select id from public.profiles where username = 'YOUR_NAME';`. The **Admin** button then appears in Settings: daily numbers, reports and bans.

### 5. Moving away from an old host (optional)

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
  - Friends, requests and invites are only reachable through functions: invites go to friends only (max 20 per 10 minutes, expire after 10 minutes), requests are rate-limited, and daily quest XP is granted once per UTC day by the server.
  - `set_equipped` refuses cosmetics that aren't unlocked. `login_email` allows username login without revealing e-mails and is throttled. `delete_my_account` deletes the caller's account and all its data.
- The relay only lets a connection publish and subscribe inside its own room, limits message size and rate, and only accepts browser connections from the game's own domain (plus `ALLOWED_ORIGINS`).
- Chat: the relay learns who a signed-in player is from their own session token (it asks Supabase `my_status`) and signs every typed line (`room|sender|time|text`, HMAC with `CHAT_SECRET`). `report_chat` only accepts lines with a valid signature, so reports can't be made up. A line with a blocked word, or 3 different reporters in 24 hours, gives an automatic ban: chat 1 day → 7 days → 30 days → permanent (+ account 7 days) → account permanent. Other reports wait for an admin. Chat bans are enforced by the relay (re-checked at least every minute), account bans by the relay and the database functions. At public tables typed chat is for signed-in players only.
- Game rooms accept at most 16 connections.
- Anti-cheat is "trust + limits": the rules run in the host's browser, so a determined cheater with two accounts could fake a game; the limits keep the effect small.

## Privacy

`public/privacy.html` is the privacy notice (KVKK and GDPR, English and Turkish). Sign-up requires accepting it, and players can delete their account in *Profile & looks → Stats*. No tracking or advertising cookies are used; only local storage needed for the game (language, nickname, session) and a random id for anonymous game statistics (visits, games started and finished, return after 1 and 7 days; not linked to accounts). If ads are added later, a consent banner (CMP) is required for visitors from the EU/UK.

## Languages

English and Turkish are built in (`public/js/i18n.js`, `i18n-account.js` and the `i18n-v*.js` files add texts per release). Spanish, Portuguese, French and German are packs in `public/js/lang/<code>.js` with the same keys (`C`, `U`, `LOG`, `TXT`, `NAMES`), loaded when chosen; a missing text falls back to English.

**Every new text must be added in all six languages.** `node tools/check-langs.mjs` (also part of `npm test`) lists missing or extra texts and wrong function signatures in the packs.

To add a language: copy a pack to `public/js/lang/<code>.js`, translate it, add the code to `LANGS`, `LANG_NAMES`, `LOCALES` and `PACKS` in `i18n.js`, and to the `SHELL` list in `sw.js`.

## History

The game started as “Hesaplar Senden”, became “Hesap Kimde?”, then “Check, Please!”, and is now **Check Flip**. A few internal identifiers (the relay topic prefix `checkplease/v1/` and the placeholder e-mail domain) keep the old name on purpose so existing rooms and accounts keep working.

## Changelog

### 1.13.1
- Quick play starts only when everyone at the table is ready, also when the table is full (bots no longer start the game on their own)
- Turkish texts reworded to read more naturally across the game, rules, cards, account screens and landing pages (for example "hazır olduğunda" instead of "hazır deyince")

### 1.13.0
- Quick play with bots counts in full: bots only fill empty seats, so the game gives full XP, wins and achievements (unlike games against bots). With several people at the table they confirm each other's result as before; alone with bots the result is saved right away (mode `quick`) and counts everywhere, the season leaderboard included
- Quick play bots join quietly (no countdown) and play at the level of the table: average account level under 8 → easy, under 20 → normal, else hard (guests count as level 1)
- "Developed by", the privacy link and the version moved from the home screen into Settings

### 1.12.0
- Quick play: a waiting screen with a spinning ring ("Looking for players…") and a countdown; if nobody new sits down for 30 s, bots join one by one (ready) until the table is full and starts. A real player who arrives takes a bot's seat. Games with bots give half XP and don't count for achievements, as before (changed in 1.13: Quick play counts in full)
- Quick play tables can't be joined with a code or an invite link (no room code shown there), so friends or second accounts can't sit at a random table on purpose
- Keyboard on computers: Space or Enter rolls, continues or presses the main button; 1–9 pick a choice (numbers shown on the buttons); C opens the chat, Enter sends, Esc leaves it; the list is in Settings

### 1.11.0
- Four more languages: Español, Português (Brasil), Français, Deutsch; the language is picked from a list in Settings
- First visit language: the browser's language when we have it; visitors from Türkiye with an English browser get Turkish (country from Cloudflare, no permission); otherwise English
- Fix: the Friends screen could stay empty after logging out and in again; a loading error now shows with a Try again button
- Admin badge on the profile, the profile card and the account chip
- Lighter on the free plans: game statistics are rolled up into one row per day (raw events kept 14 days), game results kept 90 days, smaller friends replies and polling every 3 minutes when there are no friends or requests, table state saved every 60 s

### 1.10.1
- Turnstile captcha turned on for log in, sign up and password reset (site key in `config.js`; off on localhost)

### 1.10.0
- Tonight's dinner restaurant is drawn at the start of each day and shown on the board, so buying and upgrading can be planned
- End of the game: **Start a new game** of the same kind (Quick play → another public table, a room → the same room, bots or one device → same players and settings) and **Back to menu**
- "N people playing right now" on the home screen (hidden while small)
- Chat reports: a report button on messages from signed-in players; automatic bans for blocked words or 3 reports, admin review for the rest; chat bans and account suspensions
- At public tables, typed chat is for signed-in players; ready-made lines work for everyone
- Admin screen (Settings → Admin): daily visitors, new visitors, games by kind, return after 1 and 7 days, reports and bans
- Anonymous game statistics (a random id per browser; no personal data)
- Optional Turnstile captcha on log in, sign up and password reset
- Fonts and libraries are served from the site itself: faster first load, no requests to Google Fonts or jsDelivr (these are blocked or slow in some countries)
- Search pages: "online board game to play with friends" and "Monopoly-like game online", in English and Turkish
- Rooms accept at most 16 connections

### 1.9.0
- Game coin: money is shown with the game's own gold coin (fork and spoon) instead of ₺ / $
- The check shows how much you'll have left after paying (or how much you're short)
- You can still offer to pass the check on after using Tighten the Belt or the Discount coupon; the card's effect stays (the belt user still doesn't eat, the coupon still counts)
- "Leave the game?" question before leaving a running game; the browser also asks before closing the tab during an online game
- Computers: the game fits one screen; events and chat scroll inside their own box instead of growing the page
- Removed the events button next to Settings on computers (the events are already on screen)
- The header shows just "Check Flip" (the long search title stays in the browser tab)
- Framed avatars no longer overlap player names; frames look the same in the player list and your profile chip
- Home screen picture is now a little game board around the table
- New achievements for ranked games (Quick play, 3+ people, no bots): Full House (all 4 restaurants at once), Lap Legend (10 laps), Deep Pockets (¤1000 at once); Tycoon now counts only in ranked games too

### 1.8.0
- Search: title and description that say what the game is ("free online board game to play with friends"), structured data (VideoGame), a hidden main heading and a "What is Check Flip?" section in How to play
- Turkish page at `/tr` with Turkish title, description and text already in the HTML; `hreflang` links between the two languages; sitemap with both pages and dates
- The page title and description change with the language; a Turkish browser opens the game in Turkish the first time (a chosen language is still remembered)
- Link previews (WhatsApp, X, Discord) use the new title and description
- Sign-up and password e-mails always link back to the home page

### 1.7.0
- Performance: the game server keeps the table in memory and saves it at most every 30 s (and when the last player leaves); public-table ads are never saved. About 8x fewer storage writes, so the free plan holds far more games a day. A player who reconnects asks the others for the latest table
- Friends and invites are checked every 45 s on the menus and every 90 s in a game (was 20 s), never in a hidden tab
- Database upkeep once a day (from the Worker's cron): hands out season medals and removes per-game rows older than 180 days (profile totals stay); index for season queries
- "Season N is over, you finished 2nd!" message once per season
- Friends screen: recent online games you played together
- Change your username once a week (profile → Stats; checked on the server too)
- One Settings panel (gear icon) for language, theme, music and game sounds instead of separate header buttons
- Removed the colour-blind shapes and the home screen headline
- Fix: dice previews in the profile (Royal blue & gold, Neon)

### 1.6.1
- Fix: in the profile's dice list, the Royal blue & gold preview showed a thick gold frame over the dots, and Neon had a large shadow (sizes meant for the board were used in the small preview)
- Database workflow: tidies the secret and explains connection problems

### 1.6.0
- Seasons: the weekly board became a monthly season board; the top 3 of each season get a gold / silver / bronze medal (with the season number) on their profile, and the current top 3 show a live medal on the board
- Bot levels: Easy / Normal / Hard for single player and for bots added to a room
- A player who drops off during an online game is played by a bot until they're back
- Quick chat messages (shown in each player's language), mute a player (hides their chat and reactions), the host can remove a player from the lobby
- End-of-game awards: biggest spender, hungriest, deal maker, belt master, property tycoon, card shark, renovator
- WhatsApp and share buttons for the room link
- Shapes on tokens and player dots for colour-blind players (toggle in the header)

### 1.5.1
- GitHub Action that applies `sql/schema.sql` to Supabase automatically when it changes (needs the `SUPABASE_DB_URL` secret)

### 1.5.0
- Cards in hand are private: other players see "?" until a card is played
- Full hand (2 cards): you now choose which card to drop, or skip the new one (before, the new card was silently lost)
- Tighten the Belt: one square (12) plus two cards in the Chance deck; balanced board (both halves hold the same squares, a restaurant every 10 squares, no two alike side by side)
- Dice skins, unlocked by level: Classic, Red & white, Old bone, Checked tablecloth, Neon, Marble, Solid gold, Royal blue & gold. Everyone sees the roller's dice
- New dice roll sound (shake + bounces on the table) and more motion: screen transitions, hover lifts, sliding menus and chat messages
- Word filter: usernames with offensive words are refused (also checked on the server), chat shows them as *****, bad guest nicknames are replaced
- Phones: music / sound / theme / language moved into a ⋮ menu in game so the Leave button always fits

### 1.4.1
- Fix: after a Hop in a taxi / Got lost / shortcut / go back move, the token now visibly moves after the card is shown (before, the whole move played at once and looked like the card did nothing)
- Bots take about 2 seconds longer per move, and their result pop-ups stay as long as a person's, so the table is easier to follow

### 1.4.0
- Profile: opens on Stats (now the first tab), a new header card, and you can add or change your e-mail for password resets
- Titles are no longer all purple: each has its own badge (green, blue, red, stamped yellow, shining gold, neon, royal, fire)
- New look for the lobby (room card and players on the left, settings on the right), leaderboard, friends and the end-of-game card with final standings
- Log out moved to the top right, next to your account button
- Backup connection in the middle of a game: if the game server can't be reached (or a player drops off it), everyone also joins the room on a public MQTT broker and the game goes on

### 1.3.2
- Wide screens: players and chat on the left, board in the middle, your turn on the right; compact player cards so 5–6 player tables fit
- Chat is the default tab, Events is one click away; the round chat button is gone on desktop
- Fix: icons and names on board squares overlapped
- Home: the account button (top right) now shows your level and XP bar and opens your profile; removed the duplicate account card and the extra Profile / How to play buttons; Friends button got an icon
- "Developed by" credit only on the home screen

### 1.3.1
- Fix: after an update, some browsers showed the new page with old cached scripts and styles (broken layout). Scripts and styles are now loaded network first, and the page reloads once when a new version takes over

### 1.3.0
- New home screen: one big Quick game button with a Classic / Quick switch, three tiles (with friends, against bots, same device) and a small strip for your account, daily quest, leaderboard and rules
- Quick game only seats you at open tables of the mode you picked
- Simpler header: icon buttons, an account chip with your avatar and level, and a light / dark theme toggle
- Game screen: board on the left, players, your turn and a Events / Chat switch in one column on the right
- Two background tracks: a playful tiptoe tune on the menus and the calm lounge loop in game

### 1.2.0
- 14 new achievements (24 in total) with new rewards: 5 frames, 3 boards, 4 chat bubbles, 2 avatars and a title for each
- Weekly leaderboard ranks by online wins
- Calmer background music
- Reaction button uses a drawn icon, perfectly centered on every device
- Password confirmation on sign-up and reset; specific error messages (same password, too short/long, expired link, e-mail limits…)

### 1.1.1
- `robots.txt`, `sitemap.xml` and a canonical link for search engines
- Privacy notice: visitor statistics (Cloudflare Web Analytics) and the e-mail provider (Resend)
- Bilingual password-reset e-mail template (`tools/email-templates/`)

### 1.1.0
- Game modes: Quick (10 days) and 2v2 teams
- Rematch, result share card, first-game guide
- Friends, profile cards, one-tap invites, weekly and all-time leaderboards, daily quests
- Installable app (PWA) with offline single player, link previews, background music
- Version shown in the footer

### 1.0.0
- First public release: online rooms and quick play, single player with bots, accounts with XP, achievements and cosmetics, illustrated avatars, board styles, Cloudflare hosting and relay

Updating the version: change `public/js/version.js` (and `package.json`). The service worker cache is named after it, so players get the new files.

## Author

Design and development: [@arjinkvlc](https://github.com/arjinkvlc)
