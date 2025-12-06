'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/provider';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';

const eventFormSchema = z.object({
  childId: z.string().min(1, 'Select a child'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date/time',
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date/time',
  }),
  notes: z.string().max(500).optional(),
});

type EventFormInput = z.infer<typeof eventFormSchema>;

type EventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
  defaultDate?: Date;
};

export function EventDialog({ open, onOpenChange, eventId, defaultDate }: EventDialogProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [eventData, setEventData] = useState<any>(null);

  // Fetch children for selection
  const { data: children = [] } = trpc.child.list.useQuery();

  // Fetch family to get current user's member info
  const { data: family } = trpc.family.get.useQuery();

  // Find current user's family member ID
  const currentUserMember = family?.members.find((m) => m.role === 'parent_1' || m.role === 'parent_2');

  // Fetch all events to find the one being edited (workaround since no get endpoint)
  const { data: allEvents = [] } = trpc.schedule.list.useQuery(
    {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
    { enabled: !!eventId }
  );

  const event = eventId ? allEvents.find((e) => e.id === eventId) : null;

  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      childId: '',
      startTime: defaultDate
        ? new Date(defaultDate.setHours(9, 0, 0, 0)).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      endTime: defaultDate
        ? new Date(defaultDate.setHours(17, 0, 0, 0)).toISOString().slice(0, 16)
        : new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
      notes: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (event) {
      form.reset({
        childId: event.childId,
        startTime: new Date(event.startTime).toISOString().slice(0, 16),
        endTime: new Date(event.endTime).toISOString().slice(0, 16),
        notes: event.notes || '',
      });
    }
  }, [event, form]);

  const createEvent = trpc.schedule.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Event created',
        description: 'Visitation event has been added to the calendar.',
      });
      utils.schedule.list.invalidate();
      onOpenChange(false);
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

  const updateEvent = trpc.schedule.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Event updated',
        description: 'Visitation event has been updated.',
      });
      utils.schedule.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteEvent = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Event deleted',
        description: 'Visitation event has been removed.',
      });
      utils.schedule.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EventFormInput) => {
    if (!currentUserMember) {
      toast({
        title: 'Error',
        description: 'Could not find your family member information',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      childId: data.childId,
      parentId: currentUserMember.id,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      notes: data.notes || undefined,
      isRecurring: false,
    };

    if (eventId) {
      updateEvent.mutate({ id: eventId, ...payload });
    } else {
      createEvent.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (eventId && confirm('Are you sure you want to delete this event?')) {
      deleteEvent.mutate({ id: eventId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{eventId ? 'Edit Event' : 'Create Event'}</DialogTitle>
          <DialogDescription>
            {eventId
              ? 'Update visitation event details'
              : 'Add a new visitation event to the calendar'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="childId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Child</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a child" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.firstName} {child.lastName}
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
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional notes about this visitation</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              {eventId && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteEvent.isPending}
                  className="sm:mr-auto"
                >
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                {eventId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
