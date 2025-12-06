'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/provider';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';

const inviteCoparentSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type InviteCoparentInput = z.infer<typeof inviteCoparentSchema>;

type InviteCoparentStepProps = {
  familyId: string;
  onComplete: () => void;
  onSkip: () => void;
};

export function InviteCoparentStep({ familyId, onComplete, onSkip }: InviteCoparentStepProps) {
  const { toast } = useToast();

  const form = useForm<InviteCoparentInput>({
    resolver: zodResolver(inviteCoparentSchema),
    defaultValues: {
      email: '',
    },
  });

  const addMember = trpc.family.addMember.useMutation({
    onSuccess: () => {
      toast({
        title: 'Invitation sent',
        description: 'Your co-parent has been invited to join.',
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: InviteCoparentInput) => {
    addMember.mutate({
      email: data.email,
      role: 'parent_2',
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Invite your co-parent to collaborate on scheduling and view the shared calendar. They'll
          receive an email invitation to create their account.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Co-Parent's Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="coparent@example.com"
                      className="pl-9"
                      {...field}
                      disabled={addMember.isPending}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  We'll send them an invitation to join your family account.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
            <Button type="button" variant="outline" onClick={onSkip}>
              Skip for Now
            </Button>
          </div>
        </form>
      </Form>

      <p className="text-xs text-muted-foreground">
        You can always invite your co-parent later from the Family Settings page.
      </p>
    </div>
  );
}
