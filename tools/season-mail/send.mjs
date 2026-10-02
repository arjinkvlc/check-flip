/**
 * Check Flip — sends the season e-mail (run by .github/workflows/season-mail.yml on the 1st–7th of each month).
 * Only to accounts that ticked "e-mail me when a new season starts" and have a real e-mail address; each player
 * once per season (season_mail_log), in the language they last used in the game; at most MAX_PER_RUN per run so the
 * Resend free plan's daily limit is never hit (the next day's run continues).
 *
 * Env: DATABASE_URL (Supabase session pooler URI), RESEND_API_KEY, optional MAIL_FROM, MAX_PER_RUN, DRY_RUN=1, SITE.
 */
import pg from 'pg';
import {MAIL} from './texts.mjs';

const SITE = process.env.SITE || 'https://checkflipgame.com';
const FROM = process.env.MAIL_FROM || 'Check Flip <noreply@checkflipgame.com>';
const MAX = Math.max(1, Math.min(+process.env.MAX_PER_RUN || 90, 95));
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const KEY = process.env.RESEND_API_KEY || '';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export function build(r, prev, next) {
  const L = MAIL[r.lang] || MAIL.en;
  const unsub = `${SITE}/unsubscribe?t=${r.token}&l=${r.lang}`, oneClick = `${SITE}/api/unsubscribe?t=${r.token}&l=${r.lang}`;
  const play = `${SITE}/${r.lang === 'tr' ? 'tr' : ''}?utm_source=season-mail`;
  const lines = [L.over(prev)];
  if (r.place) lines.push(L.place(r.place, r.wins || 0));
  if (r.medal) lines.push(L.medal(r.medal));
  lines.push(L.start(next));
  const text = `${L.hi(r.username)}\n\n${lines.join(' ')}\n\n${L.cta}: ${play}\n\n--\n${L.why}\n${L.unsub}: ${unsub}\n`;
  const html = `<!doctype html><html lang="${r.lang}"><body style="margin:0;background:#eef0f4;font-family:Arial,Helvetica,sans-serif;color:#131a26">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:2px solid #131a26">
<tr><td style="padding:22px 24px 6px;font-size:24px;font-weight:800;color:#e2483d">Check Flip</td></tr>
<tr><td style="padding:6px 24px;font-size:16px;line-height:1.55">${esc(L.hi(r.username))}</td></tr>
<tr><td style="padding:6px 24px 14px;font-size:16px;line-height:1.55">${lines.map(esc).join('<br>')}</td></tr>
<tr><td style="padding:4px 24px 24px"><a href="${esc(play)}" style="display:inline-block;background:#e2483d;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:12px 22px;border-radius:12px">${esc(L.cta)}</a></td></tr>
</table>
<p style="max-width:520px;font-size:12px;line-height:1.5;color:#5a6474;margin:14px auto 0">${esc(L.why)}<br><a href="${esc(unsub)}" style="color:#3a7fc2">${esc(L.unsub)}</a></p>
</td></tr></table></body></html>`;
  return {subject: L.subject(next), text, html, headers: {'List-Unsubscribe': `<${oneClick}>, <mailto:contact@checkflipgame.com?subject=unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'}};
}

async function main() {
  if (!process.env.DATABASE_URL) { console.log('::error::DATABASE_URL is not set'); process.exit(1); }
  if (!KEY && !DRY) { console.log('::warning::RESEND_API_KEY is not set: no season e-mails were sent. Add it as a repository secret.'); return; }
  const db = new pg.Client({connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : {rejectUnauthorized: false}});
  await db.connect();
  try {
    const {rows: [s]} = await db.query("select public.season_of(now()) as cur, extract(day from now() at time zone 'utc')::int as dom");
    const prev = s.cur - 1, next = s.cur;
    if (prev < 1) { console.log('No finished season yet.'); return; }
    if (s.dom > 7 && !process.env.FORCE) { console.log(`Day ${s.dom} of the month: season e-mails only go out on the 1st–7th.`); return; }
    await db.query('select public.close_seasons()');   // medals of the finished season are handed out first
    const {rows} = await db.query('select * from public.season_mail_list($1) limit $2', [prev, MAX]);
    console.log(`Season ${prev} → ${next}: ${rows.length} to send in this run${DRY ? ' (dry run)' : ''}.`);
    let sent = 0;
    for (const r of rows) {
      const m = build(r, prev, next);
      if (DRY) { console.log(`- would send "${m.subject}" (${r.lang}, place ${r.place || '–'}, medal ${r.medal || '–'})`); continue; }
      const res = await fetch('https://api.resend.com/emails', {method: 'POST', headers: {Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json'},
        body: JSON.stringify({from: FROM, to: [r.email], subject: m.subject, html: m.html, text: m.text, headers: m.headers})});
      if (res.status === 429) { console.log('::warning::Resend limit reached; the next run continues.'); break; }
      if (!res.ok) { console.log(`::warning::send failed (${res.status}): ${(await res.text()).slice(0, 200)}`); continue; }
      await db.query('insert into public.season_mail_log (season, user_id) values ($1, $2) on conflict do nothing', [prev, r.user_id]);
      sent++;
      await new Promise(f => setTimeout(f, 600));   // stay under Resend's 2 requests a second
    }
    console.log(`Sent ${sent}.`);
  } finally { await db.end(); }
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log('::error::' + (e && e.message || e)); process.exit(1); });
