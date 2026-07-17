import numpy as np
from math import exp, factorial

def pois(k, lam): return exp(-lam)*lam**k/factorial(k)

# ---------------- NWSL: Gotham (home) v Washington (away) ----------------
# Real recent scorelines (GF, GA) with opponent noted. NWSL 2026, both sides
# played continuously (no WC break). Using last ~8 competitive matches each.
# Gotham (home side):
gotham = [  # (GF,GA, opp)  most recent first
 (3,1,'Utah A'),(2,0,'KC(CC) H'),(0,2,'SanDiego A'),(1,0,'Louisville H'),
 (0,2,'Denver H'),(3,0,'Bay H'),(0,0,'Orlando H'),(2,0,'Chicago A'),
]
# Washington (away side) — hot, 8 wins in last 9:
wash = [
 (2,0,'NC A'),(2,1,'Houston H'),(2,1,'Seattle H'),(1,0,'Seattle A'),
 (4,2,'Orlando A'),(1,0,'Louisville H'),(4,0,'KC H'),(3,5,'ClubAmerica N'),
]

def rate(g):
    gf = np.mean([x[0] for x in g]); ga = np.mean([x[1] for x in g])
    return gf, ga

gf_g, ga_g = rate(gotham)
gf_w, ga_w = rate(wash)
print(f"Gotham raw GF/g={gf_g:.2f} GA/g={ga_g:.2f}")
print(f"Wash   raw GF/g={gf_w:.2f} GA/g={ga_w:.2f}")

# NWSL league baseline ~ 1.45 goals/team/game (attacking league)
baseline = 1.45
k = 5  # shrinkage pseudo-count
n = 8

def shrink_ratio(raw_per_game, base, n, k):
    raw_ratio = raw_per_game/base
    return (n*raw_ratio + k*1.0)/(n+k)

# attack = GF/baseline ; defence = GA/baseline (lower better), shrunk toward 1.0
g_att = shrink_ratio(gf_g, baseline, n, k)
g_def = shrink_ratio(ga_g, baseline, n, k)
w_att = shrink_ratio(gf_w, baseline, n, k)
w_def = shrink_ratio(ga_w, baseline, n, k)
print(f"\nRatings (baseline {baseline}, k={k}):")
print(f"Gotham att {g_att:.3f} def {g_def:.3f}")
print(f"Wash   att {w_att:.3f} def {w_def:.3f}")

home_adv = 1.10  # modest home edge; Gotham home at Citi Field
xg_home = baseline * g_att * w_def * home_adv   # Gotham
xg_away = baseline * w_att * g_def              # Washington
print(f"\nxG Gotham(home) {xg_home:.2f}, Washington(away) {xg_away:.2f}")

# Dixon-Coles corrected matrix
rho = -0.13
def dc_tau(hg, ag, lh, la, rho):
    if hg==0 and ag==0: return 1 - lh*la*rho
    if hg==0 and ag==1: return 1 + lh*rho
    if hg==1 and ag==0: return 1 + la*rho
    if hg==1 and ag==1: return 1 - rho
    return 1.0

N=10
M = np.zeros((N,N))
for i in range(N):
    for j in range(N):
        M[i,j] = pois(i,xg_home)*pois(j,xg_away)*dc_tau(i,j,xg_home,xg_away,rho)
M/=M.sum()

pH = np.tril(M,-1).sum(); pD=np.trace(M); pA=np.triu(M,1).sum()
over25 = sum(M[i,j] for i in range(N) for j in range(N) if i+j>=3)
over15 = sum(M[i,j] for i in range(N) for j in range(N) if i+j>=2)
over35 = sum(M[i,j] for i in range(N) for j in range(N) if i+j>=4)
btts = sum(M[i,j] for i in range(1,N) for j in range(1,N))
dc_1x = pH+pD   # Gotham or draw
dc_x2 = pA+pD   # Washington or draw
dc_12 = pH+pA
# team totals
g_over15 = sum(M[i,j] for i in range(2,N) for j in range(N))
w_over15 = sum(M[i,j] for i in range(N) for j in range(2,N))
g_over05 = 1-sum(M[0,j] for j in range(N))
w_over05 = 1-sum(M[i,0] for i in range(N))
# handicaps
wash_plus15 = pA+pD+sum(M[i,i-1] for i in range(1,N))  # Wash +1.5 => Wash win, draw, or lose by 1
gotham_m15 = sum(M[i,j] for i in range(N) for j in range(N) if i-j>=2)
print(f"\n1X2  Gotham/Draw/Wash: {pH*100:.1f} / {pD*100:.1f} / {pA*100:.1f}")
print(f"DC 1X (Gotham/Draw) {dc_1x*100:.1f}  X2 (Wash/Draw) {dc_x2*100:.1f}  12 {dc_12*100:.1f}")
print(f"Over1.5 {over15*100:.1f}  Over2.5 {over25*100:.1f}  Over3.5 {over35*100:.1f}")
print(f"BTTS {btts*100:.1f}")
print(f"Gotham Over1.5 {g_over15*100:.1f}  Wash Over1.5 {w_over15*100:.1f}")
print(f"Gotham Over0.5 {g_over05*100:.1f}  Wash Over0.5 {w_over05*100:.1f}")
print(f"Wash +1.5 {wash_plus15*100:.1f}  Gotham -1.5 {gotham_m15*100:.1f}")

def edge(p, dec): return p*dec-1
print("\n--- Edge vs best real prices found ---")
print(f"Over2.5 @2.10 (from +110): edge {edge(over25,2.10)*100:+.1f}%")
print(f"Under2.5 @1.645 (from -155): edge {edge(1-over25,1.645)*100:+.1f}%")
print(f"BTTS Yes @~1.75 (est only, NO firm price): would be {edge(btts,1.75)*100:+.1f}% (NOT stakeable - no confirmed price)")
print(f"Gotham DC 1X @~1.45 (est): {edge(dc_1x,1.45)*100:+.1f}%")
print(f"Gotham ML @2.10 (+110): edge {edge(pH,2.10)*100:+.1f}%")
print(f"Wash ML @4.20 (+320): edge {edge(pA,4.20)*100:+.1f}%")
print(f"Wash +0.5 @1.74 (-135): edge {edge(pA+pD,1.74)*100:+.1f}%")
print(f"Gotham -0.5 @1.95 (-105): edge {edge(pH,1.95)*100:+.1f}%")

# ---------------- Anytime scorer (class B, coarse) ----------------
# Esther Gonzalez: 28 club-record goals, elite. Rough season rate ~0.6 g/90 recently.
# Share of Gotham xG ~ 0.35
print("\n--- Class B: anytime scorer (coarse) ---")
for name, share, note in [("Esther Gonzalez",0.35,"Gotham xG share"),("Trinity Rodman",0.32,"Wash xG share, 6 goals/hot")]:
    team_xg = xg_home if 'Gotham' in note else xg_away
    px = 1-exp(-share*team_xg)
    print(f"{name}: expG {share*team_xg:.2f} P(anytime) {px*100:.1f}% -> fair odds {1/px:.2f}")

# ---------------- MLS St Louis (home) v Sporting KC (away) - COARSE, rusty ----------------
print("\n==== MLS St Louis v Sporting KC (COARSE - teams idle ~7wk since May 24) ====")
# St Louis form pre-break: solid, unbeaten last 5, 16 pts. SKC: 3-2-9, worst GD, 0-4-0 away.
# Very coarse: assign xG from reputational/table gap, heavily caveated.
xg_stl, xg_skc = 1.85, 0.80
Ms = np.zeros((N,N))
for i in range(N):
    for j in range(N):
        Ms[i,j]=pois(i,xg_stl)*pois(j,xg_skc)*dc_tau(i,j,xg_stl,xg_skc,rho)
Ms/=Ms.sum()
stl_win=np.tril(Ms,-1).sum(); dr=np.trace(Ms)
stl_m15=sum(Ms[i,j] for i in range(N) for j in range(N) if i-j>=2)
print(f"St Louis xG {xg_stl} SKC {xg_skc}")
print(f"St Louis win {stl_win*100:.1f}%  -1.5 {stl_m15*100:.1f}%")
print(f"StL ML @1.37 (-270): edge {edge(stl_win,1.37)*100:+.1f}%")
print(f"StL -1.5 @2.10 (+110): edge {edge(stl_m15,2.10)*100:+.1f}%")
