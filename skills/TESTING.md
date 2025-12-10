# Testing Philosophy & Patterns

## Core Testing Principles

1. **Test Behavior, Not Implementation** - Care about *what* it does, not *how*
2. **No Mocks or Spies** - Test with real dependencies when possible
3. **Keep Tests DRY** - Share setup, utilities, and fixtures
4. **Don't Test Every Edge Case** - Focus on critical paths and realistic scenarios
5. **Fast & Reliable** - Tests should run quickly and pass consistently

## What We DON'T Do

### ❌ No Mocking Internal Implementation
```typescript
// ❌ BAD - Testing implementation details
it('should call getUser with correct params', () => {
  const getUserSpy = vi.spyOn(userService, 'getUser');
  render(<UserProfile id="123" />);
  expect(getUserSpy).toHaveBeenCalledWith('123');
});
```

### ❌ No Testing Framework Internals
```typescript
// ❌ BAD - Testing React internals
it('should update state when button clicked', () => {
  const { rerender } = render(<Counter />);
  fireEvent.click(screen.getByRole('button'));
  expect(component.state.count).toBe(1); // Don't access state directly
});
```

### ❌ No Exhaustive Edge Case Testing
```typescript
// ❌ BAD - Testing every possible input
describe('validateEmail', () => {
  it('should reject email with no @', () => { /* */ });
  it('should reject email with multiple @', () => { /* */ });
  it('should reject email with no domain', () => { /* */ });
  it('should reject email with spaces', () => { /* */ });
  it('should reject email with unicode', () => { /* */ });
  // 50 more edge cases...
});

// ✅ GOOD - Test realistic cases
describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
  
  it('should reject invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
  });
});
```

### ❌ No Mocking External Services (Use Real Ones)
```typescript
// ❌ BAD - Mocking database
vi.mock('./db', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] })
}));

// ✅ GOOD - Use test database
import { db } from './test-db'; // Real Neon branch or test instance
```

## What We DO

### ✅ Test User-Facing Behavior
```typescript
// ✅ GOOD - Testing what users see and do
describe('EventCard', () => {
  it('should show event details to user', () => {
    const event = createTestEvent({ title: 'Soccer Practice' });
    render(<EventCard event={event} />);
    
    expect(screen.getByText('Soccer Practice')).toBeInTheDocument();
    expect(screen.getByText(/Dec 15, 2025/)).toBeInTheDocument();
  });
  
  it('should allow user to request swap', async () => {
    const event = createTestEvent({ canSwap: true });
    render(<EventCard event={event} />);
    
    await userEvent.click(screen.getByRole('button', { name: /swap/i }));
    
    expect(screen.getByText(/Swap requested/)).toBeInTheDocument();
  });
});
```

### ✅ Share Test Utilities
```typescript
// tests/utils/factories.ts
export function createTestEvent(overrides?: Partial<Event>): Event {
  return {
    id: crypto.randomUUID(),
    title: 'Test Event',
    startTime: new Date('2025-12-15T10:00:00Z'),
    endTime: new Date('2025-12-15T11:00:00Z'),
    ...overrides,
  };
}

export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: crypto.randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
}

// tests/utils/render.tsx
export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <ClerkProvider>
        {ui}
      </ClerkProvider>
    </QueryClientProvider>
  );
}

// Usage in tests
it('should display user name', () => {
  const user = createTestUser({ name: 'Steve' });
  renderWithProviders(<UserProfile user={user} />);
  expect(screen.getByText('Steve')).toBeInTheDocument();
});
```

### ✅ Integration Tests Over Unit Tests
```typescript
// ✅ GOOD - Test full flow with real tRPC
describe('Event Creation Flow', () => {
  it('should create event and update calendar', async () => {
    // Setup: Real test database
    const user = await createTestUser();
    const family = await createTestFamily({ userId: user.id });
    
    // Render with real providers
    renderWithProviders(<CreateEventForm familyId={family.id} />);
    
    // User interaction
    await userEvent.type(
      screen.getByLabelText(/title/i),
      'Soccer Practice'
    );
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    
    // Verify behavior
    await waitFor(() => {
      expect(screen.getByText(/Event created/)).toBeInTheDocument();
    });
    
    // Verify database state
    const events = await db.query.events.findMany({
      where: eq(events.familyId, family.id)
    });
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Soccer Practice');
  });
});
```

### ✅ Test Database Operations with Real Database
```typescript
// lib/schedules/queries.test.ts
import { db } from '@/lib/db/test-client'; // Test Neon branch

describe('getActiveSchedule', () => {
  beforeEach(async () => {
    await db.delete(schedules); // Clean slate
  });
  
  it('should return active schedule with events', async () => {
    // Setup
    const schedule = await db.insert(schedules).values({
      active: true,
      pattern: 'weekly',
    }).returning();
    
    await db.insert(events).values({
      scheduleId: schedule[0].id,
      title: 'Test Event',
    });
    
    // Test
    const result = await getActiveSchedule();
    
    // Verify
    expect(result).toBeDefined();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('Test Event');
  });
});
```

## Testing Structure

### Organize by Feature, Not Test Type
```
lib/
  schedules/
    queries.ts
    queries.test.ts       # Tests next to implementation
    mutations.ts
    mutations.test.ts
    utils.ts
    utils.test.ts

components/
  schedules/
    schedule-view.tsx
    schedule-view.test.tsx
```

### Use Descriptive Test Names
```typescript
// ❌ BAD - Vague names
it('works', () => { /* */ });
it('should return data', () => { /* */ });

// ✅ GOOD - Descriptive names
it('should show event when user is a parent', () => { /* */ });
it('should hide swap button when event is in the past', () => { /* */ });
it('should create recurring events for next 6 months', () => { /* */ });
```

## What to Test

### ✅ Critical User Flows
- Sign up → Create family → Add child → Create schedule
- Request swap → Approve swap → Calendar updates
- Create recurring event → Verify all occurrences
- Delete event → Verify cascade (if applicable)

### ✅ Business Logic
```typescript
// lib/schedules/utils.test.ts
describe('canSwapEvent', () => {
  it('should allow swap when user is parent and event is future', () => {
    const event = createTestEvent({
      parentId: 'user123',
      startTime: futureDate(),
    });
    
    expect(canSwapEvent(event, 'user123')).toBe(true);
  });
  
  it('should prevent swap when event is in past', () => {
    const event = createTestEvent({
      parentId: 'user123',
      startTime: pastDate(),
    });
    
    expect(canSwapEvent(event, 'user123')).toBe(false);
  });
});
```

### ✅ tRPC Procedures (End-to-End)
```typescript
// lib/trpc/routers/events.test.ts
describe('events.create', () => {
  it('should create event when user is family member', async () => {
    const caller = createCaller({ userId: 'user123' });
    const family = await createTestFamily({ userIds: ['user123'] });
    
    const result = await caller.events.create({
      familyId: family.id,
      title: 'Doctor Appointment',
      startTime: new Date('2025-12-20T14:00:00Z'),
      endTime: new Date('2025-12-20T15:00:00Z'),
    });
    
    expect(result.title).toBe('Doctor Appointment');
  });
  
  it('should throw FORBIDDEN when user not in family', async () => {
    const caller = createCaller({ userId: 'outsider' });
    const family = await createTestFamily({ userIds: ['user123'] });
    
    await expect(
      caller.events.create({
        familyId: family.id,
        title: 'Event',
        startTime: new Date(),
        endTime: new Date(),
      })
    ).rejects.toThrow('FORBIDDEN');
  });
});
```

## What NOT to Test

### ❌ Skip Testing
- Third-party library internals (Schedule-X, React Hook Form)
- Framework behavior (Next.js routing, React rendering)
- Type definitions (TypeScript catches these)
- Trivial getters/setters
- Simple data transformations (unless business logic)

### ❌ Don't Test UI Layout
```typescript
// ❌ BAD - Testing CSS
it('should have correct padding', () => {
  render(<Card />);
  expect(screen.getByTestId('card')).toHaveStyle('padding: 16px');
});

// ✅ GOOD - Test accessibility instead
it('should be keyboard navigable', () => {
  render(<Card />);
  const card = screen.getByRole('article');
  expect(card).toHaveAttribute('tabIndex', '0');
});
```

## Test Database Setup

### Using Neon Branching for Tests
```typescript
// lib/db/test-client.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig } from '@neondatabase/serverless';

// Use Neon branch for tests (create via Neon API or manually)
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL!;

export const db = drizzle(TEST_DATABASE_URL);

// Cleanup helper
export async function resetTestDb() {
  // Truncate all tables between tests
  await db.delete(events);
  await db.delete(schedules);
  await db.delete(families);
  await db.delete(users);
}
```

## Performance Testing

### Keep Tests Fast
```typescript
// ✅ GOOD - Parallel test execution
describe.concurrent('Schedule utilities', () => {
  it('calculates next occurrence', () => { /* */ });
  it('validates recurring pattern', () => { /* */ });
});

// ✅ GOOD - Setup data once for multiple tests
describe('Event queries', () => {
  let family: Family;
  let events: Event[];
  
  beforeAll(async () => {
    family = await createTestFamily();
    events = await createTestEvents(family.id, 10);
  });
  
  afterAll(async () => {
    await resetTestDb();
  });
  
  it('should filter by date range', () => { /* uses shared data */ });
  it('should filter by parent', () => { /* uses shared data */ });
});
```

## Testing Checklist

Before committing tests:
- [ ] Tests focus on behavior, not implementation
- [ ] No mocks or spies (unless external API)
- [ ] Shared utilities extracted to test helpers
- [ ] Test names clearly describe scenario
- [ ] Tests use real database (test branch)
- [ ] Critical user flows covered
- [ ] Tests run quickly (<2s for unit, <10s for integration)
- [ ] No flaky tests (random failures)

## Examples of Good Tests

### Component Test
```typescript
describe('SwapRequestCard', () => {
  it('should allow parent to approve swap request', async () => {
    const request = createTestSwapRequest({ status: 'pending' });
    renderWithProviders(<SwapRequestCard request={request} />);
    
    await userEvent.click(screen.getByRole('button', { name: /approve/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Swap approved/)).toBeInTheDocument();
    });
  });
});
```

### Business Logic Test
```typescript
describe('generateRecurringEvents', () => {
  it('should create events for 6 months of weekly pattern', () => {
    const pattern = { frequency: 'weekly', dayOfWeek: 1 };
    const events = generateRecurringEvents(pattern, { months: 6 });
    
    expect(events).toHaveLength(26); // ~26 weeks in 6 months
    expect(events[0].dayOfWeek).toBe(1);
    expect(events[25].dayOfWeek).toBe(1);
  });
});
```

### API Test
```typescript
describe('POST /api/events', () => {
  it('should create event and return 201', async () => {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Event',
        startTime: '2025-12-20T10:00:00Z',
        endTime: '2025-12-20T11:00:00Z',
      }),
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.title).toBe('Test Event');
  });
});
```
