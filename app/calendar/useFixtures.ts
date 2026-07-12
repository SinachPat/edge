import { trpc } from '@/lib/trpc-client';

export function useSports() {
  const query = trpc.fixtures.getSports.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  return { sports: query.data ?? [], isLoading: query.isLoading };
}

export function useFixtures(sportKey: string) {
  const query = trpc.fixtures.getBySport.useQuery(
    { sportKey },
    // Server caches the underlying Odds API call for 30 min — match that here
    // so tab-switching back and forth doesn't refetch on every click.
    { staleTime: 30 * 60 * 1000 }
  );

  return {
    fixtures: query.data?.fixtures ?? [],
    error: query.data?.error ?? null,
    isLoading: query.isLoading,
  };
}
