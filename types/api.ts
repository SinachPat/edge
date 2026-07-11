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
    readonly fulltime: { readonly home: number | null; readonly away: number | null };
  };
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
