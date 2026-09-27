/**
 * Check Flip — public client configuration.
 *
 * Accounts use Supabase (https://supabase.com). Both values below are PUBLIC:
 * the publishable ("anon") key is meant to be shipped to browsers, and all
 * data access is enforced by Row Level Security and the functions in
 * sql/schema.sql. NEVER put the secret / service_role key or the database
 * password in this file or anywhere else in the client.
 *
 * Leave SUPABASE_URL empty to run the game without accounts (guest only).
 */
export const SUPABASE_URL = 'https://dwygwflbzxrqworyikzw.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Iqd3ZrtICWhewJjJStMm8Q_Q6E5JiUT';

// Accounts created without an e-mail get an internal placeholder address on
// this domain. No mail is ever sent to it (keep "Confirm email" OFF in
// Supabase → Authentication → Sign In / Providers → Email).
// (keep this value: existing accounts use it; it's from the game's former name)
export const PLACEHOLDER_EMAIL_DOMAIN = 'players.checkplease.invalid';
