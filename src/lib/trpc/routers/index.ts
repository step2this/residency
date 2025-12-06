import { router } from '../init';
import { familyRouter } from './family';
import { childRouter } from './child';
import { scheduleRouter } from './schedule';
import { swapRouter } from './swap';

export const appRouter = router({
  family: familyRouter,
  child: childRouter,
  schedule: scheduleRouter,
  swap: swapRouter,
});

export type AppRouter = typeof appRouter;
