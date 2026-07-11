import Link from 'next/link';

const SIGNALS = [
  { name: 'H2H Record', detail: 'Last 5–10 meetings, weighted by recency.' },
  { name: 'Current Form', detail: 'Last 5 results and goal patterns for both sides.' },
  { name: 'Home/Away Differential', detail: 'Home win %, away clean sheet rate, scoring patterns.' },
  { name: 'Injury & Lineup Intelligence', detail: 'Key absences — top scorer, keeper, defensive anchor.' },
  { name: 'Market Odds Signal', detail: 'Consensus across 15+ books, opening vs current line.' },
  { name: 'EV Detection', detail: 'Expected value vs Pinnacle. Only ≥4% edge advances.' },
  { name: 'AI Statistical Model', detail: 'Poisson-based prediction checked against the AI score.' },
];

const STAGES = [
  { model: 'claude-sonnet-5', role: 'Signal scoring', note: 'Structured formatting — no deep reasoning needed.' },
  { model: 'claude-opus-4-8', role: 'Pick reasoning', note: 'The only stage that needs real trade-off judgment.' },
  { model: 'claude-sonnet-5', role: 'Ticket assembly', note: 'Combinatorics and rule enforcement.' },
];

const STAKE_CAPS = [
  { tier: 'DIAMOND', signals: 'all 7 signals · EV ≥15%', cap: '3%' },
  { tier: 'GOLD', signals: '5–6 signals · EV ≥8%', cap: '2%' },
  { tier: 'SILVER', signals: '4–5 signals · EV ≥4%', cap: '1%' },
];

const STEPS = [
  { label: 'Ingest', detail: 'Fixtures, odds, and form pulled fresh every morning.' },
  { label: 'Score', detail: '7 signal layers evaluated per candidate pick.' },
  { label: 'Reason', detail: 'Qualifying picks get full AI rationale and tiering.' },
  { label: 'Assemble', detail: 'Three disciplined tickets, capped at 3.00 combined odds.' },
  { label: 'Settle', detail: 'Results and CLV logged automatically after full time.' },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs tracking-[0.15em] text-gray-500 uppercase">{children}</p>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D1B2A]">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0D1B2A]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-lg text-[#C8973A]" aria-hidden>
              ⬡
            </span>
            <span className="text-base font-semibold tracking-tight text-white">EDGE</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-gray-400 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[#C8973A] px-4 py-2 text-sm font-medium text-[#0D1B2A] transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-28">
          <div className="grid gap-14 md:grid-cols-2 md:items-center md:gap-10">
            <div>
              <Eyebrow>Personal sports intelligence</Eyebrow>
              <h1 className="mt-4 text-4xl leading-[1.1] font-bold tracking-tight text-white sm:text-5xl">
                Betting picks that show their work.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-gray-400">
                EDGE scores every fixture across 7 signals, reasons through the qualifying picks with Claude, and
                assembles disciplined ticket sessions — sized by Kelly, not guesswork. It picks only when the data
                justifies it, not on a forced schedule.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/signup"
                  className="rounded-md bg-[#C8973A] px-5 py-2.5 text-sm font-medium text-[#0D1B2A] transition-opacity hover:opacity-90"
                >
                  Get started
                </Link>
                <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white">
                  Sign in →
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#0A1829] font-mono text-[13px]">
              <div className="border-b border-white/10 px-4 py-2.5 text-xs text-gray-600">edge / session.log</div>
              <div className="space-y-2.5 p-5 text-gray-400">
                {[
                  ['signal threshold', '≥4 of 7 layers'],
                  ['max combined odds', '3.00'],
                  ['stake caps', '3% / 2% / 1%'],
                  ['fractional kelly', '0.5×'],
                  ['pipeline', 'sonnet → opus → sonnet'],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-baseline gap-x-2">
                    <span>{label}</span>
                    <span className="text-gray-700">·</span>
                    <span className="text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Signal framework */}
        <section className="border-t border-white/8 py-24">
          <div className="mx-auto max-w-5xl px-6">
            <Eyebrow>The framework</Eyebrow>
            <h2 className="mt-3 max-w-lg text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              7 signals. A pick only qualifies when at least 4 agree.
            </h2>
            <div className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {SIGNALS.map((s, i) => (
                <div key={s.name} className="flex gap-4 border-t border-white/8 pt-4">
                  <span className="font-mono text-xs text-gray-600">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="mt-1 text-sm text-gray-500">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline / model stages */}
        <section className="border-t border-white/8 py-24">
          <div className="mx-auto max-w-5xl px-6">
            <Eyebrow>The pipeline</Eyebrow>
            <h2 className="mt-3 max-w-lg text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Three stages. Only one of them needs to actually think.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-500">
              Stages 1 and 3 are formatting and rule-following — Sonnet handles those at a fraction of the cost.
              Stage 2 is genuine multi-signal trade-off reasoning, so it runs on Opus.
            </p>

            <div className="mt-10 divide-y divide-white/8 border-y border-white/8">
              {STAGES.map((stage, i) => (
                <div key={stage.role} className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="w-40 shrink-0 font-mono text-xs text-gray-600">
                    stage {i + 1} · {stage.model}
                  </span>
                  <span className="w-44 shrink-0 text-sm font-medium text-white">{stage.role}</span>
                  <span className="text-sm text-gray-500">{stage.note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Kelly staking */}
        <section className="border-t border-white/8 py-24">
          <div className="mx-auto max-w-5xl px-6">
            <Eyebrow>The discipline</Eyebrow>
            <h2 className="mt-3 max-w-lg text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Every stake is sized by Kelly, capped in code.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-500">
              Fractional Kelly (0.5×) with a hard cap per tier — enforced by the staking module, not willpower.
              Maximum 6% of bankroll at risk across a single session.
            </p>

            <div className="mt-10 divide-y divide-white/8 border-y border-white/8">
              {STAKE_CAPS.map((row) => (
                <div key={row.tier} className="flex items-center justify-between py-4">
                  <div>
                    <span className="text-sm font-medium text-white">{row.tier}</span>
                    <span className="ml-3 text-sm text-gray-500">{row.signals}</span>
                  </div>
                  <span className="font-mono text-sm text-gray-400">max {row.cap}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-white/8 py-24">
          <div className="mx-auto max-w-5xl px-6">
            <Eyebrow>Session cadence</Eyebrow>
            <h2 className="mt-3 max-w-lg text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Runs automatically. Holds when it should.
            </h2>

            <div className="mt-10 grid gap-8 sm:grid-cols-5">
              {STEPS.map((step, i) => (
                <div key={step.label}>
                  <span className="font-mono text-xs text-gray-600">{String(i + 1).padStart(2, '0')}</span>
                  <p className="mt-2 text-sm font-medium text-white">{step.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-white/8 py-24">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Set up your account.</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-gray-500">Takes under a minute. No card, no waiting.</p>
            <Link
              href="/signup"
              className="mt-7 inline-block rounded-md bg-[#C8973A] px-5 py-2.5 text-sm font-medium text-[#0D1B2A] transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-sm sm:flex-row">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="text-[#C8973A]" aria-hidden>
              ⬡
            </span>
            EDGE
          </div>
          <p className="text-xs text-gray-600">Personal sports intelligence. Built for discipline, not volume.</p>
        </div>
      </footer>
    </div>
  );
}
