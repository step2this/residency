'use client';

// Force dynamic rendering to avoid useSearchParams() prerender issues
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseAsInteger, useQueryState } from 'nuqs';
import { trpc } from '@/lib/trpc/provider';
import { CreateFamilyStep } from '@/components/onboarding/create-family-step';
import { AddChildrenStep } from '@/components/onboarding/add-children-step';
import { InviteCoparentStep } from '@/components/onboarding/invite-coparent-step';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useQueryState('step', parseAsInteger.withDefault(1));
  const [familyId, setFamilyId] = useState<string | null>(null);

  // Check if user already has a family
  const { data: existingFamily, isLoading } = trpc.family.get.useQuery();

  useEffect(() => {
    if (existingFamily) {
      // User already has a family, redirect to dashboard
      router.push('/dashboard');
    }
  }, [existingFamily, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const handleFamilyCreated = (id: string) => {
    setFamilyId(id);
    setStep(2);
  };

  const handleChildrenComplete = () => {
    setStep(3);
  };

  const handleCoparentComplete = () => {
    router.push('/dashboard');
  };

  const handleSkip = () => {
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to CoParent Schedule</h1>
          <p className="mt-2 text-muted-foreground">
            Let's set up your account in a few simple steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full ${
                s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Create Your Family'}
              {step === 2 && 'Add Children'}
              {step === 3 && 'Invite Co-Parent'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Set up your family account to get started'}
              {step === 2 && 'Add your children (you can do this later)'}
              {step === 3 && 'Invite your co-parent to collaborate (optional)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && <CreateFamilyStep onComplete={handleFamilyCreated} />}
            {step === 2 && familyId && (
              <AddChildrenStep
                familyId={familyId}
                onComplete={handleChildrenComplete}
                onSkip={handleSkip}
              />
            )}
            {step === 3 && familyId && (
              <InviteCoparentStep
                familyId={familyId}
                onComplete={handleCoparentComplete}
                onSkip={handleSkip}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
