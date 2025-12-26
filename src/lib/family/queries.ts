import { db } from '@/lib/db/client';
import { familyMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get user's family membership
 * Returns null if user has not completed onboarding
 */
export async function getUserFamilyMembership(userId: string) {
  return db.query.familyMembers.findFirst({
    where: eq(familyMembers.userId, userId),
    with: {
      family: true,
    },
  });
}

/**
 * Check if user has completed onboarding (has a family)
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const membership = await getUserFamilyMembership(userId);
  return membership !== null;
}
