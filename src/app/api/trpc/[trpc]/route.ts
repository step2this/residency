import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routers';
import { createContext } from '@/lib/trpc/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            const errorMsg = error.message || error.code || 'Unknown error';
            const causeMsg =
              error.cause instanceof Error
                ? error.cause.message
                : error.cause
                  ? String(error.cause)
                  : null;

            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${errorMsg}`
            );
            if (causeMsg) {
              console.error('  Root cause:', causeMsg);
            }
            console.error('  Full error:', error);
            if (error.stack) {
              console.error('  Stack:', error.stack);
            }
          }
        : undefined,
  });

export { handler as GET, handler as POST };
