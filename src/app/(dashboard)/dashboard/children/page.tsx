'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const childSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date',
  }),
});

type ChildFormInput = z.infer<typeof childSchema>;

type Child = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
};

export default function ChildrenPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);

  const { data: children = [], isLoading } = trpc.child.list.useQuery();

  const form = useForm<ChildFormInput>({
    resolver: zodResolver(childSchema),
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
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateChild = trpc.child.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Child updated',
        description: 'Child information has been updated.',
      });
      utils.child.list.invalidate();
      setDialogOpen(false);
      setEditingChildId(null);
      form.reset();
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

  const handleAdd = () => {
    setEditingChildId(null);
    form.reset();
    setDialogOpen(true);
  };

  const handleEdit = (child: Child) => {
    setEditingChildId(child.id);
    form.reset({
      firstName: child.firstName,
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth,
    });
    setDialogOpen(true);
  };

  const handleDelete = (childId: string) => {
    if (confirm('Are you sure you want to remove this child?')) {
      deleteChild.mutate({ id: childId });
    }
  };

  const onSubmit = (data: ChildFormInput) => {
    if (editingChildId) {
      updateChild.mutate({
        id: editingChildId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
      });
    } else {
      createChild.mutate({
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Children</h1>
          <p className="text-muted-foreground">
            Manage your children's information
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Child
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading...</div>
      ) : children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="text-muted-foreground">No children added yet</p>
            <Button onClick={handleAdd} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Child
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle>{child.firstName} {child.lastName}</CardTitle>
                <CardDescription>
                  Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(child)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(child.id)}
                  disabled={deleteChild.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChildId ? 'Edit Child' : 'Add Child'}</DialogTitle>
            <DialogDescription>
              {editingChildId ? 'Update child information' : 'Add a new child to your family'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
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
                      <Input placeholder="Last name" {...field} />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingChildId(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createChild.isPending || updateChild.isPending}
                >
                  {editingChildId ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
