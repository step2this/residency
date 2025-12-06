'use client';

import { useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, UserPlus } from 'lucide-react';

const addChildSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date',
  }),
});

type AddChildInput = z.infer<typeof addChildSchema>;

type AddChildrenStepProps = {
  familyId: string;
  onComplete: () => void;
  onSkip: () => void;
};

export function AddChildrenStep({ familyId, onComplete, onSkip }: AddChildrenStepProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [isAddingChild, setIsAddingChild] = useState(false);

  const { data: children = [], isLoading } = trpc.child.list.useQuery();

  const form = useForm<AddChildInput>({
    resolver: zodResolver(addChildSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
    },
  });

  const createChild = trpc.child.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Child added',
        description: 'Child has been added successfully.',
      });
      utils.child.list.invalidate();
      form.reset();
      setIsAddingChild(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteChild = trpc.child.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Child removed',
        description: 'Child has been removed.',
      });
      utils.child.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AddChildInput) => {
    createChild.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
    });
  };

  const handleDelete = (childId: string) => {
    if (confirm('Are you sure you want to remove this child?')) {
      deleteChild.mutate({ id: childId });
    }
  };

  return (
    <div className="space-y-6">
      {/* List of added children */}
      {children.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Added Children</h3>
          {children.map((child) => (
            <Card key={child.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {child.firstName} {child.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(child.id)}
                  disabled={deleteChild.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add child form */}
      {isAddingChild ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a Child</CardTitle>
            <CardDescription>Enter your child's information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="First name"
                          {...field}
                          disabled={createChild.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Last name"
                          {...field}
                          disabled={createChild.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={createChild.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={createChild.isPending}>
                    {createChild.isPending ? 'Adding...' : 'Add Child'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setIsAddingChild(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAddingChild(true)}
          className="w-full"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add a Child
        </Button>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={onComplete} disabled={children.length === 0}>
          Continue
        </Button>
        <Button variant="outline" onClick={onSkip}>
          Skip for Now
        </Button>
      </div>
    </div>
  );
}
