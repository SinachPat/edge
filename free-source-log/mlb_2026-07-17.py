#!/usr/bin/env python3
"""
EDGE free-source pipeline — MLB module, 2026-07-17.
Primary candidate: Detroit Tigers @ LA Angels (Skubal vs Detmers), Tigers ML -104.
Method (ENGINE.md 2.2): Pythagorean baseline win rate from team RS/RA, adjusted
for the NAMED starting pitchers (ERA/FIP vs league), plus home advantage.
Totals: blend both starters' run-suppression and both offenses' runs/game vs the line.

All inputs are real season figures pulled from search snippets (baseball-reference /
ESPN / covers, mid-July 2026). Sources logged in the dated .md. No Statcast feed;
bullpen/lineup cards can change late — stated as a limitation.
"""
import math

LEAGUE_RPG = 4.45  # approx MLB average runs/team/game 2026 (used as pitcher baseline)

def pythag_winrate(rs, ra, exp=1.83):
    return rs**exp / (rs**exp + ra**exp)

def log5(a, b):
    # prob team A (rate a) beats team B (rate b), both = expected win rates vs avg
    return (a - a*b) / (a + b - 2*a*b)

def american_from_dec(dec):
    if dec >= 2.0:
        return f"+{round((dec-1)*100)}"
    return f"{round(-100/(dec-1))}"

def implied_from_american(ml):
    if ml < 0:
        return -ml / (-ml + 100)
    return 100 / (ml + 100)

# ---------------------------------------------------------------------------
# TIGERS @ ANGELS
# ---------------------------------------------------------------------------
# Season run data (approx, mid-July 2026):
# Tigers: 407 RS / 383 RA over ~96 g  -> Pythag baseline win rate
# Angels: 430 RS / 485 RA over ~93 g
det_rs, det_ra = 407, 383
laa_rs, laa_ra = 430, 485

det_pythag = pythag_winrate(det_rs, det_ra)
laa_pythag = pythag_winrate(laa_rs, laa_ra)
print(f"Tigers Pythag win rate (team quality): {det_pythag:.3f}")
print(f"Angels Pythag win rate (team quality): {laa_pythag:.3f}")

# Baseline neutral matchup via log5 on team quality alone
base_det = log5(det_pythag, laa_pythag)
print(f"Baseline log5 (team quality only), Tigers: {base_det:.3f}")

# --- Starting pitcher adjustment -------------------------------------------
# Skubal: 3.09 ERA / 3.06 FIP, elite (30% K, 0.95 WHIP). Well below lg avg ~4.10.
# Detmers: 3.93-4.13 ERA but strong peripherals (FIP ~2.91, xERA 2.92) -> also good.
# Use a blended run-prevention rate per pitcher (weight ERA & FIP), convert the
# gap vs league into a win-prob shift. A ~1 run/9 edge to a starter is ~ +7-9% over
# ~6 innings of a 9-inning game; we apply it conservatively (starter throws ~60% of gm).
lg_pitch = 4.10
skubal = 0.5*3.09 + 0.5*3.06      # = 3.075
detmers = 0.5*4.03 + 0.5*2.91     # = 3.47  (ERA midpoint 4.03, FIP 2.91)
print(f"\nSkubal blended run rate: {skubal:.2f}  |  Detmers blended: {detmers:.2f}")

# Pitcher edge to Detroit = Detmers allows more than Skubal (positive => Det favored)
# Gap in runs/9 that the STARTER contributes; scale by fraction of game & a
# runs->winprob slope (~0.033 win prob per 0.1 run of expected margin near 50%).
starter_gap = detmers - skubal            # +0.395 runs/9 in Detroit's favor
frac_game = 0.60                          # starter throws ~60% of the game
margin_runs = starter_gap * frac_game     # expected run-margin contribution from SPs
# runs -> win prob: near a coin flip, ~1 run of margin ~ +0.11 win prob (MLB)
winprob_per_run = 0.11
pitch_shift = margin_runs * winprob_per_run
print(f"Starter run gap: {starter_gap:.2f}/9  -> margin contribution {margin_runs:.2f} runs "
      f"-> win-prob shift +{pitch_shift:.3f} to Tigers")

# --- Home advantage --------------------------------------------------------
# Angels are HOME. Home edge ~ +3.5% to the home side.
home_edge = 0.035
det_prob = base_det + pitch_shift - home_edge
print(f"\nAfter starters (+{pitch_shift:.3f}) and Angels home (-{home_edge:.3f}): "
      f"Tigers win prob = {det_prob:.3f}")

# --- Edge vs market --------------------------------------------------------
det_ml = -104
det_dec = 1 + 100/104
mkt_imp = implied_from_american(det_ml)
edge = det_prob * det_dec - 1
print(f"\nTigers ML {det_ml} (dec {det_dec:.3f}), market implied {mkt_imp:.3f}")
print(f"Model Tigers win prob {det_prob:.3f}")
print(f"MODEL EDGE (Tigers ML) = {edge*100:+.1f}%")

# --- Sensitivity sweep (PICK-RESILIENCE Rule 3) ----------------------------
print("\n--- Sensitivity sweep on Tigers win prob ---")
for adj in (-0.04, -0.02, 0.0, 0.02, 0.04):
    p = det_prob + adj
    e = p*det_dec - 1
    print(f"  p={p:.3f}  edge={e*100:+.1f}%")

# ---------------------------------------------------------------------------
# TOTAL (line 9.0)
# ---------------------------------------------------------------------------
# Expected runs: blend each offense's RPG suppressed by the opposing starter.
det_rpg = det_rs / 96
laa_rpg = laa_rs / 93
# Starter suppression factor vs league (lower ERA => suppresses more)
det_off_vs_detmers = det_rpg * (detmers / lg_pitch)   # Tigers scoring vs Detmers
laa_off_vs_skubal  = laa_rpg * (skubal / lg_pitch)    # Angels scoring vs Skubal
# Note: only the starter portion (~60%), bullpen reverts toward team RA for rest
det_exp = det_off_vs_detmers*0.6 + det_rpg*0.4
laa_exp = laa_off_vs_skubal*0.6 + laa_rpg*0.4
total_exp = det_exp + laa_exp
print(f"\n--- TOTAL ---")
print(f"Tigers RPG {det_rpg:.2f}, Angels RPG {laa_rpg:.2f}")
print(f"Expected: Tigers {det_exp:.2f} + Angels {laa_exp:.2f} = {total_exp:.2f} vs line 9.0")
