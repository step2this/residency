import 'server-only';

import { createContext } from './context';
import { appRouter } from './routers';

export const trpcServer = async () => {
  const ctx = await createContext();
  return appRouter.createCaller(ctx);
};
