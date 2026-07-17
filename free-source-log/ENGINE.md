# EDGE free-source engine — multi-sport (v2.0, 2026-07-16)

**This is the authoritative pipeline spec. Every `edge-daily-picks` run reads this file
(and `PICK-RESILIENCE.md`) right after the README, and follows it top to bottom.**

v2.0 is a top-down rewrite that makes the engine **sport-agnostic**. Previous versions
were soccer-only. The core discipline is unchanged: real computation where a real method
exists, never an invented pick/price/signal, edge always labeled against *this pipeline's
own estimate* (never EV vs Pinnacle or CLV), Strong/Moderate tiers only, and all writes
confined to `free-source-log/`.

> **Standard opening line for every output (verbatim):**
> "Free-source pipeline — model-based edge against this pipeline's own probability
> estimate, not EV vs Pinnacle. Prices are single/multi-source search results, not
> aggregated best-of-book. Verify your own price before staking."

---

## GOAL (unchanged from v1)

Surface every genuine +edge pick across the day's board, and assemble UP TO 3 tickets of
3 legs each from picks that clear the staking bar. **Quality beats quota.** 1 ticket, a
few singles, or nothing are all correct outputs. Never pad with no-edge favorites; never
invent anything. What's new in v2 is *breadth of sport*, not a change to the discipline.

---

## STEP 0 — SCAN THE WHOLE BOARD, ALL SPORTS (new)

Do not default to soccer. Each run, find what is actually live **today and tomorrow**
across the full sporting calendar and pick the highest-signal, best-covered events —
wherever they are. Scan at minimum (via search — verify in-season status live, never
assume from this file, which ages):

- **Soccer** — WC/continental tournaments when live; MLS, NWSL, Liga MX, Brazil Série A, European leagues in season; UEFA qualifiers.
- **Baseball** — MLB (Apr–Oct), plus NPB/KBO where covered.
- **Basketball** — NBA (Oct–Jun), WNBA (May–Sep), EuroLeague, major internationals.
- **Tennis** — ATP/WTA tour events and Slams (near year-round); check the current week's tournaments.
- **American football** — NFL (Sep–Feb), major college (Aug–Jan).
- **Hockey** — NHL (Oct–Jun).
- **Combat** — UFC/MMA cards, major boxing.
- **Motorsport** — F1 (Mar–Dec) and other series on race weekends.
- **Cricket** — IPL, internationals, The Hundred, where free data supports it.

**Selection rule:** rank candidate events by (a) data quality on free sources and
(b) whether a defensible probability can be produced. Prefer a well-modeled MLB or tennis
match over a data-thin soccer minnow tie. Report in Step 1 what was live and why you chose
what you chose. Aim to evaluate enough events across enough sports to genuinely staff the
day — but never at the cost of quality.

---

## STEP 1 — PER-EVENT RESEARCH (sport-appropriate)

For every candidate event, gather the real inputs its sport's model needs (see Step 2
modules) plus, always: recent form/results with opponent/context, injuries or absences
(confirmed lineups/starters/scratches), situational factors (rest, travel, altitude,
weather, surface, motivation/stakes), head-to-head where meaningful, and **real quoted
prices across SEVERAL books** for the full relevant market menu — recording the spread and
using best-of-book for the edge calc. Flag any market with only one source (lone outliers
are often stale). **If no real price exists for a market, it does not qualify — never
estimate or invent one.** JS-heavy sites (Sofascore, Flashscore) often won't fetch — rely
on search snippets rather than assuming a fetch worked.

---

## STEP 2 — MODEL THE EVENT (per-sport modules)

Use the right method for the sport. Show inputs and math; state limitations honestly.
**Class A** = derivable from the module's model. **Class B** = researched-only (props,
cards, corners, etc.), scored on their own data, never dressed as model output.

### 2.1 Soccer (unchanged, proven)
Opponent-adjusted attack/defence ratings, shrunk to league mean (k≈5–6), independent
Poisson matrix, **Dixon-Coles low-score correction (ρ = −0.13, fixed literature value,
NOT fitted)**. Read 1X2, double chance, all totals, team totals, handicaps,
winning-margin, BTTS off the corrected matrix. Corners = separate corners-Poisson (coarse).
Cards = researched + referee cards/game. Props = P(anytime) ≈ 1 − exp(−player share of xG).

### 2.2 Baseball / MLB
- **Win prob:** log5 from each team's quality, park- and pitcher-adjusted. Start from
  each team's runs-scored/allowed → Pythagorean expectation (exponent ≈ 1.83) for a
  baseline win rate, then adjust for the **named starting pitchers** (ERA/FIP, recent form)
  and bullpen, and home advantage (~+3–4%). log5: P(A) = (a − a·b)/(a + b − 2·a·b).
- **Totals (over/under runs):** blend both starters' run-suppression and both offenses'
  runs/game, park factor, and weather (wind/temp). Report expected total, compare to line.
- **Run line (−1.5/+1.5):** derive from a runs-margin distribution (negative-binomial or
  empirical MLB margin table), not a coin flip.
- Class B: strikeout props, first-to-score, NRFI/YRFI from real recent rates only.
- Limits: no Statcast feed; bullpen usage/lineup cards may change late — state it.

### 2.3 Basketball / NBA / WNBA / EuroLeague
- **Win prob & spread:** each team's net rating (points per 100) and pace; expected
  margin = (off_rtg_A − def_rtg_B) − (off_rtg_B − def_rtg_A), scaled to possessions, plus
  home advantage (~2.5–3 pts NBA, ~2 WNBA). Convert margin→win prob with the empirical
  NBA margin SD (~11–12 pts, normal approx).
- **Total:** pace × combined efficiency → expected points, compare to line.
- Class B: player points/rebounds/assists props from real season+recent usage and the
  specific matchup, minutes confirmed. Rest/back-to-back and injury-driven usage shifts
  are primary — weight them.
- Limits: injury/load-management news moves lines fast; confirm status same-day.

### 2.4 Tennis (ATP/WTA)
- **Match win prob:** surface-weighted Elo if computable from recent results, else a
  serve/return model — P(hold) for each player from serve stats, combined into set/match
  probability. Adjust for surface, recent form, head-to-head, fatigue (matches in legs,
  travel, altitude), and confirmed fitness.
- **Markets:** match winner, set handicap (−1.5/+1.5 sets), total games, over/under sets.
- Limits: single-elimination variance is high; withdrawals/retirements are a real tail —
  never stake into a fitness cloud.

### 2.5 Hockey / NHL
- Low-scoring Poisson (goals ≈ 2.9/team baseline) with team goals-for/against rates,
  starting-goalie adjustment (save %), home ice. Markets: moneyline, puck line (±1.5),
  total. Goalie confirmation is decisive — state if unconfirmed.

### 2.6 American football (NFL/college)
- Power-rating/efficiency margin (EPA-based if available, else points-for/against
  adjusted for opponent) → spread and win prob via the NFL margin SD (~13.5 pts). Totals
  from pace + efficiency + weather. Injuries (esp. QB) are primary. Limits: weekly samples
  are tiny — lean on season-long ratings and be humble.

### 2.7 NO-MODEL SPORTS — the **Convergence Method** (novel, for MMA / boxing / F1 / niche)
When no textbook statistical model can be built on free data, do **not** fake a Poisson and
do **not** punt to vibes. Use this explicit, repeatable procedure:

1. **Anchor on market consensus.** Pull the event's price from *several* books, convert to
   implied probability, and **de-vig** (normalize so the two/field sides sum to 100%). This
   de-vigged consensus is the crowd's best estimate and the honest starting point.
2. **Score independent evidence lines**, each rated −2…+2 for how strongly it favors a side,
   with a documented reason and source. Use only lines that are genuinely independent:
   - Recent form / quality trend (last 3–5 outings vs level of opposition)
   - Matchup/style factors (styles-make-fights; track/car fit; surface; conditions)
   - Situational (short-notice, weight cut, travel, rest, altitude, weather, motivation/stakes)
   - Confirmed availability/fitness/equipment
   - Sharp/consensus movement you can actually observe (opener → current across books)
3. **Blend into an adjusted probability.** Start from the de-vigged consensus p₀. Apply a
   **bounded** adjustment: p = p₀ + k · (weighted evidence score), where k is small
   (default 0.03 per net evidence point) and the total shift is **capped at ±8%** unless a
   confirmed, decisive fact (e.g. a withdrawal) justifies more. This keeps the method
   anchored to reality — it nudges the crowd, never overrides it on a hunch.
4. **Require CONVERGENCE to fire.** Produce a pick ONLY if (a) at least **3 independent
   evidence lines point the same direction**, and (b) the adjusted p beats the best real
   price by the staking bar. If the evidence lines disagree, output **no pick** — divergence
   is a signal to stand down, not to guess.
5. **Label honestly.** The number is a **"Convergence estimate,"** never a statistical
   model output, never EV vs Pinnacle. Report p₀, the evidence table, the adjustment, the
   final p, and an explicit uncertainty note. Tier caps at **Moderate** — a convergence
   pick can never be Strong, because it lacks a mechanistic model.

The Convergence Method's whole safety comes from being anchored + bounded + agreement-gated:
it can find value the crowd underweights, but it is structurally incapable of manufacturing
a large fake edge from thin air.

---

## STEP 3 — SIX SIGNALS per pick (sport-adapted)
Score, per market (two markets on one event can differ): **Form, Matchup/H2H,
Situational (home/away, rest, surface, weather), Availability (injuries/lineups/scratches),
Model** (the sport module's estimate; for no-model sports, the Convergence estimate; or
"n/a" for a class-B market with no model), and **Odds Check** (does best price roughly match
what the other signals imply — a sanity check, not an EV calc). Mark any signal with no real
data "unknown" — never guessed. Do NOT claim line-movement/sharp-vs-public or EV-vs-Pinnacle
as signals — no feed for them (exception: the Convergence Method may cite *observable*
open→current movement across books as ONE evidence line, clearly as that, not as a sharp feed).

---

## STEP 4 — QUALIFY, EDGE, RANK
- **Qualify** = ≥4/6 signals positive AND a real quoted price exists. (Worth listing.)
- **Model Edge** = (pipeline probability × best real decimal odds) − 1. Class A / module
  models for modeled sports; Convergence estimate for no-model sports (labeled as such);
  no defensible estimate → qualitative lean with NO edge number.
- **Ticket-eligible** = qualifies AND Model Edge ≥ **+4%** at best real price. Only these
  become ticket legs. Below +4% → listed but marked "no value — not for staking."
- **Large-edge guard (from PICK-RESILIENCE):** any edge >~+10% triggers a re-check vs the
  consistent market price and a sensitivity sweep of the key inputs. Flips under plausible
  inputs → Moderate + size down.

---

## STEP 5 — ASSEMBLE UP TO 3 TICKETS (cross-sport allowed)
3 legs each, drawn only from ticket-eligible picks, no pick repeated.
- **Mixed-sport tickets are allowed** — a ticket may combine e.g. a soccer handicap, an MLB
  run line, and a tennis pick, provided each leg is independently ticket-eligible and the
  legs are **uncorrelated**. Explicitly check for hidden correlation before combining:
  same event, same game's total & side, same player across prop families, or two outcomes
  driven by one shared factor (e.g. weather pushing two overs in the same city) must NOT
  share a ticket.
- Enforce variety (don't build three near-identical totals legs; ≤1 straight moneyline-type
  leg per ticket where possible). Combined odds ideally ≤3.00 but NEVER swap in a no-edge
  anchor to hit it.
- Ticket 1 "Highest Conviction" (best signal counts), Ticket 2 "Best Model Edge",
  Ticket 3 "Diversified" (different sports/markets). Fewer than 9 eligible picks → build as
  many complete 3-leg tickets as the pool honestly supports, list the rest as singles.

---

## STEP 6 — LABELING (hard rules)
Tiers: **Strong** (5–6/6 + confirmed price + real module model) or **Moderate** (4/6, or any
Convergence-Method pick regardless of signal count). Never DIAMOND/GOLD/SILVER. Never print a
number claiming to be EV vs Pinnacle or CLV. Open every output with the verbatim line above.

---

## STEP 6.5 — PLAIN-LANGUAGE "HOW TO PLAY" (required every run)

The analytical write-up is for the record. The **player-facing output** must be dead
simple. Every run, produce a `HOW-TO-PLAY-{YYYY-MM-DD}.md` (and lead the chat summary
with the same) that a non-analyst can act on without decoding jargon. For **each pick and
each ticket**, state in plain words:

- **The bet in one sentence** ("St. Louis wins by 2+ goals"), NOT just the market code.
- **How it appears at the sportsbook** (e.g. "St. Louis −1.5", "Mets Moneyline") so they
  can find it.
- **Odds** in American form + a "$100 wins $X" example.
- **Start time** (ET) and the two teams/players.
- **Why** (one plain sentence).
- **What has to happen to win**, and — for spreads/handicaps/totals — what LOSES it
  (e.g. "if they only win by 1, this loses").
- **Confidence** (Strong / Moderate) and a stake steer (e.g. "smaller stake").

**Tickets:** if 3+ eligible uncorrelated legs exist, present the ticket as a numbered
slip: each leg in the plain format above, then the **combined odds**, a "$100 → $X"
payout, and the one-line reminder that **all legs must win**. Include a quick-reference
table. If NOT enough legs for a ticket, say so in one plain sentence ("Only N picks
cleared the bar; a parlay needs 3, so play these as singles") and never pad a ticket to
look complete. Optionally note the parlay payout for the singles as "higher risk, not
recommended" so the choice is theirs.

Rule of thumb: if a friend who has never read a betting model couldn't place the bet from
your output alone, it isn't done.

## STEP 7 — OUTPUT (analytical record)
Write the full write-up to `free-source-log/{YYYY-MM-DD}.md`: Step-0 scan (what was live
across all sports, what you chose and why); per-pick signals; each model's inputs/outputs
(module used, ratings, probabilities; Convergence tables where used); ticket-eligible vs
no-value picks with market type and sport; the tickets or singles. Then reply in chat with a
concise summary (events/sports scanned, qualified vs ticket-eligible counts, the tickets/
picks with tier, sport, market, edge, one-line reasoning). Save any model code as
`{model}_{YYYY-MM-DD}.py`.

---

## HARD BOUNDARIES (unchanged)
Never write to Supabase. Never write to production app code (app/, lib/, pipeline/, server/,
inngest/, supabase/, components/, types/). This pipeline writes ONLY inside
`/Users/USER/Desktop/edge/free-source-log/`. Never invent a pick, price, or signal. Never
claim EV vs Pinnacle / CLV / a sharp-money feed. When unsure whether a write target is safe,
don't write — report in chat.
