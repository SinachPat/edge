import math
from math import exp, factorial

def pois_pmf(k, lam): return exp(-lam)*lam**k/factorial(k)

def analyze(name, xg_h, xg_a, maxg=10):
    # scoreline matrix
    P=[[pois_pmf(i,xg_h)*pois_pmf(j,xg_a) for j in range(maxg)] for i in range(maxg)]
    p_home=sum(P[i][j] for i in range(maxg) for j in range(maxg) if i>j)
    p_draw=sum(P[i][j] for i in range(maxg) for j in range(maxg) if i==j)
    p_away=sum(P[i][j] for i in range(maxg) for j in range(maxg) if i<j)
    p_over=sum(P[i][j] for i in range(maxg) for j in range(maxg) if i+j>=3)
    p_btts=sum(P[i][j] for i in range(1,maxg) for j in range(1,maxg))
    print(f"\n=== {name} ===")
    print(f"  xG: home {xg_h:.2f} / away {xg_a:.2f} (total {xg_h+xg_a:.2f})")
    print(f"  1X2: Home {p_home*100:.1f}%  Draw {p_draw*100:.1f}%  Away {p_away*100:.1f}%")
    print(f"  Over 2.5: {p_over*100:.1f}%   Under 2.5: {(1-p_over)*100:.1f}%")
    print(f"  BTTS Yes: {p_btts*100:.1f}%")
    return dict(h=p_home,d=p_draw,a=p_away,over=p_over,btts=p_btts)

def xg_pair(gf_h,ga_h,gf_a,ga_a,home_tilt=1.10,away_tilt=0.92,neutral=False):
    # expected goals = mean(own attack, opp defense conceded); venue tilt unless neutral
    xh=(gf_h+ga_a)/2; xa=(gf_a+ga_h)/2
    if not neutral: xh*=home_tilt; xa*=away_tilt
    return xh,xa

res={}

# 1) Djurgarden (home) v Halmstad (away) - Allsvenskan
# Djurgarden recent: strong attack (6-0,4-2,2-4 etc) ~2.3 GF/g, ~1.3 GA/g
# Halmstad: 9 goals in 11 (~0.82 GF/g); leaky esp away ~2.0 GA/g, 0 away wins
xh,xa=xg_pair(gf_h=2.30,ga_h=1.30, gf_a=0.85,ga_a=2.05)
res['dju']=analyze("Djurgarden v Halmstad (Allsvenskan)",xh,xa)

# 2) Breidablik (home) v Keflavik (away) - Iceland Besta deild
# Breidablik ~2.46 GF/g, 1.92 GA/g (Over2.5 in 13 straight)
# Keflavik last5: 13 scored(2.6),10 conceded(2.0); season attack lower ~1.5 -> use 1.7 GF/g, 2.0 GA/g
xh,xa=xg_pair(gf_h=2.46,ga_h=1.92, gf_a=1.70,ga_a=2.00)
res['bre']=analyze("Breidablik v Keflavik (Iceland)",xh,xa)

# 3) France v Spain - WC semifinal (neutral)
# FULL tournament rates (inflated by minnows):
# France 16 GF/6=2.67, 2 GA/6=0.33 ; Spain est ~1.8 GF/g, ~0.5 GA/g
xh,xa=xg_pair(gf_h=2.67,ga_h=0.33, gf_a=1.80,ga_a=0.50, neutral=True)
res['fs_full']=analyze("France v Spain (FULL-tournament rates)",xh,xa)
# KNOCKOUT-only (regressed, big-game):
# France KO 6 GF/3=2.0, 0 GA ; Spain KO ~1.5 GF/g, ~0.7 GA/g
xh,xa=xg_pair(gf_h=2.00,ga_h=0.55, gf_a=1.45,ga_a=0.70, neutral=True)
# extra damp for elite defenses / big-game caution
xh*=0.85; xa*=0.85
res['fs_ko']=analyze("France v Spain (KNOCKOUT-only, damped)",xh,xa)

# 4) Larne (home) v Tre Fiori (away) - UCL 1Q L2, Larne lead 1-0 agg
# THIN DATA (N.Irish league off-season). Class gap huge: Larne coeff 9.0 vs Tre Fiori(San Marino) 2.5
# Priors: Larne home vs minnow ~2.4 GF, ~0.5 GA ; Tre Fiori ~0.5 GF, ~2.4 GA
xh,xa=xg_pair(gf_h=2.30,ga_h=0.60, gf_a=0.50,ga_a=2.30)
res['lar']=analyze("Larne v Tre Fiori (UCL Q, THIN prior)",xh,xa)

# 5) Shamrock Rovers (home) v Floriana (away) - UCL 1Q L2, Shamrock trail 0-2
# Shamrock in-season LoI form: recent 2-1,1-0,3-1,1-1,2-0,1-2 -> ~1.7 GF/g, ~1.0 GA/g
# Floriana (Malta) won 1st leg 2-0; ~1.0 GF/g, ~1.3 GA/g. Shamrock must attack.
xh,xa=xg_pair(gf_h=1.80,ga_h=1.00, gf_a=1.00,ga_a=1.35)
res['sha']=analyze("Shamrock Rovers v Floriana (UCL Q)",xh,xa)

# 6) Levski Sofia (home) v Borac (away) - UCL 1Q L2, 1-1 agg
# thin (Bulgaria pre-season) - both mid European sides; home edge
xh,xa=xg_pair(gf_h=1.50,ga_h=1.00, gf_a=1.20,ga_a=1.20)
res['lev']=analyze("Levski v Borac (UCL Q, THIN)",xh,xa)

# ---- Model Edge helper ----
def edge(p, dec): return p*dec-1
print("\n\n===== MODEL EDGE (model prob * decimal odds - 1) =====")
edges=[
 ("Djurgarden WIN @1.20", res['dju']['h'],1.20),
 ("Djurgarden/Halmstad OVER2.5 @1.70", res['dju']['over'],1.70),
 ("Breidablik OVER2.5 @1.50", res['bre']['over'],1.50),
 ("Breidablik BTTS @1.70", res['bre']['btts'],1.70),
 ("Breidablik WIN @1.69", res['bre']['h'],1.69),
 ("France-Spain UNDER2.5 @1.94 (full)", 1-res['fs_full']['over'],1.94),
 ("France-Spain UNDER2.5 @1.94 (KO-damped)", 1-res['fs_ko']['over'],1.94),
 ("Larne WIN @1.21", res['lar']['h'],1.21),
 ("Shamrock WIN @1.28", res['sha']['h'],1.28),
 ("Levski WIN @1.80", res['lev']['h'],1.80),
 ("Levski-Borac UNDER2.5 @1.60", 1-res['lev']['over'],1.60),
]
for nm,p,dec in edges:
    print(f"  {nm:42s} p={p*100:5.1f}%  edge={edge(p,dec)*100:+6.1f}%")

# ticket combined odds
print("\n===== TICKET COMBINED DECIMAL ODDS =====")
def comb(*o):
    r=1
    for x in o: r*=x
    return r
print(f"  T1 Conviction (1.20*1.21*1.50) = {comb(1.20,1.21,1.50):.2f}")
print(f"  T2 Model Edge (1.70*1.70*1.94) = {comb(1.70,1.70,1.94):.2f}")
print(f"  T3 Diversified (1.28*1.80*1.68) = {comb(1.28,1.80,1.68):.2f}")
