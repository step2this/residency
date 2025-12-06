'use client';

import { useCallback } from 'react';
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react';
import {
  createViewDay,
  createViewMonthGrid,
  createViewWeek,
} from '@schedule-x/calendar';
import '@schedule-x/theme-default/dist/index.css';
import { trpc } from '@/lib/trpc/provider';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';

type ScheduleCalendarProps = {
  onEventClick?: (eventId: string) => void;
  onCreateEvent?: (date: Date) => void;
};

export function ScheduleCalendar({ onEventClick, onCreateEvent }: ScheduleCalendarProps) {
  const [view, setView] = useQueryState('view', parseAsString.withDefault('week'));
  const [selectedDate, setSelectedDate] = useQueryState(
    'date',
    parseAsString.withDefault(new Date().toISOString().split('T')[0] as string)
  );

  // Fetch schedule events
  const { data: events = [] } = trpc.schedule.list.useQuery({
    startDate: new Date(new Date(selectedDate).setMonth(new Date(selectedDate).getMonth() - 1)),
    endDate: new Date(new Date(selectedDate).setMonth(new Date(selectedDate).getMonth() + 2)),
  });

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    defaultView: view === 'month' ? 'month-grid' : 'week',
    selectedDate,
    events: events.map((event) => ({
      id: event.id,
      title: `${event.child.firstName} - ${event.parent.firstName}`,
      start: new Date(event.startTime).toISOString().slice(0, 16),
      end: new Date(event.endTime).toISOString().slice(0, 16),
      description: event.notes || undefined,
    })),
    callbacks: {
      onEventClick(calendarEvent) {
        onEventClick?.(String(calendarEvent.id));
      },
      onRangeUpdate(range) {
        setSelectedDate(range.start);
      },
    },
  });

  const handleViewChange = useCallback(
    (newView: string) => {
      setView(newView);
    },
    [setView]
  );

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Schedule</h2>
        <div className="flex gap-2">
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('week')}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Week
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('month')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Month
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border bg-card">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </div>
  );
}
