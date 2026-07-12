import { router } from '../trpc';
import { picksRouter } from './picks';
import { bankrollRouter } from './bankroll';
import { sessionsRouter } from './sessions';
import { fixturesRouter } from './fixtures';

export const appRouter = router({
  picks: picksRouter,
  bankroll: bankrollRouter,
  sessions: sessionsRouter,
  fixtures: fixturesRouter,
});

export type AppRouter = typeof appRouter;
