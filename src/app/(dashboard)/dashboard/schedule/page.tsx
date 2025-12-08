'use client';

// CRITICAL: Import Temporal polyfill FIRST (before any Schedule-X imports)
import '@js-temporal/polyfill';

import { useState } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { ScheduleCalendar } from '@/components/calendar/schedule-calendar';
import { EventDialog } from '@/components/calendar/event-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function SchedulePage() {
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useQueryState('event', parseAsString);
  const [createDate, setCreateDate] = useState<Date | undefined>();

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setEventDialogOpen(true);
  };

  const handleCreateEvent = (date?: Date) => {
    setSelectedEventId(null);
    setCreateDate(date);
    setEventDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setEventDialogOpen(open);
    if (!open) {
      setSelectedEventId(null);
      setCreateDate(undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">
            View and manage visitation schedules
          </p>
        </div>
        <Button onClick={() => handleCreateEvent()}>
          <Plus className="mr-2 h-4 w-4" />
          New Event
        </Button>
      </div>

      <ScheduleCalendar
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
      />

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={handleDialogClose}
        eventId={selectedEventId || undefined}
        defaultDate={createDate}
      />
    </div>
  );
}
