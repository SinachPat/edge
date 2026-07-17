import numpy as np
from math import exp, factorial
def pois(k,l): return exp(-l)*l**k/factorial(k)
def dc_tau(h,a,lh,la,rho):
    if h==0 and a==0: return 1-lh*la*rho
    if h==0 and a==1: return 1+lh*rho
    if h==1 and a==0: return 1+la*rho
    if h==1 and a==1: return 1-rho
    return 1.0
def matrix(xh,xa,rho=-0.13,N=12):
    M=np.zeros((N,N))
    for i in range(N):
        for j in range(N):
            M[i,j]=pois(i,xh)*pois(j,xa)*dc_tau(i,j,xh,xa,rho)
    return M/M.sum()
def readout(M):
    N=M.shape[0]
    pH=np.tril(M,-1).sum(); pD=np.trace(M); pA=np.triu(M,1).sum()
    o=lambda t: sum(M[i,j] for i in range(N) for j in range(N) if i+j>t)
    hto=lambda t: sum(M[i,j] for i in range(N) for j in range(N) if i>t)
    ato=lambda t: sum(M[i,j] for i in range(N) for j in range(N) if j>t)
    btts=sum(M[i,j] for i in range(1,N) for j in range(1,N))
    hcap=lambda m: sum(M[i,j] for i in range(N) for j in range(N) if i-j>=m)
    return dict(H=pH,D=pD,A=pA,o15=o(1),o25=o(2),o35=o(3),btts=btts,
        h_o05=hto(0),h_o15=hto(1),a_o05=ato(0),a_o15=ato(1),
        h_m15=hcap(2),h_m1=hcap(1),a_p15=pA+pD+sum(M[i,i-1] for i in range(1,N)))
def edge(p,d): return p*d-1

MLS_BASE=1.45; k=6  # rust -> heavier shrinkage k=6
def shrink(gf_pg, base, n, k): 
    r=gf_pg/base; return (n*r+k*1.0)/(n+k)

print("="*70)
print("St Louis City (home) v Sporting KC (away)  -- MLS rivalry, both idle 7wk")
print("="*70)
# Real season data:
# St Louis: 12th (4-6-4), home 4-2-1, conceded 20 season. Just beat Austin 3-0.
# SKC: 16th West (3-9-2), AWAY 0-4-0, scores ~1.0/g away, concedes 2.57/g away, 36 conceded (worst).
# Attack/defence off SEASON per-game rates (more games -> less rust distortion than 5-game):
stl_gf=1.55; stl_ga_home=0.9   # solid home
skc_gf_away=1.00; skc_ga_away=2.57
n_stl=14; n_skc=14
stl_att=shrink(stl_gf,MLS_BASE,n_stl,k); 
skc_def_away=shrink(skc_ga_away,MLS_BASE,n_skc,k)
skc_att_away=shrink(skc_gf_away,MLS_BASE,n_skc,k)
stl_def_home=shrink(stl_ga_home,MLS_BASE,n_stl,k)
home_adv=1.15
xh=MLS_BASE*stl_att*skc_def_away*home_adv
xa=MLS_BASE*skc_att_away*stl_def_home
print(f"St Louis att {stl_att:.3f}, SKC away def {skc_def_away:.3f} -> xG STL {xh:.2f}")
print(f"SKC away att {skc_att_away:.3f}, STL home def {stl_def_home:.3f} -> xG SKC {xa:.2f}")
M=matrix(xh,xa); r=readout(M)
print(f"1X2 STL/D/SKC: {r['H']*100:.1f}/{r['D']*100:.1f}/{r['A']*100:.1f}")
print(f"STL -1.5: {r['h_m15']*100:.1f}%  STL team O1.5: {r['h_o15']*100:.1f}%  O2.5:{r['o25']*100:.1f}% O3.5:{r['o35']*100:.1f}%")
print("-- edges --")
print(f"STL -1.5 @2.10(+110): {edge(r['h_m15'],2.10)*100:+.1f}%")
print(f"STL ML @1.37(-270): {edge(r['H'],1.37)*100:+.1f}%")
print(f"STL team total O1.5 @~1.70(est,unconfirmed): {edge(r['h_o15'],1.70)*100:+.1f}%")
print(f"Over 3.0 @1.60: {edge(r['o25']*0.5+r['o35']*0.5,1.60)*100:+.1f}% (approx O3 line)")

# CORNERS (class B, separate Poisson) -- researched real rates, labeled coarse
print("\n-- Corners (class B corners-Poisson, coarse) --")
# STL 16.8 recent (likely inflated by shutout blowout), SKC concede many corners.
# Shrink STL toward league ~5.0/team: use 6.0 for STL, SKC 4.2 -> total ~10.2
stl_c=6.0; skc_c=4.2; tot_c=stl_c+skc_c
def pois_over(line, lam):
    # P(total corners > line) with total-corner Poisson
    import math
    cum=sum(pois(i,lam) for i in range(0,int(np.floor(line))+1))
    return 1-cum
print(f"Corners lambda total ~{tot_c:.1f}")
for line,price in [(8.5,1.55),(9.5,1.90),(10.5,2.40)]:
    p=pois_over(line,tot_c)
    print(f"Over {line} corners: P={p*100:.1f}%  @{price}(illustrative) edge {edge(p,price)*100:+.1f}%")
print("NOTE: no CONFIRMED corners price found (Polymarket lists 8/9/10/11 lines but no decimal odds captured) -> cannot ticket")

print("\n"+"="*70)
print("Chicago Fire (home) v Vancouver Whitecaps (away) -- Van in form, active")
print("="*70)
# Vancouver: 2nd/1st West, 32 pts/15g, +18 GD, ~2.3 gf/g, played Canadian Champ (4-1). Away good (3-2-1).
# Chicago: 5th/3rd East, 26 pts, ~1.95 gf/g, elite-ish defense improved. Home decent.
van_gf=2.05; van_ga=1.05; chi_gf=1.85; chi_ga_home=1.15
n=15
van_att=shrink(van_gf,MLS_BASE,n,k); van_def=shrink(van_ga,MLS_BASE,n,k)
chi_att=shrink(chi_gf,MLS_BASE,n,k); chi_def=shrink(chi_ga_home,MLS_BASE,n,k)
xh2=MLS_BASE*chi_att*van_def*home_adv
xa2=MLS_BASE*van_att*chi_def
print(f"xG Chicago {xh2:.2f}, Vancouver {xa2:.2f}")
M2=matrix(xh2,xa2); r2=readout(M2)
print(f"1X2 CHI/D/VAN: {r2['H']*100:.1f}/{r2['D']*100:.1f}/{r2['A']*100:.1f}")
print(f"VAN DNB (win|no draw): {r2['A']/(r2['A']+r2['H'])*100:.1f}%")
print(f"O2.5:{r2['o25']*100:.1f}% O3.5:{r2['o35']*100:.1f}% BTTS:{r2['btts']*100:.1f}%")
print(f"VAN DC (X2): {(r2['A']+r2['D'])*100:.1f}%")
print("-- edges --")
van_dnb=r2['A']/(r2['A']+r2['H'])
print(f"VAN DNB @1.68(-147): {edge(van_dnb,1.68)*100:+.1f}%")
print(f"VAN ML @2.20(+120): {edge(r2['A'],2.20)*100:+.1f}%")
print(f"VAN DC X2 @~1.42(est): {edge(r2['A']+r2['D'],1.42)*100:+.1f}%")
print(f"Over3.5 @2.25(+125): {edge(r2['o35'],2.25)*100:+.1f}%")
print(f"BTTS Yes @1.42(-238): {edge(r2['btts'],1.42)*100:+.1f}%")

print("\n"+"="*70)
print("Montreal (home) v Toronto (away) -- both poor, Montreal active(Can Champ)")
print("="*70)
# Montreal 11th East but home; Toronto lost last 4 MLS, poor. Montreal ~1.4 gf, Toronto ~1.2, both leaky.
mtl_gf=1.45; mtl_ga=1.55; tor_gf=1.25; tor_ga=1.65; n=14
mtl_att=shrink(mtl_gf,MLS_BASE,n,k); mtl_def=shrink(mtl_ga,MLS_BASE,n,k)
tor_att=shrink(tor_gf,MLS_BASE,n,k); tor_def=shrink(tor_ga,MLS_BASE,n,k)
xh3=MLS_BASE*mtl_att*tor_def*home_adv; xa3=MLS_BASE*tor_att*mtl_def
M3=matrix(xh3,xa3); r3=readout(M3)
print(f"xG MTL {xh3:.2f} TOR {xa3:.2f}")
print(f"1X2 MTL/D/TOR: {r3['H']*100:.1f}/{r3['D']*100:.1f}/{r3['A']*100:.1f}  O2.5:{r3['o25']*100:.1f}% BTTS:{r3['btts']*100:.1f}%")
print(f"MTL O2.5 @1.61: {edge(r3['o25'],1.61)*100:+.1f}%  BTTS @1.57: {edge(r3['btts'],1.57)*100:+.1f}%")
print(f"MTL DC 1X @~1.35(est): {edge(r3['H']+r3['D'],1.35)*100:+.1f}%")

print("\n"+"="*70)
print("Seattle (home) v Portland (away) -- Cascadia")
print("="*70)
# Seattle 6th West, -222 fav, lost last 2 w/o scoring. Portland 13th, winless 3.
sea_gf=1.5; sea_ga=1.2; por_gf=1.2; por_ga=1.5; n=14
sea_att=shrink(sea_gf,MLS_BASE,n,k); sea_def=shrink(sea_ga,MLS_BASE,n,k)
por_att=shrink(por_gf,MLS_BASE,n,k); por_def=shrink(por_ga,MLS_BASE,n,k)
xh4=MLS_BASE*sea_att*por_def*home_adv; xa4=MLS_BASE*por_att*sea_def
M4=matrix(xh4,xa4); r4=readout(M4)
print(f"xG SEA {xh4:.2f} POR {xa4:.2f}  SEA win {r4['H']*100:.1f}%")
print(f"SEA ML @1.45(-222): {edge(r4['H'],1.45)*100:+.1f}%  SEA -0.5 same. Under2.5 {(1-r4['o25'])*100:.1f}%")
