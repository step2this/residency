'use client';

// Load Temporal polyfill FIRST - must be before Schedule-X imports
import '@/lib/polyfills/temporal';

import { useCallback, useMemo } from 'react';
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
import { generateCalendarEvents } from '@/lib/utils/rotation-utils';
import {
  toPlainDate,
  toISODateString,
  getDateRange,
  dateToZonedDateTime,
} from '@/lib/utils/date-utils';

type ScheduleCalendarProps = {
  onEventClick?: (eventId: string) => void;
  onCreateEvent?: (date: Date) => void;
};

export function ScheduleCalendar({ onEventClick, onCreateEvent }: ScheduleCalendarProps) {
  const [view, setView] = useQueryState('view', parseAsString.withDefault('week'));
  const [selectedDateStr, setSelectedDateStr] = useQueryState(
    'date',
    parseAsString.withDefault(new Date().toISOString().split('T')[0] as string)
  );

  // Convert URL state to Temporal.PlainDate for Schedule-X
  const selectedDate = useMemo(
    () => toPlainDate(selectedDateStr),
    [selectedDateStr]
  );

  // Calculate date range for fetching events (current month +/- 1 month)
  // Uses Temporal API for safe date arithmetic (no Invalid Date edge cases)
  const { startDate, endDate } = useMemo(
    () => getDateRange(selectedDate),
    [selectedDate]
  );

  // Fetch schedule events
  const { data: events = [] } = trpc.schedule.list.useQuery({
    startDate,
    endDate,
  });

  // DEBUG: Log query parameters and results
  console.log('[ScheduleCalendar] Query params:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    selectedDateStr,
  });
  console.log('[ScheduleCalendar] Events from tRPC:', events.length, events);

  // Fetch rotation patterns
  const { data: rotations = [] } = trpc.rotation.list.useQuery();

  // Generate rotation events for the current date range
  const rotationEvents = useMemo(() => {
    // Convert Date range to ISO strings for generateCalendarEvents
    const startDateStr = startDate.toISOString().split('T')[0] as string;
    const endDateStr = endDate.toISOString().split('T')[0] as string;

    const allRotationEvents: Array<{
      id: string;
      title: string;
      start: Temporal.PlainDate;
      end: Temporal.PlainDate;
      calendarId: string;
      description?: string;
    }> = [];

    for (const rotation of rotations) {
      const events = generateCalendarEvents(rotation, startDateStr, endDateStr);

      for (const event of events) {
        // All-day rotation events use Temporal.PlainDate
        const eventDate = toPlainDate(event.date);
        allRotationEvents.push({
          id: `rotation-${rotation.id}-${event.date}`,
          title: `${event.parentName} (${rotation.name})`,
          start: eventDate,
          end: eventDate,
          calendarId: 'rotation',
          description: `Day ${event.dayOfCycle + 1} of ${rotation.patternType} pattern`,
        });
      }
    }

    return allRotationEvents;
  }, [rotations, startDate, endDate]);

  // Merge schedule events and rotation events
  const allEvents = useMemo(() => {
    const scheduleEvents = events.map((event) => {
      // Timed events use Temporal.ZonedDateTime
      // Use utility function for clean conversion
      const scheduleEvent = {
        id: event.id,
        title: `${event.child.firstName} - ${event.parent.firstName}`,
        start: dateToZonedDateTime(new Date(event.startTime)),
        end: dateToZonedDateTime(new Date(event.endTime)),
        calendarId: 'manual',
        description: event.notes || undefined,
      };

      // DEBUG: Log each schedule event transformation
      console.log('[ScheduleCalendar] Transformed schedule event:', {
        id: scheduleEvent.id,
        title: scheduleEvent.title,
        start: scheduleEvent.start.toString(),
        end: scheduleEvent.end.toString(),
        calendarId: scheduleEvent.calendarId,
      });

      return scheduleEvent;
    });

    const merged = [...scheduleEvents, ...rotationEvents];

    // DEBUG: Log final merged events for Schedule-X
    console.log('[ScheduleCalendar] Total events for Schedule-X:', merged.length, {
      scheduleCount: scheduleEvents.length,
      rotationCount: rotationEvents.length,
    });

    return merged;
  }, [events, rotationEvents]);

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    defaultView: view === 'month' ? 'month-grid' : 'week',
    selectedDate,
    events: allEvents,
    calendars: {
      rotation: {
        colorName: 'rotation',
        lightColors: {
          main: '#8b5cf6',
          container: '#ede9fe',
          onContainer: '#5b21b6',
        },
        darkColors: {
          main: '#a78bfa',
          container: '#6d28d9',
          onContainer: '#ede9fe',
        },
      },
      manual: {
        colorName: 'manual',
        lightColors: {
          main: '#3b82f6',
          container: '#dbeafe',
          onContainer: '#1e40af',
        },
        darkColors: {
          main: '#60a5fa',
          container: '#1e40af',
          onContainer: '#dbeafe',
        },
      },
    },
    callbacks: {
      onEventClick(calendarEvent) {
        // Only trigger click for manual events, not rotation events
        if (calendarEvent.calendarId === 'manual') {
          onEventClick?.(String(calendarEvent.id));
        }
      },
      onRangeUpdate(range) {
        // Convert Temporal.PlainDate back to string for URL state
        setSelectedDateStr(range.start.toString());
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-muted-foreground">Manual Events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500" />
          <span className="text-muted-foreground">Rotation Events</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border bg-card">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </div>
  );
}
