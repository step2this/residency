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

const createFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required').max(100, 'Family name too long'),
});

type CreateFamilyInput = z.infer<typeof createFamilySchema>;

type CreateFamilyStepProps = {
  onComplete: (familyId: string) => void;
};

export function CreateFamilyStep({ onComplete }: CreateFamilyStepProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const form = useForm<CreateFamilyInput>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: {
      name: '',
    },
  });

  const createFamily = trpc.family.create.useMutation({
    onSuccess: (data) => {
      if (!data) {
        toast({
          title: 'Error',
          description: 'Failed to create family',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Family created',
        description: 'Your family has been set up successfully.',
      });
      utils.family.get.invalidate();
      onComplete(data.id);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateFamilyInput) => {
    createFamily.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Family Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Smith Family"
                  {...field}
                  disabled={createFamily.isPending}
                />
              </FormControl>
              <FormDescription>
                This is how your family will be identified in the app.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={createFamily.isPending}>
          {createFamily.isPending ? 'Creating...' : 'Create Family'}
        </Button>
      </form>
    </Form>
  );
}
