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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, Clock, Plus, X } from 'lucide-react';

const swapRequestSchema = z.object({
  eventId: z.string().min(1, 'Select an event'),
  newStartTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date/time',
  }),
  newEndTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date/time',
  }),
  reason: z.string().min(1, 'Reason is required').max(500),
});

type SwapRequestFormInput = z.infer<typeof swapRequestSchema>;

export default function SwapsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Fetch swap requests
  const { data: swaps = [], isLoading } = trpc.swap.list.useQuery(
    statusFilter === 'all' ? {} : { status: statusFilter }
  );

  // Fetch events for the dropdown
  const { data: events = [] } = trpc.schedule.list.useQuery({
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Next 90 days
  });

  const form = useForm<SwapRequestFormInput>({
    resolver: zodResolver(swapRequestSchema),
    defaultValues: {
      eventId: '',
      newStartTime: '',
      newEndTime: '',
      reason: '',
    },
  });

  const createSwap = trpc.swap.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Swap request created',
        description: 'Your swap request has been sent.',
      });
      utils.swap.list.invalidate();
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

  const approveSwap = trpc.swap.approve.useMutation({
    onSuccess: () => {
      toast({
        title: 'Swap approved',
        description: 'The swap request has been approved.',
      });
      utils.swap.list.invalidate();
      utils.schedule.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectSwap = trpc.swap.reject.useMutation({
    onSuccess: () => {
      toast({
        title: 'Swap rejected',
        description: 'The swap request has been rejected.',
      });
      utils.swap.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const cancelSwap = trpc.swap.cancel.useMutation({
    onSuccess: () => {
      toast({
        title: 'Swap cancelled',
        description: 'Your swap request has been cancelled.',
      });
      utils.swap.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SwapRequestFormInput) => {
    createSwap.mutate({
      eventId: data.eventId,
      newStartTime: new Date(data.newStartTime),
      newEndTime: new Date(data.newEndTime),
      reason: data.reason,
    });
  };

  const handleApprove = (id: string) => {
    if (confirm('Are you sure you want to approve this swap request?')) {
      approveSwap.mutate({ id });
    }
  };

  const handleReject = (id: string) => {
    if (confirm('Are you sure you want to reject this swap request?')) {
      rejectSwap.mutate({ id });
    }
  };

  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this swap request?')) {
      cancelSwap.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'default',
      approved: 'default',
      rejected: 'destructive',
      cancelled: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Swap Requests</h1>
          <p className="text-muted-foreground">
            Manage schedule swap requests
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request Swap
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('pending')}
        >
          <Clock className="mr-2 h-4 w-4" />
          Pending
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('approved')}
        >
          <Check className="mr-2 h-4 w-4" />
          Approved
        </Button>
        <Button
          variant={statusFilter === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('rejected')}
        >
          <X className="mr-2 h-4 w-4" />
          Rejected
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading...</div>
      ) : swaps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="text-muted-foreground">No swap requests</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Swap Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {swaps.map((swap: any) => (
            <Card key={swap.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Event with {swap.event.child.firstName}
                  </CardTitle>
                  {getStatusBadge(swap.status)}
                </div>
                <CardDescription>
                  Requested by {swap.requestedBy.firstName || 'Co-parent'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div>
                    <p className="text-sm font-medium">Original Time:</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(swap.event.startTime).toLocaleString()} -{' '}
                      {new Date(swap.event.endTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Proposed Time:</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(swap.newStartTime).toLocaleString()} -{' '}
                      {new Date(swap.newEndTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Reason:</p>
                    <p className="text-sm text-muted-foreground">{swap.reason}</p>
                  </div>
                </div>

                {swap.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(swap.id)}
                      disabled={approveSwap.isPending}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(swap.id)}
                      disabled={rejectSwap.isPending}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(swap.id)}
                      disabled={cancelSwap.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Swap Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Schedule Swap</DialogTitle>
            <DialogDescription>
              Request to change an existing visitation event time
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an event to swap" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.child.firstName} - {new Date(event.startTime).toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="newStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New End Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Swap</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why you need to change the schedule..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a clear reason for this swap request
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createSwap.isPending}>
                  Request Swap
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
