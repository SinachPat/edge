#!/usr/bin/env python3
"""
EDGE free-source pipeline — Poisson expected-goals model for 2026-07-14 slate.

Method (same as prior runs):
  expected goals for a side = mean(that team's recent goals-scored rate,
                                   opponent's recent goals-conceded rate)
  Independent Poisson on each side; full 0..8 x 0..8 scoreline matrix summed
  for 1X2 / Over-2.5 / BTTS. "Advance" (2-legged/knockout) approximated as
  P(win 90') + 0.5*P(draw) i.e. draw -> 50/50 in ET/pens.

RIGOROUS rows: France, Spain, England, Argentina — real 6-game WC scoreline sets.
COARSE rows:   UCL 1Q minnow ties — no reliable 8-game scoreline dataset for
               these clubs, so lambdas are coarse priors from tie situation +
               market lines, used only as a directional cross-check. Labeled.

Limitations (stated, not hidden): small samples (6 games); NO opponent-strength
adjustment, so WC rates are inflated by earlier-round minnow opponents
(Iraq, Saudi, Jordan, Cape Verde, San Marino etc.); knockout-damped variant
shown alongside to bracket that bias. Independence assumption ignores game state.
"""
import math

def pois(k, lam):
    return math.exp(-lam) * lam**k / math.factorial(k)

def matrix(lh, la, nmax=9):
    ph = [pois(i, lh) for i in range(nmax)]
    pa = [pois(j, la) for j in range(nmax)]
    over25 = btts = hw = dr = aw = 0.0
    for i in range(nmax):
        for j in range(nmax):
            p = ph[i]*pa[j]
            if i+j >= 3: over25 += p
            if i>=1 and j>=1: btts += p
            if i>j: hw += p
            elif i==j: dr += p
            else: aw += p
    return dict(over25=over25, under25=1-over25, btts=btts,
                hw=hw, dr=dr, aw=aw, adv_h=hw+0.5*dr, adv_a=aw+0.5*dr)

def show(name, lh, la, note=""):
    m = matrix(lh, la)
    print(f"\n{name}  {note}")
    print(f"  xG: home {lh:.2f} / away {la:.2f}  (total {lh+la:.2f})")
    print(f"  Over2.5 {m['over25']*100:5.1f}%  Under2.5 {m['under25']*100:5.1f}%  BTTS {m['btts']*100:5.1f}%")
    print(f"  1X2  H {m['hw']*100:5.1f}%  D {m['dr']*100:5.1f}%  A {m['aw']*100:5.1f}%")
    print(f"  advance: home {m['adv_h']*100:5.1f}%  away {m['adv_a']*100:5.1f}%")
    return m

# ---- Tournament rates (goals for / against per game, 6 games each) ----
rates = {
    'France':    (16/6, 2/6),   # 2.67 / 0.33
    'Spain':     (11/6, 1/6),   # 1.83 / 0.17
    'England':   (13/6, 6/6),   # 2.17 / 1.00
    'Argentina': (17/6, 6/6),   # 2.83 / 1.00
}
for t,(gf,ga) in rates.items():
    print(f"{t:10s} GF/g {gf:.2f}  GA/g {ga:.2f}")

def xg(att, dfn):
    gf_a, _ = rates[att]
    _, ga_d = rates[dfn]
    return (gf_a + ga_d)/2.0

print("\n" + "="*64)
print("SEMIFINAL 1 — France v Spain (neutral venue, both traveling)")
print("="*64)
lf, ls = xg('France','Spain'), xg('Spain','France')
show("France v Spain — FULL tournament rates", lf, ls)
D = 0.82  # knockout / big-game / minnow-inflation damp
show("France v Spain — knockout-damped", lf*D, ls*D, f"(x{D})")

print("\n" + "="*64)
print("SEMIFINAL 2 — England v Argentina (neutral venue)")
print("="*64)
le, la = xg('England','Argentina'), xg('Argentina','England')
show("England v Argentina — FULL tournament rates", le, la)
show("England v Argentina — knockout-damped", le*D, la*D, f"(x{D})")

# ---- UCL 1Q second legs — COARSE priors (labeled) ----
print("\n" + "="*64)
print("UCL 1Q SECOND LEGS — COARSE priors (NOT rigorous scoreline Poisson)")
print("lambdas from class gap / aggregate state / market line only")
print("="*64)
coarse = {
    "Larne v Tre Fiori (Larne 1-0 up, home; SM amateurs)": (2.45, 0.45),
    "KuPS v Vardar (KuPS 2-0 up, home)":                   (1.85, 0.75),
    "ETO Gyor v Vikingur (ETO 0-1 down, home, chasing)":   (1.75, 0.95),
    "Iberia v Flora (Iberia 3-2 up, home; Flora -1 man)":  (1.85, 1.15),
    "Egnatia v Petrocub (1-1, Egnatia home)":              (1.45, 1.00),
    "Drita v Kauno Zalgiris (1-1, Drita home)":            (1.25, 1.15),
    "Craiova v Vitebsk (Craiova 4-1 up, home, weakened)":  (1.70, 0.80),
    "Sutjeska v Kairat (Kairat 2-1 up; Kairat away, hot)": (1.05, 1.70),  # home=Sutjeska
}
for name,(lh,lc) in coarse.items():
    show(name, lh, lc, "[COARSE]")
