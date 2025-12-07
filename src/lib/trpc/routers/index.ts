import { router } from '../init';
import { familyRouter } from './family';
import { childRouter } from './child';
import { scheduleRouter } from './schedule';
import { swapRouter } from './swap';
import { invitationRouter } from './invitation';

export const appRouter = router({
  family: familyRouter,
  child: childRouter,
  schedule: scheduleRouter,
  swap: swapRouter,
  invitation: invitationRouter,
});

export type AppRouter = typeof appRouter;
