-- EDGE initial schema: sessions, picks, tickets, bankroll, signal_log
-- Single-user personal app. RLS is enabled with permissive policies for
-- authenticated users; the service role (used by the Inngest pipeline) bypasses RLS.

-- ============================================================================
-- sessions: one row per daily pipeline run
-- ============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('generated', 'held')),
  reason_held TEXT,
  picks_qualified INTEGER DEFAULT 0,
  tickets_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- picks: one row per individual pick
-- ============================================================================
CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  competition TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  fixture_id TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  market_type TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds DECIMAL(6, 2) NOT NULL,
  confidence_tier TEXT NOT NULL CHECK (confidence_tier IN ('DIAMOND', 'GOLD', 'SILVER')),
  confidence_pct INTEGER,
  ev_score DECIMAL(6, 2),
  signal_count INTEGER NOT NULL CHECK (signal_count BETWEEN 0 AND 7),
  rationale TEXT NOT NULL,
  key_risk TEXT,
  stake_pct DECIMAL(4, 2) NOT NULL,
  stake_amount DECIMAL(10, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  closing_odds DECIMAL(6, 2),
  clv DECIMAL(6, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

-- ============================================================================
-- tickets: groups of 3 picks
-- ============================================================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('anchor', 'value', 'diversified')),
  pick_ids UUID[] NOT NULL,
  combined_odds DECIMAL(6, 3) NOT NULL,
  total_stake DECIMAL(10, 2),
  total_return DECIMAL(10, 2),
  profit_loss DECIMAL(10, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- bankroll: daily snapshot
-- ============================================================================
CREATE TABLE bankroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  opening_balance DECIMAL(12, 2) NOT NULL,
  closing_balance DECIMAL(12, 2),
  sessions_count INTEGER DEFAULT 0,
  total_staked DECIMAL(12, 2) DEFAULT 0,
  total_returned DECIMAL(12, 2) DEFAULT 0,
  running_roi DECIMAL(8, 4),
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- signal_log: audit trail for every signal layer decision
-- ============================================================================
CREATE TABLE signal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_id UUID REFERENCES picks(id) ON DELETE CASCADE,
  layer INTEGER NOT NULL CHECK (layer BETWEEN 1 AND 7),
  layer_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_picks_session_id ON picks(session_id);
CREATE INDEX idx_picks_status ON picks(status);
CREATE INDEX idx_picks_match_date ON picks(match_date);
CREATE INDEX idx_tickets_session_id ON tickets(session_id);
CREATE INDEX idx_signal_log_pick_id ON signal_log(pick_id);
CREATE INDEX idx_bankroll_date ON bankroll(date);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_log ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (single-user personal app).
CREATE POLICY "Authenticated users can do everything on sessions"
  ON sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on picks"
  ON picks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on tickets"
  ON tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on bankroll"
  ON bankroll FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on signal_log"
  ON signal_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- The service_role key already bypasses RLS at the Postgres level in Supabase,
-- but an explicit policy documents the intent for the pipeline's server-side writes.
CREATE POLICY "Service role bypass on sessions"
  ON sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass on picks"
  ON picks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass on tickets"
  ON tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass on bankroll"
  ON bankroll FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass on signal_log"
  ON signal_log FOR ALL TO service_role USING (true) WITH CHECK (true);
