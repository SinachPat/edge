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
4. Start the dev server:
   ```
   npm run dev
   ```
5. Visit `/signup` and create your account.
6. To enable password reset, edit your Supabase project's **Reset Password** email
   template (Authentication → Email Templates): replace the default link with
   ```
   {{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}
   ```
   Supabase's default template points at its own hosted verify page, which returns
   the session as a URL fragment the server can't see — since this app checks auth
   in `proxy.ts` (server-side, before any client JS runs), that default flow would
   redirect a recovering user to `/login` before their session ever got picked up.
   The template above sends them through `/api/auth/confirm` instead, which
   establishes the session as a cookie server-side.

## Authentication

Every page and API route requires a signed-in Supabase Auth session — `proxy.ts`
redirects unauthenticated visitors to `/login`, and every tRPC procedure
(`server/trpc.ts`'s `protectedProcedure`) rejects unauthenticated requests independently.

`/signup` creates the first account for anyone (there's nothing to gate yet), and
after that only works for someone who's already signed in — so you can add more
accounts whenever you want from inside the app, but a stranger who finds the URL
can't self-register once you exist. Forgot your password? `/forgot-password` →
check your email → `/reset-password`.

## Triggering the pipeline manually

The daily pipeline (`daily-prediction-pipeline`) and settlement function
(`settle-results`) are registered at `/api/inngest`. In local dev, run the
[Inngest Dev Server](https://www.inngest.com/docs/dev-server) alongside `npm run dev`:

```
npx inngest-cli@latest dev
```

Open the Inngest dashboard it prints, find the function, and use "Invoke" to trigger a
run on demand instead of waiting for the 06:00 / 22:00 UTC cron schedules.
