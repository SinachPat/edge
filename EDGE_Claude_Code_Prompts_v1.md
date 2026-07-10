

| ⬡ EDGE Personal Sports Prediction Platform Claude Code Prompts  ·  Full Implementation Guide v1.0  ·  July 2026  ·  Osinachi Patrick |
| :---: |

| How to use this document This document contains 24 sequenced Claude Code prompts covering the full EDGE build from project scaffold to shadow period tooling. Each prompt is self-contained: open a Claude Code session in your project directory, paste the prompt exactly as written, and Claude Code will build the files. Work through the phases in order — later prompts depend on earlier ones. Before starting: complete all service signups from the Implementation Guide and have all .env.local variables ready. |
| :---- |

| \# | Prompt Name | What It Builds | Phase |
| :---: | :---- | :---- | :---- |
| **P-01** | **Project Scaffold \+ Dependencies** | Next.js init, folder structure, all npm installs | 1 — Foundation |
| **P-02** | **Environment \+ Supabase Client** | env validation, typed Supabase client | 1 — Foundation |
| **P-03** | **Supabase Database Schema** | All 5 tables, indexes, RLS policies | 1 — Foundation |
| **P-04** | **Type Definitions** | Full TypeScript types for the entire platform | 1 — Foundation |
| **P-05** | **The Odds API Client** | Typed client for all market endpoints | 1 — Foundation |
| **P-06** | **API-Football Client** | Fixtures, H2H, injuries, predictions, stats | 1 — Foundation |
| **P-07** | **SharpAPI Client** | EV detection, CLV logging | 1 — Foundation |
| **P-08** | **Anthropic SDK Client** | Model client with per-stage config | 2 — AI Engine |
| **P-09** | **Stage 1 — Signal Scoring (Sonnet)** | 7-layer signal evaluator \+ prompt | 2 — AI Engine |
| **P-10** | **Stage 2 — Pick Reasoning (Opus)** | Deep reasoning engine \+ prompt | 2 — AI Engine |
| **P-11** | **Stage 3 — Ticket Assembly (Sonnet)** | Ticket builder \+ prompt | 2 — AI Engine |
| **P-12** | **Inngest Client \+ Pipeline Scaffold** | Inngest setup, route handler | 3 — Pipeline |
| **P-13** | **Daily Pipeline Function** | Full cron job orchestrating all stages | 3 — Pipeline |
| **P-14** | **Post-Match Settlement Function** | Result fetching, CLV logging, bankroll update | 3 — Pipeline |
| **P-15** | **tRPC Router \+ Server Setup** | tRPC server, picks/tickets/bankroll routers | 4 — Backend |
| **P-16** | **Kelly Criterion Staking Module** | Stake calculator, bankroll rules enforcer | 4 — Backend |
| **P-17** | **Dashboard — Today View** | Session status, 3 ticket cards, pick cards | 5 — Frontend |
| **P-18** | **Dashboard — Pick History View** | Filterable pick log with outcome badges | 5 — Frontend |
| **P-19** | **Dashboard — Bankroll Tracker** | Running balance chart, ROI stats, P\&L | 5 — Frontend |
| **P-20** | **Dashboard — Session Calendar** | Calendar view, hold rate indicator | 5 — Frontend |
| **P-21** | **Pick Card Component** | Reusable pick card with all data fields | 5 — Frontend |
| **P-22** | **Ticket Card Component** | Ticket card with 3 picks \+ combined odds | 5 — Frontend |
| **P-23** | **Shadow Period Test Harness** | CLI script to backtest picks against results | 6 — Validation |
| **P-24** | **Vercel Deployment Config** | vercel.json, env setup, cron configuration | 6 — Validation |

| PHASE 1 Data Foundation Project scaffold · API clients · Database schema · Types |
| :---: |

| P-01 | Project Scaffold \+ Dependencies Phase: 1 — Foundation   Files: package.json, directory structure, .gitignore *Initialises the Next.js 14 project with the full EDGE directory structure and all required npm dependencies.* |
| :---: | :---- |

| Context & Assumptions Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, tRPC, Supabase, Inngest, Anthropic SDKProject name: edgeDo NOT install Vercel AI SDK — we use @anthropic-ai/sdk directly |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create a new Next.js 14 project called 'edge' with TypeScript, Tailwind CSS, and the App Router. Then install ALL of the following dependencies:   Production:   @anthropic-ai/sdk   @supabase/supabase-js   @supabase/ssr   @trpc/server   @trpc/client   @trpc/react-query   @tanstack/react-query   inngest   zod   recharts   date-fns   clsx   tailwind-merge   Dev:   @types/node   Then create the following empty directories (with .gitkeep files):   /lib   /pipeline   /pipeline/prompts   /inngest   /server   /server/routers   /types   /components   /components/picks   /components/ui   /scripts   Add a .gitignore that includes: .env.local, .env, node\_modules, .next, \*.log   Do NOT create any application logic files yet — only the scaffold and dependencies. |

| P-02 | Environment Variables \+ Supabase Client Phase: 1 — Foundation   Files: lib/env.ts, lib/supabase.ts, .env.local.example *Type-safe environment variable validation using Zod and the Supabase client initialised for both server and client-side use.* |
| :---: | :---- |

| Context & Assumptions Uses Zod for env validation — no raw process.env access anywhere outside lib/env.tsSupabase needs two clients: a server-side client (service role key) and a browser client (anon key)Required env vars: ODDS\_API\_KEY, SHARPAPI\_KEY, APIFOOTBALL\_KEY, ANTHROPIC\_API\_KEY,  NEXT\_PUBLIC\_SUPABASE\_URL, NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY, SUPABASE\_SERVICE\_KEY,  INNGEST\_EVENT\_KEY, INNGEST\_SIGNING\_KEY |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create lib/env.ts that:   1\. Uses Zod to define a schema for all required environment variables   2\. Validates process.env against the schema at module load time   3\. Throws a clear error listing missing vars if validation fails   4\. Exports a typed \`env\` object — all app code imports from here, never process.env directly   Required variables:   ODDS\_API\_KEY (string)   SHARPAPI\_KEY (string)   APIFOOTBALL\_KEY (string)   ANTHROPIC\_API\_KEY (string)   NEXT\_PUBLIC\_SUPABASE\_URL (string, url)   NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY (string)   SUPABASE\_SERVICE\_KEY (string)   INNGEST\_EVENT\_KEY (string)   INNGEST\_SIGNING\_KEY (string)   NODE\_ENV (enum: development, test, production, default: development)   Create lib/supabase.ts that exports:   \- createServerClient(): Supabase client using SUPABASE\_SERVICE\_KEY (server-side only)   \- createBrowserClient(): Supabase client using NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY (browser-safe)   Create .env.local.example listing all variables with placeholder values and comments. Do NOT create the actual .env.local file. |

| P-03 | Supabase Database Schema Phase: 1 — Foundation   Files: supabase/migrations/001\_initial\_schema.sql *Full PostgreSQL schema with all 5 tables, indexes, constraints, and Row Level Security policies.* |
| :---: | :---- |

| Context & Assumptions Tables: sessions, picks, tickets, bankroll, signal\_logSingle-user personal app — RLS policies should allow all operations for authenticated userpicks.status: pending | won | lost | voidtickets.ticket\_type: anchor | value | diversifiedconfidence\_tier: DIAMOND | GOLD | SILVER |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create supabase/migrations/001\_initial\_schema.sql with the complete database schema.   Create these tables in order:   1\. sessions    \- id UUID PRIMARY KEY DEFAULT gen\_random\_uuid()    \- date DATE NOT NULL UNIQUE    \- status TEXT NOT NULL CHECK (status IN ('generated','held'))    \- reason\_held TEXT    \- picks\_qualified INTEGER DEFAULT 0    \- tickets\_generated INTEGER DEFAULT 0    \- created\_at TIMESTAMPTZ DEFAULT NOW()   2\. picks    \- id UUID PRIMARY KEY DEFAULT gen\_random\_uuid()    \- session\_id UUID REFERENCES sessions(id) ON DELETE CASCADE    \- sport TEXT NOT NULL    \- competition TEXT NOT NULL    \- home\_team TEXT NOT NULL    \- away\_team TEXT NOT NULL    \- fixture\_id TEXT (external API ID)    \- match\_date TIMESTAMPTZ NOT NULL    \- market\_type TEXT NOT NULL    \- selection TEXT NOT NULL    \- odds DECIMAL(6,2) NOT NULL    \- confidence\_tier TEXT NOT NULL CHECK IN ('DIAMOND','GOLD','SILVER')    \- confidence\_pct INTEGER    \- ev\_score DECIMAL(6,2)    \- signal\_count INTEGER NOT NULL CHECK BETWEEN 0 AND 7    \- rationale TEXT NOT NULL    \- key\_risk TEXT    \- stake\_pct DECIMAL(4,2) NOT NULL    \- stake\_amount DECIMAL(10,2)    \- status TEXT DEFAULT 'pending' CHECK IN ('pending','won','lost','void')    \- closing\_odds DECIMAL(6,2)    \- clv DECIMAL(6,2)    \- created\_at TIMESTAMPTZ DEFAULT NOW()    \- settled\_at TIMESTAMPTZ   3\. tickets    \- id UUID PRIMARY KEY DEFAULT gen\_random\_uuid()    \- session\_id UUID REFERENCES sessions(id) ON DELETE CASCADE    \- ticket\_type TEXT NOT NULL CHECK IN ('anchor','value','diversified')    \- pick\_ids UUID\[\] NOT NULL    \- combined\_odds DECIMAL(6,3) NOT NULL    \- total\_stake DECIMAL(10,2)    \- total\_return DECIMAL(10,2)    \- profit\_loss DECIMAL(10,2)    \- status TEXT DEFAULT 'pending' CHECK IN ('pending','won','lost')    \- created\_at TIMESTAMPTZ DEFAULT NOW()   4\. bankroll    \- id UUID PRIMARY KEY DEFAULT gen\_random\_uuid()    \- date DATE NOT NULL UNIQUE    \- opening\_balance DECIMAL(12,2) NOT NULL    \- closing\_balance DECIMAL(12,2)    \- sessions\_count INTEGER DEFAULT 0    \- total\_staked DECIMAL(12,2) DEFAULT 0    \- total\_returned DECIMAL(12,2) DEFAULT 0    \- running\_roi DECIMAL(8,4)    \- win\_count INTEGER DEFAULT 0    \- loss\_count INTEGER DEFAULT 0    \- created\_at TIMESTAMPTZ DEFAULT NOW()   5\. signal\_log    \- id UUID PRIMARY KEY DEFAULT gen\_random\_uuid()    \- pick\_id UUID REFERENCES picks(id) ON DELETE CASCADE    \- layer INTEGER NOT NULL CHECK BETWEEN 1 AND 7    \- layer\_name TEXT NOT NULL    \- result TEXT NOT NULL CHECK IN ('pass','fail')    \- detail JSONB    \- created\_at TIMESTAMPTZ DEFAULT NOW()   Add indexes on: picks(session\_id), picks(status), picks(match\_date), tickets(session\_id),   signal\_log(pick\_id), bankroll(date)   Enable RLS on all tables. Add permissive policies for authenticated users. Add a policy for the service role to bypass RLS (for server-side pipeline writes). |

| P-04 | TypeScript Type Definitions Phase: 1 — Foundation   Files: types/edge.ts, types/api.ts *Complete TypeScript type system for all database entities, API responses, and pipeline data structures.* |
| :---: | :---- |

| Context & Assumptions types/edge.ts — database types \+ pipeline typestypes/api.ts — external API response shapes (Odds API, API-Football, SharpAPI)All types should be exported and used consistently across lib/, pipeline/, server/ |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create types/edge.ts with TypeScript types for:   Database entities (mirror the schema exactly):   Session, Pick, Ticket, BankrollSnapshot, SignalLog   Include a PickStatus ('pending'|'won'|'lost'|'void') union   Include a ConfidenceTier ('DIAMOND'|'GOLD'|'SILVER') union   Include a TicketType ('anchor'|'value'|'diversified') union   Include a SignalResult ('pass'|'fail') union   Pipeline data structures:   RawFixtureData — the enriched fixture object fed into Stage 1     (includes fixture, h2h, injuries, prediction, homeStats, awayStats, odds)   SignalScore — Stage 1 output per pick candidate     (fixtureId, homeTeam, awayTeam, competition, sport, marketType, selection,      odds, signalCount, signalResults record of layer1–layer7, preliminaryConfidence, evScore)   ReasonedPick — Stage 2 output (extends SignalScore with:     finalConfidenceTier, confidencePct, rationale, keyRisk, stakeMultiplier, bestOddsBook)   AssembledTicket — Stage 3 output     (type: TicketType, pickIds: string\[\], combinedOdds, rationale)   PipelineResult — full session result     (sessionId, date, status, picksQualified, tickets: AssembledTicket\[\])   Create types/api.ts with response shapes for:   OddsApiEvent — event from The Odds API (id, sport\_key, sport\_title, commence\_time,     home\_team, away\_team, bookmakers: OddsApiBookmaker\[\])   OddsApiBookmaker — (key, title, last\_update, markets: OddsApiMarket\[\])   OddsApiMarket — (key, last\_update, outcomes: OddsApiOutcome\[\])   OddsApiOutcome — (name, price, point?)   ApiFootballFixture — top-level fixture wrapper from API-Football   ApiFootballTeam — (id, name, logo)   ApiFootballPrediction — prediction object from /predictions endpoint   SharpApiEvResponse — (ev: number, pinnacleOdds: number, marketOdds: number, edge: number)   SharpApiClvResponse — (clv: number, closingOdds: number, betOdds: number)   Export all types as named exports. Use readonly where appropriate. |

| P-05 | The Odds API Client Phase: 1 — Foundation   Files: lib/odds-api.ts *Fully typed client for The Odds API covering all market endpoints needed by the EDGE pipeline.* |
| :---: | :---- |

| Context & Assumptions Base URL: https://api.the-odds-api.com/v4Key markets: h2h, spreads, totals, btts, player\_props, alternate\_spreads, alternate\_totalsRegions: eu, uk (decimal odds)Cache responses 30 minutes — we call this once per pipeline run, not on every requestTrack remaining API credits from response headers (x-requests-remaining) |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create lib/odds-api.ts with a fully typed client for The Odds API.   Import API key from lib/env.ts (env.ODDS\_API\_KEY). Import OddsApiEvent type from types/api.ts.   Export these functions:   1\. getUpcomingOdds(sportKey: string, markets?: string\[\]): Promise\<OddsApiEvent\[\]\>    \- Calls /sports/{sportKey}/odds/    \- Default markets: h2h,spreads,totals,btts,player\_props    \- Regions: eu,uk  OddsFormat: decimal    \- Cache: 30 minutes (Next.js fetch cache)    \- Log remaining credits from x-requests-remaining header   2\. getHistoricalOdds(sportKey: string, eventId: string): Promise\<OddsApiEvent | null\>    \- Calls /sports/{sportKey}/odds-history/    \- Returns null on 404   3\. getSupportedSports(): Promise\<{ key: string; title: string; active: boolean }\[\]\>    \- Calls /sports/   4\. getLiveOdds(sportKey: string): Promise\<OddsApiEvent\[\]\>    \- Calls /sports/{sportKey}/odds/ with live events only   Export a SPORT\_KEYS constant object with the keys for:   EPL, CHAMPIONS\_LEAGUE, LA\_LIGA, SERIE\_A, BUNDESLIGA, LIGUE\_1,   NBA, NFL, TENNIS\_ATP   Add a helper getBestOdds(event: OddsApiEvent, market: string, selection: string): number that finds the highest decimal odds across all bookmakers for a given selection.   Handle all errors with descriptive messages including the endpoint called. Never throw raw fetch errors — wrap and re-throw with context. |

| P-06 | API-Football Client Phase: 1 — Foundation   Files: lib/api-football.ts *Typed client for API-Football covering fixtures, H2H, injuries, team statistics, lineups, and predictions.* |
| :---: | :---- |

| Context & Assumptions Base URL: https://v3.football.api-sports.ioAuth: x-apisports-key headerFree tier: 100 calls/day — be conservative; the pipeline batches calls per fixtureResponse shape: { response: T\[\], results: number, errors: any } |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create lib/api-football.ts with a typed client for API-Football (api-sports.io).   Import key from lib/env.ts (env.APIFOOTBALL\_KEY).   Create a private fetchFootball\<T\>(endpoint: string) helper that:   \- Sets x-apisports-key header   \- Parses the { response: T\[\] } wrapper   \- Throws if errors is non-empty   \- Returns T\[\] (the response array)   Export these functions:   1\. getFixtures(params: { leagueId?: number; date?: string; teamId?: number; next?: number })    \-\> ApiFootballFixture\[\]    Calls /fixtures with the given params   2\. getH2H(teamA: number, teamB: number, last \= 10\)    \-\> ApiFootballFixture\[\]    Calls /fixtures/headtohead?h2h={teamA}-{teamB}\&last={last}   3\. getInjuries(fixtureId: number)    \-\> any\[\]  (injury report objects)    Calls /injuries?fixture={fixtureId}   4\. getLineup(fixtureId: number)    \-\> any\[\]  (lineup objects including startXI and substitutes)    Calls /fixtures/lineups?fixture={fixtureId}   5\. getPrediction(fixtureId: number)    \-\> ApiFootballPrediction | null    Calls /predictions?fixture={fixtureId}, returns first result or null   6\. getTeamStats(leagueId: number, season: number, teamId: number)    \-\> any  (team statistics object)    Calls /teams/statistics   7\. getFixtureResult(fixtureId: number)    \-\> { homeGoals: number; awayGoals: number; status: string } | null    Calls /fixtures?id={fixtureId}, extracts score and status   Export a LEAGUE\_IDS constant:   EPL: 39, CHAMPIONS\_LEAGUE: 2, LA\_LIGA: 140, SERIE\_A: 135,   BUNDESLIGA: 78, LIGUE\_1: 61 |

| P-07 | SharpAPI Client Phase: 1 — Foundation   Files: lib/sharpapi.ts *EV detection and CLV logging client for SharpAPI — the edge verification layer of the pipeline.* |
| :---: | :---- |

| Context & Assumptions SharpAPI compares your assessed odds against Pinnacle's sharp linesEV \> 0 means the pick has positive expected value vs the sharpest marketCLV is logged post-match: did the closing line confirm your edge?Free tier: 12 requests/minute — sufficient for daily pipeline |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create lib/sharpapi.ts with a typed client for SharpAPI.   Import key from lib/env.ts (env.SHARPAPI\_KEY). Import SharpApiEvResponse and SharpApiClvResponse from types/api.ts.   Export these functions:   1\. getExpectedValue(sport: string, eventId: string, market: string, selection: string)    \-\> Promise\<SharpApiEvResponse | null\>    Returns null if event not found or free tier limit hit (handle 429 gracefully)   2\. getClosingLineValue(eventId: string, betOdds: number, market: string)    \-\> Promise\<SharpApiClvResponse | null\>    Used in post-match settlement to log CLV   3\. batchGetEV(events: { sport: string; eventId: string; market: string; selection: string }\[\])    \-\> Promise\<(SharpApiEvResponse | null)\[\]\>    Throttled batch caller — 12 requests/minute max.    Use a simple delay between calls to stay within rate limits.   Add a helper isPositiveEV(ev: SharpApiEvResponse | null, minEdge \= 4): boolean that returns true if ev is non-null and ev.ev \>= minEdge.   All functions must handle network errors gracefully — return null rather than throwing, but log a warning with the error so the pipeline can continue without EV data. |

| PHASE 2 AI Engine Anthropic client · 3-stage Claude pipeline · Prompt system |
| :---: |

| P-08 | Anthropic SDK Client Phase: 2 — AI Engine   Files: lib/anthropic.ts *Typed Anthropic client with per-stage model configuration and JSON-safe response parsing.* |
| :---: | :---- |

| Context & Assumptions Stage 1 (signal scoring): claude-sonnet-4-5Stage 2 (pick reasoning): claude-opus-4-5Stage 3 (ticket assembly): claude-sonnet-4-5All pipeline calls expect structured JSON output — never markdown, never preambleDO NOT use Vercel AI SDK — use @anthropic-ai/sdk directly |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create lib/anthropic.ts with a typed Anthropic API client for the EDGE pipeline.   Import @anthropic-ai/sdk and env.ANTHROPIC\_API\_KEY from lib/env.ts.   Export a MODEL\_CONFIG constant:   STAGE\_1: 'claude-sonnet-4-5'   STAGE\_2: 'claude-opus-4-5'   STAGE\_3: 'claude-sonnet-4-5'   Export a callClaude function with signature:   callClaude(params: {     model: string     systemPrompt: string     userContent: string     maxTokens: number     stage: 1 | 2 | 3  // for logging   }): Promise\<string\>   The function should:   \- Call anthropic.messages.create with the given params   \- Extract the text content from the first TextBlock   \- Log: stage number, model used, input tokens, output tokens   \- Throw a typed EdgeAIError if the response contains no text block   \- Retry once on 529 (overloaded) with a 5-second delay   Export a parseJsonResponse\<T\>(raw: string): T function that:   \- Strips any accidental markdown code fences (\`\`\`json ... \`\`\`)   \- Trims whitespace   \- Parses JSON and returns as T   \- Throws EdgeAIError with the raw response if parsing fails   Export EdgeAIError as a custom Error subclass with fields: stage, model, rawResponse. |

| P-09 | Stage 1 — Signal Scoring (Sonnet 4.5) Phase: 2 — AI Engine   Files: pipeline/stage1-signal-scoring.ts, pipeline/prompts/stage1.ts *The signal scoring engine: feeds enriched fixture data to Claude Sonnet 4.5 and returns scored pick candidates with 7-layer signal results.* |
| :---: | :---- |

| Context & Assumptions This is a classification task — Sonnet 4.5 is sufficientInput: RawFixtureData\[\] from the data fetch stepOutput: SignalScore\[\] — only picks where signalCount \>= 4Prompt must demand JSON-only output with no preambleSignal layers: H2H, Form, Home/Away Diff, Injuries, Market Odds, EV, Statistical Model |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create pipeline/prompts/stage1.ts exporting a STAGE\_1\_SYSTEM\_PROMPT string.   The prompt must instruct Claude to:   \- Receive enriched fixture JSON   \- Evaluate each fixture across all 7 signal layers (define each clearly in the prompt)   \- For each fixture, generate pick candidates across these market types:       1X2 result, Double Chance, Draw No Bet, BTTS Yes/No,       Over/Under 1.5 / 2.5 / 3.5, Asian Handicap \-0.5 / \+0.5 / \-1,       First Half result, Player Anytime Scorer (if player data available)   \- Return a JSON array where each object has:       fixtureId, homeTeam, awayTeam, competition, sport,       marketType, selection, odds,       signalCount (0–7),       signalResults: { layer1: 'pass'|'fail', ... layer7: 'pass'|'fail' },       signalNotes: { layer1: string, ... }  (brief reason for each pass/fail)       preliminaryConfidence: 'DIAMOND'|'GOLD'|'SILVER'|'NO\_PICK',       evScore: number | null   \- Discard any pick where signalCount \< 4   \- Return ONLY valid JSON. No preamble, no markdown, no explanation.   Create pipeline/stage1-signal-scoring.ts exporting:     runStage1(fixtures: RawFixtureData\[\]): Promise\<SignalScore\[\]\>     This function should:   \- Serialise the fixtures array to JSON string   \- Call callClaude from lib/anthropic.ts with:       model: MODEL\_CONFIG.STAGE\_1       systemPrompt: STAGE\_1\_SYSTEM\_PROMPT       maxTokens: 4096       stage: 1   \- Parse the response with parseJsonResponse\<SignalScore\[\]\>   \- Filter to only picks where signalCount \>= 4   \- Return the filtered array   \- On any error, log the error and return empty array (don't crash the pipeline) |

| P-10 | Stage 2 — Pick Reasoning (Opus 4\) Phase: 2 — AI Engine   Files: pipeline/stage2-pick-reasoning.ts, pipeline/prompts/stage2.ts *The deep reasoning engine: takes qualified pick candidates and uses Claude Opus 4 to produce final confidence tiers, written rationale, and risk assessment.* |
| :---: | :---- |

| Context & Assumptions This is the ONLY stage using Opus 4 — the reasoning complexity justifies the costInput: SignalScore\[\] (top 9 candidates from Stage 1)Output: ReasonedPick\[\] — each with finalConfidenceTier, rationale, keyRisk, stakeMultiplierPrompt must push Claude to be calibrated — honest Silver is better than confident DIAMONDRationale should be 3–5 sentences: primary reason, supporting signal, key risk, value case |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create pipeline/prompts/stage2.ts exporting a STAGE\_2\_SYSTEM\_PROMPT string.   The prompt must instruct Claude to act as an expert sports betting analyst and:   \- Receive a list of pre-qualified pick candidates as JSON   \- For each pick, produce a final analysis with these fields:       finalConfidenceTier: 'DIAMOND'|'GOLD'|'SILVER'       confidencePct: number between 65 and 95       rationale: string — exactly 3–5 sentences covering:         (a) the primary reason this pick has edge,         (b) the most compelling supporting signal,         (c) the key risk that could invalidate the pick,         (d) why the current odds represent value       keyRisk: string — one sentence on the main failure mode       stakeMultiplier: number (DIAMOND=3, GOLD=2, SILVER=1)       bestOddsBook: string — which bookmaker has the highest odds for this selection   \- Apply these tier thresholds strictly:       DIAMOND: all 7 signals aligned, EV \>= 15%, confidencePct 85–95       GOLD: 5–6 signals, EV \>= 8%, confidencePct 75–84       SILVER: 4–5 signals, EV \>= 4%, confidencePct 65–74   \- Be calibrated and honest. An honest SILVER beats an inflated DIAMOND.   \- Return ONLY valid JSON array. No preamble, no markdown.   Create pipeline/stage2-pick-reasoning.ts exporting:     runStage2(candidates: SignalScore\[\]): Promise\<ReasonedPick\[\]\>     This function should:   \- Take up to 9 candidates (slice if more)   \- Call callClaude with model: MODEL\_CONFIG.STAGE\_2, maxTokens: 8192, stage: 2   \- Parse and return ReasonedPick\[\]   \- Log total Opus 4 token usage for cost monitoring |

| P-11 | Stage 3 — Ticket Assembly (Sonnet 4.5) Phase: 2 — AI Engine   Files: pipeline/stage3-ticket-assembly.ts, pipeline/prompts/stage3.ts *The ticket construction engine: assembles exactly 3 tickets from reasoned picks, enforcing all combination rules including the 3.00 combined odds cap.* |
| :---: | :---- |

| Context & Assumptions Hard rules: exactly 3 picks per ticket, combined odds \<= 3.00, no pick in 2+ ticketsThree ticket types: anchor (safest), value (highest EV), diversified (different competitions)Combined odds \= odds1 \* odds2 \* odds3If combined odds would exceed 3.00, Sonnet must find a valid combination |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create pipeline/prompts/stage3.ts exporting a STAGE\_3\_SYSTEM\_PROMPT string.   The prompt must instruct Claude to:   \- Receive a JSON array of ReasonedPick objects   \- Assemble EXACTLY 3 tickets following these HARD RULES (never violate):       Rule 1: Each ticket contains EXACTLY 3 picks       Rule 2: Combined odds (p1.odds \* p2.odds \* p3.odds) must NOT exceed 3.00       Rule 3: Each ticket must span at least 2 different marketType categories       Rule 4: No pick may appear in more than one ticket       Rule 5: Produce exactly these 3 types:         anchor — anchored by highest signalCount pick, safest combination         value — prioritises picks with highest evScore         diversified — covers different competitions from the other two tickets   \- Return a JSON object with this exact structure:       { tickets: \[           { type: 'anchor', picks: \[id1, id2, id3\], combinedOdds: number, assemblyNote: string },           { type: 'value',  picks: \[id1, id2, id3\], combinedOdds: number, assemblyNote: string },           { type: 'diversified', picks: \[id1, id2, id3\], combinedOdds: number, assemblyNote: string }         \]       }   \- assemblyNote: one sentence explaining why these 3 picks were grouped   \- Return ONLY valid JSON. No preamble, no markdown.   Create pipeline/stage3-ticket-assembly.ts exporting:     runStage3(picks: ReasonedPick\[\]): Promise\<AssembledTicket\[\]\>     This function should:   \- Call callClaude with model: MODEL\_CONFIG.STAGE\_3, maxTokens: 2048, stage: 3   \- Parse the { tickets: \[\] } wrapper   \- Validate: confirm 3 tickets, each with 3 picks, combined odds \<= 3.00   \- If validation fails, log a warning and attempt once more with an explicit correction message   \- Return AssembledTicket\[\] |

| PHASE 3 Inngest Pipeline Cron orchestration · Daily run · Post-match settlement |
| :---: |

| P-12 | Inngest Client \+ Route Handler Phase: 3 — Pipeline   Files: inngest/client.ts, app/api/inngest/route.ts *Inngest client initialisation and the Next.js route handler that registers all pipeline functions.* |
| :---: | :---- |

| Context & Assumptions Inngest runs as a serverless background job systemThe route handler at /api/inngest registers all functions with Inngest's cloudTwo functions: daily-prediction-pipeline (cron) and settle-results (cron) |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create inngest/client.ts that:   \- Imports Inngest from 'inngest'   \- Creates and exports an inngest client with id: 'edge-prediction'   \- Imports INNGEST\_EVENT\_KEY from lib/env.ts   Create app/api/inngest/route.ts that:   \- Imports serve from 'inngest/next'   \- Imports the inngest client   \- Imports dailyPipeline from inngest/daily-pipeline (file to be created in P-13)   \- Imports settleResults from inngest/settle-results (file to be created in P-14)   \- Exports GET, POST, PUT using the serve function   \- Sets maxDuration: 300 (5 minutes) on the route config to allow long pipeline runs   Add a simple health check endpoint at app/api/health/route.ts that returns:   { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' } |

| P-13 | Daily Prediction Pipeline Function Phase: 3 — Pipeline   Files: inngest/daily-pipeline.ts *The core Inngest cron function that orchestrates the full daily prediction pipeline: data fetch → Stage 1 → gate check → Stage 2 → Stage 3 → Supabase write.* |
| :---: | :---- |

| Context & Assumptions Runs at 06:00 UTC daily via cron: '0 6 \* \* \*'Gate: if \< 9 qualified picks after Stage 1, write a 'held' session and exitEach Inngest step is independently retried on failureUses step.run() to wrap each stage — this gives retries and logging per stepStarts with EPL (league 39\) for the MVP — add more leagues later |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create inngest/daily-pipeline.ts with the main prediction pipeline Inngest function.   The function should be named 'daily-prediction-pipeline' and run at cron: '0 6 \* \* \*'.   Implement these steps in order using step.run():   Step 1: 'fetch-fixtures'   \- Get today's date as YYYY-MM-DD   \- Fetch fixtures for EPL (leagueId: 39\) using getFixtures from lib/api-football.ts   \- Also fetch fixtures for Champions League (leagueId: 2\) and La Liga (leagueId: 140\)   \- Combine all fixtures, deduplicate by fixture.fixture.id   \- Return the fixture array   Step 2: 'fetch-odds'   \- Fetch odds for EPL, Champions League, La Liga using getUpcomingOdds   \- Use SPORT\_KEYS from lib/odds-api.ts   \- Return odds keyed by event ID   Step 3: 'enrich-fixtures'   \- For each fixture (max 15 to control API usage):       Fetch H2H, injuries, team stats (home \+ away), prediction in parallel   \- Merge with matching odds from Step 2   \- Return RawFixtureData\[\]   Step 4: 'stage1-signal-scoring'   \- Call runStage1 from pipeline/stage1-signal-scoring.ts   \- Filter picks where signalCount \>= 4   \- If \< 9 qualified picks: write a held session to Supabase and return early:       { held: true, reason: \`Only ${count} picks qualified\`, picksQualified: count }   Step 5: 'stage2-reasoning'   \- Take top 9 picks (sort by signalCount desc, then evScore desc)   \- Call runStage2 from pipeline/stage2-pick-reasoning.ts   Step 6: 'stage3-assembly'   \- Call runStage3 from pipeline/stage3-ticket-assembly.ts   \- Validate 3 tickets returned   Step 7: 'persist-to-supabase'   \- Create a new session record (status: 'generated')   \- For each ReasonedPick: calculate stakeAmount using Kelly Criterion     (import calculateStake from lib/kelly.ts — to be created in P-16)   \- Insert all picks into the picks table with session\_id   \- Insert signal\_log entries for each pick's 7 signal layers   \- Insert all 3 tickets into the tickets table   \- Return { success: true, sessionId, picksCount, ticketsCount } |

| P-14 | Post-Match Settlement Function Phase: 3 — Pipeline   Files: inngest/settle-results.ts *The settlement cron function that checks match results, settles pick outcomes, logs CLV, and updates the daily bankroll snapshot.* |
| :---: | :---- |

| Context & Assumptions Runs at 22:00 UTC daily — after most European evening fixtures finishUses getFixtureResult from lib/api-football.ts to check final scoresevaluatePickResult determines if a pick won based on market type and selectionCLV is logged from SharpAPI after settlement |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create inngest/settle-results.ts with a settlement Inngest function.   Function name: 'settle-results', cron: '0 22 \* \* \*'   Implement a helper function evaluatePickResult(pick: Pick, result: { homeGoals: number; awayGoals: number }) : 'won' | 'lost' | 'void' that handles these market types:   \- '1X2 Home Win': won if homeGoals \> awayGoals   \- '1X2 Draw': won if homeGoals \=== awayGoals   \- '1X2 Away Win': won if awayGoals \> homeGoals   \- 'BTTS Yes': won if homeGoals \> 0 && awayGoals \> 0   \- 'BTTS No': won if homeGoals \=== 0 || awayGoals \=== 0   \- 'Over 2.5': won if homeGoals \+ awayGoals \> 2   \- 'Under 2.5': won if homeGoals \+ awayGoals \< 3   \- 'Over 1.5': won if total \> 1   \- 'Under 1.5': won if total \< 2   \- 'Double Chance 1X': won if homeGoals \>= awayGoals   \- 'Double Chance X2': won if awayGoals \>= homeGoals   \- 'Double Chance 12': won if homeGoals \!== awayGoals   \- 'Asian Handicap Home \-0.5': won if homeGoals \> awayGoals   \- Returns 'void' for any unrecognised market type   Steps:   Step 1: 'fetch-pending-picks'   \- Query picks table for status='pending' AND match\_date \<= now()   Step 2: 'settle-picks'   \- For each pending pick: call getFixtureResult(pick.fixture\_id)   \- If result is null (match not finished): skip   \- Otherwise: call evaluatePickResult, update pick status and settled\_at   Step 3: 'log-clv'   \- For each now-settled pick: call getClosingLineValue from lib/sharpapi.ts   \- Update picks.closing\_odds and picks.clv   \- Log null gracefully if SharpAPI has no data   Step 4: 'settle-tickets'   \- For each ticket: check if all 3 picks are now settled   \- A ticket wins if ALL 3 picks have status='won'   \- Calculate profit\_loss: (total\_stake \* combined\_odds) \- total\_stake if won, else \-total\_stake   \- Update ticket status and profit\_loss   Step 5: 'update-bankroll'   \- Fetch today's bankroll record (or create if it doesn't exist)   \- Sum today's settled ticket profit\_loss   \- Update closing\_balance, total\_staked, total\_returned, win\_count, loss\_count   \- Calculate running\_roi as (total\_returned \- total\_staked) / total\_staked \* 100 |

| PHASE 4 Backend & Logic tRPC routers · Kelly Criterion staking module |
| :---: |

| P-15 | tRPC Server \+ Routers Phase: 4 — Backend   Files: server/trpc.ts, server/routers/picks.ts, server/routers/bankroll.ts, app/api/trpc/\[trpc\]/route.ts *The full tRPC backend with typed routers for picks, tickets, sessions, and bankroll data — the data layer for the dashboard.* |
| :---: | :---- |

| Context & Assumptions tRPC v11 with Next.js App Router adapterThree routers: picks (get today, history, by id), tickets (get today's tickets), bankroll (stats, history)All queries use the Supabase server client from lib/supabase.ts |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create server/trpc.ts with:   \- tRPC initialiser using initTRPC   \- A createContext function (can be empty for single-user app)   \- Export: router, publicProcedure, createCallerFactory   Create server/routers/picks.ts with a picksRouter containing:     getToday: publicProcedure.query     \- Fetch today's session (date \= today)     \- Include related tickets and picks     \- Return { session, tickets, picks } or null if no session today     getHistory: publicProcedure.input(z.object({ limit: z.number().default(100) })).query     \- Fetch picks ordered by created\_at desc     \- Include session date for each pick     getById: publicProcedure.input(z.string()).query     \- Fetch a single pick by ID including signal\_log entries     getStats: publicProcedure.query     \- Return: totalPicks, wonPicks, lostPicks, pendingPicks, winRate,       avgOdds, avgEV, picksByTier { DIAMOND, GOLD, SILVER }       winRateByTier { DIAMOND, GOLD, SILVER }   Create server/routers/bankroll.ts with a bankrollRouter containing:     getCurrent: publicProcedure.query — latest bankroll record     getHistory: publicProcedure.input(z.object({ days: z.number().default(90) })).query     \- Last N days of bankroll snapshots for charting     getOverallStats: publicProcedure.query     \- Return: currentBalance, startingBalance, totalROI, totalProfit,       bestDay, worstDay, longestWinStreak, currentStreak     initializeBankroll: publicProcedure.input(z.object({ startingBalance: z.number() })).mutation     \- Create the first bankroll record if none exists   Create an appRouter in server/routers/index.ts combining both routers.   Create app/api/trpc/\[trpc\]/route.ts using fetchRequestHandler from @trpc/server/adapters/fetch.   Create a tRPC client in lib/trpc-client.ts for use in React components. |

| P-16 | Kelly Criterion Staking Module Phase: 4 — Backend   Files: lib/kelly.ts *The Kelly Criterion stake calculator with EDGE-specific caps enforced — the bankroll protection engine.* |
| :---: | :---- |

| Context & Assumptions Kelly formula: f\* \= (bp \- q) / b where b \= odds-1, p \= win probability, q \= 1-pEDGE caps: DIAMOND max 3%, GOLD max 2%, SILVER max 1%Use fractional Kelly (0.5x) to reduce variance — standard practiceMinimum stake: 0.25% of bankrollNever stake more than 6% total bankroll per session across all tickets |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create lib/kelly.ts with the Kelly Criterion staking module.   Export these functions:   1\. calculateKellyFraction(odds: number, winProbability: number): number    \- Implements the Kelly formula: f\* \= (bp \- q) / b    \- Returns the raw Kelly fraction (0 to 1\)    \- Returns 0 if the result is negative (no edge)   2\. calculateStake(params: {      odds: number      confidencePct: number  // from Stage 2 output (65–95)      confidenceTier: ConfidenceTier      bankrollBalance: number    }): { stakePct: number; stakeAmount: number }    \- Convert confidencePct to win probability (confidencePct / 100\)    \- Calculate Kelly fraction    \- Apply 0.5x fractional Kelly    \- Apply tier caps: DIAMOND max 3%, GOLD max 2%, SILVER max 1%    \- Apply minimum: 0.25% if fraction \> 0    \- Return stakePct (as percentage, e.g. 1.5 means 1.5%) and stakeAmount   3\. validateSessionStake(tickets: { totalStake: number }\[\], bankrollBalance: number): boolean    \- Returns true if the sum of all ticket stakes \<= 6% of bankrollBalance    \- Used as a final session-level guard before persisting   4\. getSessionStakeSummary(picks: ReasonedPick\[\], bankrollBalance: number): {      totalStakePct: number      totalStakeAmount: number      safeToPlace: boolean      warning: string | null    }    \- Calculates total proposed stake across all picks in a session    \- Sets warning if total \> 6% of bankroll   Export a STAKE\_CAPS constant: { DIAMOND: 3, GOLD: 2, SILVER: 1 } Export a FRACTIONAL\_KELLY constant: 0.5 |

| PHASE 5 Dashboard & UI All views · Pick cards · Ticket cards · Charts |
| :---: |

| P-17 | Dashboard — Today View Phase: 5 — Frontend   Files: app/dashboard/page.tsx, components/ui/SessionStatus.tsx *The main dashboard view showing today's session status, all 3 ticket cards, and the pick cards with full rationale.* |
| :---: | :---- |

| Context & Assumptions Dark mode first — use Tailwind dark: classes, background \#0D1B2ASession status: large badge — PICK SESSION READY (green) or HOLDING (amber)If session exists: show 3 ticket cards using TicketCard component (P-22)If no session: show a holding state with reason if availableUses tRPC picks.getToday query |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create app/dashboard/page.tsx as the main Today dashboard view.   Design requirements:   \- Dark background: bg-\[\#0D1B2A\]   \- Page header: 'EDGE' in white with the date below in muted text   \- Session status badge: large, prominent, at the top of the page     GENERATED: green badge, text 'PICK SESSION READY'     HELD: amber badge, text 'HOLDING — INSUFFICIENT DATA'     null (no session yet): gray badge, text 'ANALYSIS RUNNING...'   \- If session status is GENERATED:     Show the 3 tickets in a column (mobile) or 3-column grid (desktop)     Each ticket uses the TicketCard component     Below tickets: show all individual picks in a grid using PickCard components   \- If held: show reason\_held in a muted card below the status badge   Create components/ui/SessionStatus.tsx:   A standalone badge component that takes status: 'generated'|'held'|null   and renders the appropriate coloured pill with icon and text.   Use the tRPC client to call picks.getToday. Show a skeleton loading state while data loads. All text must be readable on the dark background. |

| P-18 | Dashboard — Pick History View Phase: 5 — Frontend   Files: app/history/page.tsx *Searchable, filterable pick history table showing all historical picks with outcome badges, confidence tiers, EV scores, and CLV.* |
| :---: | :---- |

| Context & Assumptions Table columns: Date, Match, Market, Selection, Odds, Tier, EV, Signal (x/7), CLV, StatusStatus badges: WON (green), LOST (red), PENDING (amber), VOID (gray)Filter by: confidence tier, market type, statusSort by: date, odds, EV score |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create app/history/page.tsx as the Pick History view.   Requirements:   \- Dark background matching the dashboard   \- Page title: 'Pick History'   \- Filter row at top: buttons/pills for status (All/Pending/Won/Lost)     and confidence tier (All/DIAMOND/GOLD/SILVER)   \- Sortable table with columns:     Date, Match (Home vs Away), Competition, Market, Selection,     Odds, Tier (coloured badge), EV (%), Signals (n/7), CLV (%), Status   \- Status badges:     WON: green text on dark green bg     LOST: red text on dark red bg     PENDING: amber text on dark amber bg     VOID: gray   \- Tier badges:     DIAMOND: gold text     GOLD: amber text     SILVER: silver/gray text   \- Clicking a row expands an inline detail panel showing the full rationale and signal breakdown   \- Pagination: 50 rows per page   \- Mobile: collapse to a card view instead of a wide table   Use the tRPC picks.getHistory and picks.getStats queries. Show summary stats at the top: Total Picks, Win Rate %, Avg EV, Avg CLV. |

| P-19 | Dashboard — Bankroll Tracker Phase: 5 — Frontend   Files: app/bankroll/page.tsx, components/ui/BankrollChart.tsx *The bankroll P\&L tracker with a running balance chart, ROI statistics, and rolling performance breakdowns.* |
| :---: | :---- |

| Context & Assumptions Uses recharts for the balance chartKey metrics: current balance, starting balance, total ROI %, total profit/lossRolling stats: 7-day, 30-day, 90-day ROIChart: area chart showing balance over time with a reference line at starting balance |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create app/bankroll/page.tsx as the Bankroll Tracker view.   Requirements:   \- Dark background matching the dashboard   \- Page title: 'Bankroll'   \- If no bankroll initialised: show an onboarding form to set starting balance     (uses bankroll.initializeBankroll tRPC mutation)     Top stats row (4 cards):     Current Balance (large, prominent), Total ROI % (green if positive, red if negative),     Total Profit/Loss, Sessions Count     Rolling stats row:     7-day ROI, 30-day ROI, 90-day ROI — each as a compact card     Create components/ui/BankrollChart.tsx using recharts:     \- AreaChart showing closing\_balance over time     \- X-axis: dates  Y-axis: balance in ₦     \- A dashed ReferenceLine at the starting balance     \- Tooltip showing date, balance, and daily P\&L     \- Two time range buttons: 30 days / All time     \- Dark theme: chart background \#0D1B2A, area fill \#1A3C5E with 40% opacity,       stroke \#C8973A, reference line \#666     Bottom: Win/Loss breakdown table:     Rows: DIAMOND picks, GOLD picks, SILVER picks, Totals     Columns: Total Bets, Won, Lost, Win Rate %, Avg Odds, Total P\&L   Use bankroll.getHistory and bankroll.getOverallStats tRPC queries. |

| P-20 | Dashboard — Session Calendar Phase: 5 — Frontend   Files: app/calendar/page.tsx *Monthly calendar view showing which days generated pick sessions vs held, with hold rate and session frequency metrics.* |
| :---: | :---- |

| Context & Assumptions Calendar built with date-fns for date logicGreen cell: session generated that dayAmber cell: session held that dayGray cell: no pipeline runClick a day to see that session's picks |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create app/calendar/page.tsx as the Session Calendar view.   Requirements:   \- Dark background matching the dashboard   \- Page title: 'Session Calendar'     Summary stats at top:     Sessions Generated, Sessions Held, Hold Rate %, Average Sessions / Week     Calendar grid:     \- Month/year navigation (prev/next buttons)     \- 7-column grid (Mon–Sun)     \- Each day cell:         Green bg \+ tick icon: session generated         Amber bg \+ pause icon: session held         Dark/empty: no session         Today: outlined border in gold     \- Clicking a generated day expands a mini-panel below showing:         picks\_qualified count, tickets\_generated count,         and a list of the 3 ticket combined odds     Use date-fns for calendar calculations (startOfMonth, eachDayOfMonth, getDay, format).     Build a small useSessions hook that fetches all sessions from tRPC and returns   a Map\<string, Session\> keyed by ISO date string for O(1) calendar lookup.   Add a sessions.getAll procedure to the tRPC router if it doesn't exist. |

| P-21 | Pick Card Component Phase: 5 — Frontend   Files: components/picks/PickCard.tsx, components/picks/SignalBadge.tsx, components/picks/TierBadge.tsx *The core reusable pick card component displaying all pick data — used on Today view, History, and inside Ticket cards.* |
| :---: | :---- |

| Context & Assumptions Shows: match, competition, market, selection, odds, confidence tier, EV, signal count, rationale, key risk, stakeThree visual states: expanded (full rationale visible) and collapsed (summary only)Signal count visualised as 7 dots (filled/empty)Tier badge: DIAMOND (gold), GOLD (amber), SILVER (silver) |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create components/picks/PickCard.tsx as the core reusable pick card.   Props:   pick: Pick (from types/edge.ts)   defaultExpanded?: boolean   showStake?: boolean   Design (dark theme):   Card background: bg-\[\#0F2236\] border border-\[\#1A3C5E\]   Collapsed state shows:     \- Left: TierBadge, signal dots row     \- Centre: Match name, market type \+ selection     \- Right: Odds (large, bold, gold), EV badge (green if positive)     \- Status badge (if settled)     \- Expand chevron     Expanded state adds:     \- Rationale paragraph (in a slightly different bg box)     \- Key Risk (amber left-bordered)     \- Signal breakdown: 7 rows, each showing layer name, pass/fail icon, note     \- Stake recommendation (if showStake=true)     \- Best odds book note   Create components/picks/SignalBadge.tsx:   Props: count: number (0–7)   Renders 7 small circles — filled navy for passed signals, empty for failed   Show count as 'n/7' text beside the dots   Create components/picks/TierBadge.tsx:   Props: tier: ConfidenceTier, pct?: number   DIAMOND: '◆' icon \+ gold text \+ gold border   GOLD: '◈' icon \+ amber text \+ amber border   SILVER: '◇' icon \+ gray text \+ gray border   All components must be client components ('use client'). Use clsx and tailwind-merge for conditional class handling. |

| P-22 | Ticket Card Component Phase: 5 — Frontend   Files: components/picks/TicketCard.tsx *The ticket card component that groups 3 picks into a visual ticket with type label, combined odds, and status.* |
| :---: | :---- |

| Context & Assumptions Three ticket types: ANCHOR (safest), VALUE (best EV), DIVERSIFIEDShows combined odds prominently — highlight if \> 2.50Expandable to show all 3 pick cards inlineWon tickets: green glow border. Lost: red. Pending: default navy border. |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create components/picks/TicketCard.tsx as the ticket card component.   Props:   ticket: Ticket (from types/edge.ts)   picks: Pick\[\]  (the 3 picks belonging to this ticket)   defaultExpanded?: boolean   Design (dark theme):   Outer card has a coloured top border based on ticket type:     anchor: blue (\#1A3C5E)     value: gold (\#C8973A)     diversified: teal (\#1A6B5C)     Header row shows:     \- Ticket type label with icon:         ANCHOR: shield icon         VALUE: lightning bolt icon         DIVERSIFIED: globe icon     \- Ticket type name in bold     \- 'x3 picks' label     \- Combined odds (large, prominent, gold text)     \- Status badge (won/lost/pending)     \- Expand/collapse chevron     Status border glow:     won: ring-green-500/30     lost: ring-red-500/30     pending: no ring     Expanded state:     \- Assembly note in italic muted text     \- Three PickCard components (collapsed by default)     \- If won: show profit\_loss in green     \- If lost: show profit\_loss in red   Add a CombinedOddsBadge sub-component inside the same file:   Shows odds value — gold if \> 2.00, amber if 1.50–2.00, white if \< 1.50 |

| PHASE 6 Validation & Deploy Shadow period tooling · Backtesting · Vercel config |
| :---: |

| P-23 | Shadow Period Test Harness Phase: 6 — Validation   Files: scripts/shadow-period.ts, scripts/backtest.ts *CLI tools for running the shadow period — simulating pick generation on historical fixtures and measuring accuracy before going live.* |
| :---: | :---- |

| Context & Assumptions shadow-period.ts: generates picks for today without writing to Supabase's live tablesbacktest.ts: runs the pipeline on a date range of historical fixtures and reports accuracyOutput format: table showing pick, predicted outcome, actual outcome, EV, CLV |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create scripts/shadow-period.ts as a CLI script for the shadow period.   Usage: npx tsx scripts/shadow-period.ts \[--date YYYY-MM-DD\]   It should:   1\. Run the full data fetch (Steps 1–3 from daily-pipeline.ts)   2\. Run Stage 1, Stage 2, Stage 3 exactly as the production pipeline does   3\. NOT write to Supabase picks or tickets tables   4\. Instead, write to a shadow\_picks table (same schema as picks, add is\_shadow: boolean)      OR write to a local JSON file at scripts/shadow-output/{date}.json   5\. Print a formatted table to the console:      Columns: Match, Market, Selection, Odds, Tier, EV, Signals, Rationale (truncated)   6\. Print the 3 assembled tickets at the end   7\. Log total API calls made and estimated cost of the Claude calls   Create scripts/backtest.ts as a backtesting CLI script.   Usage: npx tsx scripts/backtest.ts \--from YYYY-MM-DD \--to YYYY-MM-DD   It should:   1\. Load shadow picks from the JSON output files for the given date range   2\. For each pick: call getFixtureResult from lib/api-football.ts to get the actual result   3\. Call evaluatePickResult (import from inngest/settle-results.ts) to determine win/loss   4\. Print a final summary report:      \- Total picks, Win count, Loss count, Win rate %      \- Win rate by confidence tier (DIAMOND / GOLD / SILVER)      \- Win rate by market type      \- Average EV of winning vs losing picks      \- Simulated P\&L if all picks were staked at recommended stake %      \- GO / NO-GO recommendation (GO if win rate \>= 58%)   Add both scripts to package.json scripts:   'shadow': 'tsx scripts/shadow-period.ts'   'backtest': 'tsx scripts/backtest.ts' |

| P-24 | Vercel Deployment \+ Navigation Phase: 6 — Validation   Files: vercel.json, app/layout.tsx, components/ui/Nav.tsx *Vercel deployment configuration, function timeout settings, and the app navigation shell.* |
| :---: | :---- |

| Context & Assumptions Inngest pipeline functions need maxDuration: 300 to avoid Vercel's 10s timeoutNavigation: Today, History, Bankroll, CalendarMobile: bottom tab bar. Desktop: left sidebar.vercel.json needs to set function regions and timeouts |
| :---- |

| ◈  CLAUDE CODE PROMPT — COPY & PASTE |
| :---- |
| Create vercel.json with:   \- functions config for app/api/inngest/route.ts: maxDuration: 300   \- functions config for app/api/trpc/\*\*: maxDuration: 30   \- framework: nextjs   Update app/layout.tsx to:   \- Import and render the Nav component   \- Set dark background: bg-\[\#0D1B2A\] min-h-screen   \- Set the HTML lang='en' and include Inter font from next/font   \- Wrap children in a main element with appropriate padding for nav offset   Create components/ui/Nav.tsx with:   \- Desktop: fixed left sidebar, 240px wide, dark bg \[\#0A1829\]     \- EDGE logo at top (⬡ icon \+ 'EDGE' text in gold)     \- Nav links: Today (/dashboard), History (/history),       Bankroll (/bankroll), Calendar (/calendar)     \- Each link: icon \+ label, active state highlighted with gold accent     \- Bottom: small bankroll balance display (fetches from tRPC)   \- Mobile: fixed bottom tab bar     \- 4 tabs matching the desktop links     \- Active tab: gold colour   \- Use Next.js usePathname for active state detection   Use these icons from lucide-react:   Today: Zap, History: Clock, Bankroll: TrendingUp, Calendar: CalendarDays   Add a README.md with:   \- Project overview   \- Prerequisites (Node 18+, all service accounts)   \- Setup steps (clone, npm install, copy .env.local.example, fill in keys, npm run dev)   \- How to run the shadow period   \- How to trigger the pipeline manually via Inngest dashboard |

## **After the Build: Shadow Period**

Once all 24 prompts are complete, run the shadow period before any real money goes in:

* npm run shadow — run today's pipeline and review the picks in the console output

* Repeat daily for 2 weeks, checking actual results manually against the picks

* npm run backtest \--from YYYY-MM-DD \--to YYYY-MM-DD — run the accuracy analysis

* Review the GO / NO-GO output. If win rate \>= 58% and CLV is positive: you are ready

| Final Gate Do not skip the shadow period. Run it for a minimum of 14 days. The backtest tool will tell you your actual win rate, ROI, and CLV performance. A DIAMOND-tier pick that loses consistently on paper needs the Stage 2 prompt tuned — not a real bankroll to absorb it. The shadow period is free. Real stakes are not. |
| :---- |

