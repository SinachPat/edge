# Daily picks log — free-source pipeline

Output of `edge-daily-picks`, a Claude-run daily research pipeline that substitutes
free public sources (ESPN, BBC Sport, Sofascore, FBref, plus whatever else a given
day's fixtures need) for the paid Odds API / API-Football / SharpAPI stack. This is
the primary daily system on days the paid pipeline isn't running — not a fallback,
not informal. Same discipline, same target output: 3 tickets × 3 picks.

It runs every day (Sun–Sat), and aims for the full 3-ticket structure every time —
same as the real pipeline's own rule: 3 tickets need 9 distinct qualifying picks
minimum; below that, it shows individual qualifying picks instead of forcing an
invalid ticket shape (see `inngest/daily-pipeline.ts`). "Nothing qualified" is
reported plainly when it happens rather than padded to hit a quota.

**What's genuinely computed here, same rigor bar as the real pipeline where possible:**
H2H, current form, home/away split, injuries, and an actual computed Poisson
expected-goals model built from real recent scorelines (not a vibe — shown inputs,
shown math). Odds are cross-checked across multiple sources when available, and
"Model Edge" is calculated as (this model's estimated probability × quoted decimal
odds) − 1.

**What's structurally not available without a paid market-data feed, and never
faked:** true line-movement / sharp-vs-public split, and EV against Pinnacle's
closing line. "Model Edge" here is edge against this pipeline's own statistical
estimate — a real number, but not the same claim as the real pipeline's
Pinnacle-referenced EV score. Tiers are labeled Strong / Moderate with a signal
count shown (e.g. "5/6") — not DIAMOND/GOLD/SILVER, because those are calibrated
against real EV thresholds this pipeline doesn't have inputs for.

Not written to Supabase — never touches `sessions`, `picks`, `tickets`, or
`bankroll`. Not committed to git (see `.gitignore`).

One dated file per run: `YYYY-MM-DD.md`.
