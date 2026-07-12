import { format } from 'date-fns';
import { trpc } from '@/lib/trpc-client';

export function useFixtures(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const query = trpc.fixtures.getByDate.useQuery({ date: dateStr });

  return {
    fixtures: query.data?.fixtures ?? [],
    error: query.data?.error ?? null,
    isLoading: query.isLoading,
  };
}
