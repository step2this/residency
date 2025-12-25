import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { TRPCProvider } from '@/lib/trpc/provider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Force dynamic rendering for entire app (MVP deployment)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CoParent Schedule - Child Visitation Scheduling',
  description: 'Manage child visitation schedules for divorced families',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <NuqsAdapter>
            <TRPCProvider>
              {children}
              <Toaster />
            </TRPCProvider>
          </NuqsAdapter>
        </body>
      </html>
    </ClerkProvider>
  );
}
