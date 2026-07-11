# EDGE

Personal sports prediction platform. A 3-stage Claude pipeline (Sonnet → Opus → Sonnet)
scores fixtures against a 7-signal framework, reasons about the qualifying picks, and
assembles 3 daily betting tickets — surfaced on a dashboard with bankroll tracking.

Full product spec: [EDGE_PRD_v1.1.md](EDGE_PRD_v1.1.md). Build sequence:
[EDGE_Claude_Code_Prompts_v1.md](EDGE_Claude_Code_Prompts_v1.md).

## Prerequisites

- Node.js 18+
- Accounts + API keys for: The Odds API, API-Football, SharpAPI, Anthropic, Supabase, Inngest

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy the env template and fill in your keys:
   ```
   cp .env.local.example .env.local
   ```
3. Apply the database schema — paste each file in `supabase/migrations/` (in order)
   into your Supabase project's SQL editor and run it.
4. Create your login — there's no public signup page by design (this is a private,
   single-user app). In the Supabase dashboard: **Authentication → Users → Add user**,
   set an email + password, and use those to sign in at `/login`.
5. Start the dev server:
   ```
   npm run dev
   ```

## Authentication

Every page and API route requires a signed-in Supabase Auth session — `proxy.ts`
redirects unauthenticated visitors to `/login`, and every tRPC procedure
(`server/trpc.ts`'s `protectedProcedure`) rejects unauthenticated requests independently.
There's no self-serve signup; add users manually via the Supabase dashboard (step 4 above).

## Triggering the pipeline manually

The daily pipeline (`daily-prediction-pipeline`) and settlement function
(`settle-results`) are registered at `/api/inngest`. In local dev, run the
[Inngest Dev Server](https://www.inngest.com/docs/dev-server) alongside `npm run dev`:

```
npx inngest-cli@latest dev
```

Open the Inngest dashboard it prints, find the function, and use "Invoke" to trigger a
run on demand instead of waiting for the 06:00 / 22:00 UTC cron schedules.
