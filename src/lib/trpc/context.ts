import { auth, clerkClient } from '@clerk/nextjs/server';
import { db, type Database } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createContext() {
  const { userId } = await auth();

  // Development-only: Auto-create missing users (webhook can't reach localhost)
  if (userId && process.env.NODE_ENV === 'development') {
    try {
      // Check if user exists in database
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      // If user doesn't exist, create from Clerk data
      if (!existingUser) {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(userId);

        const primaryEmail = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        );

        if (primaryEmail) {
          await db.insert(users).values({
            id: userId,
            email: primaryEmail.emailAddress,
            firstName: clerkUser.firstName ?? null,
            lastName: clerkUser.lastName ?? null,
          });
          console.log(`[DEV] Auto-created user: ${userId}`);
        }
      }
    } catch (error) {
      // Log but don't fail - let the request continue
      console.error('[DEV] Failed to auto-create user:', error);
    }
  }

  return {
    db,
    userId: userId ?? null,
  };
}

export type Context = {
  db: Database;
  userId: string | null;
};
