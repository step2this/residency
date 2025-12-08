# Coding Standards & Preferences

This document defines coding standards and preferences for this project. Claude Code should follow these guidelines when generating or modifying code.

---

## General Principles

- **Readability First**: Code is read more than written - optimize for clarity
- **DRY (Don't Repeat Yourself)**: Extract reusable logic into functions/components
- **YAGNI (You Aren't Gonna Need It)**: Don't add functionality until needed
- **Test What Matters**: Focus tests on business logic and critical paths
- **Progressive Enhancement**: Core functionality should work without JavaScript when possible

---

## TypeScript

### Type Safety
- ✅ **DO**: Use strict mode, enable all strict type-checking options
- ✅ **DO**: Prefer explicit types for function parameters and return values
- ✅ **DO**: Use `unknown` instead of `any` when type is truly unknown
- ✅ **DO**: Use type guards for runtime type checking
- ❌ **DON'T**: Use `any` unless absolutely necessary (document why if used)
- ❌ **DON'T**: Use `as` type assertions unless certain it's safe

### Examples
```typescript
// ✅ Good
function calculateHandoffTime(
  schedule: Schedule,
  timezone: string
): Date {
  // implementation
}

// ❌ Bad
function calculateHandoffTime(schedule: any, timezone: any) {
  // implementation
}
```

### Naming Conventions
- `PascalCase` for types, interfaces, classes, components
- `camelCase` for variables, functions, methods
- `UPPER_SNAKE_CASE` for constants
- `kebab-case` for file names (except React components)

---

## React & Next.js

### Component Structure
- ✅ **DO**: Use functional components with hooks
- ✅ **DO**: Prefer Server Components by default (Next.js 13+)
- ✅ **DO**: Add `'use client'` directive only when needed
- ✅ **DO**: Keep components small and focused (< 200 lines)
- ✅ **DO**: Extract complex logic into custom hooks
- ❌ **DON'T**: Use class components (legacy pattern)
- ❌ **DON'T**: Overuse useEffect - consider alternatives first

### Component Organization
```typescript
// ✅ Good structure
'use client' // if needed

import { useState, useEffect } from 'react'
import { type ComponentProps } from './types'

// Types/Interfaces
interface ScheduleViewProps {
  scheduleId: string
  onUpdate?: (schedule: Schedule) => void
}

// Component
export function ScheduleView({ scheduleId, onUpdate }: ScheduleViewProps) {
  // State hooks
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  
  // Effect hooks
  useEffect(() => {
    // side effects
  }, [scheduleId])
  
  // Event handlers
  const handleUpdate = () => {
    // handler logic
  }
  
  // Early returns
  if (!schedule) return <LoadingSpinner />
  
  // Main render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### File Structure
```
/src
  /app                    # Next.js app directory
    /[route]
      page.tsx           # Page component
      layout.tsx         # Layout component
      loading.tsx        # Loading UI
      error.tsx          # Error boundary
  /components
    /ui                  # shadcn/ui components
    /schedule            # Domain-specific components
      ScheduleView.tsx
      ScheduleEditor.tsx
      schedule-types.ts  # Shared types
  /lib
    /schedule            # Business logic
      recurrence.ts
      timezone.ts
    /api                 # API client functions
  /hooks                 # Custom React hooks
  /utils                 # Pure utility functions
```

---

## State Management

### Prefer Simple Solutions
- ✅ **DO**: Start with React's built-in useState/useContext
- ✅ **DO**: Use TanStack Query (React Query) for server state
- ✅ **DO**: Use Zustand for complex client state (if needed)
- ❌ **DON'T**: Jump to Redux unless complexity demands it

### Server State vs Client State
```typescript
// ✅ Good: TanStack Query for server state
import { useQuery } from '@tanstack/react-query'

function ScheduleView({ scheduleId }: Props) {
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => fetchSchedule(scheduleId)
  })
  
  // ...
}

// ✅ Good: useState for client-only state
function ScheduleEditor() {
  const [isEditing, setIsEditing] = useState(false)
  // ...
}
```

---

## Data Validation

### Use Zod for Runtime Validation
- ✅ **DO**: Define Zod schemas for API responses and form inputs
- ✅ **DO**: Derive TypeScript types from Zod schemas
- ✅ **DO**: Validate at system boundaries (API, forms, etc.)

```typescript
import { z } from 'zod'

// ✅ Good: Define schema and derive type
const scheduleSchema = z.object({
  id: z.string().uuid(),
  parentIds: z.array(z.string()).length(2),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurrence: z.string().optional()
})

type Schedule = z.infer<typeof scheduleSchema>

// Use in API endpoint
export async function POST(request: Request) {
  const body = await request.json()
  const validated = scheduleSchema.parse(body) // Throws if invalid
  // ...
}
```

---

## Error Handling

### Patterns
- ✅ **DO**: Use try-catch for async operations
- ✅ **DO**: Create custom error classes for domain errors
- ✅ **DO**: Show user-friendly error messages
- ✅ **DO**: Log errors with context for debugging

```typescript
// ✅ Good: Custom error classes
class ScheduleConflictError extends Error {
  constructor(message: string, public conflictingSchedule: Schedule) {
    super(message)
    this.name = 'ScheduleConflictError'
  }
}

// ✅ Good: Graceful error handling
try {
  await createSchedule(newSchedule)
} catch (error) {
  if (error instanceof ScheduleConflictError) {
    toast.error('This schedule conflicts with an existing one')
    // Show conflicting schedule details
  } else {
    toast.error('Failed to create schedule. Please try again.')
    logger.error('Schedule creation failed', { error, newSchedule })
  }
}
```

---

## API Design

### RESTful Conventions
- `GET /api/schedules` - List schedules
- `GET /api/schedules/[id]` - Get specific schedule
- `POST /api/schedules` - Create schedule
- `PATCH /api/schedules/[id]` - Update schedule
- `DELETE /api/schedules/[id]` - Delete schedule

### Response Format
```typescript
// ✅ Good: Consistent response structure
interface ApiResponse<T> {
  data: T
  meta?: {
    page?: number
    pageSize?: number
    total?: number
  }
}

interface ApiError {
  error: {
    message: string
    code: string
    details?: Record<string, unknown>
  }
}
```

---

## Database (DynamoDB)

### Naming Conventions
- Table names: `PascalCase` (e.g., `Schedules`)
- Attribute names: `camelCase` (e.g., `parentIds`)
- Index names: Descriptive with prefix (e.g., `GSI-ParentId-StartTime`)

### Access Patterns
- ✅ **DO**: Document all access patterns before designing schema
- ✅ **DO**: Use single-table design when appropriate
- ✅ **DO**: Leverage GSIs (Global Secondary Indexes) for alternate queries
- ❌ **DON'T**: Scan tables in production code

---

## Styling

### Tailwind CSS
- ✅ **DO**: Use Tailwind utility classes
- ✅ **DO**: Extract repeated patterns into components
- ✅ **DO**: Use shadcn/ui components for consistency
- ❌ **DON'T**: Create custom CSS files unless truly necessary

```typescript
// ✅ Good: Utility classes
<div className="flex items-center gap-4 rounded-lg border bg-card p-4">
  {/* content */}
</div>

// ✅ Good: Responsive design
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* content */}
</div>
```

---

## Testing

### Testing Philosophy
- Focus on integration tests over unit tests
- Test user-facing behavior, not implementation details
- Use Testing Library's user-centric queries

### What to Test
- ✅ **DO**: Test critical user paths (authentication, scheduling, handoffs)
- ✅ **DO**: Test error states and edge cases
- ✅ **DO**: Test API endpoints
- ❌ **DON'T**: Test implementation details or private functions
- ❌ **DON'T**: Test third-party library behavior

---

## Comments & Documentation

### When to Comment
- ✅ **DO**: Explain *why*, not *what*
- ✅ **DO**: Document complex algorithms or business rules
- ✅ **DO**: Add JSDoc for public APIs and exported functions
- ❌ **DON'T**: State the obvious

```typescript
// ❌ Bad: Obvious comment
// Set isLoading to true
setIsLoading(true)

// ✅ Good: Explains why
// Fetch one week ahead to enable smooth infinite scroll
const schedules = await fetchSchedules(startDate, endDate.add(7, 'days'))

/**
 * Calculates the next handoff time based on recurring schedule pattern.
 * Handles timezone conversion and daylight saving time transitions.
 * 
 * @param schedule - The recurring schedule definition
 * @param fromDate - Calculate next occurrence after this date
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Next handoff date/time in the specified timezone
 */
export function calculateNextHandoff(
  schedule: RecurringSchedule,
  fromDate: Date,
  timezone: string
): Date {
  // implementation
}
```

---

## Performance

### Optimization Priorities
1. **Measure First**: Use profiling before optimizing
2. **User-Facing Performance**: Prioritize perceived performance
3. **Lazy Load**: Code-split large components and routes

### Patterns
- ✅ **DO**: Memoize expensive calculations with useMemo
- ✅ **DO**: Use React.memo for expensive pure components
- ✅ **DO**: Debounce expensive operations (search, API calls)
- ✅ **DO**: Use Next.js Image component for images
- ❌ **DON'T**: Premature optimization

---

## Security

### Key Principles
- ✅ **DO**: Validate all user inputs
- ✅ **DO**: Use parameterized queries (DynamoDB expressions)
- ✅ **DO**: Sanitize data before rendering (React does this by default)
- ✅ **DO**: Use HTTPS everywhere
- ✅ **DO**: Store secrets in environment variables, never in code
- ❌ **DON'T**: Trust client-side validation alone
- ❌ **DON'T**: Expose sensitive data in API responses

---

## Accessibility

### WCAG 2.1 AA Compliance
- ✅ **DO**: Use semantic HTML (header, nav, main, article, etc.)
- ✅ **DO**: Provide alt text for images
- ✅ **DO**: Ensure keyboard navigation works
- ✅ **DO**: Maintain color contrast ratios (4.5:1 for text)
- ✅ **DO**: Use ARIA labels when needed
- ✅ **DO**: Test with screen readers

```typescript
// ✅ Good: Accessible button
<button
  onClick={handleDelete}
  aria-label="Delete schedule"
  className="..."
>
  <TrashIcon aria-hidden="true" />
</button>
```

---

## Git & Version Control

### Commit Messages
Follow Conventional Commits format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

```
feat(schedule): add recurring schedule pattern editor

Implements JTBD-2 (US-2.3). Users can now create weekly, bi-weekly,
or custom recurring patterns using the new RecurrenceEditor component.

Closes #23
```

### Branch Naming
- `feature/issue-23-recurring-schedules`
- `fix/issue-45-timezone-bug`
- `chore/update-dependencies`

---

## Code Review Checklist

Before submitting code for review:
- [ ] Code follows TypeScript & React conventions above
- [ ] Tests added/updated for new functionality
- [ ] No console.logs or debugging code left in
- [ ] Error handling is comprehensive
- [ ] Accessibility considerations addressed
- [ ] Mobile responsive design verified
- [ ] Types are properly defined (no `any`)
- [ ] Documentation updated if needed

---

## AI Assistance Preferences

When working with Claude Code:
- Prefer functional approaches over imperative
- Explain complex decisions in comments
- Suggest tests alongside implementation
- Flag potential security or performance concerns
- Ask clarifying questions before making big architectural changes
