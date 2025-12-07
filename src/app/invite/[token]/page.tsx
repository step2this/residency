'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth, SignInButton, SignUpButton } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, Users, AlertCircle, Loader2 } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();
  const token = params.token as string;

  // Fetch invitation details (public endpoint)
  const {
    data: invitation,
    isLoading,
    error,
  } = trpc.invitation.getByToken.useQuery(
    { token },
    {
      retry: false,
      enabled: !!token,
    }
  );

  // Accept invitation mutation
  const acceptInvitation = trpc.invitation.accept.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Welcome to the family!',
        description: `You've joined ${data.familyName} as a ${ROLE_LABELS[data.role] || data.role}.`,
      });
      router.push('/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAccept = () => {
    acceptInvitation.mutate({ token });
  };

  // Loading states
  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Loading invitation...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Invalid Invitation</CardTitle>
              </div>
              <CardDescription>
                {error.message}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                Go to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md px-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              {invitation.inviterName} has invited you to join their family on CoParent Schedule
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Family</span>
                <span className="font-medium">{invitation.familyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Role</span>
                <span className="font-medium">{ROLE_LABELS[invitation.role] || invitation.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expires</span>
                <span className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3" />
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {isSignedIn ? (
              <Button
                onClick={handleAccept}
                className="w-full"
                disabled={acceptInvitation.isPending}
              >
                {acceptInvitation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept Invitation
                  </>
                )}
              </Button>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Sign in or create an account to accept this invitation
                </p>
                <div className="flex w-full gap-2">
                  <SignInButton mode="modal" fallbackRedirectUrl={`/invite/${token}`}>
                    <Button variant="outline" className="flex-1">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal" fallbackRedirectUrl={`/invite/${token}`}>
                    <Button className="flex-1">
                      Sign Up
                    </Button>
                  </SignUpButton>
                </div>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
