# EDGE free-source pipeline — process change log

A running record of changes to the `edge-daily-picks` research process (the free-source pipeline that produces the dated files in this folder). Newest entries first.

---

## 2026-07-14 — Depth overhaul: broader markets, a real staking bar, and an upgraded model

### Why this changed
The 2026-07-14 slate exposed two related weaknesses. First, the day's picks leaned heavily on match-result (1X2) markets and under-used the rest of the board. Second — and more important — the tickets were anchored on short, high-probability favourites that carried no genuine edge: Larne to win at 1.21 modelled at **−1.5%** against the pipeline's own probability, and KuPS at 1.62 at only **+2.9%**. Those are "they should win" bets, not value bets, and in a three-leg parlay a single upset takes the whole ticket down. When a leg duly lost, the shallow, quota-driven construction was the fair thing to criticise. The changes below address both the narrowness and the lack of depth. (A losing pick is, on its own, partly variance — so the fix targets the *process*, i.e. deeper and higher-edge selection, not the single result.)

### What changed, in two parts

**1. Market breadth — stop collapsing the board to a few market types.**
The pipeline no longer defaults to only 1X2, BTTS and Over/Under 2.5. Every serious fixture is now evaluated across the full market menu, split into two clearly separated classes so rigour is never overstated:

- *Model-derived markets* are read straight off the same Poisson scoreline matrix the pipeline already builds, so they carry the same rigour Over/Under 2.5 always had: 1X2, Double Chance, Over/Under 1.5 / 2.5 / 3.5, team totals, Asian and European handicaps, winning-margin and correct-score leans, and BTTS.
- *Researched-only markets* are not derivable from a goals model and are scored on their own real data, never dressed up as model output: corners (from each side's corner rates), cards and bookings (including the appointed referee's cards-per-game, which is a primary driver), and player props such as anytime or first goalscorer, estimated only from a player's real recent scoring rate and confirmed role.

Signal-scoring and qualification now run **per market**, not per fixture, and ticket construction bans stacking two correlated legs from the same match.

**2. Quality over quota — a real staking bar, plus a genuinely deeper model.**
Two separate bars now apply:

- **Qualify** — at least four of six signals positive and a real quoted price. This only means a pick is *worth listing*.
- **Ticket-eligible** — qualifies *and* shows a computed Model Edge of at least **+4%** at the best real price found. Only ticket-eligible picks may become parlay legs.

A short favourite with roughly zero or negative edge can still be shown as a high-conviction note, but it is now explicitly marked "no value — not for staking" and can never be a ticket leg. Tickets also cap 1X2 at one leg each and will never swap in a no-edge anchor just to reach three legs or hit the ≤3.00 combined-odds target. The accepted trade-off is that some days produce one ticket, a few singles, or occasionally nothing — reported honestly rather than padded.

The model behind the edge numbers was upgraded from a naive raw-average Poisson to the standard advanced stack:

- **Opponent-strength adjustment.** Instead of raw goals-for/against averages (which are distorted by who a team happened to play — e.g. World Cup rates inflated by minnow opponents), each team gets attack and defence ratings relative to a competition baseline, adjusted for the quality of opponents faced (Maher / Dixon-Coles factorisation: expected goals = baseline × attack × opponent defence × home advantage).
- **Small-sample shrinkage.** Each rating is regressed toward the league mean with a pseudo-count of about five games, so a handful of early-season results no longer dominate the estimate.
- **Dixon-Coles low-score correction.** The independent-Poisson matrix is corrected for the known correlation at 0-0, 1-0, 0-1 and 1-1 (ρ ≈ −0.13), which sharpens BTTS and correct-score probabilities.
- **Best-of-book pricing.** Prices are screened across several bookmakers; edge is computed against the best available line, single-source markets are flagged, and a lone outlier well off the others is treated as potentially stale rather than as free value.

### Before → after

| Aspect | Before | After |
|---|---|---|
| Markets considered | Mostly 1X2, BTTS, O/U 2.5 | Full menu: results, double chance, all totals, team totals, handicaps, corners, cards, player props |
| Model | Naive raw-average Poisson (O/U 2.5 + BTTS only) | Opponent-adjusted + shrunk + Dixon-Coles–corrected; full market matrix |
| What gets ticketed | Any pick clearing 4/6 signals — including short no-edge anchors | Only picks clearing 4/6 signals **and** ≥ +4% Model Edge at best-of-book |
| No-edge favourites | Used as ticket anchors | Listed as "no value — not for staking"; never a leg |
| Pricing | Single/few sources | Best-of-book across several sources; outliers flagged |
| Daily target | Push hard for 3 tickets / 9 picks | Quality over quota — up to 3 tickets, fewer is a correct result |
| Ticket shape | Could stack 1X2 / same-match legs | ≤1 1X2 leg per ticket; no correlated same-match legs |

### What did NOT change (guardrails preserved)
The honesty discipline the pipeline was built on is fully intact. It still never invents a pick, a price or a signal; still labels edge as against *its own* statistical estimate and never as EV versus Pinnacle or a CLV figure; still refuses to claim line-movement or sharp-versus-public signals it has no feed for; still uses only the Strong (5–6/6) and Moderate (4/6) tiers, never DIAMOND/GOLD/SILVER; still opens every output with the standard verbatim disclaimer; and still writes only inside this `free-source-log/` folder. The new model additions are stated with their real limitations — ρ is a fixed literature value rather than a fitted one, opponent adjustment is coarse or impossible for obscure teams, small samples remain, and there is still no shot-level xG feed.

### When it takes effect
Live from the next scheduled run (daily, 07:07). The 2026-07-14 output was left as originally produced; these changes apply going forward.

---

---

## 2026-07-16 — Full-menu resilience (fixing over-rejection)

A run collapsed the board to 1X2/totals, hit a moneyline price conflict on an
already-played NWSL fixture, and reported "0 picks / no tickets" — while a real
**St. Louis City −1.5** handicap edge (+17% central, riding Sporting KC's 0-4-0
away record) sat un-priced. That is the *over-rejection* failure mode: the opposite
of padding, but equally a miss. A top-tier analyst prices the whole fixture, not
just who wins.

**Added `PICK-RESILIENCE.md`** (read every run, right after the README). Five rules:
1. Every serious fixture gets the FULL menu every time — class A (1X2, double chance,
   all totals, team totals, **handicaps**, BTTS off the corrected matrix) AND class B
   (corners, cards+referee, props), priced before concluding "no pick."
2. A problem kills only the market it touches — a moneyline price conflict, or "rusty
   league", never condemns the whole fixture. Rust → shrink harder (k≈6), use season
   rates, prefer relative-mismatch markets; don't skip.
3. Any edge >~+10% triggers a sensitivity sweep + a re-check vs the market's implied
   prob before it's trusted; flips-under-plausible-inputs → Moderate and size down.
4. Verify the fixture is actually un-played (check the clock) before pricing it.
5. Correlated same-fixture legs → take the single best as a standalone; one strong
   single is a complete, correct output.

Model tweak applied same day: MLS attack/defence taken off **season** per-game rates
with **k=6** shrinkage (heavier, for the WC-break layoff) rather than a noisy 5-game
window. Guardrails unchanged (no invented prices, edge vs own estimate only,
Strong/Moderate tiers, writes only inside free-source-log/).

---

## 2026-07-16 (later) — v2.0 top-down rewrite: multi-sport engine

The pipeline was soccer-only. Rewrote it top-down as a **sport-agnostic engine**
(`ENGINE.md`, now read every run). Changes:

- **Step 0 — scan the whole board, all sports** (soccer, MLB, NBA/WNBA, EuroLeague,
  tennis, NHL, NFL/CFB, MMA/boxing, F1, cricket). Pick the highest-signal, best-covered
  events by data quality, not by sport habit. Verify in-season status live each run.
- **Per-sport model modules** (Step 2): soccer Poisson/Dixon-Coles (unchanged); MLB
  (Pythagorean + log5 + starter/park/weather, run-line margin dist); basketball
  (net-rating/pace margin → win prob via margin SD); tennis (surface Elo / serve-hold);
  NHL (low-score Poisson + goalie); NFL (efficiency margin via SD). Each shows inputs +
  math + honest limits.
- **Convergence Method** for no-model sports (MMA/F1/niche) — a NOVEL but disciplined
  procedure: anchor on de-vigged multi-book consensus, score independent evidence lines
  (−2…+2 each), apply a *bounded* adjustment (±8% cap, k=0.03/pt), and **fire only on
  convergence** (≥3 independent lines agree). Labeled "Convergence estimate," never a
  model or EV-vs-Pinnacle number; tier caps at Moderate. Structurally cannot manufacture
  a large fake edge — anchored + bounded + agreement-gated.
- **Cross-sport mixed tickets allowed** (Step 5), with an explicit hidden-correlation
  check before combining legs.

Guardrails fully preserved: no invented pick/price/signal; edge vs own estimate only;
Strong/Moderate tiers; verbatim opening disclaimer; writes confined to free-source-log/.
NOTE: the live scheduled SKILL.md (installed, read-only this session) still says
"soccer-analysis"; to make v2.0 the permanent 07:07 task, paste the ENGINE.md scope into
Settings > Capabilities. Until then, runs in-session follow ENGINE.md via the README.
