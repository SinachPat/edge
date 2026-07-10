

| ⬡ EDGE Personal Sports Prediction Platform Product Requirements Document  ·  v1.1 (Revised)  ·  July 2026 Prepared by: Osinachi Patrick |
| :---: |

| Purpose *A data-driven, AI-powered prediction engine generating 3 high-confidence betting tickets per session. Revised v1.1 updates the AI model architecture to a tiered Claude Sonnet 4.5 / Opus 4 hybrid — reducing API cost by \~65% while preserving full reasoning quality where it matters.* |
| :---- |

# **1\. Executive Summary**

EDGE is a personal sports prediction platform that generates data-driven, AI-reasoned betting picks with full market breakdowns, confidence scoring, and structured 3-ticket outputs. The platform picks only when data justifies it — not on a forced daily schedule — creating a compounding, edge-first betting journey.

v1.1 revises the AI model architecture from a single-model Opus 4 approach to a tiered Sonnet 4.5 / Opus 4 hybrid. This change reduces AI API cost by approximately 65% per session while preserving full reasoning quality at Stage 2, the only stage that genuinely requires Opus-level capability.

| Realistic Accuracy Target *62–78% raw win rate with \+8–15% ROI per rolling 30-day period. The compounding edge comes from disciplined EV-positive market selection — not from hitting every bet. Any platform claiming 90%+ accuracy on sports betting should be treated with extreme scepticism.* |
| :---- |

# **2\. API Assessment: SportAPI7 vs Recommended Stack**

## **2.1 Verdict on SportAPI7**

SportAPI7 covers 20+ sports and 5,000+ leagues with live scores, results, and fixtures. It cannot serve as the primary intelligence source for EDGE because it has no historical odds, no betting market endpoints, no EV or CLV capability, and no prediction layer. It can supplement the stack as a fallback live score feed, but nothing more.

| Verdict *SportAPI7 is a live scores aggregator — not a prediction intelligence API. Do not anchor EDGE on it.* |
| :---- |

## **2.2 Full API Landscape**

| API / Source | Free Tier | Paid From | Markets / Depth | Historical Odds | Verdict |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **SportAPI7 (RapidAPI)** | Limited | \~$10/mo | Scores & results only | ❌ | Do NOT use as primary — scores only |
| **API-Football** | 100/day | $17/mo | Football: H2H, injuries, lineups, xG, predictions | ✅ Partial | Football stats backbone |
| **The Odds API** | 500 credits/mo | $49/mo | 600+ markets · 15+ books · props · live · alternates · futures | ✅ Full history | PRIMARY odds intelligence |
| **SharpAPI** | 12 req/min | $79/mo | EV vs Pinnacle · CLV · arbitrage alerts | ✅ CLV built-in | EV & edge detection layer |
| **SportsGameOdds** | 10 req/min | $99/mo | Moneylines · spreads · totals · props · futures · 80+ books | ✅ Full | Best mid-tier value |
| API-Sports (multi) | 100/day | $17/mo / sport | Stats for NBA, NFL, Tennis etc. | ✅ Partial | Multi-sport stats |
| Sportradar | Trial | $10,000+/mo | Enterprise · official data · deepest coverage | ✅ Enterprise | Overkill — exclude v1 |

## **2.3 Recommended API Stack**

| Layer | Tool | Cost | Role |
| ----- | ----- | ----- | ----- |
| **Odds Intelligence** | The Odds API | $49–99/mo | Primary: 600+ markets, line movement, historical odds |
| **EV Detection** | SharpAPI | $0–79/mo | Beat-closing-line detection, \+EV vs Pinnacle |
| **Football Stats** | API-Football | $17/mo | H2H, injuries, lineups, form, xG, predictions |
| **Multi-Sport Stats** | API-Sports | $17/mo per sport | NBA / NFL / Tennis stats (same API family) |
| **AI — Ingestion** | Claude Sonnet 4.5 | Per token (\~10x cheaper) | Stage 1: parse & score 7-layer signals |
| **AI — Reasoning** | Claude Opus 4 | Per token (premium) | Stage 2: pick rationale & confidence tier |
| **AI — Assembly** | Claude Sonnet 4.5 | Per token (\~10x cheaper) | Stage 3: ticket construction & formatting |
| **Database** | Supabase | $0–25/mo | Picks log, bankroll, result settlement |
| **Scheduler** | Inngest | $0 (hobby) | Cron jobs \+ event-driven pipeline |
| **Frontend** | Next.js \+ Vercel | $0/mo | Dashboard, ticket viewer, bankroll tracker |

*Estimated start-up API cost: \~$145–195/month (The Odds API Pro \+ SharpAPI Starter \+ API-Football). Sportradar is explicitly excluded — $10,000+/month is unnecessary for a personal platform.*

# **3\. AI Model Architecture — v1.1 Revision**

## **3.1 The Problem with Single-Model Opus 4**

The original v1.0 PRD specified Claude Opus 4 for all three pipeline stages. This was architecturally sound but economically naive. Stages 1 and 3 are predominantly formatting and rule-following tasks — parsing JSON, scoring a checklist, assembling combinations. Running Opus 4 on these stages adds cost with zero quality benefit.

## **3.2 Tiered Model Architecture**

v1.1 assigns the correct model to each stage based on cognitive demand:

| Stage | Task | Model | Why | Est. Cost/Session |
| ----- | ----- | ----- | ----- | ----- |
| **Stage 1** | Data ingestion \+ 7-signal scoring | Claude Sonnet 4.5 | Structured formatting, rule-following — no deep reasoning needed | \~$0.04 |
| **Stage 2** | Pick reasoning \+ confidence tier \+ rationale | Claude Opus 4 | Genuinely complex multi-signal trade-off reasoning | \~$0.30 |
| **Stage 3** | Ticket assembly \+ JSON formatting | Claude Sonnet 4.5 | Combinatorics \+ rule enforcement — fast & cheap | \~$0.02 |
| Total / session |  | Hybrid |  | \~$0.36 (\~$6–9/month at 4 sessions/week) |

| Why This Works *Stage 2 — the actual pick reasoning — is where genuine multi-signal trade-off analysis happens. That is the only stage where Opus 4's deeper reasoning provides measurable quality uplift. Stages 1 and 3 are deterministic enough that Sonnet 4.5 handles them with identical output quality at roughly 10× lower token cost.* |
| :---- |

## **3.3 Cost Comparison**

At 4 pick sessions per week, 52 weeks per year:

* v1.0 (Opus 4 all stages): \~$0.75–1.00/session → \~$156–208/year on AI alone

* v1.1 (Hybrid Sonnet / Opus): \~$0.36/session → \~$75/year on AI alone

* Saving: approximately $80–130/year; more meaningfully, the AI cost drops below a rounding error relative to API subscription costs

*Do not use the Vercel AI SDK for this pipeline. The Anthropic SDK (npm: @anthropic-ai/sdk) is the correct direct dependency. The Vercel AI SDK is a streaming abstraction layer designed for real-time chat UIs — EDGE's prediction pipeline is a background cron job with structured JSON outputs, not a conversational interface. Direct SDK usage gives you cleaner token control, explicit model selection per stage, and no unnecessary middleware.*

# **4\. Product Goals & Success Metrics**

## **4.1 Primary Goals**

* Generate structured betting tickets with maximum combined odds of 3.00 per ticket

* Cover the full spectrum of betting markets — not just match result or totals

* Produce minimum 3 tickets per pick session, each with exactly 3 analysed picks

* Provide AI-reasoned written rationale for every individual pick

* Surface a confidence tier and EV score for each selection

* Track bankroll performance over time with a compounding P\&L dashboard

* Only generate picks when data quality meets minimum signal threshold (≥ 4/7 signals)

## **4.2 Success Metrics**

**Accuracy Target:**  62–78% raw win rate on individual picks

**ROI Target:**  \+8–15% return on investment per rolling 30-day period

**EV Threshold:**  All picks must show \+EV vs Pinnacle closing line (tracked via SharpAPI CLV)

**Pick Discipline:**  No picks generated when signal confidence is below 65% (\< 4 signals)

**Ticket Format:**  Minimum 3 tickets, exactly 3 picks each, combined odds ≤ 3.00

**Bankroll Rule:**  Maximum 3% of bankroll per ticket; Kelly Criterion applied per tier

# **5\. Betting Market Taxonomy**

EDGE covers the full spectrum of markets available via The Odds API and API-Football, organised by category and AI confidence potential:

| Category | Example Markets | Odds Range | AI Confidence |
| ----- | ----- | ----- | ----- |
| Result Markets | 1X2, Double Chance (1X / X2 / 12), Draw No Bet | 1.30–4.00 | High (72–82%) |
| Goals Markets | BTTS Yes/No, Over/Under 1.5 / 2.5 / 3.5, First Half Goals | 1.50–2.80 | High (70–80%) |
| Handicap / Spread | Asian Handicap −0.5/−1/+1, European Handicap | 1.70–2.20 | Moderate (62–72%) |
| Score Markets | Correct Score, HT/FT, Exact Goals | 3.00–50.00+ | Low — use sparingly |
| Player Props | Anytime Scorer, First Scorer, Assists, Cards | 2.00–8.00 | Moderate–High (65–78%) |
| Corner Markets | Total Corners Over/Under, First Corner | 1.70–2.20 | Moderate (60–70%) |
| Card Markets | Over/Under Total Cards, First Card | 1.80–2.50 | Moderate (62–72%) |
| Timing Markets | First Half Win, Team to Score First, Both Halves | 1.50–3.50 | Moderate–High (65–75%) |
| Combo Accumulators | System 2-folds / 3-folds (max 3.00 total) | 2.00–3.00 cap | High when anchored by top picks |

*Priority order: Result and Goals markets are the highest-confidence AI targets. Player props are high-value when player-level data is available. Correct Score and Exact Goals are low-probability — only include when Diamond-tier confidence exists and odds compensate significantly.*

# **6\. AI Prediction Engine Design**

## **6.1 The 7-Layer Signal Framework**

Every pick is evaluated across 7 signal layers. A pick advances only when ≥ 4 layers return a positive signal. Diamond-tier requires all 7:

* **Layer 1 —** H2H Record

    Last 5–10 head-to-head results, weighted by recency. Source: API-Football /fixtures/headtohead

* **Layer 2 —** Current Form

    Last 5 match results and goal patterns for both teams. Source: API-Football /standings \+ /teams/statistics

* **Layer 3 —** Home / Away Differential

    Home win %, away clean sheet rate, goals scored patterns. Source: API-Football team statistics

* **Layer 4 —** Injury & Lineup Intelligence

    Key absences (top scorer, goalkeeper, defensive anchor). Source: API-Football /injuries \+ /fixtures/lineups

* **Layer 5 —** Market Odds Signal

    Consensus odds from 15+ books via The Odds API. Opening vs current line movement; sharp vs public money split

* **Layer 6 —** EV Detection

    SharpAPI \+EV check vs Pinnacle lines. Only picks with EV ≥ \+4% advance. CLV logged post-match

* **Layer 7 —** AI Statistical Model

    API-Football /predictions (Poisson-based) compared against Sonnet 4.5 scoring for agreement or divergence

## **6.2 Confidence Tier System**

| Tier | Confidence | Signal Requirement | Max Odds | Stake Multiplier |
| ----- | ----- | ----- | ----- | ----- |
| **DIAMOND ◆** | 85–95% | All 7 signal layers, EV ≥ \+15% | 2.20 | 3× base |
| **GOLD ◈** | 75–84% | 5–6 signals, EV ≥ \+8% | 2.50 | 2× base |
| **SILVER ◇** | 65–74% | 4–5 signals, EV ≥ \+4% | 2.80 | 1× base |
| **NO PICK** | \< 65% | Insufficient signals | — | 0× — skip |

# **7\. Pick & Ticket Output Format**

## **7.1 Individual Pick Card Fields**

* Match — Team A vs Team B, Competition, Date & Time

* Market — e.g. 'BTTS Yes', 'Asian Handicap Team A −0.5', 'Anytime Scorer \[Player\]'

* Selection — The exact bet option

* Odds — Best available from The Odds API (aggregated across 15+ books)

* Confidence Tier — DIAMOND / GOLD / SILVER with percentage range

* EV Score — e.g. \+12.4% vs Pinnacle

* Signal Count — How many of 7 layers fired (e.g. 6/7)

* Rationale — 3–5 sentence Claude Opus 4 reasoning paragraph

* Recommended Stake — Kelly Criterion % of current bankroll

## **7.2 Ticket Structure Rules**

* Each ticket contains exactly 3 individual picks

* Combined odds of each ticket must not exceed 3.00

* Each ticket spans at least 2 different market categories

* Ticket 1 (Anchor): Highest-confidence picks, safest combination

* Ticket 2 (Value): Highest EV picks, maximum edge focus

* Ticket 3 (Diversified): Different sports or competitions, risk diversification

* No pick repeats across all 3 tickets — each is a genuinely independent bet

## **7.3 Session Cadence**

* Typical: 3–5 sessions per week (not forced daily)

* Heavy fixture weeks (Champions League \+ domestic concurrent): up to 7 sessions

* International breaks / low-fixture windows: 0–1 sessions — system holds explicitly

* Dashboard shows: TODAY'S STATUS — PICK SESSION READY / HOLDING — INSUFFICIENT DATA

# **8\. Technical Architecture**

| Layer | Technology | Purpose |
| ----- | ----- | ----- |
| Frontend | Next.js 14 (App Router) \+ Tailwind CSS | Dashboard, tickets, bankroll tracker |
| Backend | Next.js API Routes \+ tRPC | Orchestration between data APIs and Claude |
| Database | Supabase (Postgres \+ Realtime) | Picks, bankroll, result settlement, auth |
| Scheduler | Inngest (cron \+ event-driven) | Daily pipeline trigger \+ post-match settlement |
| AI Stage 1 & 3 | Claude Sonnet 4.5 (Anthropic SDK direct) | Signal scoring \+ ticket assembly |
| AI Stage 2 | Claude Opus 4 (Anthropic SDK direct) | Pick reasoning \+ rationale |
| Primary Odds | The Odds API | 600+ markets, line movement, history |
| EV Detection | SharpAPI | \+EV vs Pinnacle, CLV tracking |
| Football Data | API-Football | H2H, injuries, lineups, form, predictions |
| Hosting | Vercel | Serverless deployment |

## **8.1 Data Pipeline Flow**

* 06:00 UTC — Fetch upcoming fixtures (next 48hrs) from API-Football

* 06:10 UTC — Fetch odds for all fixtures from The Odds API

* 06:20 UTC — Run EV check via SharpAPI vs Pinnacle lines

* 06:30 UTC — Fetch H2H, injuries, form, lineups from API-Football

* 06:45 UTC — Stage 1: Claude Sonnet 4.5 scores all 7 signal layers

* 07:00 UTC — If ≥ 9 qualifying picks: Stage 2 Opus 4 (rationale) \+ Stage 3 Sonnet (ticket assembly)

* 07:15 UTC — Write picks and tickets to Supabase; trigger dashboard notification

* Post-match — Settle results; update bankroll; log CLV vs actual outcome

# **9\. Compounding Bankroll Strategy**

## **9.1 Kelly Criterion Staking**

EDGE enforces Kelly Criterion staking in code. The formula:

| Kelly Formula f\* \= (bp − q) / b *b \= odds − 1  ·  p \= win prob  ·  q \= 1 − p* | EDGE Stake Caps DIAMOND: up to 3% of bankroll GOLD: up to 2% of bankroll SILVER: 1% of bankroll Max per session: 6% total bankroll at risk |
| :---- | :---- |

## **9.2 Compounding Simulation (Illustrative)**

Starting bankroll ₦100,000 · 3 sessions/week · 1.5% avg stake · \+10% ROI sustained:

* Month 1: ₦100,000 → \~₦116,000

* Month 3: \~₦156,000

* Month 6: \~₦243,000

* Month 12: \~₦590,000

*These are illustrative projections. Real results depend on pick quality and discipline. The primary risk to compounding is abandoning Kelly limits during a losing streak — EDGE enforces caps in code, not willpower.*

# **10\. Build Phases & Timeline**

| Phase | Name | Deliverables | Timeline |
| ----- | ----- | ----- | ----- |
| **Phase 1** | Data Foundation | API integrations, DB schema, Inngest crons, raw data pipeline | Weeks 1–2 |
| **Phase 2** | AI Engine | 3-stage Claude pipeline, 7-signal scoring, confidence logic | Weeks 3–4 |
| **Phase 3** | Pick & Ticket System | Pick generation, 3-ticket formatter, market taxonomy live | Weeks 5–6 |
| **Phase 4** | Dashboard | Frontend, bankroll P\&L, pick history, result settlement | Weeks 7–8 |
| **Phase 5** | Calibration | Shadow period, back-test, tune confidence thresholds | Weeks 9–10 |

# **11\. Risks & Mitigations**

| Risk | Impact | Mitigation |
| ----- | ----- | ----- |
| Expecting 90%+ raw accuracy | High | Target EV/CLV and ROI, not win rate — 62–78% win rate with \+EV is excellent |
| API rate limits on free tiers | Medium | Start paid on The Odds API; cache responses in Supabase |
| Opus 4 cost at high volume | Low | Hybrid model: Sonnet 4.5 for Stages 1 & 3; Opus only for Stage 2 |
| Odds movement before placing | High | Place within 4hrs of generation; log CLV vs actual closing line |
| Bankroll wipeout on losing streak | High | Hard cap: max 3% per bet; Kelly enforced in code |
| Using SportAPI7 as primary | Critical | Replace with The Odds API stack — SportAPI7 lacks betting market depth |

# **12\. Anti-Scope (What Not to Build in v1)**

* No tipping service or social sharing — personal intelligence tool only

* No in-play/live betting picks — data latency makes live AI predictions unreliable at this budget

* No automated bet placement — EDGE surfaces picks; you place them manually

* No daily forced picks — system holds when data is insufficient

* No multi-user accounts in v1

* No Vercel AI SDK — direct Anthropic SDK only (see Implementation Guide)

* No Sportradar dependency — too expensive

# **13\. Immediate Next Steps**

1. Sign up for The Odds API (Starter or Pro) — Day 1 action

2. Sign up for API-Football at api-sports.io — $17/month

3. Sign up for SharpAPI free tier — test EV detection before committing to paid

4. Scaffold Next.js \+ Supabase \+ tRPC project using your existing Arcus/Abble pattern

5. Build the data ingestion pipeline (Inngest cron → API calls → Supabase write) before touching AI

6. Design and test the 3-stage Claude prompt pipeline on 10 historical fixtures

7. Run a 2-week shadow period — generate picks, do not stake real money, validate accuracy

8. Go live only after shadow period shows ≥ 60% win rate and positive EV confirmation

| Shadow Period Rule *Non-negotiable. No AI prediction system should be trusted with real money before validation against real outcomes. Two weeks of shadow running against live fixtures is the minimum bar before any bankroll goes in.* |
| :---- |

*EDGE PRD v1.1  ·  Osinachi Patrick  ·  July 2026  ·  Private & Confidential*