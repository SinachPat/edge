

| ⬡ EDGE Personal Sports Prediction Platform Implementation Guide  ·  v1.0  ·  July 2026 Prepared by: Osinachi Patrick |
| :---: |

| Purpose *A step-by-step technical implementation guide for building the EDGE prediction platform — covering service setup, project scaffold, API integrations, the 3-stage Claude pipeline, Inngest cron architecture, Supabase schema, and the dashboard. Includes explicit guidance on SDK selection and why Vercel AI SDK is not used.* |
| :---- |

# **1\. Overview & Philosophy**

This guide walks through building EDGE from scratch. It assumes your existing stack fluency with Next.js, Supabase, tRPC, Inngest, and Vercel — the same stack used in Arcus and Abble — so it skips the basics and focuses on EDGE-specific architecture decisions, prompt engineering, and integration patterns.

The core architectural principle: the prediction pipeline is a background cron job that outputs structured JSON, not a conversational interface. Every tool decision flows from this fact.

| SDK Decision Upfront *Do NOT install the Vercel AI SDK. Install @anthropic-ai/sdk directly. This is the single most important tooling decision in the build. Full reasoning in Section 3\.* |
| :---- |

# **2\. Services Setup**

## **2.1 What to Sign Up For (and In What Order)**

| Service | Plan to Start | URL | Purpose | When to Upgrade |
| ----- | ----- | ----- | ----- | ----- |
| **The Odds API** | Starter ($49/mo) | the-odds-api.com | Primary odds \+ market data | Pro ($99) when you need live in-play odds |
| **SharpAPI** | Free (12 req/min) | sharpapi.io | EV detection vs Pinnacle | Starter ($79) after shadow period validates value |
| **API-Football** | Basic ($17/mo) | api-sports.io | Football stats, H2H, injuries | Never — Basic covers all EDGE needs |
| **Anthropic API** | Pay-as-you-go | console.anthropic.com | Claude Sonnet 4.5 \+ Opus 4 | Monitor spend; upgrade to higher tier if rate-limited |
| **Supabase** | Free (hobby) | supabase.com | Database \+ auth | Pro ($25/mo) when storage \> 500MB |
| **Inngest** | Free (hobby) | inngest.com | Cron jobs \+ event pipeline | Upgrade if \> 50,000 runs/month |
| **Vercel** | Free (hobby) | vercel.com | Hosting | Pro ($20/mo) when you need longer function timeouts |

## **2.2 Cost Summary at Start**

* The Odds API Starter: $49/month

* API-Football Basic: $17/month

* SharpAPI: $0/month (free tier sufficient for shadow period)

* Anthropic API: \~$6–9/month at 4 sessions/week (hybrid model)

* Supabase \+ Inngest \+ Vercel: $0/month on hobby tiers

* Total Month 1: \~$72–75/month

*Sign up for The Odds API before anything else. It has the longest onboarding (API key \+ plan selection \+ reading the docs). Everything else is faster.*

# **3\. SDK Selection — Why NOT Vercel AI SDK**

## **3.1 What the Vercel AI SDK Is**

The Vercel AI SDK (ai package) is an abstraction layer built for streaming conversational UIs in Next.js. It provides hooks like useChat, useCompletion, and streamText — all designed for building chat interfaces where the AI response streams in real-time to a browser.

## **3.2 Why It Is Wrong for EDGE**

| Option | Use Case | Verdict for EDGE |
| ----- | ----- | ----- |
| **Vercel AI SDK** | Streaming chat UIs, real-time conversational interfaces | Do NOT use — adds middleware overhead, designed for chat not cron pipelines |
| **@anthropic-ai/sdk (direct)** | Direct API calls, structured JSON outputs, background jobs | CORRECT CHOICE — clean token control, explicit model per call, no abstraction |
| **LangChain** | Complex multi-agent orchestration, RAG pipelines | Overkill — EDGE has a simple 3-stage linear pipeline; LangChain adds unnecessary complexity |
| **LlamaIndex** | Document indexing and retrieval | Not applicable — EDGE uses structured JSON not document retrieval |

## **3.3 The Correct Setup**

Install the Anthropic SDK directly:

| npm install @anthropic-ai/sdk   // Usage in your pipeline import Anthropic from '@anthropic-ai/sdk';   const anthropic \= new Anthropic({ apiKey: process.env.ANTHROPIC\_API\_KEY });   // Stage 1 — Sonnet 4.5 for signal scoring const stage1 \= await anthropic.messages.create({   model: 'claude-sonnet-4-5',   max\_tokens: 2048,   system: STAGE\_1\_SYSTEM\_PROMPT,   messages: \[{ role: 'user', content: JSON.stringify(fixtureData) }\] });   // Stage 2 — Opus 4 for reasoning (only called if ≥ 4 signals qualified) const stage2 \= await anthropic.messages.create({   model: 'claude-opus-4-5',   max\_tokens: 4096,   system: STAGE\_2\_SYSTEM\_PROMPT,   messages: \[{ role: 'user', content: stage1Output }\] });   // Stage 3 — Sonnet 4.5 for ticket assembly const stage3 \= await anthropic.messages.create({   model: 'claude-sonnet-4-5',   max\_tokens: 2048,   system: STAGE\_3\_SYSTEM\_PROMPT,   messages: \[{ role: 'user', content: stage2Output }\] }); |
| :---- |

*Always use model strings directly: 'claude-sonnet-4-5' and 'claude-opus-4-5'. Do not abstract model selection behind a variable in production — you want explicit control over which model runs in which stage, and it makes debugging cost anomalies straightforward.*

# **4\. Project Scaffold**

## **4.1 Initialise the Project**

| npx create-next-app@latest edge \--typescript \--tailwind \--app cd edge   \# Core dependencies npm install @anthropic-ai/sdk @supabase/supabase-js @trpc/server @trpc/client npm install inngest npm install zod   \# Dev npm install \-D @types/node |
| :---- |

## **4.2 Directory Structure**

| edge/ ├── app/ │   ├── api/ │   │   ├── inngest/route.ts          \# Inngest webhook handler │   │   └── trpc/\[trpc\]/route.ts      \# tRPC handler │   ├── dashboard/page.tsx            \# Today's picks │   ├── history/page.tsx              \# Pick history │   ├── bankroll/page.tsx             \# P\&L tracker │   └── layout.tsx ├── lib/ │   ├── anthropic.ts                  \# Anthropic SDK client │   ├── supabase.ts                   \# Supabase client │   ├── odds-api.ts                   \# The Odds API client │   ├── api-football.ts               \# API-Football client │   └── sharpapi.ts                   \# SharpAPI client ├── pipeline/ │   ├── stage1-signal-scoring.ts      \# Sonnet 4.5 │   ├── stage2-pick-reasoning.ts      \# Opus 4 │   ├── stage3-ticket-assembly.ts     \# Sonnet 4.5 │   └── prompts.ts                    \# All system prompts ├── inngest/ │   ├── client.ts │   ├── daily-pipeline.ts             \# Main cron job │   └── settle-results.ts             \# Post-match settlement ├── server/ │   ├── trpc.ts │   └── routers/ │       ├── picks.ts │       ├── tickets.ts │       └── bankroll.ts └── types/     └── edge.ts                       \# Shared type definitions |
| :---- |

# **5\. Environment Variables**

Create .env.local at the project root with the following variables:

| Variable | Value Source | Notes |
| ----- | ----- | ----- |
| ODDS\_API\_KEY | The Odds API dashboard | Primary odds data |
| SHARPAPI\_KEY | SharpAPI dashboard | EV detection |
| APIFOOTBALL\_KEY | api-sports.io dashboard | Football stats |
| ANTHROPIC\_API\_KEY | console.anthropic.com | Claude Sonnet 4.5 \+ Opus 4 |
| NEXT\_PUBLIC\_SUPABASE\_URL | Supabase project settings | Client-side safe |
| SUPABASE\_SERVICE\_KEY | Supabase project settings — service\_role | Server-side only — never expose to client |
| INNGEST\_EVENT\_KEY | Inngest dashboard | For sending events from app |
| INNGEST\_SIGNING\_KEY | Inngest dashboard | For verifying webhook signatures |

| \# .env.local ODDS\_API\_KEY=your\_key\_here SHARPAPI\_KEY=your\_key\_here APIFOOTBALL\_KEY=your\_key\_here ANTHROPIC\_API\_KEY=your\_key\_here NEXT\_PUBLIC\_SUPABASE\_URL=https://xxxx.supabase.co SUPABASE\_SERVICE\_KEY=your\_service\_role\_key INNGEST\_EVENT\_KEY=evt\_xxxx INNGEST\_SIGNING\_KEY=signkey\_xxxx |
| :---- |

*Never commit .env.local to Git. Add it to .gitignore immediately. In Vercel, add these as Environment Variables in the project settings dashboard — not as a file.*

# **6\. Supabase Database Schema**

## **6.1 Tables Overview**

| Table | Key Columns | Notes |
| ----- | ----- | ----- |
| **picks** | id, match\_id, sport, competition, home\_team, away\_team, market\_type, selection, odds, confidence\_tier, ev\_score, signal\_count, rationale, stake\_pct, status (pending/won/lost/void), created\_at, settled\_at | Core pick record — one row per individual pick |
| **tickets** | id, session\_id, ticket\_type (anchor/value/diversified), pick\_ids uuid\[\], combined\_odds, total\_stake, profit\_loss, status, created\_at | Links 3 picks into a ticket |
| **sessions** | id, date, status (generated/held), reason\_held, picks\_qualified, tickets\_generated, created\_at | One row per daily analysis run |
| **bankroll** | id, date, opening\_balance, closing\_balance, sessions\_count, total\_staked, total\_returned, running\_roi, win\_count, loss\_count | Daily bankroll snapshot |
| **signal\_log** | id, pick\_id, layer (1–7), layer\_name, result (pass/fail), detail | Audit trail for every signal layer decision |

## **6.2 SQL Migration**

Run this in the Supabase SQL editor to create all tables:

| \-- Sessions: one row per daily pipeline run CREATE TABLE sessions (   id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),   date DATE NOT NULL UNIQUE,   status TEXT NOT NULL CHECK (status IN ('generated','held')),   reason\_held TEXT,   picks\_qualified INTEGER DEFAULT 0,   tickets\_generated INTEGER DEFAULT 0,   created\_at TIMESTAMPTZ DEFAULT NOW() );   \-- Picks: one row per individual pick CREATE TABLE picks (   id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),   session\_id UUID REFERENCES sessions(id),   sport TEXT NOT NULL,   competition TEXT NOT NULL,   home\_team TEXT NOT NULL,   away\_team TEXT NOT NULL,   match\_date TIMESTAMPTZ NOT NULL,   market\_type TEXT NOT NULL,   selection TEXT NOT NULL,   odds DECIMAL(6,2) NOT NULL,   confidence\_tier TEXT NOT NULL CHECK (confidence\_tier IN ('DIAMOND','GOLD','SILVER')),   ev\_score DECIMAL(6,2),   signal\_count INTEGER NOT NULL CHECK (signal\_count BETWEEN 0 AND 7),   rationale TEXT NOT NULL,   stake\_pct DECIMAL(4,2) NOT NULL,   status TEXT DEFAULT 'pending' CHECK (status IN ('pending','won','lost','void')),   closing\_odds DECIMAL(6,2),   clv DECIMAL(6,2),   created\_at TIMESTAMPTZ DEFAULT NOW(),   settled\_at TIMESTAMPTZ );   \-- Tickets: groups of 3 picks CREATE TABLE tickets (   id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),   session\_id UUID REFERENCES sessions(id),   ticket\_type TEXT NOT NULL CHECK (ticket\_type IN ('anchor','value','diversified')),   pick\_ids UUID\[\] NOT NULL,   combined\_odds DECIMAL(6,3) NOT NULL,   total\_stake DECIMAL(10,2),   profit\_loss DECIMAL(10,2),   status TEXT DEFAULT 'pending' CHECK (status IN ('pending','won','lost')),   created\_at TIMESTAMPTZ DEFAULT NOW() );   \-- Bankroll: daily snapshot CREATE TABLE bankroll (   id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),   date DATE NOT NULL UNIQUE,   opening\_balance DECIMAL(12,2) NOT NULL,   closing\_balance DECIMAL(12,2),   sessions\_count INTEGER DEFAULT 0,   total\_staked DECIMAL(12,2) DEFAULT 0,   total\_returned DECIMAL(12,2) DEFAULT 0,   running\_roi DECIMAL(8,4),   win\_count INTEGER DEFAULT 0,   loss\_count INTEGER DEFAULT 0 );   \-- Signal audit log CREATE TABLE signal\_log (   id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),   pick\_id UUID REFERENCES picks(id),   layer INTEGER NOT NULL CHECK (layer BETWEEN 1 AND 7),   layer\_name TEXT NOT NULL,   result TEXT NOT NULL CHECK (result IN ('pass','fail')),   detail JSONB,   created\_at TIMESTAMPTZ DEFAULT NOW() ); |
| :---- |

# **7\. API Client Implementations**

## **7.1 The Odds API Client**

| // lib/odds-api.ts const BASE \= 'https://api.the-odds-api.com/v4'; const KEY  \= process.env.ODDS\_API\_KEY\!;   export async function getUpcomingOdds(sport: string) {   const res \= await fetch(     \`${BASE}/sports/${sport}/odds/?apiKey=${KEY}\&regions=eu,uk\&markets=h2h,spreads,totals,btts,player\_props\&oddsFormat=decimal\`,     { next: { revalidate: 1800 } } // cache 30 mins   );   if (\!res.ok) throw new Error(\`Odds API ${res.status}\`);   return res.json(); }   export async function getHistoricalOdds(sport: string, eventId: string) {   const res \= await fetch(     \`${BASE}/sports/${sport}/odds-history/?apiKey=${KEY}\&eventId=${eventId}\&regions=eu\`,   );   return res.json(); }   // Sports keys for The Odds API // soccer\_epl, soccer\_uefa\_champs\_league, soccer\_spain\_la\_liga, // basketball\_nba, americanfootball\_nfl, tennis\_atp\_french\_open |
| :---- |

## **7.2 API-Football Client**

| // lib/api-football.ts const BASE    \= 'https://v3.football.api-sports.io'; const headers \= { 'x-apisports-key': process.env.APIFOOTBALL\_KEY\! };   export async function getFixtures(leagueId: number, date: string) {   const res \= await fetch(\`${BASE}/fixtures?league=${leagueId}\&date=${date}\`, { headers });   const data \= await res.json();   return data.response; }   export async function getH2H(teamA: number, teamB: number, last \= 10\) {   const res \= await fetch(\`${BASE}/fixtures/headtohead?h2h=${teamA}-${teamB}\&last=${last}\`, { headers });   const data \= await res.json();   return data.response; }   export async function getInjuries(fixtureId: number) {   const res \= await fetch(\`${BASE}/injuries?fixture=${fixtureId}\`, { headers });   const data \= await res.json();   return data.response; }   export async function getPrediction(fixtureId: number) {   const res \= await fetch(\`${BASE}/predictions?fixture=${fixtureId}\`, { headers });   const data \= await res.json();   return data.response\[0\]; }   export async function getTeamStats(leagueId: number, season: number, teamId: number) {   const res \= await fetch(\`${BASE}/teams/statistics?league=${leagueId}\&season=${season}\&team=${teamId}\`, { headers });   const data \= await res.json();   return data.response; } |
| :---- |

## **7.3 SharpAPI Client**

| // lib/sharpapi.ts const BASE \= 'https://api.sharpapi.io'; const KEY  \= process.env.SHARPAPI\_KEY\!;   export async function getEV(sport: string, eventId: string) {   const res \= await fetch(\`${BASE}/v1/ev/${sport}/${eventId}\`, {     headers: { Authorization: \`Bearer ${KEY}\` }   });   return res.json(); // Returns { ev: number, pinnacleOdds: number, marketOdds: number } }   export async function getCLV(sport: string, eventId: string, betOdds: number) {   const res \= await fetch(\`${BASE}/v1/clv/${sport}/${eventId}\`, {     method: 'POST',     headers: { Authorization: \`Bearer ${KEY}\`, 'Content-Type': 'application/json' },     body: JSON.stringify({ betOdds })   });   return res.json(); // Returns { clv: number, closingOdds: number } } |
| :---- |

# **8\. Inngest Pipeline Architecture**

## **8.1 Client Setup**

| // inngest/client.ts import { Inngest } from 'inngest'; export const inngest \= new Inngest({ id: 'edge-prediction' });   // app/api/inngest/route.ts import { serve } from 'inngest/next'; import { inngest } from '@/inngest/client'; import { dailyPipeline } from '@/inngest/daily-pipeline'; import { settleResults } from '@/inngest/settle-results';   export const { GET, POST, PUT } \= serve({   client: inngest,   functions: \[dailyPipeline, settleResults\], }); |
| :---- |

## **8.2 Main Daily Pipeline Function**

| // inngest/daily-pipeline.ts import { inngest } from './client'; import { getUpcomingOdds } from '@/lib/odds-api'; import { getFixtures, getH2H, getInjuries, getPrediction, getTeamStats } from '@/lib/api-football'; import { getEV } from '@/lib/sharpapi'; import { runStage1 } from '@/pipeline/stage1-signal-scoring'; import { runStage2 } from '@/pipeline/stage2-pick-reasoning'; import { runStage3 } from '@/pipeline/stage3-ticket-assembly'; import { supabase } from '@/lib/supabase';   export const dailyPipeline \= inngest.createFunction(   { id: 'daily-prediction-pipeline' },   { cron: '0 6 \* \* \*' },  // 06:00 UTC daily   async ({ step }) \=\> {       // Step 1: Fetch raw data     const rawData \= await step.run('fetch-data', async () \=\> {       const \[odds, fixtures\] \= await Promise.all(\[         getUpcomingOdds('soccer\_epl'),         getFixtures(39, new Date().toISOString().split('T')\[0\])       \]);       // Enrich each fixture with H2H, injuries, prediction, team stats       const enriched \= await Promise.all(fixtures.map(async (f: any) \=\> ({         fixture: f,         h2h: await getH2H(f.teams.home.id, f.teams.away.id),         injuries: await getInjuries(f.fixture.id),         prediction: await getPrediction(f.fixture.id),         homeStats: await getTeamStats(39, 2025, f.teams.home.id),         awayStats: await getTeamStats(39, 2025, f.teams.away.id),         odds: odds.find((o: any) \=\> o.id \=== f.fixture.id) || null,       })));       return enriched;     });       // Step 2: Stage 1 — Signal scoring (Sonnet 4.5)     const scoredPicks \= await step.run('stage1-signal-scoring', async () \=\> {       return runStage1(rawData);     });       // Gate: only continue if ≥ 9 qualified picks     const qualified \= scoredPicks.filter((p: any) \=\> p.signalCount \>= 4);     if (qualified.length \< 9\) {       await supabase.from('sessions').insert({         date: new Date().toISOString().split('T')\[0\],         status: 'held',         reason\_held: \`Only ${qualified.length} picks qualified (need 9)\`,         picks\_qualified: qualified.length       });       return { held: true, reason: 'insufficient\_data' };     }       // Step 3: Stage 2 — Reasoning (Opus 4\)     const reasonedPicks \= await step.run('stage2-reasoning', async () \=\> {       return runStage2(qualified.slice(0, 9));     });       // Step 4: Stage 3 — Ticket assembly (Sonnet 4.5)     const tickets \= await step.run('stage3-assembly', async () \=\> {       return runStage3(reasonedPicks);     });       // Step 5: Write to Supabase     await step.run('persist', async () \=\> {       const { data: session } \= await supabase.from('sessions').insert({         date: new Date().toISOString().split('T')\[0\],         status: 'generated',         picks\_qualified: qualified.length,         tickets\_generated: tickets.length       }).select().single();         for (const pick of reasonedPicks) {         await supabase.from('picks').insert({ ...pick, session\_id: session.id });       }       for (const ticket of tickets) {         await supabase.from('tickets').insert({ ...ticket, session\_id: session.id });       }     });       return { success: true, picks: reasonedPicks.length, tickets: tickets.length };   } ); |
| :---- |

# **9\. The 3-Stage Claude Prompt System**

## **9.1 Stage 1 — Signal Scoring (Claude Sonnet 4.5)**

Stage 1 receives the enriched fixture JSON and returns a scored signal object for each pick candidate. This is a structured classification task — Sonnet handles it cleanly.

| // pipeline/prompts.ts — STAGE\_1\_SYSTEM\_PROMPT   export const STAGE\_1\_SYSTEM\_PROMPT \= \` You are a sports data analyst evaluating betting pick candidates. You will receive enriched fixture data as JSON.   For each fixture, evaluate ALL of the following 7 signal layers:   1\. H2H Record — last 10 meetings, weighted by recency   2\. Current Form — last 5 results for each team   3\. Home/Away Differential — home win %, away clean sheets   4\. Injury & Lineup — key player absences   5\. Market Odds Signal — line movement from opening to current   6\. EV Score — is the pick \+EV vs Pinnacle? (if EV data available)   7\. Statistical Model — does API-Football prediction align?   For each fixture, return a JSON array of pick candidates. Each candidate must include:   \- fixtureId: string   \- homeTeam: string   \- awayTeam: string   \- competition: string   \- marketType: string (e.g. 'BTTS Yes', 'Double Chance 1X', 'Asian Handicap \-0.5')   \- odds: number   \- signalCount: number (0–7, how many layers fired positively)   \- signalResults: object with keys layer1–layer7, each 'pass' or 'fail'   \- preliminaryConfidence: 'DIAMOND' | 'GOLD' | 'SILVER' | 'NO\_PICK'   \- evScore: number | null   Return ONLY valid JSON. No preamble, no explanation, no markdown. Discard any pick where signalCount \< 4\. \`; |
| :---- |

## **9.2 Stage 2 — Pick Reasoning (Claude Opus 4\)**

Stage 2 receives the qualified pick candidates from Stage 1 and produces detailed reasoning and finalised confidence tiers. This is the only stage where Opus 4 is used.

| // pipeline/prompts.ts — STAGE\_2\_SYSTEM\_PROMPT   export const STAGE\_2\_SYSTEM\_PROMPT \= \` You are an expert sports betting analyst. You will receive a list of pre-qualified pick candidates that have passed a 7-layer signal filter.   For each pick, produce a final analysis that includes:   \- finalConfidenceTier: 'DIAMOND' | 'GOLD' | 'SILVER'   \- confidencePct: number (65–95)   \- rationale: string (3–5 sentences covering: the primary reason for the pick,     the most important supporting signal, the key risk, and why the odds represent value)   \- stakeMultiplier: number (DIAMOND=3, GOLD=2, SILVER=1)   \- keyRisk: string (one sentence on the main thing that could go wrong)   \- bestOddsBook: string (which bookmaker has the best line from the odds data)   Be calibrated and honest. If a pick is genuinely borderline, say so in the rationale. Do not manufacture confidence. A SILVER pick with honest reasoning is better than a fake DIAMOND pick.   Return ONLY valid JSON array. No preamble, no explanation, no markdown. \`; |
| :---- |

## **9.3 Stage 3 — Ticket Assembly (Claude Sonnet 4.5)**

Stage 3 receives the fully reasoned picks and constructs exactly 3 tickets, enforcing all combination rules.

| // pipeline/prompts.ts — STAGE\_3\_SYSTEM\_PROMPT   export const STAGE\_3\_SYSTEM\_PROMPT \= \` You are assembling betting tickets from a set of analysed picks.   HARD RULES — these cannot be violated under any circumstances:   1\. Each ticket contains EXACTLY 3 picks   2\. Combined odds of each ticket MUST NOT exceed 3.00   3\. Each ticket must span at least 2 different marketType categories   4\. No pick may appear in more than one ticket   5\. You must produce EXACTLY 3 tickets: anchor, value, diversified   TICKET TYPES:   \- anchor: anchored by the highest signalCount pick; safest overall combination   \- value: prioritises highest evScore picks; maximum edge   \- diversified: covers different competitions or sports from anchor and value tickets   Return a JSON object with this exact shape:   { tickets: \[ { type, picks: \[pickId, pickId, pickId\], combinedOdds, rationale } \] }   Return ONLY valid JSON. No preamble, no explanation, no markdown. \`; |
| :---- |

# **10\. Post-Match Settlement**

## **10.1 Settlement Inngest Function**

A second Inngest function runs 2 hours after each match ends to settle results and update the bankroll:

| // inngest/settle-results.ts export const settleResults \= inngest.createFunction(   { id: 'settle-results' },   { cron: '0 22 \* \* \*' }, // 22:00 UTC — after most European evening matches   async ({ step }) \=\> {       // Fetch pending picks from today     const { data: pending } \= await supabase       .from('picks')       .select('\*')       .eq('status', 'pending')       .lte('match\_date', new Date().toISOString());       // For each pending pick, fetch the result from API-Football     // and update status to 'won' or 'lost'     await step.run('settle-picks', async () \=\> {       for (const pick of pending ?? \[\]) {         const result \= await getFixtureResult(pick.fixture\_id);         const won    \= evaluatePickResult(pick, result);         await supabase.from('picks')           .update({ status: won ? 'won' : 'lost', settled\_at: new Date().toISOString() })           .eq('id', pick.id);       }     });       // Fetch CLV for each settled pick and log it     await step.run('log-clv', async () \=\> {       // getCLV from SharpAPI for each settled pick       // Store in picks.clv column for long-term performance analysis     });       // Update bankroll snapshot     await step.run('update-bankroll', async () \=\> {       // Calculate today's P\&L, update bankroll table     });   } ); |
| :---- |

# **11\. Dashboard Implementation**

## **11.1 tRPC Router for Picks**

| // server/routers/picks.ts import { z } from 'zod'; import { router, publicProcedure } from '../trpc'; import { supabase } from '@/lib/supabase';   export const picksRouter \= router({   getToday: publicProcedure.query(async () \=\> {     const today \= new Date().toISOString().split('T')\[0\];     const { data } \= await supabase       .from('sessions')       .select('\*, tickets(\*), picks(\*)')       .eq('date', today)       .single();     return data;   }),     getHistory: publicProcedure     .input(z.object({ limit: z.number().default(50) }))     .query(async ({ input }) \=\> {       const { data } \= await supabase         .from('picks')         .select('\*')         .order('created\_at', { ascending: false })         .limit(input.limit);       return data;     }),     getBankrollStats: publicProcedure.query(async () \=\> {     const { data } \= await supabase       .from('bankroll')       .select('\*')       .order('date', { ascending: false })       .limit(90);     return data;   }), }); |
| :---- |

## **11.2 Core Dashboard Views**

* Today View — Session status badge (PICK SESSION READY / HOLDING), 3 ticket cards, each pick card with confidence badge, EV score, signal count, rationale, odds, stake recommendation

* History View — Table of all picks with outcome badges (WON / LOST / PENDING), filter by confidence tier and market type, CLV column showing edge quality post-match

* Bankroll View — Line chart of running balance, Win rate %, ROI %, 7/30/90-day rolling stats, market type performance breakdown

* Session Calendar — Monthly calendar view of which days generated picks vs held, hold rate metric

# **12\. Shadow Period Protocol**

Before staking any real money, run the full pipeline in shadow mode for a minimum of 2 weeks. Shadow mode means: picks are generated and stored in Supabase exactly as they would be in production, but no money is placed. After each session, manually check the results.

## **12.1 Shadow Period Metrics to Track**

* Raw win rate per pick — target ≥ 58% to consider going live

* CLV — are your picks beating the closing line? Target positive CLV on ≥ 55% of picks

* Confidence tier calibration — are DIAMOND picks winning more than GOLD winning more than SILVER?

* EV realisation — are high-EV picks outperforming low-EV picks over time?

* Market type breakdown — which of the 9 market categories is the AI performing best on?

## **12.2 Go / No-Go Decision**

* GO: win rate ≥ 58%, positive CLV on majority of picks, tier calibration validated

* NO-GO: win rate \< 50%, CLV mostly negative, tier calibration inverted → audit Stage 2 prompts

* PARTIAL GO: start with Silver/Gold stakes only; hold on DIAMOND until confidence builds

| Non-Negotiable *Two weeks of shadow running is the minimum. Do not skip this step. The shadow period is where you validate whether the Claude prompt system is actually calibrated or just confidently wrong. It is far cheaper to discover miscalibration on paper than on a live bankroll.* |
| :---- |

# **13\. Running Cost Summary**

| Cost Item | Month 1 | Month 3+ | Notes |
| ----- | ----- | ----- | ----- |
| The Odds API (Starter) | $49 | $49 | Upgrade to Pro ($99) for live in-play |
| API-Football (Basic) | $17 | $17 | Covers all EDGE football data needs |
| SharpAPI | $0 | $0–79 | Free tier fine for shadow period |
| Anthropic API | \~$7 | \~$7 | Hybrid Sonnet/Opus at 4 sessions/week |
| Supabase | $0 | $0–25 | Free until \> 500MB storage |
| Inngest | $0 | $0 | Free hobby tier is sufficient |
| Vercel | $0 | $0 | Free hobby tier |
| **TOTAL** | \~$73/mo | \~$73–177/mo | Scales with upgrades only |

*EDGE Implementation Guide v1.0  ·  Osinachi Patrick  ·  July 2026  ·  Private & Confidential*