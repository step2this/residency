import { auth } from '@clerk/nextjs/server';
import { db, type Database } from '@/lib/db/client';

export async function createContext() {
  const { userId } = await auth();

  return {
    db,
    userId: userId ?? null,
  };
}

export type Context = {
  db: Database;
  userId: string | null;
};
