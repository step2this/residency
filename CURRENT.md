# Current Focus

**Last Updated**: 2025-12-08

---

## Current Priority

- **US-001**: Create rotation patterns (MVP) - Implement preset visitation schedule templates with calendar event generation

---

## Active Work in Progress

| Story | Title | Status | Notes |
|-------|-------|--------|-------|
| US-001 | Create Rotation Patterns (MVP) | Planning Complete | See `docs/user-stories/US-001-rotation-patterns.md` |

---

## Product Context

**Related User Stories**: US-001 (see `docs/user-stories/US-001-rotation-patterns.md`)

**Key Product Decisions This Sprint**:
- **Preset patterns first, custom builder later**: Starting with 5 preset templates (2-2-3, 2-2-5-5, 3-4-4-3, alternating-weeks, every-weekend) to validate technical implementation before building custom pattern UI
- **Query-time event generation**: Calculate calendar events on-demand from rotation patterns rather than materializing them in database (simpler, more flexible for MVP)
- **Calendar days only**: No pickup/dropoff times for MVP - just assign full calendar days to parents
- **Single rotation per family**: MVP prevents overlapping rotations; future stories will handle transitions and multiple concurrent rotations
- **Soft delete only**: Rotations are deactivated rather than hard deleted to preserve audit trail

---

## Technical Context

**Architecture Decisions**:
- Query-time calendar event generation vs materialization (see US-001)
- Rotation pattern storage approach

**Current Tech Focus**:
- New `rotation_patterns` table with enum for pattern types
- tRPC router for rotation CRUD operations
- Utility functions for pattern-to-calendar conversion
- React form component with react-hook-form + Zod
- Schedule-X calendar integration

**Key Files Being Modified**:
- `/src/lib/db/schema.ts` - Adding rotation_patterns table and relations
- `/src/schemas/rotation.ts` - Zod validation schemas for rotation operations
- `/src/lib/trpc/routers/rotation.ts` - tRPC procedures (create, list, delete, getCalendarEvents)
- `/src/lib/utils/rotation-utils.ts` - Pattern configs and event generation logic
- `/src/components/forms/rotation-form.tsx` - UI form for creating rotations
- `/src/components/calendar/schedule-calendar.tsx` - Calendar integration

---

## Blockers & Decisions Needed

- [ ] None currently - all decisions for US-001 MVP have been made

---

## Recently Completed (Last 7 Days)

- ✅ US-001 Planning: Completed user story with full technical specifications
- ✅ Architecture decisions for rotation patterns and event generation
- ✅ Database schema design for rotation_patterns table

---

## Next Session TODO

When starting your next Claude Code session, focus on:

1. **Database Migration**: Add rotation_patterns table and enum types
2. **Zod Schemas**: Create `/src/schemas/rotation.ts` with validation schemas
3. **Utility Functions**: Implement pattern configs and calendar event generation
4. **tRPC Router**: Build rotation CRUD procedures with security checks
5. **UI Form**: Create rotation creation form component
6. **Calendar Integration**: Update Schedule-X calendar to display rotation events

**Files to Review First**:
- `/src/lib/db/schema.ts` - Understand existing schema structure
- `/src/lib/trpc/routers/` - Review existing router patterns
- `/src/components/calendar/schedule-calendar.tsx` - Current calendar implementation
- `docs/user-stories/US-001-rotation-patterns.md` - Full technical specification
