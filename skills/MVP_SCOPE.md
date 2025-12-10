# MVP Scope & Anti-Over-Engineering

## Core Principle: We're Building an MVP, Not Enterprise Software

This is a **minimum viable product** for divorced families to coordinate child visitation. We are NOT building:
- A SaaS platform for thousands of tenants
- A HIPAA-compliant medical records system
- A financial trading platform
- An enterprise workflow engine

## What NOT to Build (Yet)

### ❌ Premium Features to Skip
- Multi-tenant architecture with complex isolation
- Advanced analytics and reporting dashboards
- Webhook infrastructure for third-party integrations
- Real-time collaboration with WebSockets
- Advanced permission systems beyond "parent 1" and "parent 2"
- Email templating engines
- PDF report generation
- Payment processing or subscription management
- Admin panels or super-user interfaces
- Audit logging beyond database timestamps
- Data export functionality
- Mobile native apps (web-first only)

### ❌ Over-Engineering Patterns to Avoid
- Abstract factory patterns for simple CRUD
- Repository pattern layers (Drizzle is enough)
- Service layers that just wrap database calls
- Elaborate caching strategies (start simple)
- Complex state machines for basic workflows
- Event sourcing or CQRS architectures
- Microservices (we're serverless monolith)
- Feature flags infrastructure
- A/B testing framework
- Rate limiting (unless abuse detected)

### ❌ Security Theater
We DO need security, but not:
- Complex RBAC with 20 permission types (2 roles: parent, viewer)
- API rate limiting per endpoint (start with Clerk's defaults)
- Advanced DDoS protection (CloudFront basics)
- Security headers beyond Next.js defaults
- Custom encryption beyond what Neon/Clerk provide
- JWT rotation strategies (use Clerk's sessions)

## What We ARE Building

### ✅ Core MVP Features
1. **Auth**: Clerk sign-up/sign-in with passkeys
2. **Profiles**: Basic parent and child profiles
3. **Calendar**: View and create visitation events
4. **Schedule**: Recurring patterns (weekly, biweekly)
5. **Swaps**: Request to swap a scheduled event
6. **Notifications**: Basic email alerts via Clerk

### ✅ Acceptable Technical Shortcuts
- Store dates as ISO strings (don't build timezone abstraction)
- Use Clerk's built-in email (don't build email service)
- Store files in database as base64 for simple documents
- Hard-code common schedules (50/50, 60/40, every other weekend)
- Use browser's native date picker for now
- Allow duplicate family names (add uniqueness later)
- Simple optimistic updates (no complex conflict resolution)

### ✅ "Good Enough" Standards
- **Tests**: Cover critical paths, not every edge case
- **Error handling**: Try-catch with user-friendly messages
- **Validation**: Zod schemas on input, trust internal data
- **Types**: Infer from Drizzle/Zod, avoid manual type definitions
- **Performance**: If it's under 2 seconds, ship it
- **Mobile**: Responsive CSS, not native performance

## When Claude Suggests Over-Engineering

If you catch yourself writing or suggesting:
- "Let's add a service layer for future flexibility"
- "We should implement a repository pattern"
- "What about a caching strategy?"
- "Should we add feature flags?"
- "Let's create an admin interface"
- "We need comprehensive audit logging"
- "What about multi-region deployment?"

**STOP.** Ask: "Does the MVP absolutely need this to function?"

## Decision Framework

Before adding any abstraction or infrastructure:

1. **Is it required for MVP functionality?**
   - No → Don't build it
   - Yes → Continue to step 2

2. **Will users notice if it's missing?**
   - No → Don't build it
   - Yes → Continue to step 3

3. **Can we solve it with existing tools (Clerk, Neon, Next.js)?**
   - Yes → Use the existing tool
   - No → Build the simplest version that works

## Examples of Good MVP Decisions

### ✅ Good: Simple Swap Request
```typescript
// Just a database row with status field
await db.insert(swapRequests).values({
  eventId,
  requestedBy: userId,
  status: 'pending'
});
```

### ❌ Bad: Over-Engineered Swap System
```typescript
// Don't build this for MVP
class SwapRequestWorkflow {
  private stateMachine: StateMachine;
  private notificationQueue: Queue;
  private auditLogger: AuditLogger;
  
  async initiateSwap(request: SwapRequest): Promise<WorkflowResult> {
    // 200 lines of state management
  }
}
```

### ✅ Good: Direct Database Query
```typescript
const events = await db.query.events.findMany({
  where: eq(events.familyId, familyId)
});
```

### ❌ Bad: Repository Abstraction
```typescript
// Don't add this layer for MVP
class EventRepository {
  async findByFamilyId(id: string): Promise<Event[]> {
    return this.db.query.events.findMany({
      where: eq(events.familyId, id)
    });
  }
}
```

## Graduation Criteria

We can add complexity when we have:
- 50+ active families using the app
- Documented performance problems
- Specific feature requests from users
- Clear evidence current approach doesn't scale

Until then: **Keep it simple, ship it fast, iterate based on real usage.**
