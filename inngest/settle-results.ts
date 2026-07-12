import { inngest } from './client';
import { getFixtureEvents, getFixtureResult, getFixtureStatistics } from '@/lib/api-football';
import { getClosingLineValue } from '@/lib/sharpapi';
import { createServerClient } from '@/lib/supabase';
import { normalizeName } from '@/lib/normalize';
import type { Pick } from '@/types/edge';
import type { ApiFootballFixtureEvent, ApiFootballFixtureStatistics } from '@/types/api';

export type SettlementResult = 'won' | 'lost' | 'void';

export interface SettlementData {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly halftimeHomeGoals: number | null;
  readonly halftimeAwayGoals: number | null;
  // null = statistics/events weren't fetched (market didn't need them) or the
  // fixture genuinely has none recorded (API-Football returns results:0 for
  // some real finished matches, confirmed live — not every fixture is tracked).
  readonly totalCorners: number | null;
  readonly totalCards: number | null;
  readonly events: ApiFootballFixtureEvent[] | null;
}

type MarketCategory =
  | 'ht_ft'
  | 'half_time_void'
  | 'correct_score'
  | 'player_card'
  | 'player_scorer'
  | 'corners'
  | 'cards'
  | 'btts'
  | 'double_chance'
  | 'over_under'
  | 'asian_handicap'
  | 'result'
  | 'unknown';

// Classifies a pick's lowercased "{market_type} {selection}" string exactly
// once. Both buildSettlementData (which extra API calls to make) and
// evaluatePickResult (how to grade) switch on this single result, so the two
// can't drift out of sync the way two independently-maintained keyword lists
// would. Order matters: narrower phrases are checked before broader ones they
// happen to be substrings of — e.g. "to receive a card" before generic
// "card", and "scorer" (not "to score") so "Both Teams To Score" can't be
// misclassified as the Anytime Scorer player-prop market.
function classifyMarket(market: string): MarketCategory {
  if (
    market.includes('ht/ft') ||
    market.includes('halftime/fulltime') ||
    market.includes('half time/full time') ||
    (market.includes('halftime') && market.includes('fulltime'))
  ) {
    return 'ht_ft';
  }
  if (market.includes('first half') || market.includes('1st half') || market.includes('half time') || market.includes('half-time')) {
    return 'half_time_void';
  }
  if (market.includes('correct score')) return 'correct_score';
  if (market.includes('to receive a card') || market.includes('receive card')) return 'player_card';
  if (market.includes('scorer')) return 'player_scorer';
  if (market.includes('corner')) return 'corners';
  if (market.includes('card')) return 'cards';
  if (market.includes('btts') || market.includes('both teams to score')) return 'btts';
  if (market.includes('double chance')) return 'double_chance';
  if (/(over|under)\s*\d/.test(market)) return 'over_under';
  if (market.includes('asian handicap')) return 'asian_handicap';
  if (market.includes('1x2') || market.includes('result')) return 'result';
  return 'unknown';
}

// Sums one API-Football statistic type across both teams. Verified type
// strings (v3.football.api-sports.io/fixtures/statistics): "Corner Kicks",
// "Yellow Cards", "Red Cards". Returns null only when neither team has the
// stat at all — that's the real "not tracked for this fixture" signal.
function sumStatValue(stats: ApiFootballFixtureStatistics[], type: string): number | null {
  let total = 0;
  let found = false;
  for (const team of stats) {
    const entry = team.statistics.find((s) => s.type === type);
    if (entry && entry.value !== null) {
      total += Number(entry.value);
      found = true;
    }
  }
  return found ? total : null;
}

// Live-verified against fixture 1508460 — confirms the type strings above.
// "Total Cards" points-weighting (does a red count as 1 or 2?) was never
// observed against a live cards-market outcome, so this uses a plain 1-per-card
// count. If a bookmaker's line assumes red = 2 points, this will misgrade
// matches with a red card — flagging this as unverified rather than guessing further.
export function aggregateStatistics(stats: ApiFootballFixtureStatistics[]): {
  totalCorners: number | null;
  totalCards: number | null;
} {
  const totalCorners = sumStatValue(stats, 'Corner Kicks');
  const yellow = sumStatValue(stats, 'Yellow Cards');
  const red = sumStatValue(stats, 'Red Cards');
  const totalCards = yellow === null && red === null ? null : (yellow ?? 0) + (red ?? 0);
  return { totalCorners, totalCards };
}

// Live-verified outcome format (betfair_ex_uk, halftime_fulltime market):
// "{team name at HT}/{team name at FT}", using "Draw" for a level scoreline.
function leaderLabel(homeGoals: number, awayGoals: number, homeTeam: string, awayTeam: string): string {
  if (homeGoals > awayGoals) return homeTeam;
  if (awayGoals > homeGoals) return awayTeam;
  return 'Draw';
}

// Live-verified outcome format (correct_score market): "{home}:{n}|{away}:{n}",
// team names taken directly from the fixture rather than a fixed Home/Away label.
function parseCorrectScoreSelection(
  selection: string,
  homeTeam: string,
  awayTeam: string
): { home: number; away: number } | null {
  const parts = selection.split('|').map((p) => p.trim());
  if (parts.length !== 2) return null;

  let home: number | null = null;
  let away: number | null = null;
  for (const part of parts) {
    const match = part.match(/^(.+):(\d+)$/);
    if (!match) continue;
    const score = Number(match[2]);
    if (normalizeName(match[1]) === normalizeName(homeTeam)) home = score;
    else if (normalizeName(match[1]) === normalizeName(awayTeam)) away = score;
  }
  return home !== null && away !== null ? { home, away } : null;
}

// Shared by goals/corners/cards totals markets. A push (value === threshold)
// voids rather than loses — goals only ever use .5 thresholds so this never
// fires for them, but corners/cards can use whole-number lines.
function gradeOverUnder(value: number | null, market: string): SettlementResult {
  if (value === null) return 'void';
  const ou = market.match(/(over|under)\s*(\d+(?:\.\d+)?)/);
  if (!ou) return 'void';
  const threshold = Number(ou[2]);
  if (value === threshold) return 'void';
  return ou[1] === 'over' ? (value > threshold ? 'won' : 'lost') : value < threshold ? 'won' : 'lost';
}

// Player props (anytime scorer / to receive a card). The Odds API never
// returned a live outcome sample for these in testing (keys accepted, never
// populated for the fixtures tested), so the exact outcome-name format for
// player identity is unconfirmed — this matches by substring against
// API-Football's event player.name. KNOWN LIMITATION: two players sharing a
// surname in the same fixture can be conflated; fixing this properly needs a
// real sample of how player identity is named in a live odds outcome.
function playerHasEvent(events: ApiFootballFixtureEvent[], selection: string, type: 'Goal' | 'Card'): boolean {
  const playerKey = normalizeName(selection);
  return events.some((e) => {
    if (e.type !== type) return false;
    // Anytime-scorer markets exclude own goals under standard bookmaker rules.
    if (type === 'Goal' && e.detail.toLowerCase().includes('own goal')) return false;
    return Boolean(e.player.name) && normalizeName(e.player.name as string).includes(playerKey);
  });
}

// Narrowed to just the fields this actually reads, so callers can pass a
// partial pick shape without an unsafe cast.
export function evaluatePickResult(
  pick: {
    market_type: Pick['market_type'];
    selection: Pick['selection'];
    home_team: Pick['home_team'];
    away_team: Pick['away_team'];
  },
  result: SettlementData
): SettlementResult {
  const market = `${pick.market_type} ${pick.selection}`.toLowerCase();
  const { homeGoals, awayGoals } = result;

  switch (classifyMarket(market)) {
    case 'ht_ft': {
      if (result.halftimeHomeGoals === null || result.halftimeAwayGoals === null) return 'void';
      const htLeader = leaderLabel(result.halftimeHomeGoals, result.halftimeAwayGoals, pick.home_team, pick.away_team);
      const ftLeader = leaderLabel(homeGoals, awayGoals, pick.home_team, pick.away_team);
      return `${htLeader}/${ftLeader}`.toLowerCase() === pick.selection.trim().toLowerCase() ? 'won' : 'lost';
    }

    case 'half_time_void':
      // Any other half-time-only market (e.g. a standalone 1st-half
      // moneyline) — Stage 1 is no longer instructed to generate these, and
      // we don't fetch the data to grade them, so void defensively rather
      // than settle against the full-time score.
      return 'void';

    case 'correct_score': {
      const parsed = parseCorrectScoreSelection(pick.selection, pick.home_team, pick.away_team);
      if (!parsed) return 'void';
      return parsed.home === homeGoals && parsed.away === awayGoals ? 'won' : 'lost';
    }

    case 'player_card':
      if (!result.events) return 'void';
      return playerHasEvent(result.events, pick.selection, 'Card') ? 'won' : 'lost';

    case 'player_scorer':
      if (!result.events) return 'void';
      return playerHasEvent(result.events, pick.selection, 'Goal') ? 'won' : 'lost';

    case 'corners':
      return gradeOverUnder(result.totalCorners, market);

    case 'cards':
      return gradeOverUnder(result.totalCards, market);

    case 'btts':
      if (market.includes('yes')) return homeGoals > 0 && awayGoals > 0 ? 'won' : 'lost';
      if (market.includes('no')) return homeGoals === 0 || awayGoals === 0 ? 'won' : 'lost';
      return 'void';

    case 'double_chance':
      if (market.includes('1x')) return homeGoals >= awayGoals ? 'won' : 'lost';
      if (market.includes('x2')) return awayGoals >= homeGoals ? 'won' : 'lost';
      if (market.includes('12')) return homeGoals !== awayGoals ? 'won' : 'lost';
      return 'void';

    case 'over_under':
      return gradeOverUnder(homeGoals + awayGoals, market);

    case 'asian_handicap': {
      // Only the -0.5/+0.5/-1 handicaps Stage 1 generates are resolved here.
      // Whole-number pushes on unusual handicaps are marked void rather than guessed.
      const handicapMatch = market.match(/(-?\+?\d+(?:\.\d+)?)/);
      const isHome = market.includes('home');
      const isAway = market.includes('away');
      if (handicapMatch && (isHome || isAway)) {
        const handicap = Number(handicapMatch[1]);
        const adjustedHome = homeGoals + (isHome ? handicap : 0);
        const adjustedAway = awayGoals + (isAway ? handicap : 0);
        if (adjustedHome === adjustedAway) return 'void'; // push
        return isHome ? (adjustedHome > adjustedAway ? 'won' : 'lost') : adjustedAway > adjustedHome ? 'won' : 'lost';
      }
      return 'void';
    }

    case 'result':
      if (market.includes('home')) return homeGoals > awayGoals ? 'won' : 'lost';
      if (market.includes('away')) return awayGoals > homeGoals ? 'won' : 'lost';
      if (market.includes('draw')) return homeGoals === awayGoals ? 'won' : 'lost';
      return 'void';

    case 'unknown':
      return 'void';
  }
}

async function getCached<T>(cache: Map<number, T>, key: number, fetch: () => Promise<T>): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  const value = await fetch();
  cache.set(key, value);
  return value;
}

// Fetches statistics/events only when the pick's market actually needs them
// (via the same classifyMarket used for grading, so the two can't disagree),
// and caches per fixture so multiple picks on the same match (e.g. separate
// corners/cards/scorer picks) don't each re-fetch identical data.
async function buildSettlementData(
  pick: Pick,
  fixtureResult: NonNullable<Awaited<ReturnType<typeof getFixtureResult>>>,
  statsCache: Map<number, ApiFootballFixtureStatistics[]>,
  eventsCache: Map<number, ApiFootballFixtureEvent[]>
): Promise<SettlementData> {
  const market = `${pick.market_type} ${pick.selection}`.toLowerCase();
  const category = classifyMarket(market);
  const fixtureId = Number(pick.fixture_id);

  const needsStats = category === 'corners' || category === 'cards';
  const needsEvents = category === 'player_scorer' || category === 'player_card';

  const [stats, events] = await Promise.all([
    needsStats ? getCached(statsCache, fixtureId, () => getFixtureStatistics(fixtureId)) : Promise.resolve(null),
    needsEvents ? getCached(eventsCache, fixtureId, () => getFixtureEvents(fixtureId)) : Promise.resolve(null),
  ]);

  const { totalCorners, totalCards } = stats ? aggregateStatistics(stats) : { totalCorners: null, totalCards: null };

  return {
    homeGoals: fixtureResult.homeGoals,
    awayGoals: fixtureResult.awayGoals,
    halftimeHomeGoals: fixtureResult.halftimeHomeGoals,
    halftimeAwayGoals: fixtureResult.halftimeAwayGoals,
    totalCorners,
    totalCards,
    events,
  };
}

export const settleResults = inngest.createFunction(
  { id: 'settle-results', triggers: [{ cron: '0 22 * * *' }] }, // 22:00 UTC — after most European evening fixtures
  async ({ step }) => {
    const pending = await step.run('fetch-pending-picks', async () => {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('picks')
        .select('*')
        .eq('status', 'pending')
        .lte('match_date', new Date().toISOString());
      return (data ?? []) as Pick[];
    });

    const settledPickIds = await step.run('settle-picks', async () => {
      const supabase = createServerClient();
      const settled: string[] = [];

      // Multiple pending picks (e.g. separate corners/cards/scorer picks) can
      // share a fixture_id — cache per-fixture lookups within this run so
      // each fixture is only fetched once regardless of how many picks
      // reference it.
      const fixtureResultCache = new Map<number, Awaited<ReturnType<typeof getFixtureResult>>>();
      const statsCache = new Map<number, ApiFootballFixtureStatistics[]>();
      const eventsCache = new Map<number, ApiFootballFixtureEvent[]>();

      for (const pick of pending) {
        if (!pick.fixture_id) continue;
        const fixtureId = Number(pick.fixture_id);
        const fixtureResult = await getCached(fixtureResultCache, fixtureId, () => getFixtureResult(fixtureId));
        if (!fixtureResult || !fixtureResult.finished) continue; // match not finished yet

        const settlementData = await buildSettlementData(pick, fixtureResult, statsCache, eventsCache);
        const outcome = evaluatePickResult(pick, settlementData);
        await supabase
          .from('picks')
          .update({
            status: outcome,
            settled_at: new Date().toISOString(),
            final_home_goals: fixtureResult.homeGoals,
            final_away_goals: fixtureResult.awayGoals,
          })
          .eq('id', pick.id);
        settled.push(pick.id);
      }

      return settled;
    });

    await step.run('log-clv', async () => {
      const supabase = createServerClient();

      for (const pickId of settledPickIds) {
        const pick = pending.find((p) => p.id === pickId);
        if (!pick?.fixture_id) continue;

        // SharpAPI's event namespace does not map 1:1 to API-Football fixture
        // IDs — best-effort lookup pending a proper cross-provider ID map.
        const clv = await getClosingLineValue(pick.fixture_id, pick.odds, pick.market_type);
        if (!clv) continue;

        await supabase.from('picks').update({ closing_odds: clv.closingOdds, clv: clv.clv }).eq('id', pickId);
      }
    });

    const ticketSettlement = await step.run('settle-tickets', async () => {
      const supabase = createServerClient();
      const { data: pendingTickets } = await supabase.from('tickets').select('*').eq('status', 'pending');

      let totalPnl = 0;
      let totalStaked = 0;
      let totalReturned = 0;
      let winCount = 0;
      let lossCount = 0;

      for (const ticket of pendingTickets ?? []) {
        const { data: legs } = await supabase.from('picks').select('status, odds').in('id', ticket.pick_ids);
        if (!legs || legs.length !== ticket.pick_ids.length || legs.some((leg) => leg.status === 'pending')) {
          continue; // not all legs settled yet
        }

        // Standard accumulator settlement: a void leg drops out at odds 1.0
        // rather than losing the ticket. The ticket only loses if a decided
        // leg lost; if every leg voided, the stake is returned (P&L 0).
        const anyLost = legs.some((leg) => leg.status === 'lost');
        const effectiveOdds = legs
          .filter((leg) => leg.status === 'won')
          .reduce((product, leg) => product * Number(leg.odds), 1);

        const stake = ticket.total_stake ?? 0;
        const won = !anyLost;
        const totalReturn = won ? stake * effectiveOdds : 0;
        const profitLoss = totalReturn - stake;

        await supabase
          .from('tickets')
          .update({ status: won ? 'won' : 'lost', profit_loss: profitLoss, total_return: totalReturn })
          .eq('id', ticket.id);

        totalPnl += profitLoss;
        totalStaked += stake;
        totalReturned += totalReturn;
        if (won) winCount += 1;
        else lossCount += 1;
      }

      return { totalPnl, totalStaked, totalReturned, winCount, lossCount };
    });

    await step.run('update-bankroll', async () => {
      const supabase = createServerClient();
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase.from('bankroll').select('*').eq('date', today).maybeSingle();
      const { data: previous } = await supabase
        .from('bankroll')
        .select('*')
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const openingBalance = existing?.opening_balance ?? previous?.closing_balance ?? 0;
      const priorClosing = existing?.closing_balance ?? openingBalance;
      const closingBalance = priorClosing + ticketSettlement.totalPnl;

      const totalStaked = (existing?.total_staked ?? previous?.total_staked ?? 0) + ticketSettlement.totalStaked;
      const totalReturned = (existing?.total_returned ?? previous?.total_returned ?? 0) + ticketSettlement.totalReturned;
      const winCount = (existing?.win_count ?? previous?.win_count ?? 0) + ticketSettlement.winCount;
      const lossCount = (existing?.loss_count ?? previous?.loss_count ?? 0) + ticketSettlement.lossCount;
      const runningRoi = totalStaked > 0 ? ((totalReturned - totalStaked) / totalStaked) * 100 : 0;

      await supabase.from('bankroll').upsert(
        {
          date: today,
          opening_balance: openingBalance,
          closing_balance: closingBalance,
          total_staked: totalStaked,
          total_returned: totalReturned,
          win_count: winCount,
          loss_count: lossCount,
          running_roi: runningRoi,
          sessions_count: existing?.sessions_count ?? previous?.sessions_count ?? 0,
        },
        { onConflict: 'date' }
      );
    });

    return { settledPicks: settledPickIds.length, ...ticketSettlement };
  }
);
