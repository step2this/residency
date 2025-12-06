import { router } from '../init';
import { familyRouter } from './family';

export const appRouter = router({
  family: familyRouter,
});

export type AppRouter = typeof appRouter;
