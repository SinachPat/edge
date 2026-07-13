

| ⬡ EDGE Personal Sports Prediction Platform  ·  Daily Session Runbook  ·  v1  ·  July 2026 |
| :---: |

| Purpose *A simple day-to-day checklist for operating the live EDGE app. This is not a separate picks engine — every pick still comes from the real pipeline (The Odds API / API-Football / SharpAPI + the 3-stage Claude pipeline). This document only governs what you do with what it outputs.* |
| :---- |

# 0. One gap to close before relying on this daily

`scripts/shadow-period.ts` and `scripts/backtest.ts` (P-23) aren't in the repo yet — only P-01 through P-22 and P-24 have been built. Your own PRD's Final Gate is explicit: minimum 14 days of shadow validation, GO only if win rate clears the 58–60% range (the PRD states both 58% and 60% in different sections — worth deciding which is your real bar) with positive EV, before any real stake goes down. Until P-23 exists and has run its course, treat every session below as paper: read it, don't fund it.

# Daily routine

**1. Check session status** — after the 06:00 UTC cron, or trigger it yourself with "Run Session" on `/dashboard` any time.

- `running` — mid-flight, check back shortly.
- `held` — zero picks cleared the 4-of-7 signal bar. This is correct behavior, not a failure — there's deliberately no fallback pick. Anti-scope item #4 in your PRD exists for exactly this moment.
- `generated` — real picks exist. Note the actual code (not the original PRD spec) only assembles the 3-ticket parlay structure when 9+ picks qualify that day. Below 9, you'll see individual picks with full rationale and no ticket grouping — `daily-pipeline.ts` skips "a smaller/invalid ticket shape" on purpose, that's not a bug.

**2. Read before you stake anything**

- Every pick's rationale and key risk — not just the tier badge.
- Signal count and EV shown — Stage 1 already filtered these, but confirm nothing looks inflated (an honest SILVER beats an inflated DIAMOND, straight from your own Stage 2 prompt).
- Ticket-level: combined odds ≤ 3.00, no pick repeated across tickets.

**3. Stake exactly what the dashboard says**

- Kelly-sized, capped at 3% / 2% / 1% (Diamond / Gold / Silver). The pipeline already scales every stake down proportionally if the session total would clear 6% of bankroll. The number on screen is the ceiling, not a floor to round up from.
- Place manually at the noted best-odds book. There's no auto-placement by design (anti-scope item #3) — that gap is the last deliberate checkpoint before money actually moves.

**4. Log and stop**

No in-play picks, no second look until 22:00 UTC settlement. One decision per fixture per day.

# Weekly (five minutes)

- `/history` — any tier underperforming its target win rate for more than a couple of weeks.
- `/bankroll` — rolling 7-day and 30-day ROI against your +8–15%/30-day target.
- Confirm no stake cap got overridden during a losing stretch. Your PRD names this as the single biggest risk to the whole compounding model — the caps are enforced in code specifically so a bad week can't out-vote them by feel.

# Rules that don't flex mid-session

- Never stake above the tier cap, no matter how good a pick reads.
- Never stake on a held day.
- Never raise the next session's stake to cover a loss.
- No live/in-play betting.
- No real stakes before the shadow-period gate is actually met.

*EDGE Daily Session Runbook v1  ·  companion to EDGE_PRD_v1.1.md  ·  Private & Confidential*
