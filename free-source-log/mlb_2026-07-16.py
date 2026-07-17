# MLB module (ENGINE.md 2.2): Pythagorean baseline + log5 + starter/park adjustment
# Mets @ Phillies, 2026-07-16, second-half opener, Citizens Bank Park (hitter-friendly)
import math

def log5(a,b):  # P(A beats B) given each's true win rate vs avg
    return (a - a*b)/(a + b - 2*a*b)

# --- Team baselines (season records; runs rates approximate from record + context) ---
# Phillies 54-43 (.557), strong offense (Schwarber 32HR, Harper), elite closer, weak middle relief
# Mets 40-57 (.412), Soto is elite but team well below .500
phi_wpct = 54/97
nym_wpct = 40/97
# Regress toward .500 slightly (pythag noise) - modest shrink
def shrink_wp(w, k=25, n=97): return (n*w + k*0.5)/(n+k)
phi_base = shrink_wp(phi_wpct); nym_base = shrink_wp(nym_wpct)
print(f"Base win% (shrunk): PHI {phi_base:.3f}  NYM {nym_base:.3f}")

# --- Starting pitcher adjustment (the crux) ---
# Christian Scott (NYM): 3.17 ERA, hot (2.79 last 2 starts), beat PHI already this yr (2R/4.1ip)
# Aaron Nola (PHI): 5.75 ERA season, 5.72 over 8 starts since May - struggling badly
# Convert ERA gap to a win-prob shift. League ~ 4.10 ERA. 
# A starter ~1 run better than league over ~6ip is worth ~ +8-10% single-game win prob.
lg_era = 4.10
scott_era, nola_era = 3.17, 5.75
# run-prevention edge for the START (cap influence; SP ~55-60% of run prevention on the day)
# Each 1.00 ERA better than opponent's starter ~ +0.06 win prob (empirical-ish), here diff = 2.58
era_diff = nola_era - scott_era  # +2.58 favors Mets
sp_shift = min(0.14, 0.055*era_diff)  # cap at +14% to avoid overreach
print(f"Starter ERA: Scott {scott_era} vs Nola {nola_era}, diff {era_diff:+.2f} -> Mets SP shift +{sp_shift*100:.1f}%")

# Base game win prob via log5 (team quality), then apply starter shift toward Mets, then home edge
p_phi_teams = log5(phi_base, nym_base)
home_edge = 0.035  # Phillies home ~ +3.5%
p_phi = p_phi_teams + home_edge - sp_shift
p_phi = max(0.05, min(0.95, p_phi))
p_nym = 1 - p_phi
print(f"\nlog5 team-only PHI win: {p_phi_teams*100:.1f}%")
print(f"After +home {home_edge*100:.1f}% and -starter {sp_shift*100:.1f}%: PHI {p_phi*100:.1f}% / NYM {p_nym*100:.1f}%")

def devig(dec_a, dec_b):
    ia, ib = 1/dec_a, 1/dec_b
    s = ia+ib
    return ia/s, ib/s

# Prices: PHI -136 (1.735), NYM +113 (2.13). Run line NYM +1.5 (-180=1.556), PHI -1.5 (+145=2.45)
phi_dec, nym_dec = 1.735, 2.13
imp_phi, imp_nym = devig(phi_dec, nym_dec)
print(f"\nMarket de-vigged: PHI {imp_phi*100:.1f}%  NYM {imp_nym*100:.1f}%")

def edge(p,d): return p*d-1
print("\n--- Edges (ML) ---")
print(f"Mets ML @2.13 (+113): model {p_nym*100:.1f}% -> edge {edge(p_nym,2.13)*100:+.1f}%")
print(f"Phillies ML @1.735 (-136): model {p_phi*100:.1f}% -> edge {edge(p_phi,1.735)*100:+.1f}%")

# Run line: Mets +1.5 - correlated with ML but a safer expression if Mets ~ coin flip
# P(Mets win or lose by exactly 1). In MLB ~ +1.5 dog covers ~ P(win) + ~0.28 (1-run loss share)
p_nym_cover15 = p_nym + 0.27*(1-p_nym)  # ~27% of Phillies wins are by 1 run
print(f"\nMets +1.5 model ~{p_nym_cover15*100:.1f}% @1.556 (-180): edge {edge(p_nym_cover15,1.556)*100:+.1f}%")

# Total: 9.5 at CBP (hitter park), both bullpens shaky behind, Nola hittable, Soto/Schwarber/Harper bats
# Expected total: lean over given Nola's struggles + park, but Scott suppresses one side.
# Rough expected runs: PHI offense vs Scott ~4.2, NYM offense vs Nola ~5.0 -> ~9.2 expected
exp_total = 9.2
print(f"\nTotal: expected ~{exp_total} vs line 9.5. Over 9.5 @ ~1.95: model P(over)~48% -> slight under lean, no clear edge")

print("\n--- Sensitivity on Mets ML edge (starter shift & home edge) ---")
for sp in [0.08,0.11,0.14]:
    for he in [0.03,0.04]:
        pn = 1-max(0.05,min(0.95,p_phi_teams+he-sp))
        print(f"  SP+{sp*100:.0f}% home{he*100:.0f}%: Mets {pn*100:.1f}% edge@2.13 {edge(pn,2.13)*100:+.1f}%")
