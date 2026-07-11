import { router } from '../trpc';
import { picksRouter } from './picks';
import { bankrollRouter } from './bankroll';
import { sessionsRouter } from './sessions';

export const appRouter = router({
  picks: picksRouter,
  bankroll: bankrollRouter,
  sessions: sessionsRouter,
});

export type AppRouter = typeof appRouter;
