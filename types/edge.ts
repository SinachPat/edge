// ============================================================================
// Shared unions
// ============================================================================
export type PickStatus = 'pending' | 'won' | 'lost' | 'void';
export type ConfidenceTier = 'DIAMOND' | 'GOLD' | 'SILVER';
export type TicketType = 'anchor' | 'value' | 'diversified';
export type SignalResult = 'pass' | 'fail';
export type SessionStatus = 'generated' | 'held';

// ============================================================================
// Database entities — mirror supabase/migrations/001_initial_schema.sql exactly
// ============================================================================
export interface Session {
  id: string;
  date: string;
  status: SessionStatus;
  reason_held: string | null;
  picks_qualified: number;
  tickets_generated: number;
  created_at: string;
}

export interface Pick {
  id: string;
  session_id: string;
  sport: string;
  competition: string;
  home_team: string;
  away_team: string;
  fixture_id: string | null;
  match_date: string;
  market_type: string;
  selection: string;
  odds: number;
  confidence_tier: ConfidenceTier;
  confidence_pct: number | null;
  ev_score: number | null;
  signal_count: number;
  rationale: string;
  key_risk: string | null;
  best_odds_book: string | null;
  stake_pct: number;
  stake_amount: number | null;
  status: PickStatus;
  closing_odds: number | null;
  clv: number | null;
  final_home_goals: number | null;
  final_away_goals: number | null;
  created_at: string;
  settled_at: string | null;
}

export interface Ticket {
  id: string;
  session_id: string;
  ticket_type: TicketType;
  pick_ids: string[];
  combined_odds: number;
  total_stake: number | null;
  total_return: number | null;
  profit_loss: number | null;
  assembly_note: string | null;
  status: 'pending' | 'won' | 'lost';
  created_at: string;
}

export interface BankrollSnapshot {
  id: string;
  date: string;
  opening_balance: number;
  closing_balance: number | null;
  sessions_count: number;
  total_staked: number;
  total_returned: number;
  running_roi: number | null;
  win_count: number;
  loss_count: number;
  created_at: string;
}

export interface SignalLog {
  id: string;
  pick_id: string;
  layer: number;
  layer_name: string;
  result: SignalResult;
  detail: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// Pipeline data structures
// ============================================================================

// The enriched fixture object fed into Stage 1.
export interface RawFixtureData {
  readonly fixture: unknown;
  readonly h2h: unknown;
  readonly injuries: unknown;
  readonly prediction: unknown;
  readonly homeStats: unknown;
  readonly awayStats: unknown;
  readonly odds: unknown;
}

// Stage 1 output per pick candidate.
export interface SignalScore {
  readonly fixtureId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly competition: string;
  readonly sport: string;
  readonly matchDate: string; // ISO 8601 kickoff time
  readonly marketType: string;
  readonly selection: string;
  readonly odds: number;
  readonly signalCount: number;
  readonly signalResults: Record<
    'layer1' | 'layer2' | 'layer3' | 'layer4' | 'layer5' | 'layer6' | 'layer7',
    SignalResult
  >;
  readonly signalNotes?: Record<
    'layer1' | 'layer2' | 'layer3' | 'layer4' | 'layer5' | 'layer6' | 'layer7',
    string
  >;
  readonly preliminaryConfidence: ConfidenceTier | 'NO_PICK';
  readonly evScore: number | null;
}

// Stage 2 output — extends SignalScore with reasoning fields.
export interface ReasonedPick extends SignalScore {
  readonly finalConfidenceTier: ConfidenceTier;
  readonly confidencePct: number;
  readonly rationale: string;
  readonly keyRisk: string;
  readonly stakeMultiplier: number;
  readonly bestOddsBook: string;
}

// Stage 3 output — one assembled ticket.
export interface AssembledTicket {
  readonly type: TicketType;
  readonly pickIds: string[];
  readonly combinedOdds: number;
  readonly rationale: string;
}

// Full session result returned by the daily pipeline.
export interface PipelineResult {
  readonly sessionId: string;
  readonly date: string;
  readonly status: SessionStatus;
  readonly picksQualified: number;
  readonly tickets: AssembledTicket[];
}
