// ============================================================================
// The Odds API — https://the-odds-api.com
// ============================================================================
export interface OddsApiOutcome {
  readonly name: string;
  readonly price: number;
  readonly point?: number;
}

export interface OddsApiMarket {
  readonly key: string;
  readonly last_update: string;
  readonly outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  readonly key: string;
  readonly title: string;
  readonly last_update: string;
  readonly markets: OddsApiMarket[];
}

export interface OddsApiEvent {
  readonly id: string;
  readonly sport_key: string;
  readonly sport_title: string;
  readonly commence_time: string;
  readonly home_team: string;
  readonly away_team: string;
  readonly bookmakers: OddsApiBookmaker[];
}

// ============================================================================
// API-Football — https://api-sports.io
// ============================================================================
export interface ApiFootballTeam {
  readonly id: number;
  readonly name: string;
  readonly logo: string;
}

export interface ApiFootballFixture {
  readonly fixture: {
    readonly id: number;
    readonly date: string;
    readonly status: { readonly long: string; readonly short: string; readonly elapsed: number | null };
  };
  readonly league: {
    readonly id: number;
    readonly name: string;
    readonly country: string;
    readonly season: number;
  };
  readonly teams: {
    readonly home: ApiFootballTeam;
    readonly away: ApiFootballTeam;
  };
  readonly goals: {
    readonly home: number | null;
    readonly away: number | null;
  };
  // score.fulltime is the 90-minute score; goals includes extra time when a
  // match goes to AET, and betting markets settle on the 90-minute result.
  readonly score?: {
    readonly halftime: { readonly home: number | null; readonly away: number | null };
    readonly fulltime: { readonly home: number | null; readonly away: number | null };
  };
}

// Verified live against fixture 1508460 (v3.football.api-sports.io/fixtures/statistics):
// response is one entry per team, each with a flat list of {type, value} pairs.
// `type` strings are fixed vocabulary set by API-Football, not free text.
export interface ApiFootballFixtureStatistics {
  readonly team: ApiFootballTeam;
  readonly statistics: ReadonlyArray<{
    readonly type: string;
    readonly value: number | string | null;
  }>;
}

// Verified live against fixture 1508460 (v3.football.api-sports.io/fixtures/events).
// type is "Goal" | "Card" | "subst" | "Var" (per API-Football); detail narrows
// further, e.g. "Normal Goal" | "Penalty" | "Own Goal" | "Yellow Card" | "Red Card".
export interface ApiFootballFixtureEvent {
  readonly time: { readonly elapsed: number; readonly extra: number | null };
  readonly team: ApiFootballTeam;
  readonly player: { readonly id: number | null; readonly name: string | null };
  readonly assist: { readonly id: number | null; readonly name: string | null };
  readonly type: string;
  readonly detail: string;
  readonly comments: string | null;
}

export interface ApiFootballPrediction {
  readonly predictions: {
    readonly winner: { readonly id: number | null; readonly name: string | null };
    readonly win_or_draw: boolean;
    readonly under_over: string | null;
    readonly goals: { readonly home: string; readonly away: string };
    readonly advice: string;
    readonly percent: { readonly home: string; readonly draw: string; readonly away: string };
  };
  readonly teams: {
    readonly home: ApiFootballTeam;
    readonly away: ApiFootballTeam;
  };
}

// ============================================================================
// SharpAPI — https://sharpapi.io
// ============================================================================
export interface SharpApiEvResponse {
  readonly ev: number;
  readonly pinnacleOdds: number;
  readonly marketOdds: number;
  readonly edge: number;
}

export interface SharpApiClvResponse {
  readonly clv: number;
  readonly closingOdds: number;
  readonly betOdds: number;
}
