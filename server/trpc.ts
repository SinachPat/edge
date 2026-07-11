import { initTRPC, TRPCError } from '@trpc/server';
import { createAuthedServerClient } from '@/lib/supabase-server-auth';

export async function createContext() {
  const supabase = await createAuthedServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not signed in' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// All EDGE data is private to whoever is signed in — every router uses this
// instead of publicProcedure.
export const protectedProcedure = t.procedure.use(requireAuth);
