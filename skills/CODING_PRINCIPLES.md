# Coding Principles - SOLID, DRY, YAGNI

## Core Philosophy

Write code that is:
1. **Simple** - Easy to understand and modify
2. **Testable** - Can be tested in isolation
3. **Maintainable** - Future developers can work with it
4. **Sufficient** - Solves the problem without over-engineering

## SOLID Principles

### S - Single Responsibility Principle

**Each function/component/module should do ONE thing**

#### ❌ BAD - Multiple Responsibilities
```tsx
// Component handles: data fetching, validation, rendering, error handling, routing
function EventManagement() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        if (!data.every(e => e.title && e.startTime)) {
          setError('Invalid data');
          return;
        }
        setEvents(data);
      })
      .catch(e => setError(e.message));
  }, []);
  
  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    setEvents(events.filter(e => e.id !== id));
    router.refresh();
  };
  
  return (
    <div>
      {error && <div>{error}</div>}
      {events.map(e => (
        <div key={e.id}>
          <h3>{e.title}</h3>
          <button onClick={() => handleDelete(e.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

#### ✅ GOOD - Separated Responsibilities
```tsx
// Data fetching (Server Component)
async function EventsPage() {
  const events = await getEvents();
  return <EventsList events={events} />;
}

// Data access layer
export async function getEvents() {
  return db.query.events.findMany({
    orderBy: [desc(events.createdAt)],
  });
}

// Presentation (Client Component)
function EventsList({ events }: { events: Event[] }) {
  return (
    <ul>
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </ul>
  );
}

// User interaction
function EventCard({ event }: { event: Event }) {
  return (
    <Card>
      <CardHeader>{event.title}</CardHeader>
      <CardActions>
        <DeleteEventButton eventId={event.id} />
      </CardActions>
    </Card>
  );
}

// Single action handler
function DeleteEventButton({ eventId }: { eventId: string }) {
  const deleteEvent = useDeleteEvent();
  
  return (
    <Button onClick={() => deleteEvent.mutate(eventId)}>
      Delete
    </Button>
  );
}
```

### O - Open/Closed Principle

**Open for extension, closed for modification**

#### ❌ BAD - Modifying Existing Code
```tsx
// Every new event type requires modifying this function
function renderEvent(event: Event) {
  if (event.type === 'pickup') {
    return <PickupEvent event={event} />;
  } else if (event.type === 'dropoff') {
    return <DropoffEvent event={event} />;
  } else if (event.type === 'vacation') {
    return <VacationEvent event={event} />;
  }
  // Adding new type? Modify this function!
}
```

#### ✅ GOOD - Extensible Design
```tsx
// Define event renderers
const eventRenderers: Record<EventType, React.FC<{ event: Event }>> = {
  pickup: PickupEvent,
  dropoff: DropoffEvent,
  vacation: VacationEvent,
  // Adding new type? Just add here, no modifications needed
};

function renderEvent(event: Event) {
  const Renderer = eventRenderers[event.type];
  return <Renderer event={event} />;
}
```

### L - Liskov Substitution Principle

**Subtypes should be substitutable for their base types**

#### ❌ BAD - Breaking Contracts
```tsx
interface EventHandler {
  handle(event: Event): Promise<void>;
}

class CreateEventHandler implements EventHandler {
  async handle(event: Event): Promise<void> {
    await db.insert(events).values(event);
  }
}

class ValidateEventHandler implements EventHandler {
  async handle(event: Event): Promise<void> {
    // ❌ BAD - Throws when interface promises no exceptions
    if (!event.title) throw new Error('Title required');
    // Doesn't actually handle the event
  }
}
```

#### ✅ GOOD - Consistent Contracts
```tsx
interface EventValidator {
  validate(event: Event): ValidationResult;
}

interface EventHandler {
  handle(event: Event): Promise<void>;
}

class TitleValidator implements EventValidator {
  validate(event: Event): ValidationResult {
    return event.title 
      ? { valid: true }
      : { valid: false, error: 'Title required' };
  }
}

class CreateEventHandler implements EventHandler {
  async handle(event: Event): Promise<void> {
    await db.insert(events).values(event);
  }
}
```

### I - Interface Segregation Principle

**Don't force clients to depend on interfaces they don't use**

#### ❌ BAD - Fat Interfaces
```tsx
interface EventRepository {
  create(event: Event): Promise<Event>;
  update(id: string, event: Event): Promise<Event>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Event | null>;
  findByFamily(familyId: string): Promise<Event[]>;
  findUpcoming(): Promise<Event[]>;
  findPast(): Promise<Event[]>;
  export(format: 'json' | 'csv'): Promise<string>;
}

// Component only needs findUpcoming but must depend on entire interface
function UpcomingEvents({ repo }: { repo: EventRepository }) {
  const events = await repo.findUpcoming();
  return <EventsList events={events} />;
}
```

#### ✅ GOOD - Focused Interfaces
```tsx
interface EventReader {
  findUpcoming(): Promise<Event[]>;
}

interface EventWriter {
  create(event: Event): Promise<Event>;
  update(id: string, event: Event): Promise<Event>;
}

interface EventDeleter {
  delete(id: string): Promise<void>;
}

// Component depends only on what it needs
function UpcomingEvents({ reader }: { reader: EventReader }) {
  const events = await reader.findUpcoming();
  return <EventsList events={events} />;
}
```

### D - Dependency Inversion Principle

**Depend on abstractions, not concretions**

#### ❌ BAD - Tight Coupling
```tsx
// Component directly depends on Clerk implementation
function UserProfile() {
  const { user } = useUser(); // Direct Clerk dependency
  const clerkId = user?.id; // Relies on Clerk's ID format
  
  return <div>Welcome {user?.firstName}</div>;
}
```

#### ✅ GOOD - Abstraction Layer
```tsx
// Define your own abstraction
interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthProvider {
  getCurrentUser(): AuthUser | null;
}

// Clerk implementation
class ClerkAuthProvider implements AuthProvider {
  getCurrentUser(): AuthUser | null {
    const { user } = useUser();
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? '',
      name: `${user.firstName} ${user.lastName}`,
    };
  }
}

// Component depends on abstraction
function UserProfile({ auth }: { auth: AuthProvider }) {
  const user = auth.getCurrentUser();
  return <div>Welcome {user?.name}</div>;
}
```

## DRY Principle (Don't Repeat Yourself)

### ❌ BAD - Repeated Logic
```tsx
// Same validation in multiple places
function CreateEventForm() {
  const handleSubmit = (data: FormData) => {
    if (!data.title || data.title.length > 100) {
      toast.error('Title must be 1-100 characters');
      return;
    }
    if (new Date(data.startTime) < new Date()) {
      toast.error('Start time must be in future');
      return;
    }
    // Create event
  };
}

function UpdateEventForm() {
  const handleSubmit = (data: FormData) => {
    if (!data.title || data.title.length > 100) {
      toast.error('Title must be 1-100 characters');
      return;
    }
    if (new Date(data.startTime) < new Date()) {
      toast.error('Start time must be in future');
      return;
    }
    // Update event
  };
}
```

### ✅ GOOD - Extract Shared Logic
```tsx
// schemas/events.ts - Single source of truth
export const eventSchema = z.object({
  title: z.string().min(1).max(100),
  startTime: z.string().refine(
    (date) => new Date(date) > new Date(),
    'Start time must be in future'
  ),
  endTime: z.string(),
});

// Shared validation hook
function useEventForm(initialData?: Event) {
  return useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: initialData,
  });
}

// Used everywhere
function CreateEventForm() {
  const form = useEventForm();
  // Form uses shared validation
}

function UpdateEventForm({ event }: { event: Event }) {
  const form = useEventForm(event);
  // Same validation, different context
}
```

### ❌ BAD - Repeated Component Patterns
```tsx
function EventCard({ event }: { event: Event }) {
  return (
    <div className="rounded-lg border p-4 shadow">
      <h3 className="text-lg font-semibold">{event.title}</h3>
      <p className="text-sm text-gray-600">{event.description}</p>
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <div className="rounded-lg border p-4 shadow">
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-sm text-gray-600">{user.email}</p>
    </div>
  );
}

function FamilyCard({ family }: { family: Family }) {
  return (
    <div className="rounded-lg border p-4 shadow">
      <h3 className="text-lg font-semibold">{family.name}</h3>
      <p className="text-sm text-gray-600">{family.members.length} members</p>
    </div>
  );
}
```

### ✅ GOOD - Reusable Components
```tsx
// Base card component
function Card({ title, description, children }: CardProps) {
  return (
    <div className="rounded-lg border p-4 shadow">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}
      {children}
    </div>
  );
}

// Specific implementations
function EventCard({ event }: { event: Event }) {
  return (
    <Card title={event.title} description={event.description}>
      <EventActions event={event} />
    </Card>
  );
}

function UserCard({ user }: { user: User }) {
  return <Card title={user.name} description={user.email} />;
}

function FamilyCard({ family }: { family: Family }) {
  return (
    <Card 
      title={family.name} 
      description={`${family.members.length} members`}
    />
  );
}
```

## YAGNI Principle (You Aren't Gonna Need It)

### ❌ BAD - Building for Imaginary Future
```tsx
// ❌ BAD - Over-engineered for non-existent requirements
interface EventRepository {
  create(event: Event): Promise<Event>;
  createBatch(events: Event[]): Promise<Event[]>; // Not needed yet
  createWithRetry(event: Event, maxRetries: number): Promise<Event>; // Not needed
  createWithValidation(event: Event, validator: Validator): Promise<Event>; // Not needed
  createAsync(event: Event): Promise<string>; // Not needed
  createAndNotify(event: Event, recipients: string[]): Promise<Event>; // Not needed
}

class CachingEventRepository implements EventRepository {
  // 200 lines of caching logic we don't need yet
}

class RetryingEventRepository implements EventRepository {
  // 150 lines of retry logic we don't need yet
}
```

### ✅ GOOD - Build What You Need Now
```tsx
// ✅ GOOD - Simple, solves current problem
export async function createEvent(event: InsertEvent): Promise<Event> {
  const [created] = await db.insert(events).values(event).returning();
  return created;
}

// Add complexity when you actually need it
```

### ❌ BAD - Premature Abstraction
```tsx
// ❌ BAD - Complex abstraction for simple need
abstract class BaseEventHandler<T extends Event> {
  abstract handle(event: T): Promise<void>;
  abstract validate(event: T): boolean;
  abstract transform(event: T): TransformedEvent;
  
  async process(event: T): Promise<void> {
    if (!this.validate(event)) throw new Error('Invalid');
    const transformed = this.transform(event);
    await this.handle(transformed);
  }
}

class PickupEventHandler extends BaseEventHandler<PickupEvent> {
  // 50 lines for one event type
}

class DropoffEventHandler extends BaseEventHandler<DropoffEvent> {
  // 50 more lines
}
```

### ✅ GOOD - Simple Until Proven Otherwise
```tsx
// ✅ GOOD - Direct and simple
export async function createPickupEvent(event: PickupEvent) {
  return db.insert(events).values(event).returning();
}

export async function createDropoffEvent(event: DropoffEvent) {
  return db.insert(events).values(event).returning();
}

// If we find duplication later, THEN extract common logic
```

## When to Abstract

### ✅ Abstract When You Have:
1. **Three or more repetitions** (Rule of Three)
2. **Clear pattern** that will continue
3. **Tests proving the abstraction**
4. **Real use cases** (not hypothetical)

### ❌ Don't Abstract When:
1. Code appears twice (might be coincidence)
2. Pattern is unclear or might change
3. Abstraction adds more complexity than duplication
4. You're "preparing for the future"

## Advanced TypeScript Usage

### ✅ Use Discriminated Unions
```typescript
// ✅ GOOD - Type-safe state management
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function useRequest<T>() {
  const [state, setState] = useState<RequestState<T>>({ status: 'idle' });
  
  if (state.status === 'success') {
    // TypeScript knows data exists
    console.log(state.data);
  }
}
```

### ✅ Use Generics Appropriately
```typescript
// ✅ GOOD - Reusable with type safety
function createMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>
) {
  return useMutation({
    mutationFn,
    onSuccess: (data: TOutput) => {
      // Fully typed
    },
  });
}

const createEvent = createMutation<InsertEvent, Event>(
  async (input) => {
    const [event] = await db.insert(events).values(input).returning();
    return event;
  }
);
```

### ✅ Infer Types, Don't Define
```typescript
// ❌ BAD - Manual type definitions
type Event = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
};

// ✅ GOOD - Infer from source
export const events = pgTable('events', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  startTime: timestamp('start_time', { mode: 'string' }).notNull(),
  endTime: timestamp('end_time', { mode: 'string' }).notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
```

## Code Organization Principles

### ✅ Colocate Related Code
```
features/
  events/
    components/
      event-card.tsx
      event-list.tsx
    hooks/
      use-events.ts
    utils/
      event-utils.ts
      event-utils.test.ts
    queries.ts
    mutations.ts
```

### ✅ Separate Concerns by Layer
```
lib/
  db/              # Data access
    schema.ts
    client.ts
  events/          # Business logic
    queries.ts
    mutations.ts
    utils.ts
  validation/      # Validation
    schemas.ts
components/        # Presentation
  events/
    event-card.tsx
```

## Checklist for Clean Code

Before committing, verify:
- [ ] Each function/component has ONE clear purpose
- [ ] No repeated logic (DRY)
- [ ] No premature abstractions (YAGNI)
- [ ] Types inferred from source when possible
- [ ] No magic numbers or strings (use constants)
- [ ] Business logic separated from UI
- [ ] Components are composable
- [ ] Code is testable
- [ ] Variable names are descriptive
- [ ] Functions are short (<50 lines)
- [ ] Files are focused (<300 lines)
