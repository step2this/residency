'use client';

import { UserButton } from '@clerk/nextjs';

export function UserMenu() {
  return (
    <div className="flex items-center gap-4">
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'h-8 w-8',
          },
        }}
      />
    </div>
  );
}
