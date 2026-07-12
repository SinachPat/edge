-- Multi-sport support: picks made on non-soccer sports settle against The
-- Odds API /scores endpoint, which needs the event id and sport key. Soccer
-- picks keep using fixture_id (API-Football) for exotic-market settlement.
-- Both columns nullable — existing rows and soccer-only picks are unaffected.
alter table picks
  add column if not exists odds_event_id text,
  add column if not exists odds_sport_key text;

comment on column picks.odds_event_id is 'The Odds API event id — settlement reference for non-soccer sports';
comment on column picks.odds_sport_key is 'The Odds API sport key (e.g. basketball_nba) — routes settlement to /scores';
