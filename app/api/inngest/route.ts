import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { dailyPipeline } from '@/inngest/daily-pipeline';
import { settleResults } from '@/inngest/settle-results';

export const maxDuration = 300; // 5 minutes — allow long pipeline runs

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyPipeline, settleResults],
});
