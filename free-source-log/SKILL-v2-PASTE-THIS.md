---
name: edge-daily-picks
description: Primary daily EDGE picks pipeline (free sources), MULTI-SPORT — QUALITY OVER QUOTA: only stakes picks that clear a real edge bar. Sport-agnostic scan (soccer, MLB, NBA/WNBA, tennis, NHL, NFL, MMA, F1, golf, cricket), per-sport model modules, Convergence Method for no-model sports, cross-sport mixed tickets, plain-language "how to play" output. No fabricated odds/EV/CLV.
---

You are running the daily picks pipeline for Patrick's personal sports-analysis project, EDGE, at /Users/USER/Desktop/edge. This is the PRIMARY daily research system on days the paid pipeline (inngest/daily-pipeline.ts, Mon/Thu only) isn't running. Treat it seriously — maximum real effort, not a lesser fallback.

FIRST, READ THESE (in order) and follow them as the authoritative spec:
1. /Users/USER/Desktop/edge/free-source-log/README.md — context and conventions
2. /Users/USER/Desktop/edge/free-source-log/ENGINE.md — the full multi-sport engine (v2.0): the whole-board scan, the per-sport model modules, the Convergence Method, cross-sport tickets, and the required outputs. THIS FILE GOVERNS THE RUN.
3. /Users/USER/Desktop/edge/free-source-log/PICK-RESILIENCE.md — the discipline that stops the run collapsing to 1X2 or over-rejecting on a price conflict / "rusty league" / missing price.

GOAL EVERY RUN: scan the WHOLE live sporting board across ALL sports (never default to soccer), surface every genuine +edge pick, and assemble UP TO 3 tickets of 3 legs each from picks that clear the staking bar. QUALITY BEATS THE QUOTA — 1 ticket, a few singles, or occasionally nothing are all correct, complete results. Never pad a ticket with a no-edge anchor.

CORE DISCIPLINE (unchanged, non-negotiable):
- Two bars: QUALIFY = ≥4/6 signals positive + a real quoted price (worth listing). TICKET-ELIGIBLE = qualifies AND computed Model Edge ≥ +4% at the best real price. Only ticket-eligible picks become ticket legs. No-value favorites are listed "no value — not for staking" and NEVER ticketed.
- Never invent a pick, a price, or a signal. If a market has no real quoted price, it does not qualify — never estimate or fabricate one.
- Model Edge is always labeled as edge against THIS pipeline's own estimate — NEVER EV vs Pinnacle, NEVER CLV, NEVER a claimed line-movement/sharp-vs-public feed (no data for those).
- Any edge > ~+10% triggers a re-check vs the consistent market price and a sensitivity sweep; if it flips under plausible inputs, tier it Moderate and size down.
- Tiers are ONLY "Strong" (5-6/6 + confirmed price + real module model) or "Moderate" (4/6, or ANY Convergence-Method pick). Never DIAMOND/GOLD/SILVER.

MULTI-SPORT SCAN (Step 0 of ENGINE.md): each run, verify live via search what is actually on today/tomorrow across soccer, baseball, basketball, tennis, hockey, American football, combat sports, motorsport, golf, cricket — and pick the highest-signal, best-covered events by DATA QUALITY, not by sport habit. Verify in-season status live (this instruction ages). Model each priceable event with its per-sport module in ENGINE.md §2 (soccer Poisson/Dixon-Coles; MLB Pythagorean+log5+starter/park; basketball net-rating/pace; tennis serve/Elo; NHL; NFL). For sports with no defensible free-data model (MMA, F1, niche, large golf fields), use the CONVERGENCE METHOD in ENGINE.md §2.7 — anchor on de-vigged multi-book consensus, score independent evidence lines, apply a bounded (±8%) adjustment, and fire ONLY on convergence (≥3 independent lines agree); label it a "Convergence estimate," never a model or EV number; cap tier at Moderate. Never fake a Poisson on a non-goals sport.

CROSS-SPORT TICKETS (Step 5 of ENGINE.md): mixed-sport tickets ARE allowed — each leg must independently be ticket-eligible AND the legs must be uncorrelated (check for same-event / shared-driver correlation before combining). Enforce market variety; combined odds ideally ≤3.00 but NEVER swap in a no-edge anchor to hit it. Fewer than enough legs → build the tickets the pool honestly supports and list the rest as singles.

PLAIN-LANGUAGE OUTPUT (Step 6.5 of ENGINE.md — REQUIRED every run): besides the analytical write-up, produce a player-facing HOW-TO-PLAY-{YYYY-MM-DD}.md and lead the chat summary with it. For each pick and each ticket, in plain words: the bet in one sentence, how it shows at the sportsbook, American odds + a "$100 wins $X" example, start time (ET) and teams/players, one-sentence why, exactly what has to happen to win (and what LOSES it for spreads/totals), confidence tier, and a stake steer. Tickets shown as a numbered slip with combined odds, "$100 → $X" payout, and "all legs must win." If not enough legs for a ticket, say so plainly and play as singles — never pad. Test: a friend who's never read a betting model must be able to place the bet from your output alone.

OUTPUT FILES (Step 7): write the full analytical write-up to /Users/USER/Desktop/edge/free-source-log/{YYYY-MM-DD}.md (scan reasoning across all sports; per-pick signals; each module's inputs/outputs; Convergence tables where used; ticket-eligible vs no-value picks with sport + market type; tickets or singles). Write the plain-language HOW-TO-PLAY-{YYYY-MM-DD}.md. Save model code as {model}_{YYYY-MM-DD}.py. Then reply with the plain-language summary first, analytics second.

Every output opens with this line verbatim: "Free-source pipeline — model-based edge against this pipeline's own probability estimate, not EV vs Pinnacle. Prices are single/multi-source search results, not aggregated best-of-book. Verify your own price before staking."

HARD BOUNDARY: never write to the Supabase database, and never write to any file inside /Users/USER/Desktop/edge that looks like production app code (app/, lib/, pipeline/, server/, inngest/, supabase/, components/, types/). This task ONLY ever writes inside /Users/USER/Desktop/edge/free-source-log/. If unsure whether a write target is safe, don't write — report in chat.
