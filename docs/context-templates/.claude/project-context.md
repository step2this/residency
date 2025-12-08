# Project Context

## Project Name
[Your Project Name - e.g., "CustodyCalendar" or "CoParentScheduler"]

## Elevator Pitch
[One sentence: What is this and who is it for?]
Example: "A mobile-first web app that helps divorced parents coordinate custody schedules, handoffs, and communication."

## Problem Statement
[What problem are we solving?]

Example:
"Divorced families with shared custody face constant coordination challenges: conflicting schedules, missed handoffs, lack of documentation, and communication breakdowns. Current solutions (shared calendars, text messages) are fragmented and create confusion. Parents need a single source of truth for custody schedules with built-in accountability."

## Target Users

### Primary Persona: The Organized Parent
- **Demographics**: 30-45 years old, divorced/separated, shares custody
- **Tech Comfort**: Moderate - uses smartphone daily, familiar with apps
- **Pain Points**: 
  - Anxiety about missed handoffs or miscommunication
  - Difficulty tracking historical custody time
  - Managing last-minute schedule changes
- **Goals**: Reduce stress, maintain good co-parenting relationship, protect their time with kids

### Secondary Persona: The Reluctant Co-Parent
- **Demographics**: 30-45 years old, divorced/separated, less engaged
- **Tech Comfort**: Basic - prefers simple interfaces
- **Pain Points**:
  - Feels overwhelmed by co-parenting logistics
  - Wants minimal interaction with ex-spouse
- **Goals**: Meet obligations without drama, have clear expectations

## Core Value Propositions

1. **Single Source of Truth**: Both parents see the same schedule, eliminating confusion
2. **Accountability**: Track who had custody when, useful for disputes
3. **Reduced Conflict**: Structured workflows for changes reduce text message arguments
4. **Peace of Mind**: Notifications ensure no missed handoffs

## Key Features (MVP)

- [ ] Shared custody calendar view
- [ ] Recurring schedule patterns (weekly, bi-weekly, custom)
- [ ] Handoff time reminders/notifications
- [ ] Schedule change request workflow
- [ ] Historical custody log
- [ ] User authentication & multi-parent access

## Future Features (Post-MVP)

- [ ] Expense sharing and tracking
- [ ] Document storage (court orders, medical records)
- [ ] Communication log (in-app messaging)
- [ ] Child information hub (school, medical, activities)
- [ ] Mobile native apps (iOS/Android)

## Technical Overview

**Stack**:
- Frontend: React 19, Next.js 15, TypeScript
- UI: shadcn/ui, Tailwind CSS
- Backend: AWS Lambda, API Gateway
- Database: DynamoDB
- Auth: [Your auth solution - e.g., AWS Cognito, Clerk, Auth.js]
- Deployment: AWS (CloudFormation/CDK)

**Key Technical Principles**:
- Mobile-first responsive design
- Server-side rendering for performance
- Event-driven architecture for notifications
- Timezone-aware scheduling
- Optimistic UI updates for better UX

## Non-Functional Requirements

- **Performance**: Initial page load < 2s on 4G
- **Availability**: 99.9% uptime
- **Security**: HIPAA-aware (potential medical info), SOC 2 considerations
- **Accessibility**: WCAG 2.1 AA compliance
- **Privacy**: Per-user data isolation, audit logging

## Out of Scope (For Now)

- Real-time chat features
- Video calling
- AI-powered schedule optimization
- Integration with court systems
- Multi-child complex custody arrangements (initial focus: 1 child, 2 parents)

## Success Metrics

- **Adoption**: X active parent pairs within 6 months
- **Engagement**: Users check app Y times per week
- **Satisfaction**: NPS score > Z
- **Utility**: X% reduction in "where are you?" texts between parents

## Constraints & Considerations

- **Budget**: [If relevant - e.g., "Minimize AWS costs, target < $X/month"]
- **Timeline**: [If relevant - e.g., "MVP in 3 months"]
- **Regulatory**: Family law varies by jurisdiction - keep flexible
- **Emotional Context**: Users may be in high-conflict situations - design for de-escalation

## Related Documentation

- [Product Vision](../docs/requirements/product-vision.md)
- [Jobs-to-be-Done](../docs/requirements/jobs-to-be-done.md)
- [Architecture Overview](../docs/technical/architecture.md)
