import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import superjson from 'superjson';

// Initialize tRPC with context
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires authenticated user
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // Type-safe userId (non-null)
    },
  });
});

// Family procedure - requires user to be a member of the family
export const familyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { db, userId } = ctx;

  // Get user's family membership
  const { familyMembers } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  const membership = await db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
    with: {
      family: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Not a member of any family. Please complete onboarding.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      familyId: membership.familyId,
      family: membership.family,
      canEdit: membership.canEditSchedule,
    },
  });
});
