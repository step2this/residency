# UI Patterns & Component Architecture

## Core Principles

1. **Separation of Concerns**: Logic ≠ Presentation
2. **Single Responsibility**: One component, one job
3. **Composition over Inheritance**: Small, reusable pieces
4. **Server Components by Default**: `'use client'` only when necessary

## Critical Anti-Patterns to Avoid

### ❌ ANTI-PATTERN 1: Kitchen Sink Page Components

**Don't put everything in the page:**
```tsx
// ❌ BAD - All logic inline in page component
export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await db.query.invites.findFirst({
    where: eq(invites.token, params.token)
  });
  
  if (!invite) return <div>Invalid invite</div>;
  if (invite.expiresAt < new Date()) return <div>Expired</div>;
  
  const family = await db.query.families.findFirst({
    where: eq(families.id, invite.familyId)
  });
  
  // 50 more lines of logic and JSX...
  return (
    <div className="container">
      {/* Inline forms, handlers, validation */}
    </div>
  );
}
```

**Do this instead:**
```tsx
// ✅ GOOD - Separation of concerns
// src/app/invite/[token]/page.tsx
export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await validateInviteToken(params.token);
  return <InviteAcceptForm invite={invite} />;
}

// src/lib/invites/validate-token.ts
export async function validateInviteToken(token: string) {
  const invite = await db.query.invites.findFirst({
    where: eq(invites.token, token),
    with: { family: true }
  });
  
  if (!invite) throw new InviteError('Invalid invite token');
  if (invite.expiresAt < new Date()) throw new InviteError('Invite expired');
  
  return invite;
}

// src/components/invites/invite-accept-form.tsx
'use client'
export function InviteAcceptForm({ invite }: { invite: Invite }) {
  // Form logic only
}
```

### ❌ ANTI-PATTERN 2: Parsing Dates with Regex

**Never do this:**
```tsx
// ❌ BAD - Manual string manipulation for dates
const [year, month, day] = dateString.split('-');
const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

// ❌ WORSE - Regex for ISO dates
const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
```

**Do this instead:**
```tsx
// ✅ GOOD - Use built-in Date parsing
const date = new Date(dateString); // ISO strings work directly

// ✅ GOOD - Use date-fns for complex operations
import { parseISO, format, addDays } from 'date-fns';
const date = parseISO(dateString);
const formatted = format(date, 'MMM dd, yyyy');
```

### ❌ ANTI-PATTERN 3: No Component Composition

**Don't inline everything:**
```tsx
// ❌ BAD - Giant component with no composition
export function CalendarView() {
  return (
    <div>
      <div className="header">
        <h1>Calendar</h1>
        <div className="filters">
          {/* 50 lines of filter UI */}
        </div>
        <div className="actions">
          {/* 30 lines of action buttons */}
        </div>
      </div>
      <div className="calendar-grid">
        {/* 200 lines of calendar rendering */}
      </div>
      <div className="event-list">
        {/* 100 lines of event list */}
      </div>
    </div>
  );
}
```

**Do this instead:**
```tsx
// ✅ GOOD - Composed from smaller components
export function CalendarView() {
  return (
    <div>
      <CalendarHeader />
      <CalendarFilters />
      <CalendarGrid />
      <EventList />
    </div>
  );
}

// Each component handles its own concerns
function CalendarHeader() {
  return (
    <header>
      <h1>Calendar</h1>
      <CalendarActions />
    </header>
  );
}
```

### ❌ ANTI-PATTERN 4: Mixing Data Fetching with UI

**Don't do this:**
```tsx
// ❌ BAD - Client component fetching data
'use client'
export function EventList() {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(setEvents);
  }, []);
  
  return <ul>{events.map(e => <li>{e.title}</li>)}</ul>;
}
```

**Do this instead:**
```tsx
// ✅ GOOD - Server component fetches, client component renders
// src/app/dashboard/events/page.tsx
export default async function EventsPage() {
  const events = await db.query.events.findMany();
  return <EventList events={events} />;
}

// src/components/events/event-list.tsx
'use client'
export function EventList({ events }: { events: Event[] }) {
  // Only UI logic, data is passed as props
  return <ul>{events.map(e => <EventItem key={e.id} event={e} />)}</ul>;
}
```

## Correct Patterns

### ✅ PATTERN 1: Layered Architecture

```
app/
  └── [route]/
      └── page.tsx          # Orchestration only
lib/
  └── [domain]/
      ├── queries.ts        # Data access
      ├── mutations.ts      # Write operations  
      ├── validation.ts     # Zod schemas
      └── utils.ts          # Domain logic
components/
  └── [domain]/
      ├── [name].tsx        # Presentation
      └── [name]-form.tsx   # Interactive UI
```

**Example:**
```tsx
// app/schedule/page.tsx - Orchestration
export default async function SchedulePage() {
  const schedule = await getActiveSchedule();
  return <ScheduleView schedule={schedule} />;
}

// lib/schedules/queries.ts - Data access
export async function getActiveSchedule() {
  return db.query.schedules.findFirst({
    where: eq(schedules.active, true),
    with: { events: true }
  });
}

// components/schedules/schedule-view.tsx - Presentation
export function ScheduleView({ schedule }: Props) {
  return <div>{/* Pure UI */}</div>;
}
```

### ✅ PATTERN 2: Extract Business Logic

**Create domain utility functions:**
```tsx
// lib/schedules/utils.ts
export function isEventInPast(event: Event): boolean {
  return new Date(event.startTime) < new Date();
}

export function canSwapEvent(event: Event, userId: string): boolean {
  return event.parentId === userId && !isEventInPast(event);
}

export function getNextOccurrence(pattern: RecurringPattern): Date {
  // Complex date logic isolated
}

// Use in components
function EventCard({ event }: Props) {
  const canSwap = canSwapEvent(event, userId);
  return <Card>{canSwap && <SwapButton />}</Card>;
}
```

### ✅ PATTERN 3: Shared Components with Variants

**Use shadcn/ui patterns:**
```tsx
// components/ui/button.tsx - Base component
export function Button({ variant, size, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(buttonVariants({ variant, size }))}
      {...props} 
    />
  );
}

// components/schedules/schedule-actions.tsx - Domain-specific
export function SwapEventButton({ eventId }: Props) {
  return (
    <Button variant="outline" size="sm">
      Request Swap
    </Button>
  );
}
```

### ✅ PATTERN 4: Form Abstractions

**Don't repeat form setup:**
```tsx
// lib/forms/use-form-handler.ts - Shared hook
export function useFormHandler<T>(
  schema: z.ZodSchema<T>,
  onSubmit: (data: T) => Promise<void>
) {
  const form = useForm({
    resolver: zodResolver(schema),
  });
  
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      toast.success('Success');
    } catch (error) {
      toast.error(error.message);
    }
  });
  
  return { form, handleSubmit };
}

// Usage in any form
function CreateEventForm() {
  const { form, handleSubmit } = useFormHandler(
    createEventSchema,
    async (data) => await createEvent(data)
  );
  
  return <form onSubmit={handleSubmit}>{/* fields */}</form>;
}
```

## Schedule-X Specific Patterns

### ✅ PATTERN 5: Wrap Schedule-X Properly

**Don't use Schedule-X directly in pages:**
```tsx
// ❌ BAD
'use client'
export default function CalendarPage() {
  return (
    <ScheduleXCalendar
      // 100 lines of config
    />
  );
}
```

**Create a wrapper component:**
```tsx
// ✅ GOOD
// components/calendar/schedule-calendar.tsx
'use client'
import { ScheduleXCalendar } from '@schedule-x/react';
import { createCalendar } from '@schedule-x/calendar';
import { useCalendarConfig } from './use-calendar-config';

export function ScheduleCalendar({ events }: { events: CalendarEvent[] }) {
  const config = useCalendarConfig(events);
  const calendar = createCalendar(config);
  
  return (
    <div className="schedule-calendar-wrapper">
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  );
}

// hooks/use-calendar-config.ts
export function useCalendarConfig(events: CalendarEvent[]) {
  return useMemo(() => ({
    views: [viewWeek, viewMonthGrid],
    events: events.map(toScheduleXEvent),
    callbacks: {
      onEventClick: handleEventClick,
      onRangeUpdate: handleRangeUpdate,
    },
  }), [events]);
}
```

## TypeScript Patterns

### ✅ Use Type Inference
```tsx
// ❌ BAD - Redundant types
const events: Event[] = await db.query.events.findMany() as Event[];

// ✅ GOOD - Infer from Drizzle
const events = await db.query.events.findMany(); // Type inferred
```

### ✅ Discriminated Unions for State
```tsx
// ✅ GOOD
type FormState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Event }
  | { status: 'error'; error: string };

function EventForm() {
  const [state, setState] = useState<FormState>({ status: 'idle' });
  
  if (state.status === 'success') {
    // TypeScript knows state.data exists
    return <Success event={state.data} />;
  }
}
```

### ✅ Branded Types for IDs
```tsx
// lib/types/branded.ts
export type FamilyId = string & { readonly brand: unique symbol };
export type EventId = string & { readonly brand: unique symbol };

// Prevents mixing IDs
function getEvent(id: EventId) { /* */ }
const familyId = 'fam_123' as FamilyId;
getEvent(familyId); // ❌ Type error - prevents bugs
```

## Component Checklist

Before committing a component, verify:

- [ ] Does ONE thing (Single Responsibility)
- [ ] Logic separated from presentation
- [ ] No direct database calls in client components
- [ ] Reusable or intentionally page-specific?
- [ ] Props are minimal and typed
- [ ] No business logic in JSX
- [ ] Date manipulation uses proper libraries
- [ ] Form validation uses Zod schemas
- [ ] Error states handled
- [ ] Loading states for async operations

## When to Split a Component

Split when you:
- Have more than 100 lines
- See repeated JSX patterns
- Find conditional rendering getting complex
- Notice the same prop drilling 3+ levels
- Want to test one part independently
