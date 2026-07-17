# PICK-RESILIENCE — the "look at the data, don't collapse the board" discipline

**Read this at the start of every `edge-daily-picks` run, right after the README.**
It exists because two opposite failure modes both produce bad days:
1. **Padding** — forcing weak short-favorite anchors into tickets to hit a quota. (Guarded by the +4% bar.)
2. **Over-rejection** — letting one problem (a price conflict, "the league is rusty", a missing prop price) wipe the whole board so you report "nothing" when a real edge existed in a market you never priced. **This file targets #2.**

A top-tier analyst does not stop at "who wins." They price the *whole fixture* and let the numbers pick the market. Encode that here.

---

## Rule 1 — Every serious fixture gets the FULL menu, every time

For each candidate fixture, you must *compute or research and price* — not just glance at — all of these before deciding it has no pick:

**Class A (read off the SAME corrected Poisson matrix — free once you've built it):**
- 1X2, **Double Chance (1X / 12 / X2)**
- Over/Under **1.5 / 2.5 / 3.5**
- **Team totals** (each side O/U 0.5 / 1.5)
- **Handicaps** (−1.5 / +1.5, Asian & European) ← *value against a lopsided mismatch lives here*
- Winning-margin / correct-score leans, BTTS

**Class B (research real data, price separately, label coarse — NEVER faked as goals-model output):**
- **Corners** — each side's corners-for/against; if you have real rates, build a corners-Poisson (labelled as such)
- **Cards/bookings** — both sides' cards/fouls per game **AND the appointed referee's cards/game** (primary driver)
- **Player props** — anytime/first scorer, shots on target for *nailed-on starters only*, from real recent rates: P(anytime) ≈ 1 − exp(−player's share of team xG)

If you catch yourself concluding "no pick" having only looked at 1X2 / BTTS / O2.5, **STOP — you have not done the work.** Go price the handicap, the team total, and the class-B markets first.

---

## Rule 2 — A problem kills only the market it touches, not the fixture

- **Moneyline price conflict** (books disagree wildly) → the *moneyline* doesn't qualify. It says nothing about handicaps, team totals, corners, cards, or props on that same fixture. Price those anyway.
- **"The league is rusty / off a long break"** → this is a reason to (a) shrink harder (raise k to ~6), (b) lean on season-long rates over a noisy 5-game window, and (c) prefer **relative-mismatch** markets (a bad away side, a corner gap) that survive *symmetric* rust — NOT a reason to skip the fixture. Rust hits both teams; edges built on one team being structurally worse than the other still stand.
- **No confirmed price for a market** → that specific market can't be ticketed (never invent a price). Note it as a research lead and move on; it does not condemn the fixture.

---

## Rule 3 — A big edge triggers a sensitivity check, not celebration

Any Model Edge above ~+10% is as likely to be a model artifact as free money. Before trusting it:
- **Re-derive against the market's implied probability.** If your model wildly disagrees with a *consistent* market price, suspect your model first (the +46% "Washington ML" artifact on 2026-07-16 came from a stale price, not value).
- **Run an xG sensitivity sweep** (±0.2–0.3 on each side's xG). If the edge stays ≥+4% across most of the grid → robust, can be Strong. If it flips sign across plausible inputs → it's **Moderate at best, size down**, and say so in the writeup. (St. Louis −1.5 on 2026-07-16: +17% central but negative if StL xG ~2.2 → correctly tiered Moderate.)

---

## Rule 4 — Verify the fixture is actually UN-played

Check the local clock and confirm kickoff is in the future before pricing anything. A settled result is not a pick. (On 2026-07-16 the "anchor" NWSL game had already finished 1-0 by run time.)

---

## Rule 5 — Correlated same-fixture legs can't share a ticket, but each can be a single

If the only +4% picks you found are several markets inside one fixture (e.g. team-total Over + −1.5 + corners), they're correlated: take the single best one as a standalone pick. Don't stack them into a fake "ticket," and don't discard the good one just because it has no uncorrelated partner. **One strong single is a complete, correct output.**

---

## The one-line test
Before writing "0 picks" or "no value," ask: *"Have I priced the handicap, both team totals, the double chance, corners, cards, and a headline prop on every live fixture — or did I stop at who wins?"* If the honest answer is the latter, the run isn't finished.
